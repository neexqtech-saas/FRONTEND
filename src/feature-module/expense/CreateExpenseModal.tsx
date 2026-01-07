import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { getAdminIdForApi } from "../../core/utils/apiHelpers";

interface CreateExpenseModalProps {
  onExpenseAdded: () => void;
  onClose: () => void;
  employeeId?: string; // Optional employee ID for admin creating expense for employee
}

interface ExpenseFormState {
  category: string;
  project: string;
  title: string;
  description: string;
  expense_date: string;
  amount: string;
  currency: string;
}

const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  onExpenseAdded,
  onClose,
  employeeId,
}) => {
  const initialFormState: ExpenseFormState = {
    category: "",
    project: "",
    title: "",
    description: "",
    expense_date: new Date().toISOString().split('T')[0],
    amount: "",
    currency: "INR",
  };

  const [formData, setFormData] = useState<ExpenseFormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchProjects();
  }, []);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id || !token) {
        setLoadingCategories(false);
        return;
      }

      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) {
        toast.error("Please select a site first");
        setLoadingCategories(false);
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/expense-categories/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }

      const response = await axios.get(
        url,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.status === 200) {
        setCategories(response.data.data || []);
      }
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id || !token) {
        setLoadingProjects(false);
        return;
      }

      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) {
        toast.error("Please select a site first");
        setLoadingProjects(false);
        return;
      }

      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/expense-projects/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }

      const response = await axios.get(
        url,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.status === 200) {
        setProjects(response.data.data || []);
      }
    } catch (error: any) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }
    if (!formData.project) {
      toast.error("Please select a project");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Please enter expense title");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Please enter description");
      return;
    }
    if (!formData.expense_date) {
      toast.error("Please select expense date");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();
      const user_id = sessionStorage.getItem("user_id");

      if (!admin_id || !token) {
        toast.error("Please login again.");
        setLoading(false);
        return;
      }

      // Use employeeId if provided (admin creating for employee), otherwise use logged-in user
      const expenseEmployeeId = employeeId || user_id;

      if (!expenseEmployeeId) {
        toast.error("Employee ID not found");
        setLoading(false);
        return;
      }

      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) {
        toast.error("Please select a site first");
        setLoading(false);
        return;
      }

      const payload: any = {
        category: parseInt(formData.category),
        project: parseInt(formData.project),
        title: formData.title.trim(),
        description: formData.description.trim(),
        expense_date: formData.expense_date,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
      };

      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/expenses/${site_id}/${expenseEmployeeId}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }

      const response = await axios.post(
        url,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.status === 201) {
        toast.success(response.data.message || "Expense created successfully!");
        onExpenseAdded();
        handleClose();
      } else {
        toast.error(response.data.message || "Failed to create expense");
      }
    } catch (error: any) {
      console.error("Error creating expense:", error);
      toast.error(
        error.response?.data?.message ||
        error.response?.data?.errors ||
        "Failed to create expense"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormState);
    onClose();
  };

  return (
    <div
      className="modal fade"
      id="createExpenseModal"
      tabIndex={-1}
      aria-labelledby="createExpenseModalLabel"
      aria-hidden="true"
      data-bs-backdrop="static"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="createExpenseModalLabel">
              Add Expense
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={handleClose}
            ></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="category" className="form-label">
                    Category <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    disabled={loadingCategories}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="project" className="form-label">
                    Project <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    id="project"
                    name="project"
                    value={formData.project}
                    onChange={handleInputChange}
                    required
                    disabled={loadingProjects}
                  >
                    <option value="">Select Project</option>
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="expense_date" className="form-label">
                    Expense Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    id="expense_date"
                    name="expense_date"
                    value={formData.expense_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="title" className="form-label">
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter expense title"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  Description <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  required
                  placeholder="Enter expense description"
                />
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="amount" className="form-label">
                    Amount <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="currency" className="form-label">
                    Currency
                  </label>
                  <select
                    className="form-select"
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || loadingCategories || loadingProjects}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Creating...
                  </>
                ) : (
                  "Create Expense"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateExpenseModal;

