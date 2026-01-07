import { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_PATH } from '../../environment';
import { getAuthHeaders } from './apiHelpers';

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
  [key: string]: any;
}

/**
 * Hook to fetch and cache organization settings
 */
export const useOrganizationSettings = (): OrganizationSettings | null => {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      // First, try to load from cache for immediate display
      const cachedSettings = sessionStorage.getItem('organization_settings');
      if (cachedSettings) {
        try {
          const parsed = JSON.parse(cachedSettings);
          setSettings(parsed); // Show cached settings immediately
        } catch (e) {
          // Ignore parse errors
        }
      }

      try {
        const role = sessionStorage.getItem('role');
        let orgId: string | null = null;

        if (role === 'organization') {
          orgId = sessionStorage.getItem('user_id');
        } else if (role === 'admin') {
          // Try multiple sessionStorage keys
          orgId = sessionStorage.getItem('organization_id') ||
                  sessionStorage.getItem('selected_organization_id') ||
                  sessionStorage.getItem('org_id');
          
          // If not found, try to fetch from API
          if (!orgId) {
            try {
              const response = await axios.get(`${BACKEND_PATH}session-info`, getAuthHeaders());
              if (response.data?.data?.organization_id) {
                orgId = response.data.data.organization_id;
                if (orgId) {
                  sessionStorage.setItem('organization_id', orgId);
                }
              }
            } catch (error) {
              console.error('Error fetching organization_id:', error);
            }
          }
        }

        if (!orgId) {
          // If no orgId, keep using cached settings (if any) or null (sidebar shows all)
          return;
        }

        // Fetch fresh organization settings from API
        const response = await axios.get(
          `${BACKEND_PATH}organization-settings/${orgId}`,
          getAuthHeaders()
        );

        if (response.data?.status === 200 && response.data?.data) {
          setSettings(response.data.data);
          // Cache in sessionStorage
          sessionStorage.setItem('organization_settings', JSON.stringify(response.data.data));
        } else if (response.data?.data) {
          // Handle cases where status might not be 200 but data exists
          setSettings(response.data.data);
          sessionStorage.setItem('organization_settings', JSON.stringify(response.data.data));
        }
      } catch (error: any) {
        // If API call fails (403/401 or other errors), keep using cached settings
        // If no cache exists, settings will remain null and sidebar will show all items
        // Only log non-auth errors
        if (error.response?.status !== 403 && error.response?.status !== 401) {
          console.error('Error fetching organization settings:', error);
        }
        // For 403/401, silently keep cached settings or null - sidebar will work correctly
      }
    };

    fetchSettings();
  }, []);

  return settings;
};
