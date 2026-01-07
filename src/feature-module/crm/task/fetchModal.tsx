import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { all_routes } from "../../router/all_routes";
import Table from "../../../core/common/dataTable/index";
import TaskModal from "./CreateModal";
import TaskTypeModal from "./TaskTypeModal";
import DeleteModal from "./deleteModal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAdminIdForApi, getSelectedSiteId, buildApiUrlWithSite } from "../../../core/utils/apiHelpers";

const getTaskKey = (task: any) => task?.id ?? null;

const normalizeTaskId = (value: any): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value);
};

const ScheduleTask = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskIdToDelete, setTaskIdToDelete] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editingTaskType, setEditingTaskType] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState({
    total_items: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
    has_next: false,
    has_previous: false
  });
  
  // Set default dates to last 10 days
  const getDefaultDates = () => {
    const today = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 10);
    return {
      from: tenDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
  };
  
  const defaultDates = getDefaultDates();
  const [fromDate, setFromDate] = useState<string>(defaultDates.from);
  const [toDate, setToDate] = useState<string>(defaultDates.to);
  
  // Debounce search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, statusFilter, priorityFilter, fromDate, toDate]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
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
        setLoading(false);
        return;
      }

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        setLoading(false);
        return;
      }
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/task/task-list-create/${site_id}/`;
      
      const params = new URLSearchParams();
      if (role === "organization" && admin_id) {
        params.append('admin_id', admin_id);
      }
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      if (priorityFilter) {
        params.append('priority', priorityFilter);
      }
      if (fromDate) {
        params.append('from_date', fromDate);
      }
      if (toDate) {
        params.append('to_date', toDate);
      }
      params.append('page', currentPage.toString());
      params.append('page_size', pageSize.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Backend response format with pagination
      let tasks = [];
      if (response.data) {
        // Check for results array directly (pagination format)
        if (response.data.results && Array.isArray(response.data.results)) {
          tasks = response.data.results;
        } 
        // Check for nested data.results
        else if (response.data.data && response.data.data.results && Array.isArray(response.data.data.results)) {
          tasks = response.data.data.results;
        }
        // Check for data as array
        else if (response.data.data && Array.isArray(response.data.data)) {
          tasks = response.data.data;
        }
        // Check if response.data itself is an array
        else if (Array.isArray(response.data)) {
          tasks = response.data;
        }
        
        // Update pagination state
        if (response.data.count !== undefined) {
          setPagination({
            total_items: response.data.count || response.data.total_objects || 0,
            total_pages: response.data.total_pages || 1,
            current_page: response.data.current_page_number || currentPage,
            page_size: response.data.page_size || pageSize,
            has_next: response.data.has_next || false,
            has_previous: response.data.has_previous || false
          });
        }
      }
      
      setData(tasks);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error(error.response?.data?.message || "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, statusFilter, priorityFilter, fromDate, toDate, currentPage, pageSize]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const routes = all_routes;
  
  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      render: (text: string) => (
        <h6 className="fw-medium">
          <Link to="#">{text}</Link>
        </h6>
      ),
      sorter: (a: any, b: any) => (a.title ?? "").localeCompare(b.title ?? ""),
    },
    {
      title: "Task Type",
      dataIndex: "task_type_name",
      render: (text: string) => <span>{text ?? "—"}</span>,
    },
    {
      title: "Assigned To",
      dataIndex: "assigned_to_name",
      render: (text: string) => <span>{text ?? "—"}</span>,
    },
    {
      title: "Employee ID",
      dataIndex: "assigned_to_custom_employee_id",
      render: (text: string) => <span>{text ?? "—"}</span>,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      render: (priority: string) => {
        const priorityColors: any = {
          low: "badge-info",
          medium: "badge-warning",
          high: "badge-danger",
          urgent: "badge-dark",
        };
        const priorityLabels: any = {
          low: "Low",
          medium: "Medium",
          high: "High",
          urgent: "Urgent",
        };
        return (
          <span className={`badge d-inline-flex align-items-center badge-sm ${priorityColors[priority] || "badge-secondary"}`}>
            {priorityLabels[priority] || priority}
          </span>
        );
      },
      sorter: (a: any, b: any) => (a.priority ?? "").localeCompare(b.priority ?? ""),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => {
        const statusColors: any = {
          pending: "badge-warning",
          in_progress: "badge-info",
          completed: "badge-success",
        };
        const statusLabels: any = {
          pending: "Pending",
          in_progress: "In Progress",
          completed: "Completed",
        };
        return (
          <span className={`badge d-inline-flex align-items-center badge-sm ${statusColors[status] || "badge-secondary"}`}>
            <i className="ti ti-point-filled me-1" />
            {statusLabels[status] || status}
          </span>
        );
      },
      sorter: (a: any, b: any) => (a.status ?? "").localeCompare(b.status ?? ""),
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      render: (dateTime: string) => {
        if (!dateTime) return "—";
        const date = new Date(dateTime);
        return (
          <span>
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
      sorter: (a: any, b: any) => 
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
    },
    {
      title: "Start Time",
      dataIndex: "start_time",
      render: (dateTime: string) => {
        if (!dateTime) return "—";
        const date = new Date(dateTime);
        return (
          <span>
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        );
      },
      sorter: (a: any, b: any) => 
        new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime(),
    },
    {
      title: "End Time",
      dataIndex: "end_time",
      render: (dateTime: string) => {
        if (!dateTime) return "—";
        const date = new Date(dateTime);
        return (
          <span>
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        );
      },
      sorter: (a: any, b: any) => 
        new Date(a.end_time || 0).getTime() - new Date(b.end_time || 0).getTime(),
    },
    {
      title: "Time Spent",
      dataIndex: "actual_hours",
      render: (hours: number) => {
        if (!hours && hours !== 0) return "—";
        const totalMinutes = Math.round(hours * 60);
        const hoursPart = Math.floor(totalMinutes / 60);
        const minutesPart = totalMinutes % 60;
        if (hoursPart > 0 && minutesPart > 0) {
          return <span>{hoursPart}h {minutesPart}m</span>;
        } else if (hoursPart > 0) {
          return <span>{hoursPart}h</span>;
        } else if (minutesPart > 0) {
          return <span>{minutesPart}m</span>;
        } else {
          return <span>0m</span>;
        }
      },
      sorter: (a: any, b: any) => (a.actual_hours || 0) - (b.actual_hours || 0),
    },
    {
      title: "Completion Comment",
      dataIndex: "comments",
      render: (comments: any[], record: any) => {
        if (!comments || !Array.isArray(comments) || comments.length === 0) {
          return <span className="text-muted">—</span>;
        }
        
        // Find completion comment (type === "completion")
        const completionComment = comments.find((comment: any) => comment.type === "completion");
        
        if (!completionComment || !completionComment.comment) {
          return <span className="text-muted">—</span>;
        }
        
        return (
          <div className="d-flex flex-column">
            <span 
              className="text-truncate" 
              style={{ maxWidth: "200px" }}
              title={completionComment.comment}
            >
              {completionComment.comment}
            </span>
            {completionComment.user_name && (
              <small className="text-muted">
                — {completionComment.user_name}
              </small>
            )}
          </div>
        );
      },
    },
    {
      title: "Actions",
      dataIndex: "actions",
      render: (_: any, task: any) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-bs-target="#taskModal"
            onClick={() => setEditingTask(task)}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            data-bs-toggle="modal"
            data-bs-target="#deleteTaskModal"
            onClick={() => setTaskIdToDelete(normalizeTaskId(getTaskKey(task)))}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  const handleTaskAdded = () => {
    fetchTasks();
    setEditingTask(null);
  };

  const handleTaskUpdated = () => {
    fetchTasks();
    setEditingTask(null);
  };

  const handleTaskDeleted = () => {
    fetchTasks();
    setTaskIdToDelete(null);
  };

  const handleEditClose = () => {
    setEditingTask(null);
  };

  const handleTaskTypeAdded = () => {
    setEditingTaskType(null);
    // Refresh task types will happen when CreateModal is opened next time
  };

  const handleTaskTypeUpdated = () => {
    setEditingTaskType(null);
    // Refresh task types will happen when CreateModal is opened next time
  };

  const handleTaskTypeEditClose = () => {
    setEditingTaskType(null);
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Schedule Task</h2>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="mb-2 d-flex gap-2">
                <Link
                  to="#"
                  data-bs-toggle="modal" data-inert={true}
                  data-bs-target="#taskModal"
                  className="btn btn-primary d-flex align-items-center"
                  onClick={() => setEditingTask(null)}
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Task
                </Link>
                <Link
                  to="#"
                  data-bs-toggle="modal" data-inert={true}
                  data-bs-target="#taskTypeModal"
                  className="btn btn-outline-primary d-flex align-items-center"
                  onClick={() => setEditingTaskType(null)}
                >
                  <i className="ti ti-tag me-2" />
                  Add Task Type
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Filters Card */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md-4 col-lg-3">
                  <label className="form-label small text-muted mb-1 fw-medium">Search</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="ti ti-search" />
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Search by title, employee, task type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        className="btn btn-outline-secondary border-start-0"
                        type="button"
                        onClick={() => setSearchQuery("")}
                        title="Clear search"
                      >
                        <i className="ti ti-x" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-md-2 col-lg-2">
                  <label className="form-label small text-muted mb-1 fw-medium">Status</label>
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="col-md-2 col-lg-2">
                  <label className="form-label small text-muted mb-1 fw-medium">Priority</label>
                  <select
                    className="form-select"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <option value="">All Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="col-md-2 col-lg-2">
                  <label className="form-label small text-muted mb-1 fw-medium">From Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="col-md-2 col-lg-2">
                  <label className="form-label small text-muted mb-1 fw-medium">To Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
                <div className="col-md-12 col-lg-1 text-lg-end">
                  <label className="form-label small text-muted mb-1 d-block">&nbsp;</label>
                  <button
                    className="btn btn-success w-100 w-lg-auto d-inline-flex align-items-center justify-content-center"
                    title="Download Excel Report"
                    onClick={async () => {
                      try {
                        const token = sessionStorage.getItem("access_token");
                        const admin_id = getAdminIdForApi();
                        if (!admin_id) {
                          toast.error("Admin ID not found");
                          return;
                        }
                        
                        const site_id = getSelectedSiteId();
                        if (!site_id) {
                          toast.error("Please select a site first");
                          return;
                        }
                        const role = sessionStorage.getItem("role");
                        let url = `http://127.0.0.1:8000/api/task/task-list-create/${site_id}/`;
                        
                        const params = new URLSearchParams();
                        if (role === "organization" && admin_id) {
                          params.append('admin_id', admin_id);
                        }
                        if (debouncedSearchQuery) {
                          params.append('search', debouncedSearchQuery);
                        }
                        if (statusFilter) {
                          params.append('status', statusFilter);
                        }
                        if (priorityFilter) {
                          params.append('priority', priorityFilter);
                        }
                        if (fromDate) {
                          params.append('from_date', fromDate);
                        }
                        if (toDate) {
                          params.append('to_date', toDate);
                        }
                        params.append('export', 'true');
                        
                        if (params.toString()) {
                          url += `?${params.toString()}`;
                        }
                        
                        const response = await axios.get(url, {
                          headers: { Authorization: `Bearer ${token}` },
                          responseType: 'blob',
                        });
                        
                        const blob = new Blob([response.data], {
                          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        });
                        const url_blob = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url_blob;
                        link.setAttribute('download', 'tasks.xlsx');
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url_blob);
                        
                        toast.success("Excel report downloaded successfully!");
                      } catch (error: any) {
                        console.error("Error exporting tasks:", error);
                        toast.error(error.response?.data?.message || "Failed to export tasks");
                      }
                    }}
                  >
                    <i className="ti ti-file-type-xls me-2" />
                    Download Excel
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Task List Card */}
          <div className="card">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0">Task List</h5>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <p className="p-3">Loading tasks...</p>
              ) : (
                <>
                  <Table dataSource={data} columns={columns} Selection={true} />
                  {pagination.total_items > 0 && (
                    <div className="d-flex align-items-center justify-content-between mt-3 pt-3 border-top px-3">
                      <div className="d-flex align-items-center">
                        <span className="me-3">
                          Showing {((pagination.current_page - 1) * pagination.page_size) + 1} to {Math.min(pagination.current_page * pagination.page_size, pagination.total_items)} of {pagination.total_items} entries
                        </span>
                        <select 
                          className="form-select form-select-sm" 
                          style={{ width: 'auto' }}
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                        >
                          <option value={10}>10 per page</option>
                          <option value={20}>20 per page</option>
                          <option value={50}>50 per page</option>
                          <option value={100}>100 per page</option>
                        </select>
                      </div>
                      <div className="d-flex align-items-center">
                        <button
                          className="btn btn-sm btn-white me-2"
                          disabled={!pagination.has_previous}
                          onClick={() => setCurrentPage(currentPage - 1)}
                        >
                          <i className="ti ti-chevron-left me-1"></i>
                          Previous
                        </button>
                        <span className="me-2">
                          Page {pagination.current_page} of {pagination.total_pages}
                        </span>
                        <button
                          className="btn btn-sm btn-white"
                          disabled={!pagination.has_next}
                          onClick={() => setCurrentPage(currentPage + 1)}
                        >
                          Next
                          <i className="ti ti-chevron-right ms-1"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
          <p className="mb-0">2025 © NeexQ</p>
          <p>
            Designed &amp; Developed By{" "}
            <Link to="#" className="text-primary">
              NeexQ
            </Link>
          </p>
        </div>
      </div>
      {/* /Page Wrapper */}

      {/* Task Create/Edit Modal */}
      <TaskModal
        onTaskAdded={handleTaskAdded}
        editingTask={editingTask}
        onTaskUpdated={handleTaskUpdated}
        onEditClose={handleEditClose}
      />

      {/* Task Type Create/Edit Modal */}
      <TaskTypeModal
        onTaskTypeAdded={handleTaskTypeAdded}
        editingTaskType={editingTaskType}
        onTaskTypeUpdated={handleTaskTypeUpdated}
        onEditClose={handleTaskTypeEditClose}
      />

      {/* Delete Modal */}
      <DeleteModal
        taskId={taskIdToDelete}
        onTaskDeleted={handleTaskDeleted}
        onCancel={() => setTaskIdToDelete(null)}
      />
      
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

export default ScheduleTask;

