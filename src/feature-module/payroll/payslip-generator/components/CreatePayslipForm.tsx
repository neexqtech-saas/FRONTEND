/**
 * Create Payslip Form Component
 */
import React, { useState, useEffect } from "react";
import { templateOptions } from "../utils/templates";
import { calculateTotals } from "../utils/helpers";
import type { PayslipFormData } from "../types";

interface CreatePayslipFormProps {
  formData: PayslipFormData;
  handleFieldChange: (field: keyof PayslipFormData, value: any) => void;
  handleSave: () => void;
  handleDownloadPDF: () => void;
  loading: boolean;
}

const CreatePayslipForm: React.FC<CreatePayslipFormProps> = ({
  formData,
  handleFieldChange,
  handleSave,
  handleDownloadPDF,
  loading,
}) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    // Calculate totals when earnings or deductions change
    const totals = calculateTotals(formData.earnings, formData.deductions);
    handleFieldChange("totalEarnings", totals.totalEarnings);
    handleFieldChange("totalDeductions", totals.totalDeductions);
    handleFieldChange("netPay", totals.netPay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.earnings, formData.deductions]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFieldChange("companyLogo", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addEarning = () => {
    const newEarnings = [...formData.earnings, { name: "", amount: 0 }];
    handleFieldChange("earnings", newEarnings);
  };

  const removeEarning = (index: number) => {
    const newEarnings = formData.earnings.filter((_, i) => i !== index);
    handleFieldChange("earnings", newEarnings);
  };

  const updateEarning = (index: number, field: "name" | "amount", value: string | number) => {
    const newEarnings = [...formData.earnings];
    newEarnings[index] = { ...newEarnings[index], [field]: value };
    handleFieldChange("earnings", newEarnings);
  };

  const addDeduction = () => {
    const newDeductions = [...formData.deductions, { name: "", amount: 0 }];
    handleFieldChange("deductions", newDeductions);
  };

  const removeDeduction = (index: number) => {
    const newDeductions = formData.deductions.filter((_, i) => i !== index);
    handleFieldChange("deductions", newDeductions);
  };

  const updateDeduction = (index: number, field: "name" | "amount", value: string | number) => {
    const newDeductions = [...formData.deductions];
    newDeductions[index] = { ...newDeductions[index], [field]: value };
    handleFieldChange("deductions", newDeductions);
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="payslip-form">
      <form>
        {/* Payslip Details */}
        <div className="mb-4">
          <h5 className="mb-3">Payslip Details</h5>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Month <span className="text-danger">*</span></label>
              <select
                className="form-select"
                value={formData.month}
                onChange={(e) => handleFieldChange("month", e.target.value)}
                required
              >
                <option value="">Select Month</option>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Year <span className="text-danger">*</span></label>
              <input
                type="number"
                className="form-control"
                value={formData.year}
                onChange={(e) => handleFieldChange("year", parseInt(e.target.value))}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Pay Date <span className="text-danger">*</span></label>
              <input
                type="date"
                className="form-control"
                value={formData.payDate}
                onChange={(e) => handleFieldChange("payDate", e.target.value)}
                required
              />
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label">Paid Days</label>
              <input
                type="number"
                className="form-control"
                value={formData.paidDays}
                onChange={(e) => handleFieldChange("paidDays", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label">Loss of Pay Days</label>
              <input
                type="number"
                className="form-control"
                value={formData.lossOfPayDays}
                onChange={(e) => handleFieldChange("lossOfPayDays", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Template</label>
              <select
                className="form-select"
                value={formData.template}
                onChange={(e) => handleFieldChange("template", e.target.value)}
              >
                {templateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Currency</label>
              <input
                type="text"
                className="form-control"
                value={formData.currency}
                onChange={(e) => handleFieldChange("currency", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="mb-4">
          <h5 className="mb-3">Company Details</h5>
          <div className="row">
            <div className="col-md-12 mb-3">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.companyName}
                onChange={(e) => handleFieldChange("companyName", e.target.value)}
              />
            </div>
            <div className="col-md-12 mb-3">
              <label className="form-label">Company Address</label>
              <textarea
                className="form-control"
                rows={3}
                value={formData.companyAddress}
                onChange={(e) => handleFieldChange("companyAddress", e.target.value)}
              />
            </div>
            <div className="col-md-12 mb-3">
              <label className="form-label">Company Logo</label>
              <input
                type="file"
                className="form-control"
                accept="image/*"
                onChange={handleLogoChange}
              />
              {logoPreview && (
                <div className="mt-2">
                  <img src={logoPreview} alt="Logo Preview" style={{ maxWidth: "200px", maxHeight: "100px" }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Employee Details */}
        <div className="mb-4">
          <h5 className="mb-3">Employee Details</h5>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Employee Name <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control"
                value={formData.employeeName}
                onChange={(e) => handleFieldChange("employeeName", e.target.value)}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Employee ID</label>
              <input
                type="text"
                className="form-control"
                value={formData.employeeId}
                onChange={(e) => handleFieldChange("employeeId", e.target.value)}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Designation</label>
              <input
                type="text"
                className="form-control"
                value={formData.designation}
                onChange={(e) => handleFieldChange("designation", e.target.value)}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Department</label>
              <input
                type="text"
                className="form-control"
                value={formData.department}
                onChange={(e) => handleFieldChange("department", e.target.value)}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">PAN Number</label>
              <input
                type="text"
                className="form-control"
                value={formData.panNumber}
                onChange={(e) => handleFieldChange("panNumber", e.target.value)}
                maxLength={10}
              />
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Earnings</h5>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={addEarning}
            >
              <i className="ti ti-plus me-1"></i> Add Earning
            </button>
          </div>
          {formData.earnings.map((earning, index) => (
            <div key={index} className="row mb-2">
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Earning Name"
                  value={earning.name}
                  onChange={(e) => updateEarning(index, "name", e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Amount"
                  value={earning.amount}
                  onChange={(e) => updateEarning(index, "amount", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-md-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => removeEarning(index)}
                >
                  <i className="ti ti-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Deductions */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Deductions</h5>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={addDeduction}
            >
              <i className="ti ti-plus me-1"></i> Add Deduction
            </button>
          </div>
          {formData.deductions.map((deduction, index) => (
            <div key={index} className="row mb-2">
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Deduction Name"
                  value={deduction.name}
                  onChange={(e) => updateDeduction(index, "name", e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Amount"
                  value={deduction.amount}
                  onChange={(e) => updateDeduction(index, "amount", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-md-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => removeDeduction(index)}
                >
                  <i className="ti ti-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mb-4">
          <h5 className="mb-3">Summary</h5>
          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="form-label">Total Earnings</label>
              <input
                type="number"
                className="form-control"
                value={formData.totalEarnings}
                readOnly
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Total Deductions</label>
              <input
                type="number"
                className="form-control"
                value={formData.totalDeductions}
                readOnly
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Net Pay</label>
              <input
                type="number"
                className="form-control fw-bold"
                value={formData.netPay}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="form-label">Notes</label>
          <textarea
            className="form-control"
            rows={3}
            value={formData.notes}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
            placeholder="Additional notes or remarks..."
          />
        </div>

        {/* Action Buttons */}
        <div className="form-actions d-flex gap-2 justify-content-end mt-4">
          <button
            type="button"
            className="btn btn-success"
            onClick={handleDownloadPDF}
            disabled={loading}
          >
            <i className="ti ti-download me-1"></i>
            Download PDF
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating...
              </>
            ) : (
              <>
                <i className="ti ti-check me-1"></i>
                Save Payslip
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePayslipForm;
