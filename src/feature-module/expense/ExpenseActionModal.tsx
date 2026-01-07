import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { getAdminIdForApi } from "../../core/utils/apiHelpers";

interface ExpenseActionModalProps {
  expense: any | null;
  action: "approve" | "reject" | null;
  onActionComplete: () => void;
  onClose: () => void;
}

const ExpenseActionModal: React.FC<ExpenseActionModalProps> = ({
  expense,
  action,
  onActionComplete,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    approval_amount: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expense && action === "approve") {
      setFormData({
        approval_amount: expense.amount || "",
        description: "",
      });
    } else if (expense && action === "reject") {
      setFormData({
        approval_amount: "",
        description: "",
      });
    }
  }, [expense, action]);

  // Cleanup backdrop when modal is hidden
  useEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;

    const handleHidden = () => {
      // Remove all backdrops
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      
      // Remove modal-open class and styles from body
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };

    modalElement.addEventListener('hidden.bs.modal', handleHidden);

    return () => {
      modalElement.removeEventListener('hidden.bs.modal', handleHidden);
      // Cleanup on unmount
      handleHidden();
    };
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (action === "reject" && !formData.description.trim()) {
      toast.error("Please enter rejection reason");
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id || !token) {
        toast.error("Please login again.");
        setLoading(false);
        return;
      }

      const payload: any = {};
      
      if (action === "approve") {
        if (formData.approval_amount) {
          payload.approval_amount = parseFloat(formData.approval_amount);
        }
        if (formData.description.trim()) {
          payload.description = formData.description.trim();
        }

        const site_id = sessionStorage.getItem("selected_site_id");
        if (!site_id) {
          toast.error("Please select a site first");
          return;
        }
        // Admin role: backend gets admin_id from request.user
        // Organization role: admin_id should be passed as query param
        const role = sessionStorage.getItem("role");
        let url = `http://127.0.0.1:8000/api/expenses/${site_id}/${expense.id}/approve/`;
        if (role === "organization" && admin_id) {
          url += `?admin_id=${admin_id}`;
        }

        const response = await axios.put(
          url,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.status === 200) {
          toast.success(response.data.message || "Expense approved successfully");
          onActionComplete();
          handleClose();
        } else {
          toast.error(response.data.message || "Failed to approve expense");
        }
      } else if (action === "reject") {
        const site_id = sessionStorage.getItem("selected_site_id");
        if (!site_id) {
          toast.error("Please select a site first");
          return;
        }
        payload.description = formData.description.trim();

        // Admin role: backend gets admin_id from request.user
        // Organization role: admin_id should be passed as query param
        const role = sessionStorage.getItem("role");
        let url = `http://127.0.0.1:8000/api/expenses/${site_id}/${expense.id}/reject/`;
        if (role === "organization" && admin_id) {
          url += `?admin_id=${admin_id}`;
        }

        const response = await axios.put(
          url,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.status === 200) {
          toast.success(response.data.message || "Expense rejected successfully");
          onActionComplete();
          handleClose();
        } else {
          toast.error(response.data.message || "Failed to reject expense");
        }
      }
    } catch (error: any) {
      console.error(`Error ${action === "approve" ? "approving" : "rejecting"} expense:`, error);
      toast.error(
        error.response?.data?.message ||
          `Failed to ${action === "approve" ? "approve" : "reject"} expense`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      approval_amount: "",
      description: "",
    });
    
    // Remove backdrop and body classes before calling onClose
    setTimeout(() => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      
      // Remove modal-open class from body
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }, 100);
    
    onClose();
  };

  if (!expense || !action) return null;

  return (
    <div
      ref={modalRef}
      className="modal fade"
      id="expenseActionModal"
      tabIndex={-1}
      aria-labelledby="expenseActionModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="expenseActionModalLabel">
              {action === "approve" ? "Approve Expense" : "Reject Expense"}
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={(e) => {
                e.preventDefault();
                handleClose();
              }}
            ></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <strong>Expense Title:</strong>
                  </label>
                  <p className="form-control-plaintext">{expense.title || "N/A"}</p>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <strong>Category:</strong>
                  </label>
                  <p className="form-control-plaintext">{expense.category_name || "N/A"}</p>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <strong>Project:</strong>
                  </label>
                  <p className="form-control-plaintext">{expense.project_name || "N/A"}</p>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <strong>Expense Date:</strong>
                  </label>
                  <p className="form-control-plaintext">
                    {expense.expense_date 
                      ? new Date(expense.expense_date).toLocaleDateString("en-GB")
                      : "N/A"}
                  </p>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <strong>Amount:</strong>
                  </label>
                  <p className="form-control-plaintext">₹{parseFloat(expense.amount || 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  <strong>Description:</strong>
                </label>
                <p className="form-control-plaintext" style={{ whiteSpace: "pre-wrap" }}>
                  {expense.description || "N/A"}
                </p>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  <strong>Employee:</strong>
                </label>
                <p className="form-control-plaintext">
                  {expense.employee_name || expense.employee_email || "N/A"}
                </p>
              </div>

              {action === "approve" && (
                <div className="mb-3">
                  <label htmlFor="approval_amount" className="form-label">
                    Approval Amount <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="approval_amount"
                    name="approval_amount"
                    value={formData.approval_amount}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    required
                    placeholder="Enter approval amount"
                  />
                </div>
              )}

              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  {action === "approve" ? "Description (Optional)" : "Rejection Reason"}
                  {action === "reject" && <span className="text-danger">*</span>}
                </label>
                <textarea
                  className="form-control"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  required={action === "reject"}
                  placeholder={
                    action === "approve"
                      ? "Enter description (optional)"
                      : "Enter rejection reason"
                  }
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
                onClick={(e) => {
                  e.preventDefault();
                  handleClose();
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn ${action === "approve" ? "btn-success" : "btn-danger"}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Processing...
                  </>
                ) : (
                  action === "approve" ? "Approve" : "Reject"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpenseActionModal;

