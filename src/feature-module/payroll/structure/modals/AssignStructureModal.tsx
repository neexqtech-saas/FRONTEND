/**
 * Assign Structure Modal Component
 * Comprehensive employee salary assignment screen
 */

import React, { useState, useEffect, useMemo } from "react";
import { DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import { toast } from "react-toastify";
import "./AssignStructureModal.scss";

interface Component {
  id: number;
  name: string;
  component_type: "earning" | "deduction";
  calculation_type: "fixed" | "percentage";
  component_value: number;
  is_balancer: boolean;
  is_system?: boolean; // Basic Salary and Special Allowance
}

interface ComponentToggle {
  [componentId: number]: boolean;
}

interface ComponentValues {
  [componentId: number]: number; // Editable percentage or fixed value
}

interface CalculatedComponent {
  id: number;
  name: string;
  component_type: "earning" | "deduction";
  calculation_type: "fixed" | "percentage" | "auto";
  amount: number;
  is_balancer: boolean;
  is_system?: boolean;
  is_enabled: boolean;
}

interface AssignStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  assignment?: any;
  employees: any[];
  structures: any[];
  totalAssignments?: number; // Total assignments count for the employee
}

const AssignStructureModal: React.FC<AssignStructureModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  assignment,
  employees,
  structures,
  totalAssignments = 0,
}) => {
  const [formData, setFormData] = useState({
    employee_id: "",
    structure_id: "",
    gross_salary: "",
    effective_month: dayjs().month() + 1, // 1-12
    effective_year: dayjs().year(),
  });

  const [allComponents, setAllComponents] = useState<Component[]>([]);
  const [componentToggles, setComponentToggles] = useState<ComponentToggle>({});
  const [componentValues, setComponentValues] = useState<ComponentValues>({}); // Editable component values
  const [selectedStructureName, setSelectedStructureName] = useState<string>("");
  const [loadingComponents, setLoadingComponents] = useState(false);
  // Always use yearly - no monthly option
  const payType: "yearly" = "yearly";

  // Load structure components when structure is selected
  useEffect(() => {
    if (formData.structure_id && structures.length > 0) {
      loadStructureComponents(formData.structure_id);
    } else {
      setAllComponents([]);
      setComponentToggles({});
      setComponentValues({});
      setSelectedStructureName("");
    }
  }, [formData.structure_id, structures]);

  // Note: Component toggles and values are now initialized in loadStructureComponents
  // when structure is selected. This ensures proper initialization from employee_components
  // or assignment.component_toggles/component_values

  // Initialize form data when assignment changes
  useEffect(() => {
    if (!isOpen) return; // Don't initialize if modal is closed
    
    if (assignment?.id) {
      // Edit mode - load existing assignment data
      // Extract employee_id from multiple possible locations
      let employeeId = assignment.employee_id 
        || assignment.employee?.id 
        || (assignment.employee && (assignment.employee.id || assignment.employee.user_id))
        || "";
      
      // Convert to string and ensure it's not empty
      employeeId = employeeId ? String(employeeId) : "";
      
      if (!employeeId) {
        console.warn("Employee ID not found in assignment:", assignment);
      }
      
      setFormData({
        employee_id: employeeId,
        structure_id: assignment.structure_id || assignment.structure?.id || "",
        gross_salary: assignment.gross_salary?.toString() || "",
        effective_month: assignment.effective_month || dayjs().month() + 1,
        effective_year: assignment.effective_year || dayjs().year(),
      });
      
      // Component toggles and values will be initialized when structure components are loaded
      // This happens in the loadStructureComponents function
      // We keep the assignment data so it can be used there
    } else if (assignment?.employee_id) {
      // New assignment but employee already selected
      setFormData({
        employee_id: String(assignment.employee_id), // Ensure it's a string
        structure_id: "",
        gross_salary: "",
        effective_month: dayjs().month() + 1,
        effective_year: dayjs().year(),
      });
      setComponentToggles({});
      setComponentValues({});
    } else {
      // Create mode - no employee selected
      setFormData({
        employee_id: "",
        structure_id: "",
        gross_salary: "",
        effective_month: dayjs().month() + 1,
        effective_year: dayjs().year(),
      });
      setComponentToggles({});
      setComponentValues({});
    }
    setAllComponents([]);
    setSelectedStructureName("");
  }, [assignment, isOpen]);

  const loadStructureComponents = async (structureId: string) => {
    setLoadingComponents(true);
    try {
      const role = sessionStorage.getItem("role");
      let organizationId: string | null = null;

      if (role === "organization") {
        organizationId = sessionStorage.getItem("user_id");
      } else if (role === "admin") {
        const adminId = getAdminIdForApi();
        if (!adminId) {
          setLoadingComponents(false);
          return;
        }
        organizationId = adminId;
      } else {
        setLoadingComponents(false);
        return;
      }

      if (!organizationId) {
        setLoadingComponents(false);
        return;
      }

      const token = sessionStorage.getItem("access_token");
      const response = await fetch(
        `http://127.0.0.1:8000/api/payroll/structure/${organizationId}/${structureId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data?.status === 200 && data?.data) {
        const structure = data.data;
        const structureItems = structure.items || [];

        console.log("Structure items received:", structureItems);
        console.log("Number of items:", structureItems.length);

        const components: Component[] = structureItems
          .filter((item: any) => {
            // Filter out items where component is null or undefined
            const hasComponent = item.component && item.component.id;
            if (!hasComponent) {
              console.warn("Skipping item without component:", item);
            }
            return hasComponent;
          })
          .map((item: any) => {
            const comp = item.component || {};
            const name = comp.name || "";
            const isSystem = name === "Basic Salary" || name === "Special Allowance";
            
            return {
              id: comp.id || 0,
              name: name,
              component_type: comp.component_type || "earning",
              calculation_type: comp.calculation_type || "fixed",
              component_value: parseFloat(comp.component_value || 0),
              is_balancer: comp.is_balancer || false,
              is_system: isSystem,
            };
          });

        console.log("Components after mapping:", components);
        console.log("Number of components:", components.length);

        setAllComponents(components);
        setSelectedStructureName(structure.name || "");

        // Initialize toggles and values
        // If assignment exists, use existing employee_components data
        // Otherwise, use defaults (all enabled, structure values)
        const toggles: ComponentToggle = {};
        const values: ComponentValues = {};
        
        if (assignment?.id && assignment?.employee_components) {
          // Load from existing employee_components
          const empComponentsMap = new Map();
          assignment.employee_components.forEach((empComp: any) => {
            const compId = empComp.component_id || empComp.component?.id;
            if (compId) {
              empComponentsMap.set(compId, empComp);
            }
          });
          
          components.forEach((comp) => {
            const empComp = empComponentsMap.get(comp.id);
            if (empComp) {
              // Use existing employee component data
              toggles[comp.id] = empComp.is_enabled !== false; // Default to true if not set
              // Use override value if exists, otherwise use structure default
              values[comp.id] = empComp.component_value_override !== null && empComp.component_value_override !== undefined
                ? parseFloat(empComp.component_value_override)
                : comp.component_value;
            } else {
              // Component not in employee_components, use defaults
              toggles[comp.id] = true;
              values[comp.id] = comp.component_value;
            }
          });
        } else if (assignment?.component_toggles || assignment?.component_values) {
          // Use provided component_toggles and component_values (for backward compatibility)
          components.forEach((comp) => {
            toggles[comp.id] = assignment.component_toggles?.[comp.id] !== undefined
              ? assignment.component_toggles[comp.id]
              : true;
            values[comp.id] = assignment.component_values?.[comp.id] !== undefined
              ? assignment.component_values[comp.id]
              : comp.component_value;
          });
        } else {
          // New assignment - initialize all toggles to enabled and use structure values
          components.forEach((comp) => {
            toggles[comp.id] = true; // Default all to true
            values[comp.id] = comp.component_value;
          });
        }
        
        setComponentToggles(toggles);
        setComponentValues(values);
      }
    } catch (error) {
      console.error("Error loading structure components:", error);
      toast.error("Failed to load structure components");
      setAllComponents([]);
      setComponentToggles({});
    } finally {
      setLoadingComponents(false);
    }
  };

  // Calculate salary breakdown
  const salaryBreakdown = useMemo((): {
    earnings: CalculatedComponent[];
    deductions: CalculatedComponent[];
    totalEarnings: number;
    totalDeductions: number;
    netPay: number;
    isValid: boolean;
    errorMessage?: string;
  } => {
    // Show components even if gross salary is not entered yet
    if (!formData.structure_id || allComponents.length === 0) {
      return {
        earnings: [],
        deductions: [],
        totalEarnings: 0,
        totalDeductions: 0,
        netPay: 0,
        isValid: true,
      };
    }

    const grossSalary = parseFloat(formData.gross_salary) || 0;
    const hasGrossSalary = grossSalary > 0;
    
    // Always use yearly gross (no monthly conversion needed)
    const yearlyGrossSalary = grossSalary;

    const earnings: CalculatedComponent[] = [];
    const deductions: CalculatedComponent[] = [];
    let totalNonBalancerEarnings = 0;
    let balancerComponent: Component | null = null;
    let balancerName = "Special Allowance";

    // Separate earnings and deductions, find balancer
    const earningComponents = allComponents.filter((c) => c.component_type === "earning");
    const deductionComponents = allComponents.filter((c) => c.component_type === "deduction");

    // Calculate earnings (excluding balancer)
    for (let i = 0; i < earningComponents.length; i++) {
      const component = earningComponents[i];
      const isEnabled = componentToggles[component.id] !== false; // Default to true if not set
      
      // Check if this is Special Allowance by name (case-insensitive)
      const isSpecialAllowanceByName = component.name?.toLowerCase().trim() === "special allowance";

      // Identify balancer component but skip it in this loop
      // Also skip any component named "Special Allowance" to avoid duplicates
      if (component.is_balancer || isSpecialAllowanceByName) {
        // Only set balancerComponent if not already set
        if (balancerComponent === null) {
          balancerComponent = component;
          balancerName = component.name || "Special Allowance";
        }
        continue; // Skip this component - it will be added as balancer later
      }

      // Skip disabled non-system components only if gross salary is entered
      if (!isEnabled && !component.is_system && hasGrossSalary) {
        // Still add to earnings list with 0 amount for display
        earnings.push({
          id: component.id,
          name: component.name,
          component_type: "earning",
          calculation_type: component.calculation_type,
          amount: 0,
          is_balancer: false,
          is_system: component.is_system,
          is_enabled: isEnabled,
        });
        continue;
      }

      let amount = 0;
      if (hasGrossSalary) {
        // Use editable component value if available, otherwise use original
        const componentValue = componentValues[component.id] !== undefined 
          ? componentValues[component.id] 
          : component.component_value;
        
        // Use yearly gross for all calculations
        if (component.calculation_type === "percentage") {
          amount = (yearlyGrossSalary * componentValue) / 100;
        } else if (component.calculation_type === "fixed") {
          amount = componentValue;
        }
        amount = Math.round(amount * 100) / 100;
        
        // Only add to total if component is enabled or is a system component
        if (isEnabled || component.is_system) {
          totalNonBalancerEarnings += amount;
        }
      }

      earnings.push({
        id: component.id,
        name: component.name,
        component_type: "earning",
        calculation_type: component.calculation_type,
        amount: amount,
        is_balancer: false,
        is_system: component.is_system,
        is_enabled: isEnabled,
      });
    }

    // Calculate Special Allowance (balancer) - automatically adjusts to complete the total
    // Formula: Special Allowance = Gross Salary - Sum of all other enabled earnings
    let specialAllowance = 0;
    let roundedSpecialAllowance = 0;
    
    if (hasGrossSalary) {
      specialAllowance = yearlyGrossSalary - totalNonBalancerEarnings;
      roundedSpecialAllowance = Math.round(specialAllowance * 100) / 100;
      // Ensure Special Allowance is never negative (will show validation error instead)
      if (roundedSpecialAllowance < 0) {
        roundedSpecialAllowance = 0;
      }
    }

    // Always add Special Allowance ONCE if balancer component exists
    // Check if Special Allowance is already in earnings array to avoid duplicates
    const hasSpecialAllowanceInEarnings = earnings.some(
      (e) => e.name?.toLowerCase().trim() === "special allowance" || e.is_balancer
    );
    
    if (!hasSpecialAllowanceInEarnings) {
      if (balancerComponent !== null) {
        earnings.push({
          id: balancerComponent.id,
          name: balancerName,
          component_type: "earning",
          calculation_type: "auto",
          amount: roundedSpecialAllowance, // This will update when gross salary changes
          is_balancer: true,
          is_system: true,
          is_enabled: true, // Always enabled
        });
      } else if (hasGrossSalary) {
        // If balancer component not found but gross salary is entered, still show it
        // This is a fallback in case the component isn't loaded yet
        earnings.push({
          id: -1, // Temporary ID
          name: "Special Allowance",
          component_type: "earning",
          calculation_type: "auto",
          amount: roundedSpecialAllowance,
          is_balancer: true,
          is_system: true,
          is_enabled: true,
        });
      }
    }

    const totalEarnings = totalNonBalancerEarnings + roundedSpecialAllowance;

    // Calculate deductions
    let totalDeductions = 0;
    for (let i = 0; i < deductionComponents.length; i++) {
      const component = deductionComponents[i];
      const isEnabled = componentToggles[component.id] !== false;

      // Always show all deduction components, even if disabled
      // If disabled and gross salary is entered, show with 0 amount
      if (!isEnabled && hasGrossSalary) {
        deductions.push({
          id: component.id,
          name: component.name,
          component_type: "deduction",
          calculation_type: component.calculation_type,
          amount: 0,
          is_balancer: false,
          is_system: component.is_system,
          is_enabled: isEnabled,
        });
        continue;
      }

      let amount = 0;
      if (hasGrossSalary) {
        // Use editable component value if available, otherwise use original
        const componentValue = componentValues[component.id] !== undefined 
          ? componentValues[component.id] 
          : component.component_value;
        
        // Use yearly gross for all calculations
        if (component.calculation_type === "percentage") {
          amount = (yearlyGrossSalary * componentValue) / 100;
        } else if (component.calculation_type === "fixed") {
          amount = componentValue;
        }
        amount = Math.round(amount * 100) / 100;
        if (isEnabled) {
          totalDeductions += amount;
        }
      }

      deductions.push({
        id: component.id,
        name: component.name,
        component_type: "deduction",
        calculation_type: component.calculation_type,
        amount: amount,
        is_balancer: false,
        is_system: component.is_system,
        is_enabled: isEnabled,
      });
    }

    const netPay = totalEarnings - totalDeductions;
    const isValid = !hasGrossSalary || roundedSpecialAllowance >= 0;
    const errorMessage = hasGrossSalary && !isValid
      ? "Special Allowance cannot be negative. Please adjust gross salary or disable some components."
      : undefined;

    console.log("Salary breakdown calculated:", {
      earningsCount: earnings.length,
      deductionsCount: deductions.length,
      totalComponents: allComponents.length,
      earnings: earnings.map(e => e.name),
      deductions: deductions.map(d => d.name)
    });

    return {
      earnings,
      deductions,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
      isValid,
      errorMessage,
    };
  }, [formData.gross_salary, formData.structure_id, allComponents, componentToggles, componentValues]);

  const handleToggleComponent = (componentId: number, isSystem: boolean) => {
    // System components cannot be toggled
    if (isSystem) {
      return;
    }
    
    // Allow toggles in both create and edit mode
    setComponentToggles((prev) => ({
      ...prev,
      [componentId]: !prev[componentId],
    }));
  };

  const handleComponentValueChange = (componentId: number, value: number, isSystem: boolean, isBalancer: boolean) => {
    // Special Allowance (balancer) cannot be edited - it's fully locked
    if (isBalancer) {
      return;
    }
    
    // Allow value changes in both create and edit mode
    // For BASIC, allow editing percentage (0-100)
    if (isSystem && !isBalancer) {
      const clampedValue = Math.max(0, Math.min(100, value));
      setComponentValues((prev) => ({
        ...prev,
        [componentId]: clampedValue,
      }));
    } else if (!isBalancer) {
      // For other components, allow editing
      setComponentValues((prev) => ({
        ...prev,
        [componentId]: Math.max(0, value),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - employee_id must be set (either from assignment or from context)
    // If employee_id is missing, try to get it from assignment
    if (!formData.employee_id) {
      const employeeId = assignment?.employee_id 
        || assignment?.employee?.id 
        || (assignment?.employee && (assignment.employee.id || assignment.employee.user_id));
      if (employeeId) {
        setFormData(prev => ({ ...prev, employee_id: String(employeeId) }));
        // Retry after setting employee_id
        setTimeout(() => {
          handleSubmit(e as any);
        }, 100);
        return;
      } else {
        toast.error("Employee information not found. Please contact support.");
        return;
      }
    }
    if (!formData.structure_id) {
      toast.error("Please select a structure");
      return;
    }
    if (!formData.gross_salary || parseFloat(formData.gross_salary) <= 0) {
      toast.error("Please enter a valid gross salary");
      return;
    }

    // Validate Special Allowance
    if (!salaryBreakdown.isValid) {
      toast.error(salaryBreakdown.errorMessage || "Invalid salary breakdown");
      return;
    }

    // Filter out balancer component from toggles and values (it's fully locked)
    const filteredToggles: ComponentToggle = {};
    const filteredValues: ComponentValues = {};
    
    allComponents.forEach((comp) => {
      if (!comp.is_balancer) {
                // Send component_toggles if provided (both create and edit mode)
                if (componentToggles[comp.id] !== undefined) {
                  filteredToggles[comp.id] = componentToggles[comp.id];
                }
                // Send component_values if provided (both create and edit mode)
                if (componentValues[comp.id] !== undefined) {
                  filteredValues[comp.id] = componentValues[comp.id];
                }
      }
    });

    // Gross salary is always yearly
    const grossSalaryValue = parseFloat(formData.gross_salary);

    const submitData: any = {
      employee_id: formData.employee_id,
      structure_id: parseInt(formData.structure_id),
      gross_salary: grossSalaryValue, // Always yearly
      effective_month: formData.effective_month,
      effective_year: formData.effective_year,
      // Send component_toggles in both create and edit mode
      ...(Object.keys(filteredToggles).length > 0 && { component_toggles: filteredToggles }), // Exclude balancer from toggles
      // Send component_values in both create and edit mode
      ...(Object.keys(filteredValues).length > 0 && { component_values: filteredValues }), // Exclude balancer from values
      all_components: allComponents, // Include all components for reference
      ...(assignment?.id && { id: assignment.id }),
    };

    // Call parent's onSubmit handler
    // Parent component should:
    // 1. Create/update the assignment
    // 2. Initialize components (via calculate-payroll API)
    // 3. Update component toggles (via employee-component API)
    onSubmit(submitData);
  };

  useEffect(() => {
    const modalElement = document.getElementById("assignStructureModal");
    if (!modalElement) return;

    if (isOpen) {
      modalElement.classList.add("show");
      modalElement.style.display = "block";
      document.body.classList.add("modal-open");
    } else {
      modalElement.classList.remove("show");
      modalElement.style.display = "none";
      document.body.classList.remove("modal-open");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getEmployeeName = (employee: any) => {
    return employee?.user_name || employee?.user?.username || employee?.user?.email || employee?.email || "Unknown";
  };

  const formatCurrency = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <div
      className="modal fade"
      id="assignStructureModal"
      tabIndex={-1}
      aria-labelledby="assignStructureModalLabel"
      aria-hidden="true"
      style={{ zIndex: 1055 }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <div className="d-flex flex-column w-100">
              <div className="d-flex align-items-center justify-content-between w-100">
                <h5 className="modal-title mb-0" id="assignStructureModalLabel">
                  <i className="ti ti-user-dollar me-2" />
                  {assignment?.id ? "Edit Salary Assignment" : "Assign Salary Structure"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                ></button>
              </div>
              {totalAssignments > 0 && (
                <div className="mt-2">
                  <span className="badge bg-info">
                    <i className="ti ti-list me-1" />
                    {totalAssignments} {totalAssignments === 1 ? "Structure Assigned" : "Structures Assigned"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* SECTION A: Structure & Gross */}
              <div className="section-structure-gross mb-4">
                <h6 className="section-title">
                  <i className="ti ti-settings me-2" />
                  Structure & Gross Salary
                </h6>
                <div className="row g-3">
                  {/* Employee display - employee is determined from context (no selection needed) */}
                  {formData.employee_id && (
                    <div className="col-md-12 mb-3">
                      <div className="alert alert-info mb-0">
                        <i className="ti ti-user me-2" />
                        <strong>Employee:</strong> {(() => {
                          const employee = employees.find((emp: any) => {
                            const empId = emp.user?.id || emp.id || emp.user_id;
                            return String(empId) === String(formData.employee_id);
                          });
                          return employee ? getEmployeeName(employee) : `Employee ID: ${formData.employee_id}`;
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="col-md-6">
                    <label className="form-label">
                      Salary Structure <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.structure_id}
                      onChange={(e) => setFormData({ ...formData, structure_id: e.target.value })}
                      required
                      disabled={!!assignment?.id}
                      style={assignment?.id ? { backgroundColor: "#f8f9fa", cursor: "not-allowed", opacity: 0.7 } : {}}
                    >
                      <option value="">Select Structure</option>
                      {structures.map((struct: any) => (
                        <option key={struct.id} value={struct.id}>
                          {struct.name} {struct.description ? `- ${struct.description}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedStructureName && (
                    <div className="col-md-12">
                      <div className="alert alert-info mb-0">
                        <i className="ti ti-info-circle me-2" />
                        <strong>Selected Structure:</strong> {selectedStructureName}
                      </div>
                    </div>
                  )}

                  <div className="col-md-4">
                    <label className="form-label">
                      Gross Salary (Yearly) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.gross_salary}
                        onChange={(e) => setFormData({ ...formData, gross_salary: e.target.value })}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <small className="text-muted">Gross pay will always total 100% of earnings</small>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">
                      Effective Month <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.effective_month}
                      onChange={(e) => setFormData({ ...formData, effective_month: parseInt(e.target.value) })}
                      required
                      disabled={!!assignment?.id}
                      style={assignment?.id ? { backgroundColor: "#f8f9fa", cursor: "not-allowed", opacity: 0.7 } : {}}
                    >
                      {monthOptions.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">
                      Effective Year <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.effective_year}
                      onChange={(e) => setFormData({ ...formData, effective_year: parseInt(e.target.value) })}
                      min="2020"
                      max="2100"
                      required
                      disabled={!!assignment?.id}
                      readOnly={!!assignment?.id}
                      style={assignment?.id ? { backgroundColor: "#f8f9fa", cursor: "not-allowed", opacity: 0.7 } : {}}
                    />
                  </div>
                </div>
              </div>

              {loadingComponents && (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading components...</span>
                  </div>
                </div>
              )}

              {/* SECTION B: Earnings */}
              {formData.structure_id && allComponents.length > 0 && !loadingComponents && (
                <>
                  <hr className="my-4" />
                  <div className="section-earnings mb-4">
                    <h6 className="section-title">
                      <i className="ti ti-arrow-up-circle me-2 text-success" />
                      Earnings
                    </h6>
                    <div className="alert alert-info mb-3">
                      <i className="ti ti-info-circle me-2" />
                      <strong>System Components:</strong> Basic Salary and Special Allowance are always enabled and cannot be toggled.
                      Special Allowance is auto-calculated to ensure total earnings equal gross salary.
                    </div>

                    {salaryBreakdown.earnings.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-light">
                            <tr>
                              {!assignment?.id && <th style={{ width: "60px" }}>Toggle</th>}
                              <th>Component Name</th>
                              <th style={{ width: "200px" }}>% or ₹ Input</th>
                              <th className="text-end">Calculated Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salaryBreakdown.earnings.map((earning) => {
                              const component = allComponents.find((c) => c.id === earning.id);
                              const isBasic = component?.name === "Basic Salary";
                              const isSpecialAllowance = earning.is_balancer;
                              const currentValue = componentValues[earning.id] !== undefined 
                                ? componentValues[earning.id] 
                                : (component?.component_value || 0);
                              
                              return (
                                <tr
                                  key={earning.id}
                                  className={earning.is_balancer ? "table-warning balancer-row" : earning.is_system ? "system-row" : ""}
                                >
                                  {!assignment?.id && (
                                    <td>
                                      <div className="form-check form-switch">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          checked={earning.is_enabled}
                                          onChange={() => handleToggleComponent(earning.id, earning.is_system || false)}
                                          disabled={earning.is_system || earning.is_balancer}
                                          id={`toggle-earning-${earning.id}`}
                                        />
                                      </div>
                                    </td>
                                  )}
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      {(earning.is_system || earning.is_balancer) && (
                                        <i className="ti ti-lock text-muted" style={{ fontSize: "0.875rem" }} />
                                      )}
                                      <span className={earning.is_system || earning.is_balancer ? "fw-semibold" : ""}>{earning.name}</span>
                                      {earning.is_balancer && (
                                        <span className="badge bg-warning text-dark" style={{ fontSize: "0.7rem" }}>
                                          Auto
                                        </span>
                                      )}
                                    </div>
                                    {earning.is_balancer && (
                                      <small className="text-muted d-block mt-1" style={{ fontSize: "0.75rem" }}>
                                        Auto-adjusted to balance earnings
                                      </small>
                                    )}
                                  </td>
                                  <td>
                                    {isSpecialAllowance ? (
                                      <div className="input-group input-group-sm">
                                        <span className="input-group-text">₹</span>
                                        <input
                                          type="text"
                                          className="form-control"
                                          value="0"
                                          disabled
                                          readOnly
                                          style={{ 
                                            width: "100px",
                                            backgroundColor: "#f8f9fa",
                                            cursor: "not-allowed",
                                            opacity: 0.7
                                          }}
                                        />
                                        <span className="input-group-text">₹</span>
                                      </div>
                                    ) : earning.calculation_type === "percentage" ? (
                                      <div className="input-group input-group-sm">
                                        <input
                                          type="number"
                                          className="form-control"
                                          value={currentValue}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            handleComponentValueChange(earning.id, val, earning.is_system || false, false);
                                          }}
                                          disabled={!isBasic && !earning.is_enabled}
                                          min="0"
                                          max={isBasic ? "100" : undefined}
                                          step="0.01"
                                          style={{ width: "80px" }}
                                        />
                                        <span className="input-group-text">%</span>
                                      </div>
                                    ) : earning.calculation_type === "fixed" ? (
                                      <div className="input-group input-group-sm">
                                        <span className="input-group-text">₹</span>
                                        <input
                                          type="number"
                                          className="form-control"
                                          value={currentValue}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            handleComponentValueChange(earning.id, val, earning.is_system || false, false);
                                          }}
                                          disabled={!earning.is_enabled}
                                          min="0"
                                          step="0.01"
                                          style={{ width: "100px" }}
                                        />
                                      </div>
                                    ) : (
                                      <small className="text-muted">Auto-calculated</small>
                                    )}
                                  </td>
                                  <td className="text-end">
                                    <span className="fw-semibold text-success">
                                      {formData.gross_salary && parseFloat(formData.gross_salary) > 0
                                        ? formatCurrency(earning.amount || 0)
                                        : "₹0.00"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="table-primary fw-bold">
                              <td colSpan={assignment?.id ? 2 : 3}>Total Earnings</td>
                              <td className="text-end">
                                {formData.gross_salary && parseFloat(formData.gross_salary) > 0
                                  ? formatCurrency(salaryBreakdown.totalEarnings)
                                  : "₹0.00"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : allComponents.filter((c) => c.component_type === "earning").length === 0 ? (
                      <div className="text-center py-3 text-muted">
                        <i className="ti ti-info-circle me-2" />
                        No earning components found in this structure.
                      </div>
                    ) : (
                      <div className="alert alert-warning">
                        <i className="ti ti-alert-triangle me-2" />
                        Earning components are loading or not available. Total components in structure: {allComponents.length}
                      </div>
                    )}
                  </div>

                  {/* SECTION C: Deductions */}
                  <hr className="my-4" />
                  <div className="section-deductions mb-4">
                    <h6 className="section-title">
                      <i className="ti ti-arrow-down-circle me-2 text-danger" />
                      Deductions
                    </h6>
                    <div className="alert alert-warning mb-3">
                      <i className="ti ti-alert-triangle me-2" />
                      Deductions do not affect gross salary. They reduce net pay only.
                    </div>

                    {salaryBreakdown.deductions.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-light">
                            <tr>
                              {!assignment?.id && <th style={{ width: "60px" }}>Toggle</th>}
                              <th>Component Name</th>
                              <th style={{ width: "200px" }}>% or ₹ Input</th>
                              <th className="text-end">Calculated Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salaryBreakdown.deductions.map((deduction) => {
                              const component = allComponents.find((c) => c.id === deduction.id);
                              const currentValue = componentValues[deduction.id] !== undefined 
                                ? componentValues[deduction.id] 
                                : (component?.component_value || 0);
                              
                              return (
                                <tr key={deduction.id}>
                                  {!assignment?.id && (
                                    <td>
                                      <div className="form-check form-switch">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          checked={deduction.is_enabled}
                                          onChange={() => handleToggleComponent(deduction.id, deduction.is_system || false)}
                                          disabled={deduction.is_system || false}
                                          id={`toggle-deduction-${deduction.id}`}
                                        />
                                      </div>
                                    </td>
                                  )}
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      {deduction.is_system && (
                                        <i className="ti ti-lock text-muted" style={{ fontSize: "0.875rem" }} />
                                      )}
                                      <span>{deduction.name}</span>
                                    </div>
                                  </td>
                                  <td>
                                    {deduction.calculation_type === "percentage" ? (
                                      <div className="input-group input-group-sm">
                                        <input
                                          type="number"
                                          className="form-control"
                                          value={currentValue}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            handleComponentValueChange(deduction.id, val, false, false);
                                          }}
                                          disabled={!deduction.is_enabled}
                                          min="0"
                                          step="0.01"
                                          style={{ width: "80px" }}
                                        />
                                        <span className="input-group-text">%</span>
                                      </div>
                                    ) : deduction.calculation_type === "fixed" ? (
                                      <div className="input-group input-group-sm">
                                        <span className="input-group-text">₹</span>
                                        <input
                                          type="number"
                                          className="form-control"
                                          value={currentValue}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            handleComponentValueChange(deduction.id, val, false, false);
                                          }}
                                          disabled={!deduction.is_enabled}
                                          min="0"
                                          step="0.01"
                                          style={{ width: "100px" }}
                                        />
                                      </div>
                                    ) : (
                                      <small className="text-muted">Auto-calculated</small>
                                    )}
                                  </td>
                                  <td className="text-end">
                                    <span className="fw-semibold text-danger">
                                      {formData.gross_salary && parseFloat(formData.gross_salary) > 0
                                        ? `-${formatCurrency(deduction.amount)}`
                                        : "₹0.00"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="table-secondary fw-bold">
                              <td colSpan={assignment?.id ? 2 : 3}>Total Deductions</td>
                              <td className="text-end">
                                {formData.gross_salary && parseFloat(formData.gross_salary) > 0
                                  ? `-${formatCurrency(salaryBreakdown.totalDeductions)}`
                                  : "₹0.00"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : allComponents.filter((c) => c.component_type === "deduction").length === 0 ? (
                      <div className="text-center py-3 text-muted">
                        <i className="ti ti-info-circle me-2" />
                        No deduction components found in this structure.
                      </div>
                    ) : (
                      <div className="alert alert-warning">
                        <i className="ti ti-alert-triangle me-2" />
                        Deduction components are loading or not available. Total components in structure: {allComponents.length}
                      </div>
                    )}
                  </div>

                  {/* SECTION D: Summary */}
                  <hr className="my-4" />
                  <div className="section-summary">
                    <h6 className="section-title">
                      <i className="ti ti-calculator me-2 text-primary" />
                      Summary
                    </h6>
                    {!salaryBreakdown.isValid && (
                      <div className="alert alert-danger mb-3" role="alert">
                        <i className="ti ti-alert-triangle me-2" />
                        <strong>Validation Error:</strong> {salaryBreakdown.errorMessage}
                      </div>
                    )}
                    <div className="summary-card">
                      <div className="row g-3">
                        <div className="col-md-3">
                          <div className="summary-item">
                            <label>Gross Salary</label>
                            <div className="value text-primary">{formatCurrency(parseFloat(formData.gross_salary) || 0)}</div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="summary-item">
                            <label>Total Earnings</label>
                            <div className="value text-success">{formatCurrency(salaryBreakdown.totalEarnings)}</div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="summary-item">
                            <label>Total Deductions</label>
                            <div className="value text-danger">-{formatCurrency(salaryBreakdown.totalDeductions)}</div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="summary-item highlight">
                            <label>Net Pay</label>
                            <div className="value text-dark fw-bold">{formatCurrency(salaryBreakdown.netPay)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!salaryBreakdown.isValid || loadingComponents}
              >
                {assignment?.id ? "Update Assignment" : "Assign Structure"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignStructureModal;
