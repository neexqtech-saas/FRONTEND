import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { BACKEND_PATH } from "../../../environment";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAdminIdForApi, notifySiteChange } from "../../../core/utils/apiHelpers";

type PasswordField = "password";

const NewLogin = () => {
  const routes = all_routes;
  const navigation = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
  });

  // Redirect if already authenticated
  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    const role = sessionStorage.getItem("role");
    
    if (token && role) {
      // User is already logged in, redirect to appropriate dashboard
      if (role === "system_owner") {
        navigation(routes.systemOwnerOrganizations, { replace: true });
      } else if (role === "organization") {
        navigation(routes.organizationDashboard, { replace: true });
      } else {
        navigation(routes.adminDashboard, { replace: true });
      }
      return;
    }
    
    // Reset form when component mounts (after logout)
    setEmail("");
    setPassword("");
    setRememberMe(false);
    setLoading(false);
    setPasswordVisibility({ password: false });
  }, [navigation, routes]);

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_PATH}login`, {
        username: email,
        password,
      });
      // ✅ Destructure response
      const { access_token, refresh_token, user_id, role, organization_id, assigned_sites } = response.data;

      // Debug: Log response data
      console.log("Login response:", { access_token: !!access_token, user_id, role, organization_id, assigned_sites });

      // Allow admin, system_owner, and organization to login
      if (role !== "admin" && role !== "system_owner" && role !== "organization") {
        toast.error("Access denied. Valid privileges required.");
        setLoading(false);
        return;
      }

      // ✅ Store tokens and user data
      sessionStorage.setItem("access_token", access_token);
      sessionStorage.setItem("refresh_token", refresh_token);
      sessionStorage.setItem("user_id", user_id);
      sessionStorage.setItem("role", role);
      
      // ✅ Store organization_id if available (for admin role)
      if (organization_id) {
        sessionStorage.setItem("organization_id", organization_id);
        console.log("Stored organization_id:", organization_id);
      } else if (role === "admin") {
        console.warn("Warning: organization_id not found in login response for admin user");
      }
      
      // For organization role, user_id is the organization_id
      if (role === "organization" && user_id) {
        sessionStorage.setItem("organization_id", user_id);
      }
      
      // ✅ Store assigned sites if available (for employee/user role)
      if (assigned_sites && Array.isArray(assigned_sites)) {
        sessionStorage.setItem("assigned_sites", JSON.stringify(assigned_sites));
        console.log("Stored assigned_sites:", assigned_sites);
      }
      
      if (rememberMe) {
        localStorage.setItem("remember_device", "true");
      }
      
      toast.success("Login successful!");
      
      // For admin role: Fetch sites and auto-select first site before navigation
      if (role === "admin") {
        try {
          const admin_id = user_id; // For admin, user_id is the admin_id
          const token = access_token;
          
          // Fetch sites for admin
          // Admin role: backend gets admin_id from request.user
          const sitesResponse = await axios.get<{
            status: number;
            message: string;
            data: any[];
          }>(`${BACKEND_PATH}admin/sites/`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          // Auto-select first site if available and no site is already selected
          if (sitesResponse.data.status === 200 && sitesResponse.data.data && sitesResponse.data.data.length > 0) {
            const savedSiteId = sessionStorage.getItem("selected_site_id");
            
            // Only auto-select if no site is already selected
            if (!savedSiteId) {
              const firstSite = sitesResponse.data.data[0];
              // Store first site in sessionStorage
              notifySiteChange(String(firstSite.id), firstSite.site_name);
              console.log("Auto-selected first site:", firstSite.site_name);
            }
          }
        } catch (error: any) {
          console.error("Error fetching sites during login:", error);
          // Continue with navigation even if site fetch fails
        }
      }
      
      // Navigate based on role
      if (role === "system_owner") {
        navigation(routes.systemOwnerOrganizations);
      } else if (role === "organization") {
        navigation(routes.organizationDashboard);
      } else {
        // Admin goes directly to dashboard - site is already selected
        navigation(routes.adminDashboard);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Login failed");
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .static-ray {
          position: absolute;
          pointer-events: none;
          z-index: 0;
          opacity: 0.3;
        }
        .static-ray::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 107, 53, 0.6), transparent);
          filter: blur(10px);
        }
      `}</style>
      <div className="container-fuild" style={{ background: "#fff5f0", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        {/* Static Orange Rays */}
        {[
          { top: "10%", left: "5%", width: "300px", height: "2px", rotate: "45deg" },
          { top: "25%", left: "15%", width: "250px", height: "2px", rotate: "-45deg" },
          { top: "40%", left: "8%", width: "280px", height: "2px", rotate: "30deg" },
          { top: "55%", left: "20%", width: "320px", height: "2px", rotate: "-30deg" },
          { top: "70%", left: "10%", width: "270px", height: "2px", rotate: "60deg" },
          { top: "85%", left: "18%", width: "290px", height: "2px", rotate: "-60deg" },
          { top: "15%", right: "10%", width: "260px", height: "2px", rotate: "135deg" },
          { top: "35%", right: "15%", width: "310px", height: "2px", rotate: "-135deg" },
          { top: "50%", right: "8%", width: "240px", height: "2px", rotate: "120deg" },
          { top: "65%", right: "12%", width: "300px", height: "2px", rotate: "-120deg" },
          { top: "80%", right: "5%", width: "280px", height: "2px", rotate: "150deg" }
        ].map((ray, i) => (
          <div
            key={i}
            className="static-ray"
            style={{
              top: ray.top,
              left: ray.left,
              right: ray.right,
              width: ray.width,
              height: ray.height,
              transform: `rotate(${ray.rotate})`,
              background: `linear-gradient(90deg, transparent, rgba(255, 107, 53, 0.5), transparent)`
            }}
          />
        ))}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />
        <div className="w-100 overflow-hidden position-relative flex-wrap d-block vh-100" style={{ zIndex: 1 }}>
        <div className="row justify-content-center align-items-center vh-100 overflow-auto flex-wrap">
          <div className="col-md-3 mx-auto">
            <div className="card shadow-lg border-0" style={{ borderRadius: "12px", overflow: "hidden" }}>
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="mb-4 text-center">
                    <div style={{ maxWidth: "150px", maxHeight: "50px", display: "inline-block" }}>
                      <ImageWithBasePath src="assets/img/logo/logo4.png" className="img-fluid mb-4" alt="Logo" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="mb-3">
                      <label className="form-label" style={{ color: "#333", fontWeight: "500" }}>Username</label>
                      <div className="input-group">
                        <input
                          type="text"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="form-control border-end-0"
                          required
                          style={{ 
                            background: "#f8f9fa",
                            borderColor: "#e0e0e0",
                            borderRadius: "8px 0 0 8px"
                          }}
                        />
                        <span className="input-group-text border-start-0" style={{ 
                          background: "#f8f9fa",
                          borderColor: "#e0e0e0",
                          borderRadius: "0 8px 8px 0"
                        }}>
                          <i className="ti ti-user" />
                        </span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label" style={{ color: "#333", fontWeight: "500" }}>Password</label>
                      <div className="pass-group">
                        <input
                          type={
                            passwordVisibility.password
                              ? "text"
                              : "password"
                          }
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pass-input form-control"
                          required
                          style={{ 
                            background: "#f8f9fa",
                            borderColor: "#e0e0e0",
                            borderRadius: "8px"
                          }}
                        />
                        <span
                          className={`ti toggle-passwords ${passwordVisibility.password
                            ? "ti-eye"
                            : "ti-eye-off"
                            }`}
                          onClick={() =>
                            togglePasswordVisibility("password")
                          }
                          style={{ cursor: "pointer", color: "#666" }}
                        ></span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={loading || !email || !password}
                        style={{ 
                          borderRadius: "8px",
                          padding: "12px",
                          fontWeight: "600",
                          background: (!email || !password) ? "#ccc" : undefined,
                          border: (!email || !password) ? "none" : undefined
                        }}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Signing In...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 text-center border-top">
                    <p className="mb-0 text-gray-9" style={{ fontSize: "13px", color: "#999" }}>Copyright © 2025 - NeexQ</p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default NewLogin;
