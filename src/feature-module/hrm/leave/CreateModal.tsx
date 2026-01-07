import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { getAdminIdForApi } from "../../../core/utils/apiHelpers";

type LeaveTypeModalProps = {
  onLeaveTypeAdded?: (newLeaveType: any) => void;
  editingLeaveType?: any;
  onLeaveTypeUpdated?: (updatedLeaveType: any) => void;
  onEditClose?: () => void;
};

type LeaveTypeFormState = {
  name: string;
  code: string;
  default_count: string;
  is_paid: boolean;
  description: string;
  status: "Active" | "Inactive";
};

const initialFormState: LeaveTypeFormState = {
  name: "",
  code: "",
  default_count: "0",
  is_paid: true,
  description: "",
  status: "Active",
};

const LeaveTypeModal: React.FC<LeaveTypeModalProps> = ({
  onLeaveTypeAdded,
  editingLeaveType,
  onLeaveTypeUpdated,
  onEditClose,
}) => {
  const [addFormData, setAddFormData] = useState<LeaveTypeFormState>(initialFormState);
  const [editFormData, setEditFormData] = useState<LeaveTypeFormState>(initialFormState);

  const statusOptions = useMemo(
    () => [
      { value: "Active" as const, label: "Active" },
      { value: "Inactive" as const, label: "Inactive" },
    ],
    []
  );

  useEffect(() => {
    if (editingLeaveType) {
      setEditFormData({
        name: editingLeaveType.name ?? "",
        code: editingLeaveType.code ?? "",
        default_count: editingLeaveType.default_count?.toString() ?? "0",
        is_paid: editingLeaveType.is_paid ?? true,
        description: editingLeaveType.description ?? "",
        status: editingLeaveType.is_active ? "Active" : "Inactive",
      });
    } else {
      setEditFormData(initialFormState);
    }
  }, [editingLeaveType]);

  const handleAddInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setAddFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setAddFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setEditFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setEditFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const buildPayload = (form: LeaveTypeFormState) => ({
    name: form.name,
    code: form.code,
    default_count: Number(form.default_count) || 0,
    is_paid: form.is_paid,
    description: form.description || null,
    is_active: form.status === "Active",
  });

  const resetAddForm = () => setAddFormData(initialFormState);

  const handleCreate = async () => {
    if (!addFormData.name.trim()) {
      toast.error("Leave type name is required");
      return;
    }

    if (!addFormData.code.trim()) {
      toast.error("Leave type code is required");
      return;
    }

    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();
      
      if (!admin_id) {
        const role = sessionStorage.getItem("role");
        if (role === "organization") {
          toast.error("Please select an admin first from the dashboard.");
        } else {
          toast.error("Admin ID not found. Please login again.");
        }
        return;
      }

      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/leave-types/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      const response = await axios.post(
        url,
        buildPayload(addFormData),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Backend returns { message, data: leaveTypeObject, status }
      const createdLeaveType = response.data?.data || response.data;
      toast.success(response.data?.message || "Leave type created successfully");
      onLeaveTypeAdded?.(createdLeaveType);
      resetAddForm();
      
      // Close modal
      const modalElement = document.getElementById("add_leave_type");
      if (modalElement) {
        const modalInstance = (window as any).bootstrap?.Modal?.getInstance(modalElement);
        if (modalInstance) {
          modalInstance.hide();
        }
      }
    } catch (error: any) {
      console.error("Error adding leave type:", error);
      const errorData = error.response?.data;
      let errorMessage = "Failed to create leave type";
      
      if (errorData?.data) {
        // Handle validation errors
        if (errorData.data.non_field_errors) {
          errorMessage = errorData.data.non_field_errors[0];
        } else if (errorData.data.code) {
          errorMessage = `Code: ${errorData.data.code[0]}`;
        } else if (errorData.data.name) {
          errorMessage = `Name: ${errorData.data.name[0]}`;
        } else {
          // Get first error message from any field
          const firstError = Object.values(errorData.data)[0];
          errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        }
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const getEditingLeaveTypeId = () =>
    editingLeaveType?.id ?? editingLeaveType?.leave_type_id ?? editingLeaveType?.leaveTypeId ?? null;

  const handleUpdate = async () => {
    if (!editFormData.name.trim()) {
      toast.error("Leave type name is required");
      return;
    }

    if (!editFormData.code.trim()) {
      toast.error("Leave type code is required");
      return;
    }

    const leaveTypeId = getEditingLeaveTypeId();
    const admin_id = getAdminIdForApi();

    if (!leaveTypeId) {
      toast.error("Missing identifiers for update");
      return;
    }

    try {
      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      const token = sessionStorage.getItem("access_token");

      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/leave-types/${site_id}/${leaveTypeId}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }

      const response = await axios.put(
        url,
        buildPayload(editFormData),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Backend returns { message, data: leaveTypeObject, status }
      const updatedLeaveType = response.data?.data || response.data;
      toast.success(response.data?.message || "Leave type updated successfully");
      onLeaveTypeUpdated?.(updatedLeaveType);
      onEditClose?.();
      
      // Close modal
      const modalElement = document.getElementById("edit_leave_type");
      if (modalElement) {
        const modalInstance = (window as any).bootstrap?.Modal?.getInstance(modalElement);
        if (modalInstance) {
          modalInstance.hide();
        }
      }
    } catch (error: any) {
      console.error("Error updating leave type:", error);
      const errorData = error.response?.data;
      let errorMessage = "Failed to update leave type";
      
      if (errorData?.data) {
        // Handle validation errors
        if (errorData.data.non_field_errors) {
          errorMessage = errorData.data.non_field_errors[0];
        } else if (errorData.data.code) {
          errorMessage = `Code: ${errorData.data.code[0]}`;
        } else if (errorData.data.name) {
          errorMessage = `Name: ${errorData.data.name[0]}`;
        } else {
          // Get first error message from any field
          const firstError = Object.values(errorData.data)[0];
          errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        }
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleEditCancel = () => {
    onEditClose?.();
    setEditFormData(initialFormState);
  };

  const renderLeaveTypeFields = (
    formData: LeaveTypeFormState,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  ) => (
    <div className="row">
      <div className="col-md-12">
        <div className="mb-3">
          <label className="form-label">Leave Type Name <span className="text-danger">*</span></label>
          <input
            type="text"
            className="form-control"
            name="name"
            value={formData.name}
            onChange={onChange}
            placeholder="e.g. Annual Leave"
            required
          />
        </div>
      </div>
      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label">Code <span className="text-danger">*</span></label>
          <input
            type="text"
            className="form-control"
            name="code"
            value={formData.code}
            onChange={onChange}
            placeholder="e.g. AL"
            required
          />
        </div>
      </div>
      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label">Default Count <span className="text-danger">*</span></label>
          <input
            type="number"
            min="0"
            className="form-control"
            name="default_count"
            value={formData.default_count}
            onChange={onChange}
            placeholder="0"
            required
          />
        </div>
      </div>
      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label">Paid Leave</label>
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              name="is_paid"
              checked={formData.is_paid}
              onChange={onChange}
            />
            <label className="form-check-label">
              {formData.is_paid ? "Yes" : "No"}
            </label>
          </div>
        </div>
      </div>
      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label">Status</label>
          <select
            className="form-select"
            name="status"
            value={formData.status}
            onChange={onChange}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="col-md-12">
        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea
            className="form-control"
            rows={3}
            name="description"
            value={formData.description}
            onChange={onChange}
            placeholder="Optional description"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Add Leave Type Modal */}
      <div className="modal fade" id="add_leave_type">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Leave Type</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                {renderLeaveTypeFields(addFormData, handleAddInputChange)}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreate}
                  data-bs-dismiss="modal"
                >
                  Add Leave Type
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Edit Leave Type Modal */}
      <div className="modal fade" id="edit_leave_type">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Leave Type</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                {renderLeaveTypeFields(editFormData, handleEditInputChange)}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                  onClick={handleEditCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  data-bs-dismiss="modal"
                  onClick={handleUpdate}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeaveTypeModal;
