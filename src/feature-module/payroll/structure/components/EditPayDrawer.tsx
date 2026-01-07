/**
 * Edit Pay Drawer Component
 * Right-side slide drawer for editing employee pay settings
 */

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import { payrollStructureAPI } from "../utils/api";
import "./EditPayDrawer.scss";

interface Component {
  id: number;
  name: string;
  component_type: "earning" | "deduction";
  calculation_type: "fixed" | "percentage";
  component_value: number;
  is_balancer: boolean;
  is_enabled: boolean;
  calculated_amount: number;
}

interface PayrollData {
  earnings: Component[];
  deductions: Component[];
  total_earnings: number;
  total_deductions: number;
  net_pay: number;
  gross_salary: number;
  breakdown: Component[];
}

interface EditPayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeData: {
    employee_id: string;
    employee_name: string;
    emp_id?: string;
    custom_employee_id?: string;
    structure_id: number;
    structure_name: string;
    gross_salary: number;
    effective_month: number;
    effective_year: number;
    effective_month_name: string;
    assignment_id?: number;
  } | null;
  payType: "yearly" | "monthly";
  onSave?: () => void;
}

const EditPayDrawer: React.FC<EditPayDrawerProps> = ({
  isOpen,
  onClose,
  employeeData,
  payType,
  onSave,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [grossPay, setGrossPay] = useState<number>(0);
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalGrossPay, setOriginalGrossPay] = useState<number>(0);

  const BASE_URL = "http://127.0.0.1:8000/api/payroll";

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("access_token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // Fetch payroll calculation
  const fetchPayrollCalculation = useCallback(async () => {
    if (!employeeData) return;

    setLoading(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        toast.error("Admin ID not found");
        return;
      }

      // First, get the employee salary structure
      const structureResponse = await axios.get(
        `${BASE_URL}/employee-structure/${admin_id}/${employeeData.employee_id}`,
        getAuthHeaders()
      );

      if (structureResponse?.data?.status === 200 && structureResponse?.data?.data) {
        const assignments = Array.isArray(structureResponse.data.data)
          ? structureResponse.data.data
          : [structureResponse.data.data];

        // Find the assignment matching the effective month/year
        let assignment = assignments.find(
          (a: any) =>
            a.effective_month === employeeData.effective_month &&
            a.effective_year === employeeData.effective_year
        );

        // If not found, use the most recent assignment
        if (!assignment && assignments.length > 0) {
          assignment = assignments.sort((a: any, b: any) => {
            if (b.effective_year !== a.effective_year) {
              return b.effective_year - a.effective_year;
            }
            return b.effective_month - a.effective_month;
          })[0];
        }

        if (!assignment) {
          toast.error("Salary structure assignment not found");
          return;
        }

        // Calculate payroll using the new service
        const grossSalaryForCalc = payType === "yearly" 
          ? (grossPay || employeeData.gross_salary)
          : ((grossPay || employeeData.gross_salary / 12) * 12);
        
        const calcResponse = await payrollStructureAPI.calculatePayroll(
          admin_id,
          employeeData.employee_id,
          {
            assignment_id: assignment.id,
            gross_salary: grossSalaryForCalc,
          }
        );

        if (calcResponse?.data?.status === 200 && calcResponse?.data?.data) {
          const data = calcResponse.data.data;
          setPayrollData(data);
          
          // Combine earnings and deductions
          const allComponents = [...(data.earnings || []), ...(data.deductions || [])];
          setComponents(allComponents);
        } else {
          toast.error("Failed to calculate payroll");
        }
      }
    } catch (error: any) {
      console.error("Error fetching payroll calculation:", error);
      toast.error(error.response?.data?.message || "Failed to fetch payroll calculation");
    } finally {
      setLoading(false);
    }
  }, [employeeData, grossPay]);

  // Initialize data when drawer opens
  useEffect(() => {
    if (isOpen && employeeData) {
      const initialGross = payType === "yearly" 
        ? employeeData.gross_salary 
        : employeeData.gross_salary / 12;
      setGrossPay(initialGross);
      setOriginalGrossPay(initialGross);
      setHasChanges(false);
      fetchPayrollCalculation();
    }
  }, [isOpen, employeeData, payType]);

  // Recalculate when gross pay changes
  useEffect(() => {
    if (isOpen && employeeData && grossPay !== originalGrossPay) {
      const debounceTimer = setTimeout(() => {
        fetchPayrollCalculation();
        setHasChanges(true);
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [grossPay, isOpen, employeeData]);

  // Handle component toggle
  const handleToggleComponent = async (componentId: number, isEnabled: boolean) => {
    if (!employeeData) return;

    // Find if it's a balancer component
    const component = components.find((c) => c.id === componentId);
    if (component?.is_balancer) {
      toast.warning("Balancer component cannot be toggled");
      return;
    }

    setLoading(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        toast.error("Admin ID not found");
        return;
      }

      // Update component toggle
      const response = await payrollStructureAPI.updateEmployeeComponent(
        admin_id,
        employeeData.employee_id,
        componentId,
        { is_enabled: isEnabled }
      );

      if (response?.data?.status === 200) {
        // Update local state
        setComponents((prev) =>
          prev.map((c) => (c.id === componentId ? { ...c, is_enabled: isEnabled } : c))
        );
        setHasChanges(true);
        
        // Recalculate payroll
        await fetchPayrollCalculation();
      } else {
        toast.error("Failed to update component");
      }
    } catch (error: any) {
      console.error("Error toggling component:", error);
      toast.error(error.response?.data?.message || "Failed to update component");
    } finally {
      setLoading(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!employeeData) return;

    // Validate gross pay
    if (grossPay <= 0) {
      toast.error("Gross pay must be greater than 0");
      return;
    }

    // Validate that earnings sum to gross (with tolerance for rounding)
    if (payrollData) {
      const totalEarnings = payrollData.total_earnings;
      const expectedGross = payType === "yearly" ? grossPay : grossPay * 12;
      const difference = Math.abs(totalEarnings - expectedGross);
      
      if (difference > 1) {
        toast.error(`Total earnings (${totalEarnings.toLocaleString('en-IN')}) does not match gross salary (${expectedGross.toLocaleString('en-IN')})`);
        return;
      }
    }

    setSaving(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        toast.error("Admin ID not found");
        return;
      }

      // Update gross salary
      const structureResponse = await axios.get(
        `${BASE_URL}/employee-structure/${admin_id}/${employeeData.employee_id}`,
        getAuthHeaders()
      );

      if (structureResponse?.data?.status === 200 && structureResponse?.data?.data) {
        const assignments = Array.isArray(structureResponse.data.data)
          ? structureResponse.data.data
          : [structureResponse.data.data];

        const assignment = assignments.find(
          (a: any) =>
            a.effective_month === employeeData.effective_month &&
            a.effective_year === employeeData.effective_year
        );

        if (assignment) {
          const newGrossSalary = payType === "yearly" ? grossPay : grossPay * 12;
          
          const updateResponse = await axios.put(
            `${BASE_URL}/employee-structure/${admin_id}/${employeeData.employee_id}/${assignment.id}`,
            { gross_salary: newGrossSalary.toString() },
            getAuthHeaders()
          );
          
          if (updateResponse?.data?.status !== 200) {
            throw new Error(updateResponse?.data?.message || "Failed to update gross salary");
          }

          // Recalculate to save calculated amounts
          await fetchPayrollCalculation();

          toast.success("Pay settings saved successfully");
          setHasChanges(false);
          setOriginalGrossPay(grossPay);
          onSave?.();
          onClose();
        }
      }
    } catch (error: any) {
      console.error("Error saving pay settings:", error);
      toast.error(error.response?.data?.message || "Failed to save pay settings");
    } finally {
      setSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Get calculation display text
  const getCalculationText = (component: Component) => {
    if (component.is_balancer) {
      return "Auto Adjusted";
    }
    if (component.calculation_type === "percentage") {
      return `${component.component_value}% of Gross`;
    }
    return "Fixed Amount";
  };

  if (!isOpen || !employeeData) return null;

  const monthNames = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const earnings = components.filter((c) => c.component_type === "earning");
  const deductions = components.filter((c) => c.component_type === "deduction");
  const enabledEarnings = earnings.filter((c) => c.is_enabled);
  const enabledDeductions = deductions.filter((c) => c.is_enabled);

  const totalEarnings = enabledEarnings.reduce((sum, c) => sum + c.calculated_amount, 0);
  const totalDeductions = enabledDeductions.reduce((sum, c) => sum + c.calculated_amount, 0);
  const netPay = totalEarnings - totalDeductions;

  // Check if save should be disabled
  const isSaveDisabled = Boolean(
    saving ||
    loading ||
    grossPay <= 0 ||
    (payrollData && Math.abs(totalEarnings - (payType === "yearly" ? grossPay : grossPay * 12)) > 1)
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`edit-pay-drawer-backdrop ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`edit-pay-drawer ${isOpen ? "open" : ""}`}>
        {/* Header */}
        <div className="drawer-header">
          <div className="header-content">
            <div className="employee-info">
              <h4 className="employee-name">{employeeData.employee_name}</h4>
              <p className="employee-id">
                {employeeData.custom_employee_id || employeeData.emp_id || employeeData.employee_id}
              </p>
            </div>
            <button className="close-btn" onClick={onClose} type="button">
              <i className="ti ti-x" />
            </button>
          </div>
          <div className="header-meta">
            <span className="badge badge-structure">{employeeData.structure_name}</span>
            <span className="badge badge-period">
              {monthNames[employeeData.effective_month]} {employeeData.effective_year}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {loading && !payrollData ? (
            <div className="loading-state">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Calculating payroll...</p>
            </div>
          ) : (
            <>
              {/* Section A: Gross Pay */}
              <div className="section gross-pay-section">
                <label className="section-label">
                  <i className="ti ti-currency-rupee me-2" />
                  Gross Pay ({payType === "yearly" ? "Yearly" : "Monthly"})
                </label>
                <div className="input-group">
                  <span className="input-group-text">₹</span>
                  <input
                    type="number"
                    className="form-control"
                    value={grossPay}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setGrossPay(value);
                    }}
                    step="0.01"
                    min="0"
                    disabled={loading}
                  />
                </div>
                <small className="form-text text-muted">
                  <i className="ti ti-info-circle me-1" />
                  Gross pay will always total 100% of earnings
                </small>
              </div>

              {/* Section B: Salary Components */}
              <div className="section components-section">
                <label className="section-label">
                  <i className="ti ti-list me-2" />
                  Salary Components
                </label>
                <div className="components-list">
                  {/* Earnings */}
                  {earnings.length > 0 && (
                    <div className="components-group">
                      <h6 className="group-title">Earnings</h6>
                      {earnings.map((component) => (
                        <div
                          key={component.id}
                          className={`component-row ${component.is_balancer ? "balancer" : ""}`}
                        >
                          <div className="component-toggle">
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={component.is_enabled}
                                onChange={(e) =>
                                  handleToggleComponent(component.id, e.target.checked)
                                }
                                disabled={component.is_balancer || loading}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                          <div className="component-info">
                            <div className="component-name">
                              {component.name}
                              {component.is_balancer && (
                                <span className="badge badge-auto">Auto</span>
                              )}
                            </div>
                            <div className="component-calculation">
                              {getCalculationText(component)}
                            </div>
                          </div>
                          <div className="component-amount">
                            {formatCurrency(component.calculated_amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Deductions */}
                  {deductions.length > 0 && (
                    <div className="components-group">
                      <h6 className="group-title">Deductions</h6>
                      {deductions.map((component) => (
                        <div key={component.id} className="component-row">
                          <div className="component-toggle">
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={component.is_enabled}
                                onChange={(e) =>
                                  handleToggleComponent(component.id, e.target.checked)
                                }
                                disabled={loading}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                          <div className="component-info">
                            <div className="component-name">{component.name}</div>
                            <div className="component-calculation">
                              {getCalculationText(component)}
                            </div>
                          </div>
                          <div className="component-amount">
                            {formatCurrency(component.calculated_amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section C: Summary */}
              <div className="section summary-section">
                <label className="section-label">
                  <i className="ti ti-calculator me-2" />
                  Summary
                </label>
                <div className="summary-list">
                  <div className="summary-row">
                    <span className="summary-label">Total Earnings</span>
                    <span className="summary-value text-success">
                      {formatCurrency(totalEarnings)}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Total Deductions</span>
                    <span className="summary-value text-danger">
                      {formatCurrency(totalDeductions)}
                    </span>
                  </div>
                  <div className="summary-row summary-row-total">
                    <span className="summary-label">Net Pay</span>
                    <span className="summary-value fw-bold">
                      {formatCurrency(netPay)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            {saving ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                Saving...
              </>
            ) : (
              <>
                <i className="ti ti-check me-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default EditPayDrawer;
