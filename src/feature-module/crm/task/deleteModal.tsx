import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { getAdminIdForApi } from "../../../core/utils/apiHelpers";

interface DeleteModalProps {
  taskId: string | null;
  onTaskDeleted: () => void;
  onCancel: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  taskId,
  onTaskDeleted,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!taskId) return;

    setLoading(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id) {
        toast.error("Admin ID not found. Please login again.");
        setLoading(false);
        return;
      }

      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) {
        toast.error("Please select a site first");
        setLoading(false);
        return;
      }

      const role = sessionStorage.getItem("role");
      // We need to get the task first to get user_id
      let url = `http://127.0.0.1:8000/api/task/task-list-create/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      const getTaskResponse = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let tasks = [];
      if (getTaskResponse.data && getTaskResponse.data.data) {
        if (getTaskResponse.data.data.results && Array.isArray(getTaskResponse.data.data.results)) {
          tasks = getTaskResponse.data.data.results;
        } else if (Array.isArray(getTaskResponse.data.data)) {
          tasks = getTaskResponse.data.data;
        }
      } else if (Array.isArray(getTaskResponse.data)) {
        tasks = getTaskResponse.data;
      }
      const task = Array.isArray(tasks) ? tasks.find((t: any) => t.id === parseInt(taskId)) : null;

      if (!task) {
        toast.error("Task not found");
        setLoading(false);
        return;
      }

      const user_id = task.assigned_to || task.assigned_to_id;

      url = `http://127.0.0.1:8000/api/task/task-detail-update-delete/${site_id}/${user_id}/${taskId}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      const response = await axios.delete(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success(response.data.message || "Task deleted successfully!");
      onTaskDeleted();

      // Close modal
      const modalElement = document.getElementById("deleteTaskModal");
      if (modalElement) {
        const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast.error(
        error.response?.data?.message || 
        "Failed to delete task"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal fade"
      id="deleteTaskModal"
      tabIndex={-1}
      aria-labelledby="deleteTaskModalLabel"
      aria-hidden="true"
      data-bs-backdrop="static"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="deleteTaskModalLabel">
              Delete Task
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
            <p>Are you sure you want to delete this task? This action cannot be undone.</p>
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

