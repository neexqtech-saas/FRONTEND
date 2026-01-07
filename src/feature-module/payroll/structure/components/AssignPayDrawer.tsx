/**
 * Assign Pay Drawer Component - READ ONLY DETAIL VIEW
 * Shows salary assignment details in read-only mode
 */

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import "./AssignPayDrawer.scss";

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

interface AssignPayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeData: {
    assignment_id?: string;
    employee_id: string;
    employee_name: string;
    emp_id?: string;
    custom_employee_id?: string;
    structure_id: number;
    structure_name: string;
    gross_salary?: number;
    effective_month: number;
    effective_year: number;
    effective_month_name: string;
    earnings?: any[];
    deductions?: any[];
    total_earnings?: number;
    total_deductions?: number;
    net_pay?: number;
  } | null;
  payType: "yearly" | "monthly";
}

const AssignPayDrawer: React.FC<AssignPayDrawerProps> = ({
  isOpen,
  onClose,
  employeeData,
  payType,
}) => {
  const [loading, setLoading] = useState(false);
  const [assignmentDetails, setAssignmentDetails] = useState<any>(null);

  // Load assignment details when drawer opens
  useEffect(() => {
    if (isOpen && employeeData) {
      loadAssignmentDetails();
    }
  }, [isOpen, employeeData]);

  const loadAssignmentDetails = async () => {
    if (!employeeData) return;

    setLoading(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        toast.error("Admin ID not found");
        setAssignmentDetails(employeeData);
        setLoading(false);
        return;
      }

      // If assignment_id is available, fetch full details
      if (employeeData.assignment_id) {
        const token = sessionStorage.getItem("access_token");
        const response = await fetch(
          `http://127.0.0.1:8000/api/payroll/employee-structure/${admin_id}/${employeeData.employee_id}/${employeeData.assignment_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();
        if (data?.status === 200 && data?.data) {
          // Merge employeeData with API response
          setAssignmentDetails({
            ...employeeData,
            ...data.data,
            payroll_breakdown: data.data.payroll_breakdown || null,
          });
        } else {
          // Fallback to employeeData if API fails
          setAssignmentDetails(employeeData);
        }
      } else {
        // Use employeeData directly if no assignment_id
        // employeeData already contains earnings, deductions, etc. from assign-pay API
        setAssignmentDetails(employeeData);
      }
    } catch (error: any) {
      console.error("Error loading assignment details:", error);
      // Fallback to employeeData
      setAssignmentDetails(employeeData);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getCalculationText = (component: any) => {
    if (component.is_balancer) {
      return "Auto-calculated";
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

  // Get components from assignment details or employeeData
  // Check multiple possible locations for payroll breakdown data
  const payrollBreakdown = assignmentDetails?.payroll_breakdown || assignmentDetails || employeeData;
  
  // Try multiple paths to get earnings and deductions
  const earnings = payrollBreakdown?.earnings || 
                   assignmentDetails?.earnings || 
                   employeeData?.earnings || 
                   [];
  
  const deductions = payrollBreakdown?.deductions || 
                     assignmentDetails?.deductions || 
                     employeeData?.deductions || 
                     [];
  
  const totalEarnings = payrollBreakdown?.total_earnings || 
                        assignmentDetails?.total_earnings || 
                        employeeData?.total_earnings || 
                        assignmentDetails?.gross_salary || 
                        employeeData?.gross_salary || 
                        0;
  
  const totalDeductions = payrollBreakdown?.total_deductions || 
                          assignmentDetails?.total_deductions || 
                          employeeData?.total_deductions || 
                          0;
  
  const netPay = payrollBreakdown?.net_pay || 
                 assignmentDetails?.net_pay || 
                 employeeData?.net_pay || 
                 (totalEarnings - totalDeductions);

  // Convert gross salary based on pay type
  const grossSalary = employeeData.gross_salary || 0;
  const displayGrossSalary = payType === "yearly" ? grossSalary : grossSalary / 12;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`assign-pay-drawer-backdrop ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`assign-pay-drawer ${isOpen ? "open" : ""}`}>
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
          {loading ? (
            <div className="loading-state">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading salary details...</p>
            </div>
          ) : (
            <>
              {/* Section: Gross Pay - Read Only */}
              <div className="section gross-pay-section">
                <label className="section-label">
                  <i className="ti ti-currency-rupee me-2" />
                  Gross Pay ({payType === "yearly" ? "Yearly" : "Monthly"})
                </label>
                <div className="input-group">
                  <span className="input-group-text">₹</span>
                  <input
                    type="text"
                    className="form-control"
                    value={displayGrossSalary.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    readOnly
                    disabled
                    style={{
                      backgroundColor: "#f8f9fa",
                      cursor: "not-allowed",
                      opacity: 0.8,
                    }}
                  />
                </div>
              </div>

              {/* Section: Earnings - Read Only */}
              <div className="section earnings-section">
                <label className="section-label">
                  <i className="ti ti-arrow-up me-2 text-success" />
                  Earnings
                </label>
                <div className="components-list">
                  {earnings.length === 0 ? (
                    <p className="text-muted text-center py-3">No earning components found</p>
                  ) : (
                    earnings.map((component: any) => {
                      // Handle both formats: with is_enabled or without (default to enabled if calculated_amount > 0)
                      const isEnabled = component.is_enabled !== undefined 
                        ? component.is_enabled 
                        : (component.calculated_amount > 0);
                      const isBalancer = component.is_balancer || false;
                      
                      return (
                        <div
                          key={component.id || component.component_id || component.component_name}
                          className={`component-row ${isBalancer ? "balancer locked" : ""}`}
                        >
                          <div className="component-status">
                            {isEnabled ? (
                              <i className="ti ti-check-circle text-success" />
                            ) : (
                              <i className="ti ti-x-circle text-muted" />
                            )}
                          </div>
                          <div className="component-info">
                            <div className="component-name">
                              {component.name || component.component_name}
                              {isBalancer && (
                                <span className="badge badge-auto ms-2">Auto</span>
                              )}
                            </div>
                            <div className="component-calculation">
                              {getCalculationText(component)}
                            </div>
                          </div>
                          <div className="component-amount">
                            {isEnabled && component.calculated_amount > 0 ? (
                              formatCurrency(component.calculated_amount || 0)
                            ) : (
                              <span className="text-muted">₹0.00</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Section: Deductions - Read Only */}
              <div className="section deductions-section">
                <label className="section-label">
                  <i className="ti ti-arrow-down me-2 text-danger" />
                  Deductions
                </label>
                <div className="components-list">
                  {deductions.length === 0 ? (
                    <p className="text-muted text-center py-3">No deduction components found</p>
                  ) : (
                    deductions.map((component: any) => {
                      // Handle both formats: with is_enabled or without (default to enabled if calculated_amount > 0)
                      const isEnabled = component.is_enabled !== undefined 
                        ? component.is_enabled 
                        : (component.calculated_amount > 0);
                      
                      return (
                        <div key={component.id || component.component_id || component.component_name} className="component-row">
                          <div className="component-status">
                            {isEnabled ? (
                              <i className="ti ti-check-circle text-success" />
                            ) : (
                              <i className="ti ti-x-circle text-muted" />
                            )}
                          </div>
                          <div className="component-info">
                            <div className="component-name">{component.name || component.component_name}</div>
                            <div className="component-calculation">
                              {getCalculationText(component)}
                            </div>
                          </div>
                          <div className="component-amount">
                            {isEnabled && component.calculated_amount > 0 ? (
                              formatCurrency(component.calculated_amount || 0)
                            ) : (
                              <span className="text-muted">₹0.00</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Section: Summary - Read Only */}
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

        {/* Footer - Only Close Button */}
        <div className="drawer-footer">
          <button
            type="button"
            className="btn btn-primary w-100"
            onClick={onClose}
          >
            <i className="ti ti-x me-2" />
            Close
          </button>
        </div>
      </div>
    </>
  );
};

export default AssignPayDrawer;
