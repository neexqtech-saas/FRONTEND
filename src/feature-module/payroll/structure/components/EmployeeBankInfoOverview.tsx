/**
 * Employee Bank Info Overview Component
 * Shows all employees' bank information in a table format with add/edit/delete functionality
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getAdminIdForApi, getAuthHeaders, getSelectedSiteId } from '../../../../core/utils/apiHelpers';
import { BACKEND_PATH } from '../../../../environment';

interface EmployeeBankInfo {
  id: number;
  employee_id: string;
  employee_name?: string;
  custom_employee_id?: string;
  pan_card_number: string;
  pan_card_name?: string;
  aadhar_card_number: string;
  aadhar_card_name?: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  account_type: string;
  ifsc_code: string;
  bank_address: string;
  branch_name?: string;
  city: string;
  state: string;
  pincode: string;
  is_primary: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface EmployeeData {
  employee_id: string;
  employee_name?: string;
  custom_employee_id?: string;
  designation?: string;
  bank_info?: EmployeeBankInfo;
}

interface BankInfoFormData {
  employee_id: string;
  pan_card_number: string;
  pan_card_name: string;
  aadhar_card_number: string;
  aadhar_card_name: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  account_type: string;
  ifsc_code: string;
  bank_address: string;
  branch_name: string;
  city: string;
  state: string;
  pincode: string;
  is_primary: boolean;
  is_active: boolean;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings Account' },
  { value: 'current', label: 'Current Account' },
  { value: 'salary', label: 'Salary Account' },
  { value: 'fixed_deposit', label: 'Fixed Deposit Account' },
  { value: 'recurring_deposit', label: 'Recurring Deposit Account' },
  { value: 'nre', label: 'NRE Account' },
  { value: 'nro', label: 'NRO Account' },
  { value: 'fcnr', label: 'FCNR Account' },
];

const EmployeeBankInfoOverview: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingBankInfo, setEditingBankInfo] = useState<EmployeeBankInfo | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null);
  const [formData, setFormData] = useState<BankInfoFormData>({
    employee_id: '',
    pan_card_number: '',
    pan_card_name: '',
    aadhar_card_number: '',
    aadhar_card_name: '',
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    account_type: 'savings',
    ifsc_code: '',
    bank_address: '',
    branch_name: '',
    city: '',
    state: '',
    pincode: '',
    is_primary: true,
    is_active: true,
  });
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchBankInfoData();
  }, []);

  const fetchBankInfoData = async () => {
    try {
      setLoading(true);
      const adminId = getAdminIdForApi();
      if (!adminId) {
        toast.error('Admin ID not found');
        return;
      }

      // First fetch all employees from staff list
      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        setLoading(false);
        return;
      }
      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}staff-list/${site_id}/`;
      if (role === "organization" && adminId) {
        url += `?admin_id=${adminId}`;
      }
      const employeesResponse = await axios.get(
        url,
        getAuthHeaders()
      );

      // Then fetch all bank info
      url = `${BACKEND_PATH}payroll/employee-bank-info/${site_id}/?page_size=1000`;
      if (role === "organization" && adminId) {
        url += `&admin_id=${adminId}`;
      }
      const response = await axios.get(url, getAuthHeaders());

      if (response.data.status) {
        const bankInfoList = response.data.data?.results || [];

        const allEmployees: EmployeeData[] = [];
        const employeesMap = new Map<string, EmployeeData>();

        // Extract employees from response
        let employeesData: any[] = [];
        if (employeesResponse.data?.results && Array.isArray(employeesResponse.data.results)) {
          employeesData = employeesResponse.data.results;
        } else if (employeesResponse.data?.data?.results && Array.isArray(employeesResponse.data.data.results)) {
          employeesData = employeesResponse.data.data.results;
        } else if (Array.isArray(employeesResponse.data)) {
          employeesData = employeesResponse.data;
        } else if (employeesResponse.data?.data && Array.isArray(employeesResponse.data.data)) {
          employeesData = employeesResponse.data.data;
        }

        // Filter active employees and add to map
        const activeEmployees = employeesData.filter(
          (emp: any) => emp.is_active !== false && emp.user?.is_active !== false
        );

        activeEmployees.forEach((emp: any) => {
          const employeeId = emp.user?.id || emp.id || emp.user_id;
          const employeeData: EmployeeData = {
            employee_id: employeeId,
            employee_name: emp.user_name || emp.employee_name || emp.name || emp.user?.username || 'N/A',
            custom_employee_id: emp.custom_employee_id || 'N/A',
            designation: emp.designation || emp.job_title || 'N/A',
          };
          employeesMap.set(employeeId, employeeData);
          allEmployees.push(employeeData);
        });

        // Create a map of bank info by employee_id for quick lookup
        const bankInfoMap = new Map<string, EmployeeBankInfo>();
        bankInfoList.forEach((bankInfo: EmployeeBankInfo) => {
          bankInfoMap.set(bankInfo.employee_id, bankInfo);
        });

        // Add bank info to employees that already exist in the list
        allEmployees.forEach((emp) => {
          const bankInfo = bankInfoMap.get(emp.employee_id);
          if (bankInfo) {
            emp.bank_info = bankInfo;
          }
        });

        // Also add any employees from bank info that are not in the main list
        bankInfoList.forEach((bankInfo: EmployeeBankInfo) => {
          if (!employeesMap.has(bankInfo.employee_id)) {
            allEmployees.push({
              employee_id: bankInfo.employee_id,
              employee_name: bankInfo.employee_name || 'N/A',
              custom_employee_id: bankInfo.custom_employee_id || 'N/A',
              designation: 'N/A',
              bank_info: bankInfo,
            });
          }
        });

        // Sort employees: those with bank info first, then by name
        allEmployees.sort((a, b) => {
          if (a.bank_info && !b.bank_info) return -1;
          if (!a.bank_info && b.bank_info) return 1;
          return (a.employee_name || '').localeCompare(b.employee_name || '');
        });

        setEmployees(allEmployees);
      } else {
        toast.error(response.data.message || 'Failed to fetch bank information');
      }
    } catch (error: any) {
      console.error('Error fetching bank info data:', error);
      toast.error(error.response?.data?.message || 'Error fetching bank information');
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on search query
  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    return (
      emp.employee_name?.toLowerCase().includes(query) ||
      emp.custom_employee_id?.toLowerCase().includes(query) ||
      emp.designation?.toLowerCase().includes(query) ||
      emp.bank_info?.bank_name?.toLowerCase().includes(query) ||
      emp.bank_info?.account_number?.toLowerCase().includes(query) ||
      emp.bank_info?.ifsc_code?.toLowerCase().includes(query)
    );
  });

  const handleAddNew = () => {
    setEditingBankInfo(null);
    setSelectedEmployee(null);
    setFormData({
      employee_id: '',
      pan_card_number: '',
      pan_card_name: '',
      aadhar_card_number: '',
      aadhar_card_name: '',
      bank_name: '',
      account_number: '',
      account_holder_name: '',
      account_type: 'savings',
      ifsc_code: '',
      bank_address: '',
      branch_name: '',
      city: '',
      state: '',
      pincode: '',
      is_primary: true,
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (employee: EmployeeData) => {
    if (employee.bank_info) {
      setEditingBankInfo(employee.bank_info);
      setSelectedEmployee(employee);
      setFormData({
        employee_id: employee.employee_id,
        pan_card_number: employee.bank_info.pan_card_number || '',
        pan_card_name: employee.bank_info.pan_card_name || '',
        aadhar_card_number: employee.bank_info.aadhar_card_number || '',
        aadhar_card_name: employee.bank_info.aadhar_card_name || '',
        bank_name: employee.bank_info.bank_name || '',
        account_number: employee.bank_info.account_number || '',
        account_holder_name: employee.bank_info.account_holder_name || '',
        account_type: employee.bank_info.account_type || 'savings',
        ifsc_code: employee.bank_info.ifsc_code || '',
        bank_address: employee.bank_info.bank_address || '',
        branch_name: employee.bank_info.branch_name || '',
        city: employee.bank_info.city || '',
        state: employee.bank_info.state || '',
        pincode: employee.bank_info.pincode || '',
        is_primary: employee.bank_info.is_primary || false,
        is_active: employee.bank_info.is_active !== undefined ? employee.bank_info.is_active : true,
      });
      setShowModal(true);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const adminId = getAdminIdForApi();
      if (!adminId) {
        toast.error('Admin ID not found');
        return;
      }

      // Validate required fields
      if (!formData.employee_id && !editingBankInfo) {
        toast.error('Please select an employee');
        return;
      }
      if (!formData.pan_card_number || !formData.aadhar_card_number || !formData.bank_name || 
          !formData.account_number || !formData.account_holder_name || !formData.ifsc_code ||
          !formData.bank_address || !formData.city || !formData.state || !formData.pincode) {
        toast.error('Please fill all required fields');
        return;
      }

      // Validate PAN format (10 characters: 5 letters, 4 digits, 1 letter)
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(formData.pan_card_number.toUpperCase())) {
        toast.error('Invalid PAN card format. Format: ABCDE1234F');
        return;
      }

      // Validate Aadhar (12 digits, cannot start with 0 or 1)
      const aadharRegex = /^[2-9]\d{11}$/;
      if (!aadharRegex.test(formData.aadhar_card_number)) {
        toast.error('Invalid Aadhar card number. Must be 12 digits and cannot start with 0 or 1');
        return;
      }

      // Validate IFSC (11 characters: 4 letters, 0, 6 alphanumeric)
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(formData.ifsc_code.toUpperCase())) {
        toast.error('Invalid IFSC code format. Format: HDFC0001234');
        return;
      }

      // Validate account number (9-18 digits)
      const accountRegex = /^\d{9,18}$/;
      if (!accountRegex.test(formData.account_number)) {
        toast.error('Invalid account number. Must be 9-18 digits');
        return;
      }

      // Validate pincode (6 digits)
      const pincodeRegex = /^\d{6}$/;
      if (!pincodeRegex.test(formData.pincode)) {
        toast.error('Invalid PIN code. Must be 6 digits');
        return;
      }

      const payload = {
        ...formData,
        pan_card_number: formData.pan_card_number.toUpperCase(),
        ifsc_code: formData.ifsc_code.toUpperCase(),
      };

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      const role = sessionStorage.getItem("role");
      
      if (editingBankInfo) {
        // Update existing bank info
        let url = `${BACKEND_PATH}payroll/employee-bank-info/${site_id}/${editingBankInfo.id}/`;
        if (role === "organization" && adminId) {
          url += `?admin_id=${adminId}`;
        }
        const response = await axios.put(url, payload, getAuthHeaders());

        if (response.data.status) {
          toast.success('Bank information updated successfully');
          setShowModal(false);
          fetchBankInfoData();
        } else {
          toast.error(response.data.message || 'Failed to update bank information');
        }
      } else {
        // Create new bank info
        let url = `${BACKEND_PATH}payroll/employee-bank-info/${site_id}/`;
        if (role === "organization" && adminId) {
          url += `?admin_id=${adminId}`;
        }
        const response = await axios.post(url, payload, getAuthHeaders());

        if (response.data.status) {
          toast.success('Bank information created successfully');
          setShowModal(false);
          fetchBankInfoData();
        } else {
          toast.error(response.data.message || 'Failed to create bank information');
        }
      }
    } catch (error: any) {
      console.error('Error saving bank info:', error);
      toast.error(error.response?.data?.message || 'Error saving bank information');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bankInfo: EmployeeBankInfo) => {
    if (!window.confirm('Are you sure you want to delete this bank information?')) {
      return;
    }

    try {
      const adminId = getAdminIdForApi();
      if (!adminId) {
        toast.error('Admin ID not found');
        return;
      }

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}payroll/employee-bank-info/${site_id}/${bankInfo.id}/`;
      if (role === "organization" && adminId) {
        url += `?admin_id=${adminId}`;
      }
      const response = await axios.delete(url, getAuthHeaders());

      if (response.data.status) {
        toast.success('Bank information deleted successfully');
        fetchBankInfoData();
      } else {
        toast.error(response.data.message || 'Failed to delete bank information');
      }
    } catch (error: any) {
      console.error('Error deleting bank info:', error);
      toast.error(error.response?.data?.message || 'Error deleting bank information');
    }
  };

  // Get available employees for dropdown (those without bank info or currently editing)
  const availableEmployees = employees.filter(
    (emp) => !emp.bank_info || (editingBankInfo && emp.employee_id === editingBankInfo.employee_id)
  );

  return (
    <div className="employee-bank-info-overview">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">Employee Bank Information</h5>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={handleAddNew}
            >
              <i className="ti ti-plus me-1"></i>
              Add Bank Info
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={fetchBankInfoData}
              disabled={loading}
            >
              <i className="ti ti-refresh me-1"></i>
              Refresh
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search by employee name, ID, bank name, account number, or IFSC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: '500px' }}
            />
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
              <table className="table table-bordered table-hover">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>Employee ID</th>
                    <th>Employee Name</th>
                    <th>Designation</th>
                    <th>Bank Name</th>
                    <th>Account Number</th>
                    <th>Account Holder</th>
                    <th>IFSC Code</th>
                    <th>PAN Card</th>
                    <th>Aadhar Card</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-4">
                        <div className="text-muted">
                          <i className="ti ti-info-circle me-2"></i>
                          No employees found
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <tr
                        key={employee.employee_id}
                        className={!employee.bank_info ? 'table-warning' : ''}
                      >
                        <td>{employee.custom_employee_id || 'N/A'}</td>
                        <td>{employee.employee_name || 'N/A'}</td>
                        <td>{employee.designation || 'N/A'}</td>
                        <td>
                          {employee.bank_info ? (
                            <>
                              {employee.bank_info.bank_name}
                              {employee.bank_info.is_primary && (
                                <span className="badge bg-primary ms-1">Primary</span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted fw-semibold">Not Set</span>
                          )}
                        </td>
                        <td>
                          {employee.bank_info
                            ? `${employee.bank_info.account_number.slice(0, 4)}****${employee.bank_info.account_number.slice(-4)}`
                            : <span className="text-muted">-</span>}
                        </td>
                        <td>
                          {employee.bank_info?.account_holder_name || <span className="text-muted">-</span>}
                        </td>
                        <td>
                          {employee.bank_info?.ifsc_code || <span className="text-muted">-</span>}
                        </td>
                        <td>
                          {employee.bank_info?.pan_card_number || <span className="text-muted">-</span>}
                        </td>
                        <td>
                          {employee.bank_info?.aadhar_card_number
                            ? `${employee.bank_info.aadhar_card_number.slice(0, 4)}****${employee.bank_info.aadhar_card_number.slice(-4)}`
                            : <span className="text-muted">-</span>}
                        </td>
                        <td>
                          {employee.bank_info ? (
                            employee.bank_info.is_active ? (
                              <span className="badge bg-success">Active</span>
                            ) : (
                              <span className="badge bg-secondary">Inactive</span>
                            )
                          ) : (
                            <span className="badge bg-warning text-dark">Not Set</span>
                          )}
                        </td>
                        <td className="text-center">
                          {employee.bank_info ? (
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleEdit(employee)}
                                title="Edit"
                              >
                                <i className="ti ti-edit"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(employee.bank_info!)}
                                title="Delete"
                              >
                                <i className="ti ti-trash"></i>
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setFormData({ ...formData, employee_id: employee.employee_id });
                                setShowModal(true);
                              }}
                              title="Add Bank Info"
                            >
                              <i className="ti ti-plus"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredEmployees.length > 0 && (
            <div className="mt-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="badge bg-success">Total Employees: {filteredEmployees.length}</span>
                  <span className="badge bg-primary ms-2">
                    With Bank Info: {filteredEmployees.filter((e) => e.bank_info).length}
                  </span>
                  <span className="badge bg-warning ms-2">
                    Without Bank Info: {filteredEmployees.filter((e) => !e.bank_info).length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingBankInfo ? 'Edit Bank Information' : 'Add Bank Information'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  {/* Employee Selection (only for new entries) */}
                  {!editingBankInfo && (
                    <div className="col-md-6">
                      <label className="form-label">Employee <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={formData.employee_id}
                        onChange={(e) => {
                          const emp = employees.find((em) => em.employee_id === e.target.value);
                          setFormData({ ...formData, employee_id: e.target.value });
                          setSelectedEmployee(emp || null);
                        }}
                        required
                      >
                        <option value="">Select Employee</option>
                        {availableEmployees.map((emp) => (
                          <option key={emp.employee_id} value={emp.employee_id}>
                            {emp.custom_employee_id} - {emp.employee_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* PAN Card */}
                  <div className="col-md-6">
                    <label className="form-label">PAN Card Number <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.pan_card_number}
                      onChange={(e) => setFormData({ ...formData, pan_card_number: e.target.value.toUpperCase() })}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">PAN Card Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.pan_card_name}
                      onChange={(e) => setFormData({ ...formData, pan_card_name: e.target.value })}
                      placeholder="Name as per PAN Card"
                    />
                  </div>

                  {/* Aadhar Card */}
                  <div className="col-md-6">
                    <label className="form-label">Aadhar Card Number <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.aadhar_card_number}
                      onChange={(e) => setFormData({ ...formData, aadhar_card_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                      placeholder="12 digits"
                      maxLength={12}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Aadhar Card Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.aadhar_card_name}
                      onChange={(e) => setFormData({ ...formData, aadhar_card_name: e.target.value })}
                      placeholder="Name as per Aadhar Card"
                    />
                  </div>

                  {/* Bank Details */}
                  <div className="col-md-6">
                    <label className="form-label">Bank Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Account Number <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '') })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Account Holder Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.account_holder_name}
                      onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Account Type <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={formData.account_type}
                      onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                      required
                    >
                      {ACCOUNT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">IFSC Code <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.ifsc_code}
                      onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                      placeholder="HDFC0001234"
                      maxLength={11}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Branch Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.branch_name}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Bank Address <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      value={formData.bank_address}
                      onChange={(e) => setFormData({ ...formData, bank_address: e.target.value })}
                      rows={2}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">City <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">State <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
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
                  <div className="col-md-4">
                    <label className="form-label">PIN Code <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder="6 digits"
                      maxLength={6}
                      required
                    />
                  </div>

                  {/* Status Fields */}
                  <div className="col-md-6">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={formData.is_primary}
                        onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                      />
                      <label className="form-check-label">Primary Account</label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      />
                      <label className="form-check-label">Active</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
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
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeBankInfoOverview;
