/**
 * Payroll Settings Component
 */
import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { payrollSettingsAPI } from './utils/api';
import type { PayrollSettings as PayrollSettingsType } from './types';
import axios from 'axios';
import { getAuthHeaders } from '../../../core/utils/apiHelpers';
import { BACKEND_PATH } from '../../../environment';
import { all_routes } from '../../router/all_routes';

const PayrollSettings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('pf');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [settings, setSettings] = useState<PayrollSettingsType | null>(null);
  const [formData, setFormData] = useState<Partial<PayrollSettingsType>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const getOrganizationIdSync = (): string | null => {
    const role = sessionStorage.getItem("role");
    const user_id = sessionStorage.getItem("user_id");
    
    // If organization role, user_id is the organization_id
    if (role === "organization" && user_id) {
      return user_id;
    }
    
    // For admin role, first check organization_id (stored during login)
    const organizationId = sessionStorage.getItem("organization_id");
    if (organizationId) {
      return organizationId;
    }
    
    // Fallback: try other possible keys
    const selectedOrgId = sessionStorage.getItem("selected_organization_id");
    if (selectedOrgId) {
      return selectedOrgId;
    }
    
    const orgId = sessionStorage.getItem("org_id");
    if (orgId) {
      return orgId;
    }
    
    // Try to get from user profile data if stored
    try {
      const userProfileData = sessionStorage.getItem("user_profile_data");
      if (userProfileData) {
        const profile = JSON.parse(userProfileData);
        if (profile.organization_id) {
          return profile.organization_id;
    }
        if (profile.organization?.id) {
          return profile.organization.id;
        }
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
    
    return null;
  };

  const fetchOrganizationIdFromAPI = async (): Promise<string> => {
    try {
      const response = await axios.get(`${BACKEND_PATH}session-info`, getAuthHeaders());
      if (response.data?.data?.organization_id) {
        const orgId = response.data.data.organization_id;
        // Store it in sessionStorage for future use
        sessionStorage.setItem("organization_id", orgId);
        console.log("Fetched organization_id from API and stored:", orgId);
        return orgId;
      }
      throw new Error('Organization ID not found in session info');
    } catch (error: any) {
      console.error("Error fetching organization_id from API:", error);
      throw new Error('Failed to fetch organization ID. Please refresh the page or log in again.');
    }
  };

  const getOrganizationId = async (): Promise<string> => {
    // Debug: Log all sessionStorage values
    console.log("SessionStorage values:", {
      role: sessionStorage.getItem("role"),
      user_id: sessionStorage.getItem("user_id"),
      organization_id: sessionStorage.getItem("organization_id"),
      selected_organization_id: sessionStorage.getItem("selected_organization_id"),
      org_id: sessionStorage.getItem("org_id"),
    });
    
    // First try synchronous lookup
    const orgId = getOrganizationIdSync();
    if (orgId) {
      console.log("Found organization_id in sessionStorage:", orgId);
      return orgId;
    }
    
    const role = sessionStorage.getItem("role");
    
    // For admin role, try to fetch from API
    if (role === "admin") {
      console.log("Organization ID not in sessionStorage, fetching from API...");
      return await fetchOrganizationIdFromAPI();
    }
    
    // Throw error if org_id is not found
    throw new Error('Organization ID is required. Please ensure you are logged in with proper permissions.');
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      let org_id: string;
      try {
        org_id = await getOrganizationId();
      } catch (error: any) {
        toast.error(error.message || 'Failed to get organization ID');
        setLoading(false);
        return;
      }

      const response = await payrollSettingsAPI.get(org_id);
      if (response.response && response.data) {
        // Ensure boolean values are properly converted
        const data = {
          ...response.data,
          pf_enabled: response.data.pf_enabled === true || response.data.pf_enabled === 'true' || response.data.pf_enabled === 1,
          esi_enabled: response.data.esi_enabled === true || response.data.esi_enabled === 'true' || response.data.esi_enabled === 1,
          gratuity_enabled: response.data.gratuity_enabled === true || response.data.gratuity_enabled === 'true' || response.data.gratuity_enabled === 1,
          pt_enabled: response.data.pt_enabled === true || response.data.pt_enabled === 'true' || response.data.pt_enabled === 1,
        };
        setSettings(data);
        setFormData(data);
      } else {
        // Settings don't exist, initialize with defaults
        initializeDefaults();
      }
    } catch (error: any) {
      console.error('Error fetching payroll settings:', error);
      if (error.response?.status === 404) {
        // Settings don't exist, initialize with defaults
        initializeDefaults();
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch payroll settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaults = () => {
    const defaults: Partial<PayrollSettingsType> = {
      pf_employee_percentage: 12.0,
      pf_employer_percentage: 12.0,
      pf_wage_limit: 15000.00,
      pf_enabled: false,
      esi_employee_percentage: 0.75,
      esi_employer_percentage: 3.25,
      esi_wage_limit: 21000.00,
      esi_enabled: false,
      gratuity_percentage: 4.81,
      gratuity_enabled: false,
      pt_enabled: false,
    };
    setFormData(defaults);
  };

  const handleFieldChange = (field: keyof PayrollSettingsType, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      let org_id: string;
      try {
        org_id = await getOrganizationId();
        console.log("Using organization_id for API call:", org_id);
      } catch (error: any) {
        console.error("Error getting organization ID:", error);
        toast.error(error.message || 'Failed to get organization ID');
        setSaving(false);
        return;
      }

      // Remove pt_fixed from formData as PT is now state-wise auto calculated
      // Ensure PF percentages are set to statutory defaults (not editable by user)
      const submitData = { ...formData };
      delete submitData.pt_fixed;
      
      // Force PF statutory percentage values (not editable by user)
      submitData.pf_employee_percentage = 12.0;
      submitData.pf_employer_percentage = 12.0;
      // pf_wage_limit is editable, so keep user's value

      let response;
      if (settings) {
        // Update existing settings
        response = await payrollSettingsAPI.update(org_id, submitData);
      } else {
        // Create new settings
        response = await payrollSettingsAPI.create(org_id, submitData);
      }

      if (response.response) {
        // Ensure boolean values are properly converted
        const data = {
          ...response.data,
          pf_enabled: response.data.pf_enabled === true || response.data.pf_enabled === 'true' || response.data.pf_enabled === 1,
          esi_enabled: response.data.esi_enabled === true || response.data.esi_enabled === 'true' || response.data.esi_enabled === 1,
          gratuity_enabled: response.data.gratuity_enabled === true || response.data.gratuity_enabled === 'true' || response.data.gratuity_enabled === 1,
          pt_enabled: response.data.pt_enabled === true || response.data.pt_enabled === 'true' || response.data.pt_enabled === 1,
        };
        toast.success(response.message || 'Payroll settings saved successfully');
        setSettings(data);
        setFormData(data);
      } else {
        toast.error(response.message || 'Failed to save payroll settings');
      }
    } catch (error: any) {
      console.error('Error saving payroll settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save payroll settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'pf', label: 'Provident Fund (PF)', icon: 'ti-shield' },
    { id: 'esi', label: 'Employee State Insurance (ESI)', icon: 'ti-heart' },
    { id: 'gratuity', label: 'Gratuity', icon: 'ti-gift' },
    { id: 'pt', label: 'Professional Tax', icon: 'ti-map-pin' },
    { id: 'statutory-rules', label: 'Statutory Rules', icon: 'ti-book' },
  ];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading payroll settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Payroll Settings</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <a href="#">
                      <i className="ti ti-smart-home" />
                    </a>
                  </li>
                  <li className="breadcrumb-item">
                    <a href="#">Payroll System</a>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Payroll Settings
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div className="card">
            {/* Tabs */}
            <div className="card-header">
              <ul className="nav nav-tabs card-header-tabs" role="tablist">
                {tabs.map((tab) => (
                  <li className="nav-item" key={tab.id}>
                    <button
                      className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                      type="button"
                    >
                      <i className={`ti ${tab.icon} me-1`}></i>
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-body">
              {/* PF Tab */}
              {activeTab === 'pf' && (
                <div className="tab-content">
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Provident Fund (PF) Settings</h5>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={formData.pf_enabled || false}
                          onChange={(e) => handleFieldChange('pf_enabled', e.target.checked)}
                        />
                        <label className="form-check-label">Enable PF</label>
                      </div>
                    </div>
                    <div className="alert alert-info d-flex align-items-start mb-4">
                      <i className="ti ti-info-circle me-2 mt-1"></i>
                      <div>
                        <strong>Statutory Rates:</strong> PF is governed by EPF Act, 1952 and applies uniformly across India. 
                        Employee and Employer contribution rates are fixed by law and cannot be modified.
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label className="form-label">
                          Employee Contribution %
                          <i 
                            className="ti ti-info-circle text-muted ms-2" 
                            style={{ cursor: 'help', fontSize: '0.875rem' }}
                            title="Cannot be changed: This is a statutory rate fixed by EPF Act, 1952. Employee contribution must be exactly 12% as mandated by law across India."
                          ></i>
                        </label>
                        <div 
                          className="form-control bg-light d-flex align-items-center justify-content-between" 
                          style={{ cursor: 'not-allowed', opacity: 0.7 }}
                          title="Cannot be changed: This is a statutory rate fixed by EPF Act, 1952. Employee contribution must be exactly 12% as mandated by law across India."
                        >
                          <strong>12%</strong> 
                          <span className="badge bg-success">Statutory</span>
                        </div>
                        <small className="text-muted">Fixed by EPF Act, 1952</small>
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label">
                          Employer Contribution %
                          <i 
                            className="ti ti-info-circle text-muted ms-2" 
                            style={{ cursor: 'help', fontSize: '0.875rem' }}
                            title="Cannot be changed: This is a statutory rate fixed by EPF Act, 1952. Employer contribution must be exactly 12% as mandated by law across India."
                          ></i>
                        </label>
                        <div 
                          className="form-control bg-light d-flex align-items-center justify-content-between" 
                          style={{ cursor: 'not-allowed', opacity: 0.7 }}
                          title="Cannot be changed: This is a statutory rate fixed by EPF Act, 1952. Employer contribution must be exactly 12% as mandated by law across India."
                        >
                          <strong>12%</strong> 
                          <span className="badge bg-success">Statutory</span>
                        </div>
                        <small className="text-muted">Fixed by EPF Act, 1952</small>
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label">
                          PF Wage Limit (₹) <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.pf_wage_limit || ''}
                          onChange={(e) => handleFieldChange('pf_wage_limit', parseFloat(e.target.value) || 0)}
                          disabled={!formData.pf_enabled}
                          min="0"
                          step="0.01"
                          placeholder="15000"
                        />
                        <small className="text-muted">Default: ₹15,000 (statutory limit)</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ESI Tab */}
              {activeTab === 'esi' && (
                <div className="tab-content">
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Employee State Insurance (ESI) Settings</h5>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={formData.esi_enabled || false}
                          onChange={(e) => handleFieldChange('esi_enabled', e.target.checked)}
                        />
                        <label className="form-check-label">Enable ESI</label>
                      </div>
                    </div>
                    <div className="alert alert-info d-flex align-items-start mb-4">
                      <i className="ti ti-info-circle me-2 mt-1"></i>
                      <div>
                        <strong>Statutory Rates:</strong> ESIC rules are centrally governed and same across India. 
                        The rates are fixed by law and cannot be modified:
                        <ul className="mb-0 mt-2">
                          <li>Employee Contribution: <strong>0.75%</strong> (mandatory)</li>
                          <li>Employer Contribution: <strong>3.25%</strong> (mandatory)</li>
                          <li>ESI Wage Limit: <strong>₹21,000</strong> (statutory limit)</li>
                        </ul>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label className="form-label">
                          Employee Contribution %
                          <i 
                            className="ti ti-info-circle text-muted ms-2" 
                            style={{ cursor: 'help', fontSize: '0.875rem' }}
                            title="Cannot be changed: This is a statutory rate fixed by ESIC Act. Employee contribution must be exactly 0.75% as mandated by law across India."
                          ></i>
                        </label>
                        <div 
                          className="form-control bg-light d-flex align-items-center justify-content-between" 
                          style={{ cursor: 'not-allowed', opacity: 0.7 }}
                          title="Cannot be changed: This is a statutory rate fixed by ESIC Act. Employee contribution must be exactly 0.75% as mandated by law across India."
                        >
                          <strong>0.75%</strong> 
                          <span className="badge bg-success">Statutory</span>
                        </div>
                        <small className="text-muted">Fixed by ESIC Act</small>
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label">
                          Employer Contribution %
                          <i 
                            className="ti ti-info-circle text-muted ms-2" 
                            style={{ cursor: 'help', fontSize: '0.875rem' }}
                            title="Cannot be changed: This is a statutory rate fixed by ESIC Act. Employer contribution must be exactly 3.25% as mandated by law across India."
                          ></i>
                        </label>
                        <div 
                          className="form-control bg-light d-flex align-items-center justify-content-between" 
                          style={{ cursor: 'not-allowed', opacity: 0.7 }}
                          title="Cannot be changed: This is a statutory rate fixed by ESIC Act. Employer contribution must be exactly 3.25% as mandated by law across India."
                        >
                          <strong>3.25%</strong> 
                          <span className="badge bg-success">Statutory</span>
                        </div>
                        <small className="text-muted">Fixed by ESIC Act</small>
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label">
                          ESI Wage Limit (₹)
                          <i 
                            className="ti ti-info-circle text-muted ms-2" 
                            style={{ cursor: 'help', fontSize: '0.875rem' }}
                            title="Cannot be changed: This is a statutory wage limit fixed by ESIC Act. The limit of ₹21,000 is mandated by law across India."
                          ></i>
                        </label>
                        <div 
                          className="form-control bg-light d-flex align-items-center justify-content-between" 
                          style={{ cursor: 'not-allowed', opacity: 0.7 }}
                          title="Cannot be changed: This is a statutory wage limit fixed by ESIC Act. The limit of ₹21,000 is mandated by law across India."
                        >
                          <strong>₹21,000</strong> 
                          <span className="badge bg-success">Statutory</span>
                      </div>
                        <small className="text-muted">Fixed statutory limit</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gratuity Tab */}
              {activeTab === 'gratuity' && (
                <div className="tab-content">
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Gratuity Settings</h5>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={formData.gratuity_enabled || false}
                          onChange={(e) => handleFieldChange('gratuity_enabled', e.target.checked)}
                        />
                        <label className="form-check-label">Enable Gratuity</label>
                      </div>
                    </div>
                    <div className="alert alert-info d-flex align-items-start mb-4">
                      <i className="ti ti-info-circle me-2 mt-1"></i>
                      <div>
                        <strong>Statutory Calculation:</strong> Gratuity is calculated as per Payment of Gratuity Act, 1972. 
                        The calculation is based on statutory formula:
                        <ul className="mb-0 mt-2">
                          <li>Gratuity Rate: <strong>4.81%</strong> (reference rate)</li>
                          <li>Formula: <strong>(Last Drawn Salary × 15 × Years of Service) ÷ 26</strong></li>
                        </ul>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Gratuity Rate %
                          <i 
                            className="ti ti-info-circle text-muted ms-2" 
                            style={{ cursor: 'help', fontSize: '0.875rem' }}
                            title="Cannot be changed: Gratuity is calculated using the statutory formula (Last Drawn Salary × 15 × Years of Service) ÷ 26 as per Payment of Gratuity Act, 1972. The 4.81% is a reference rate only."
                          ></i>
                        </label>
                        <div 
                          className="form-control bg-light d-flex align-items-center justify-content-between" 
                          style={{ cursor: 'not-allowed', opacity: 0.7 }}
                          title="Cannot be changed: Gratuity is calculated using the statutory formula (Last Drawn Salary × 15 × Years of Service) ÷ 26 as per Payment of Gratuity Act, 1972. The 4.81% is a reference rate only."
                        >
                          <strong>4.81%</strong> 
                          <span className="badge bg-success">Reference</span>
                        </div>
                        <small className="text-muted">Reference rate - actual calculation uses statutory formula</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PT Tab */}
              {activeTab === 'pt' && (
                <div className="tab-content">
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Professional Tax Settings</h5>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={formData.pt_enabled || false}
                          onChange={(e) => handleFieldChange('pt_enabled', e.target.checked)}
                        />
                        <label className="form-check-label">Enable PT</label>
                      </div>
                    </div>
                    
                    <div className="alert alert-info d-flex align-items-start mb-4">
                      <i className="ti ti-info-circle me-2 mt-1"></i>
                      <div>
                        <strong>State-wise Auto Calculation:</strong> Professional Tax will be automatically calculated based on the employee's state and salary slab. 
                        The system will use state-wise PT rules configured in the system. No manual value input is required.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Statutory Rules Tab */}
              {activeTab === 'statutory-rules' && (
                <div className="tab-content">
                  {/* Read-only Notice */}
                  <div className="alert alert-info d-flex align-items-center mb-4" role="alert">
                    <i className="ti ti-lock me-2" style={{ fontSize: '20px' }}></i>
                    <div>
                      <strong>Read Only</strong> – Statutory compliance rules cannot be modified. 
                      These rules are defined by statutory authorities and are automatically applied during payroll processing.
                    </div>
                  </div>

                  {/* Rule Cards */}
                  <div className="row">
                    <div className="col-12">
                      {/* Professional Tax Card */}
                      <div className="card mb-3">
                        <div className="card-header">
                          <div className="d-flex align-items-center">
                            <h5 className="mb-0 me-3">Professional Tax (PT)</h5>
                            <span className="badge bg-warning text-dark">State-wise Rule</span>
                            <span className="badge bg-info ms-2">Varies by State</span>
                          </div>
                        </div>
                        <div className="card-body">
                          <p className="text-muted mb-3">
                            Professional Tax is a state-level tax levied on salaried individuals and professionals.
                            The applicable tax amount depends on the employee's work location and state-specific slabs.
                          </p>
                          <ul className="list-unstyled mb-3">
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Managed by respective state governments
                            </li>
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Slabs and limits differ from state to state
                            </li>
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Deducted monthly or annually depending on state law
                            </li>
                            <li className="mb-0">
                              <i className="ti ti-check text-success me-2"></i>
                              Employer is responsible for deduction and deposit
                            </li>
                          </ul>
                          <div className="mt-3">
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => navigate(all_routes.professionalTaxRules)}
                            >
                              <i className="ti ti-map-pin me-2"></i>
                              View State-wise Rules
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Provident Fund Card */}
                      <div className="card mb-3">
                        <div className="card-header">
                          <div className="d-flex align-items-center">
                            <h5 className="mb-0 me-3">Provident Fund (PF)</h5>
                            <span className="badge bg-primary">Central Rule</span>
                            <span className="badge bg-success ms-2">Uniform Across India</span>
                          </div>
                        </div>
                        <div className="card-body">
                          <p className="text-muted mb-3">
                            Provident Fund (PF) is a retirement benefit scheme governed by the Employees' Provident Funds & Miscellaneous Provisions Act, 1952.
                          </p>
                          <ul className="list-unstyled mb-0">
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Employee contribution: <strong>12%</strong>
                            </li>
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Employer contribution: <strong>12%</strong>
                            </li>
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Wage ceiling: <strong>₹15,000</strong>
                            </li>
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Same rules apply across all Indian states
                            </li>
                            <li className="mb-0">
                              <i className="ti ti-check text-success me-2"></i>
                              Optional voluntary higher contribution allowed
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* ESIC Card */}
                      <div className="card mb-3">
                        <div className="card-header">
                          <div className="d-flex align-items-center">
                            <h5 className="mb-0 me-3">Employee State Insurance (ESIC)</h5>
                            <span className="badge bg-primary">Central Rule</span>
                            <span className="badge bg-success ms-2">Uniform Across India</span>
                          </div>
                        </div>
                        <div className="card-body">
                          <p className="text-muted mb-3">
                            ESIC is a social security scheme providing medical and cash benefits under the ESI Act, 1948.
                          </p>
                          <ul className="list-unstyled mb-0">
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Employee contribution: <strong>0.75%</strong>
                            </li>
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Employer contribution: <strong>3.25%</strong>
                            </li>
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Salary eligibility limit: <strong>₹21,000</strong>
                            </li>
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Medical, maternity, sickness and disability benefits
                            </li>
                            <li className="mb-0">
                              <i className="ti ti-check text-success me-2"></i>
                              Rules are consistent nationwide
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Gratuity Card */}
                      <div className="card mb-3">
                        <div className="card-header">
                          <div className="d-flex align-items-center">
                            <h5 className="mb-0 me-3">Gratuity</h5>
                            <span className="badge bg-primary">Central Rule</span>
                            <span className="badge bg-success ms-2">Uniform Across India</span>
                      </div>
                    </div>
                        <div className="card-body">
                          <p className="text-muted mb-3">
                            Gratuity is a long-term employment benefit payable to employees after continuous service.
                          </p>
                          <ul className="list-unstyled mb-0">
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Minimum service requirement: <strong>5 years</strong>
                            </li>
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Applicable for organizations with <strong>10 or more employees</strong>
                            </li>
                            <li className="mb-2">
                              <i className="ti ti-check text-success me-2"></i>
                              Calculation formula:
                              <div className="bg-light p-3 mt-2 rounded" style={{ fontFamily: 'monospace' }}>
                                <strong>(Last Drawn Salary × 15 × Years of Service) ÷ 26</strong>
                              </div>
                            </li>
                            <li className="mb-0">
                              <i className="ti ti-check text-success me-2"></i>
                              Calculation method is same across India
                            </li>
                        </ul>
                      </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Note */}
                  <div className="card mt-4">
                    <div className="card-body">
                      <p className="text-muted mb-0 text-center">
                        <i className="ti ti-info-circle me-2"></i>
                        These rules are defined by statutory authorities and are automatically applied during payroll processing.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              {activeTab !== 'statutory-rules' && (
              <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-device-floppy me-2"></i>
                      Save Settings
                    </>
                  )}
                </button>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
};

export default PayrollSettings;
