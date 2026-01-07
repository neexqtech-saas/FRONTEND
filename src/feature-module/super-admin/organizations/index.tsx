import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BACKEND_PATH } from "../../../environment";
import { Table } from "antd";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import MenuItemsManager from "./components/MenuItemsManager";

interface OrganizationSettings {
  id?: number;
  organization?: string;
  organization_logo?: string;
  organization_logo_url?: string | null;
  face_recognition_enabled?: boolean;
  auto_checkout_enabled?: boolean;
  auto_checkout_time?: string | null;
  auto_shiftwise_checkout_enabled?: boolean;
  auto_shiftwise_checkout_in_minutes?: number;
  late_punch_enabled?: boolean;
  late_punch_grace_minutes?: number | null;
  early_exit_enabled?: boolean;
  early_exit_grace_minutes?: number | null;
  auto_shift_assignment_enabled?: boolean;
  compensatory_off_enabled?: boolean;
  custom_week_off_enabled?: boolean;
  location_tracking_enabled?: boolean;
  manual_attendance_enabled?: boolean;
  group_location_tracking_enabled?: boolean;
  location_marking_enabled?: boolean;
  sandwich_leave_enabled?: boolean;
  leave_carry_forward_enabled?: boolean;
  min_hours_for_half_day?: number | null;
  multiple_shift_enabled?: boolean;
  email_notifications_enabled?: boolean;
  sms_notifications_enabled?: boolean;
  push_notifications_enabled?: boolean;
  ip_restriction_enabled?: boolean;
  allowed_ip_ranges?: string | null;
  geofencing_enabled?: boolean;
  geofence_radius_in_meters?: number | null;
  device_binding_enabled?: boolean;
  plan_name?: string | null;
  plan_assigned_date?: string | null;
  plan_expiry_date?: string | null;
  leave_year_type?: string;
  leave_year_start_month?: number;
  enabled_menu_items?: Record<string, boolean>;
  created_at?: string;
  updated_at?: string;
  site_names?: string[];
}

interface Organization {
  id: string;
  organization_name: string;
  user: {
    id: string;
    email: string;
    username: string;
    phone_number: string;
    is_active: boolean;
  };
  created_at: string;
  is_user_active: boolean;
  organization_settings?: OrganizationSettings;
  organization_logo?: string;
}

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

