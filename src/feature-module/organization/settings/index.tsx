import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACKEND_PATH } from "../../../environment";
import { getAuthHeaders } from "../../../core/utils/apiHelpers";

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
}

const OrganizationSettingsPage = () => {
  const [settings, setSettings] = useState<OrganizationSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    const role = sessionStorage.getItem("role");
    const userId = sessionStorage.getItem("user_id");
    
    if (role === "organization" && userId) {
      setOrgId(userId);
      fetchSettings(userId);
    } else {
      toast.error("Access denied. Organization role required.");
      setLoading(false);
    }
  }, []);

  const fetchSettings = async (org_id: string) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${BACKEND_PATH}organization-settings/${org_id}`,
        getAuthHeaders()
      );

      if (response.data && response.data.status === 200 && response.data.data) {
        setSettings(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error(error.response?.data?.message || "Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!orgId) return;

    setSaving(true);
    try {
      const response = await axios.put(
        `${BACKEND_PATH}organization-settings/${orgId}`,
        settings,
        getAuthHeaders()
      );

      if (response.data && response.data.status === 200) {
        toast.success(response.data.message || "Settings updated successfully");
        fetchSettings(orgId);
      }
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field: keyof OrganizationSettings) => {
    setSettings((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleChange = (field: keyof OrganizationSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="page-title">
            <h4>Organization Settings</h4>
            <h6>Manage your organization settings</h6>
          </div>
          <div className="page-btn">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
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
                          checked={settings.auto_checkout_enabled || false}
                          disabled={settings.auto_shiftwise_checkout_enabled || false}
                          onChange={() => handleToggle("auto_checkout_enabled")}
                        />
                        <label className="form-check-label">Auto Checkout</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-check form-switch mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={settings.auto_shiftwise_checkout_enabled || false}
                          disabled={settings.auto_checkout_enabled || false}
                          onChange={() => handleToggle("auto_shiftwise_checkout_enabled")}
                        />
                        <label className="form-check-label">Auto Shiftwise Checkout</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-check form-switch mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={settings.late_punch_enabled || false}
                          onChange={() => handleToggle("late_punch_enabled")}
                        />
                        <label className="form-check-label">Late Punch Enabled</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-check form-switch mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={settings.early_exit_enabled || false}
                          onChange={() => handleToggle("early_exit_enabled")}
                        />
                        <label className="form-check-label">Early Exit Enabled</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-check form-switch mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={settings.multiple_shift_enabled || false}
                          onChange={() => handleToggle("multiple_shift_enabled")}
                        />
                        <label className="form-check-label">Multiple Shift Enabled</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Settings */}
              <div className="card mb-3">
                <div className="card-header bg-light">
                  <h6 className="mb-0">
                    <i className="ti ti-map me-2" />
                    Location Settings
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-check form-switch mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={settings.location_tracking_enabled || false}
                          onChange={() => handleToggle("location_tracking_enabled")}
                        />
                        <label className="form-check-label">Location Tracking Enabled</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-check form-switch mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={settings.geofencing_enabled || false}
                          onChange={() => handleToggle("geofencing_enabled")}
                        />
                        <label className="form-check-label">Geofencing Enabled</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="card mb-3">
                <div className="card-header bg-light">
                  <h6 className="mb-0">
                    <i className="ti ti-bell me-2" />
                    Notification Settings
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-check form-switch mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={settings.email_notifications_enabled || false}
                          onChange={() => handleToggle("email_notifications_enabled")}
                        />
                        <label className="form-check-label">Email Notifications</label>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-check form-switch mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={settings.sms_notifications_enabled || false}
                          onChange={() => handleToggle("sms_notifications_enabled")}
                        />
                        <label className="form-check-label">SMS Notifications</label>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-check form-switch mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={settings.push_notifications_enabled || false}
                          onChange={() => handleToggle("push_notifications_enabled")}
                        />
                        <label className="form-check-label">Push Notifications</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default OrganizationSettingsPage;


