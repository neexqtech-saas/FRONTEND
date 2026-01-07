import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Table } from "antd";
import { getAdminIdForApi, getSelectedSiteId, API_BASE_URL } from '../../../core/utils/apiHelpers';

const BACKEND_PATH = API_BASE_URL;

type LeaveApplication = {
  id: number;
  user: string;
  user_name: string;
  user_email: string;
  custom_employee_id?: string;
  leave_type: number;
  leave_type_name: string;
  leave_type_code: string;
  from_date: string;
  to_date: string;
  total_days: number;
  leave_day_type: "full_day" | "first_half" | "second_half";
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  applied_at: string;
  reviewed_at?: string;
  reviewed_by_email?: string;
  comments?: string;
};

const EmployeeLeaves: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ start_date: string; end_date: string } | null>(null);
  const [processingLeaveId, setProcessingLeaveId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
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
  
  // Date filter - default to last 10 days
  const getDefaultFromDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 10);
    return date.toISOString().split('T')[0];
  };
  
  const getDefaultToDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  const [fromDate, setFromDate] = useState<string>(getDefaultFromDate());
  const [toDate, setToDate] = useState<string>(getDefaultToDate());
  const [useDateFilter, setUseDateFilter] = useState<boolean>(true);

  // Year options: Only 2025 and 2026
  const yearOptions = [2025, 2026];

  // Fetch leave applications on mount and when year/page/search/date changes
  useEffect(() => {
    fetchLeaveApplications();
  }, [selectedYear, currentPage, pageSize, fromDate, toDate, useDateFilter, searchQuery, selectedStatus]);

  // Reset to page 1 when search or date filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fromDate, toDate, useDateFilter, selectedStatus]);

  const fetchLeaveApplications = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const adminId = getAdminIdForApi();

      if (!adminId) {
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
      let url = `${BACKEND_PATH}/api/leave-applications/${site_id}/?year=${selectedYear}&page=${currentPage}&page_size=${pageSize}`;
      if (role === "organization" && adminId) {
        url += `&admin_id=${adminId}`;
      }
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      if (selectedStatus && selectedStatus !== 'all') {
        url += `&status=${selectedStatus}`;
      }
      if (useDateFilter) {
        url += `&from_date=${fromDate}`;
        if (toDate) {
          url += `&to_date=${toDate}`;
        }
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setLeaveApplications(response.data.data || []);
      setDateRange(response.data.date_range);
      
      // Set pagination
      if (response.data.count !== undefined || response.data.total_objects !== undefined) {
        const totalItems = response.data.count || response.data.total_objects || 0;
        const totalPages = response.data.total_pages || Math.ceil(totalItems / pageSize) || 1;
        const currentPageNum = response.data.current_page_number || currentPage;
        
        setPagination({
          total_items: totalItems,
          total_pages: totalPages,
          current_page: currentPageNum,
          page_size: response.data.page_size || pageSize,
          has_next: response.data.has_next !== undefined ? response.data.has_next : (response.data.next !== null),
          has_previous: response.data.has_previous !== undefined ? response.data.has_previous : (response.data.previous !== null)
        });
        
        if (currentPageNum !== currentPage) {
          setCurrentPage(currentPageNum);
        }
      }
    } catch (error: any) {
      console.error("Error fetching leave applications:", error);
      const errorMessage = error.response?.data?.message || "Failed to fetch leave applications";
      toast.error(errorMessage);
      setLeaveApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (leaveId: number, newStatus: "approved" | "rejected", employeeId: string) => {
    setProcessingLeaveId(leaveId);
    try {
      const token = sessionStorage.getItem("access_token");
      const adminId = getAdminIdForApi();

      if (!adminId) {
        toast.error("Admin ID not found");
        return;
      }

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}/api/leave-applications/${site_id}/${employeeId}/${leaveId}/`;
      if (role === "organization" && adminId) {
        url += `?admin_id=${adminId}`;
      }

      const response = await axios.put(url, {
        status: newStatus,
        reviewed_at: new Date().toISOString(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(response.data.message || `Leave ${newStatus} successfully`);
      
      // Refresh the list
      fetchLeaveApplications();
    } catch (error: any) {
      console.error(`Error ${newStatus} leave:`, error);
      const errorMessage = error.response?.data?.message || `Failed to ${newStatus} leave`;
      toast.error(errorMessage);
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleCancelLeave = async (leaveId: number, employeeId: string) => {
    if (!window.confirm("Are you sure you want to cancel this leave application?")) {
      return;
    }

    setProcessingLeaveId(leaveId);
    try {
      const token = sessionStorage.getItem("access_token");
      const adminId = getAdminIdForApi();

      if (!adminId) {
        toast.error("Admin ID not found");
        return;
      }

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}/api/leave-applications/${site_id}/${employeeId}/${leaveId}/`;
      if (role === "organization" && adminId) {
        url += `?admin_id=${adminId}`;
      }

      const response = await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(response.data.message || "Leave cancelled successfully");
      
      // Refresh the list
      fetchLeaveApplications();
    } catch (error: any) {
      console.error("Error cancelling leave:", error);
      const errorMessage = error.response?.data?.message || "Failed to cancel leave";
      toast.error(errorMessage, { autoClose: 6000 });
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "badge-warning";
      case "approved":
        return "badge-success";
      case "rejected":
        return "badge-danger";
      case "cancelled":
        return "badge-secondary";
      default:
        return "badge-info";
    }
  };

  // Filter by status on frontend (backend also filters, but this is for immediate UI update)
  const filteredApplications = selectedStatus === "all" 
    ? leaveApplications 
    : leaveApplications.filter(app => app.status === selectedStatus);

  const columns = [
    {
      title: "Employee",
      dataIndex: "user_name",
      key: "user_name",
      render: (text: string, record: LeaveApplication) => (
        <div>
          <strong>{text}</strong>
          <br />
          <small className="text-muted">{record.user_email}</small>
        </div>
      ),
      sorter: (a: LeaveApplication, b: LeaveApplication) => a.user_name.localeCompare(b.user_name),
    },
    {
      title: "Employee ID",
      dataIndex: "custom_employee_id",
      key: "custom_employee_id",
      render: (text: string) => text || "-",
      sorter: (a: LeaveApplication, b: LeaveApplication) => {
        const aId = a.custom_employee_id || "";
        const bId = b.custom_employee_id || "";
        return aId.localeCompare(bId);
      },
    },
    {
      title: "Leave Type",
      dataIndex: "leave_type_name",
      key: "leave_type_name",
      render: (text: string, record: LeaveApplication) => (
        <div>
          {text}
          <br />
          <small className="text-muted">({record.leave_type_code})</small>
        </div>
      ),
    },
    {
      title: "Duration",
      key: "duration",
      render: (_: any, record: LeaveApplication) => (
        <div>
          <div>{new Date(record.from_date).toLocaleDateString()} to {new Date(record.to_date).toLocaleDateString()}</div>
          <span className="badge badge-info badge-sm">{record.total_days} day(s)</span>
        </div>
      ),
    },
    {
      title: "Day Type",
      dataIndex: "leave_day_type",
      key: "leave_day_type",
      render: (type: string) => {
        const typeMap: { [key: string]: { label: string; badge: string } } = {
          full_day: { label: "Full Day", badge: "badge-primary" },
          first_half: { label: "First Half Day", badge: "badge-info" },
          second_half: { label: "Second Half Day", badge: "badge-warning" },
        };
        const typeInfo = typeMap[type] || { label: type, badge: "badge-secondary" };
        return <span className={`badge ${typeInfo.badge}`}>{typeInfo.label}</span>;
      },
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (text: string) => (
        <div style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
          {text}
        </div>
      ),
    },
    {
      title: "Applied On",
      dataIndex: "applied_at",
      key: "applied_at",
      render: (text: string) => new Date(text).toLocaleDateString(),
      sorter: (a: LeaveApplication, b: LeaveApplication) => 
        new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <span className={`badge ${getStatusBadgeClass(status)}`}>
          {status.toUpperCase()}
        </span>
      ),
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Approved', value: 'approved' },
        { text: 'Rejected', value: 'rejected' },
        { text: 'Cancelled', value: 'cancelled' },
      ],
      onFilter: (value: any, record: LeaveApplication) => record.status === value,
    },
    {
      title: "Actions",
      key: "actions",
      align: "center" as const,
      render: (_: any, record: LeaveApplication) => (
        <div className="d-flex gap-1 justify-content-center">
          {record.status === "pending" && (
            <>
              <button
                className="btn btn-sm btn-success"
                onClick={() => handleApproveReject(record.id, "approved", record.user)}
                disabled={processingLeaveId === record.id}
                title="Approve"
              >
                {processingLeaveId === record.id ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <i className="ti ti-check" />
                )}
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleApproveReject(record.id, "rejected", record.user)}
                disabled={processingLeaveId === record.id}
                title="Reject"
              >
                {processingLeaveId === record.id ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <i className="ti ti-x" />
                )}
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => handleCancelLeave(record.id, record.user)}
                disabled={processingLeaveId === record.id}
                title="Cancel"
              >
                {processingLeaveId === record.id ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <i className="ti ti-ban" />
                )}
              </button>
            </>
          )}
          {record.status !== "pending" && (
            <span className="text-muted small">No actions</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        {/* Page Header */}
        <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
          <div className="my-auto mb-2">
            <h3 className="page-title mb-1">Employee Leaves</h3>
            <nav>
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <a href="index">Dashboard</a>
                </li>
                <li className="breadcrumb-item">Employees</li>
                <li className="breadcrumb-item active" aria-current="page">
                  Employee Leaves
                </li>
              </ol>
            </nav>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-3">
          <div className="card-body">
            <div className="row align-items-center">
              <div className="col-md-2">
                <div className="mb-3 mb-md-0">
                  <label className="form-label">Select Year</label>
                  <select
                    className="form-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    disabled={useDateFilter}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  {dateRange && !useDateFilter && (
                    <small className="text-muted d-block mt-1">
                      Range: {new Date(dateRange.start_date).toLocaleDateString()} to{" "}
                      {new Date(dateRange.end_date).toLocaleDateString()}
                    </small>
                  )}
                </div>
              </div>
              <div className="col-md-2">
                <div className="mb-3 mb-md-0">
                  <label className="form-label d-flex align-items-center">
                    <input
                      type="checkbox"
                      className="form-check-input me-2"
                      checked={useDateFilter}
                      onChange={(e) => setUseDateFilter(e.target.checked)}
                    />
                    Date Filter
                  </label>
                  {useDateFilter && (
                    <input
                      type="date"
                      className="form-control form-control-sm mt-2"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      title="From Date"
                    />
                  )}
                </div>
              </div>
              {useDateFilter && (
                <div className="col-md-2">
                  <div className="mb-3 mb-md-0">
                    <label className="form-label">To Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      title="To Date"
                    />
                  </div>
                </div>
              )}
              <div className="col-md-2">
                <div className="mb-3 mb-md-0">
                  <label className="form-label">Filter by Status</label>
                  <select
                    className="form-select"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="col-md-2">
                <div className="mb-3 mb-md-0">
                  <label className="form-label">Total Applications</label>
                  <div className="h5 mb-0">{pagination.total_items || filteredApplications.length}</div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="mb-3 mb-md-0">
                  <label className="form-label">Download Excel</label>
                  <button
                    className="btn btn-success w-100 d-flex align-items-center justify-content-center"
                    onClick={async () => {
                      try {
                        const token = sessionStorage.getItem("access_token");
                        const adminId = getAdminIdForApi();
                        if (!adminId) {
                          toast.error("Admin ID not found");
                          return;
                        }
                        
                        const site_id = getSelectedSiteId();
                        if (!site_id) {
                          toast.error("Please select a site first");
                          return;
                        }
                        const role = sessionStorage.getItem("role");
                        let url = `${BACKEND_PATH}/api/leave-applications/${site_id}/?year=${selectedYear}&export=true`;
                        if (role === "organization" && adminId) {
                          url += `&admin_id=${adminId}`;
                        }
                        if (searchQuery) {
                          url += `&search=${encodeURIComponent(searchQuery)}`;
                        }
                        if (selectedStatus && selectedStatus !== 'all') {
                          url += `&status=${selectedStatus}`;
                        }
                        if (useDateFilter) {
                          url += `&from_date=${fromDate}`;
                          if (toDate) {
                            url += `&to_date=${toDate}`;
                          }
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
                        link.setAttribute('download', `leave_applications_${selectedYear}.xlsx`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url_blob);
                        
                        toast.success("Excel report downloaded successfully!");
                      } catch (error: any) {
                        console.error("Error exporting leave applications:", error);
                        toast.error(error.response?.data?.message || "Failed to export leave applications");
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
        </div>

        {/* Leave Applications Table */}
        <div className="card">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <h5>Leave Applications</h5>
            <div className="input-group" style={{ maxWidth: '400px' }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by name, employee ID, email, leave type, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '0.875rem' }}
              />
              <span className="input-group-text" style={{ padding: '0.25rem 0.5rem' }}>
                <i className="ti ti-search" />
              </span>
              {searchQuery && (
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  <i className="ti ti-x" />
                </button>
              )}
            </div>
          </div>
          <div className="card-body">
            <Table
              columns={columns}
              dataSource={filteredApplications}
              rowKey="id"
              loading={loading}
              pagination={false}
              scroll={{ x: "max-content" }}
            />
            {pagination.total_items > 0 && (
              <div className="d-flex align-items-center justify-content-between mt-3 pt-3 border-top">
                <div className="d-flex align-items-center">
                  <span className="me-3">Showing {((pagination.current_page - 1) * pagination.page_size) + 1} to {Math.min(pagination.current_page * pagination.page_size, pagination.total_items)} of {pagination.total_items} entries</span>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLeaves;