const SystemOwnerOrganizations = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "settings">("basic");
  const [editForm, setEditForm] = useState({
    organization_name: "",
    email: "",
    username: "",
    phone_number: "",
    is_active: true,
  });
  const [settingsForm, setSettingsForm] = useState<OrganizationSettings>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [addForm, setAddForm] = useState({
    email: "",
    username: "",
    password: "",
    phone_number: "",
    organization_name: "",
    state: "",
    city: "",
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) {
        toast.error("Please login again");
        navigate("/login");
        return;
      }

      const response = await axios.get(`${BACKEND_PATH}organizations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle response format: { status: 200, data: [...] }
      const organizationsData = Array.isArray(response.data?.data) 
        ? response.data.data 
        : (Array.isArray(response.data) ? response.data : []);
      
      setOrganizations(organizationsData);
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching organizations:", error);
      toast.error(error.response?.data?.error || "Failed to fetch organizations");
      setLoading(false);
    }
  };

  const handleEdit = (organization: Organization) => {
    setEditingOrg(organization);
    setEditForm({
      organization_name: organization.organization_name,
      email: organization.user.email,
      username: organization.user.username,
      phone_number: organization.user.phone_number,
      is_active: organization.is_user_active,
    });
    
    // Initialize settings form with existing settings or defaults
    const defaultSettings: OrganizationSettings = {
      face_recognition_enabled: false,
      auto_checkout_enabled: false,
      auto_shiftwise_checkout_enabled: false,
      auto_shiftwise_checkout_in_minutes: 30,
      late_punch_enabled: false,
      early_exit_enabled: false,
      auto_shift_assignment_enabled: false,
      compensatory_off_enabled: false,
      custom_week_off_enabled: false,
      location_tracking_enabled: false,
      manual_attendance_enabled: false,
      group_location_tracking_enabled: false,
      location_marking_enabled: false,
      sandwich_leave_enabled: false,
      leave_carry_forward_enabled: false,
      multiple_shift_enabled: false,
      email_notifications_enabled: false,
      sms_notifications_enabled: false,
      push_notifications_enabled: false,
      ip_restriction_enabled: false,
      geofencing_enabled: false,
      device_binding_enabled: false,
    };
    
    const orgSettings = organization.organization_settings || defaultSettings;
    // Ensure enabled_menu_items is initialized
    if (!orgSettings.enabled_menu_items) {
      orgSettings.enabled_menu_items = {};
    }
    // Filter out removed module fields if they exist in the response
    const {
      expense_module_enabled,
      chat_module_enabled,
      meeting_module_enabled,
      payroll_module_enabled,
      business_intelligence_reports_enabled,
      ...filteredSettings
    } = orgSettings as any;
    setSettingsForm(filteredSettings as OrganizationSettings);
    
    // Set logo preview if logo exists (from GET API response)
    if (organization.organization_logo) {
      setLogoPreview(organization.organization_logo);
    } else if (organization.organization_settings?.organization_logo) {
      const logoPath = organization.organization_settings.organization_logo;
      // Check if it's a full URL or relative path
      if (logoPath.startsWith('http')) {
        setLogoPreview(logoPath);
      } else {
        setLogoPreview(`http://127.0.0.1:8000/media/${logoPath}`);
      }
    } else {
      setLogoPreview(null);
    }
    setLogoFile(null);
    setActiveTab("basic");
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingOrg(null);
    setActiveTab("basic");
    setEditForm({
      organization_name: "",
      email: "",
      username: "",
      phone_number: "",
      is_active: true,
    });
    setSettingsForm({});
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleUpdate = async (orgId: string, data: any) => {
    setIsUpdating(true);
    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) {
        toast.error("Please login again");
        setIsUpdating(false);
        return;
      }

      await axios.put(
        `${BACKEND_PATH}organizations/${orgId}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Organization updated successfully");
      fetchOrganizations();
      handleCloseEditModal();
    } catch (error: any) {
      console.error("Error updating organization:", error);
      toast.error(error.response?.data?.error || "Failed to update organization");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.");
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error("File size exceeds 5MB limit.");
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async (orgId: string) => {
    if (!logoFile) {
      toast.error("Please select a logo file");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) {
        toast.error("Please login again");
        navigate("/login");
        return;
      }

      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await axios.post(
        `${BACKEND_PATH}organizations/${orgId}/upload-logo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      toast.success("Logo uploaded successfully");
      
      // Update settings form with new logo path
      setSettingsForm({
        ...settingsForm,
        organization_logo: response.data.logo_path,
      });
      
      // Update logo preview URL
      if (response.data.logo_url) {
        setLogoPreview(response.data.logo_url);
      } else {
        setLogoPreview(`http://127.0.0.1:8000/media/${response.data.logo_path}`);
      }
      
      // Refresh organizations list
      fetchOrganizations();
      
      // Clear file input
      setLogoFile(null);
      
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(error.response?.data?.error || "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleAddOrganization = async () => {
    // Validate form
    if (!addForm.email || !addForm.username || !addForm.password || !addForm.phone_number || !addForm.organization_name || !addForm.state || !addForm.city) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) {
        toast.error("Please login again");
        setIsCreating(false);
        return;
      }

      const response = await axios.post(
        `${BACKEND_PATH}register/organization`,
        {
          user: {
            email: addForm.email,
            username: addForm.username,
            password: addForm.password,
            role: "organization",
            phone_number: addForm.phone_number,
          },
          organization_name: addForm.organization_name,
          state: addForm.state,
          city: addForm.city,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Organization created successfully");
      setShowAddModal(false);
      setAddForm({
        email: "",
        username: "",
        password: "",
        phone_number: "",
        organization_name: "",
        state: "",
        city: "",
      });
      fetchOrganizations();
    } catch (error: any) {
      console.error("Error creating organization:", error);
      let errorMessage = "Failed to create organization";
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle errors object structure: { status: 400, message: "...", errors: { phone_number: [...] } }
        if (errorData.errors && typeof errorData.errors === 'object') {
          const errorsList: string[] = [];
          
          // Check for nested user errors
          if (errorData.errors.user) {
            const userErrors = errorData.errors.user;
            Object.keys(userErrors).forEach((key) => {
              const fieldErrors = userErrors[key];
              const fieldLabel = key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
              if (Array.isArray(fieldErrors)) {
                fieldErrors.forEach((err: string) => {
                  errorsList.push(`${fieldLabel}: ${err}`);
                });
              } else if (typeof fieldErrors === 'string') {
                errorsList.push(`${fieldLabel}: ${fieldErrors}`);
              }
            });
          }
          
          // Check for direct field errors in errors object
          Object.keys(errorData.errors).forEach((key) => {
            if (key !== 'user') {
              const fieldErrors = errorData.errors[key];
              const fieldLabel = key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
              if (Array.isArray(fieldErrors)) {
                fieldErrors.forEach((err: string) => {
                  errorsList.push(`${fieldLabel}: ${err}`);
                });
              } else if (typeof fieldErrors === 'string') {
                errorsList.push(`${fieldLabel}: ${fieldErrors}`);
              }
            }
          });
          
          if (errorsList.length > 0) {
            errorMessage = errorsList.join(". ");
          }
        }
        
        // Handle nested user errors (direct user object)
        if ((!errorMessage || errorMessage === "Failed to create organization") && errorData.user) {
          const userErrors = errorData.user;
          const errorMessages = Object.entries(userErrors)
            .map(([key, value]: [string, any]) => {
              const fieldLabel = key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
              return `${fieldLabel}: ${Array.isArray(value) ? value.join(", ") : value}`;
            })
            .join("; ");
          if (errorMessages) {
            errorMessage = errorMessages;
          }
        }
        
        // Fallback to message or error field
        if (!errorMessage || errorMessage === "Failed to create organization") {
          errorMessage = errorData.error || errorData.message || "Failed to create organization";
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setAddForm({
      email: "",
      username: "",
      password: "",
      phone_number: "",
      organization_name: "",
      state: "",
      city: "",
    });
  };

  const columns = [
    {
      title: "Organization Name",
      dataIndex: "organization_name",
      key: "organization_name",
      sorter: (a: Organization, b: Organization) =>
        a.organization_name.localeCompare(b.organization_name),
      render: (text: string) => (
        <span className="fw-semibold text-gray-900">{text}</span>
      ),
    },
    {
      title: "Email",
      dataIndex: ["user", "email"],
      key: "email",
      sorter: (a: Organization, b: Organization) =>
        a.user.email.localeCompare(b.user.email),
      render: (email: string) => (
        <span className="text-gray-700">{email}</span>
      ),
    },
    {
      title: "Username",
      dataIndex: ["user", "username"],
      key: "username",
      render: (username: string) => (
        <span className="text-gray-700">{username}</span>
      ),
    },
    {
      title: "Phone Number",
      dataIndex: ["user", "phone_number"],
      key: "phone_number",
      render: (phone: string) => (
        <span className="text-gray-700">{phone}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_user_active",
      key: "status",
      render: (isActive: boolean) => (
        <span
          className={`badge ${
            isActive ? "badge-success" : "badge-danger"
          } d-inline-flex align-items-center badge-xs`}
        >
          <i className="ti ti-point-filled me-1" />
          {isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => (
        <span className="text-gray-700">
          {new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
      sorter: (a: Organization, b: Organization) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Organization) => (
        <div className="action-icon d-inline-flex">
          <button
            className="btn btn-sm btn-primary me-2"
            onClick={() => handleEdit(record)}
            title="Edit Organization"
          >
            <i className="ti ti-edit" />
          </button>
        </div>
      ),
    },
  ];

  const summary = {
    total: organizations.length,
    active: organizations.filter((org) => org.is_user_active).length,
    inactive: organizations.filter((org) => !org.is_user_active).length,
  };

  return (
    <div className="page-wrapper" style={{ marginLeft: 0, width: "100%" }}>
      <div className="content" style={{ marginLeft: 0 }}>
        {/* Header Section */}
        <div className="page-breadcrumb mb-3">
          <div className="d-md-flex d-block align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <ImageWithBasePath
                src="assets/img/logo/logo4.png"
                className="img-fluid me-3"
                alt="Logo"
                width={120}
              />
              <div>
                <h2 className="mb-1">Organizations</h2>
                <p className="mb-0 text-muted">Manage and monitor all your organizations</p>
              </div>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="mb-2">
                <button
                  className="btn btn-primary d-flex align-items-center me-2"
                  onClick={() => setShowAddModal(true)}
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Organization
                </button>
              </div>
              <div className="mb-2">
                <button
                  className="btn btn-outline-danger d-flex align-items-center"
                  onClick={handleLogout}
                >
                  <i className="ti ti-logout me-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="row g-3 mb-4">
          <div className="col-lg-4 col-md-6">
            <div className="card flex-fill">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <span className="avatar avatar-lg bg-primary flex-shrink-0">
                      <i className="ti ti-building fs-16" />
                    </span>
                    <div className="ms-3 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-muted">Total Organizations</p>
                      <h4 className="mb-0">{summary.total}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4 col-md-6">
            <div className="card flex-fill">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <span className="avatar avatar-lg bg-success flex-shrink-0">
                      <i className="ti ti-check fs-16" />
                    </span>
                    <div className="ms-3 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-muted">Active Organizations</p>
                      <h4 className="mb-0">{summary.active}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4 col-md-6">
            <div className="card flex-fill">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <span className="avatar avatar-lg bg-danger flex-shrink-0">
                      <i className="ti ti-x fs-16" />
                    </span>
                    <div className="ms-3 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-muted">Inactive Organizations</p>
                      <h4 className="mb-0">{summary.inactive}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="card">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <h5>Organizations List</h5>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-light text-dark">{organizations.length} Total</span>
            </div>
          </div>
          <div className="card-body p-0">
            <Table
              dataSource={organizations}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} organizations`,
                pageSizeOptions: ["10", "20", "50", "100"],
              }}
              className="custom-table"
              scroll={{ x: "max-content" }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3" style={{ marginLeft: 0 }}>
        <p className="mb-0">2025 © NextPiQ</p>
        <p className="mb-0">
          Designed &amp; Developed By{" "}
          <span className="text-primary">NextPiQ</span>
        </p>
      </div>

      {/* Add Organization Modal */}
      {showAddModal && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
          onClick={handleCloseAddModal}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Add New Organization</h4>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseAddModal}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Organization Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.organization_name}
                        onChange={(e) =>
                          setAddForm({ ...addForm, organization_name: e.target.value })
                        }
                        placeholder="Enter organization name"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Email <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        value={addForm.email}
                        onChange={(e) =>
                          setAddForm({ ...addForm, email: e.target.value })
                        }
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Username <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.username}
                        onChange={(e) =>
                          setAddForm({ ...addForm, username: e.target.value })
                        }
                        placeholder="Enter username"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Password <span className="text-danger">*</span>
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        value={addForm.password}
                        onChange={(e) =>
                          setAddForm({ ...addForm, password: e.target.value })
                        }
                        placeholder="Enter password"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Phone Number <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.phone_number}
                        onChange={(e) =>
                          setAddForm({ ...addForm, phone_number: e.target.value })
                        }
                        placeholder="Enter phone number"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        State <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={addForm.state}
                        onChange={(e) =>
                          setAddForm({ ...addForm, state: e.target.value })
                        }
                        required
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        City <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.city}
                        onChange={(e) =>
                          setAddForm({ ...addForm, city: e.target.value })
                        }
                        placeholder="Enter city"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleCloseAddModal}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddOrganization}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Creating...
                    </>
                  ) : (
                    "Create Organization"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Organization Modal */}
      {showEditModal && editingOrg && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
          onClick={handleCloseEditModal}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-xl"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90%", width: "1200px" }}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Edit Organization</h4>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseEditModal}
                  aria-label="Close"
                ></button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // Exclude organization_logo from settingsForm as it's handled separately via upload endpoint
                  const { organization_logo, ...settingsWithoutLogo } = settingsForm;
                  handleUpdate(editingOrg.id, {
                    organization_name: editForm.organization_name,
                    user: {
                      email: editForm.email,
                      username: editForm.username,
                      phone_number: editForm.phone_number,
                      is_active: editForm.is_active,
                    },
                    organization_settings: settingsWithoutLogo,
                  });
                }}
              >
                <div className="modal-body">
                  {/* Tabs Navigation */}
                  <ul className="nav nav-tabs tab-style-1 nav-justified mb-4" role="tablist">
                    <li className="nav-item" role="presentation">
                      <button
                        className={`nav-link ${activeTab === "basic" ? "active" : ""}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab("basic");
                        }}
                        type="button"
                      >
                        <i className="ti ti-user me-2" />
                        Basic Information
                      </button>
                    </li>
                    <li className="nav-item" role="presentation">
                      <button
                        className={`nav-link ${activeTab === "settings" ? "active" : ""}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab("settings");
                        }}
                        type="button"
                      >
                        <i className="ti ti-settings me-2" />
                        Organization Settings
                      </button>
                    </li>
                  </ul>

                  {/* Tab Content */}
                  <div className="tab-content">
                    {/* Basic Information Tab */}
                    {activeTab === "basic" && (
                      <div className="tab-pane fade show active">
                        <div className="row">
                          {/* Organization Logo */}
                          <div className="col-md-12">
                            <div className="mb-3">
                              <label className="form-label">Organization Logo</label>
                              <div className="d-flex align-items-center gap-3 mb-3">
                                {logoPreview && (
                                  <div className="flex-shrink-0">
                                    <img
                                      src={logoPreview}
                                      alt="Organization Logo"
                                      className="img-thumbnail"
                                      style={{ width: "120px", height: "120px", objectFit: "contain" }}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="flex-grow-1">
                                  <div className="mb-2">
                                    <input
                                      type="file"
                                      className="form-control"
                                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                      onChange={handleLogoFileChange}
                                      disabled={isUploadingLogo}
                                    />
                                    <small className="text-muted">Upload JPG, PNG, GIF, or WebP (Max 5MB)</small>
                                  </div>
                                  {logoFile && editingOrg && (
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm"
                                      onClick={() => handleLogoUpload(editingOrg.id)}
                                      disabled={isUploadingLogo}
                                    >
                                      {isUploadingLogo ? (
                                        <>
                                          <span
                                            className="spinner-border spinner-border-sm me-2"
                                            role="status"
                                            aria-hidden="true"
                                          />
                                          Uploading...
                                        </>
                                      ) : (
                                        "Upload Logo"
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-12">
                            <div className="mb-3">
                              <label className="form-label">
                                Organization Name <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                value={editForm.organization_name}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, organization_name: e.target.value })
                                }
                                required
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">
                                Email <span className="text-danger">*</span>
                              </label>
                              <input
                                type="email"
                                className="form-control"
                                value={editForm.email}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, email: e.target.value })
                                }
                                required
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">
                                Username <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                value={editForm.username}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, username: e.target.value })
                                }
                                required
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">
                                Phone Number <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                value={editForm.phone_number}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, phone_number: e.target.value })
                                }
                                required
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Status</label>
                              <select
                                className="form-select"
                                value={editForm.is_active ? "active" : "inactive"}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    is_active: e.target.value === "active",
                                  })
                                }
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Organization Settings Tab */}
                    {activeTab === "settings" && (
                      <div className="tab-pane fade show active">
                        <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "10px" }}>
                          {/* Attendance Settings */}
                          <div className="card mb-3">
                            <div className="card-header bg-light">
                              <h6 className="mb-0">
                                <i className="ti ti-clock me-2" />
                                Attendance Settings
                              </h6>
                            </div>
                            <div className="card-body">
                              <div className="row">
                                <div className="col-md-6">
                                  <div className="form-check form-switch mb-3">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={settingsForm.auto_checkout_enabled || false}
                                      disabled={settingsForm.auto_shiftwise_checkout_enabled || false}
                                      onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        setSettingsForm({
                                          ...settingsForm,
                                          auto_checkout_enabled: isChecked,
                                          // Disable auto shiftwise checkout if auto checkout is enabled
                                          auto_shiftwise_checkout_enabled: isChecked ? false : settingsForm.auto_shiftwise_checkout_enabled,
                                        });
                                      }}
                                    />
                                    <label className="form-check-label">Auto Checkout</label>
                                    {settingsForm.auto_shiftwise_checkout_enabled && (
                                      <small className="text-muted d-block">Disabled: Auto Shiftwise Checkout is enabled</small>
                                    )}
                                  </div>
                                </div>
                                {settingsForm.auto_checkout_enabled && (
                                  <div className="col-md-6">
                                    <div className="mb-3">
                                      <label className="form-label">Auto Checkout Time</label>
                                      <input
                                        type="time"
                                        className="form-control"
                                        value={settingsForm.auto_checkout_time || ""}
                                        onChange={(e) =>
                                          setSettingsForm({
                                            ...settingsForm,
                                            auto_checkout_time: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                )}
                                <div className="col-md-6">
                                  <div className="form-check form-switch mb-3">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={settingsForm.auto_shiftwise_checkout_enabled || false}
                                      disabled={settingsForm.auto_checkout_enabled || false}
                                      onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        setSettingsForm({
                                          ...settingsForm,
                                          auto_shiftwise_checkout_enabled: isChecked,
                                          // Disable auto checkout if auto shiftwise checkout is enabled
                                          auto_checkout_enabled: isChecked ? false : settingsForm.auto_checkout_enabled,
                                        });
                                      }}
                                    />
                                    <label className="form-check-label">Auto Shiftwise Checkout</label>
                                    {settingsForm.auto_checkout_enabled && (
                                      <small className="text-muted d-block">Disabled: Auto Checkout is enabled</small>
                                    )}
                                  </div>
                                </div>
                                {settingsForm.auto_shiftwise_checkout_enabled && (
                                  <div className="col-md-6">
                                    <div className="mb-3">
                                      <label className="form-label">Grace Period (Minutes)</label>
                                      <input
                                        type="number"
                                        className="form-control"
                                        value={settingsForm.auto_shiftwise_checkout_in_minutes || ""}
                                        onChange={(e) =>
                                          setSettingsForm({
                                            ...settingsForm,
                                            auto_shiftwise_checkout_in_minutes: parseInt(e.target.value) || 30,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Leave Year Settings */}
                          <div className="card mb-3">
                            <div className="card-header bg-light">
                              <h6 className="mb-0">
                                <i className="ti ti-calendar me-2" />
                                Leave Year Settings
                              </h6>
                            </div>
                            <div className="card-body">
                              <div className="row">
                                <div className="col-md-6">
                                  <div className="mb-3">
                                    <label className="form-label">Leave Year Type</label>
                                    <select
                                      className="form-select"
                                      value={settingsForm.leave_year_type || ""}
                                      onChange={(e) =>
                                        setSettingsForm({
                                          ...settingsForm,
                                          leave_year_type: e.target.value,
                                        })
                                      }
                                    >
                                      <option value="">Select Leave Year Type</option>
                                      <option value="calendar">Calendar</option>
                                      <option value="financial">Financial</option>
                                      <option value="custom">Custom</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <div className="mb-3">
                                    <label className="form-label">Leave Year Start Month</label>
                                    <select
                                      className="form-select"
                                      value={settingsForm.leave_year_start_month || ""}
                                      onChange={(e) =>
                                        setSettingsForm({
                                          ...settingsForm,
                                          leave_year_start_month: parseInt(e.target.value) || undefined,
                                        })
                                      }
                                    >
                                      <option value="">Select Month</option>
                                      <option value="1">January</option>
                                      <option value="2">February</option>
                                      <option value="3">March</option>
                                      <option value="4">April</option>
                                      <option value="5">May</option>
                                      <option value="6">June</option>
                                      <option value="7">July</option>
                                      <option value="8">August</option>
                                      <option value="9">September</option>
                                      <option value="10">October</option>
                                      <option value="11">November</option>
                                      <option value="12">December</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Plan Settings */}
                          <div className="card mb-3">
                            <div className="card-header bg-light">
                              <h6 className="mb-0">
                                <i className="ti ti-credit-card me-2" />
                                Plan Settings
                              </h6>
                            </div>
                            <div className="card-body">
                              <div className="row">
                                <div className="col-md-12">
                                  <div className="mb-3">
                                    <label className="form-label">Plan Name</label>
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={settingsForm.plan_name || ""}
                                      onChange={(e) =>
                                        setSettingsForm({
                                          ...settingsForm,
                                          plan_name: e.target.value,
                                        })
                                      }
                                      placeholder="Enter plan name"
                                    />
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <div className="mb-3">
                                    <label className="form-label">Plan Assigned Date</label>
                                    <input
                                      type="date"
                                      className="form-control"
                                      value={settingsForm.plan_assigned_date || ""}
                                      onChange={(e) =>
                                        setSettingsForm({
                                          ...settingsForm,
                                          plan_assigned_date: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <div className="mb-3">
                                    <label className="form-label">Plan Expiry Date</label>
                                    <input
                                      type="date"
                                      className="form-control"
                                      value={settingsForm.plan_expiry_date || ""}
                                      onChange={(e) =>
                                        setSettingsForm({
                                          ...settingsForm,
                                          plan_expiry_date: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Menu Items Control */}
                          <div className="card mb-3">
                            <div className="card-header bg-light">
                              <h6 className="mb-0">
                                <i className="ti ti-menu-2 me-2" />
                                Sidebar Menu Control
                              </h6>
                            </div>
                            <div className="card-body">
                              <MenuItemsManager
                                enabledMenuItems={settingsForm.enabled_menu_items || {}}
                                onChange={(enabledMenuItems) =>
                                  setSettingsForm({
                                    ...settingsForm,
                                    enabled_menu_items: enabledMenuItems,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={handleCloseEditModal}
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default SystemOwnerOrganizations;
