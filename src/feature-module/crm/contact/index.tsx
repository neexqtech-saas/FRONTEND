import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { all_routes } from "../../router/all_routes";
import Table from "../../../core/common/dataTable/index";
import ContactModal from "./ContactModal";
import DeleteModal from "./DeleteModal";
import ContactDetailModal from "./ContactDetailModal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAdminIdForApi, getSelectedSiteId, buildApiUrlWithSite, BACKEND_PATH } from "../../../core/utils/apiHelpers";

const getContactKey = (contact: any) => contact?.id ?? null;

const normalizeContactId = (value: any): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value);
};

const Contacts = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactIdToDelete, setContactIdToDelete] = useState<string | null>(null);
  const [contactToDelete, setContactToDelete] = useState<any>(null);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("");
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
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
  
  // Debounce search query - declared before useCallback
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");

  // Set default dates to last 10 days on mount
  useEffect(() => {
    const today = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 10);
    
    setFromDate(tenDaysAgo.toISOString().split('T')[0]);
    setToDate(today.toISOString().split('T')[0]);
  }, []);

  const fetchContacts = useCallback(async () => {
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

      const role = sessionStorage.getItem("role");
      const user_id = sessionStorage.getItem("user_id");
      
      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        setLoading(false);
        return;
      }
      // Admin sees all contacts, User sees only their own
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      let url = role === "user" && user_id
        ? `${BACKEND_PATH}contact/contact-list-create-by-user/${site_id}/${user_id}/`
        : `${BACKEND_PATH}contact/contact-list-create/${site_id}/`;
      
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);
      if (sourceTypeFilter) params.append("source_type", sourceTypeFilter);
      if (companyFilter) params.append("company", companyFilter);
      if (stateFilter) params.append("state", stateFilter);
      if (cityFilter) params.append("city", cityFilter);
      if (fromDate) params.append("date_from", fromDate);
      if (toDate) params.append("date_to", toDate);
      params.append("page", currentPage.toString());
      params.append("page_size", pageSize.toString());
      
      if (params.toString()) {
        url += url.includes('?') ? `&${params.toString()}` : `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let contacts = [];
      if (response.data && response.data.data) {
        if (Array.isArray(response.data.data)) {
          contacts = response.data.data;
        } else if (response.data.data.results && Array.isArray(response.data.data.results)) {
          contacts = response.data.data.results;
        }
      } else if (Array.isArray(response.data)) {
        contacts = response.data;
      }
      setData(contacts);
      
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
      console.error("Error fetching contacts:", error);
      toast.error(error.response?.data?.message || "Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, sourceTypeFilter, companyFilter, stateFilter, cityFilter, fromDate, toDate, currentPage, pageSize]);
  
  // Debounce search query
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
  }, [debouncedSearchQuery, sourceTypeFilter, companyFilter, stateFilter, cityFilter, fromDate, toDate]);

  const fetchStats = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();
      
      if (!admin_id) {
        return;
      }

      const role = sessionStorage.getItem("role");
      const user_id = sessionStorage.getItem("user_id");
      
      const site_id = getSelectedSiteId();
      if (!site_id) {
        return; // Don't show error, just return silently
      }
      // Admin sees all stats, User sees only their own
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      let url = role === "user" && user_id
        ? `${BACKEND_PATH}contact/contact-stats-by-user/${site_id}/${user_id}/`
        : `${BACKEND_PATH}contact/contact-stats/${site_id}/`;
      
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data && response.data.data) {
        setStats(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      // Don't show toast for stats errors, just log
    }
  }, []); // Stats don't need to refetch on filter changes

  // Fetch contacts when dependencies change
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Fetch stats only once on mount and when site/admin changes
  useEffect(() => {
    const site_id = getSelectedSiteId();
    const admin_id = getAdminIdForApi();
    if (site_id && admin_id) {
      fetchStats();
    }
  }, []); // Only on mount - stats are independent of filters

  const routes = all_routes;

  const handleContactAdded = () => {
    fetchContacts();
    // Stats can be updated separately, no need to block
    fetchStats().catch(() => {}); // Fire and forget
  };

  const handleContactUpdated = () => {
    fetchContacts();
    fetchStats().catch(() => {}); // Fire and forget
  };

  const handleDelete = async () => {
    if (!contactIdToDelete) {
      toast.error("No contact selected for deletion");
      return;
    }

    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();
      const role = sessionStorage.getItem("role");
      const user_id = sessionStorage.getItem("user_id");

      if (!admin_id) {
        toast.error("Admin ID not found");
        return;
      }

      // For delete, we need both adminId and userId in URL
      // Get user_id from contact data if available, otherwise use current user_id or placeholder
      let deleteUserId = "";
      if (contactToDelete) {
        // Check various possible field names for user_id
        // The serializer returns 'user' as UUID string or object
        if (contactToDelete.user) {
          deleteUserId = typeof contactToDelete.user === 'string' 
            ? contactToDelete.user 
            : contactToDelete.user.id || contactToDelete.user;
        } else if (contactToDelete.user_id) {
          deleteUserId = contactToDelete.user_id;
        } else if (contactToDelete.assigned_user_id) {
          deleteUserId = contactToDelete.assigned_user_id;
        }
      }
      
      // If still empty, use current user_id if user role, otherwise use placeholder
      if (!deleteUserId) {
        if (role === "user" && user_id) {
          deleteUserId = user_id;
        } else {
          // For admin deleting contacts without user, use a placeholder UUID
          // Backend will handle the permission check based on logged-in user
          deleteUserId = "00000000-0000-0000-0000-000000000000";
        }
      }

      console.log("Deleting contact:", { admin_id, deleteUserId, contactIdToDelete, contactToDelete });

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      let url = `${BACKEND_PATH}contact/contact-detail-update-delete/${site_id}/${deleteUserId}/${contactIdToDelete}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }

      await axios.delete(
        url,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      toast.success("Contact deleted successfully");
      
      // Close modal first
      const modalElement = document.getElementById("deleteContactModal");
      if (modalElement) {
        // Check if Bootstrap is available
        if (typeof (window as any).bootstrap !== 'undefined') {
          const Modal = (window as any).bootstrap.Modal;
          const modalInstance = Modal.getInstance(modalElement);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
        // Manual cleanup
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
      
      // Clear the contact ID and contact object
      setContactIdToDelete(null);
      setContactToDelete(null);
      
      // Refresh data
      fetchContacts();
      fetchStats();
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete contact";
      toast.error(errorMessage);
      
      // Close modal even on error
      const modalElement = document.getElementById("deleteContactModal");
      if (modalElement) {
        if (typeof (window as any).bootstrap !== 'undefined') {
          const Modal = (window as any).bootstrap.Modal;
          const modalInstance = Modal.getInstance(modalElement);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        document.body.classList.remove('modal-open');
      }
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "full_name",
      render: (text: string, record: any) => (
        <h6 className="fw-medium">
          <Link to="#" data-bs-toggle="modal" data-bs-target="#contactDetailModal" onClick={() => setEditingContact(record)}>
            {text || "—"}
          </Link>
        </h6>
      ),
      sorter: (a: any, b: any) => (a.full_name ?? "").localeCompare(b.full_name ?? ""),
    },
    {
      title: "Company",
      dataIndex: "company_name",
      render: (text: string) => <span>{text || "—"}</span>,
      sorter: (a: any, b: any) => (a.company_name ?? "").localeCompare(b.company_name ?? ""),
    },
    {
      title: "Job Title",
      dataIndex: "job_title",
      render: (text: string) => <span>{text || "—"}</span>,
    },
    {
      title: "Email",
      dataIndex: "email_address",
      render: (text: string) => (
        text ? (
          <a href={`mailto:${text}`} className="text-primary">
            {text}
          </a>
        ) : (
          <span>—</span>
        )
      ),
    },
    {
      title: "Mobile",
      dataIndex: "mobile_number",
      render: (text: string) => (
        text ? (
          <a href={`tel:${text}`} className="text-primary">
            {text}
          </a>
        ) : (
          <span>—</span>
        )
      ),
    },
    {
      title: "Location",
      dataIndex: "city",
      render: (_: any, record: any) => (
        <span>
          {[record.city, record.state].filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    {
      title: "Source",
      dataIndex: "source_type",
      render: (source: string) => {
        const sourceColors: any = {
          scanned: "badge-success",
          manual: "badge-info",
        };
        const sourceLabels: any = {
          scanned: "Scanned",
          manual: "Manual",
        };
        return (
          <span className={`badge d-inline-flex align-items-center badge-sm ${sourceColors[source] || "badge-secondary"}`}>
            <i className="ti ti-point-filled me-1" />
            {sourceLabels[source] || source}
          </span>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "created_at",
      render: (date: string) => {
        if (!date) return "—";
        return new Date(date).toLocaleDateString();
      },
      sorter: (a: any, b: any) => 
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
    },
    {
      title: "Actions",
      dataIndex: "actions",
      render: (_: any, contact: any) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-bs-target="#contactModal"
            onClick={() => setEditingContact(contact)}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            onClick={(e) => {
              e.preventDefault();
              const contactId = normalizeContactId(getContactKey(contact));
              setContactIdToDelete(contactId);
              setContactToDelete(contact); // Store full contact object
              // Trigger modal manually after state update
              setTimeout(() => {
                const modalElement = document.getElementById("deleteContactModal");
                if (modalElement) {
                  if (typeof (window as any).bootstrap !== 'undefined') {
                    const Modal = (window as any).bootstrap.Modal;
                    let modalInstance = Modal.getInstance(modalElement);
                    if (!modalInstance) {
                      modalInstance = new Modal(modalElement);
                    }
                    modalInstance.show();
                  } else {
                    // Fallback: manually show modal
                    modalElement.classList.add('show');
                    modalElement.style.display = 'block';
                    document.body.classList.add('modal-open');
                    const backdrop = document.createElement('div');
                    backdrop.className = 'modal-backdrop fade show';
                    document.body.appendChild(backdrop);
                  }
                }
              }, 50);
            }}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        {/* Breadcrumb */}
        <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
          <div className="my-auto mb-2">
            <h2 className="mb-1">Contact Management</h2>
          </div>
          <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
            <div className="mb-2">
              <button
                className="btn btn-primary d-flex align-items-center"
                data-bs-toggle="modal"
                data-bs-target="#contactModal"
                onClick={() => setEditingContact(null)}
              >
                <i className="ti ti-circle-plus me-2" />
                Add Contact
              </button>
            </div>
            <div className="head-icons ms-2">
              <CollapseHeader />
            </div>
          </div>
        </div>
        {/* /Breadcrumb */}
        
        {/* Statistics Cards */}
        {stats && (
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="text-muted mb-2">Total Contacts</h6>
                  <h3 className="mb-0">{stats.total_contacts || 0}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="text-muted mb-2">Scanned</h6>
                  <h3 className="mb-0 text-success">{stats.scanned_contacts || 0}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="text-muted mb-2">Manual</h6>
                  <h3 className="mb-0 text-info">{stats.manual_contacts || 0}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="text-muted mb-2">Companies</h6>
                  <h3 className="mb-0">{stats.unique_companies || 0}</h3>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters Card */}
        <div className="card mb-3">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-3 col-lg-2">
                <label className="form-label small text-muted mb-1 fw-medium">Search</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="ti ti-search" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search contacts..."
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
                <label className="form-label small text-muted mb-1 fw-medium">Source</label>
                <select
                  className="form-select"
                  value={sourceTypeFilter}
                  onChange={(e) => setSourceTypeFilter(e.target.value)}
                >
                  <option value="">All Sources</option>
                  <option value="scanned">Scanned</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div className="col-md-2 col-lg-2">
                <label className="form-label small text-muted mb-1 fw-medium">Company</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Company name"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                />
              </div>
              <div className="col-md-2 col-lg-2">
                <label className="form-label small text-muted mb-1 fw-medium">State</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="State"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                />
              </div>
              <div className="col-md-2 col-lg-2">
                <label className="form-label small text-muted mb-1 fw-medium">City</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="City"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                />
              </div>
              <div className="col-md-3 col-lg-1">
                <label className="form-label small text-muted mb-1 fw-medium">From Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="col-md-3 col-lg-1">
                <label className="form-label small text-muted mb-1 fw-medium">To Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="card">
          <div className="card-header bg-white border-bottom">
            <h5 className="mb-0">Contact List</h5>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center p-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <>
                <Table
                  columns={columns}
                  dataSource={data}
                  Selection={true}
                />
                {pagination.total_items > 0 && (
                  <div className="d-flex align-items-center justify-content-between mt-3 pt-3 border-top">
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

        {/* Modals */}
        {getAdminIdForApi() && (
          <ContactModal
            onContactAdded={handleContactAdded}
            editingContact={editingContact}
            onContactUpdated={handleContactUpdated}
            onEditClose={() => setEditingContact(null)}
            adminId={getAdminIdForApi() || ""}
            userId={sessionStorage.getItem("user_id") || ""}
          />
        )}

        <DeleteModal
          contactId={contactIdToDelete}
          onDelete={handleDelete}
          onClose={() => {
            setContactIdToDelete(null);
            setContactToDelete(null);
          }}
        />

        <ContactDetailModal
          contact={editingContact}
          onClose={() => setEditingContact(null)}
        />

        <ToastContainer />
      </div>
    </div>
  );
};

export default Contacts;

