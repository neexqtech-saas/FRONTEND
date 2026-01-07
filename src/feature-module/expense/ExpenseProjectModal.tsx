import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { getAdminIdForApi } from "../../core/utils/apiHelpers";

interface ExpenseProjectModalProps {
  onProjectAdded: () => void;
  editingProject: any;
  onProjectUpdated: () => void;
  onEditClose: () => void;
}

interface ProjectFormState {
  name: string;
  description: string;
  code: string;
  color_code: string;
}

const ExpenseProjectModal: React.FC<ExpenseProjectModalProps> = ({
  onProjectAdded,
  editingProject,
  onProjectUpdated,
  onEditClose,
}) => {
  const initialFormState: ProjectFormState = {
    name: "",
    description: "",
    code: "",
    color_code: "#3498db",
  };

  const [formData, setFormData] = useState<ProjectFormState>(initialFormState);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingProject) {
      setFormData({
        name: editingProject.name || "",
        description: editingProject.description || "",
        code: editingProject.code || "",
        color_code: editingProject.color_code || "#3498db",
      });
    } else {
      setFormData(initialFormState);
    }
  }, [editingProject]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter project name");
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id) {
        toast.error("Admin ID not found. Please login again.");
        setLoading(false);
        return;
      }

      const payload: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        code: formData.code.trim() || null,
        color_code: formData.color_code || "#3498db",
      };

      let response;

      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      if (editingProject) {
        // Update existing project
        // Admin role: backend gets admin_id from request.user
        // Organization role: admin_id should be passed as query param
        const role = sessionStorage.getItem("role");
        let url = `http://127.0.0.1:8000/api/expense-projects/${site_id}/${editingProject.id}/`;
        if (role === "organization" && admin_id) {
          url += `?admin_id=${admin_id}`;
        }

        response = await axios.put(
          url,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        toast.success(response.data.message || "Expense project updated successfully!");
        onProjectUpdated();
      } else {
        // Create new project
        // Admin role: backend gets admin_id from request.user
        // Organization role: admin_id should be passed as query param
        const role = sessionStorage.getItem("role");
        let url = `http://127.0.0.1:8000/api/expense-projects/${site_id}/`;
        if (role === "organization" && admin_id) {
          url += `?admin_id=${admin_id}`;
        }

        response = await axios.post(
          url,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        toast.success(response.data.message || "Expense project created successfully!");
        onProjectAdded();
      }

      // Reset form
      setFormData(initialFormState);
      
      // Close modal
      const modalElement = document.getElementById("expenseProjectModal");
      if (modalElement) {
        const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
    } catch (error: any) {
      console.error("Error saving expense project:", error);
      toast.error(
        error.response?.data?.message || 
        error.response?.data?.errors || 
        `Failed to ${editingProject ? "update" : "create"} expense project`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    onEditClose();
  };

  return (
    <div
      className="modal fade"
      id="expenseProjectModal"
      tabIndex={-1}
      aria-labelledby="expenseProjectModalLabel"
      aria-hidden="true"
      data-bs-backdrop="static"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="expenseProjectModalLabel">
              {editingProject ? "Edit Expense Project" : "Add Expense Project"}
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={handleCancel}
            ></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-12 mb-3">
                  <label className="form-label">Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label">Code</label>
                  <input
                    type="text"
                    className="form-control"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="Optional"
                  />
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label">Color Code</label>
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="color"
                      className="form-control form-control-color"
                      name="color_code"
                      value={formData.color_code}
                      onChange={handleInputChange}
                      style={{ width: "60px", height: "38px" }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      name="color_code"
                      value={formData.color_code}
                      onChange={handleInputChange}
                      placeholder="#3498db"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Saving..." : editingProject ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpenseProjectModal;

