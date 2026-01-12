import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { getSelectedSiteId, getAdminIdForApi, BACKEND_PATH } from "../../../core/utils/apiHelpers";

interface DeleteModalProps {
  visitId: string | null;
  onVisitDeleted: () => void;
  onCancel: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  visitId,
  onVisitDeleted,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!visitId) return;

    setLoading(true);
    try {
      const token = sessionStorage.getItem("access_token");
      
      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        setLoading(false);
        return;
      }

      // We need to get the visit first to get user_id, or we can modify the API
      // For now, let's try to delete with site_id and visit_id
      // We'll need to fetch the visit first to get user_id
      const admin_id = getAdminIdForApi();
      let url = `${BACKEND_PATH}visit/visit-list-create/${site_id}/`;
      
      // Add admin_id for organization role
      const role = sessionStorage.getItem("role");
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      
      const getVisitResponse = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let visits = [];
      if (getVisitResponse.data && getVisitResponse.data.data) {
        if (getVisitResponse.data.data.results && Array.isArray(getVisitResponse.data.data.results)) {
          visits = getVisitResponse.data.data.results;
        } else if (Array.isArray(getVisitResponse.data.data)) {
          visits = getVisitResponse.data.data;
        }
      } else if (Array.isArray(getVisitResponse.data)) {
        visits = getVisitResponse.data;
      }
      const visit = Array.isArray(visits) ? visits.find((v: any) => v.id === visitId) : null;

      if (!visit) {
        toast.error("Visit not found");
        setLoading(false);
        return;
      }

      const user_id = visit.assigned_employee || visit.assigned_employee_id;

      let deleteUrl = `${BACKEND_PATH}visit/visit-detail-update-delete/${site_id}/${user_id}/${visitId}/`;
      
      // Add admin_id for organization role
      const roleForDelete = sessionStorage.getItem("role");
      if (roleForDelete === "organization" && admin_id) {
        deleteUrl += `?admin_id=${admin_id}`;
      }

      const response = await axios.delete(
        deleteUrl,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(response.data.message || "Visit deleted successfully!");
      onVisitDeleted();

      // Close modal
      const modalElement = document.getElementById("deleteVisitModal");
      if (modalElement) {
        const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
    } catch (error: any) {
      console.error("Error deleting visit:", error);
      toast.error(
        error.response?.data?.message || 
        "Failed to delete visit"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal fade"
      id="deleteVisitModal"
      tabIndex={-1}
      aria-labelledby="deleteVisitModalLabel"
      aria-hidden="true"
      data-bs-backdrop="static"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="deleteVisitModalLabel">
              Delete Visit
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={onCancel}
            ></button>
          </div>
          <div className="modal-body">
            <p>Are you sure you want to delete this visit? This action cannot be undone.</p>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              data-bs-dismiss="modal"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;

