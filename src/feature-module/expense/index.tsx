import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAdminIdForApi, getSelectedSiteId, buildApiUrlWithSite } from "../../core/utils/apiHelpers";
import { BACKEND_PATH } from "../../environment";
import Table from "../../core/common/dataTable/index";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import ExpenseCategoryModal from "./ExpenseCategoryModal";
import ExpenseProjectModal from "./ExpenseProjectModal";
import ExpenseActionModal from "./ExpenseActionModal";
import CreateExpenseModal from "./CreateExpenseModal";

const Expense = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
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
  const [dateFrom, setDateFrom] = useState<string>(defaultDates.from);
  const [dateTo, setDateTo] = useState<string>(defaultDates.to);
  
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
  }, [debouncedSearchQuery, statusFilter, dateFrom, dateTo]);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [actionExpense, setActionExpense] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [viewExpense, setViewExpense] = useState<any>(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id) {
        const role = sessionStorage.getItem("role");
        if (role === "organization") {
          toast.error("Please select an admin first from the dashboard.");
        }
        setLoading(false);
        return;
      }

      if (!token) {
        toast.error("Please login again.");
        setLoading(false);
        return;
      }

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        setLoading(false);
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}expenses/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      
      const params = new URLSearchParams();
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      if (dateFrom) {
        params.append('date_from', dateFrom);
      }
      if (dateTo) {
        params.append('date_to', dateTo);
      }
      params.append('page', currentPage.toString());
      params.append('page_size', pageSize.toString());
      
      if (params.toString()) {
        url += url.includes('?') ? `&${params.toString()}` : `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Expense API Response:", response.data);
      
      // Handle pagination response structure
      let expenses = [];
      if (response.data) {
        // Check for pagination format with results
        if (response.data.results && Array.isArray(response.data.results)) {
          expenses = response.data.results;
        } else if (response.data.status === 200 && response.data.data) {
          // Standard response format: { status: 200, data: [...] }
          expenses = Array.isArray(response.data.data) ? response.data.data : [];
        } else if (Array.isArray(response.data)) {
          // Direct array response
          expenses = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Nested data structure
          expenses = response.data.data;
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
      
      setData(expenses);
    } catch (error: any) {
      console.error("Error fetching expenses:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to fetch expenses");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, statusFilter, dateFrom, dateTo, currentPage, pageSize]);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id) {
        setLoadingCategories(false);
        return;
      }

      if (!token) {
        setLoadingCategories(false);
        return;
      }

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        setLoadingCategories(false);
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}expense-categories/${site_id}/`;
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

      if (response.data?.status === 200 && response.data?.data) {
        setCategories(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id) {
        setLoadingProjects(false);
        return;
      }

      if (!token) {
        setLoadingProjects(false);
        return;
      }

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        setLoadingProjects(false);
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}expense-projects/${site_id}/`;
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

      if (response.data?.status === 200 && response.data?.data) {
        setProjects(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (error: any) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchProjects();
  }, [fetchExpenses, fetchCategories, fetchProjects]);

  const handleApprove = (expense: any) => {
    setActionExpense(expense);
    setActionType("approve");
    // Use hidden button to trigger modal
    setTimeout(() => {
      const triggerButton = document.getElementById("expenseActionModalTrigger");
      if (triggerButton) {
        triggerButton.click();
      }
    }, 0);
  };

  const handleReject = (expense: any) => {
    setActionExpense(expense);
    setActionType("reject");
    // Use hidden button to trigger modal
    setTimeout(() => {
      const triggerButton = document.getElementById("expenseActionModalTrigger");
      if (triggerButton) {
        triggerButton.click();
      }
    }, 0);
  };

  const handleActionComplete = () => {
    fetchExpenses();
  };

  const handleView = (expense: any) => {
    setViewExpense(expense);
    // Open view modal using Bootstrap
    setTimeout(() => {
      const modalElement = document.getElementById("viewExpenseModal");
      if (modalElement) {
        const triggerButton = document.getElementById("viewExpenseModalTrigger");
        if (triggerButton) {
          triggerButton.click();
        }
      }
    }, 0);
  };

  const handleActionClose = () => {
    setActionExpense(null);
    setActionType(null);
    // Close modal and remove backdrop properly
    const modalElement = document.getElementById("expenseActionModal");
    if (modalElement) {
      // Try Bootstrap 5 way
      if ((window as any).bootstrap?.Modal) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
      
      // Remove backdrop manually if it exists
      setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        
        // Remove modal-open class from body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }, 100);
    }
  };

  const handleViewClose = () => {
    setViewExpense(null);
    // Close modal and remove backdrop properly
    const modalElement = document.getElementById("viewExpenseModal");
    if (modalElement) {
      // Try Bootstrap 5 way
      if ((window as any).bootstrap?.Modal) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
      
      // Remove backdrop manually if it exists
      setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        
        // Remove modal-open class from body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }, 100);
    }
  };

  const columns = [
    {
      title: "Employee Name",
      dataIndex: "employee_name",
      render: (text: string, record: any) => (
        <span>{record.employee_name || record.employee_email || "N/A"}</span>
      ),
      sorter: (a: any, b: any) => 
        (a.employee_name || a.employee_email || "").localeCompare(b.employee_name || b.employee_email || ""),
    },
    {
      title: "Employee ID",
      dataIndex: "employee_custom_employee_id",
      render: (text: string) => <span>{text ?? "—"}</span>,
    },
    {
      title: "Title",
      dataIndex: "title",
      render: (text: string) => <span>{text || "N/A"}</span>,
      sorter: (a: any, b: any) => (a.title ?? "").localeCompare(b.title ?? ""),
    },
    {
      title: "Category",
      dataIndex: "category_name",
      render: (text: string) => <span>{text || "N/A"}</span>,
      sorter: (a: any, b: any) => (a.category_name ?? "").localeCompare(b.category_name ?? ""),
    },
    {
      title: "Project",
      dataIndex: "project_name",
      render: (text: string) => <span>{text || "—"}</span>,
      sorter: (a: any, b: any) => (a.project_name ?? "").localeCompare(b.project_name ?? ""),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      render: (amount: string | number) => (
        <span>₹{parseFloat(String(amount || 0)).toFixed(2)}</span>
      ),
      sorter: (a: any, b: any) => parseFloat(String(a.amount || "0")) - parseFloat(String(b.amount || "0")),
    },
    {
      title: "Approved Amount",
      dataIndex: "reimbursement_amount",
      render: (amount: string | number, record: any) => {
        if (record.status === "approved" && amount) {
          return <span>₹{parseFloat(String(amount || 0)).toFixed(2)}</span>;
        }
        return <span className="text-muted">-</span>;
      },
      sorter: (a: any, b: any) => {
        const amountA = a.status === "approved" ? parseFloat(String(a.reimbursement_amount || "0")) : 0;
        const amountB = b.status === "approved" ? parseFloat(String(b.reimbursement_amount || "0")) : 0;
        return amountA - amountB;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => {
        const statusColors: { [key: string]: string } = {
          pending: "badge bg-warning",
          approved: "badge bg-success",
          rejected: "badge bg-danger",
        };
        return (
          <span className={statusColors[status] || "badge bg-secondary"}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : "N/A"}
          </span>
        );
      },
      sorter: (a: any, b: any) => (a.status ?? "").localeCompare(b.status ?? ""),
    },
    {
      title: "Date",
      dataIndex: "expense_date",
      render: (date: string) => {
        if (date) {
          const dateObj = new Date(date);
          return <span>{dateObj.toLocaleDateString("en-GB")}</span>;
        }
        return <span>N/A</span>;
      },
      sorter: (a: any, b: any) => {
        const dateA = a.expense_date ? new Date(a.expense_date).getTime() : 0;
        const dateB = b.expense_date ? new Date(b.expense_date).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: "Actions",
      dataIndex: "id",
      render: (id: string, record: any) => {
        return (
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-info"
              onClick={() => handleView(record)}
              title="View Details"
            >
              <i className="ti ti-eye"></i>
            </button>
            {record.status === "pending" && (
              <>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => handleApprove(record)}
                  title="Approve"
                >
                  <i className="ti ti-check"></i>
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleReject(record)}
                  title="Reject"
                >
                  <i className="ti ti-x"></i>
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Employee Expenses</h2>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="mb-2 d-flex gap-2">
                <Link
                  to="#"
                  data-bs-toggle="modal" data-inert={true}
                  data-bs-target="#expenseCategoryModal"
                  className="btn btn-outline-primary d-flex align-items-center"
                  onClick={() => setEditingCategory(null)}
                >
                  <i className="ti ti-tag me-2" />
                  Add Expense Category
                </Link>
                <Link
                  to="#"
                  data-bs-toggle="modal" data-inert={true}
                  data-bs-target="#expenseProjectModal"
                  className="btn btn-outline-primary d-flex align-items-center"
                  onClick={() => setEditingProject(null)}
                >
                  <i className="ti ti-folder me-2" />
                  Add Expense Project
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          
          {/* Expense Categories and Projects View */}
          <div className="row mb-3">
            {/* Expense Categories */}
            <div className="col-md-6">
              <div className="card">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">Expense Categories</h5>
                  <span className="badge bg-primary">{categories.length}</span>
                </div>
                <div className="card-body">
                  {loadingCategories ? (
                    <p className="text-muted">Loading categories...</p>
                  ) : categories.length === 0 ? (
                    <p className="text-muted">No categories found</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Code</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categories.map((category: any) => (
                            <tr key={category.id}>
                              <td>{category.name || "N/A"}</td>
                              <td>{category.code || "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Expense Projects */}
            <div className="col-md-6">
              <div className="card">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">Expense Projects</h5>
                  <span className="badge bg-primary">{projects.length}</span>
                </div>
                <div className="card-body">
                  {loadingProjects ? (
                    <p className="text-muted">Loading projects...</p>
                  ) : projects.length === 0 ? (
                    <p className="text-muted">No projects found</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Code</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects.map((project: any) => (
                            <tr key={project.id}>
                              <td>{project.name || "N/A"}</td>
                              <td>{project.code || "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

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
                      placeholder="Search by employee, title, category..."
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
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="col-md-3 col-lg-2">
                  <label className="form-label small text-muted mb-1 fw-medium">From Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="col-md-3 col-lg-2">
                  <label className="form-label small text-muted mb-1 fw-medium">To Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
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
        setLoading(false);
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}expenses/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
                        
                        const params = new URLSearchParams();
                        if (debouncedSearchQuery) {
                          params.append('search', debouncedSearchQuery);
                        }
                        if (statusFilter) {
                          params.append('status', statusFilter);
                        }
                        if (dateFrom) {
                          params.append('date_from', dateFrom);
                        }
                        if (dateTo) {
                          params.append('date_to', dateTo);
                        }
                        params.append('export', 'true');
                        
                        if (params.toString()) {
                          url += url.includes('?') ? `&${params.toString()}` : `?${params.toString()}`;
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
                        link.setAttribute('download', 'expenses.xlsx');
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url_blob);
                        
                        toast.success("Excel report downloaded successfully!");
                      } catch (error: any) {
                        console.error("Error exporting expenses:", error);
                        toast.error(error.response?.data?.message || "Failed to export expenses");
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

          {/* Expense List Card */}
          <div className="card">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0">Expense List</h5>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <p className="p-3">Loading expenses...</p>
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
      
      {/* Expense Category Modal */}
      <ExpenseCategoryModal
        onCategoryAdded={() => {
          setEditingCategory(null);
          fetchCategories();
        }}
        editingCategory={editingCategory}
        onCategoryUpdated={() => {
          setEditingCategory(null);
          fetchCategories();
        }}
        onEditClose={() => setEditingCategory(null)}
      />

      {/* Expense Project Modal */}
      <ExpenseProjectModal
        onProjectAdded={() => {
          setEditingProject(null);
          fetchProjects();
        }}
        editingProject={editingProject}
        onProjectUpdated={() => {
          setEditingProject(null);
          fetchProjects();
        }}
        onEditClose={() => setEditingProject(null)}
      />

      {/* Create Expense Modal */}
      <CreateExpenseModal
        onExpenseAdded={fetchExpenses}
        onClose={() => {}}
      />

      {/* Hidden trigger button for modal */}
      <button
        id="expenseActionModalTrigger"
        type="button"
        style={{ display: "none" }}
        data-bs-toggle="modal"
        data-bs-target="#expenseActionModal"
      />

      {/* Expense Action Modal (Approve/Reject) */}
      <ExpenseActionModal
        expense={actionExpense}
        action={actionType}
        onActionComplete={handleActionComplete}
        onClose={handleActionClose}
      />

      {/* Hidden trigger button for view modal */}
      <button
        id="viewExpenseModalTrigger"
        type="button"
        style={{ display: "none" }}
        data-bs-toggle="modal"
        data-bs-target="#viewExpenseModal"
      />

      {/* View Expense Modal */}
      {viewExpense && (
        <div
          className="modal fade"
          id="viewExpenseModal"
          tabIndex={-1}
          aria-labelledby="viewExpenseModalLabel"
          aria-hidden="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="viewExpenseModalLabel">
                  Expense Details
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                  onClick={handleViewClose}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      <strong>Expense Title:</strong>
                    </label>
                    <p className="form-control-plaintext">{viewExpense.title || "N/A"}</p>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      <strong>Category:</strong>
                    </label>
                    <p className="form-control-plaintext">{viewExpense.category_name || "N/A"}</p>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      <strong>Project:</strong>
                    </label>
                    <p className="form-control-plaintext">{viewExpense.project_name || "N/A"}</p>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      <strong>Expense Date:</strong>
                    </label>
                    <p className="form-control-plaintext">
                      {viewExpense.expense_date 
                        ? new Date(viewExpense.expense_date).toLocaleDateString("en-GB")
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      <strong>Amount:</strong>
                    </label>
                    <p className="form-control-plaintext">₹{parseFloat(viewExpense.amount || 0).toFixed(2)}</p>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      <strong>Status:</strong>
                    </label>
                    <p className="form-control-plaintext">
                      <span className={`badge ${
                        viewExpense.status === "approved" ? "bg-success" :
                        viewExpense.status === "rejected" ? "bg-danger" :
                        "bg-warning"
                      }`}>
                        {viewExpense.status ? viewExpense.status.charAt(0).toUpperCase() + viewExpense.status.slice(1) : "N/A"}
                      </span>
                    </p>
                  </div>
                </div>

                {viewExpense.status === "approved" && viewExpense.reimbursement_amount && (
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        <strong>Approval Amount:</strong>
                      </label>
                      <p className="form-control-plaintext">
                        ₹{parseFloat(viewExpense.reimbursement_amount || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">
                    <strong>Description:</strong>
                  </label>
                  <p className="form-control-plaintext" style={{ whiteSpace: "pre-wrap" }}>
                    {viewExpense.description || "N/A"}
                  </p>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    <strong>Remarks:</strong>
                  </label>
                  <p className="form-control-plaintext" style={{ whiteSpace: "pre-wrap" }}>
                    {viewExpense.remarks || "N/A"}
                  </p>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      <strong>Employee:</strong>
                    </label>
                    <p className="form-control-plaintext">
                      {viewExpense.employee_name || viewExpense.employee_email || "N/A"}
                    </p>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      <strong>Currency:</strong>
                    </label>
                    <p className="form-control-plaintext">{viewExpense.currency || "INR"}</p>
                  </div>
                </div>

                {viewExpense.status === "approved" && viewExpense.approved_by_name && (
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        <strong>Approved By:</strong>
                      </label>
                      <p className="form-control-plaintext">
                        {viewExpense.approved_by_name || viewExpense.approved_by_email || "N/A"}
                      </p>
                    </div>
                    {viewExpense.approved_at && (
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          <strong>Approved At:</strong>
                        </label>
                        <p className="form-control-plaintext">
                          {new Date(viewExpense.approved_at).toLocaleString("en-GB")}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {viewExpense.status === "rejected" && viewExpense.rejected_by_name && (
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        <strong>Rejected By:</strong>
                      </label>
                      <p className="form-control-plaintext">
                        {viewExpense.rejected_by_name || viewExpense.rejected_by_email || "N/A"}
                      </p>
                    </div>
                    {viewExpense.rejected_at && (
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          <strong>Rejected At:</strong>
                        </label>
                        <p className="form-control-plaintext">
                          {new Date(viewExpense.rejected_at).toLocaleString("en-GB")}
                        </p>
                      </div>
                    )}
                    {viewExpense.rejection_reason && (
                      <div className="col-md-12 mb-3">
                        <label className="form-label">
                          <strong>Rejection Reason:</strong>
                        </label>
                        <p className="form-control-plaintext" style={{ whiteSpace: "pre-wrap" }}>
                          {viewExpense.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                  onClick={handleViewClose}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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

export default Expense;
