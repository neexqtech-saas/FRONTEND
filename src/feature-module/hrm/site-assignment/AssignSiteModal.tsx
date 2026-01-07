import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { removeAllBackdrops, resetBodyStyles, openModal, closeModal } from "../../../core/utils/modalHelpers";
import { getAdminIdForApi, getSelectedSiteId, BACKEND_PATH } from "../../../core/utils/apiHelpers";

interface AssignSiteModalProps {
  employee: any;
  onSiteAssigned?: (result: any) => void;
  onClose?: () => void;
}

const AssignSiteModal: React.FC<AssignSiteModalProps> = ({
  employee,
  onSiteAssigned,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [assignmentReason, setAssignmentReason] = useState<string>("");
  const [currentAssignment, setCurrentAssignment] = useState<any>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);

  // Handle different employee object structures
  const currentEmployee = employee?.user || employee;
  
  // Get employee ID from various possible locations
  const getEmployeeId = (): string | null => {
    if (!employee && !currentEmployee) {
      console.error("No employee object provided");
      return null;
    }
    
    // Try all possible locations for employee ID
    // Priority: employee.user.id > employee.user_id > employee.id > currentEmployee.id > currentEmployee.user_id
    const id = employee?.user?.id || 
               employee?.user_id || 
               employee?.id ||
               currentEmployee?.id || 
               currentEmployee?.user_id || 
               currentEmployee?.user?.id ||
               null;
    
    if (!id) {
      console.error("Employee ID not found. Employee object structure:", {
        employee,
        currentEmployee,
        'employee?.user?.id': employee?.user?.id,
        'employee?.user_id': employee?.user_id,
        'employee?.id': employee?.id,
        'currentEmployee?.id': currentEmployee?.id,
        'currentEmployee?.user_id': currentEmployee?.user_id,
      });
    }
    
    return id;
  };

  useEffect(() => {
    if (currentEmployee) {
      fetchSites();
      fetchCurrentAssignment();
    }
  }, [currentEmployee]);

  // Reset selectedSite when assignment changes - don't auto-select current site
  useEffect(() => {
    if (currentAssignment && currentAssignment.site) {
      // If there's a current site, reset selection so user must choose a different one
      setSelectedSite("");
    } else if (currentAssignment === null) {
      // Explicitly set to empty if no assignment
      setSelectedSite("");
    }
  }, [currentAssignment]);

  // Cleanup modal backdrops when modal opens/closes
  useEffect(() => {
    const modalElement = document.getElementById('assign_site_modal');
    if (!modalElement) return;

    const handleModalShow = () => {
      setTimeout(() => {
        removeAllBackdrops();
      }, 50);
      
      if (currentEmployee) {
        fetchSites();
        fetchCurrentAssignment();
      }
    };

    const handleModalHide = () => {
      setTimeout(() => {
        removeAllBackdrops();
        resetBodyStyles();
        // Re-enable touch events and remove modal-open class
        document.body.style.touchAction = '';
        document.body.style.pointerEvents = '';
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }, 150);
    };

    modalElement.addEventListener('shown.bs.modal', handleModalShow);
    modalElement.addEventListener('hidden.bs.modal', handleModalHide);

    return () => {
      modalElement.removeEventListener('shown.bs.modal', handleModalShow);
      modalElement.removeEventListener('hidden.bs.modal', handleModalHide);
    };
  }, [currentEmployee]);

  const fetchSites = async () => {
    setLoadingSites(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id) {
        setLoadingSites(false);
        return;
      }

      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}sites/${admin_id}/`;
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let sitesData = [];
      if (response.data && response.data.data) {
        if (Array.isArray(response.data.data)) {
          sitesData = response.data.data;
        } else if (response.data.data.results && Array.isArray(response.data.data.results)) {
          sitesData = response.data.data.results;
        }
      } else if (Array.isArray(response.data)) {
        sitesData = response.data;
      }

      // Filter only active sites
      sitesData = sitesData.filter((site: any) => site.is_active !== false);
      
      // Exclude current selected site from dropdown
      // User can only choose from other sites, not the currently selected one
      const currentSelectedSiteId = getSelectedSiteId();
      if (currentSelectedSiteId) {
        sitesData = sitesData.filter((site: any) => site.id !== currentSelectedSiteId);
      }
      
      setSites(sitesData);
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      toast.error("Failed to fetch sites");
    } finally {
      setLoadingSites(false);
    }
  };

  const fetchCurrentAssignment = async () => {
    if (!currentEmployee) return;
    
    setLoadingAssignment(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();
      const employee_id = getEmployeeId();

      if (!admin_id || !employee_id) {
        setLoadingAssignment(false);
        return;
      }

      const url = `${BACKEND_PATH}employee-assignments/${admin_id}/${employee_id}/`;
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let assignments = [];
      if (response.data && response.data.data) {
        if (Array.isArray(response.data.data)) {
          assignments = response.data.data;
        }
      }

      // Find active assignment
      const activeAssignment = assignments.find((a: any) => a.is_active === true);
      if (activeAssignment && activeAssignment.site) {
        setCurrentAssignment(activeAssignment);
        // Don't auto-select current site - user must choose a different one
        setSelectedSite("");
      } else {
        // No active assignment found or no site in assignment
        setCurrentAssignment(null);
        setSelectedSite("");
      }
    } catch (error: any) {
      console.error("Error fetching current assignment:", error);
    } finally {
      setLoadingAssignment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSite) {
      toast.error("Please select a site");
      return;
    }

    if (!currentEmployee) {
      toast.error("Employee information not available");
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();
      const employee_id = getEmployeeId();

      if (!admin_id) {
        toast.error("Admin ID not found");
        setLoading(false);
        return;
      }

      if (!employee_id) {
        console.error("Employee ID extraction failed. Full employee object:", JSON.stringify(employee, null, 2));
        toast.error("Employee ID not found. Please try again.");
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      const payload: any = {
        admin: admin_id,
        site: selectedSite,
        start_date: today,
        is_active: true,
      };

      if (assignmentReason.trim()) {
        payload.assignment_reason = assignmentReason.trim();
      }

      // ALWAYS create a new assignment entry (POST)
      // Backend will automatically close the old assignment and create a new one
      // This ensures multiple entries are created for history tracking
      const url = `${BACKEND_PATH}employee-assignments/${admin_id}/${employee_id}/`;
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.status) {
        toast.success(response.data.message || "Site assigned successfully!");
        if (onSiteAssigned) {
          onSiteAssigned(response.data);
        }
        closeModal('assign_site_modal');
        if (onClose) {
          onClose();
        }
      } else {
        toast.error("Failed to assign site");
      }
    } catch (error: any) {
      console.error("Error assigning site:", error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.site?.[0] ||
                          "Failed to assign site";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Cleanup before closing
    removeAllBackdrops();
    resetBodyStyles();
    
    closeModal('assign_site_modal');
    
    // Additional cleanup after a short delay
    setTimeout(() => {
      removeAllBackdrops();
      resetBodyStyles();
      // Re-enable touch events
      document.body.style.touchAction = '';
      document.body.style.pointerEvents = '';
      document.body.classList.remove('modal-open');
    }, 150);
    
    if (onClose) {
      onClose();
    }
  };

  if (!currentEmployee) {
    return null;
  }

  return (
    <div
      className="modal fade"
      id="assign_site_modal"
      tabIndex={-1}
      aria-labelledby="assignSiteModalLabel"
      aria-hidden="true"
      data-bs-backdrop="static"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="assignSiteModalLabel">
              Assign Site - {currentEmployee.user_name || currentEmployee.email}
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={handleClose}
            ></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {loadingAssignment ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <label htmlFor="siteSelect" className="form-label">
                      Select Site to Assign <span className="text-danger">*</span>
                    </label>
                    {loadingSites ? (
                      <div className="text-center py-2">
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    ) : (
                      <select
                        id="siteSelect"
                        className="form-select"
                        value={selectedSite}
                        onChange={(e) => setSelectedSite(e.target.value)}
                        required
                      >
                        <option value="">-- Select Site --</option>
                        {sites.map((site: any) => (
                          <option key={site.id} value={site.id}>
                            {site.site_name}
                          </option>
                        ))}
                      </select>
                    )}
                    {sites.length === 0 && !loadingSites && (
                      <div className="text-danger small mt-1">
                        No sites available. Please create a site first.
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="assignmentReason" className="form-label">
                      Assignment Reason (Optional)
                    </label>
                    <textarea
                      id="assignmentReason"
                      className="form-control"
                      rows={3}
                      value={assignmentReason}
                      onChange={(e) => setAssignmentReason(e.target.value)}
                      placeholder="Enter reason for this assignment..."
                    />
                  </div>

                  {currentAssignment && selectedSite && 
                   (currentAssignment.site?.id !== selectedSite && currentAssignment.site_id !== selectedSite) && (
                    <div className="alert alert-warning">
                      <small>
                        <i className="ti ti-alert-triangle me-1"></i>
                        <strong>Note:</strong> Assigning a new site will automatically deactivate the current site assignment. 
                        Only one site can be active at a time.
                      </small>
                    </div>
                  )}
                  
                  {!currentAssignment && (
                    <div className="alert alert-info">
                      <small>
                        <i className="ti ti-info-circle me-1"></i>
                        <strong>Note:</strong> Only one site can be active at a time for an employee.
                      </small>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || loadingSites || !selectedSite}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Assigning...
                  </>
                ) : currentAssignment ? (
                  "Update Assignment"
                ) : (
                  "Assign Site"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignSiteModal;

