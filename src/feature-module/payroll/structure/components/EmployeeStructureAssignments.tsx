/**
 * Employee Structure Assignments Component
 * Assign salary structures to employees - Inline assignment in table
 */

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import Table from "../../../../core/common/dataTable/index";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import { employeeStructureAssignmentAPI } from "../utils/api";
import { all_routes } from "../../../../feature-module/router/all_routes";
import AssignStructureModal from "../modals/AssignStructureModal";

const EmployeeStructureAssignments: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<{ [key: string]: any[] }>({}); // employee_id -> array of assignments
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingAssignment, setEditingAssignment] = useState<{ employeeId: string; assignment?: any } | null>(null);
  const [viewingAssignments, setViewingAssignments] = useState<{ employeeId: string; employeeName: string } | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<{ employeeId: string; assignment: any; employeeName: string } | null>(null);
  const [viewingAssignmentDetails, setViewingAssignmentDetails] = useState<any>(null);
  const [loadingViewDetails, setLoadingViewDetails] = useState(false);
  const [formData, setFormData] = useState<{ structure_id: string; gross_salary: string; effective_month: string; effective_year: string }>({
    structure_id: "",
    gross_salary: "",
    effective_month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    effective_year: new Date().getFullYear().toString(),
  });

  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

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
      if (!site_id) {
        setLoading(false);
        return;
      }
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/staff-list/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      const response = await axios.get(
        url,
        getAuthHeaders()
      );

      let employeesData = [];
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
      }

      // Filter only active employees
      const activeEmployees = (employeesData || []).filter((emp: any) => {
        // Check if employee is active (you may need to adjust this based on your data structure)
        return emp.is_active !== false && emp.user?.is_active !== false;
      });

      setEmployees(activeEmployees);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStructures = useCallback(async () => {
    try {
      const role = sessionStorage.getItem("role");
      let organizationId: string | null = null;

      if (role === "organization") {
        organizationId = sessionStorage.getItem("user_id");
      } else if (role === "admin") {
        const adminId = getAdminIdForApi();
        if (!adminId) return;
        organizationId = adminId;
      } else {
        return;
      }

      if (!organizationId) return;

      const response = await axios.get(
        `http://127.0.0.1:8000/api/payroll/structure/${organizationId}`,
        getAuthHeaders()
      );

      if (response?.data?.status === 200 && response?.data?.data) {
        const structuresList = Array.isArray(response.data.data) ? response.data.data : [];
        // Filter only active structures
        const activeStructures = structuresList.filter((s: any) => s.is_active === true);
        setStructures(activeStructures);
      }
    } catch (error: any) {
      console.error("Error fetching structures:", error);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        return;
      }

      const response = await employeeStructureAssignmentAPI.listAll(admin_id);
      
      if (response?.status === 200 && response?.data) {
        // Group assignments by employee_id
        const groupedAssignments: { [key: string]: any[] } = {};
        
        response.data.forEach((assignment: any) => {
          const employeeId = assignment.employee_id || assignment.employee?.id || assignment.employee;
          if (employeeId) {
            if (!groupedAssignments[employeeId]) {
              groupedAssignments[employeeId] = [];
            }
            // Convert effective_month and effective_year to effective_from date for compatibility
            const effectiveFrom = `${assignment.effective_year}-${String(assignment.effective_month).padStart(2, '0')}-01`;
            
            // Map structure_name to structure.name for backward compatibility
            const mappedAssignment = {
              ...assignment,
              effective_from: effectiveFrom,
              structure: {
                id: assignment.structure_id || assignment.structure?.id,
                name: assignment.structure_name || assignment.structure?.name || "N/A",
              },
            };
            
            groupedAssignments[employeeId].push(mappedAssignment);
          }
        });
        
        console.log("Assignments grouped:", groupedAssignments);
        setAssignments(groupedAssignments);
      } else {
        console.error("Failed to fetch assignments:", response);
      }
    } catch (error: any) {
      console.error("Error fetching assignments:", error);
      // Don't show error toast on initial load, just log it
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchStructures();
    fetchAssignments();
  }, [fetchEmployees, fetchStructures, fetchAssignments]);

  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);

  const handleOpenEditModal = async (employeeId: string, assignment?: any) => {
    if (assignment?.id) {
      // Load full assignment data with component toggles and values
      setLoadingAssignment(true);
      try {
        const admin_id = getAdminIdForApi();
        if (!admin_id) {
          toast.error("Admin ID not found.");
          setLoadingAssignment(false);
          return;
      }
      
        const response = await employeeStructureAssignmentAPI.get(admin_id, employeeId, assignment.id);
        if (response?.status === 200 && response?.data) {
          const assignmentData = response.data;
          
          // Map employee_components to component_toggles and component_values
          // Backend now provides component_toggles and component_values directly,
          // but we also keep employee_components for detailed component info
          if (assignmentData.employee_components && Array.isArray(assignmentData.employee_components)) {
            // Ensure component_toggles and component_values are populated from employee_components
            // if not already provided by backend
            if (!assignmentData.component_toggles || Object.keys(assignmentData.component_toggles).length === 0) {
              const toggles: { [key: number]: boolean } = {};
              assignmentData.employee_components.forEach((empComp: any) => {
                const compId = empComp.component_id || empComp.component?.id;
                if (compId) {
                  toggles[compId] = empComp.is_enabled !== false; // Default to true if not set
                }
              });
              assignmentData.component_toggles = toggles;
            }
            
            if (!assignmentData.component_values || Object.keys(assignmentData.component_values).length === 0) {
              const values: { [key: number]: number } = {};
              assignmentData.employee_components.forEach((empComp: any) => {
                const compId = empComp.component_id || empComp.component?.id;
                if (compId && empComp.component_value_override !== null && empComp.component_value_override !== undefined) {
                  values[compId] = parseFloat(empComp.component_value_override) || 0;
                }
              });
              // Only set if we have override values
              if (Object.keys(values).length > 0) {
                assignmentData.component_values = values;
              }
            }
          }
          
          setSelectedAssignment({
            ...assignmentData,
            employee_id: employeeId,
          });
          setEditingAssignment({ employeeId, assignment: assignmentData });
    } else {
          // Fallback to basic assignment data
          setSelectedAssignment({
            ...assignment,
            employee_id: employeeId,
          });
          setEditingAssignment({ employeeId, assignment });
        }
      } catch (error: any) {
        console.error("Error loading assignment:", error);
        // Fallback to basic assignment data
        setSelectedAssignment({
          ...assignment,
          employee_id: employeeId,
        });
        setEditingAssignment({ employeeId, assignment });
      } finally {
        setLoadingAssignment(false);
      }
    } else {
      // New assignment
      setSelectedAssignment({
        employee_id: employeeId,
      });
      setEditingAssignment({ employeeId, assignment: undefined });
    }
  };

  const handleCloseEditModal = () => {
    setEditingAssignment(null);
    setSelectedAssignment(null);
    const today = new Date();
    setFormData({
      structure_id: "",
      gross_salary: "",
      effective_month: (today.getMonth() + 1).toString().padStart(2, '0'),
      effective_year: today.getFullYear().toString(),
    });
  };

  const handleSaveAssignment = async (submitData: any) => {
    if (!editingAssignment) return;

    const { employeeId } = editingAssignment;

    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        toast.error("Admin ID not found.");
        return;
      }

      const employeeAssignments = getEmployeeAssignments(employeeId);
      const effective_month = submitData.effective_month;
      const effective_year = submitData.effective_year;
      
      // Check if assignment with same effective_month/year already exists
      const existingAssignment = employeeAssignments.find(
        (a: any) => {
          return a.effective_month === effective_month && a.effective_year === effective_year;
        }
      );
      const isUpdate = !!existingAssignment?.id && !!submitData.id;

      const data: any = {
        structure_id: submitData.structure_id,
        gross_salary: submitData.gross_salary,
        effective_month: effective_month,
        effective_year: effective_year,
      };

      // Include component overrides if provided
      if (submitData.component_toggles) {
        data.component_toggles = submitData.component_toggles;
      }
      if (submitData.component_values) {
        data.component_values = submitData.component_values;
      }

      let response;
      if (isUpdate && existingAssignment.id) {
        // Update existing assignment
        response = await employeeStructureAssignmentAPI.update(admin_id, employeeId, existingAssignment.id, data);
      } else {
        // Create new assignment
        response = await employeeStructureAssignmentAPI.create(admin_id, employeeId, data);
      }

      if (response?.status === 200 || response?.status === 201) {
        // Refresh assignments after successful save
        await fetchAssignments();
        handleCloseEditModal();
        toast.success(`Structure ${isUpdate ? "updated" : "assigned"} successfully`);
      } else {
        // Refresh assignments even on error to show existing assignment
        await fetchAssignments();
        toast.error(response?.message || "Failed to save assignment");
      }
    } catch (error: any) {
      console.error("Error saving assignment:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to save assignment";
      // Refresh assignments on error to show existing assignment (in case of duplicate)
      await fetchAssignments();
      toast.error(errorMessage);
    }
  };

  const handleRemoveAssignment = async (employeeId: string, assignmentId: number) => {
    if (!window.confirm("Are you sure you want to remove this structure assignment?")) return;

    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        toast.error("Admin ID not found.");
        return;
      }

      const response = await employeeStructureAssignmentAPI.delete(admin_id, employeeId, assignmentId);

      if (response?.status === 200) {
        // Refresh assignments after successful delete
        await fetchAssignments();
        toast.success("Structure assignment removed successfully");
      } else {
        toast.error(response?.message || "Failed to remove assignment");
      }
    } catch (error: any) {
      console.error("Error removing assignment:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to remove assignment";
      toast.error(errorMessage);
    }
  };

  const getEmployeeId = (employee: any) => {
    return employee.user?.id || employee.id || employee.user_id;
  };

  const getEmployeeName = (employee: any) => {
    return employee.user_name || employee.user?.username || employee.user?.email || employee.email || "N/A";
  };

  const getEmployeeEmpId = (employee: any) => {
    return employee.emp_id || employee.employee_id || employee.user?.emp_id || getEmployeeId(employee);
  };

  const getEmployeeCustomId = (employee: any) => {
    return employee.custom_employee_id || employee.custom_id || employee.employee_code || getEmployeeEmpId(employee);
  };

  const getEmployeeUserType = (employee: any) => {
    return employee.user_type || employee.user?.user_type || employee.role || employee.user?.role || "N/A";
  };

  const getEmployeeDesignation = (employee: any) => {
    return employee.designation || employee.user?.designation || "N/A";
  };

  const getEmployeeAssignments = (employeeId: string) => {
    return assignments[employeeId] || [];
  };

  const getActiveAssignment = (employeeId: string) => {
    const employeeAssignments = getEmployeeAssignments(employeeId);
    if (employeeAssignments.length === 0) return null;
    
    // Return the most recent assignment (sorted by effective_from descending)
    return employeeAssignments.sort((a: any, b: any) => {
      return new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime();
    })[0];
  };

  const filteredEmployees = employees.filter((employee: any) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const empId = getEmployeeEmpId(employee)?.toString() || "";
    const customId = getEmployeeCustomId(employee)?.toString() || "";
    const name = getEmployeeName(employee)?.toLowerCase() || "";
    const userType = getEmployeeUserType(employee)?.toLowerCase() || "";
    const designation = getEmployeeDesignation(employee)?.toLowerCase() || "";
    const employeeAssignments = getEmployeeAssignments(getEmployeeId(employee));
    const structureNames = employeeAssignments.map((a: any) => a.structure?.name?.toLowerCase() || "").join(" ");

    return (
      empId.includes(searchLower) ||
      customId.includes(searchLower) ||
      name.includes(searchLower) ||
      userType.includes(searchLower) ||
      designation.includes(searchLower) ||
      structureNames.includes(searchLower)
    );
  });

  const columns = [
    {
      title: "Emp ID",
      dataIndex: "emp_id",
      render: (_: any, record: any) => {
        const empId = getEmployeeEmpId(record);
        return <span className="fw-bold">{empId || "N/A"}</span>;
      },
    },
    {
      title: "Employee Name",
      dataIndex: "name",
      render: (_: any, record: any) => {
        return <span className="fw-bold">{getEmployeeName(record)}</span>;
      },
    },
    {
      title: "Custom Employee ID",
      dataIndex: "custom_employee_id",
      render: (_: any, record: any) => {
        return <span>{getEmployeeCustomId(record) || "N/A"}</span>;
      },
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (_: any, record: any) => {
        const userType = getEmployeeUserType(record);
        return (
          <span className="badge bg-info">
            {userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : "N/A"}
          </span>
        );
      },
    },
    {
      title: "Designation",
      dataIndex: "designation",
      render: (_: any, record: any) => {
        return <span>{getEmployeeDesignation(record)}</span>;
      },
    },
    {
      title: "Structure",
      dataIndex: "structure",
      render: (_: any, record: any) => {
        const employeeId = getEmployeeId(record);
        const employeeAssignments = getEmployeeAssignments(employeeId);
        const activeAssignment = getActiveAssignment(employeeId);

        if (employeeAssignments.length > 0) {
          const activeAssignment = getActiveAssignment(employeeId);
          return (
            <div className="d-flex flex-column gap-1">
              {activeAssignment && (
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold text-dark">
                    {activeAssignment.structure?.name || "N/A"}
                  </span>
                </div>
              )}
              {employeeAssignments.length > 1 && (
                <button
                  className="btn btn-sm btn-link text-primary p-0 text-start"
                  onClick={() => setViewingAssignments({ employeeId, employeeName: getEmployeeName(record) })}
                  style={{ fontSize: "0.875rem", textDecoration: "none" }}
                >
                  <i className="ti ti-eye me-1" />
                  View All ({employeeAssignments.length})
                </button>
              )}
            </div>
          );
        }

        return (
          <span className="text-muted">-</span>
        );
      },
    },
    {
      title: "Assign Pay Details",
      dataIndex: "assign_pay_details",
      render: (_: any, record: any) => {
        const employeeId = getEmployeeId(record);
        const activeAssignment = getActiveAssignment(employeeId);

        if (activeAssignment) {
          const grossSalary = parseFloat(activeAssignment.gross_salary?.toString() || "0");
          const payrollBreakdown = activeAssignment.payroll_breakdown;
          const netPay = payrollBreakdown?.net_pay || 0;
          const totalEarnings = payrollBreakdown?.total_earnings || 0;
          const totalDeductions = payrollBreakdown?.total_deductions || 0;

          return (
            <div className="d-flex flex-column gap-1">
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">Gross:</span>
                <span className="fw-semibold text-primary">
                  ₹{grossSalary.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              {payrollBreakdown && (
                <>
                  {totalEarnings > 0 && (
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted small">Earnings:</span>
                      <span className="fw-semibold text-success">
                        ₹{parseFloat(totalEarnings.toString()).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  {totalDeductions > 0 && (
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted small">Deductions:</span>
                      <span className="fw-semibold text-danger">
                        ₹{parseFloat(totalDeductions.toString()).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  {netPay > 0 && (
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted small">Net Pay:</span>
                      <span className="fw-bold text-dark">
                        ₹{parseFloat(netPay.toString()).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        }

        return (
          <span className="text-muted">-</span>
        );
      },
    },
    {
      title: "Actions",
      dataIndex: "actions",
      render: (_: any, record: any) => {
        const employeeId = getEmployeeId(record);
        const employeeAssignments = getEmployeeAssignments(employeeId);
        const activeAssignment = getActiveAssignment(employeeId);

        return (
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleOpenEditModal(employeeId, activeAssignment || undefined)}
            >
              <i className="ti ti-edit me-1" />
              {activeAssignment ? "Edit" : "Assign"}
            </button>
            {employeeAssignments.length > 0 && (
              <button
                className="btn btn-sm btn-outline-info"
                onClick={() => setViewingAssignments({ employeeId, employeeName: getEmployeeName(record) })}
                title="View All Assignments"
              >
                <i className="ti ti-list" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-4">
            <div className="my-auto mb-2">
              <h2 className="mb-1 fw-bold">
                <i className="ti ti-users me-2 text-primary" />
                Assign Structure to Employees
              </h2>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <a href="#" className="text-muted">
                      <i className="ti ti-smart-home" />
                    </a>
                  </li>
                  <li className="breadcrumb-item">
                    <a href="#" className="text-muted">Payroll</a>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Assign Structure
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <div className="input-group" style={{ width: "350px" }}>
                <span className="input-group-text bg-white border-end-0">
                  <i className="ti ti-search text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by employee, structure, or designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom py-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="mb-0 fw-semibold">
                    <i className="ti ti-list me-2 text-primary" />
                    Employee Structure Assignments
                  </h5>
                  <p className="text-muted small mb-0 mt-1">
                    <i className="ti ti-info-circle me-1" />
                    <strong>Note:</strong> You are creating a <strong className="text-primary">Yearly Gross Salary</strong> assignment. The gross salary you enter will be treated as the annual amount. Employees can have different structures for different months/years.
                  </p>
                </div>
                <span className="badge bg-primary-subtle text-primary">
                  {filteredEmployees.length} {filteredEmployees.length === 1 ? "Employee" : "Employees"}
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="p-5 text-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading employees...</p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-5 text-center">
                  <div className="mb-3">
                    <i className="ti ti-inbox" style={{ fontSize: "64px", color: "#dee2e6" }} />
                  </div>
                  <h6 className="text-muted mb-2">No employees found</h6>
                  <p className="text-muted small mb-0">
                    {searchQuery ? "Try adjusting your search criteria" : "No employees available for assignment"}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table columns={columns} dataSource={filteredEmployees} Selection={false} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Structure Modal */}
      {editingAssignment && !loadingAssignment && (
        <AssignStructureModal
          isOpen={!!editingAssignment}
          onClose={handleCloseEditModal}
          onSubmit={handleSaveAssignment}
          assignment={selectedAssignment}
          employees={employees}
          structures={structures}
          totalAssignments={editingAssignment ? getEmployeeAssignments(editingAssignment.employeeId).length : 0}
        />
      )}

      {loadingAssignment && (
        <div
          className="modal fade show"
          style={{ display: "block", zIndex: 1055, backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
              </div>
                <p className="mt-3 text-muted">Loading assignment data...</p>
                                      </div>
                        </div>
          </div>
        </div>
      )}


      {/* View Assignment Details Modal */}
      {viewingAssignment && (
        <div
          className="modal fade show"
          style={{ display: "block", zIndex: 1055, backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewingAssignment(null);
              setViewingAssignmentDetails(null);
            }
          }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="ti ti-eye me-2 text-primary" />
                  Assignment Details - {viewingAssignment.employeeName}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setViewingAssignment(null);
                    setViewingAssignmentDetails(null);
                  }}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                {loadingViewDetails ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3 text-muted">Loading assignment details...</p>
                  </div>
                ) : (
                  <>
                    {/* SECTION A: Structure & Gross */}
                    {viewingAssignmentDetails && (
                      <div className="mb-4">
                        <h6 className="section-title mb-3">
                          <i className="ti ti-settings me-2" />
                          Structure & Gross Salary
                        </h6>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label fw-semibold text-muted">Employee Name</label>
                            <p className="mb-0 fw-semibold">{viewingAssignment.employeeName}</p>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold text-muted">Structure Name</label>
                            <p className="mb-0">
                              <span className="badge bg-primary fs-6">
                                {viewingAssignmentDetails?.structure_name || viewingAssignment.assignment.structure?.name || "N/A"}
                              </span>
                            </p>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-semibold text-muted">Gross Salary (Yearly)</label>
                            <p className="mb-0">
                              <span className="text-success fw-bold" style={{ fontSize: "1.5rem" }}>
                                ₹{parseFloat((viewingAssignmentDetails?.gross_salary || viewingAssignment.assignment.gross_salary)?.toString() || "0").toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <span className="text-muted ms-1">/year</span>
                            </p>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-semibold text-muted">Effective Month</label>
                            <p className="mb-0">
                              {(() => {
                                const month = viewingAssignmentDetails?.effective_month || viewingAssignment.assignment.effective_month;
                                const monthNames = ["", "January", "February", "March", "April", "May", "June", 
                                  "July", "August", "September", "October", "November", "December"];
                                return monthNames[month] || month || "N/A";
                              })()}
                            </p>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-semibold text-muted">Effective Year</label>
                            <p className="mb-0">
                              {viewingAssignmentDetails?.effective_year || viewingAssignment.assignment.effective_year || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTION B: Earnings */}
                    {viewingAssignmentDetails && (
                      <>
                        {(() => {
                          // Get all earning components from structure or payroll breakdown
                          let allEarnings: any[] = [];
                          
                          if (viewingAssignmentDetails?.structure_components) {
                            // Use structure components to show all components
                            const structureEarnings = viewingAssignmentDetails.structure_components
                              .filter((item: any) => item.component?.component_type === "earning")
                              .map((item: any) => {
                                const comp = item.component || {};
                                const payrollEarning = viewingAssignmentDetails?.payroll_breakdown?.earnings?.find(
                                  (e: any) => e.id === comp.id || e.name === comp.name
                                );
                                
                                return {
                                  id: comp.id,
                                  name: comp.name,
                                  component_type: comp.component_type,
                                  calculation_type: comp.calculation_type,
                                  component_value: comp.component_value,
                                  is_balancer: comp.is_balancer || false,
                                  is_system: comp.name === "Basic Salary" || comp.name === "Special Allowance",
                                  calculated_amount: payrollEarning?.calculated_amount || payrollEarning?.amount || 0,
                                  is_enabled: payrollEarning?.is_enabled !== false,
                                  ...payrollEarning
                                };
                              });
                            allEarnings = structureEarnings;
                          } else if (viewingAssignmentDetails?.payroll_breakdown?.earnings) {
                            allEarnings = viewingAssignmentDetails.payroll_breakdown.earnings;
                          }
                          
                          return (
                            <>
                              <hr className="my-4" />
                              <div className="mb-4">
                                <h6 className="section-title mb-3">
                                  <i className="ti ti-arrow-up-circle me-2 text-success" />
                                  Earnings
                                </h6>
                                {allEarnings.length > 0 ? (
                              <div className="table-responsive">
                                <table className="table table-hover">
                                  <thead className="table-light">
                                    <tr>
                                      <th>Component Name</th>
                                      <th>Type</th>
                                      <th>Value</th>
                                      <th className="text-end">Calculated Amount (₹)</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {allEarnings.map((earning: any, index: number) => (
                                    <tr key={index} className={earning.is_balancer ? "table-warning" : earning.is_system ? "table-info" : ""}>
                                      <td>
                                        <div className="d-flex align-items-center gap-2">
                                          {(earning.is_system || earning.is_balancer) && (
                                            <i className="ti ti-lock text-muted" style={{ fontSize: "0.875rem" }} />
                                          )}
                                          <span className={earning.is_system || earning.is_balancer ? "fw-semibold" : ""}>
                                            {earning.name || earning.component_name}
                                          </span>
                                          {earning.is_balancer && (
                                            <span className="badge bg-warning text-dark" style={{ fontSize: "0.7rem" }}>
                                              Auto
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td>
                                        <span className="badge bg-info">
                                          {earning.calculation_type === "percentage" ? "Percentage" : 
                                           earning.calculation_type === "auto" ? "Auto" : "Fixed"}
                                        </span>
                                      </td>
                                      <td>
                                        {earning.calculation_type === "percentage" 
                                          ? `${earning.component_value || earning.percentage || 0}%`
                                          : earning.calculation_type === "auto"
                                          ? "Auto-calculated"
                                          : `₹${parseFloat((earning.component_value || 0).toString()).toLocaleString("en-IN", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}`}
                                      </td>
                                      <td className="text-end">
                                        <span className="fw-semibold text-success" style={{ fontSize: "1rem" }}>
                                          ₹{parseFloat((earning.calculated_amount || earning.amount || 0).toString()).toLocaleString("en-IN", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </span>
                                      </td>
                                      <td>
                                        {earning.is_enabled !== false ? (
                                          <span className="badge bg-success">Enabled</span>
                                        ) : (
                                          <span className="badge bg-secondary">Disabled</span>
                                        )}
                                      </td>
                                    </tr>
                                    ))}
                                    <tr className="table-primary fw-bold">
                                      <td colSpan={3}>Total Earnings</td>
                                      <td className="text-end" style={{ fontSize: "1.1rem" }}>
                                        ₹{parseFloat((viewingAssignmentDetails?.payroll_breakdown?.total_earnings || 0).toString()).toLocaleString("en-IN", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </td>
                                      <td></td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-3 text-muted">
                                <i className="ti ti-info-circle me-2" />
                                No earning components found.
                              </div>
                            )}
                              </div>
                            </>
                          );
                        })()}

                        {/* SECTION C: Deductions */}
                        {viewingAssignmentDetails && (
                          <>
                            <hr className="my-4" />
                            {(() => {
                              // Get all deduction components from structure or payroll breakdown
                              let allDeductions: any[] = [];
                              
                              if (viewingAssignmentDetails?.structure_components) {
                                // Use structure components to show all components
                                const structureDeductions = viewingAssignmentDetails.structure_components
                                  .filter((item: any) => item.component?.component_type === "deduction")
                                  .map((item: any) => {
                                    const comp = item.component || {};
                                    const payrollDeduction = viewingAssignmentDetails?.payroll_breakdown?.deductions?.find(
                                      (d: any) => d.id === comp.id || d.name === comp.name
                                    );
                                    
                                    return {
                                      id: comp.id,
                                      name: comp.name,
                                      component_type: comp.component_type,
                                      calculation_type: comp.calculation_type,
                                      component_value: comp.component_value,
                                      is_balancer: false,
                                      calculated_amount: payrollDeduction?.calculated_amount || payrollDeduction?.amount || 0,
                                      is_enabled: payrollDeduction?.is_enabled !== false,
                                      ...payrollDeduction
                                    };
                                  });
                                allDeductions = structureDeductions;
                              } else if (viewingAssignmentDetails?.payroll_breakdown?.deductions) {
                                allDeductions = viewingAssignmentDetails.payroll_breakdown.deductions;
                              }
                              
                              return (
                                <div className="mb-4">
                                  <h6 className="section-title mb-3">
                                    <i className="ti ti-arrow-down-circle me-2 text-danger" />
                                    Deductions
                                  </h6>
                                  {allDeductions.length > 0 ? (
                                    <div className="table-responsive">
                                      <table className="table table-hover">
                                        <thead className="table-light">
                                          <tr>
                                            <th>Component Name</th>
                                            <th>Type</th>
                                            <th>Value</th>
                                            <th className="text-end">Calculated Amount (₹)</th>
                                            <th>Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {allDeductions.map((deduction: any, index: number) => (
                                            <tr key={index}>
                                              <td>{deduction.name || deduction.component_name}</td>
                                              <td>
                                                <span className="badge bg-info">
                                                  {deduction.calculation_type === "percentage" ? "Percentage" : "Fixed"}
                                                </span>
                                              </td>
                                              <td>
                                                {deduction.calculation_type === "percentage" 
                                                  ? `${deduction.component_value || deduction.percentage || 0}%`
                                                  : `₹${parseFloat((deduction.component_value || 0).toString()).toLocaleString("en-IN", {
                                                      minimumFractionDigits: 2,
                                                      maximumFractionDigits: 2,
                                                    })}`}
                                              </td>
                                              <td className="text-end">
                                                <span className="fw-semibold text-danger" style={{ fontSize: "1rem" }}>
                                                  ₹{parseFloat((deduction.calculated_amount || deduction.amount || 0).toString()).toLocaleString("en-IN", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  })}
                                                </span>
                                              </td>
                                              <td>
                                                {deduction.is_enabled !== false ? (
                                                  <span className="badge bg-success">Enabled</span>
                                                ) : (
                                                  <span className="badge bg-secondary">Disabled</span>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                          <tr className="table-secondary fw-bold">
                                            <td colSpan={3}>Total Deductions</td>
                                            <td className="text-end" style={{ fontSize: "1.1rem" }}>
                                              ₹{parseFloat((viewingAssignmentDetails?.payroll_breakdown?.total_deductions || 0).toString()).toLocaleString("en-IN", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              })}
                                            </td>
                                            <td></td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="text-center py-3 text-muted">
                                      <i className="ti ti-info-circle me-2" />
                                      No deduction components found.
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </>
                    )}

                    {/* SECTION D: Summary */}
                    {viewingAssignmentDetails?.payroll_breakdown && (
                      <>
                        <hr className="my-4" />
                        <div className="mb-4">
                          <h6 className="section-title mb-3">
                            <i className="ti ti-calculator me-2 text-primary" />
                            Summary
                          </h6>
                          <div className="row g-3">
                            <div className="col-md-3">
                              <div className="card border-primary">
                                <div className="card-body text-center">
                                  <label className="text-muted small d-block mb-2">Gross Salary</label>
                                  <div className="text-primary fw-bold" style={{ fontSize: "1.4rem" }}>
                                    ₹{parseFloat((viewingAssignmentDetails.gross_salary || viewingAssignment.assignment.gross_salary || 0).toString()).toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card border-success">
                                <div className="card-body text-center">
                                  <label className="text-muted small d-block mb-2">Total Earnings</label>
                                  <div className="text-success fw-bold" style={{ fontSize: "1.4rem" }}>
                                    ₹{parseFloat((viewingAssignmentDetails.payroll_breakdown.total_earnings || 0).toString()).toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card border-danger">
                                <div className="card-body text-center">
                                  <label className="text-muted small d-block mb-2">Total Deductions</label>
                                  <div className="text-danger fw-bold" style={{ fontSize: "1.4rem" }}>
                                    ₹{parseFloat((viewingAssignmentDetails.payroll_breakdown.total_deductions || 0).toString()).toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card border-dark bg-dark text-white">
                                <div className="card-body text-center">
                                  <label className="text-white-50 small d-block mb-2">Net Pay</label>
                                  <div className="text-white fw-bold" style={{ fontSize: "1.4rem" }}>
                                    ₹{parseFloat((viewingAssignmentDetails.payroll_breakdown.net_pay || 0).toString()).toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setViewingAssignment(null);
                    setViewingAssignmentDetails(null);
                    handleOpenEditModal(viewingAssignment.employeeId, viewingAssignment.assignment);
                  }}
                >
                  <i className="ti ti-edit me-1" />
                  Edit Assignment
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setViewingAssignment(null);
                    setViewingAssignmentDetails(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View All Assignments Modal */}
      {viewingAssignments && (
        <div
          className="modal fade show"
          style={{ display: "block", zIndex: 1055, backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingAssignments(null);
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  All Assignments - {viewingAssignments.employeeName}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewingAssignments(null)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                {(() => {
                  const employeeAssignments = getEmployeeAssignments(viewingAssignments.employeeId);
                  if (employeeAssignments.length === 0) {
                    return (
                      <div className="text-center py-4">
                        <i className="ti ti-inbox" style={{ fontSize: "48px", color: "#ccc" }} />
                        <p className="text-muted mt-3">No assignments found</p>
                      </div>
                    );
                  }
                  return (
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Structure</th>
                            <th>Gross Salary <span className="text-primary small">(Yearly)</span></th>
                            <th>Effective Month/Year</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeAssignments
                            .sort((a: any, b: any) => {
                              return new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime();
                            })
                            .map((assignment: any, index: number) => {
                              return (
                                <tr key={index}>
                                  <td className="fw-semibold">{assignment.structure?.name || "N/A"}</td>
                                  <td>
                                    <span className="text-success fw-bold">
                                      ₹{parseFloat(assignment.gross_salary?.toString() || "0").toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                    <span className="text-muted small ms-1">/year</span>
                                  </td>
                                  <td>
                                    {new Date(assignment.effective_from).toLocaleDateString("en-IN", {
                                      month: "long",
                                      year: "numeric",
                                    })}
                                  </td>
                                  <td>
                                    <div className="d-flex gap-2">
                                      <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => {
                                          setViewingAssignments(null);
                                          handleOpenEditModal(viewingAssignments.employeeId, assignment);
                                        }}
                                        title="Edit"
                                      >
                                        <i className="ti ti-edit me-1" />
                                        Edit
                                      </button>
                                      <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => {
                                          if (window.confirm("Are you sure you want to delete this assignment?")) {
                                            handleRemoveAssignment(viewingAssignments.employeeId, assignment.id);
                                          }
                                        }}
                                        title="Delete"
                                      >
                                        <i className="ti ti-trash me-1" />
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setViewingAssignments(null);
                    handleOpenEditModal(viewingAssignments.employeeId);
                  }}
                >
                  <i className="ti ti-plus me-1" />
                  Add New Assignment
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setViewingAssignments(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

export default EmployeeStructureAssignments;
