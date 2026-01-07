/**
 * Professional Tax Rules API
 */
import axios from "axios";
import { getAuthHeaders, BACKEND_PATH } from "../../../../core/utils/apiHelpers";

const BASE_URL = `${BACKEND_PATH}payroll`;

export const professionalTaxRulesAPI = {
  list: async () => {
    const response = await axios.get(`${BASE_URL}/pt-rules/`, getAuthHeaders());
    return response.data;
  },
};

export default professionalTaxRulesAPI;
