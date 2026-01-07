/**
 * Payroll Settings Form Component
 * Professional UI for configuring statutory compliance and payslip settings
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./PayrollSettingsForm.scss";
import { payrollSettingsAPI } from "../../structure/utils/api";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";

interface PayrollSettingsData {
  // Payroll Processing
  auto_process_payroll: boolean;

  // PF Settings
  pf_enabled: boolean;
  pf_employee_percentage: number;
  pf_employer_percentage: number;
  pf_salary_limit: number;

  // ESI Settings
  esi_enabled: boolean;
  esi_employee_percentage: number;
  esi_employer_percentage: number;
  esi_salary_limit: number;

  // Professional Tax
  pt_enabled: boolean;

  // Gratuity
  gratuity_enabled: boolean;
  gratuity_percentage: number;

  // Payslip Settings
  standard_deduction: number; // Read-only
  default_currency: string;
  auto_generate_payslips: boolean;
}

const PayrollSettingsForm: React.FC = () => {
  // Initial default data
  const [formData, setFormData] = useState<PayrollSettingsData>({
    auto_process_payroll: false,

    pf_enabled: false,
    pf_employee_percentage: 12.0,
    pf_employer_percentage: 12.0,
    pf_salary_limit: 15000,

    esi_enabled: false,
    esi_employee_percentage: 0.75,
    esi_employer_percentage: 3.25,
    esi_salary_limit: 21000,

    pt_enabled: false,

    gratuity_enabled: false,
    gratuity_percentage: 4.81,

    standard_deduction: 50000,
    default_currency: "INR",
    auto_generate_payslips: false,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [originalData, setOriginalData] = useState<PayrollSettingsData | null>(null);

  // Get organization ID helper
  const getOrganizationId = (): string | null => {
    const role = sessionStorage.getItem("role");
    if (role === "organization") {
      return sessionStorage.getItem("user_id");
    } else if (role === "admin") {
      // For admin, backend will automatically fetch organization_id from admin's profile
      const adminId = getAdminIdForApi();
      if (!adminId) {
        return null;
      }
      return adminId; // Backend will fetch actual organization_id from AdminProfile
    }
    return null;
  };

  // Fetch payroll settings
  const fetchPayrollSettings = useCallback(async () => {
    const organizationId = getOrganizationId();
    if (!organizationId) {
      toast.error("Organization ID not found. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const response = await payrollSettingsAPI.get(organizationId);

      if (response?.status === 200 && response?.data) {
        const settingsData = response.data;
        const mappedData: PayrollSettingsData = {
          auto_process_payroll: settingsData.auto_process_payroll || false,

          pf_enabled: settingsData.pf_enabled || false,
          pf_employee_percentage: parseFloat(settingsData.pf_employee_percentage) || 12.0,
          pf_employer_percentage: parseFloat(settingsData.pf_employer_percentage) || 12.0,
          pf_salary_limit: parseFloat(settingsData.pf_salary_limit) || 15000,

          esi_enabled: settingsData.esi_enabled || false,
          esi_employee_percentage: parseFloat(settingsData.esi_employee_percentage) || 0.75,
          esi_employer_percentage: parseFloat(settingsData.esi_employer_percentage) || 3.25,
          esi_salary_limit: parseFloat(settingsData.esi_salary_limit) || 21000,

          pt_enabled: settingsData.pt_enabled || false,

          gratuity_enabled: settingsData.gratuity_enabled || false,
          gratuity_percentage: parseFloat(settingsData.gratuity_percentage) || 4.81,

          standard_deduction: parseFloat(settingsData.standard_deduction) || 50000,
          default_currency: settingsData.default_currency || "INR",
          auto_generate_payslips: settingsData.auto_generate_payslips || false,
        };

        setFormData(mappedData);
        setOriginalData(mappedData);
      }
    } catch (error: any) {
      console.error("Error fetching payroll settings:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch payroll settings";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchPayrollSettings();
  }, [fetchPayrollSettings]);

  const handleToggle = (field: keyof PayrollSettingsData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleInputChange = (
    field: keyof PayrollSettingsData,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    const organizationId = getOrganizationId();
    if (!organizationId) {
      toast.error("Organization ID not found. Please login again.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        payroll_processing_day: 1,
        auto_process_payroll: formData.auto_process_payroll,
        pf_enabled: formData.pf_enabled,
        pf_employee_percentage: formData.pf_employee_percentage,
        pf_employer_percentage: formData.pf_employer_percentage,
        pf_salary_limit: formData.pf_salary_limit,
        esi_enabled: formData.esi_enabled,
        esi_employee_percentage: formData.esi_employee_percentage,
        esi_employer_percentage: formData.esi_employer_percentage,
        esi_salary_limit: formData.esi_salary_limit,
        pt_enabled: formData.pt_enabled,
        gratuity_enabled: formData.gratuity_enabled,
        gratuity_percentage: formData.gratuity_percentage,
        default_currency: formData.default_currency,
        auto_generate_payslips: formData.auto_generate_payslips,
      };

      const response = await payrollSettingsAPI.save(organizationId, payload);

      if (response?.status === 200 || response?.status === 201) {
        toast.success(response?.message || "Payroll settings saved successfully!");
        // Update original data to reflect saved state
        setOriginalData({ ...formData });
      }
    } catch (error: any) {
      console.error("Error saving payroll settings:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to save payroll settings";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (originalData) {
      setFormData(originalData);
      toast.info("Changes cancelled");
    } else {
      // Reset to defaults if no original data
      fetchPayrollSettings();
      toast.info("Changes cancelled");
    }
  };

  if (loading) {
    return (
      <div className="payroll-settings-container">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading payroll settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payroll-settings-container">
      {/* Statutory Compliance & Contributions Section */}
      <div className="settings-section">
        <div className="section-header">
          <h3 className="section-title">
            <i className="ti ti-shield-check me-2"></i>
            Statutory Compliance & Contributions
          </h3>
          <p className="section-description">
            Configure statutory deductions and employer contributions
          </p>
        </div>

        <div className="settings-grid">
          {/* PF Card */}
          <div className="settings-card">
            <div className="card-header">
              <div className="header-content">
                <h4 className="card-title">Provident Fund (PF)</h4>
                <ToggleSwitch
                  checked={formData.pf_enabled}
                  onChange={() => handleToggle("pf_enabled")}
                  id="pf-toggle"
                  tooltip="Employee PF deducted from salary, Employer PF added to CTC"
                />
              </div>
            </div>
            {formData.pf_enabled && (
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Employee %
                      <TooltipIcon text="Percentage deducted from employee salary" />
                    </label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        className="form-control"
                        value={formData.pf_employee_percentage}
                        onChange={(e) =>
                          handleInputChange(
                            "pf_employee_percentage",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="input-suffix">%</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Employer %
                      <TooltipIcon text="Percentage added to employer CTC (not deducted from employee)" />
                    </label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        className="form-control"
                        value={formData.pf_employer_percentage}
                        onChange={(e) =>
                          handleInputChange(
                            "pf_employer_percentage",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="input-suffix">%</span>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Salary Limit
                    <TooltipIcon text="Maximum salary on which PF is calculated" />
                  </label>
                  <div className="input-with-prefix">
                    <span className="input-prefix">₹</span>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.pf_salary_limit}
                      onChange={(e) =>
                        handleInputChange(
                          "pf_salary_limit",
                          parseInt(e.target.value) || 0
                        )
                      }
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ESI Card */}
          <div className="settings-card">
            <div className="card-header">
              <div className="header-content">
                <h4 className="card-title">Employee State Insurance (ESI)</h4>
                <ToggleSwitch
                  checked={formData.esi_enabled}
                  onChange={() => handleToggle("esi_enabled")}
                  id="esi-toggle"
                  tooltip="Employer contribution is part of CTC, not deducted from employee salary"
                />
              </div>
            </div>
            {formData.esi_enabled && (
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Employee %
                      <TooltipIcon text="Percentage deducted from employee salary" />
                    </label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        className="form-control"
                        value={formData.esi_employee_percentage}
                        onChange={(e) =>
                          handleInputChange(
                            "esi_employee_percentage",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="input-suffix">%</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Employer %
                      <TooltipIcon text="Percentage added to employer CTC (not deducted from employee)" />
                    </label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        className="form-control"
                        value={formData.esi_employer_percentage}
                        onChange={(e) =>
                          handleInputChange(
                            "esi_employer_percentage",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="input-suffix">%</span>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Salary Limit
                    <TooltipIcon text="Maximum salary on which ESI is calculated" />
                  </label>
                  <div className="input-with-prefix">
                    <span className="input-prefix">₹</span>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.esi_salary_limit}
                      onChange={(e) =>
                        handleInputChange(
                          "esi_salary_limit",
                          parseInt(e.target.value) || 0
                        )
                      }
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Professional Tax Card */}
          <div className="settings-card">
            <div className="card-header">
              <div className="header-content">
                <h4 className="card-title">Professional Tax (PT)</h4>
                <div className="toggle-container-small">
                  <ToggleSwitch
                    checked={formData.pt_enabled}
                    onChange={() => handleToggle("pt_enabled")}
                    id="pt-toggle"
                    tooltip="Professional tax will be calculated by backend based on employee state and salary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Gratuity Card */}
          <div className="settings-card">
            <div className="card-header">
              <div className="header-content">
                <h4 className="card-title">Gratuity</h4>
                <ToggleSwitch
                  checked={formData.gratuity_enabled}
                  onChange={() => handleToggle("gratuity_enabled")}
                  id="gratuity-toggle"
                  tooltip="Gratuity accrual added to employer CTC, not part of monthly salary"
                />
              </div>
            </div>
            {formData.gratuity_enabled && (
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">
                    Percentage
                    <TooltipIcon text="Gratuity accrual percentage (typically 4.81% of basic salary)" />
                  </label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      className="form-control"
                      value={formData.gratuity_percentage}
                      onChange={(e) =>
                        handleInputChange(
                          "gratuity_percentage",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      step="0.01"
                      min="0"
                      max="100"
                    />
                    <span className="input-suffix">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Payslip & Tax Settings Section */}
      <div className="settings-section">
        <div className="section-header">
          <h3 className="section-title">
            <i className="ti ti-file-invoice me-2"></i>
            Payslip & Tax Settings
          </h3>
          <p className="section-description">
            Configure payslip generation and tax calculation settings
          </p>
        </div>

        <div className="settings-grid">
          <div className="settings-card">
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Standard Deduction
                    <TooltipIcon text="Fixed government deduction for salaried employees (read-only)" />
                  </label>
                  <div className="input-with-prefix readonly-input">
                    <span className="input-prefix">₹</span>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.standard_deduction.toLocaleString("en-IN")}
                      readOnly
                    />
                    <span className="readonly-badge">Fixed</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Default Currency
                    <TooltipIcon text="Currency used for payslip generation" />
                  </label>
                  <select
                    className="form-select"
                    value={formData.default_currency}
                    onChange={(e) =>
                      handleInputChange("default_currency", e.target.value)
                    }
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <div className="toggle-row">
                  <div className="toggle-label-content">
                    <label className="form-label mb-0">
                      Auto-process Payroll
                      <TooltipIcon text="Automatically process payroll on the scheduled day each month" />
                    </label>
                    <p className="form-text">
                      Automatically process payroll on the scheduled processing day
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={formData.auto_process_payroll}
                    onChange={() => handleToggle("auto_process_payroll")}
                    id="auto-process-payroll-toggle"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Action Buttons */}
      <div className="fixed-action-buttons">
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

// Toggle Switch Component
interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  id: string;
  tooltip?: string;
}

interface ToggleSwitchWithPermissionProps extends ToggleSwitchProps {
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchWithPermissionProps> = ({
  checked,
  onChange,
  id,
  tooltip,
  disabled = false,
}) => {
  return (
    <div className="toggle-container" data-tooltip={tooltip}>
      <input
        type="checkbox"
        className="toggle-switch"
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <label htmlFor={id} className="toggle-label"></label>
    </div>
  );
};

// Tooltip Icon Component
interface TooltipIconProps {
  text: string;
}

const TooltipIcon: React.FC<TooltipIconProps> = ({ text }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2,
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <span
        className="tooltip-icon"
        ref={iconRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <i className="ti ti-info-circle"></i>
      </span>
      {showTooltip && (
        <div
          className="tooltip-popup"
          style={{
            position: 'fixed',
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-10px',
            zIndex: 99999,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {text}
          <div className="tooltip-arrow"></div>
        </div>
      )}
    </>
  );
};

export default PayrollSettingsForm;
