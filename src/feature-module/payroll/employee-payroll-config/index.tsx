/**
 * Employee Payroll Configuration Component
 * Configure salary structure and gross pay for employees
 */

import React, { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { getAdminIdForApi, getAuthHeaders, getSelectedSiteId } from '../../../core/utils/apiHelpers';
import { BACKEND_PATH } from '../../../environment';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { employeePayrollConfigAPI, payrollSettingsAPI } from '../structure/utils/api';
import './EmployeePayrollConfig.scss';

interface Employee {
  id: string; // UserProfile ID
  user?: {
    id: string; // Actual employee/user ID
    email?: string;
    username?: string;
    role?: string;
    phone_number?: string;
  };
  custom_employee_id?: string;
  user_name?: string;
  employee_name?: string;
  designation?: string;
  role?: string;
  state?: string;
  city?: string;
}

interface SalaryStructure {
  structure_id: number;
  id?: number;
  name: string;
  description?: string;
  is_default?: boolean;
}

interface PayrollSettings {
  pf_enabled: boolean;
  esi_enabled: boolean;
  pt_enabled: boolean;
  gratuity_enabled: boolean;
}

interface PayrollBreakdown {
  earnings: Array<{ component: string; amount: number }>;
  deductions: Array<{ component: string; amount: number }>;
  total_earnings: number;
  total_deductions: number;
  net_pay: number;
}

interface EmployeePayrollConfigResponse {
  id: number;
  employee_id: string;
  salary_structure: number | string;
  gross_salary: string | number;
  effective_month: number;
  effective_year: number;
  pf_applicable: boolean | null;
  esi_applicable: boolean | null;
  pt_applicable: boolean | null;
  gratuity_applicable: boolean | null;
  earnings: Array<{ component: string; amount: number }>;
  deductions: Array<{ component: string; amount: number }>;
  total_earnings: string | number;
  total_deductions: string | number;
  net_pay: string | number;
}

const EmployeePayrollConfig: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    salary_structure_id: '',
    gross_salary: '',
    effective_month: new Date().getMonth() + 1,
    effective_year: new Date().getFullYear(),
    pf_applicable: null as boolean | null,
    esi_applicable: null as boolean | null,
    pt_applicable: null as boolean | null,
    gratuity_applicable: null as boolean | null,
  });

  const [previewBreakdown, setPreviewBreakdown] = useState<PayrollBreakdown | null>(null);
  const [structureDetails, setStructureDetails] = useState<{
    earnings: Array<{ component: string; label: string; calculation_type: string; value: string; editable: boolean }>;
    deductions: Array<{ component: string; label: string; calculation_type: string; value: string; editable: boolean }>;
  } | null>(null);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const adminId = getAdminIdForApi();
      if (!adminId) {
        toast.error('Admin ID not found');
        setLoading(false);
        return;
      }

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        setLoading(false);
        return;
      }
      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}staff-list/${site_id}/`;
      if (role === "organization" && adminId) {
        url += `?admin_id=${adminId}`;
      }
      const response = await axios.get(url, getAuthHeaders());

      let employeesData: Employee[] = [];
      if (response.data?.results && Array.isArray(response.data.results)) {
        employeesData = response.data.results;
      } else if (response.data?.data?.results && Array.isArray(response.data.data.results)) {
        employeesData = response.data.data.results;
      } else if (Array.isArray(response.data)) {
        employeesData = response.data;
      }

      // Filter active employees
      const activeEmployees = employeesData.filter(
        (emp: any) => emp.is_active !== false && emp.user?.is_active !== false
      );

      setEmployees(activeEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get organization ID helper
  const getOrganizationIdSync = (): string | null => {
    const role = sessionStorage.getItem('role');
    const user_id = sessionStorage.getItem('user_id');

    // If organization role, user_id is the organization_id
    if (role === 'organization' && user_id) {
      return user_id;
    }

    // For admin role, first check organization_id (stored during login)
    const organizationId = sessionStorage.getItem('organization_id');
    if (organizationId) {
      return organizationId;
    }

    // Fallback: try other possible keys
    const selectedOrgId = sessionStorage.getItem('selected_organization_id');
    if (selectedOrgId) {
      return selectedOrgId;
    }

    const orgId = sessionStorage.getItem('org_id');
    if (orgId) {
      return orgId;
    }

    // Try to get from user profile data if stored
    try {
      const userProfileData = sessionStorage.getItem('user_profile_data');
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
        sessionStorage.setItem('organization_id', orgId);
        return orgId;
      }
      throw new Error('Organization ID not found in session info');
    } catch (error: any) {
      console.error('Error fetching organization_id from API:', error);
      throw new Error('Failed to fetch organization ID. Please refresh the page or log in again.');
    }
  };

  const getOrganizationId = async (): Promise<string> => {
    // First try synchronous lookup
    const orgId = getOrganizationIdSync();
    if (orgId) {
      return orgId;
    }

    const role = sessionStorage.getItem('role');

    // For admin role, try to fetch from API
    if (role === 'admin') {
      return await fetchOrganizationIdFromAPI();
    }

    // Throw error if org_id is not found
    throw new Error('Organization ID is required. Please ensure you are logged in with proper permissions.');
  };

  // Fetch salary structures
  const fetchStructures = useCallback(async () => {
    try {
      let organizationId: string;
      try {
        organizationId = await getOrganizationId();
      } catch (error: any) {
        console.error('Error getting organization ID:', error);
        toast.error(error.message || 'Failed to get organization ID');
        return;
      }

      const response = await axios.get(
        `${BACKEND_PATH}payroll/salary-structure/${organizationId}?list=true`,
        getAuthHeaders()
      );

      if (response?.data?.response && response?.data?.data) {
        // Handle both array format and object format
        let structuresList = [];
        if (Array.isArray(response.data.data)) {
          structuresList = response.data.data;
        } else if (Array.isArray(response.data.data.structures)) {
          structuresList = response.data.data.structures;
        }
        const activeStructures = structuresList.filter((s: any) => s.is_active !== false);
        setStructures(activeStructures);
      } else if (response?.data?.status === 200 && response?.data?.data) {
        const structuresList = Array.isArray(response.data.data) ? response.data.data : [];
        const activeStructures = structuresList.filter((s: any) => s.is_active !== false);
        setStructures(activeStructures);
      }
    } catch (error: any) {
      console.error('Error fetching structures:', error);
      toast.error('Failed to fetch salary structures');
    }
  }, []);

  // Fetch structure details when structure is selected
  const fetchStructureDetails = useCallback(async (structureId: string) => {
    if (!structureId) {
      setStructureDetails(null);
      return;
    }

    try {
      let organizationId: string;
      try {
        organizationId = await getOrganizationId();
      } catch (error: any) {
        console.error('Error getting organization ID:', error);
        return;
      }

      const response = await axios.get(
        `${BACKEND_PATH}payroll/salary-structure/${organizationId}?structure_id=${structureId}`,
        getAuthHeaders()
      );

      if (response?.data?.response && response?.data?.data) {
        const data = response.data.data;
        setStructureDetails({
          earnings: data.earnings || [],
          deductions: data.deductions || [],
        });
      }
    } catch (error: any) {
      console.error('Error fetching structure details:', error);
      setStructureDetails(null);
    }
  }, []);

  // Fetch payroll settings
  const fetchPayrollSettings = useCallback(async () => {
    try {
      let organizationId: string;
      try {
        organizationId = await getOrganizationId();
      } catch (error: any) {
        console.error('Error getting organization ID:', error);
        // Set defaults if organization ID not found
        setPayrollSettings({
          pf_enabled: false,
          esi_enabled: false,
          pt_enabled: false,
          gratuity_enabled: false,
        });
        return;
      }

      const response = await payrollSettingsAPI.get(organizationId);
      if (response?.response && response?.data) {
        setPayrollSettings({
          pf_enabled: response.data.pf_enabled === true || response.data.pf_enabled === 'true' || response.data.pf_enabled === 1,
          esi_enabled: response.data.esi_enabled === true || response.data.esi_enabled === 'true' || response.data.esi_enabled === 1,
          pt_enabled: response.data.pt_enabled === true || response.data.pt_enabled === 'true' || response.data.pt_enabled === 1,
          gratuity_enabled: response.data.gratuity_enabled === true || response.data.gratuity_enabled === 'true' || response.data.gratuity_enabled === 1,
        });
      }
    } catch (error: any) {
      console.error('Error fetching payroll settings:', error);
      // Settings might not exist, set defaults
      setPayrollSettings({
        pf_enabled: false,
        esi_enabled: false,
        pt_enabled: false,
        gratuity_enabled: false,
      });
    }
  }, []);

  // Fetch existing config for employee and specific month/year
  const fetchEmployeeConfig = useCallback(async (employeeId: string, month?: number, year?: number) => {
    try {
      const adminId = getAdminIdForApi();
      if (!adminId) return;

      // Use the new employee-specific endpoint with month/year filters
      const response = await employeePayrollConfigAPI.getByEmployee(adminId, employeeId, month, year);
      if (response?.status && response?.data) {
        // If both month and year provided, response.data is a single object
        // Otherwise, it's an array
        let employeeConfig: EmployeePayrollConfigResponse | null = null;
        
        if (month && year) {
          // Single config object
          employeeConfig = Array.isArray(response.data) ? response.data[0] || null : response.data || null;
        } else {
          // Array of configs - get most recent
          const configs = Array.isArray(response.data) ? response.data : [];
          employeeConfig = configs
            .sort((a: EmployeePayrollConfigResponse, b: EmployeePayrollConfigResponse) => {
              if (a.effective_year !== b.effective_year) return b.effective_year - a.effective_year;
              return b.effective_month - a.effective_month;
            })[0] || null;
        }

        if (employeeConfig) {
          // Config exists for this month/year - load it
          setSelectedConfig(employeeConfig);
          setFormData((prev) => ({
            salary_structure_id: employeeConfig!.salary_structure?.toString() || '',
            gross_salary: employeeConfig!.gross_salary?.toString() || '',
            effective_month: employeeConfig!.effective_month || prev.effective_month,
            effective_year: employeeConfig!.effective_year || prev.effective_year,
            // Default to null (Auto) if not set in config
            pf_applicable: employeeConfig!.pf_applicable ?? null,
            esi_applicable: employeeConfig!.esi_applicable ?? null,
            pt_applicable: employeeConfig!.pt_applicable ?? null,
            gratuity_applicable: employeeConfig!.gratuity_applicable ?? null,
          }));
          setPreviewBreakdown({
            earnings: employeeConfig!.earnings || [],
            deductions: employeeConfig!.deductions || [],
            total_earnings: typeof employeeConfig!.total_earnings === 'number' 
              ? employeeConfig!.total_earnings 
              : parseFloat(String(employeeConfig!.total_earnings)) || 0,
            total_deductions: typeof employeeConfig!.total_deductions === 'number'
              ? employeeConfig!.total_deductions
              : parseFloat(String(employeeConfig!.total_deductions)) || 0,
            net_pay: typeof employeeConfig!.net_pay === 'number'
              ? employeeConfig!.net_pay
              : parseFloat(String(employeeConfig!.net_pay)) || 0,
          });
        } else {
          // No config found for this month/year - clear selectedConfig to create new one
          setSelectedConfig(null);
          // Keep month/year but clear other fields and preview
          setFormData((prev) => ({
            salary_structure_id: '',
            gross_salary: '',
            effective_month: prev.effective_month,
            effective_year: prev.effective_year,
            pf_applicable: null,
            esi_applicable: null,
            pt_applicable: null,
            gratuity_applicable: null,
          }));
          setPreviewBreakdown(null);
        }
      } else if (response?.status === false) {
        // Config not found for this month/year - clear form and preview for new creation
        setSelectedConfig(null);
        setFormData((prev) => ({
          salary_structure_id: '',
          gross_salary: '',
          effective_month: prev.effective_month,
          effective_year: prev.effective_year,
          pf_applicable: null,
          esi_applicable: null,
          pt_applicable: null,
          gratuity_applicable: null,
        }));
        setPreviewBreakdown(null);
      }
    } catch (error: any) {
      console.error('Error fetching employee config:', error);
    }
  }, []);

  // Calculate preview manually (creates/updates config to get calculated breakdown)
  const handlePreview = async () => {
    if (!selectedEmployee || !formData.salary_structure_id || !formData.gross_salary) {
      toast.error('Please fill all required fields to preview');
      return;
    }

    try {
      const adminId = getAdminIdForApi();
      if (!adminId) {
        toast.error('Admin ID not found');
        return;
      }

      const previewData = {
        employee_id: selectedEmployee.user?.id || selectedEmployee.id,
        salary_structure_id: parseInt(formData.salary_structure_id),
        gross_salary: parseFloat(formData.gross_salary),
        effective_month: formData.effective_month,
        effective_year: formData.effective_year,
        pf_applicable: formData.pf_applicable,
        esi_applicable: formData.esi_applicable,
        pt_applicable: formData.pt_applicable,
        gratuity_applicable: formData.gratuity_applicable,
      };

      // Create or update config to get calculated breakdown
      const response = selectedConfig
        ? await employeePayrollConfigAPI.update(adminId, selectedConfig.id, previewData)
        : await employeePayrollConfigAPI.create(adminId, previewData);

      if (response?.status && response?.data) {
        setPreviewBreakdown({
          earnings: response.data.earnings || [],
          deductions: response.data.deductions || [],
          total_earnings: parseFloat(response.data.total_earnings) || 0,
          total_deductions: parseFloat(response.data.total_deductions) || 0,
          net_pay: parseFloat(response.data.net_pay) || 0,
        });
        // Update selectedConfig if it was created (so Save button will update instead of create)
        if (!selectedConfig && response.data.id) {
          setSelectedConfig({ id: response.data.id });
        }
        toast.success('Preview calculated successfully');
      } else {
        toast.error(response?.message || 'Failed to calculate preview');
      }
    } catch (error: any) {
      console.error('Error calculating preview:', error);
      const errorMessage =
        error.response?.data?.message || error.response?.data?.data?.message || error.message || 'Failed to calculate preview';
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchStructures();
    fetchPayrollSettings();
  }, [fetchEmployees, fetchStructures, fetchPayrollSettings]);

  // Watch for month/year changes - check if config exists for new combination
  useEffect(() => {
    if (selectedEmployee) {
      const employeeUserId = selectedEmployee.user?.id || selectedEmployee.id;
      // Check if config exists for current month/year
      fetchEmployeeConfig(employeeUserId, formData.effective_month, formData.effective_year);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.effective_month, formData.effective_year]);

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    // Use user.id (actual employee UUID) for API calls
    const employeeUserId = employee.user?.id || employee.id;
    // Fetch config for current month/year (use formData or default to current date)
    const currentMonth = formData.effective_month || new Date().getMonth() + 1;
    const currentYear = formData.effective_year || new Date().getFullYear();
    fetchEmployeeConfig(employeeUserId, currentMonth, currentYear);
  };

  // Watch for month/year changes and reload config if exists
  useEffect(() => {
    if (selectedEmployee) {
      const employeeUserId = selectedEmployee.user?.id || selectedEmployee.id;
      fetchEmployeeConfig(employeeUserId, formData.effective_month, formData.effective_year);
    }
  }, [formData.effective_month, formData.effective_year, selectedEmployee, fetchEmployeeConfig]);

  const handleSave = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    if (!formData.salary_structure_id) {
      toast.error('Please select a salary structure');
      return;
    }

    if (!formData.gross_salary || parseFloat(formData.gross_salary) <= 0) {
      toast.error('Please enter a valid gross salary');
      return;
    }

    setSaving(true);
    try {
      const adminId = getAdminIdForApi();
      if (!adminId) {
        toast.error('Admin ID not found');
        setSaving(false);
        return;
      }

      const payload = {
        employee_id: selectedEmployee.user?.id || selectedEmployee.id,
        salary_structure_id: parseInt(formData.salary_structure_id),
        gross_salary: parseFloat(formData.gross_salary),
        effective_month: formData.effective_month,
        effective_year: formData.effective_year,
        pf_applicable: formData.pf_applicable,
        esi_applicable: formData.esi_applicable,
        pt_applicable: formData.pt_applicable,
        gratuity_applicable: formData.gratuity_applicable,
      };

      const response = selectedConfig
        ? await employeePayrollConfigAPI.update(adminId, selectedConfig.id, payload)
        : await employeePayrollConfigAPI.create(adminId, payload);

      if (response?.status) {
        toast.success(response.message || 'Payroll configuration saved successfully');
        // Update preview breakdown with saved data
        if (response.data) {
          setPreviewBreakdown({
            earnings: response.data.earnings || [],
            deductions: response.data.deductions || [],
            total_earnings: parseFloat(response.data.total_earnings) || 0,
            total_deductions: parseFloat(response.data.total_deductions) || 0,
            net_pay: parseFloat(response.data.net_pay) || 0,
          });
          // Update selectedConfig
          if (response.data.id) {
            setSelectedConfig({ id: response.data.id });
          }
        }
        const employeeUserId = selectedEmployee.user?.id || selectedEmployee.id;
        await fetchEmployeeConfig(employeeUserId);
      } else {
        toast.error(response.message || 'Failed to save payroll configuration');
      }
    } catch (error: any) {
      console.error('Error saving payroll configuration:', error);
      const errorMessage =
        error.response?.data?.message || error.response?.data?.data?.message || error.message || 'Failed to save payroll configuration';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedEmployee(null);
    setSelectedConfig(null);
    setFormData({
      salary_structure_id: '',
      gross_salary: '',
      effective_month: new Date().getMonth() + 1,
      effective_year: new Date().getFullYear(),
      pf_applicable: null,
      esi_applicable: null,
      pt_applicable: null,
      gratuity_applicable: null,
    });
    setPreviewBreakdown(null);
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      emp.custom_employee_id?.toLowerCase().includes(query) ||
      emp.user_name?.toLowerCase().includes(query) ||
      emp.employee_name?.toLowerCase().includes(query) ||
      emp.designation?.toLowerCase().includes(query)
    );
  });

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <>
      <div className="container-fluid" style={{ padding: '0' }}>
        {/* Two Column Layout */}
        <div className="row g-3">
            {/* Left Panel - Employee List */}
            <div className="col-lg-4 col-md-5">
              <div className="card shadow-sm border-0" style={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header bg-primary text-white">
                  <h5 className="card-title mb-0 d-flex align-items-center">
                    <i className="ti ti-users me-2"></i>
                    Employees
                    {filteredEmployees.length > 0 && (
                      <span className="badge bg-light text-primary ms-2">{filteredEmployees.length}</span>
                    )}
                  </h5>
                </div>
                <div className="card-body p-3" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {/* Search */}
                  <div className="mb-3 position-relative">
                    <i className="ti ti-search position-absolute" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }}></i>
                    <input
                      type="text"
                      className="form-control ps-5"
                      placeholder="Search employees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>

                  {/* Employee List */}
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <i className="ti ti-users-off" style={{ fontSize: '3rem' }}></i>
                      <p className="mt-2 mb-0">No employees available under this admin</p>
                    </div>
                  ) : (
                    <div className="employee-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', minHeight: 0 }}>
                      {filteredEmployees.map((employee) => {
                        const employeeUserId = employee.user?.id || employee.id;
                        const isSelected = selectedEmployee && (
                          (selectedEmployee.user?.id || selectedEmployee.id) === employeeUserId
                        );
                        return (
                          <div
                            key={employee.id}
                            className={`employee-item mb-2 cursor-pointer ${
                              isSelected ? 'border-primary shadow-sm' : 'border'
                            }`}
                            onClick={() => handleEmployeeSelect(employee)}
                            style={{ 
                              cursor: 'pointer', 
                              transition: 'all 0.3s ease',
                              borderRadius: '8px',
                              border: isSelected ? '2px solid' : '1px solid #dee2e6',
                              backgroundColor: isSelected ? '#f0f7ff' : '#fff',
                              padding: '12px',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                                e.currentTarget.style.borderColor = '#0d6efd';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#fff';
                                e.currentTarget.style.borderColor = '#dee2e6';
                              }
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <h6 className="mb-1 fw-semibold text-dark">
                                  {employee.user_name || employee.employee_name || 'N/A'}
                                </h6>
                                <small className="text-muted d-block">
                                  <i className="ti ti-id me-1"></i>
                                  ID: {employee.custom_employee_id || employeeUserId}
                                </small>
                                {employee.designation && (
                                  <small className="text-muted d-block mt-1">
                                    <i className="ti ti-briefcase me-1"></i>
                                    {employee.designation}
                                  </small>
                                )}
                              </div>
                              {isSelected && (
                                <div className="ms-2">
                                  <span className="badge bg-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                                    <i className="ti ti-check text-white" style={{ fontSize: '1rem' }}></i>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Payroll Configuration Form */}
            <div className="col-lg-8 col-md-7">
              {selectedEmployee ? (
                <div className="card shadow-sm border-0" style={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column' }}>
                  <div className="card-header bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', flexShrink: 0 }}>
                    <h5 className="card-title mb-0 d-flex align-items-center">
                      <i className="ti ti-settings me-2"></i>
                      Payroll Configuration
                    </h5>
                  </div>
                  <div className="card-body p-4" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {/* Employee Info (Read-only) */}
                    <div className="mb-4 p-3 bg-light rounded-3 border">
                      <h6 className="mb-3 fw-semibold d-flex align-items-center">
                        <i className="ti ti-user-circle me-2 text-primary"></i>
                        Employee Information
                      </h6>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label text-muted">Employee Name</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={selectedEmployee.user_name || selectedEmployee.employee_name || 'N/A'}
                            readOnly
                            disabled
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted">Employee ID</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={selectedEmployee.custom_employee_id || selectedEmployee.user?.id || selectedEmployee.id}
                            readOnly
                            disabled
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted">Designation</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={selectedEmployee.designation || 'N/A'}
                            readOnly
                            disabled
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted">Role</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={selectedEmployee.role || 'N/A'}
                            readOnly
                            disabled
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted">State</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={selectedEmployee.state || 'N/A'}
                            readOnly
                            disabled
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted">City</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={selectedEmployee.city || 'N/A'}
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    {/* Payroll Configuration */}
                    <div className="mb-4 p-3 bg-light rounded-3 border">
                      <h6 className="mb-3 fw-semibold d-flex align-items-center">
                        <i className="ti ti-wallet me-2 text-success"></i>
                        Payroll Configuration
                      </h6>
                      <div className="alert alert-info border-0 mb-3" style={{ borderRadius: '8px' }}>
                        <i className="ti ti-info-circle me-2"></i>
                        <small>
                          Select a salary structure and enter the annual gross salary. All salary components (earnings and deductions) will be calculated automatically based on the structure and statutory rules.
                        </small>
                      </div>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">
                            Salary Structure <span className="text-danger">*</span>
                          </label>
                          <select
                            className="form-select"
                            value={formData.salary_structure_id}
                            onChange={(e) => {
                              setFormData({ ...formData, salary_structure_id: e.target.value });
                              fetchStructureDetails(e.target.value);
                            }}
                            required
                            style={{ borderRadius: '8px' }}
                          >
                            <option value="">Select Salary Structure</option>
                            {structures.length === 0 ? (
                              <option value="" disabled>
                                No salary structures available
                              </option>
                            ) : (
                              structures.map((structure) => (
                                <option key={structure.structure_id || structure.id} value={structure.structure_id || structure.id}>
                                  {structure.name}
                                </option>
                              ))
                            )}
                          </select>
                          {structures.length === 0 && (
                            <small className="text-warning">
                              <i className="ti ti-alert-circle me-1"></i>
                              Please create a salary structure before configuring payroll
                            </small>
                          )}
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">
                            Gross Salary (₹) <span className="text-danger">*</span>
                          </label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-end-0" style={{ borderRadius: '8px 0 0 8px' }}>
                              <i className="ti ti-currency-rupee"></i>
                            </span>
                            <input
                              type="number"
                              className="form-control border-start-0"
                              value={formData.gross_salary}
                              onChange={(e) => setFormData({ ...formData, gross_salary: e.target.value })}
                              min="0"
                              step="0.01"
                              placeholder="Enter annual gross salary (e.g., 200000)"
                              required
                              style={{ borderRadius: '0 8px 8px 0' }}
                            />
                          </div>
                          <small className="text-muted">
                            <i className="ti ti-info-circle me-1"></i>
                            Enter annual (yearly) gross salary. System will automatically convert to monthly for calculations.
                            {formData.gross_salary && parseFloat(formData.gross_salary) > 0 && (
                              <span className="d-block mt-1">
                                Monthly: ₹{(parseFloat(formData.gross_salary) / 12).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </small>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">
                            Effective Month <span className="text-danger">*</span>
                          </label>
                          <select
                            className="form-select"
                            value={formData.effective_month}
                            onChange={(e) => setFormData({ ...formData, effective_month: parseInt(e.target.value) })}
                            required
                            style={{ borderRadius: '8px' }}
                          >
                            {months.map((month) => (
                              <option key={month.value} value={month.value}>
                                {month.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">
                            Effective Year <span className="text-danger">*</span>
                          </label>
                          <select
                            className="form-select"
                            value={formData.effective_year}
                            onChange={(e) => setFormData({ ...formData, effective_year: parseInt(e.target.value) })}
                            required
                            style={{ borderRadius: '8px' }}
                          >
                            {years.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Statutory Applicability */}
                    <div className="mb-4 p-3 bg-light rounded-3 border">
                      <h6 className="mb-3 fw-semibold d-flex align-items-center">
                        <i className="ti ti-shield-check me-2 text-warning"></i>
                        Statutory Applicability
                      </h6>
                      <div className="alert alert-warning border-0 mb-3" style={{ borderRadius: '8px' }}>
                        <i className="ti ti-info-circle me-2"></i>
                        <small>
                          Override statutory applicability for this employee (optional). 
                          <strong> Auto</strong> = System decides based on organization settings and salary limits. 
                          <strong> Yes</strong> = Force applicable. 
                          <strong> No</strong> = Force not applicable (for exempt cases).
                          {!payrollSettings?.esi_enabled && (
                            <span className="d-block text-danger mt-2">
                              <i className="ti ti-alert-triangle me-1"></i>
                              Note: ESI is disabled at organization level. It will not be calculated even if set to "Yes".
                            </span>
                          )}
                        </small>
                      </div>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">PF Applicable</label>
                          <select
                            className="form-select"
                            value={formData.pf_applicable === null ? 'auto' : formData.pf_applicable ? 'yes' : 'no'}
                            onChange={(e) => {
                              const value = e.target.value === 'auto' ? null : e.target.value === 'yes';
                              setFormData({ ...formData, pf_applicable: value });
                            }}
                            disabled={!payrollSettings?.pf_enabled}
                          >
                            <option value="auto">Auto (System decides)</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                          {!payrollSettings?.pf_enabled && (
                            <small className="text-muted">
                              <i className="ti ti-info-circle me-1"></i>
                              This statutory is disabled at organization level
                            </small>
                          )}
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">ESI Applicable</label>
                          <select
                            className="form-select"
                            value={formData.esi_applicable === null ? 'auto' : formData.esi_applicable ? 'yes' : 'no'}
                            onChange={(e) => {
                              const value = e.target.value === 'auto' ? null : e.target.value === 'yes';
                              setFormData({ ...formData, esi_applicable: value });
                            }}
                            disabled={!payrollSettings?.esi_enabled}
                          >
                            <option value="auto">Auto (System decides)</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                          {!payrollSettings?.esi_enabled && (
                            <small className="text-muted">
                              <i className="ti ti-info-circle me-1"></i>
                              This statutory is disabled at organization level
                            </small>
                          )}
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Professional Tax Applicable</label>
                          <select
                            className="form-select"
                            value={formData.pt_applicable === null ? 'auto' : formData.pt_applicable ? 'yes' : 'no'}
                            onChange={(e) => {
                              const value = e.target.value === 'auto' ? null : e.target.value === 'yes';
                              setFormData({ ...formData, pt_applicable: value });
                            }}
                            disabled={!payrollSettings?.pt_enabled}
                          >
                            <option value="auto">Auto (System decides)</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                          {!payrollSettings?.pt_enabled && (
                            <small className="text-muted">
                              <i className="ti ti-info-circle me-1"></i>
                              This statutory is disabled at organization level
                            </small>
                          )}
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Gratuity Applicable</label>
                          <select
                            className="form-select"
                            value={formData.gratuity_applicable === null ? 'auto' : formData.gratuity_applicable ? 'yes' : 'no'}
                            onChange={(e) => {
                              const value = e.target.value === 'auto' ? null : e.target.value === 'yes';
                              setFormData({ ...formData, gratuity_applicable: value });
                            }}
                            disabled={!payrollSettings?.gratuity_enabled}
                          >
                            <option value="auto">Auto (System decides)</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                          {!payrollSettings?.gratuity_enabled && (
                            <small className="text-muted">
                              <i className="ti ti-info-circle me-1"></i>
                              This statutory is disabled at organization level
                            </small>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Structure Components Preview */}
                    {structureDetails && (
                      <div className="mb-4 p-3 bg-light rounded-3 border">
                        <h6 className="fw-semibold mb-3 d-flex align-items-center">
                          <i className="ti ti-file-invoice me-2 text-info"></i>
                          Salary Structure Components Preview
                        </h6>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="card border-success border-2 shadow-sm">
                              <div className="card-header bg-success text-white py-2">
                                <h6 className="fw-semibold mb-0 d-flex align-items-center">
                                  <i className="ti ti-arrow-down-circle me-2"></i>Earnings
                                </h6>
                              </div>
                              <div className="card-body p-0">
                                <div className="table-responsive" style={{ maxHeight: '300px' }}>
                                  <table className="table table-sm table-hover mb-0">
                                    <thead className="table-light sticky-top">
                                      <tr>
                                        <th className="ps-3">Component</th>
                                        <th className="text-end">Type</th>
                                        <th className="text-end pe-3">Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {structureDetails.earnings.map((earning, idx) => (
                                        <tr key={idx}>
                                          <td className="ps-3 fw-medium">{earning.label}</td>
                                          <td className="text-end">
                                            <span className="badge bg-info-subtle text-info border border-info">{earning.calculation_type}</span>
                                          </td>
                                          <td className="text-end pe-3 fw-semibold text-success">{earning.value}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="card border-danger border-2 shadow-sm">
                              <div className="card-header bg-danger text-white py-2">
                                <h6 className="fw-semibold mb-0 d-flex align-items-center">
                                  <i className="ti ti-arrow-up-circle me-2"></i>Deductions (Employee)
                                </h6>
                              </div>
                              <div className="card-body p-0">
                                <div className="table-responsive" style={{ maxHeight: '300px' }}>
                                  <table className="table table-sm table-hover mb-0">
                                    <thead className="table-light sticky-top">
                                      <tr>
                                        <th className="ps-3">Component</th>
                                        <th className="text-end">Type</th>
                                        <th className="text-end pe-3">Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {structureDetails.deductions
                                        .filter((d) => {
                                          const component = d.component.toUpperCase();
                                          return !component.includes('EMPR') && 
                                                 !component.includes('EMPLOYER') &&
                                                 !component.includes('GRATUITY');
                                        })
                                        .map((deduction, idx) => (
                                          <tr key={idx}>
                                            <td className="ps-3 fw-medium">{deduction.label}</td>
                                            <td className="text-end">
                                              <span className="badge bg-warning-subtle text-warning border border-warning">{deduction.calculation_type}</span>
                                            </td>
                                            <td className="text-end pe-3 fw-semibold text-danger">{deduction.value}</td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Employer Components and Gratuity (Separate Section) */}
                        {(structureDetails.deductions.some((d) => {
                          const component = d.component.toUpperCase();
                          return component.includes('EMPR') || component.includes('EMPLOYER');
                        }) || structureDetails.deductions.some((d) => {
                          const component = d.component.toUpperCase();
                          return component.includes('GRATUITY');
                        })) && (
                          <div className="mt-3">
                            <h6 className="fw-semibold mb-2 text-muted small">
                              <i className="ti ti-info-circle me-1"></i>Employer Contributions & Gratuity (Not deducted from employee salary)
                            </h6>
                            <div className="table-responsive">
                              <table className="table table-sm table-bordered">
                                <thead className="table-light">
                                  <tr>
                                    <th>Component</th>
                                    <th className="text-end">Type</th>
                                    <th className="text-end">Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {structureDetails.deductions
                                    .filter((d) => {
                                      const component = d.component.toUpperCase();
                                      return component.includes('EMPR') || 
                                             component.includes('EMPLOYER') ||
                                             component.includes('GRATUITY');
                                    })
                                    .map((item, idx) => (
                                      <tr key={idx}>
                                        <td>{item.label}</td>
                                        <td className="text-end">
                                          <span className="badge bg-secondary">{item.calculation_type}</span>
                                        </td>
                                        <td className="text-end">{item.value}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Auto-calculated Preview */}
                    {previewBreakdown && (
                      <div className="mb-4 p-3 bg-light rounded-3 border">
                        <h6 className="fw-semibold mb-3 d-flex align-items-center">
                          <i className="ti ti-calculator me-2 text-primary"></i>
                          Auto-Calculated Breakdown Preview
                        </h6>
                        <div className="alert alert-primary border-0 mb-3" style={{ borderRadius: '8px' }}>
                          <i className="ti ti-info-circle me-2"></i>
                          <small>
                            <strong>Auto-calculated preview</strong> - Final values will be saved on submit
                          </small>
                        </div>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="card border-success border-2 shadow-sm">
                              <div className="card-header bg-success text-white py-2">
                                <h6 className="fw-semibold mb-0 d-flex align-items-center">
                                  <i className="ti ti-arrow-down-circle me-2"></i>Earnings
                                </h6>
                              </div>
                              <div className="card-body p-0">
                                <div className="table-responsive" style={{ maxHeight: '300px' }}>
                                  <table className="table table-sm table-hover mb-0">
                                    <thead className="table-light sticky-top">
                                      <tr>
                                        <th className="ps-3">Component</th>
                                        <th className="text-end pe-3">Amount (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {previewBreakdown.earnings.map((earning, index) => (
                                        <tr key={index}>
                                          <td className="ps-3 fw-medium">{earning.component}</td>
                                          <td className="text-end pe-3 fw-semibold text-success">
                                            ₹{earning.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="card border-danger border-2 shadow-sm">
                              <div className="card-header bg-danger text-white py-2">
                                <h6 className="fw-semibold mb-0 d-flex align-items-center">
                                  <i className="ti ti-arrow-up-circle me-2"></i>Deductions (Employee)
                                </h6>
                              </div>
                              <div className="card-body p-0">
                                <div className="table-responsive" style={{ maxHeight: '300px' }}>
                                  <table className="table table-sm table-hover mb-0">
                                    <thead className="table-light sticky-top">
                                      <tr>
                                        <th className="ps-3">Component</th>
                                        <th className="text-end pe-3">Amount (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {previewBreakdown.deductions.map((deduction, index) => (
                                        <tr key={index}>
                                          <td className="ps-3 fw-medium">{deduction.component}</td>
                                          <td className="text-end pe-3 fw-semibold text-danger">
                                            ₹{deduction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="row mt-4">
                          <div className="col-md-12">
                            <div className="card border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
                              <div className="card-body p-4">
                                <div className="row text-center g-3">
                                  <div className="col-md-4">
                                    <div className="p-3 bg-white rounded-3 shadow-sm">
                                      <label className="text-muted small d-block mb-2">
                                        <i className="ti ti-arrow-down-circle me-1 text-success"></i>
                                        Total Earnings
                                      </label>
                                      <h4 className="mb-0 text-success fw-bold">
                                        ₹{previewBreakdown.total_earnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </h4>
                                    </div>
                                  </div>
                                  <div className="col-md-4">
                                    <div className="p-3 bg-white rounded-3 shadow-sm">
                                      <label className="text-muted small d-block mb-2">
                                        <i className="ti ti-arrow-up-circle me-1 text-danger"></i>
                                        Total Deductions
                                      </label>
                                      <h4 className="mb-0 text-danger fw-bold">
                                        ₹{previewBreakdown.total_deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </h4>
                                    </div>
                                  </div>
                                  <div className="col-md-4">
                                    <div className="p-3 bg-white rounded-3 shadow-sm border-primary border-2">
                                      <label className="text-muted small d-block mb-2">
                                        <i className="ti ti-wallet me-1 text-primary"></i>
                                        Net Pay
                                      </label>
                                      <h4 className="mb-0 text-primary fw-bold">
                                        ₹{previewBreakdown.net_pay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </h4>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="d-flex justify-content-end gap-3 border-top pt-4 mt-4">
                      <button 
                        type="button" 
                        className="btn btn-light border shadow-sm" 
                        onClick={handleCancel} 
                        disabled={saving}
                        style={{ 
                          borderRadius: '10px', 
                          minWidth: '130px',
                          fontWeight: 500,
                          padding: '10px 20px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!saving) {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '';
                          e.currentTarget.style.transform = '';
                        }}
                      >
                        <i className="ti ti-x me-2"></i>Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-primary shadow-sm"
                        onClick={handlePreview}
                        disabled={!formData.salary_structure_id || !formData.gross_salary}
                        style={{ 
                          borderRadius: '10px', 
                          minWidth: '190px',
                          fontWeight: 500,
                          padding: '10px 20px',
                          borderWidth: '2px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!(!formData.salary_structure_id || !formData.gross_salary)) {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(13, 110, 253, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = '';
                          e.currentTarget.style.boxShadow = '';
                        }}
                      >
                        <i className="ti ti-eye me-2"></i>Preview Calculation
                      </button>
                      <button
                        type="button"
                        className="btn shadow-lg"
                        onClick={handleSave}
                        disabled={saving || !formData.salary_structure_id || !formData.gross_salary}
                        style={{ 
                          borderRadius: '10px', 
                          minWidth: '220px',
                          fontWeight: 600,
                          padding: '12px 24px',
                          background: saving || !formData.salary_structure_id || !formData.gross_salary
                            ? 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)'
                            : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                          border: 'none',
                          color: 'white',
                          fontSize: '15px',
                          letterSpacing: '0.5px',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          if (!saving && formData.salary_structure_id && formData.gross_salary) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(249, 115, 22, 0.4)';
                            e.currentTarget.style.background = 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!saving && formData.salary_structure_id && formData.gross_salary) {
                            e.currentTarget.style.transform = '';
                            e.currentTarget.style.boxShadow = '';
                            e.currentTarget.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
                          }
                        }}
                      >
                        {saving ? (
                          <span className="d-flex align-items-center justify-content-center">
                            <span className="spinner-border spinner-border-sm me-2" role="status" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span>
                            <span>Saving Configuration...</span>
                          </span>
                        ) : (
                          <span className="d-flex align-items-center justify-content-center">
                            <i className="ti ti-device-floppy me-2" style={{ fontSize: '18px' }}></i>
                            <span>Save Payroll Configuration</span>
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card shadow-sm border-0">
                  <div className="card-body text-center py-5">
                    <div className="mb-3">
                      <i className="ti ti-user-off text-muted" style={{ fontSize: '5rem', opacity: 0.5 }}></i>
                    </div>
                    <h5 className="mt-3 text-muted fw-semibold">No Employee Selected</h5>
                    <p className="text-muted mb-0">Please select an employee from the list to configure payroll</p>
                    <div className="mt-4">
                      <i className="ti ti-arrow-left text-primary me-2"></i>
                      <span className="text-primary">Select from the employee list on the left</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
};

export default EmployeePayrollConfig;
