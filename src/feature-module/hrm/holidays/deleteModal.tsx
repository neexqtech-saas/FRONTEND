// src/core/modals/DeleteModal.tsx
import React from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { getAdminIdForApi } from "../../../core/utils/apiHelpers";

interface DeleteModalProps {
  admin_id: string | null;
  holidayId: number | null;
  onDeleted?: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  admin_id,
  holidayId,
  onDeleted,
}) => {
  const handleDelete = async () => {
    if (holidayId == null) {
      console.warn("Delete requested without required identifiers");
      return;
    }
    try {
      const token = typeof window !== "undefined" ? sessionStorage.getItem("access_token") : null;
      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      const currentAdminId = getAdminIdForApi() || admin_id;
      let url = `http://127.0.0.1:8000/api/holidays/${site_id}/${holidayId}/`;
      if (role === "organization" && currentAdminId) {
        url += `?admin_id=${currentAdminId}`;
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
      console.log("✅ Holiday deleted successfully");
      onDeleted?.();
    } catch (error) {
      console.error("❌ Error deleting holiday:", error);
      alert("Failed to delete the holiday");
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
              Are you sure you want to delete this holiday? This action cannot
              be undone.
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
                disabled={holidayId === null}
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