/**
 * Payslip Generator API
 */
import axios from "axios";
import { getAuthHeaders, getSelectedSiteId, buildApiUrlWithSite, BACKEND_PATH } from "../../../../core/utils/apiHelpers";

const BASE_URL = `${BACKEND_PATH}payroll`;

export const payslipGeneratorAPI = {
  list: async (admin_id: string) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/payslip-generator/${site_id}/`;
    if (role === "organization" && admin_id) {
      url += `?admin_id=${admin_id}`;
    }
    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  },

  get: async (admin_id: string, id: number) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/payslip-generator/${site_id}/${id}/`;
    if (role === "organization" && admin_id) {
      url += `?admin_id=${admin_id}`;
    }
    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  },

  create: async (admin_id: string, data: FormData) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/payslip-generator/${site_id}/`;
    if (role === "organization" && admin_id) {
      url += `?admin_id=${admin_id}`;
    }
    const response = await axios.post(url, data, {
      ...getAuthHeaders(),
      headers: {
        ...getAuthHeaders().headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  update: async (admin_id: string, id: number, data: FormData) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/payslip-generator/${site_id}/${id}/`;
    if (role === "organization" && admin_id) {
      url += `?admin_id=${admin_id}`;
    }
    const response = await axios.put(url, data, {
      ...getAuthHeaders(),
      headers: {
        ...getAuthHeaders().headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  delete: async (admin_id: string, id: number) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/payslip-generator/${site_id}/${id}/`;
    if (role === "organization" && admin_id) {
      url += `?admin_id=${admin_id}`;
    }
    const response = await axios.delete(url, getAuthHeaders());
    return response.data;
  },
};

export default payslipGeneratorAPI;
