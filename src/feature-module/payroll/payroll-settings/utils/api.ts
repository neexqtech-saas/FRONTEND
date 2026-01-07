/**
 * Payroll Settings API
 */
import axios from "axios";
import { getAuthHeaders, BACKEND_PATH } from "../../../../core/utils/apiHelpers";

const BASE_URL = `${BACKEND_PATH}payroll`;

export const payrollSettingsAPI = {
  get: async (org_id: string) => {
    if (!org_id) {
      throw new Error('Organization ID is required');
    }
    const url = `${BASE_URL}/payroll-settings/${org_id}`;
    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  },

  create: async (org_id: string, data: any) => {
    if (!org_id) {
      throw new Error('Organization ID is required');
    }
    const url = `${BASE_URL}/payroll-settings/${org_id}`;
    const response = await axios.post(url, data, getAuthHeaders());
    return response.data;
  },

  update: async (org_id: string, data: any) => {
    if (!org_id) {
      throw new Error('Organization ID is required');
    }
    const url = `${BASE_URL}/payroll-settings/${org_id}`;
    const response = await axios.put(url, data, getAuthHeaders());
    return response.data;
  },
};

export default payrollSettingsAPI;
