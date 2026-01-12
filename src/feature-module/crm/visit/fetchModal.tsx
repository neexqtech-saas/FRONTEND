import React, { useCallback, useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import axios, { CancelTokenSource } from "axios";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { all_routes } from "../../router/all_routes";
import Table from "../../../core/common/dataTable/index";
import VisitModal from "./CreateModal";
import DeleteModal from "./deleteModal";
import CheckInOutModal from "./CheckInOutModal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAdminIdForApi, getSelectedSiteId, buildApiUrlWithSite, BACKEND_PATH } from "../../../core/utils/apiHelpers";

const getVisitKey = (visit: any) => visit?.id ?? null;

const normalizeVisitId = (value: any): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value);
};

const Visits = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitIdToDelete, setVisitIdToDelete] = useState<string | null>(null);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [checkInOutVisit, setCheckInOutVisit] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
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
  
  // Request cancellation ref
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);
  
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
  }, [debouncedSearchQuery, statusFilter, fromDate, toDate, selectedUserId]);

  const fetchVisits = useCallback(async () => {
    // Cancel previous request if exists
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('New request initiated');
    }
    
    // Create new cancel token
    cancelTokenRef.current = axios.CancelToken.source();
    
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
      let url = `${BACKEND_PATH}visit/visit-list-create/${site_id}/`;
      if (selectedUserId) {
        url = `${BACKEND_PATH}visit/visit-list-create-by-user/${site_id}/${selectedUserId}/`;
      }
      
      const params = new URLSearchParams();
      // Add admin_id for organization role
      const role = sessionStorage.getItem("role");
      if (role === "organization" && admin_id) {
        params.append('admin_id', admin_id);
      }
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      if (fromDate) {
        params.append('date_from', fromDate);
      }
      if (toDate) {
        params.append('date_to', toDate);
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
        cancelToken: cancelTokenRef.current.token,
      });

      // Backend response format: { status, message, data: [...] }
      // Note: All filtering (search, status, date) is done on backend
      // Frontend just displays the filtered data received from API
      let visits = [];
      if (response.data && response.data.data) {
        if (Array.isArray(response.data.data)) {
          visits = response.data.data;
        } else if (response.data.data.results && Array.isArray(response.data.data.results)) {
          visits = response.data.data.results;
        }
      } else if (Array.isArray(response.data)) {
        visits = response.data;
      }
      // Set data directly from backend - no frontend filtering
      setData(visits);
      
      // Set pagination
      if (response.data) {
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
      // Don't show error if request was cancelled
      if (axios.isCancel(error)) {
        return;
      }
      console.error("Error fetching visits:", error);
      toast.error(error.response?.data?.message || "Failed to fetch visits");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, statusFilter, selectedUserId, fromDate, toDate, currentPage, pageSize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

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
      title: "Employee",
      dataIndex: "assigned_employee_name",
      render: (text: string) => <span>{text ?? "—"}</span>,
    },
    {
      title: "Employee ID",
      dataIndex: "custom_employee_id",
      render: (text: string) => text || "—",
      sorter: (a: any, b: any) => {
        const aId = a.custom_employee_id || "";
        const bId = b.custom_employee_id || "";
        return aId.localeCompare(bId);
      },
    },
    {
      title: "Client/Location",
      dataIndex: "client_name",
      render: (_: any, record: any) => (
        <span>{record.client_name || record.location_name || "—"}</span>
      ),
    },
    {
      title: "Schedule Date",
      dataIndex: "schedule_date",
      render: (date: string) => {
        if (!date) return "—";
        return new Date(date).toLocaleDateString();
      },
      sorter: (a: any, b: any) => 
        new Date(a.schedule_date || 0).getTime() - new Date(b.schedule_date || 0).getTime(),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => {
        const statusColors: any = {
          pending: "badge-warning",
          in_progress: "badge-info",
          completed: "badge-success",
          cancelled: "badge-danger",
        };
        const statusLabels: any = {
          pending: "Pending",
          in_progress: "In Progress",
          completed: "Completed",
          cancelled: "Cancelled",
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
      title: "Check-in",
      dataIndex: "check_in_timestamp",
      render: (timestamp: string) => {
        if (!timestamp) return <span className="text-muted">—</span>;
        return new Date(timestamp).toLocaleString();
      },
    },
    {
      title: "Check-out",
      dataIndex: "check_out_timestamp",
      render: (timestamp: string) => {
        if (!timestamp) return <span className="text-muted">—</span>;
        return new Date(timestamp).toLocaleString();
      },
    },
    {
      title: "Actions",
      dataIndex: "actions",
      render: (_: any, visit: any) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-bs-target="#visitModal"
            onClick={() => setEditingVisit(visit)}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            data-bs-toggle="modal"
            data-bs-target="#deleteVisitModal"
            onClick={() => setVisitIdToDelete(normalizeVisitId(getVisitKey(visit)))}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  const handleVisitAdded = () => {
    fetchVisits();
    setEditingVisit(null);
  };

  const handleVisitUpdated = () => {
    fetchVisits();
    setEditingVisit(null);
  };

  const handleVisitDeleted = () => {
    fetchVisits();
    setVisitIdToDelete(null);
  };

  const handleCheckInOut = () => {
    fetchVisits();
    setCheckInOutVisit(null);
  };

  const handleEditClose = () => {
    setEditingVisit(null);
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Visits</h2>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal" data-inert={true}
                  data-bs-target="#visitModal"
                  className="btn btn-primary d-flex align-items-center"
                  onClick={() => setEditingVisit(null)}
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Visit
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
                      placeholder="Search by employee, client, location..."
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
                  <option value="cancelled">Cancelled</option>
                </select>
                </div>
                <div className="col-md-3 col-lg-2">
                  <label className="form-label small text-muted mb-1 fw-medium">From Date</label>
                <input
                  type="date"
                    className="form-control"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                </div>
                <div className="col-md-3 col-lg-2">
                  <label className="form-label small text-muted mb-1 fw-medium">To Date</label>
                <input
                  type="date"
                    className="form-control"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
                <div className="col-md-12 col-lg-3 text-lg-end">
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
                        let url = `${BACKEND_PATH}visit/visit-list-create/${site_id}/`;
                        if (selectedUserId) {
                          url = `${BACKEND_PATH}visit/visit-list-create-by-user/${site_id}/${selectedUserId}/`;
                        }
                        
                        const params = new URLSearchParams();
                        // Add admin_id for organization role
                        const role = sessionStorage.getItem("role");
                        if (role === "organization" && admin_id) {
                          params.append('admin_id', admin_id);
                        }
                        if (debouncedSearchQuery) {
                          params.append('search', debouncedSearchQuery);
                        }
                        if (statusFilter) {
                          params.append('status', statusFilter);
                        }
                        if (fromDate) {
                          params.append('date_from', fromDate);
                        }
                        if (toDate) {
                          params.append('date_to', toDate);
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
                        link.setAttribute('download', 'visits.xlsx');
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url_blob);
                        
                        toast.success("Excel report downloaded successfully!");
                      } catch (error: any) {
                        console.error("Error exporting visits:", error);
                        toast.error(error.response?.data?.message || "Failed to export visits");
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

          {/* Visit List Card */}
          <div className="card">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0">Visit List</h5>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <p className="p-3">Loading visits...</p>
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

      {/* Visit Create/Edit Modal */}
      <VisitModal
        onVisitAdded={handleVisitAdded}
        editingVisit={editingVisit}
        onVisitUpdated={handleVisitUpdated}
        onEditClose={handleEditClose}
      />

      {/* Check-in/Check-out Modal */}
      <CheckInOutModal
        visit={checkInOutVisit}
        onCheckInOut={handleCheckInOut}
        onClose={() => setCheckInOutVisit(null)}
      />

      {/* Delete Modal */}
      <DeleteModal
        visitId={visitIdToDelete}
        onVisitDeleted={handleVisitDeleted}
        onCancel={() => setVisitIdToDelete(null)}
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

export default Visits;

