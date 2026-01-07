/**
 * Assign Pay Component
 * Assign yearly/monthly pay to employees
 */

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import Table from "../../../../core/common/dataTable/index";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import { all_routes } from "../../../../feature-module/router/all_routes";
import { payrollStructureAPI } from "../utils/api";
import AssignPayDrawer from "./AssignPayDrawer";

const AssignPay: React.FC = () => {
  // Get current year and month for default values
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [payType, setPayType] = useState<"yearly" | "monthly">("yearly");
  const [employees, setEmployees] = useState<any[]>([]);
  const [payBreakdowns, setPayBreakdowns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number | null>(currentYear);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Month options
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  // Year options (current year and past/future 5 years)
  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.push(i);
  }

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("access_token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const fetchPayBreakdowns = useCallback(async () => {
    setLoading(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        setLoading(false);
        return;
      }

      // Send month/year to backend (or undefined to use backend defaults)
      const response = await payrollStructureAPI.assignPayAPI.list(
        admin_id,
        payType,
        selectedMonth || undefined,
        selectedYear || undefined
      );

      if (response?.status === 200) {
        // Handle both 'data' and 'results' response formats
        const data = response.results || response.data;
        if (data && Array.isArray(data)) {
          // Normalize data to ensure 'components' object exists
          const normalizedData = data.map((item: any) => {
            // If components object is missing or empty, try to build it from earnings/deductions
            if ((!item.components || Object.keys(item.components).length === 0) && (item.earnings || item.deductions)) {
              const components: any = {};

              if (Array.isArray(item.earnings)) {
                item.earnings.forEach((e: any) => {
                  const name = e.name || e.component_name;
                  // Use calculated_amount, amount, or value
                  const value = e.calculated_amount !== undefined ? e.calculated_amount : (e.amount !== undefined ? e.amount : e.value);
                  if (name) components[name] = value;
                });
              }

              if (Array.isArray(item.deductions)) {
                item.deductions.forEach((d: any) => {
                  const name = d.name || d.component_name;
                  const value = d.calculated_amount !== undefined ? d.calculated_amount : (d.amount !== undefined ? d.amount : d.value);
                  if (name) components[name] = value;
                });
              }

              return { ...item, components };
            }
            return item;
          });

          setPayBreakdowns(normalizedData);
        } else {
          setPayBreakdowns([]);
        }
      } else {
        setPayBreakdowns([]);
      }
    } catch (error: any) {
      console.error("Error fetching pay breakdowns:", error);
      toast.error("Failed to fetch pay breakdowns");
      setPayBreakdowns([]);
    } finally {
      setLoading(false);
    }
  }, [payType, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchPayBreakdowns();
  }, [fetchPayBreakdowns]);

  const filteredPayBreakdowns = payBreakdowns.filter((pay: any) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const empId = (pay.emp_id || "").toString();
    const customId = (pay.custom_employee_id || "").toString();
    const name = (pay.employee_name || "").toLowerCase();
    const designation = (pay.designation || "").toLowerCase();
    return (
      empId.toLowerCase().includes(searchLower) ||
      customId.toLowerCase().includes(searchLower) ||
      name.includes(searchLower) ||
      designation.includes(searchLower)
    );
  });

  // Get all unique component names from all records
  const getAllComponentNames = () => {
    const componentNames = new Set<string>();
    payBreakdowns.forEach((pay: any) => {
      const components = pay.components || {};
      Object.keys(components).forEach((name) => {
        if (components[name] !== null && components[name] !== undefined) {
          componentNames.add(name);
        }
      });
    });
    return Array.from(componentNames).sort();
  };

  const componentNames = getAllComponentNames();

  // Base columns
  const baseColumns = [
    {
      title: "Employee ID",
      dataIndex: "employee_id",
      render: (_: any, record: any) => {
        return <span>{record.employee_id || record.emp_id || record.custom_employee_id || "N/A"}</span>;
      },
    },
    {
      title: "Employee Name",
      dataIndex: "employee_name",
      render: (_: any, record: any) => {
        return <span>{record.employee_name || "N/A"}</span>;
      },
    },

    {
      title: "Designation",
      dataIndex: "designation",
      render: (_: any, record: any) => {
        return <span>{record.designation || "N/A"}</span>;
      },
    },
    {
      title: `Gross Pay (${payType === "yearly" ? "Yearly" : "Monthly"})`,
      dataIndex: "gross_salary",
      render: (_: any, record: any) => {
        const gross = payType === "yearly" ? record.gross_salary : (record.gross_salary / 12);
        return <span className="fw-semibold">₹{gross?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</span>;
      },
    },
  ];

  // Add Total Earnings and Total Deductions columns before component columns
  const summaryColumns = [
    {
      title: `Total Earnings (${payType === "yearly" ? "Yearly" : "Monthly"})`,
      dataIndex: "total_earnings",
      render: (_: any, record: any) => {
        const totalEarnings = record.total_earnings || 0;
        const displayAmount = payType === "yearly" ? totalEarnings : (totalEarnings / 12);
        return <span className="fw-semibold text-success">₹{displayAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</span>;
      },
    },
    {
      title: `Total Deductions (${payType === "yearly" ? "Yearly" : "Monthly"})`,
      dataIndex: "total_deductions",
      render: (_: any, record: any) => {
        const totalDeductions = record.total_deductions || 0;
        const displayAmount = payType === "yearly" ? totalDeductions : (totalDeductions / 12);
        return <span className="fw-semibold text-danger">₹{displayAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</span>;
      },
    },
    {
      title: `Net Pay (${payType === "yearly" ? "Yearly" : "Monthly"})`,
      dataIndex: "net_pay",
      render: (_: any, record: any) => {
        const netPay = record.net_pay || 0;
        const displayAmount = payType === "yearly" ? netPay : (netPay / 12);
        return <span className="fw-bold text-primary">₹{displayAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</span>;
      },
    },
  ];

  // Create dynamic columns for each component
  const componentColumns = componentNames.map((componentName) => {
      // Check if it's a deduction (based on name or earnings/deductions dict)
      const isDeduction = componentName.toLowerCase().includes('deduction') ||
        componentName.toLowerCase().includes('pf') ||
        componentName.toLowerCase().includes('tax') ||
        componentName.toLowerCase().includes('esi');

      return {
        title: componentName,
        dataIndex: `component_${componentName}`,
        render: (_: any, record: any) => {
          const components = record.components || {};
          const amount = components[componentName];

          if (amount === null || amount === undefined) {
            return <span className="text-muted">-</span>;
          }

          const displayAmount = payType === "yearly" ? amount : (amount / 12);
          const textColor = isDeduction ? "text-danger" : "text-success";

          return (
            <span className={`fw-semibold ${textColor}`}>
              ₹{displayAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
            </span>
          );
        },
      };
    });

  // Combine base columns with summary columns and component columns
  const columns = [
    ...baseColumns,
    ...summaryColumns,
    ...componentColumns
  ];

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-4">
            <div className="my-auto mb-2">
              <h2 className="mb-1 fw-bold">
                <i className="ti ti-currency-rupee me-2 text-primary" />
                Assign Pay Detail
              </h2>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <a href="#" className="text-muted">
                      <i className="ti ti-smart-home" />
                    </a>
                  </li>
                  <li className="breadcrumb-item">
                    <a href="#" className="text-muted">Payroll</a>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Assign Pay Detail
                  </li>
                </ol>
              </nav>
            </div>
          </div>

          <div className="container-fluid">
            <ToastContainer />

            {/* Filters Section */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="mb-0 fw-semibold">
                  <i className="ti ti-filter me-2 text-primary" />
                  Filters & Search
                </h5>
              </div>
              <div className="card-body">
                {/* Pay Type Selection */}
                <div className="mb-4 pb-3 border-bottom">
                  <label className="form-label fw-semibold mb-3">Pay Type</label>
                  <div className="btn-group" role="group">
                    <button
                      type="button"
                      className={`btn ${payType === "yearly" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => setPayType("yearly")}
                    >
                      <i className="ti ti-calendar-year me-2" />
                      Yearly
                    </button>
                    <button
                      type="button"
                      className={`btn ${payType === "monthly" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => setPayType("monthly")}
                    >
                      <i className="ti ti-calendar-month me-2" />
                      Monthly
                    </button>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">
                      <i className="ti ti-calendar me-1 text-muted" />
                      Effective Month
                    </label>
                    <select
                      className="form-select"
                      value={selectedMonth || ""}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : null;
                        setSelectedMonth(value);
                      }}
                    >
                      <option value="">Current Month</option>
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label fw-semibold">
                      <i className="ti ti-calendar-event me-1 text-muted" />
                      Effective Year
                    </label>
                    <select
                      className="form-select"
                      value={selectedYear || ""}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : null;
                        setSelectedYear(value);
                      }}
                    >
                      <option value="">Current Year</option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">
                      <i className="ti ti-search me-1 text-muted" />
                      Search Employee
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <i className="ti ti-search text-muted" />
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="Name, ID, designation..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-md-2">
                    <label className="form-label fw-semibold d-block" style={{ visibility: "hidden" }}>
                      Actions
                    </label>
                    <button
                      className="btn btn-outline-secondary w-100"
                      onClick={() => {
                        setSelectedMonth(currentMonth);
                        setSelectedYear(currentYear);
                        setSearchQuery("");
                      }}
                      title="Reset all filters"
                    >
                      <i className="ti ti-refresh me-1" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Page Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="fw-bold mb-0">
                <i className="ti ti-currency-rupee me-2 text-primary" />
                {payType === "yearly" ? "Yearly" : "Monthly"} Pay Details
              </h4>
              <span className="badge bg-primary-subtle text-primary fs-6">
                {filteredPayBreakdowns.length} {filteredPayBreakdowns.length === 1 ? "Employee" : "Employees"}
              </span>
            </div>

            {/* Employee Table */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body">
                  {filteredPayBreakdowns.length === 0 ? (
                    <div className="text-center py-5">
                      <p className="text-muted">No pay breakdowns found. Please assign salary structures to employees first.</p>
                    </div>
                  ) : (
                    <Table
                      dataSource={filteredPayBreakdowns}
                      columns={columns}
                      Selection={false}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Pay Drawer - Read Only Detail View */}
      <AssignPayDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedEmployee(null);
        }}
        employeeData={selectedEmployee}
        payType={payType}
      />
    </>
  );
};

export default AssignPay;
