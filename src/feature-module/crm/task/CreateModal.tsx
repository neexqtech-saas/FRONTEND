import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { getAdminIdForApi, BACKEND_PATH } from "../../../core/utils/apiHelpers";

interface TaskModalProps {
  onTaskAdded: () => void;
  editingTask: any;
  onTaskUpdated: () => void;
  onEditClose: () => void;
  refreshTaskTypes?: () => void;
}

interface TaskFormState {
  title: string;
  description: string;
  task_type: string;
  priority: string;
  status: string;
  assigned_to: string;
  start_date: string;
  due_date: string;
  schedule_frequency: string;
  week_day: string;
  month_date: string;
  schedule_end_date: string;
}

const TaskModal: React.FC<TaskModalProps> = ({
  onTaskAdded,
  editingTask,
  onTaskUpdated,
  onEditClose,
  refreshTaskTypes,
}) => {
  const initialFormState: TaskFormState = {
    title: "",
    description: "",
    task_type: "",
    priority: "medium",
    status: "pending",
    assigned_to: "",
    start_date: "",
    due_date: "",
    schedule_frequency: "onetime",
    week_day: "",
    month_date: "",
    schedule_end_date: "",
  };

  const [formData, setFormData] = useState<TaskFormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [taskTypes, setTaskTypes] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingTaskTypes, setLoadingTaskTypes] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchTaskTypes();
  }, []);

  // Fetch task types when modal is opened
  useEffect(() => {
    const modalElement = document.getElementById("taskModal");
    if (!modalElement) return;

    const handleModalShow = () => {
      fetchTaskTypes();
      fetchEmployees();
    };

    modalElement.addEventListener("shown.bs.modal", handleModalShow);

    return () => {
      modalElement.removeEventListener("shown.bs.modal", handleModalShow);
    };
  }, []);

  // Refresh task types when editingTask changes
  useEffect(() => {
    if (editingTask) {
      // When editing, ensure we have latest task types
      fetchTaskTypes();
    }
  }, [editingTask]);

  useEffect(() => {
    if (editingTask) {
      // Handle task_type - it might be an object with id or just an id
      const taskTypeId = editingTask.task_type?.id || editingTask.task_type || "";
      // Handle assigned_to - it might be an object with id or just an id
      const assignedToId = editingTask.assigned_to?.id || editingTask.assigned_to || "";
      
      setFormData({
        title: editingTask.title || "",
        description: editingTask.description || "",
        task_type: taskTypeId,
        priority: editingTask.priority || "medium",
        status: editingTask.status || "pending",
        assigned_to: assignedToId,
        start_date: editingTask.start_date || "",
        due_date: editingTask.due_date || "",
        schedule_frequency: editingTask.schedule_frequency || "onetime",
        week_day: editingTask.week_day || "",
        month_date: editingTask.month_date || "",
        schedule_end_date: editingTask.schedule_end_date || "",
      });
    } else {
      setFormData(initialFormState);
    }
  }, [editingTask]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id) {
        setLoadingEmployees(false);
        return;
      }

      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) {
        setLoadingEmployees(false);
        return;
      }
      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}staff-list/${site_id}/`;
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

      let employeesData = [];
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        employeesData = response.data.results;
      } else if (response.data && response.data.data) {
        if (Array.isArray(response.data.data)) {
          employeesData = response.data.data;
        } else if (response.data.data.results && Array.isArray(response.data.data.results)) {
          employeesData = response.data.data.results;
        }
      } else if (Array.isArray(response.data)) {
        employeesData = response.data;
      }
      setEmployees(employeesData);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchTaskTypes = async () => {
    setLoadingTaskTypes(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id) {
        setLoadingTaskTypes(false);
        return;
      }

      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) {
        toast.error("Please select a site first");
        setLoadingTaskTypes(false);
        return;
      }

      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}task/task-types/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let taskTypesData = [];
      if (response.data && response.data.data) {
        if (Array.isArray(response.data.data)) {
          taskTypesData = response.data.data;
        }
      } else if (Array.isArray(response.data)) {
        taskTypesData = response.data;
      }
      // Filter only active task types
      taskTypesData = taskTypesData.filter((type: any) => type.is_active !== false);
      setTaskTypes(taskTypesData);
    } catch (error: any) {
      console.error("Error fetching task types:", error);
    } finally {
      setLoadingTaskTypes(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter task title");
      return;
    }

    if (!formData.task_type) {
      toast.error("Please select task type");
      return;
    }

    if (!formData.assigned_to) {
      toast.error("Please select assigned employee");
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
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        task_type: formData.task_type,
        priority: formData.priority,
        status: editingTask ? formData.status : "pending", // Always "pending" for new tasks
        assigned_to: formData.assigned_to,
        start_date: formData.start_date || null,
        due_date: formData.due_date || null,
        schedule_frequency: formData.schedule_frequency || 'onetime',
        week_day: formData.schedule_frequency === 'weekly' ? formData.week_day : null,
        month_date: formData.schedule_frequency === 'monthly' ? (formData.month_date ? parseInt(formData.month_date) : null) : null,
        schedule_end_date: (formData.schedule_frequency !== 'onetime' && formData.schedule_end_date) ? formData.schedule_end_date : null,
      };

      let response;

      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) {
        toast.error("Please select a site first");
        setLoading(false);
        return;
      }

      const role = sessionStorage.getItem("role");
      if (editingTask) {
        // Update existing task
        const user_id = editingTask.assigned_to || formData.assigned_to;
        let url = `${BACKEND_PATH}task/task-detail-update-delete/${site_id}/${user_id}/${editingTask.id}/`;
        if (role === "organization" && admin_id) {
          url += `?admin_id=${admin_id}`;
        }
        response = await axios.put(url, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        toast.success(response.data.message || "Task updated successfully!");
        onTaskUpdated();
      } else {
        // Create new task - use user_id from assigned_to
        let url = `${BACKEND_PATH}task/task-list-create-by-user/${site_id}/${formData.assigned_to}/`;
        if (role === "organization" && admin_id) {
          url += `?admin_id=${admin_id}`;
        }
        response = await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        toast.success(response.data.message || "Task created successfully!");
        onTaskAdded();
      }

      // Reset form
      setFormData(initialFormState);
      
      // Close modal
      const modalElement = document.getElementById("taskModal");
      if (modalElement) {
        const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
    } catch (error: any) {
      console.error("Error saving task:", error);
      toast.error(
        error.response?.data?.message || 
        error.response?.data?.errors || 
        `Failed to ${editingTask ? "update" : "create"} task`
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
      id="taskModal"
      tabIndex={-1}
      aria-labelledby="taskModalLabel"
      aria-hidden="true"
      data-bs-backdrop="static"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="taskModalLabel">
              {editingTask ? "Edit Task" : "Add Task"}
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
                  <label className="form-label">Title <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    name="title"
                    value={formData.title}
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
                <div className="col-md-6 mb-3">
                  <label className="form-label">Task Type <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    name="task_type"
                    value={formData.task_type}
                    onChange={handleInputChange}
                    required
                    disabled={loadingTaskTypes}
                  >
                    <option value="">Select Task Type</option>
                    {taskTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Assigned To <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleInputChange}
                    required
                    disabled={loadingEmployees}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.user?.id || emp.id} value={emp.user?.id || emp.id}>
                        {emp.user_name || emp.user?.email || "Unknown"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    disabled={!editingTask} // Disable when creating new task (always pending)
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Schedule Frequency</label>
                  <select
                    className="form-select"
                    name="schedule_frequency"
                    value={formData.schedule_frequency}
                    onChange={handleInputChange}
                  >
                    <option value="onetime">One Time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                {formData.schedule_frequency === 'onetime' && (
                  <>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Start Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Due Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleInputChange}
                      />
                    </div>
                  </>
                )}
                {formData.schedule_frequency === 'weekly' && (
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Week Day <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      name="week_day"
                      value={formData.week_day}
                      onChange={handleInputChange}
                      required={formData.schedule_frequency === 'weekly'}
                    >
                      <option value="">Select Day</option>
                      <option value="0">Monday</option>
                      <option value="1">Tuesday</option>
                      <option value="2">Wednesday</option>
                      <option value="3">Thursday</option>
                      <option value="4">Friday</option>
                      <option value="5">Saturday</option>
                      <option value="6">Sunday</option>
                    </select>
                  </div>
                )}
                {formData.schedule_frequency === 'monthly' && (
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Month Date <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      name="month_date"
                      value={formData.month_date}
                      onChange={handleInputChange}
                      min="1"
                      max="31"
                      required={formData.schedule_frequency === 'monthly'}
                      placeholder="1-31"
                    />
                  </div>
                )}
                {(formData.schedule_frequency === 'daily' || 
                  formData.schedule_frequency === 'weekly' || 
                  formData.schedule_frequency === 'monthly') && (
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Schedule End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      name="schedule_end_date"
                      value={formData.schedule_end_date}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
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
                {loading ? "Saving..." : editingTask ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;

