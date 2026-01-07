/**
 * Employee Advance Modal Component
 * For creating and viewing employee advances (view-only, no edit/delete)
 */

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import { employeeAdvanceAPI } from "../../structure/utils/api";
import "./EmployeeAdvanceModal.scss";

// Add modal class to body
const addModalClass = () => {
  document.body.classList.add("employee-advance-modal");
};

const removeModalClass = () => {
  document.body.classList.remove("employee-advance-modal");
};

interface EmployeeAdvance {
  id?: number;
  employee_id: string;
  employee_name?: string;
  custom_employee_id?: string;
  advance_amount: string | number;
  request_date: string;
  purpose?: string;
  status?: 'active' | 'partially_paid' | 'settled' | 'cancelled';
  paid_amount?: string | number;
  remaining_amount?: string | number;
  is_settled?: boolean;
  settlement_date?: string;
  notes?: string;
  attachment?: string;
  created_at?: string;
  updated_at?: string;
}

interface Employee {
  id: string;
  user_name?: string;
  custom_employee_id?: string;
  email?: string;
}

interface EmployeeAdvanceModalProps {
  advance: EmployeeAdvance | null;
  employees: Employee[];
  onClose: () => void;
  onSuccess: () => void;
}

const EmployeeAdvanceModal: React.FC<EmployeeAdvanceModalProps> = ({
  advance,
  employees,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    employee_id: "",
    advance_amount: "",
    request_date: new Date().toISOString().split("T")[0],
    purpose: "",
    status: "active" as 'active' | 'partially_paid' | 'settled' | 'cancelled',
    notes: "",
    attachment: null as File | null,
  });
  const [saving, setSaving] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

  useEffect(() => {
    addModalClass();
    return () => {
      removeModalClass();
    };
  }, []);

  useEffect(() => {
    if (advance) {
      // View mode - populate form but make it read-only
      setFormData({
        employee_id: advance.employee_id || "",
        advance_amount: advance.advance_amount?.toString() || "",
        request_date: advance.request_date || new Date().toISOString().split("T")[0],
        purpose: advance.purpose || "",
        status: advance.status || "active",
        notes: advance.notes || "",
        attachment: null,
      });
      if (advance.attachment) {
        setAttachmentPreview(advance.attachment);
      }
    } else {
      // Create mode - reset form
      setFormData({
        employee_id: "",
        advance_amount: "",
        request_date: new Date().toISOString().split("T")[0],
        purpose: "",
        status: "active",
        notes: "",
        attachment: null,
      });
      setAttachmentPreview(null);
    }
  }, [advance]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData((prev) => ({ ...prev, attachment: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (advance) {
      // View mode - no submission allowed
      toast.info("View mode - editing is not available");
      return;
    }

    if (!formData.employee_id || !formData.advance_amount || !formData.request_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        toast.error("Admin ID not found");
        setSaving(false);
        return;
      }

      await employeeAdvanceAPI.create(admin_id, {
        employee_id: formData.employee_id,
        advance_amount: parseFloat(formData.advance_amount),
        request_date: formData.request_date,
        purpose: formData.purpose,
        status: formData.status,
        notes: formData.notes,
        attachment: formData.attachment || undefined,
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error creating advance:", error);
      toast.error(error.response?.data?.message || "Failed to create advance");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: string | number | undefined) => {
    if (!amount) return "₹0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { class: string; label: string } } = {
      active: { class: "bg-primary", label: "Active" },
      partially_paid: { class: "bg-warning", label: "Partially Paid" },
      settled: { class: "bg-success", label: "Settled" },
      cancelled: { class: "bg-danger", label: "Cancelled" },
    };
    const statusInfo = statusMap[status] || { class: "bg-secondary", label: status };
    return (
      <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>
    );
  };

  const isViewMode = !!advance;

  return (
    <div className="modal fade show" style={{ display: "block", zIndex: 1050 }} tabIndex={-1} onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content" style={{ zIndex: 1051 }}>
          <div className="modal-header">
            <h5 className="modal-title">
              {isViewMode ? "View Employee Advance" : "Add Employee Advance"}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Employee <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    required={!isViewMode}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.user_name || emp.custom_employee_id || emp.id}
                        {emp.custom_employee_id && ` (${emp.custom_employee_id})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Advance Amount <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    name="advance_amount"
                    value={formData.advance_amount}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    required={!isViewMode}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Request Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    name="request_date"
                    value={formData.request_date}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    required={!isViewMode}
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Status</label>
                  {isViewMode ? (
                    <div className="mt-2">{getStatusBadge(formData.status)}</div>
                  ) : (
                    <select
                      className="form-select"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="active">Active</option>
                      <option value="partially_paid">Partially Paid</option>
                      <option value="settled">Settled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  )}
                </div>

                <div className="col-12 mb-3">
                  <label className="form-label">Purpose</label>
                  <textarea
                    className="form-control"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    rows={3}
                    placeholder="Enter purpose/reason for advance..."
                  />
                </div>

                <div className="col-12 mb-3">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    rows={3}
                    placeholder="Additional notes or comments..."
                  />
                </div>

                {!isViewMode && (
                  <div className="col-12 mb-3">
                    <label className="form-label">Attachment</label>
                    <input
                      type="file"
                      className="form-control"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    {attachmentPreview && (
                      <div className="mt-2">
                        <small className="text-muted">File selected</small>
                      </div>
                    )}
                  </div>
                )}

                {isViewMode && advance && (
                  <>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Paid Amount</label>
                      <div className="form-control-plaintext fw-bold text-success">
                        {formatCurrency(advance.paid_amount)}
                      </div>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Remaining Amount</label>
                      <div className={`form-control-plaintext fw-bold ${parseFloat(advance.remaining_amount?.toString() || "0") > 0 ? "text-danger" : "text-success"}`}>
                        {formatCurrency(advance.remaining_amount)}
                      </div>
                    </div>

                    {advance.settlement_date && (
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Settlement Date</label>
                        <div className="form-control-plaintext">
                          {formatDate(advance.settlement_date)}
                        </div>
                      </div>
                    )}

                    {advance.attachment && (
                      <div className="col-12 mb-3">
                        <label className="form-label">Attachment</label>
                        <div>
                          <a
                            href={advance.attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="ti ti-download me-1"></i>
                            View Attachment
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Created At</label>
                      <div className="form-control-plaintext">
                        {formatDate(advance.created_at)}
                      </div>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Updated At</label>
                      <div className="form-control-plaintext">
                        {formatDate(advance.updated_at)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                {isViewMode ? "Close" : "Cancel"}
              </button>
              {!isViewMode && (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-check me-1"></i>
                      Create Advance
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1049 }} onClick={onClose}></div>
    </div>
  );
};

export default EmployeeAdvanceModal;
