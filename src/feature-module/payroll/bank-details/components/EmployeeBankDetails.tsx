/**
 * Employee Bank Details Component
 * Displays all employees with their bank details in a table
 * Allows adding/editing bank details
 */

import React, { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import Table from "../../../../core/common/dataTable/index";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import { bankDetailsAPI } from "../../structure/utils/api";
import BankDetailsModal from "./BankDetailsModal";
import "./EmployeeBankDetails.scss";

interface BankDetail {
  id?: number;
  employee_id: string;
  employee_email: string;
  employee_name?: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name?: string;
  account_type: 'savings' | 'current';
  aadhaar_number?: string;
  pan_number?: string;
  is_active: boolean;
}

interface Employee {
  id?: string;
  user?: {
    id: string;
    email?: string;
  };
  email?: string;
  user_name?: string;
  custom_employee_id?: string;
  profile_photo?: string;
  user_id?: string;
}

const EmployeeBankDetails: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bankDetails, setBankDetails] = useState<{ [key: string]: BankDetail }>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("access_token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        setLoading(false);
        return;
      }

      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) return;
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/staff-list/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      const response = await axios.get(
        url,
        getAuthHeaders()
      );

      let employeesData: any[] = [];
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        employeesData = response.data.results;
      } else if (response.data && response.data.data) {
        if (Array.isArray(response.data.data)) {
          employeesData = response.data.data;
        } else if (response.data.data.results && Array.isArray(response.data.data.results)) {
          employeesData = response.data.data.results;
        }
      } else if (Array.isArray(response.data)) {
        employeesData = response.data;
      } else if (Array.isArray(response)) {
        employeesData = response;
      }

      // Filter only active employees and normalize the structure
      const activeEmployees = (employeesData || [])
        .filter((emp: any) => {
          return emp.is_active !== false && emp.user?.is_active !== false;
        })
        .map((emp: any) => {
          // Normalize employee structure - ensure ID is accessible
          return {
            ...emp,
            id: emp.user?.id || emp.id || emp.user_id,
            email: emp.email || emp.user?.email
          };
        });

      setEmployees(activeEmployees);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBankDetails = useCallback(async () => {
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        return;
      }

      const response = await bankDetailsAPI.list(admin_id);

      // Create a map of employee_id -> bank_detail
      const bankDetailsMap: { [key: string]: BankDetail } = {};
      
      // Handle response format: { message, data, status }
      const data = response?.data || response;
      
      if (Array.isArray(data)) {
        data.forEach((detail: BankDetail) => {
          if (detail.employee_id) {
            bankDetailsMap[detail.employee_id] = detail;
          }
        });
      }

      setBankDetails(bankDetailsMap);
    } catch (error: any) {
      console.error("Error fetching bank details:", error);
      // Don't show error toast as it's okay if no bank details exist
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchBankDetails();
  }, [fetchEmployees, fetchBankDetails]);

  // Helper to get employee ID from various structures
  const getEmployeeId = (employee: Employee): string | null => {
    return employee.user?.id || employee.id || employee.user_id || null;
  };

  // Helper to get employee email
  const getEmployeeEmail = (employee: Employee): string => {
    return employee.email || employee.user?.email || "";
  };

  const handleEdit = (employee: Employee) => {
    const employeeId = getEmployeeId(employee);
    if (!employeeId) {
      toast.error("Employee ID not found");
      console.error("Employee object:", employee);
      return;
    }
    
    // Create a normalized employee object with correct ID
    const normalizedEmployee: Employee = {
      ...employee,
      id: employeeId,
      email: getEmployeeEmail(employee)
    };
    
    setEditingEmployee(normalizedEmployee);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingEmployee(null);
  };

  const handleModalSuccess = () => {
    fetchBankDetails();
    toast.success("Bank details saved successfully");
    handleModalClose();
  };

  // Get employee name
  const getEmployeeName = (employee: Employee): string => {
    if (!employee) return "Unknown";
    if (employee.user_name) return employee.user_name;
    const email = getEmployeeEmail(employee);
    if (email) return email.split("@")[0];
    return "Unknown";
  };

  // Filter employees based on search query
  const filteredEmployees = employees.filter((emp) => {
    if (!emp) return false;
    
    const name = getEmployeeName(emp)?.toLowerCase() || "";
    const email = getEmployeeEmail(emp)?.toLowerCase() || "";
    const customId = emp.custom_employee_id?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    
    return name.includes(query) || email.includes(query) || customId.includes(query);
  });

  // Get bank detail for modal
  const getModalBankDetail = (): BankDetail | undefined => {
    if (!editingEmployee) return undefined;
    const employeeId = getEmployeeId(editingEmployee);
    if (!employeeId) return undefined;
    return bankDetails[employeeId];
  };

  // Table columns
  const columns = [
    {
      title: "Employee ID",
      dataIndex: "custom_employee_id",
      key: "custom_employee_id",
      render: (text: string, record: Employee) => {
        if (!record) return <span className="fw-bold">N/A</span>;
        const empId = getEmployeeId(record);
        return (
          <span className="fw-bold">
            {record.custom_employee_id || empId?.slice(0, 8) || "N/A"}
          </span>
        );
      },
    },
    {
      title: "Employee Name",
      dataIndex: "user_name",
      key: "user_name",
      render: (text: string, record: Employee) => {
        if (!record) return <span className="fw-bold">Unknown</span>;
        return (
          <div className="d-flex align-items-center">
            {record.profile_photo && (
              <img
                src={record.profile_photo}
                alt={getEmployeeName(record)}
                className="rounded-circle me-2"
                style={{ width: "32px", height: "32px", objectFit: "cover" }}
              />
            )}
            <span className="fw-bold">{getEmployeeName(record)}</span>
          </div>
        );
      },
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (text: string, record: Employee) => <span>{getEmployeeEmail(record) || "-"}</span>,
    },
    {
      title: "Bank Name",
      key: "bank_name",
      render: (record: Employee) => {
        const empId = getEmployeeId(record);
        if (!record || !empId) return <span className="text-muted">-</span>;
        const detail = bankDetails[empId];
        return <span>{detail?.bank_name || <span className="text-muted">-</span>}</span>;
      },
    },
    {
      title: "Account Number",
      key: "account_number",
      render: (record: Employee) => {
        const empId = getEmployeeId(record);
        if (!record || !empId) return <span className="text-muted">-</span>;
        const detail = bankDetails[empId];
        return <span>{detail?.account_number || <span className="text-muted">-</span>}</span>;
      },
    },
    {
      title: "IFSC Code",
      key: "ifsc_code",
      render: (record: Employee) => {
        const empId = getEmployeeId(record);
        if (!record || !empId) return <span className="text-muted">-</span>;
        const detail = bankDetails[empId];
        return <span>{detail?.ifsc_code || <span className="text-muted">-</span>}</span>;
      },
    },
    {
      title: "PAN Number",
      key: "pan_number",
      render: (record: Employee) => {
        const empId = getEmployeeId(record);
        if (!record || !empId) return <span className="text-muted">-</span>;
        const detail = bankDetails[empId];
        return <span>{detail?.pan_number || <span className="text-muted">-</span>}</span>;
      },
    },
    {
      title: "Status",
      key: "status",
      render: (record: Employee) => {
        const empId = getEmployeeId(record);
        if (!record || !empId) return <span className="badge bg-warning">Not Added</span>;
        const detail = bankDetails[empId];
        if (!detail) {
          return <span className="badge bg-warning">Not Added</span>;
        }
        return (
          <span className={`badge ${detail.is_active ? "bg-success" : "bg-danger"}`}>
            {detail.is_active ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      render: (record: Employee) => {
        const empId = getEmployeeId(record);
        if (!record || !empId) return null;
        return (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => handleEdit(record)}
          >
            <i className="ti ti-edit me-1"></i>
            {bankDetails[empId] ? "Edit" : "Add"}
          </button>
        );
      },
    },
  ];

  return (
    <div className="employee-bank-details-container">
      <ToastContainer />
      
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Employee Bank Details</h5>
          <p className="text-muted mb-0">Manage bank and KYC details for all employees</p>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="ti ti-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, email, or employee ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6 text-end">
              <span className="text-muted">
                Total Employees: {filteredEmployees.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <Table
                columns={columns}
                dataSource={filteredEmployees}
                Selection={false}
              />
            </div>
          )}
        </div>
      </div>

      {modalVisible && editingEmployee && getEmployeeId(editingEmployee) && (
        <BankDetailsModal
          employee={editingEmployee}
          bankDetail={getModalBankDetail()}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default EmployeeBankDetails;
