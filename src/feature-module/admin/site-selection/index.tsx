import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import { BACKEND_PATH } from "../../../environment";
import axios from "axios";
import { toast } from "react-toastify";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { getAdminIdForApi, notifySiteChange } from "../../../core/utils/apiHelpers";

interface Site {
  id: number;
  site_name: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  organization_name?: string;
  admin_name?: string;
  is_active: boolean;
}

const SiteSelection: React.FC = () => {
  const navigate = useNavigate();
  const routes = all_routes;
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);

  useEffect(() => {
    fetchSites();
    
    // Check if site already selected
    const savedSiteId = sessionStorage.getItem("selected_site_id");
    if (savedSiteId) {
      setSelectedSite(parseInt(savedSiteId));
    }
  }, []);

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("access_token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const fetchSites = async () => {
    try {
      setLoading(true);
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        console.error("Admin ID not found");
        toast.error("Admin ID not found. Please login again.");
        setLoading(false);
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}admin/sites/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      const response = await axios.get<{
        status: number;
        message: string;
        data: Site[];
      }>(url, getAuthHeaders());

      if (response.data.status === 200 && response.data.data) {
        setSites(response.data.data);
        
        // Check if site already selected
        const savedSiteId = sessionStorage.getItem("selected_site_id");
        if (savedSiteId) {
          const siteExists = response.data.data.some(s => s.id === parseInt(savedSiteId));
          if (siteExists) {
            // Site already selected, navigate to dashboard
            setTimeout(() => {
              navigate(routes.adminDashboard);
            }, 100);
            return;
          }
        }
        
        // Auto-select first site if available (for first time login)
        if (response.data.data.length > 0) {
          handleSiteSelect(response.data.data[0].id);
        }
      } else {
        toast.error("No sites found. Please contact your administrator.");
      }
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      toast.error(error.response?.data?.message || "Failed to fetch sites");
    } finally {
      setLoading(false);
    }
  };

  const handleSiteSelect = async (siteId: number) => {
    try {
      setSelectedSite(siteId);
      
      // Get site details
      const site = sites.find(s => s.id === siteId);
      if (site) {
        // Use notifySiteChange to update sessionStorage and dispatch event
        notifySiteChange(siteId.toString(), site.site_name);
        toast.success(`Site "${site.site_name}" selected successfully!`);
      }
      
      // Navigate to dashboard
      setTimeout(() => {
        navigate(routes.adminDashboard);
      }, 100);
    } catch (error: any) {
      console.error("Error selecting site:", error);
      toast.error("Failed to select site");
    }
  };

  const handleContinue = () => {
    if (!selectedSite) {
      toast.error("Please select a site to continue");
      return;
    }
    handleSiteSelect(selectedSite);
  };

  if (loading) {
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#fff5f0" }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading sites...</p>
        </div>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#fff5f0" }}>
        <div className="text-center p-5 bg-white rounded shadow" style={{ maxWidth: "500px" }}>
          <h3 className="mb-3">No Sites Available</h3>
          <p className="text-muted mb-4">You don't have access to any sites. Please contact your administrator.</p>
          <button 
            className="btn btn-primary"
            onClick={() => {
              sessionStorage.clear();
              navigate(routes.login);
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid" style={{ background: "#fff5f0", minHeight: "100vh", padding: "40px 20px" }}>
      <div className="row justify-content-center">
        <div className="col-lg-8 col-xl-6">
          <div className="card shadow-lg border-0" style={{ borderRadius: "15px" }}>
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <h2 className="mb-2" style={{ color: "#333", fontWeight: "600" }}>
                  Select Your Site
                </h2>
                <p className="text-muted">
                  Choose a site to view employees and manage operations
                </p>
              </div>

              <div className="mb-4">
                {sites.map((site) => (
                  <div
                    key={site.id}
                    className={`card mb-3 cursor-pointer transition-all ${
                      selectedSite === site.id
                        ? "border-primary shadow-sm"
                        : "border-light"
                    }`}
                    style={{
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      border: selectedSite === site.id ? "2px solid #007bff" : "1px solid #e0e0e0",
                    }}
                    onClick={() => setSelectedSite(site.id)}
                    onMouseEnter={(e) => {
                      if (selectedSite !== site.id) {
                        e.currentTarget.style.borderColor = "#007bff";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedSite !== site.id) {
                        e.currentTarget.style.borderColor = "#e0e0e0";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    <div className="card-body p-4">
                      <div className="d-flex align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            <h5 className="mb-0 me-2" style={{ fontWeight: "600", color: "#333" }}>
                              {site.site_name}
                            </h5>
                            {selectedSite === site.id && (
                              <span className="badge bg-primary">Selected</span>
                            )}
                          </div>
                          <div className="text-muted small">
                            <div className="mb-1">
                              <i className="feather-map-pin me-1"></i>
                              {site.address}
                            </div>
                            <div>
                              <i className="feather-map me-1"></i>
                              {site.city}, {site.state}
                              {site.pincode && ` - ${site.pincode}`}
                            </div>
                          </div>
                        </div>
                        <div>
                          {selectedSite === site.id ? (
                            <div className="text-primary">
                              <i className="feather-check-circle" style={{ fontSize: "24px" }}></i>
                            </div>
                          ) : (
                            <div className="text-muted">
                              <i className="feather-circle" style={{ fontSize: "24px" }}></i>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-grid gap-2">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleContinue}
                  disabled={!selectedSite}
                  style={{
                    borderRadius: "10px",
                    padding: "12px",
                    fontWeight: "500",
                  }}
                >
                  Continue to Dashboard
                  <i className="feather-arrow-right ms-2"></i>
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    sessionStorage.clear();
                    navigate(routes.login);
                  }}
                  style={{ borderRadius: "10px" }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteSelection;

