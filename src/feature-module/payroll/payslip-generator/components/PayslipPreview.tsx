/**
 * Payslip Preview Component
 */
import React from "react";
import type { PayslipFormData } from "../types";

interface PayslipPreviewProps {
  formData: PayslipFormData;
  template: string;
}

const PayslipPreview: React.FC<PayslipPreviewProps> = ({ formData, template }) => {
  return (
    <div className="payslip-preview">
      <div 
        className="payslip-container" 
        style={{ 
          border: "1px solid #ddd", 
          padding: "20px", 
          backgroundColor: "#fff",
          minHeight: "400px",
          maxWidth: "100%",
          boxSizing: "border-box"
        }}
      >
        {/* Company Header */}
        {formData.companyName && (
          <div className="text-center mb-2">
            {formData.companyLogo && (
              <img 
                src={formData.companyLogo instanceof File ? URL.createObjectURL(formData.companyLogo) : formData.companyLogo} 
                alt="Company Logo" 
                style={{ maxHeight: "50px", marginBottom: "8px" }}
              />
            )}
            <h4 className="mb-1" style={{ fontSize: "18px" }}>{formData.companyName}</h4>
            {formData.companyAddress && (
              <p className="text-muted small mb-0" style={{ fontSize: "11px" }}>{formData.companyAddress}</p>
            )}
          </div>
        )}

        <hr style={{ margin: "10px 0" }} />

        {/* Payslip Title */}
        <div className="text-center mb-3">
          <h5 className="mb-1" style={{ fontSize: "16px", fontWeight: "bold" }}>PAYSLIP</h5>
          {formData.month && formData.year && (
            <p className="text-muted mb-0" style={{ fontSize: "12px" }}>
              {formData.month} {formData.year}
            </p>
          )}
        </div>

        {/* Employee Details */}
        {formData.employeeName && (
          <div className="mb-3">
            <h6 className="mb-2" style={{ fontSize: "13px", fontWeight: "bold" }}>Employee Details</h6>
            <table className="table table-sm" style={{ fontSize: "11px", marginBottom: "0" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "4px", width: "40%" }}><strong>Name:</strong></td>
                  <td style={{ padding: "4px" }}>{formData.employeeName}</td>
                </tr>
                {formData.employeeId && (
                  <tr>
                    <td style={{ padding: "4px" }}><strong>Employee ID:</strong></td>
                    <td style={{ padding: "4px" }}>{formData.employeeId}</td>
                  </tr>
                )}
                {formData.designation && (
                  <tr>
                    <td style={{ padding: "4px" }}><strong>Designation:</strong></td>
                    <td style={{ padding: "4px" }}>{formData.designation}</td>
                  </tr>
                )}
                {formData.department && (
                  <tr>
                    <td style={{ padding: "4px" }}><strong>Department:</strong></td>
                    <td style={{ padding: "4px" }}>{formData.department}</td>
                  </tr>
                )}
                {formData.panNumber && (
                  <tr>
                    <td style={{ padding: "4px" }}><strong>PAN:</strong></td>
                    <td style={{ padding: "4px" }}>{formData.panNumber}</td>
                  </tr>
                )}
                {formData.payDate && (
                  <tr>
                    <td style={{ padding: "4px" }}><strong>Pay Date:</strong></td>
                    <td style={{ padding: "4px" }}>{new Date(formData.payDate).toLocaleDateString()}</td>
                  </tr>
                )}
                {formData.paidDays > 0 && (
                  <tr>
                    <td style={{ padding: "4px" }}><strong>Paid Days:</strong></td>
                    <td style={{ padding: "4px" }}>{formData.paidDays}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Earnings */}
        {formData.earnings.length > 0 && (
          <div className="mb-3">
            <h6 className="mb-2" style={{ fontSize: "13px", fontWeight: "bold" }}>Earnings</h6>
            <table className="table table-sm table-bordered" style={{ fontSize: "11px", marginBottom: "0" }}>
              <thead>
                <tr>
                  <th style={{ padding: "6px", fontSize: "11px" }}>Description</th>
                  <th className="text-end" style={{ padding: "6px", fontSize: "11px" }}>Amount ({formData.currency})</th>
                </tr>
              </thead>
              <tbody>
                {formData.earnings.map((earning, index) => (
                  earning.name && (
                    <tr key={index}>
                      <td style={{ padding: "4px" }}>{earning.name}</td>
                      <td className="text-end" style={{ padding: "4px" }}>{earning.amount.toLocaleString()}</td>
                    </tr>
                  )
                ))}
                <tr className="table-secondary">
                  <td style={{ padding: "6px", fontWeight: "bold" }}>Total Earnings</td>
                  <td className="text-end" style={{ padding: "6px", fontWeight: "bold" }}>{formData.totalEarnings.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Deductions */}
        {formData.deductions.length > 0 && (
          <div className="mb-3">
            <h6 className="mb-2" style={{ fontSize: "13px", fontWeight: "bold" }}>Deductions</h6>
            <table className="table table-sm table-bordered" style={{ fontSize: "11px", marginBottom: "0" }}>
              <thead>
                <tr>
                  <th style={{ padding: "6px", fontSize: "11px" }}>Description</th>
                  <th className="text-end" style={{ padding: "6px", fontSize: "11px" }}>Amount ({formData.currency})</th>
                </tr>
              </thead>
              <tbody>
                {formData.deductions.map((deduction, index) => (
                  deduction.name && (
                    <tr key={index}>
                      <td style={{ padding: "4px" }}>{deduction.name}</td>
                      <td className="text-end" style={{ padding: "4px" }}>{deduction.amount.toLocaleString()}</td>
                    </tr>
                  )
                ))}
                <tr className="table-secondary">
                  <td style={{ padding: "6px", fontWeight: "bold" }}>Total Deductions</td>
                  <td className="text-end" style={{ padding: "6px", fontWeight: "bold" }}>{formData.totalDeductions.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Net Pay */}
        <div className="mb-2">
          <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
            <h5 className="mb-0" style={{ fontSize: "14px", fontWeight: "bold" }}>Net Pay</h5>
            <h4 className="mb-0 text-primary" style={{ fontSize: "16px", fontWeight: "bold" }}>
              {formData.currency} {formData.netPay.toLocaleString()}
            </h4>
          </div>
        </div>

        {/* Notes */}
        {formData.notes && (
          <div className="mt-2">
            <h6 style={{ fontSize: "12px", fontWeight: "bold" }}>Notes</h6>
            <p className="small text-muted" style={{ fontSize: "10px", marginBottom: "0" }}>{formData.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-2 pt-2 border-top">
          <p className="small text-muted mb-0" style={{ fontSize: "9px" }}>
            This is a system generated payslip
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayslipPreview;
