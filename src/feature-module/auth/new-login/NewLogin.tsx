import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { BACKEND_PATH } from "../../../environment";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
      } else if (role === "organization" && user_id) {
        sessionStorage.setItem("organization_id", user_id);
      }
      
      // ✅ Store assigned sites if available (for employee/user role)
      if (assigned_sites && Array.isArray(assigned_sites)) {
        sessionStorage.setItem("assigned_sites", JSON.stringify(assigned_sites));
      }
      
      if (rememberMe) {
        localStorage.setItem("remember_device", "true");
      }
      
      toast.success("Login successful!");
      
      // Navigate based on role
      if (role === "system_owner") {
        navigation(routes.systemOwnerOrganizations);
      } else if (role === "organization") {
        navigation(routes.organizationDashboard);
      } else {
        navigation(routes.adminDashboard);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="container-fuild" style={{ background: "#fff5f0", minHeight: "100vh" }}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      <div className="w-100 overflow-hidden position-relative flex-wrap d-block vh-100">
        <div className="row justify-content-center align-items-center vh-100 overflow-auto flex-wrap">
          <div className="col-md-3 mx-auto">
            <div className="card shadow-lg border-0" style={{ borderRadius: "12px", overflow: "hidden" }}>
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="mb-4 text-center">
                    <div style={{ maxHeight: "50px", display: "inline-block" }}>
                      <ImageWithBasePath src="assets/img/logo.svg" className="img-fluid mb-4" alt="Logo" />
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
  );
};

export default NewLogin;
