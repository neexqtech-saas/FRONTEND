/**
 * Run Payroll Tab Component
 * Existing Run Payroll functionality
 */

import React, { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import { runPayrollAPI } from "../../structure/utils/api";
import Table from "../../../../core/common/dataTable/index";
import AttendanceUpload from "../../structure/components/AttendanceUpload";
import "./RunPayrollTab.scss";

interface RunPayrollTabProps {
  onNavigateToPayslips?: () => void;
}


const RunPayrollTab: React.FC<RunPayrollTabProps> = ({ onNavigateToPayslips }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [payrollReports, setPayrollReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showAttendanceUpload, setShowAttendanceUpload] = useState(false);
  const [generatingAllPayslips, setGeneratingAllPayslips] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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

  const fetchPayrollReports = useCallback(async () => {
    setLoading(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        setLoading(false);
        return;
      }

      let payrollRecords: any[] = [];

      // Try new API first (generated payroll records)
      try {
        const response = await runPayrollAPI.getGeneratedPayrollRecords(
          admin_id,
          selectedMonth,
          selectedYear
        );

        if (response?.status === true && response?.data?.records) {
          payrollRecords = response.data.records;
        }
      } catch (newApiError) {
        console.log("New API not available, trying legacy API");
      }

      // If new API didn't work, fallback to legacy API
      if (payrollRecords.length === 0) {
        try {
      const response = await runPayrollAPI.getPayrollReports(
        admin_id,
        selectedMonth,
        selectedYear
      );

      if (response?.status === 200 && response?.data?.reports) {
            payrollRecords = response.data.reports;
          }
        } catch (legacyError) {
          console.error("Legacy API error:", legacyError);
        }
      }

      // Fetch payslip list for the same month/year to check if payslips are generated
      try {
        const payslipResponse = await runPayrollAPI.getPayslipList(
          admin_id,
          undefined, // No employee filter - get all
          selectedMonth,
          selectedYear
        );

        if (payslipResponse?.status === true && payslipResponse?.data?.payslips) {
          const payslips = payslipResponse.data.payslips;
          
          // Create a map of payslips by employee_id for quick lookup
          const payslipMap = new Map<string, any>();
          payslips.forEach((payslip: any) => {
            // Employee can be UUID string or object with id
            let employeeId: string | null = null;
            
            if (payslip.employee) {
              if (typeof payslip.employee === 'string') {
                employeeId = payslip.employee;
              } else if (payslip.employee.id) {
                employeeId = String(payslip.employee.id);
              }
            }
            
            if (employeeId) {
              payslipMap.set(employeeId, payslip);
            }
          });

          // Map payslip information to payroll records
          payrollRecords = payrollRecords.map((record: any) => {
            // Get employee_id from record (should be string UUID)
            const employeeId = record.employee_id 
              ? String(record.employee_id) 
              : (record.employee?.id ? String(record.employee.id) : null);
            
            if (employeeId) {
              const payslip = payslipMap.get(employeeId);
              
              if (payslip && payslip.payslip_number) {
                return {
                  ...record,
                  payslip_number: payslip.payslip_number,
                  payslip_generated: true
                };
              }
            }
            
            return {
              ...record,
              payslip_number: null,
              payslip_generated: false
            };
          });
        }
      } catch (payslipError) {
        console.error("Error fetching payslip list:", payslipError);
        // Continue without payslip data - payroll records will not have payslip_number
      }

      setPayrollReports(payrollRecords);
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
        fetchPayrollReports();
      } else {
        toast.error(response?.message || "Failed to generate payroll");
      }
    } catch (error: any) {
      console.error("Error generating payroll:", error);
      toast.error(error.response?.data?.message || "Failed to generate payroll");
    } finally {
      setGenerating(false);
    }
  };


  const handleGenerateAllPayslips = async () => {
    if (payrollReports.length === 0) {
      toast.error("No payroll records to generate payslips for");
      return;
    }

    const admin_id = getAdminIdForApi();
    if (!admin_id) {
      toast.error("Admin ID not found");
      return;
    }

    setGeneratingAllPayslips(true);

    try {
      toast.info(`Generating ${payrollReports.length} payslip(s)...`);

      // Single API call to generate all payslips for the month/year
      const response = await runPayrollAPI.generatePayslipFromPayrollRecord(
        admin_id,
        selectedMonth,
        selectedYear
      );

      if (response?.status === true) {
        const totalGenerated = response?.data?.total_generated || 0;
        const errors = response?.data?.errors || [];
        
        // Refresh the payroll reports to show updated payslip numbers
        await fetchPayrollReports();

        if (errors.length === 0) {
          toast.success(`Successfully generated ${totalGenerated} payslip(s)`);
        } else {
          toast.warning(`Generated ${totalGenerated} payslip(s), ${errors.length} failed`);
        }
      } else {
        toast.error(response?.message || "Failed to generate payslips");
      }
    } catch (error: any) {
      console.error("Error generating all payslips:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to generate payslips";
      toast.error(errorMessage);
    } finally {
      setGeneratingAllPayslips(false);
    }
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

  const handleDownloadExcel = async () => {
    if (payrollReports.length === 0) {
      toast.error("No payroll data to download");
      return;
    }

    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        toast.error("Admin ID not found");
        return;
      }

      // Download Excel from backend API
      const response = await runPayrollAPI.downloadPayrollReportExcel(
        admin_id,
        selectedMonth,
        selectedYear
      );

      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Payroll_Report_${months.find((m) => m.value === selectedMonth)?.label || selectedMonth}_${selectedYear}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Payroll report downloaded successfully");
    } catch (error: any) {
      console.error("Error downloading Excel:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to download Excel file";
      toast.error(errorMessage);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return "₹0.00";
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Extract all unique component names from all records
  const getAllComponents = () => {
    const earningsSet = new Set<string>();
    const deductionsSet = new Set<string>();
    
    payrollReports.forEach((record: any) => {
      // Get earnings components
      if (record.earnings && Array.isArray(record.earnings)) {
        record.earnings.forEach((comp: any) => {
          const name = comp.name || '';
          if (name) {
            // Add (Custom) label only for custom type
            const displayName = comp.type === 'custom' ? `${name} (Custom)` : name;
            earningsSet.add(displayName);
          }
        });
      }
      
      // Get deductions components
      if (record.deductions && Array.isArray(record.deductions)) {
        record.deductions.forEach((comp: any) => {
          const name = comp.name || '';
          if (name) {
            // Add (Custom) label only for custom type
            const displayName = comp.type === 'custom' ? `${name} (Custom)` : name;
            deductionsSet.add(displayName);
          }
        });
      }
    });
    
    return {
      earnings: Array.from(earningsSet).sort(),
      deductions: Array.from(deductionsSet).sort()
    };
  };

  const components = getAllComponents();

  // Get component amount for a record
  const getComponentAmount = (record: any, componentName: string, type: 'earning' | 'deduction') => {
    const componentsList = type === 'earning' 
      ? (record.earnings || [])
      : (record.deductions || []);
    
    // Remove (Custom) suffix for matching
    const baseName = componentName.replace(' (Custom)', '');
    
    const component = componentsList.find((comp: any) => {
      const name = comp.name || '';
      const displayName = comp.type === 'custom' ? `${name} (Custom)` : name;
      return displayName === componentName || name === baseName;
    });
    
    return component ? (component.amount || 0) : 0;
  };

  // Build columns dynamically
  const buildColumns = () => {
    const baseColumns = [
      {
        title: "Employee ID",
        key: "employee_id",
        fixed: true,
        render: (record: any) => (
          <span className="fw-bold">{record.custom_employee_id || record.employee_id?.slice(0, 8) || "N/A"}</span>
        ),
      },
      {
        title: "Employee Name",
        key: "employee_name",
        fixed: true,
        render: (record: any) => <span className="fw-bold">{record.employee_name || "-"}</span>,
      },
      {
        title: "Gross Salary (Monthly)",
        key: "gross_salary",
        fixed: true,
        render: (record: any) => formatCurrency(record.gross_salary || 0),
      },
      {
        title: "Payable Days",
        key: "payable_days",
        fixed: true,
        render: (record: any) => record.payable_days || "-",
      },
      {
        title: "Gross (Pro-rated)",
        key: "gross_salary_pro_rated",
        fixed: true,
        render: (record: any) => (
          <span className="text-info fw-semibold">
            {formatCurrency(record.gross_salary_pro_rated || record.gross_salary || 0)}
          </span>
        ),
      },
    ];

    // Add earnings columns
    const earningsColumns = components.earnings.map((compName) => ({
      title: compName,
      key: `earning_${compName}`,
      className: "text-success",
      render: (record: any) => {
        const amount = getComponentAmount(record, compName, 'earning');
        return amount > 0 ? formatCurrency(amount) : "-";
      },
    }));

    // Add deductions columns
    const deductionsColumns = components.deductions.map((compName) => ({
      title: compName,
      key: `deduction_${compName}`,
      className: "text-danger",
      render: (record: any) => {
        const amount = getComponentAmount(record, compName, 'deduction');
        return amount > 0 ? formatCurrency(amount) : "-";
      },
    }));

    // Add summary columns
    const summaryColumns = [
      {
        title: "Total Earnings",
        key: "total_earnings",
        fixed: true,
        className: "bg-success-subtle",
        render: (record: any) => (
          <span className="text-success fw-bold">{formatCurrency(record.total_earnings || 0)}</span>
        ),
      },
      {
        title: "Total Deductions",
        key: "total_deductions",
        fixed: true,
        className: "bg-danger-subtle",
        render: (record: any) => (
          <span className="text-danger fw-bold">{formatCurrency(record.total_deductions || 0)}</span>
        ),
      },
      {
        title: "Net Pay",
        key: "net_pay",
        fixed: true,
        className: "bg-primary-subtle",
        render: (record: any) => (
          <span className="text-primary fw-bold">{formatCurrency(record.net_pay || 0)}</span>
        ),
      },
      {
        title: "Payslip Number",
        key: "payslip_number",
        fixed: true,
        render: (record: any) => (
          <span className="text-muted small">{record.payslip_number || "-"}</span>
        ),
      },
    ];

    return [...baseColumns, ...earningsColumns, ...deductionsColumns, ...summaryColumns];
  };

  const columns = buildColumns();

  const [showCalculationRules, setShowCalculationRules] = useState(false);

  return (
    <div className="run-payroll-tab">
      <ToastContainer />
      
      {/* Calculation Rules Info Section */}
      <div className="card mb-4 border-info">
        <div 
          className="card-header bg-info-subtle cursor-pointer"
          onClick={() => setShowCalculationRules(!showCalculationRules)}
          style={{ cursor: 'pointer' }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-semibold text-info">
              <i className="ti ti-info-circle me-2"></i>
              Payroll Calculation Rules & Guidelines
            </h6>
            <i className={`ti ti-chevron-${showCalculationRules ? 'up' : 'down'} text-info`}></i>
          </div>
        </div>
        {showCalculationRules && (
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6 className="text-success mb-3">
                  <i className="ti ti-arrow-up me-2"></i>
                  Earnings Calculation Rules
                </h6>
                <ul className="list-unstyled ms-3">
                  <li className="mb-2">
                    <strong>BASIC Salary:</strong> Calculated based on structure configuration (Fixed or Percentage of Gross)
                  </li>
                  <li className="mb-2">
                    <strong>All Earnings Components:</strong> Calculated on <span className="badge bg-primary">Basic Salary</span> (if percentage type without base)
                    <br />
                    <small className="text-muted">Includes DA, Special Allowance, and all other percentage-based earnings</small>
                  </li>
                  <li className="mb-2">
                    <strong>Pro-rata Calculation:</strong> All standard earnings are pro-rated based on payable days
                    <br />
                    <small className="text-muted">Formula: (Monthly Amount × Payable Days) ÷ Total Days in Month</small>
                  </li>
                  <li className="mb-2">
                    <strong>Custom Earnings:</strong> Added as-is (not pro-rated) - includes Overtime, Incentives, Bonus, etc.
                  </li>
                </ul>
              </div>
              <div className="col-md-6">
                <h6 className="text-danger mb-3">
                  <i className="ti ti-arrow-down me-2"></i>
                  Deductions Calculation Rules
                </h6>
                <ul className="list-unstyled ms-3">
                  <li className="mb-2">
                    <strong>PF (Provident Fund):</strong> Calculated on <span className="badge bg-warning text-dark">(BASIC + DA)</span>
                    <br />
                    <small className="text-muted">If DA exists: PF = (BASIC + DA) × PF% | If no DA: PF = BASIC × PF%</small>
                  </li>
                  <li className="mb-2">
                    <strong>ESI (Employee State Insurance):</strong> Calculated on <span className="badge bg-info">Pro-rated Gross Salary</span>
                  </li>
                  <li className="mb-2">
                    <strong>PT (Professional Tax):</strong> Calculated on <span className="badge bg-info">Pro-rated Gross Salary</span> (slab-based)
                  </li>
                  <li className="mb-2">
                    <strong>Gratuity:</strong> Calculated on <span className="badge bg-primary">Basic Salary</span> (already pro-rated)
                  </li>
                  <li className="mb-2">
                    <strong>Fixed Deductions:</strong> Pro-rated based on payable days
                  </li>
                  <li className="mb-2">
                    <strong>Custom Deductions:</strong> Added as-is (not pro-rated) - includes TDS, Advance, Penalties, etc.
                  </li>
                </ul>
              </div>
            </div>
            <hr />
            <div className="row">
              <div className="col-12">
                <h6 className="text-primary mb-3">
                  <i className="ti ti-calculator me-2"></i>
                  Important Notes
                </h6>
                <div className="row">
                  <div className="col-md-4">
                    <div className="alert alert-light border mb-2">
                      <strong>Pro-rated Gross:</strong> Monthly Gross × (Payable Days ÷ Total Days)
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="alert alert-light border mb-2">
                      <strong>Net Pay:</strong> Total Earnings - Total Deductions
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="alert alert-light border mb-2">
                      <strong>Statutory Deductions:</strong> Recalculated on pro-rated amounts for accuracy
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Month/Year Selector and Actions */}
      <div className="row mb-4">
        <div className="col-md-3">
          <label className="form-label">Month</label>
          <select
            className="form-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label">Year</label>
          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-6 d-flex align-items-end gap-2">
          <button
            className="btn btn-outline-primary"
            onClick={() => setShowAttendanceUpload(!showAttendanceUpload)}
          >
            <i className="ti ti-upload me-1"></i>
            Upload Attendance
          </button>
        </div>
      </div>

      {/* Attendance Upload Modal */}
      {showAttendanceUpload && (
        <AttendanceUpload 
          onCancel={() => setShowAttendanceUpload(false)} 
          onSuccess={() => {
            fetchPayrollReports(); // Refresh data after successful generation
          }}
          month={selectedMonth}
          year={selectedYear}
        />
      )}

      {/* Payroll Reports Table */}
      <div className="card shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0 fw-bold">
                <i className="ti ti-file-spreadsheet me-2 text-primary" />
                Payroll Report - {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
              </h5>
              {payrollReports.length > 0 && (
                <small className="text-muted mt-1 d-block">
                  <i className="ti ti-users me-1"></i>
                  {payrollReports.length} {payrollReports.length === 1 ? 'Employee' : 'Employees'}
                </small>
              )}
            </div>
            <div className="d-flex gap-2 align-items-center">
              <button
                className="btn btn-primary btn-sm fw-semibold"
                onClick={handleGenerateAllPayslips}
                disabled={payrollReports.length === 0 || generatingAllPayslips}
                style={{ 
                  borderRadius: '6px',
                  padding: '8px 16px',
                  borderWidth: '1.5px'
                }}
              >
                {generatingAllPayslips ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="ti ti-file-invoice me-1" />
                    Generate All Payslips
                  </>
                )}
              </button>
              {onNavigateToPayslips && (
                <button
                  className="btn btn-outline-primary btn-sm fw-semibold"
                  onClick={onNavigateToPayslips}
                  style={{ 
                    borderRadius: '6px',
                    padding: '8px 16px',
                    borderWidth: '1.5px'
                  }}
                >
                  <i className="ti ti-file-invoice me-1" />
                  View All Payslips
                </button>
              )}
            <button
              className="btn btn-outline-success btn-sm fw-semibold"
              onClick={handleDownloadExcel}
              disabled={payrollReports.length === 0}
              style={{ 
                borderRadius: '6px',
                padding: '8px 16px',
                borderWidth: '1.5px'
              }}
            >
              <i className="ti ti-download me-1" />
              Download Excel
            </button>
            </div>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted fw-semibold">Loading payroll data...</p>
            </div>
          ) : payrollReports.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i className="ti ti-file-off" style={{ fontSize: "64px", color: "#d1d5db" }} />
              </div>
              <h6 className="text-muted fw-semibold mb-2">No Payroll Reports Found</h6>
              <p className="text-muted small mb-3">
                No payroll reports found for {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}.
              </p>
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => setShowAttendanceUpload(true)}
              >
                <i className="ti ti-upload me-1"></i>
                Upload Attendance to Generate Payroll
              </button>
            </div>
          ) : (
            <div className="payroll-table-wrapper">
              <div className="table-responsive">
                <table className="payroll-table">
                  <thead>
                    <tr>
                      {/* Base Columns */}
                      <th className="sticky-column base-header" style={{ position: "sticky", left: 0, zIndex: 12, width: "120px", minWidth: "120px" }}>
                        Employee ID
                      </th>
                      <th className="sticky-column base-header" style={{ position: "sticky", left: "120px", zIndex: 12, width: "180px", minWidth: "180px" }}>
                        Employee Name
                      </th>
                      <th className="sticky-column base-header" style={{ position: "sticky", left: "300px", zIndex: 12, width: "130px", minWidth: "130px" }}>
                        Gross Salary
                      </th>
                      <th className="sticky-column base-header" style={{ position: "sticky", left: "430px", zIndex: 12, width: "110px", minWidth: "110px" }}>
                        Payable Days
                      </th>
                      <th className="sticky-column base-header" style={{ position: "sticky", left: "540px", zIndex: 12, width: "150px", minWidth: "150px" }}>
                        Gross (Pro-rated)
                      </th>
                      
                      {/* Earnings Section Header */}
                      {components.earnings.length > 0 && (
                        <th 
                          colSpan={components.earnings.length} 
                          className="earnings-header text-center"
                        >
                          <i className="ti ti-arrow-up me-2"></i>
                          Earnings Components ({components.earnings.length})
                        </th>
                      )}
                      
                      {/* Deductions Section Header */}
                      {components.deductions.length > 0 && (
                        <th 
                          colSpan={components.deductions.length} 
                          className="deductions-header text-center"
                        >
                          <i className="ti ti-arrow-down me-2"></i>
                          Deductions Components ({components.deductions.length})
                        </th>
                      )}
                      
                      {/* Summary Columns */}
                      <th className="summary-header total-earnings text-center" style={{ width: "140px", minWidth: "140px" }}>
                        Total Earnings
                      </th>
                      <th className="summary-header total-deductions text-center" style={{ width: "150px", minWidth: "150px" }}>
                        Total Deductions
                      </th>
                      <th className="summary-header net-pay text-center" style={{ width: "130px", minWidth: "130px" }}>
                        Net Pay
                      </th>
                      <th className="sticky-column base-header text-center" style={{ position: "sticky", right: 0, zIndex: 12, width: "200px", minWidth: "200px" }}>
                        Payslip Status
                      </th>
                    </tr>
                    
                    {/* Component Names Row */}
                    <tr>
                      {/* Empty cells for base columns - must match first row exactly */}
                      <th className="sticky-column base-header" style={{ position: "sticky", left: 0, zIndex: 11, width: "120px", minWidth: "120px" }}></th>
                      <th className="sticky-column base-header" style={{ position: "sticky", left: "120px", zIndex: 11, width: "180px", minWidth: "180px" }}></th>
                      <th className="sticky-column base-header" style={{ position: "sticky", left: "300px", zIndex: 11, width: "130px", minWidth: "130px" }}></th>
                      <th className="sticky-column base-header" style={{ position: "sticky", left: "430px", zIndex: 11, width: "110px", minWidth: "110px" }}></th>
                      <th className="sticky-column base-header" style={{ position: "sticky", left: "540px", zIndex: 11, width: "150px", minWidth: "150px" }}></th>
                      
                      {/* Earnings Component Names */}
                      {components.earnings.map((compName) => (
                        <th 
                          key={`earning_${compName}`} 
                          className="earnings-col text-center"
                          style={{ minWidth: "140px" }}
                        >
                          {compName}
                        </th>
                      ))}
                      
                      {/* Deductions Component Names */}
                      {components.deductions.map((compName) => (
                        <th 
                          key={`deduction_${compName}`} 
                          className="deductions-col text-center"
                          style={{ minWidth: "140px" }}
                        >
                          {compName}
                        </th>
                      ))}
                      
                      {/* Empty cells for summary columns - must match first row */}
                      <th className="summary-header" style={{ width: "140px", minWidth: "140px" }}></th>
                      <th className="summary-header" style={{ width: "150px", minWidth: "150px" }}></th>
                      <th className="summary-header" style={{ width: "130px", minWidth: "130px" }}></th>
                      <th className="sticky-column base-header" style={{ position: "sticky", right: 0, zIndex: 11, width: "200px", minWidth: "200px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollReports.map((record: any, index: number) => (
                      <tr key={record.id || index}>
                        {/* Base Columns */}
                        <td className="sticky-column base-col" style={{ position: "sticky", left: 0, zIndex: 10, width: "120px", minWidth: "120px" }}>
                          <span className="badge bg-primary-subtle text-primary border border-primary fw-semibold">
                            {record.custom_employee_id || record.employee_id?.slice(0, 8) || "N/A"}
                          </span>
                        </td>
                        <td className="sticky-column base-col" style={{ position: "sticky", left: "120px", zIndex: 10, width: "180px", minWidth: "180px" }}>
                          <span className="fw-bold" style={{ color: '#111827' }}>{record.employee_name || "-"}</span>
                        </td>
                        <td className="sticky-column base-col" style={{ position: "sticky", left: "300px", zIndex: 10, width: "130px", minWidth: "130px" }}>
                          <span className="fw-semibold" style={{ color: '#374151' }}>
                            {formatCurrency(record.gross_salary || 0)}
                          </span>
                        </td>
                        <td className="sticky-column base-col text-center" style={{ position: "sticky", left: "430px", zIndex: 10, width: "110px", minWidth: "110px" }}>
                          <span className="badge bg-info-subtle text-info fw-semibold">
                            {record.payable_days || "-"}
                          </span>
                        </td>
                        <td className="sticky-column base-col" style={{ position: "sticky", left: "540px", zIndex: 10, width: "150px", minWidth: "150px" }}>
                          <span className="fw-bold" style={{ color: '#0e7490' }}>
                            {formatCurrency(record.gross_salary_pro_rated || record.gross_salary || 0)}
                          </span>
                        </td>
                        
                        {/* Earnings Components */}
                        {components.earnings.map((compName) => {
                          const amount = getComponentAmount(record, compName, 'earning');
                          return (
                            <td 
                              key={`earning_${compName}`} 
                              className="earnings-cell"
                              style={{ minWidth: "140px" }}
                            >
                              {amount > 0 ? formatCurrency(amount) : <span className="text-muted">-</span>}
                            </td>
                          );
                        })}
                        
                        {/* Deductions Components */}
                        {components.deductions.map((compName) => {
                          const amount = getComponentAmount(record, compName, 'deduction');
                          return (
                            <td 
                              key={`deduction_${compName}`} 
                              className="deductions-cell"
                              style={{ minWidth: "140px" }}
                            >
                              {amount > 0 ? formatCurrency(amount) : <span className="text-muted">-</span>}
                            </td>
                          );
                        })}
                        
                        {/* Summary Columns */}
                        <td className="summary-cell total-earnings" style={{ width: "140px", minWidth: "140px" }}>
                          {formatCurrency(record.total_earnings || 0)}
                        </td>
                        <td className="summary-cell total-deductions" style={{ width: "150px", minWidth: "150px" }}>
                          {formatCurrency(record.total_deductions || 0)}
                        </td>
                        <td className="summary-cell net-pay" style={{ width: "130px", minWidth: "130px" }}>
                          {formatCurrency(record.net_pay || 0)}
                        </td>
                        <td className="sticky-column base-col text-center" style={{ position: "sticky", right: 0, zIndex: 10, width: "200px", minWidth: "200px" }}>
                          {record.payslip_number || record.payslip_generated ? (
                            <span className="badge bg-success-subtle text-success">
                              <i className="ti ti-check me-1"></i>
                              Generated
                            </span>
                          ) : (
                            <span className="text-muted small">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default RunPayrollTab;
