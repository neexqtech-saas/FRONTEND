/**
 * Employee Payroll Overview Component
 * Shows all employees' payroll configurations in a table format
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getAdminIdForApi, getAuthHeaders, getSelectedSiteId } from '../../../../core/utils/apiHelpers';
import { BACKEND_PATH } from '../../../../environment';

interface EmployeePayrollConfig {
  id: number;
  employee_id: string;
  salary_structure: number;
  effective_month: number;
  effective_year: number;
  gross_salary: string;
  gross_salary_monthly?: string;
  earnings: Array<{ component: string; amount: string }>;
  deductions: Array<{ component: string; amount: string }>;
  total_earnings: string;
  total_deductions: string;
  net_pay: string;
}

interface EmployeeData {
  employee_id: string;
  employee_name?: string;
  custom_employee_id?: string;
  designation?: string;
  config?: EmployeePayrollConfig;
}

const EmployeePayrollOverview: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchEmployeePayrollData();
  }, [month, year]);

  const fetchEmployeePayrollData = async () => {
    try {
      setLoading(true);
      const adminId = getAdminIdForApi();
      if (!adminId) {
        toast.error('Admin ID not found');
        return;
      }

      // Fetch all employee payroll configs for current month/year
      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}payroll/employee-payroll-config/${site_id}/?effective_month=${month}&effective_year=${year}`;
      if (role === "organization" && adminId) {
        url += `&admin_id=${adminId}`;
      }
      const response = await axios.get(url, getAuthHeaders());

      if (response.data.status) {
        const configs = response.data.data || [];
        
        // Fetch all employees to show even those without config
        const site_id = getSelectedSiteId();
        if (!site_id) {
          toast.error("Please select a site first");
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

        // Add configs to employees
        configs.forEach((config: EmployeePayrollConfig) => {
          const employeeData = employeesMap.get(config.employee_id);
          if (employeeData) {
            employeeData.config = config;
          } else {
            // Employee not in list, add them
            allEmployees.push({
              employee_id: config.employee_id,
              employee_name: 'N/A',
              custom_employee_id: 'N/A',
              designation: 'N/A',
              config,
            });
          }
        });

        setEmployees(allEmployees);
      } else {
        toast.error(response.data.message || 'Failed to fetch employee payroll data');
      }
    } catch (error: any) {
      console.error('Error fetching employee payroll data:', error);
      toast.error(error.response?.data?.message || 'Error fetching employee payroll data');
    } finally {
      setLoading(false);
    }
  };

  // Get all unique earnings components
  const getAllEarningsComponents = (): string[] => {
    const componentsSet = new Set<string>();
    employees.forEach((emp) => {
      if (emp.config?.earnings) {
        emp.config.earnings.forEach((earning) => {
          componentsSet.add(earning.component);
        });
      }
    });
    return Array.from(componentsSet).sort();
  };

  // Get all unique deductions components
  const getAllDeductionsComponents = (): string[] => {
    const componentsSet = new Set<string>();
    employees.forEach((emp) => {
      if (emp.config?.deductions) {
        emp.config.deductions.forEach((deduction) => {
          componentsSet.add(deduction.component);
        });
      }
    });
    return Array.from(componentsSet).sort();
  };

  // Filter employees based on search query
  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    return (
      emp.employee_name?.toLowerCase().includes(query) ||
      emp.custom_employee_id?.toLowerCase().includes(query) ||
      emp.designation?.toLowerCase().includes(query)
    );
  });

  // Format currency
  const formatCurrency = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num || 0);
  };

  const earningsComponents = getAllEarningsComponents();
  const deductionsComponents = getAllDeductionsComponents();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="employee-payroll-overview">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">Employee Payroll Overview</h5>
          <div className="d-flex gap-2">
            <select
              className="form-select form-select-sm"
              style={{ width: '150px' }}
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
            >
              {monthNames.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="form-select form-select-sm"
              style={{ width: '120px' }}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <button
              className="btn btn-sm btn-primary"
              onClick={fetchEmployeePayrollData}
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
              placeholder="Search by employee name, ID, or designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: '400px' }}
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
                    <th>Monthly Gross Salary</th>
                    {earningsComponents.map((component) => (
                      <th key={`earning-${component}`} className="text-success">
                        {component.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </th>
                    ))}
                    <th className="text-success">Total Earnings</th>
                    {deductionsComponents.map((component) => (
                      <th key={`deduction-${component}`} className="text-danger">
                        {component.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </th>
                    ))}
                    <th className="text-danger">Total Deductions</th>
                    <th className="text-primary fw-bold">Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={5 + earningsComponents.length + deductionsComponents.length} className="text-center py-4">
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
                        className={!employee.config ? 'table-warning' : ''}
                      >
                        <td>{employee.custom_employee_id || 'N/A'}</td>
                        <td>{employee.employee_name || 'N/A'}</td>
                        <td>{employee.designation || 'N/A'}</td>
                        <td>
                          {employee.config
                            ? formatCurrency(employee.config.gross_salary_monthly || employee.config.gross_salary)
                            : <span className="text-muted">Not Assigned</span>}
                        </td>
                        {earningsComponents.map((component) => {
                          const earning = employee.config?.earnings.find((e) => e.component === component);
                          return (
                            <td key={`earning-${component}`} className="text-success">
                              {earning ? formatCurrency(earning.amount) : '-'}
                            </td>
                          );
                        })}
                        <td className="text-success fw-semibold">
                          {employee.config ? formatCurrency(employee.config.total_earnings) : '-'}
                        </td>
                        {deductionsComponents.map((component) => {
                          const deduction = employee.config?.deductions.find((d) => d.component === component);
                          return (
                            <td key={`deduction-${component}`} className="text-danger">
                              {deduction ? formatCurrency(deduction.amount) : '-'}
                            </td>
                          );
                        })}
                        <td className="text-danger fw-semibold">
                          {employee.config ? formatCurrency(employee.config.total_deductions) : '-'}
                        </td>
                        <td className="text-primary fw-bold">
                          {employee.config ? formatCurrency(employee.config.net_pay) : '-'}
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
                    With Config: {filteredEmployees.filter((e) => e.config).length}
                  </span>
                  <span className="badge bg-warning ms-2">
                    Without Config: {filteredEmployees.filter((e) => !e.config).length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeePayrollOverview;