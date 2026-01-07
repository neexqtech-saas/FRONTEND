/**
 * Salary Structure API Utilities
 */
import axios from 'axios';
import { getAdminIdForApi, getSelectedSiteId, buildApiUrlWithSite, BACKEND_PATH } from '../../../../core/utils/apiHelpers';

const BASE_URL = `${BACKEND_PATH}payroll`;

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('access_token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };
};

// Organization ID helper - will be passed from component

// ==================== SALARY STRUCTURE ====================
export const salaryStructureAPI = {
  // List all structures
  list: async (organizationId: string) => {
    const response = await axios.get(`${BASE_URL}/structure/${organizationId}`, getAuthHeaders());
    return response.data;
  },

  // Get single structure
  get: async (organizationId: string, id: number) => {
    const response = await axios.get(`${BASE_URL}/structure/${organizationId}/${id}`, getAuthHeaders());
    return response.data;
  },

  // Create structure with components
  create: async (organizationId: string, data: any) => {
    const response = await axios.post(`${BASE_URL}/structure/${organizationId}`, data, getAuthHeaders());
    return response.data;
  },

  // Update structure
  update: async (organizationId: string, id: number, data: any) => {
    const response = await axios.put(`${BASE_URL}/structure/${organizationId}/${id}`, data, getAuthHeaders());
    return response.data;
  },

  // Delete structure
  delete: async (organizationId: string, id: number) => {
    const response = await axios.delete(`${BASE_URL}/structure/${organizationId}/${id}`, getAuthHeaders());
    return response.data;
  },
};

// ==================== EMPLOYEE STRUCTURE ASSIGNMENT ====================
export const employeeStructureAssignmentAPI = {
  // Get all assignments for admin
  listAll: async (adminId: string) => {
    const response = await axios.get(`${BASE_URL}/employee-structure/${adminId}`, getAuthHeaders());
    return response.data;
  },

  // Get assignments for specific employee
  listByEmployee: async (adminId: string, employeeId: string) => {
    const response = await axios.get(`${BASE_URL}/employee-structure/${adminId}/${employeeId}`, getAuthHeaders());
    return response.data;
  },

  // Get specific assignment
  get: async (adminId: string, employeeId: string, id: number) => {
    const response = await axios.get(`${BASE_URL}/employee-structure/${adminId}/${employeeId}/${id}`, getAuthHeaders());
    return response.data;
  },

  // Get assignment with full details (component toggles, values, etc.)
  getWithDetails: async (adminId: string, employeeId: string, id: number) => {
    const response = await axios.get(`${BASE_URL}/employee-structure/${adminId}/${employeeId}/${id}`, getAuthHeaders());
    return response.data;
  },

  // Create assignment
  create: async (adminId: string, employeeId: string, data: {
    structure_id: number;
    gross_salary: string;
    effective_month: number;
    effective_year: number;
  }) => {
    const response = await axios.post(`${BASE_URL}/employee-structure/${adminId}/${employeeId}`, data, getAuthHeaders());
    return response.data;
  },

  // Update assignment
  update: async (adminId: string, employeeId: string, id: number, data: {
    structure_id?: number;
    gross_salary?: string;
    effective_month?: number;
    effective_year?: number;
  }) => {
    const response = await axios.put(`${BASE_URL}/employee-structure/${adminId}/${employeeId}/${id}`, data, getAuthHeaders());
    return response.data;
  },

  // Delete assignment
  delete: async (adminId: string, employeeId: string, id: number) => {
    const response = await axios.delete(`${BASE_URL}/employee-structure/${adminId}/${employeeId}/${id}`, getAuthHeaders());
    return response.data;
  },
};

// ==================== ASSIGN PAY ====================
export const payrollStructureAPI = {
  assignPayAPI: {
    list: async (adminId: string, payType: 'yearly' | 'monthly' = 'yearly', month?: number, year?: number) => {
      let url = `${BASE_URL}/assign-pay/${adminId}?pay_type=${payType}`;
      if (month) url += `&month=${month}`;
      if (year) url += `&year=${year}`;
      const response = await axios.get(url, getAuthHeaders());
      return response.data;
    },
    get: async (adminId: string, employeeId: string, payType: 'yearly' | 'monthly' = 'yearly') => {
      const response = await axios.get(
        `${BASE_URL}/assign-pay/${adminId}/${employeeId}?pay_type=${payType}`,
        getAuthHeaders()
      );
      return response.data;
    },
  },
  calculatePayroll: async (adminId: string, employeeId: string, data: { assignment_id: number; gross_salary?: number }) => {
    const response = await axios.post(
      `${BASE_URL}/calculate-payroll/${adminId}/${employeeId}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  },
  updateEmployeeComponent: async (adminId: string, employeeId: string, componentId: number, data: { is_enabled: boolean }) => {
    const response = await axios.patch(
      `${BASE_URL}/employee-component/${adminId}/${employeeId}/${componentId}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  },
};

// ==================== PAYROLL SETTINGS ====================
export const payrollSettingsAPI = {
  // Get payroll settings
  get: async (organizationId: string) => {
    const response = await axios.get(`${BASE_URL}/payroll-settings/${organizationId}`, getAuthHeaders());
    return response.data;
  },

  // Create or update payroll settings
  save: async (organizationId: string, data: any) => {
    const response = await axios.post(`${BASE_URL}/payroll-settings/${organizationId}`, data, getAuthHeaders());
    return response.data;
  },

  // Update payroll settings (PUT)
  update: async (organizationId: string, data: any) => {
    const response = await axios.put(`${BASE_URL}/payroll-settings/${organizationId}`, data, getAuthHeaders());
    return response.data;
  },

  // Partial update payroll settings (PATCH)
  patch: async (organizationId: string, data: any) => {
    const response = await axios.patch(`${BASE_URL}/payroll-settings/${organizationId}`, data, getAuthHeaders());
    return response.data;
  },
};

// ==================== EMPLOYEE BANK DETAILS ====================
export const bankDetailsAPI = {
  // Get all bank details for admin
  list: async (adminId: string) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const response = await axios.get(buildApiUrlWithSite(`${BASE_URL}/bank-details`, adminId), getAuthHeaders());
    return response.data;
  },

  // Get bank details for specific employee
  get: async (adminId: string, employeeId: string) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const response = await axios.get(`${BASE_URL}/bank-details/${adminId}/${site_id}/${employeeId}`, getAuthHeaders());
    return response.data;
  },

  // Create bank details for employee
  create: async (adminId: string, employeeId: string, data: any) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const response = await axios.post(`${BASE_URL}/bank-details/${adminId}/${site_id}/${employeeId}`, data, getAuthHeaders());
    return response.data;
  },

  // Update bank details (PUT)
  update: async (adminId: string, employeeId: string, data: any) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const response = await axios.put(`${BASE_URL}/bank-details/${adminId}/${site_id}/${employeeId}`, data, getAuthHeaders());
    return response.data;
  },

  // Partial update bank details (PATCH)
  patch: async (adminId: string, employeeId: string, data: any) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const response = await axios.patch(`${BASE_URL}/bank-details/${adminId}/${site_id}/${employeeId}`, data, getAuthHeaders());
    return response.data;
  },
};

// ==================== RUN PAYROLL / PAYROLL REPORT ====================
export const runPayrollAPI = {
  // Get generated payroll records for a month/year
  getGeneratedPayrollRecords: async (adminId: string, month: number, year: number) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/generate-payroll-from-attendance/${site_id}/?month=${month}&year=${year}`;
    if (role === "organization" && adminId) {
      url += `&admin_id=${adminId}`;
    }
    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  },

  // Download payroll report as Excel
  downloadPayrollReportExcel: async (adminId: string, month: number, year: number) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const token = sessionStorage.getItem('access_token');
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/generate-payroll-from-attendance/${site_id}/?month=${month}&year=${year}&download=true`;
    if (role === "organization" && adminId) {
      url += `&admin_id=${adminId}`;
    }
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      responseType: 'blob', // Important for file download
    });
    return response;
  },

  // Generate payslips for all employees from payroll records
  generatePayslipFromPayrollRecord: async (adminId: string, month: number, year: number) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/generate-payslip-from-payroll/${site_id}/?month=${month}&year=${year}`;
    if (role === "organization" && adminId) {
      url += `&admin_id=${adminId}`;
    }
    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  },

  // Get payslip list
  getPayslipList: async (adminId: string, employeeId?: string, month?: number, year?: number) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/payslip-list/${site_id}/`;
    const params = new URLSearchParams();
    if (role === "organization" && adminId) {
      params.append('admin_id', adminId);
    }
    if (employeeId) params.append('employee_id', employeeId);
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  },

  // Clear all payslips for an admin
  clearAllPayslips: async (adminId: string) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/payslip-list/${site_id}/`;
    if (role === "organization" && adminId) {
      url += `?admin_id=${adminId}`;
    }
    const response = await axios.delete(url, getAuthHeaders());
    return response.data;
  },

  // Generate payroll from attendance Excel file
  generatePayrollFromAttendance: async (adminId: string, month: number, year: number, file: File) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const formData = new FormData();
    formData.append('file', file);
    const token = sessionStorage.getItem('access_token');
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/generate-payroll-from-attendance/${site_id}/?month=${month}&year=${year}`;
    if (role === "organization" && adminId) {
      url += `&admin_id=${adminId}`;
    }
    const response = await axios.post(url, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Legacy APIs (keeping for backward compatibility)
  getPayrollReports: async (adminId: string, month: number, year: number) => {
    const response = await axios.get(
      `${BASE_URL}/payroll-reports/${adminId}?month=${month}&year=${year}`,
      getAuthHeaders()
    );
    return response.data;
  },

  generatePayroll: async (adminId: string, data: {
    month: number;
    year: number;
  }) => {
    const response = await axios.post(
      `${BASE_URL}/payroll-reports/${adminId}/generate`,
      data,
      getAuthHeaders()
    );
    return response.data;
  },
};

// ==================== ATTENDANCE UPLOAD ====================
export const attendanceUploadAPI = {
  // Download demo attendance sheet (with all employees)
  downloadDemoSheet: async (adminId: string) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const token = sessionStorage.getItem('access_token');
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/demo-attendance-sheet/${site_id}/`;
    if (role === "organization" && adminId) {
      url += `?admin_id=${adminId}`;
    }
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      responseType: 'blob',
    });
    return response;
  },

  // Download attendance template
  downloadTemplate: async (adminId: string) => {
    const token = sessionStorage.getItem('access_token');
    const response = await axios.get(
      `${BASE_URL}/attendance-upload/${adminId}/download-template`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        responseType: 'blob', // Important for file download
      }
    );
    return response.data;
  },

  // Upload attendance Excel file
  uploadAttendance: async (adminId: string, formData: FormData) => {
    const token = sessionStorage.getItem('access_token');
    const response = await axios.post(
      `${BASE_URL}/attendance-upload/${adminId}`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Upload and generate payroll
  uploadAndGeneratePayroll: async (adminId: string, formData: FormData) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const token = sessionStorage.getItem('access_token');
    const response = await axios.post(
      `${buildApiUrlWithSite(`${BASE_URL}/attendance-upload`, adminId)}/generate-payroll`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};

// ==================== EMPLOYEE ADVANCE ====================
export const employeeAdvanceAPI = {
  // List all advances for admin
  list: async (adminId: string, params?: {
    search?: string;
    status?: string;
    employee_id?: string;
    page?: number;
    page_size?: number;
  }) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/employee-advance/${site_id}/`;
    const queryParams = new URLSearchParams();
    if (role === "organization" && adminId) {
      queryParams.append('admin_id', adminId);
    }
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (queryParams.toString()) url += `?${queryParams.toString()}`;
    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  },

  // Get single advance
  get: async (adminId: string, id: number) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/employee-advance/${site_id}/${id}/`;
    if (role === "organization" && adminId) {
      url += `?admin_id=${adminId}`;
    }
    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  },

  // Create advance
  create: async (adminId: string, data: {
    employee_id: string;
    advance_amount: string | number;
    request_date: string;
    purpose?: string;
    status?: string;
    notes?: string;
    attachment?: File;
  }) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const formData = new FormData();
    formData.append('employee_id', data.employee_id);
    formData.append('advance_amount', data.advance_amount.toString());
    formData.append('request_date', data.request_date);
    if (data.purpose) formData.append('purpose', data.purpose);
    if (data.status) formData.append('status', data.status);
    if (data.notes) formData.append('notes', data.notes);
    if (data.attachment) formData.append('attachment', data.attachment);

    const token = sessionStorage.getItem('access_token');
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/employee-advance/${site_id}/`;
    if (role === "organization" && adminId) {
      url += `?admin_id=${adminId}`;
    }
    const response = await axios.post(url, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// ==================== EMPLOYEE EARNINGS EXCEL ====================
export const employeeEarningsExcelAPI = {
  // Download Excel template
  downloadTemplate: async (adminId: string, month: number, year: number) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const token = sessionStorage.getItem('access_token');
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/employee-earnings-excel/${site_id}/?month=${month}&year=${year}`;
    if (role === "organization" && adminId) {
      url += `&admin_id=${adminId}`;
    }
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      responseType: 'blob',
    });
    return response;
  },

  // Upload Excel file
  uploadExcel: async (adminId: string, month: number, year: number, file: File) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const formData = new FormData();
    formData.append('file', file);

    const token = sessionStorage.getItem('access_token');
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/employee-earnings-excel/${site_id}/?month=${month}&year=${year}`;
    if (role === "organization" && adminId) {
      url += `&admin_id=${adminId}`;
    }
    const response = await axios.post(url, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// ==================== EMPLOYEE DEDUCTIONS EXCEL ====================
export const employeeDeductionsExcelAPI = {
  // Download Excel template
  downloadTemplate: async (adminId: string, month: number, year: number) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const token = sessionStorage.getItem('access_token');
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/employee-deductions-excel/${site_id}/?month=${month}&year=${year}`;
    if (role === "organization" && adminId) {
      url += `&admin_id=${adminId}`;
    }
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      responseType: 'blob',
    });
    return response;
  },

  // Upload Excel file
  uploadExcel: async (adminId: string, month: number, year: number, file: File) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const formData = new FormData();
    formData.append('file', file);

    const token = sessionStorage.getItem('access_token');
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/employee-deductions-excel/${site_id}/?month=${month}&year=${year}`;
    if (role === "organization" && adminId) {
      url += `&admin_id=${adminId}`;
    }
    const response = await axios.post(url, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// ==================== EMPLOYEE PAYROLL CONFIG ====================
export const employeePayrollConfigAPI = {
  // List all configs for admin (with optional month/year filters)
  list: async (adminId: string, effectiveMonth?: number, effectiveYear?: number) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/employee-payroll-config/${site_id}/`;
    const params = new URLSearchParams();
    if (role === "organization" && adminId) {
      params.append('admin_id', adminId);
    }
    if (effectiveMonth) params.append('effective_month', effectiveMonth.toString());
    if (effectiveYear) params.append('effective_year', effectiveYear.toString());
    if (params.toString()) url += `?${params.toString()}`;
    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  },

  // Get config by employee ID (with optional month/year filters)
  getByEmployee: async (adminId: string, employeeId: string, effectiveMonth?: number, effectiveYear?: number) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/employee-payroll-config/${site_id}/employee/${employeeId}/`;
    const params = new URLSearchParams();
    if (role === "organization" && adminId) {
      params.append('admin_id', adminId);
    }
    if (effectiveMonth) params.append('effective_month', effectiveMonth.toString());
    if (effectiveYear) params.append('effective_year', effectiveYear.toString());
    if (params.toString()) url += `?${params.toString()}`;
    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  },

  // Get single config
  get: async (adminId: string, id: number) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/employee-payroll-config/${site_id}/${id}/`;
    if (role === "organization" && adminId) {
      url += `?admin_id=${adminId}`;
    }
    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  },

  // Create config
  create: async (adminId: string, data: {
    employee_id: string;
    salary_structure_id: number;
    gross_salary: number;
    effective_month: number;
    effective_year: number;
    pf_applicable?: boolean | null;
    esi_applicable?: boolean | null;
    pt_applicable?: boolean | null;
    gratuity_applicable?: boolean | null;
  }) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/employee-payroll-config/${site_id}/`;
    if (role === "organization" && adminId) {
      url += `?admin_id=${adminId}`;
    }
    const response = await axios.post(url, data, getAuthHeaders());
    return response.data;
  },

  // Update config
  update: async (adminId: string, id: number, data: {
    employee_id?: string;
    salary_structure_id?: number;
    gross_salary?: number;
    effective_month?: number;
    effective_year?: number;
    pf_applicable?: boolean | null;
    esi_applicable?: boolean | null;
    pt_applicable?: boolean | null;
    gratuity_applicable?: boolean | null;
  }) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/employee-payroll-config/${site_id}/${id}/`;
    if (role === "organization" && adminId) {
      url += `?admin_id=${adminId}`;
    }
    const response = await axios.put(url, data, getAuthHeaders());
    return response.data;
  },

  // Delete config
  delete: async (adminId: string, id: number) => {
    const site_id = getSelectedSiteId();
    if (!site_id) throw new Error("Site ID is required. Please select a site first.");
    const role = sessionStorage.getItem("role");
    let url = `${BASE_URL}/employee-payroll-config/${site_id}/${id}/`;
    if (role === "organization" && adminId) {
      url += `?admin_id=${adminId}`;
    }
    const response = await axios.delete(url, getAuthHeaders());
    return response.data;
  },
};

export default salaryStructureAPI;

