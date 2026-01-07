/**
 * API Helper Utilities
 * Functions to help with API calls, authentication, and session management
 */
import { BACKEND_PATH, API_BASE_URL, MEDIA_URL } from '../../environment';

// Export API configuration for easy access
export { BACKEND_PATH, API_BASE_URL, MEDIA_URL };

/**
 * Get the admin ID to use for API calls
 * For organization role: returns selected_admin_id from sessionStorage
 * For admin role: returns user_id from sessionStorage
 * @returns {string | null} Admin ID or null if not found
 */
export const getAdminIdForApi = (): string | null => {
  const role = sessionStorage.getItem("role");
  const user_id = sessionStorage.getItem("user_id");
  
  // If organization role, use selected_admin_id
  if (role === "organization") {
    const selectedAdminId = sessionStorage.getItem("selected_admin_id");
    if (selectedAdminId) {
      return selectedAdminId;
    }
    // If no admin selected yet, return null (should not happen after first selection)
    return null;
  }
  
  // For admin role or others, use user_id
  return user_id;
};

/**
 * Get authentication headers for API calls
 * @returns {object} Headers object with Authorization token
 */
export const getAuthHeaders = () => {
  const token = sessionStorage.getItem("access_token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

/**
 * Check if organization has selected an admin
 * @returns {boolean} True if admin is selected, false otherwise
 */
export const hasSelectedAdmin = (): boolean => {
  const role = sessionStorage.getItem("role");
  if (role === "organization") {
    const selectedAdminId = sessionStorage.getItem("selected_admin_id");
    return selectedAdminId !== null && selectedAdminId !== "";
  }
  return true; // For admin role, they are always "selected"
};

/**
 * Get the selected site ID for admin
 * @returns {string | null} Site ID (UUID as string) or null if not selected
 */
export const getSelectedSiteId = (): string | null => {
  return sessionStorage.getItem("selected_site_id");
};

/**
 * Get the selected site name for admin
 * @returns {string | null} Site name or null if not selected
 */
export const getSelectedSiteName = (): string | null => {
  return sessionStorage.getItem("selected_site_name");
};

/**
 * Check if admin has selected a site
 * @returns {boolean} True if site is selected, false otherwise
 */
export const hasSelectedSite = (): boolean => {
  const role = sessionStorage.getItem("role");
  if (role === "admin") {
    const siteId = sessionStorage.getItem("selected_site_id");
    return siteId !== null && siteId !== "";
  }
  return true; // For non-admin roles, site selection not required
};

/**
 * Add site_id to URL query parameters if site is selected
 * @param {string} url - Base URL
 * @param {boolean} required - Whether site_id is required (default: false)
 * @returns {string} URL with site_id query parameter if available
 */
export const addSiteIdToUrl = (url: string, required: boolean = false): string => {
  const siteId = getSelectedSiteId();
  
  if (required && !siteId) {
    throw new Error("Site ID is required but not selected");
  }
  
  if (!siteId) {
    return url;
  }
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}site_id=${siteId}`;
};

/**
 * Get API URL with site_id automatically added
 * @param {string} baseUrl - Base API URL
 * @param {boolean} required - Whether site_id is required (default: true for admin role)
 * @returns {string} URL with site_id query parameter
 */
export const getApiUrlWithSite = (baseUrl: string, required: boolean = true): string => {
  const role = sessionStorage.getItem("role");
  
  // For admin role, site is usually required
  if (role === "admin" && required) {
    const siteId = getSelectedSiteId();
    if (!siteId) {
      throw new Error("Please select a site first");
    }
    return addSiteIdToUrl(baseUrl, true);
  }
  
  // For other roles or optional site, add if available
  return addSiteIdToUrl(baseUrl, false);
};

/**
 * Build query parameters object with site_id if available
 * @param {Record<string, any>} params - Existing query parameters
 * @param {boolean} required - Whether site_id is required (default: false)
 * @returns {Record<string, any>} Parameters object with site_id added
 */
export const addSiteIdToParams = (params: Record<string, any> = {}, required: boolean = false): Record<string, any> => {
  const siteId = getSelectedSiteId();
  
  if (required && !siteId) {
    throw new Error("Site ID is required but not selected");
  }
  
  if (siteId) {
    return { ...params, site_id: siteId };
  }
  
  return params;
};

/**
 * Build API URL with admin_id and site_id in the path
 * Pattern: /api/endpoint/${admin_id}/${site_id}
 * @param {string} baseUrl - Base API URL (should end with /api/endpoint/)
 * @param {string} admin_id - Admin ID
 * @param {boolean} required - Whether site_id is required (default: true)
 * @returns {string} URL with admin_id and site_id in path
 */
export const buildApiUrlWithSite = (baseUrl: string, admin_id: string, required: boolean = true): string => {
  if (!admin_id) {
    throw new Error("Admin ID is required");
  }
  
  const siteId = getSelectedSiteId();
  
  if (required && !siteId) {
    throw new Error("Site ID is required but not selected. Please select a site first.");
  }
  
  // Remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  // Build URL: baseUrl/admin_id/site_id
  return `${cleanBaseUrl}/${admin_id}/${siteId}`;
};

/**
 * Event name for site change notifications
 */
export const SITE_CHANGE_EVENT = 'siteChanged';

/**
 * Dispatch a custom event when site changes
 * This notifies all components listening to site changes
 * @param {string} siteId - New site ID
 * @param {string} siteName - New site name
 */
export const notifySiteChange = (siteId: string, siteName: string): void => {
  // Update sessionStorage first
  sessionStorage.setItem("selected_site_id", siteId);
  sessionStorage.setItem("selected_site_name", siteName);
  
  // Dispatch custom event for components to listen to
  const event = new CustomEvent(SITE_CHANGE_EVENT, {
    detail: { siteId, siteName }
  });
  window.dispatchEvent(event);
  
  // Also trigger storage event for cross-tab synchronization
  // Note: storage event only fires for other tabs, not the current tab
  // So we use CustomEvent for same-tab updates
};

