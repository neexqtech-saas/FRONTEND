// src/core/modals/DeleteModal.tsx
import React from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { getAdminIdForApi } from "../../../core/utils/apiHelpers";

interface DeleteModalProps {
  admin_id: string | null;
  shiftId: number | null;
  onDeleted?: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  admin_id: propAdminId,
  shiftId,
  onDeleted,
}) => {
  const handleDelete = async () => {
    if (shiftId == null) {
      console.warn("Delete requested without required identifiers");
      return;
    }
    
    const admin_id = getAdminIdForApi() || propAdminId;
    if (!admin_id) {
      const role = sessionStorage.getItem("role");
      if (role === "organization") {
        toast.error("Please select an admin first from the dashboard.");
      } else {
        toast.error("Admin ID not found. Please login again.");
      }
      return;
    }
    try {
      const token =
        typeof window !== "undefined"
          ? sessionStorage.getItem("access_token")
          : null;
      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/service-shifts/${site_id}/${shiftId}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      await axios.delete(
        url,
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : undefined
      );
      
      toast.success("Service shift deleted successfully");
      onDeleted?.();
    } catch (error: any) {
      console.error("❌ Error deleting service shift:", error);
      
      // Show the full error message from backend
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.detail || 
                          "Failed to delete shift";
      
      // Display backend message (already contains proper formatting and details)
      toast.error(errorMessage, {
        autoClose: 6000  // Give more time to read detailed message
      });
    }
  };

  return (
    <div
      className="modal fade"
      id="delete_modal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-body text-center">
            <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
              <i className="ti ti-trash-x fs-36" />
            </span>
            <h4 className="mb-1">Confirm Delete</h4>
            <p className="mb-3">
              Are you sure you want to delete this shift? This action cannot be
              undone.
            </p>
            <div className="d-flex justify-content-center">
              <button
                type="button"
                className="btn btn-light me-3"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                data-bs-dismiss="modal"
                onClick={handleDelete}
                disabled={shiftId === null}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;