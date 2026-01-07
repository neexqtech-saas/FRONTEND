/**
 * Employee Advance List Component
 * Displays all employee advances in a table with filters
 */

import React, { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Table from "../../../../core/common/dataTable/index";
import { getAdminIdForApi, getAuthHeaders } from "../../../../core/utils/apiHelpers";
import { employeeAdvanceAPI } from "../../structure/utils/api";
import EmployeeAdvanceModal from "./EmployeeAdvanceModal";
import "./EmployeeAdvanceList.scss";

interface EmployeeAdvance {
  id: number;
  employee_id: string;
  employee_name?: string;
  custom_employee_id?: string;
  advance_amount: string | number;
  request_date: string;
  purpose?: string;
  status: 'active' | 'partially_paid' | 'settled' | 'cancelled';
  paid_amount: string | number;
  remaining_amount: string | number;
  is_settled: boolean;
  settlement_date?: string;
  notes?: string;
  attachment?: string;
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: string;
  user_name?: string;
  custom_employee_id?: string;
  email?: string;
}

const EmployeeAdvanceList: React.FC = () => {
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<EmployeeAdvance | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchEmployees = useCallback(async () => {
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) return;

      const site_id = sessionStorage.getItem("selected_site_id");
      if (!site_id) return;
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/staff-list/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      const response = await fetch(
        url,
        getAuthHeaders()
      );
      const data = await response.json();

      let employeesData: any[] = [];
      if (data?.results && Array.isArray(data.results)) {
        employeesData = data.results;
      } else if (data?.data?.results && Array.isArray(data.data.results)) {
        employeesData = data.data.results;
      } else if (Array.isArray(data)) {
        employeesData = data;
      }

      const activeEmployees = employeesData
        .filter((emp: any) => emp.is_active !== false && emp.user?.is_active !== false)
        .map((emp: any) => ({
          id: emp.user?.id || emp.id || emp.user_id,
          user_name: emp.user_name || emp.user?.username,
          custom_employee_id: emp.custom_employee_id,
          email: emp.email || emp.user?.email,
        }));

      setEmployees(activeEmployees);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
    }
  }, []);

  const fetchAdvances = useCallback(async () => {
    setLoading(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        setLoading(false);
        return;
      }

      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };

      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (employeeFilter) params.employee_id = employeeFilter;

      const response = await employeeAdvanceAPI.list(admin_id, params);

      if (response.status && response.data) {
        setAdvances(response.data.results || []);
        if (response.data.pagination) {
          setTotalCount(response.data.pagination.total_count || 0);
          setTotalPages(response.data.pagination.total_pages || 0);
        }
      } else {
        setAdvances([]);
        setTotalCount(0);
        setTotalPages(0);
      }
    } catch (error: any) {
      console.error("Error fetching advances:", error);
      toast.error("Failed to fetch advances");
      setAdvances([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, statusFilter, employeeFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchAdvances();
  }, [fetchAdvances]);

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingAdvance(null);
    setModalVisible(true);
  };

  const handleView = (advance: EmployeeAdvance) => {
    setEditingAdvance(advance);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingAdvance(null);
  };

  const handleModalSuccess = () => {
    fetchAdvances();
    toast.success(editingAdvance ? "Advance updated successfully" : "Advance created successfully");
    handleModalClose();
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { class: string; label: string } } = {
      active: { class: "bg-primary", label: "Active" },
      partially_paid: { class: "bg-warning", label: "Partially Paid" },
      settled: { class: "bg-success", label: "Settled" },
      cancelled: { class: "bg-danger", label: "Cancelled" },
    };
    const statusInfo = statusMap[status] || { class: "bg-secondary", label: status };
    return (
      <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>
    );
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const columns = [
    {
      title: "Employee ID",
      key: "custom_employee_id",
      render: (record: EmployeeAdvance) => (
        <span className="fw-bold">
          {record.custom_employee_id || record.employee_id?.slice(0, 8) || "N/A"}
        </span>
      ),
    },
    {
      title: "Employee Name",
      key: "employee_name",
      render: (record: EmployeeAdvance) => (
        <span className="fw-bold">{record.employee_name || "-"}</span>
      ),
    },
    {
      title: "Advance Amount",
      key: "advance_amount",
      render: (record: EmployeeAdvance) => (
        <span className="fw-bold text-primary">{formatCurrency(record.advance_amount)}</span>
      ),
    },
    {
      title: "Paid Amount",
      key: "paid_amount",
      render: (record: EmployeeAdvance) => formatCurrency(record.paid_amount),
    },
    {
      title: "Remaining",
      key: "remaining_amount",
      render: (record: EmployeeAdvance) => (
        <span className={parseFloat(record.remaining_amount.toString()) > 0 ? "text-danger fw-bold" : "text-success"}>
          {formatCurrency(record.remaining_amount)}
        </span>
      ),
    },
    {
      title: "Request Date",
      key: "request_date",
      render: (record: EmployeeAdvance) => formatDate(record.request_date),
    },
    {
      title: "Status",
      key: "status",
      render: (record: EmployeeAdvance) => getStatusBadge(record.status),
    },
    {
      title: "Action",
      key: "action",
      render: (record: EmployeeAdvance) => (
        <button
          className="btn btn-sm btn-primary"
          onClick={() => handleView(record)}
        >
          <i className="ti ti-eye me-1"></i>
          View
        </button>
      ),
    },
  ];

  return (
    <div className="employee-advance-list-container">
      <ToastContainer />
      
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Employee Advances</h5>
            <p className="text-muted mb-0">Manage employee advance requests and payments</p>
          </div>
          <button 
            className="btn btn-primary advance-btn" 
            onClick={handleAdd}
            type="button"
          >
            <i className="ti ti-plus me-1"></i>
            Advance
          </button>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="ti ti-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by employee name or ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="settled">Settled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={employeeFilter}
                onChange={(e) => {
                  setEmployeeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.user_name || emp.custom_employee_id || emp.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2 text-end">
              <span className="text-muted">
                Total: {totalCount}
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
            <>
              <div className="table-responsive-wrapper">
                <Table
                  columns={columns}
                  dataSource={advances}
                  Selection={false}
                />
              </div>

              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div>
                    <span className="text-muted">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  <div>
                    <button
                      className="btn btn-sm btn-outline-primary me-2"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalVisible && (
        <EmployeeAdvanceModal
          advance={editingAdvance}
          employees={employees}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default EmployeeAdvanceList;
