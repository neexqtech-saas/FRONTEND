/**
 * Run Payroll Component
 * Attendance sheet for entering payable days and calculating payroll
 */

import React, { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import { runPayrollAPI } from "../utils/api";
import Table from "../../../../core/common/dataTable/index";
import AttendanceUpload from "./AttendanceUpload";

// Try to import xlsx, fallback to CSV if not available
// Using dynamic import to avoid TypeScript errors
let XLSX: any = null;

const RunPayroll: React.FC = () => {
  // Get current year and month for default values
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [payrollReports, setPayrollReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showAttendanceUpload, setShowAttendanceUpload] = useState(false);

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

  const fetchPayrollReports = useCallback(async () => {
    setLoading(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        setLoading(false);
        return;
      }

      const response = await runPayrollAPI.getPayrollReports(
        admin_id,
        selectedMonth,
        selectedYear
      );

      if (response?.status === 200 && response?.data?.reports) {
        setPayrollReports(response.data.reports);
      } else {
        setPayrollReports([]);
      }
    } catch (error: any) {
      console.error("Error fetching payroll reports:", error);
      toast.error("Failed to fetch payroll reports");
      setPayrollReports([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchPayrollReports();
  }, [fetchPayrollReports]);

  const handleGeneratePayroll = async () => {
    setGenerating(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        setGenerating(false);
        return;
      }

      const response = await runPayrollAPI.generatePayroll(admin_id, {
        month: selectedMonth,
        year: selectedYear,
      });

      if (response?.status === 200 || response?.status === 201) {
        toast.success(response?.message || `Payroll generated successfully for ${response.data?.generated_count || 0} employees`);
        // Refresh reports
        fetchPayrollReports();
      } else {
        toast.error(response?.message || "Failed to generate payroll");
      }
    } catch (error: any) {
      console.error("Error generating payroll:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to generate payroll";
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (payrollReports.length === 0) {
      toast.error("No payroll data to download");
      return;
    }

    // Prepare data for Excel
    const excelData = payrollReports.map((report: any) => ({
      "Employee ID": report.employee_id || report.custom_employee_id || "N/A",
      "Employee Name": report.employee_name || "N/A",
      "Gross Salary": report.gross_salary || 0,
      "Payable Days": report.payable_days || "",
      "Total Earnings": report.total_earnings || 0,
      "Total Deductions": report.total_deductions || 0,
      "Net Pay": report.net_pay || 0,
      "Status": report.status || "N/A",
    }));

    // Generate filename
    const monthName = months.find((m) => m.value === selectedMonth)?.label || `Month-${selectedMonth}`;

    // Try to load xlsx dynamically
    try {
      const xlsxModule = await import("xlsx" as any);
      XLSX = xlsxModule;
      
      try {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        ws["!cols"] = [
          { wch: 15 }, // Employee ID
          { wch: 25 }, // Employee Name
          { wch: 15 }, // Gross Salary
          { wch: 15 }, // Payable Days
          { wch: 18 }, // Total Earnings
          { wch: 18 }, // Total Deductions
          { wch: 15 }, // Net Pay
          { wch: 12 }, // Status
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Payroll Report");

        const filename = `Payroll_Report_${monthName}_${selectedYear}.xlsx`;
        XLSX.writeFile(wb, filename);
        toast.success("Payroll report downloaded successfully");
        return;
      } catch (error) {
        console.error("Error generating Excel file:", error);
      }
    } catch (importError) {
      console.warn("xlsx package not found, using CSV format");
    }

    // Fallback to CSV
    const headers = ["Employee ID", "Employee Name", "Gross Salary", "Payable Days", "Total Earnings", "Total Deductions", "Net Pay", "Status"];
    const csvRows = [
      headers.join(","),
      ...excelData.map((row: any) =>
        [
          `"${row["Employee ID"]}"`,
          `"${row["Employee Name"]}"`,
          row["Gross Salary"] || 0,
          row["Payable Days"] || "",
          row["Total Earnings"] || 0,
          row["Total Deductions"] || 0,
          row["Net Pay"] || 0,
          `"${row["Status"]}"`,
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Payroll_Report_${monthName}_${selectedYear}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Payroll report downloaded as CSV");
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined) return "₹0.00";
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return "₹0.00";
    return `₹${numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const columns = [
    {
      title: "Employee ID",
      dataIndex: "custom_employee_id",
      render: (_: any, record: any) => {
        return <span className="fw-semibold">{record.custom_employee_id || record.employee_id || "N/A"}</span>;
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
      title: "Payable Days",
      dataIndex: "payable_days",
      render: (_: any, record: any) => {
        return <span>{record.payable_days || 0}</span>;
      },
    },
    {
      title: "Gross Salary",
      dataIndex: "gross_salary",
      render: (_: any, record: any) => {
        return <span className="text-primary fw-semibold">{formatCurrency(record.gross_salary || 0)}</span>;
      },
    },
    {
      title: "Total Earnings",
      dataIndex: "total_earnings",
      render: (_: any, record: any) => {
        return <span className="text-success fw-semibold">{formatCurrency(record.total_earnings || 0)}</span>;
      },
    },
    {
      title: "Total Deductions",
      dataIndex: "total_deductions",
      render: (_: any, record: any) => {
        return <span className="text-danger fw-semibold">{formatCurrency(record.total_deductions || 0)}</span>;
      },
    },
    {
      title: "Net Pay",
      dataIndex: "net_pay",
      render: (_: any, record: any) => {
        return <span className="text-primary fw-bold">{formatCurrency(record.net_pay || 0)}</span>;
      },
    },
  ];

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-4">
            <div className="my-auto mb-2">
              <h2 className="mb-1 fw-bold">
                <i className="ti ti-calendar-check me-2 text-primary" />
                Run Payroll
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
                    Run Payroll
                  </li>
                </ol>
              </nav>
            </div>
          </div>

          <div className="container-fluid">
            <ToastContainer />

            {/* Attendance Upload Section */}
            {showAttendanceUpload && (
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white border-bottom py-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-semibold">
                      <i className="ti ti-upload me-2 text-primary" />
                      Upload Attendance Sheet
                    </h5>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setShowAttendanceUpload(false)}
                    >
                      <i className="ti ti-x me-1" />
                      Close
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <AttendanceUpload />
                </div>
              </div>
            )}

            {/* Month/Year Selection and Buttons */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="mb-0 fw-semibold">
                  <i className="ti ti-calendar me-2 text-primary" />
                  Select Period
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3 align-items-end">
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">
                      <i className="ti ti-calendar me-1 text-muted" />
                      Month
                    </label>
                    <select
                      className="form-select"
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(parseInt(e.target.value));
                        fetchPayrollReports();
                      }}
                    >
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
                      Year
                    </label>
                    <select
                      className="form-select"
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(parseInt(e.target.value));
                        fetchPayrollReports();
                      }}
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={() => setShowAttendanceUpload(true)}
                    >
                      <i className="ti ti-upload me-2" />
                      Attendance
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Payroll Report Table */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white border-bottom py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-semibold">
                    <i className="ti ti-file-spreadsheet me-2 text-primary" />
                    Payroll Report - {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                  </h5>
                  <button
                    className="btn btn-outline-success btn-sm"
                    onClick={handleDownloadExcel}
                    disabled={payrollReports.length === 0}
                  >
                    <i className="ti ti-download me-1" />
                    Download Excel
                  </button>
                </div>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : payrollReports.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="ti ti-file-off" style={{ fontSize: "48px", color: "#ccc" }} />
                    <p className="text-muted mt-3">No payroll reports found for this period. Click "Generate Payroll" to create reports.</p>
                  </div>
                ) : (
                  <Table
                    dataSource={payrollReports}
                    columns={columns}
                    Selection={false}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RunPayroll;
