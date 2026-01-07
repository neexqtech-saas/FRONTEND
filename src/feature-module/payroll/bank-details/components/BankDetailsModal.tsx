/**
 * Bank Details Modal Component
 * Form for adding/editing employee bank details
 */

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import { bankDetailsAPI } from "../../structure/utils/api";
import "./BankDetailsModal.scss";

interface Employee {
  id?: string;
  user?: {
    id: string;
    email?: string;
  };
  email?: string;
  user_name?: string;
  user_id?: string;
}

interface BankDetail {
  id?: number;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name?: string;
  account_type: 'savings' | 'current';
  aadhaar_number?: string;
  pan_number?: string;
  is_active: boolean;
}

interface BankDetailsModalProps {
  employee: Employee;
  bankDetail?: BankDetail;
  onClose: () => void;
  onSuccess: () => void;
}

const BankDetailsModal: React.FC<BankDetailsModalProps> = ({
  employee,
  bankDetail,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BankDetail>({
    account_holder_name: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    branch_name: "",
    account_type: "savings",
    aadhaar_number: "",
    pan_number: "",
    is_active: true,
  });

  useEffect(() => {
    if (bankDetail) {
      setFormData({
        account_holder_name: bankDetail.account_holder_name || "",
        bank_name: bankDetail.bank_name || "",
        account_number: bankDetail.account_number || "",
        ifsc_code: bankDetail.ifsc_code || "",
        branch_name: bankDetail.branch_name || "",
        account_type: bankDetail.account_type || "savings",
        aadhaar_number: bankDetail.aadhaar_number || "",
        pan_number: bankDetail.pan_number || "",
        is_active: bankDetail.is_active !== false,
      });
    }
  }, [bankDetail]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const adminId = getAdminIdForApi();
      if (!adminId) {
        toast.error("Admin ID not found");
        setLoading(false);
        return;
      }

      // Prepare data (remove empty strings for optional fields)
      const submitData: any = {
        account_holder_name: formData.account_holder_name,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        ifsc_code: formData.ifsc_code.toUpperCase(),
        account_type: formData.account_type,
        is_active: formData.is_active,
      };

      if (formData.branch_name) {
        submitData.branch_name = formData.branch_name;
      }
      if (formData.aadhaar_number) {
        submitData.aadhaar_number = formData.aadhaar_number;
      }
      if (formData.pan_number) {
        submitData.pan_number = formData.pan_number.toUpperCase();
      }

      const employeeId = getEmployeeId();
      if (!employeeId) {
        toast.error("Employee ID not found");
        setLoading(false);
        return;
      }

      let response;
      if (bankDetail) {
        // Update existing
        response = await bankDetailsAPI.update(adminId, employeeId, submitData);
      } else {
        // Create new
        response = await bankDetailsAPI.create(adminId, employeeId, submitData);
      }

      const message = response?.message || "Bank details saved successfully";
      toast.success(message);
      onSuccess();
    } catch (error: any) {
      console.error("Error saving bank details:", error);
      
      // Handle validation errors from API
      const responseData = error.response?.data;
      
      if (responseData?.data && typeof responseData.data === 'object') {
        // Validation errors - format field errors with format hints
        const validationErrors: string[] = [];
        
        // Format hints for different fields
        const formatHints: { [key: string]: string } = {
          ifsc_code: "Format: 4 letters + 0 + 6 alphanumeric (e.g., HDFC0001234)",
          aadhaar_number: "Format: 12 digits (e.g., 123456789012)",
          pan_number: "Format: AAAAA9999A (5 letters + 4 digits + 1 letter, e.g., ABCDE1234F)",
          account_number: "Format: Numeric or alphanumeric bank account number",
        };
        
        Object.keys(responseData.data).forEach((field) => {
          const fieldErrors = responseData.data[field];
          const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          
          if (Array.isArray(fieldErrors)) {
            fieldErrors.forEach((err: string) => {
              let errorMsg = `${fieldLabel}: ${err}`;
              
              // Add format hint if available and error is about format/length
              if (formatHints[field] && (err.includes('character') || err.includes('format') || err.includes('invalid') || err.includes('digit'))) {
                errorMsg += ` (${formatHints[field]})`;
              }
              
              validationErrors.push(errorMsg);
            });
          } else if (typeof fieldErrors === 'string') {
            let errorMsg = `${fieldLabel}: ${fieldErrors}`;
            
            if (formatHints[field] && (fieldErrors.includes('character') || fieldErrors.includes('format') || fieldErrors.includes('invalid') || fieldErrors.includes('digit'))) {
              errorMsg += ` (${formatHints[field]})`;
            }
            
            validationErrors.push(errorMsg);
          }
        });
        
        if (validationErrors.length > 0) {
          validationErrors.forEach((err) => toast.error(err));
        } else {
          toast.error(responseData?.message || "Validation error occurred");
        }
      } else {
        // General error
        const errorMessage =
          responseData?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to save bank details";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (): string => {
    if (employee.user_name) return employee.user_name;
    const email = employee.email || employee.user?.email || "";
    if (email) return email.split("@")[0];
    return "Unknown";
  };

  const getEmployeeId = (): string => {
    return employee.user?.id || employee.id || employee.user_id || "";
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h5 className="modal-title">
            {bankDetail ? "Edit" : "Add"} Bank Details - {getEmployeeName()}
          </h5>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="row">
              {/* Bank Details Section */}
              <div className="col-md-6">
                <h6 className="section-title">Bank Details</h6>

                <div className="mb-3">
                  <label className="form-label">
                    Account Holder Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="account_holder_name"
                    value={formData.account_holder_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Bank Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Account Number <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    IFSC Code <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="ifsc_code"
                    value={formData.ifsc_code}
                    onChange={handleChange}
                    placeholder="e.g., HDFC0001234"
                    maxLength={11}
                    required
                  />
                  <small className="form-text text-muted">11 characters: 4 letters + 0 + 6 alphanumeric</small>
                </div>

                <div className="mb-3">
                  <label className="form-label">Branch Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="branch_name"
                    value={formData.branch_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Account Type <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                  </select>
                </div>
              </div>

              {/* KYC Details Section */}
              <div className="col-md-6">
                <h6 className="section-title">KYC Details</h6>

                <div className="mb-3">
                  <label className="form-label">Aadhaar Number</label>
                  <input
                    type="text"
                    className="form-control"
                    name="aadhaar_number"
                    value={formData.aadhaar_number}
                    onChange={handleChange}
                    placeholder="12-digit Aadhaar"
                    maxLength={12}
                  />
                  <small className="form-text text-muted">12 digits</small>
                </div>

                <div className="mb-3">
                  <label className="form-label">PAN Number</label>
                  <input
                    type="text"
                    className="form-control"
                    name="pan_number"
                    value={formData.pan_number}
                    onChange={handleChange}
                    placeholder="e.g., ABCDE1234F"
                    maxLength={10}
                  />
                  <small className="form-text text-muted">Format: AAAAA9999A</small>
                </div>

                <div className="mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      id="isActive"
                    />
                    <label className="form-check-label" htmlFor="isActive">
                      Active (for salary credit)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BankDetailsModal;
