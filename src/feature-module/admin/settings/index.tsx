import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BACKEND_PATH } from "../../../environment";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { all_routes } from "../../router/all_routes";
import { getAuthHeaders, getAdminIdForApi } from "../../../core/utils/apiHelpers";

interface Site {
  id: number;
  site_name: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  contact_person?: string;
  contact_number?: string;
  description?: string;
  is_active: boolean;
  organization_name?: string;
  admin_name?: string;
  created_at: string;
  updated_at: string;
}

const AdminSettings: React.FC = () => {
  const routes = all_routes;
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    site_name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    contact_person: "",
    contact_number: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    fetchSites();
  }, []);

  // Manage body scroll when modal is open/closed
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        console.error("Admin ID not found");
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
      }
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      toast.error(error.response?.data?.message || "Failed to fetch sites");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggleActive = (site: Site) => {
    setFormData({
      site_name: site.site_name,
      address: site.address,
      city: site.city,
      state: site.state,
      pincode: site.pincode || "",
      contact_person: site.contact_person || "",
      contact_number: site.contact_number || "",
      description: site.description || "",
      is_active: !site.is_active,
    });
    setEditingSite(site);
    handleSave();
  };

  const handleEdit = (site: Site) => {
    setEditingSite(site);
    setFormData({
      site_name: site.site_name,
      address: site.address,
      city: site.city,
      state: site.state,
      pincode: site.pincode || "",
      contact_person: site.contact_person || "",
      contact_number: site.contact_number || "",
      description: site.description || "",
      is_active: site.is_active,
    });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingSite(null);
    setFormData({
      site_name: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      contact_person: "",
      contact_number: "",
      description: "",
      is_active: true,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSite(null);
    setFormData({
      site_name: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      contact_person: "",
      contact_number: "",
      description: "",
      is_active: true,
    });
  };

  const handleSave = async () => {
    if (!formData.site_name || !formData.address || !formData.city || !formData.state) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const adminId = sessionStorage.getItem("user_id");
      if (!adminId) {
        toast.error("Admin ID not found");
        return;
      }

      if (editingSite) {
        // Update existing site
        const response = await axios.put(
          `${BACKEND_PATH}sites/${adminId}/${editingSite.id}/`,
          formData,
          getAuthHeaders()
        );

        if (response.data.status === 200) {
          toast.success("Site updated successfully");
          fetchSites();
          handleCloseModal();
        }
      } else {
        // Create new site
        const response = await axios.post(
          `${BACKEND_PATH}sites/${adminId}/`,
          formData,
          getAuthHeaders()
        );

        if (response.data.status === 201 || response.data.status === 200) {
          toast.success("Site created successfully");
          fetchSites();
          handleCloseModal();
        }
      }
    } catch (error: any) {
      console.error("Error saving site:", error);
      toast.error(
        error.response?.data?.message || "Failed to save site"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (siteId: number) => {
    if (!window.confirm("Are you sure you want to delete this site?")) {
      return;
    }

    try {
      const adminId = sessionStorage.getItem("user_id");
      if (!adminId) {
        toast.error("Admin ID not found");
        return;
      }

      const response = await axios.delete(
        `${BACKEND_PATH}sites/${adminId}/${siteId}/`,
        getAuthHeaders()
      );

      if (response.data.status === 200) {
        toast.success("Site deleted successfully");
        fetchSites();
      }
    } catch (error: any) {
      console.error("Error deleting site:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete site"
      );
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Site Management</h2>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard} className="text-decoration-none">
                      <i className="ti ti-smart-home me-1" />
                      Home
                    </Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Site Settings
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
              <button
                className="btn btn-primary d-flex align-items-center"
                onClick={handleAdd}
              >
                <i className="ti ti-circle-plus me-2" />
                Add Site
              </button>
              <div className="head-icons">
                <CollapseHeader />
              </div>
            </div>
          </div>

          {/* Sites List */}
          <div className="card">
            <div className="card-body">
              {loading ? (
                <div className="text-center p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : sites.length === 0 ? (
                <div className="text-center p-5">
                  <i className="feather-map-pin" style={{ fontSize: "64px", color: "#ccc" }}></i>
                  <h5 className="mt-3 text-muted">No Sites Found</h5>
                  <p className="text-muted">Create your first site to get started</p>
                  <button className="btn btn-primary mt-2" onClick={handleAdd}>
                    <i className="ti ti-circle-plus me-2" />
                    Add Site
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Site Name</th>
                        <th>Address</th>
                        <th>City</th>
                        <th>State</th>
                        <th>Contact Person</th>
                        <th>Contact Number</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sites.map((site) => (
                        <tr key={site.id}>
                          <td>
                            <strong>{site.site_name}</strong>
                          </td>
                          <td>{site.address}</td>
                          <td>{site.city}</td>
                          <td>{site.state}</td>
                          <td>{site.contact_person || "-"}</td>
                          <td>{site.contact_number || "-"}</td>
                          <td>
                            <span
                              className={`badge ${
                                site.is_active ? "bg-success" : "bg-secondary"
                              }`}
                            >
                              {site.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEdit(site)}
                                title="Edit"
                              >
                                <i className="ti ti-edit"></i>
                              </button>
                              <button
                                className={`btn btn-sm ${
                                  site.is_active
                                    ? "btn-outline-secondary"
                                    : "btn-outline-success"
                                }`}
                                onClick={() => handleToggleActive(site)}
                                title={site.is_active ? "Deactivate" : "Activate"}
                              >
                                <i
                                  className={`ti ti-${
                                    site.is_active ? "ban" : "check"
                                  }`}
                                ></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(site.id)}
                                title="Delete"
                              >
                                <i className="ti ti-trash"></i>
                              </button>
                            </div>
                          </td>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: "block", zIndex: 1050 }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseModal();
              }
            }}
          >
            <div 
              className="modal-dialog modal-lg modal-dialog-centered"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingSite ? "Edit Site" : "Add New Site"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCloseModal}
                    aria-label="Close"
                  ></button>
                </div>
              <div className="modal-body">
                <form>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Site Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="site_name"
                        value={formData.site_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        City <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        State <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Pincode</label>
                      <input
                        type="text"
                        className="form-control"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Address <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      name="address"
                      rows={3}
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Contact Person</label>
                      <input
                        type="text"
                        className="form-control"
                        name="contact_person"
                        value={formData.contact_person}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Contact Number</label>
                      <input
                        type="text"
                        className="form-control"
                        name="contact_number"
                        value={formData.contact_number}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="mb-3">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({ ...formData, is_active: e.target.checked })
                        }
                      />
                      <label className="form-check-label">Active</label>
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      ></span>
                      Saving...
                    </>
                  ) : editingSite ? (
                    "Update Site"
                  ) : (
                    "Create Site"
                  )}
                </button>
              </div>
            </div>
          </div>
          </div>
          <div 
            className="modal-backdrop fade show"
            onClick={handleCloseModal}
            style={{ zIndex: 1040 }}
          ></div>
        </>
      )}
    </>
  );
};

export default AdminSettings;

