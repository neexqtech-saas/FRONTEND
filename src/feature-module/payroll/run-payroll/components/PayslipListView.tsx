/**
 * Payslip List View Component
 * View all generated payslips for employees
 */

import React, { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import { runPayrollAPI } from "../../structure/utils/api";
import "./PayslipListView.scss";

const PayslipListView: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("");
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);

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

  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.push(i);
  }

  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        setLoading(false);
        return;
      }

      const response = await runPayrollAPI.getPayslipList(
        admin_id,
        filterEmployeeId || undefined,
        selectedMonth,
        selectedYear
      );

      if (response?.status === true && response?.data?.payslips) {
        setPayslips(response.data.payslips);
      } else {
        setPayslips([]);
      }
    } catch (error: any) {
      console.error("Error fetching payslips:", error);
      toast.error("Failed to fetch payslips");
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, filterEmployeeId]);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const handleViewPayslip = async (payslip: any) => {
    try {
      // Check if payslip is generated (has payslip_number and valid data)
      if (!payslip.payslip_number) {
        toast.info("Payslip not generated yet");
        return;
      }

      // Use the payslip data directly from the list to show in modal
      setSelectedPayslip(payslip);
      setShowPayslipModal(true);
    } catch (error: any) {
      console.error("Error viewing payslip:", error);
      toast.error("Failed to load payslip");
    }
  };

  const handleDownloadFromModal = async () => {
    if (!selectedPayslip) return;

    try {
      // Import and use html2pdf to download PDF
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default;
      
      // Create payslip HTML
      const payslipHTML = generatePayslipHTML(selectedPayslip);
      
      // Create a temporary div with payslip content
      const div = document.createElement('div');
      div.innerHTML = payslipHTML;
      document.body.appendChild(div);
      
      const margin: [number, number, number, number] = [3, 3, 3, 3];
      const opt = {
        margin: margin,
        filename: `Payslip_${selectedPayslip.employee_name}_${selectedPayslip.month}_${selectedPayslip.year}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.92 },
        html2canvas: { 
          scale: 1.2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          windowWidth: 800,
          windowHeight: 1120,
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'a4' as const, 
          orientation: 'portrait' as const,
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any }
      };
      
      toast.info('Generating payslip PDF...');
      
      await html2pdf().set(opt as any).from(div).save();
      
      document.body.removeChild(div);
      toast.success('Payslip downloaded successfully');
    } catch (error: any) {
      console.error("Error downloading payslip:", error);
      toast.error("Failed to download payslip");
    }
  };

  const isPayslipGenerated = (payslip: any): boolean => {
    return payslip && payslip.payslip_number && payslip.employee_name;
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 
                  'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const convertHundreds = (n: number): string => {
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred';
        n %= 100;
        if (n > 0) result += ' ';
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)];
        if (n % 10 > 0) {
          result += ' ' + ones[n % 10];
        }
      } else if (n > 0) {
        result += ones[n];
      }
      return result;
    };
    
    let result = '';
    const numStr = Math.floor(num).toString();
    
    // Handle crores
    if (numStr.length > 7) {
      const crores = parseInt(numStr.slice(0, -7));
      if (crores > 0) {
        result += convertHundreds(crores) + ' Crore';
        if (parseInt(numStr.slice(-7)) > 0) result += ' ';
      }
    }
    
    // Handle lakhs
    if (numStr.length > 5) {
      const lakhs = parseInt(numStr.slice(-7, -5));
      if (lakhs > 0) {
        result += convertHundreds(lakhs) + ' Lakh';
        if (parseInt(numStr.slice(-5)) > 0) result += ' ';
      }
    }
    
    // Handle thousands
    if (numStr.length > 3) {
      const thousands = parseInt(numStr.slice(-5, -3));
      if (thousands > 0) {
        result += convertHundreds(thousands) + ' Thousand';
        if (parseInt(numStr.slice(-3)) > 0) result += ' ';
      }
    }
    
    // Handle hundreds, tens, and ones
    const remainder = parseInt(numStr.slice(-3));
    if (remainder > 0) {
      result += convertHundreds(remainder);
    }
    
    return result.trim();
  };

  const generatePayslipHTML = (payslipData: any): string => {
    const formatCurrency = (amount: number) => {
      return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    
    // Get month gross from custom_pay_summary_fields or use total_earnings as fallback
    const monthGross = payslipData.custom_pay_summary_fields?.month_gross 
      ? parseFloat(payslipData.custom_pay_summary_fields.month_gross)
      : (payslipData.total_earnings ? parseFloat(payslipData.total_earnings) : 0);
    
    return `
      <div style="font-family: 'Calibri', 'Arial', sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb;">
        ${payslipData.company_name ? `
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1f2937;">
            ${payslipData.company_logo_url ? `
              <img src="${payslipData.company_logo_url}" alt="Company Logo" style="max-height: 60px; margin-bottom: 12px;" />
            ` : ''}
            <h2 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">${payslipData.company_name}</h2>
            ${payslipData.company_address ? `
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 12px; line-height: 1.6;">${payslipData.company_address}</p>
            ` : ''}
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-bottom: 30px; padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb;">
          <h1 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 600; color: #111827; letter-spacing: 3px;">PAYSLIP</h1>
          ${payslipData.month && payslipData.year ? `
            <p style="margin: 0; color: #4b5563; font-size: 14px; font-weight: 500; text-transform: uppercase;">${payslipData.month} ${payslipData.year}</p>
          ` : ''}
        </div>
        
        ${payslipData.employee_name ? `
          <div style="margin-bottom: 30px; padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb;">
            <h4 style="margin: 0 0 18px 0; font-size: 14px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #d1d5db; padding-bottom: 8px;">Employee Information</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                  <tbody>
                    <tr>
                      <td style="padding: 8px 4px; width: 45%; color: #374151; font-weight: 600;">Employee Name:</td>
                      <td style="padding: 8px 4px; color: #111827; font-weight: 500;">${payslipData.employee_name}</td>
                    </tr>
                    ${(payslipData.employee_code || payslipData.employee_id) ? `
                      <tr>
                        <td style="padding: 8px 4px; color: #374151; font-weight: 600;">Employee ID:</td>
                        <td style="padding: 8px 4px; color: #111827; font-weight: 500;">${payslipData.employee_code || payslipData.employee_id || 'N/A'}</td>
                      </tr>
                    ` : ''}
                    ${payslipData.designation ? `
                      <tr>
                        <td style="padding: 8px 4px; color: #374151; font-weight: 600;">Designation:</td>
                        <td style="padding: 8px 4px; color: #111827; font-weight: 500;">${payslipData.designation}</td>
                      </tr>
                    ` : ''}
                    ${payslipData.department ? `
                      <tr>
                        <td style="padding: 8px 4px; color: #374151; font-weight: 600;">Department:</td>
                        <td style="padding: 8px 4px; color: #111827; font-weight: 500;">${payslipData.department}</td>
                      </tr>
                    ` : ''}
                  </tbody>
                </table>
              </div>
              <div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                  <tbody>
                    ${payslipData.pan_number ? `
                      <tr>
                        <td style="padding: 8px 4px; width: 45%; color: #374151; font-weight: 600;">PAN Number:</td>
                        <td style="padding: 8px 4px; color: #111827; font-weight: 500;">${payslipData.pan_number}</td>
                      </tr>
                    ` : ''}
                    ${payslipData.pay_date ? `
                      <tr>
                        <td style="padding: 8px 4px; color: #374151; font-weight: 600;">Pay Date:</td>
                        <td style="padding: 8px 4px; color: #111827; font-weight: 500;">${new Date(payslipData.pay_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                      </tr>
                    ` : ''}
                    ${payslipData.paid_days > 0 ? `
                      <tr>
                        <td style="padding: 8px 4px; color: #374151; font-weight: 600;">Paid Days:</td>
                        <td style="padding: 8px 4px; color: #111827; font-weight: 500;">${payslipData.paid_days} ${payslipData.loss_of_pay_days > 0 ? `(LOP: ${payslipData.loss_of_pay_days})` : ''}</td>
                      </tr>
                    ` : ''}
                    ${payslipData.payslip_number ? `
                      <tr>
                        <td style="padding: 8px 4px; color: #374151; font-weight: 600;">Payslip Number:</td>
                        <td style="padding: 8px 4px; color: #111827; font-weight: 500; font-family: 'Courier New', monospace;">${payslipData.payslip_number}</td>
                      </tr>
                    ` : ''}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ` : ''}
        
        <!-- Month Gross Salary Summary -->
        <div style="margin-bottom: 30px; padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px; font-weight: 500;">Monthly Gross Salary</div>
              <div style="font-size: 26px; font-weight: 600; color: #111827;">${payslipData.currency || '₹'} ${formatCurrency(monthGross)}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px; font-weight: 500;">Net Pay</div>
              <div style="font-size: 26px; font-weight: 600; color: #111827;">${payslipData.currency || '₹'} ${formatCurrency(parseFloat(payslipData.net_pay))}</div>
            </div>
          </div>
        </div>
        
        <!-- Earnings and Deductions Side by Side -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 30px;">
          ${payslipData.earnings && payslipData.earnings.length > 0 ? `
            <div>
              <h4 style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 8px; border-bottom: 2px solid #111827;">EARNINGS</h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 0; border: 1px solid #e5e7eb;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px 10px; font-size: 11px; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; border: 1px solid #e5e7eb;">Description</th>
                    <th style="padding: 12px 10px; font-size: 11px; text-align: right; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; border: 1px solid #e5e7eb;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${payslipData.earnings.map((earning: any, index: number) => earning.name ? `
                    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                      <td style="padding: 10px; color: #374151; border: 1px solid #e5e7eb;">${earning.name}</td>
                      <td style="padding: 10px; text-align: right; color: #111827; font-weight: 500; border: 1px solid #e5e7eb;">${payslipData.currency || '₹'} ${formatCurrency(parseFloat(earning.amount))}</td>
                    </tr>
                  ` : '').join('')}
                  <tr style="background-color: #f3f4f6; font-weight: 700;">
                    <td style="padding: 12px 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #111827; border: 1px solid #e5e7eb;">Total Earnings</td>
                    <td style="padding: 12px 10px; text-align: right; font-size: 13px; color: #111827; border: 1px solid #e5e7eb;">${payslipData.currency || '₹'} ${formatCurrency(parseFloat(payslipData.total_earnings))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ` : ''}
          
          ${payslipData.deductions && payslipData.deductions.length > 0 ? `
            <div>
              <h4 style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 8px; border-bottom: 2px solid #111827;">DEDUCTIONS</h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 0; border: 1px solid #e5e7eb;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px 10px; font-size: 11px; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; border: 1px solid #e5e7eb;">Description</th>
                    <th style="padding: 12px 10px; font-size: 11px; text-align: right; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; border: 1px solid #e5e7eb;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${payslipData.deductions.map((deduction: any, index: number) => deduction.name ? `
                    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                      <td style="padding: 10px; color: #374151; border: 1px solid #e5e7eb;">${deduction.name}</td>
                      <td style="padding: 10px; text-align: right; color: #111827; font-weight: 500; border: 1px solid #e5e7eb;">${payslipData.currency || '₹'} ${formatCurrency(parseFloat(deduction.amount))}</td>
                    </tr>
                  ` : '').join('')}
                  <tr style="background-color: #f3f4f6; font-weight: 700;">
                    <td style="padding: 12px 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #111827; border: 1px solid #e5e7eb;">Total Deductions</td>
                    <td style="padding: 12px 10px; text-align: right; font-size: 13px; color: #111827; border: 1px solid #e5e7eb;">${payslipData.currency || '₹'} ${formatCurrency(parseFloat(payslipData.total_deductions))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
        
        <!-- Net Pay Summary -->
        <div style="margin-bottom: 25px; padding: 25px; background-color: #f9fafb; border: 2px solid #111827;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 13px; color: #6b7280; margin-bottom: 8px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Net Salary Payable</div>
              <div style="font-size: 36px; font-weight: 700; color: #111827; letter-spacing: 1px;">${payslipData.currency || '₹'} ${formatCurrency(parseFloat(payslipData.net_pay))}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px; font-weight: 500;">Amount in Words</div>
              <div style="font-size: 11px; color: #374151; font-style: italic; max-width: 250px; line-height: 1.4; text-transform: capitalize;">
                ${payslipData.net_pay ? numberToWords(Math.round(parseFloat(payslipData.net_pay))) + ' Rupees Only' : 'Zero Rupees Only'}
              </div>
            </div>
          </div>
        </div>
        
        ${payslipData.notes ? `
          <div style="margin-top: 25px; padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-left: 3px solid #6b7280;">
            <h5 style="font-size: 12px; font-weight: 600; margin: 0 0 10px 0; color: #374151; text-transform: uppercase;">Notes</h5>
            <p style="font-size: 11px; color: #4b5563; margin: 0; line-height: 1.6;">${payslipData.notes}</p>
          </div>
        ` : ''}
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #d1d5db;">
          <p style="font-size: 10px; color: #6b7280; margin: 0 0 6px 0; font-style: italic;">
            This is a computer generated payslip and does not require a signature
          </p>
          <p style="font-size: 9px; color: #9ca3af; margin: 0;">
            Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    `;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return "₹0.00";
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const clearFilters = () => {
    setSelectedMonth(undefined);
    setSelectedYear(undefined);
    setFilterEmployeeId("");
  };

  return (
    <div className="payslip-list-view">
      <ToastContainer />
      
      {/* Header with Filters */}
      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white border-bottom py-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0 fw-bold">
                <i className="ti ti-file-invoice me-2 text-primary" />
                All Payslips
              </h5>
              <small className="text-muted mt-1 d-block">
                View and download all generated payslips
              </small>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Filter by Month</label>
              <select
                className="form-select form-select-sm"
                value={selectedMonth || ""}
                onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">All Months</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Filter by Year</label>
              <select
                className="form-select form-select-sm"
                value={selectedYear || ""}
                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Employee ID (Optional)</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Enter employee ID to filter"
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={clearFilters}
              >
                <i className="ti ti-x me-1"></i>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="card shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted fw-semibold">Loading payslips...</p>
            </div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i className="ti ti-file-off" style={{ fontSize: "64px", color: "#d1d5db" }} />
              </div>
              <h6 className="text-muted fw-semibold mb-2">No Payslips Found</h6>
              <p className="text-muted small mb-3">
                No payslips found for the selected filters.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Payslip Number</th>
                    <th>Employee Name</th>
                    <th>Employee ID</th>
                    <th>Month</th>
                    <th>Year</th>
                    <th>Net Pay</th>
                    <th>Created At</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((payslip: any) => (
                    <tr key={payslip.id}>
                      <td>
                        <span className="badge bg-light text-dark border" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                          {payslip.payslip_number || 'N/A'}
                        </span>
                      </td>
                      <td className="fw-semibold">{payslip.employee_name || 'N/A'}</td>
                      <td>
                        <span className="text-muted small">
                          {payslip.employee_code || payslip.employee_id || 'N/A'}
                        </span>
                      </td>
                      <td>{payslip.month || 'N/A'}</td>
                      <td>{payslip.year || 'N/A'}</td>
                      <td className="fw-semibold text-primary">{formatCurrency(payslip.net_pay || 0)}</td>
                      <td>
                        <span className="text-muted small">
                          {payslip.created_at ? new Date(payslip.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="text-end">
                        {isPayslipGenerated(payslip) ? (
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleViewPayslip(payslip)}
                            title="View Payslip"
                          >
                            <i className="ti ti-eye"></i>
                          </button>
                        ) : (
                          <span className="text-muted small">Not Generated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payslip View Modal */}
      {showPayslipModal && selectedPayslip && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="ti ti-file-invoice me-2"></i>
                  Payslip - {selectedPayslip.employee_name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowPayslipModal(false);
                    setSelectedPayslip(null);
                  }}
                ></button>
              </div>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div dangerouslySetInnerHTML={{ __html: generatePayslipHTML(selectedPayslip) }} />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPayslipModal(false);
                    setSelectedPayslip(null);
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownloadFromModal}
                >
                  <i className="ti ti-download me-1"></i>
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipListView;
