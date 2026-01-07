/**
 * Salary Structure Modal Component
 * Create/Edit Salary Structure with Components
 */

import React, { useState, useEffect } from "react";
import "./SalaryStructureModal.scss";
// REMOVED: salaryComponentsAPI import - SalaryComponent model removed
import axios from "axios";
import { getAuthHeaders } from "../../../../core/utils/apiHelpers";
import { BACKEND_PATH } from "../../../../environment";
import { toast } from "react-toastify";

interface Component {
  id?: number;
  // REMOVED: component_id - SalaryComponent model removed
  name: string;
  component_type: "earning" | "deduction";
  calculation_type: "fixed" | "percentage" | "auto";
  component_value: string;
  is_balancer?: boolean;
  is_system?: boolean; // System-managed component (BASIC or Special Allowance)
  is_statutory?: boolean; // Statutory component flag
  statutory_type?: string | null; // PF, ESI, PT, GRATUITY
}

// Predefined component names (excluding system components: Basic Salary and Special Allowance)
const PREDEFINED_COMPONENT_NAMES = {
  earning: [
    // "Basic Salary", // Removed - system component
    // "Special Allowance (Balancer)", // Removed - system component (balancer)
    "House Rent Allowance (HRA)",
    "Dearness Allowance (DA)",
    "City Compensatory Allowance (CCA)",
    "Conveyance Allowance",
    "Transport Allowance",
    "Petrol / Fuel Allowance",
    "Food / Meal Allowance",
    "Medical Allowance",
    "Uniform Allowance",
    "Telephone / Internet Allowance",
    "Education Allowance",
    "Children Education Allowance",
    "Hostel Allowance",
    "Shift Allowance (fixed)",
    "Fixed Annual Bonus (Guaranteed)",
    "Guaranteed Performance Pay",
    "Retention Bonus (Guaranteed)",
    "Other Allowance",
  ],
  deduction: [
    "Provident Fund (PF – Employee)",
    "Provident Fund (PF – Employer)",
    "Professional Tax (PT)",
    "Employee State Insurance (ESI)",
    "Labour Welfare Fund (LWF)",
    "Gratuity",
    "Superannuation",
    "National Pension Scheme (NPS – Employer)",
    "Health Insurance Premium",
    "Group Term Insurance",
    "Other Fixed Recoveries",
  ],
};


interface SalaryStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  structure?: any;
  organizationId: string | null;
}

const SalaryStructureModal: React.FC<SalaryStructureModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  structure,
  organizationId,
}) => {
  const [formData, setFormData] = useState({
    structure_name: "",
    structure_description: "",
  });

  const [components, setComponents] = useState<Component[]>([]);
  const [componentIdsOrder, setComponentIdsOrder] = useState<number[]>([]);
  const [customComponentNames, setCustomComponentNames] = useState<{ [key: number]: string }>({});
  // REMOVED: availableComponents state and API fetch - SalaryComponent model removed

  useEffect(() => {
    if (structure?.id) {
      // Edit mode - populate form with existing data
      setFormData({
        structure_name: structure.name || "",
        structure_description: structure.description || "",
      });

      // Populate components from structure.items
      // Handle both formats: nested component object or flat component_name/component_type
      let comps: Component[] = [];
      
      if (structure.items && structure.items.length > 0) {
        comps = structure.items.map((item: any) => {
          const componentObj = item.component || {};
          const componentName = componentObj.name || item.component_name || "";
          // REMOVED: componentId - SalaryComponent model removed
          const isBalancer = componentObj.is_balancer || false;
          const isSystem = componentName === "Basic Salary" || componentName === "Special Allowance" || isBalancer;
          
          // Check if component is statutory - check multiple possible fields
          // Statutory components have statutory_type field set (PF, ESI, PT, GRATUITY, etc.)
          const statutoryType = componentObj.statutory_type || componentObj.statutoryType || null;
          const hasStatutoryType = statutoryType && statutoryType !== null && statutoryType !== undefined && statutoryType !== "";
          const isStatutory = !!(hasStatutoryType || componentObj.is_statutory === true);
          
          // Get calculation_type from item (not component)
          const itemCalculationType = item.calculation_type || componentObj.calculation_type || "fixed";
          // For statutory components, force "auto"
          const calculationType = isStatutory ? "auto" : itemCalculationType;
          
          return {
            // REMOVED: id and component_id - SalaryComponent model removed
            name: componentName,
            component_type: componentObj.component_type || item.component_type || "earning",
            calculation_type: calculationType,
            component_value: isStatutory ? "Auto-calculated" : (item.value?.toString() || item.component_value?.toString() || "0"),
            is_balancer: isBalancer,
            is_system: isSystem,
            is_statutory: isStatutory,
            statutory_type: statutoryType,
          };
        });
      }
      
      // Ensure system components exist in edit mode
      const hasBasic = comps.some((c) => c.name === "Basic Salary");
      const hasBalancer = comps.some((c) => c.is_balancer || c.name === "Special Allowance");
      
      // Add Basic Salary if missing
      if (!hasBasic) {
        comps.unshift({
          name: "Basic Salary",
          component_type: "earning",
          calculation_type: "percentage",
          component_value: "50", // Default 50%
          is_system: true,
          is_balancer: false,
        });
      }
      
      // Add Special Allowance if missing
      if (!hasBalancer) {
        comps.push({
          name: "Special Allowance",
          component_type: "earning",
          calculation_type: "fixed", // Fixed amount (not percentage)
          component_value: "0", // Always 0 - auto-calculated during pay assignment
          is_system: true,
          is_balancer: true,
        });
      }
      
      // Ensure existing Basic Salary and Special Allowance are marked as system
      comps = comps.map((comp) => {
        if (comp.name === "Basic Salary" || comp.name === "Special Allowance") {
          const isSpecialAllowance = comp.name === "Special Allowance";
          return {
            ...comp,
            is_system: true,
            is_balancer: isSpecialAllowance || comp.is_balancer || false,
            // For Special Allowance, ensure calculation_type is "fixed" and value is "0"
            ...(isSpecialAllowance && {
              calculation_type: "fixed",
              component_value: "0",
            }),
          };
        }
        return comp;
      });
      
      setComponents(comps);
      setComponentIdsOrder(comps.map((c: Component, idx: number) => idx));
      
      // Check which components are custom (not in predefined list and not system)
      const customNames: { [key: number]: string } = {};
      comps.forEach((comp: Component, idx: number) => {
        if (!comp.is_system) {
          const predefined = PREDEFINED_COMPONENT_NAMES[comp.component_type as "earning" | "deduction"];
          if (!predefined.includes(comp.name)) {
            customNames[idx] = comp.name;
          }
        }
      });
      setCustomComponentNames(customNames);
    } else {
      // Create mode - reset form and auto-add system components
      setFormData({
        structure_name: "",
        structure_description: "",
      });
      // Auto-add system components: BASIC Salary and Special Allowance
      setComponents([
        {
          name: "Basic Salary",
          component_type: "earning",
          calculation_type: "percentage",
          component_value: "50", // Default 50%
          is_system: true,
          is_balancer: false,
        },
        {
          name: "Special Allowance",
          component_type: "earning",
          calculation_type: "fixed", // Fixed amount (not percentage)
          component_value: "0", // Always 0 - auto-calculated during pay assignment
          is_system: true,
          is_balancer: true,
        },
      ]);
      setComponentIdsOrder([0, 1]);
      setCustomComponentNames({});
    }
  }, [structure, isOpen]);

  const handleComponentChange = (index: number, field: keyof Component, value: any) => {
    const component = components[index];
    
    // 🔒 Prevent changes to statutory components
    if (component.is_statutory) {
      // Statutory components are fully locked
      return;
    }
    
    // Prevent changes to locked system component fields
    if (component.is_system) {
      if (component.is_balancer) {
        // Special Allowance is fully locked
        return;
      } else if (component.name === "Basic Salary") {
        // Basic Salary: only allow percentage value changes
        if (field === "component_value") {
          const newComponents = [...components];
          newComponents[index] = { ...newComponents[index], [field]: value };
          setComponents(newComponents);
        }
        // All other fields are locked for Basic Salary
        return;
      }
    }
    
    const newComponents = [...components];
    newComponents[index] = { ...newComponents[index], [field]: value };
    setComponents(newComponents);
  };

  const addComponent = () => {
    setComponents([
      ...components,
      {
        name: "",
        component_type: "earning",
        calculation_type: "fixed",
        component_value: "0",
      },
    ]);
    setComponentIdsOrder([...componentIdsOrder, components.length]);
  };

  const handleComponentNameChange = (index: number, value: string) => {
    const component = components[index];
    
    // Prevent changes to system components and statutory components
    if (component.is_system || component.is_statutory) {
      return;
    }
    
    const newComponents = [...components];
    if (value === "custom") {
      // User selected "Custom" option, enable custom input
      setCustomComponentNames({ ...customComponentNames, [index]: "" });
        newComponents[index] = { ...newComponents[index], name: "" };
    } else if (value && value !== "") {
      // REMOVED: availableComponents lookup - SalaryComponent model removed
      // Use predefined names only
      const updatedCustomNames = { ...customComponentNames };
      delete updatedCustomNames[index];
      setCustomComponentNames(updatedCustomNames);
      newComponents[index] = { ...newComponents[index], name: value };
    }
    setComponents(newComponents);
  };

  const handleCustomNameChange = (index: number, value: string) => {
    const component = components[index];
    
    // Prevent changes to system components
    if (component.is_system) {
      return;
    }
    
    const newComponents = [...components];
    newComponents[index] = { ...newComponents[index], name: value };
    setComponents(newComponents);
    setCustomComponentNames({ ...customComponentNames, [index]: value });
  };

  const removeComponent = (index: number) => {
    const component = components[index];
    
    // Prevent deletion of system components and statutory components
    if (component.is_system) {
      alert("System-managed components cannot be deleted");
      return;
    }
    
    if (component.is_statutory) {
      alert("Statutory components cannot be deleted. They are system-managed.");
      return;
    }
    
    if (components.length <= 1) {
      alert("At least one component is required");
      return;
    }
    const newComponents = components.filter((_, i) => i !== index);
    setComponents(newComponents);
    setComponentIdsOrder(newComponents.map((_, idx) => idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    

    // Validation
    if (!formData.structure_name.trim()) {
      alert("Please enter structure name");
      return;
    }

    if (components.length === 0) {
      alert("Please add at least one component");
      return;
    }

    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      if (!comp.name.trim()) {
        alert(`Please enter name for component ${i + 1}`);
        return;
      }
      
      // Skip validation for statutory components (they are auto-calculated)
      if (comp.is_statutory) {
        continue;
      }
      
      // Validate non-statutory components
      if (comp.calculation_type === "percentage") {
        const percentageValue = parseFloat(comp.component_value);
        if (isNaN(percentageValue) || percentageValue <= 0) {
          alert(`Please enter a valid percentage value greater than 0 for component "${comp.name}"`);
        return;
        }
        if (percentageValue > 100) {
          alert(`Percentage value cannot exceed 100 for component "${comp.name}"`);
          return;
        }
      } else if (comp.calculation_type === "fixed") {
        const fixedValue = parseFloat(comp.component_value);
        if (isNaN(fixedValue) || fixedValue <= 0) {
          alert(`Please enter a valid amount greater than 0 for component "${comp.name}"`);
          return;
        }
      }
      
      // Validate Basic Salary percentage
      if (comp.name === "Basic Salary" && comp.is_system) {
        const basicPercentage = parseFloat(comp.component_value);
        if (basicPercentage < 0 || basicPercentage > 100) {
          alert("Basic Salary percentage must be between 0 and 100");
          return;
        }
      }
    }
    
    // Ensure Special Allowance (balancer) exists in create mode
    if (!structure?.id) {
      const hasBalancer = components.some((c) => c.is_balancer);
      if (!hasBalancer) {
        alert("Special Allowance (balancer) component is required");
        return;
      }
      
      const hasBasic = components.some((c) => c.name === "Basic Salary" && c.is_system);
      if (!hasBasic) {
        alert("Basic Salary component is required");
        return;
      }
    }

    // Prepare data for API
    const submitData: any = {
      structure_name: formData.structure_name,
      structure_description: formData.structure_description,
      structure_is_active: true, // Always set to true since we removed the field
      components: components.map((comp) => {
        // REMOVED: component_id handling for statutory components - SalaryComponent model removed
        
        // For system components (Basic Salary, Special Allowance)
        if (comp.is_system) {
          return {
        name: comp.name,
        component_type: comp.component_type,
        // For Special Allowance (balancer), always use "fixed" calculation_type
        calculation_type: (comp.is_balancer || comp.name === "Special Allowance") 
          ? "fixed" 
          : comp.calculation_type,
        // For balancer components (Special Allowance), always send "0"
        component_value: (comp.is_balancer || comp.name === "Special Allowance") 
          ? "0" 
          : comp.component_value,
            is_active: true,
        is_balancer: comp.is_balancer || false,
        ...(comp.id && { id: comp.id }), // Include id for updates
          };
        }
        
        // For non-statutory custom components
        return {
          name: comp.name,
          component_type: comp.component_type,
          calculation_type: comp.calculation_type,
          component_value: comp.component_value,
          is_active: true,
          is_balancer: comp.is_balancer || false,
          // REMOVED: component_id - SalaryComponent model removed
          ...(comp.id && { id: comp.id }), // Include id for updates
        };
      }),
      component_ids_order: componentIdsOrder,
    };

    // For update, include structure id and handle differently
    if (structure?.id) {
      submitData.id = structure.id;
      // For update, also include remove_component_ids if any components were removed
      const existingComponentIds = structure.items?.map((item: any) => item.component?.id).filter(Boolean) || [];
      const currentComponentIds = components.map((c) => c.id).filter(Boolean);
      const removedIds = existingComponentIds.filter((id: number) => !currentComponentIds.includes(id));
      if (removedIds.length > 0) {
        submitData.remove_component_ids = removedIds;
      }
    }

    onSubmit(submitData);
  };

  useEffect(() => {
    const modalElement = document.getElementById("salaryStructureModal");
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

  return (
    <div
      className="modal fade"
      id="salaryStructureModal"
      tabIndex={-1}
      aria-labelledby="salaryStructureModalLabel"
      aria-hidden="true"
      style={{ zIndex: 1055 }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content salary-structure-modal">
          <div className="modal-header">
            <div className="d-flex align-items-center gap-3">
              <div className="modal-icon-wrapper">
                <i className="ti ti-building-bank text-primary" style={{ fontSize: "1.25rem" }} />
              </div>
              <div>
                <h5 className="modal-title mb-0" id="salaryStructureModalLabel">
                  {structure?.id ? "Edit Salary Structure" : "Create Salary Structure"}
                </h5>
                <small>
                  {structure?.id ? "Update existing salary structure configuration" : "Define a new salary structure template"}
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {/* Structure Details */}
              <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <i className="ti ti-file-text text-primary" style={{ fontSize: "1.1rem" }} />
                  <h6 className="mb-0 fw-semibold">Structure Details</h6>
                </div>
                <div className="row g-3">
                  <div className="col-md-12">
                    <label className="form-label fw-semibold">
                      Structure Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.structure_name}
                      onChange={(e) =>
                        setFormData({ ...formData, structure_name: e.target.value })
                      }
                      placeholder="Enter structure name (e.g., Manager Structure, Executive Structure)"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Components */}
              <div className="components-section mb-4">
                  <div className="section-header mb-3">
                    <div className="d-flex justify-content-between align-items-center w-100 mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <i className="ti ti-layout-list text-primary" style={{ fontSize: "1.25rem" }} />
                        <h6 className="mb-0 fw-semibold">Salary Components</h6>
                        {components.length > 0 && (
                          <span className="badge bg-primary rounded-pill px-3 py-1">
                            {components.length} {components.length === 1 ? 'Component' : 'Components'}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary d-flex align-items-center gap-2"
                        onClick={addComponent}
                      >
                        <i className="ti ti-plus" />
                        Add Component
                      </button>
                    </div>
                    <div className="section-divider border-top pt-2"></div>
                  </div>

                {/* Table-style components list */}
                {components.length === 0 ? (
                  <div className="empty-state text-center py-5">
                    <i className="ti ti-inbox text-muted" style={{ fontSize: "3rem" }} />
                    <p className="text-muted mt-3 mb-0">No components added yet</p>
                    <small className="text-muted">Click "Add Component" to get started</small>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: "40px" }} className="text-center">
                            <i className="ti ti-lock" style={{ fontSize: "0.75rem" }} />
                          </th>
                          <th className="fw-semibold" style={{ minWidth: "180px", width: "28%", fontSize: "0.8rem" }}>Component Name</th>
                          <th className="fw-semibold text-center" style={{ width: "90px", minWidth: "85px", fontSize: "0.8rem" }}>Type</th>
                          <th className="fw-semibold text-center" style={{ width: "115px", minWidth: "110px", fontSize: "0.8rem" }}>Calculation</th>
                          <th className="fw-semibold text-end" style={{ width: "140px", minWidth: "135px", fontSize: "0.8rem" }}>Value</th>
                          <th className="text-center fw-semibold" style={{ width: "70px", fontSize: "0.8rem" }}>Actions</th>
                        </tr>
                      </thead>
                    <tbody>
                      {components.map((component, index) => {
                        const isSystem = component.is_system || false;
                        const isBalancer = component.is_balancer || false;
                        const isBasic = isSystem && !isBalancer;
                        // Check statutory - look for statutory_type field or is_statutory flag
                        // A component is statutory if statutory_type exists and is not null/empty
                        const hasStatutoryType = component.statutory_type && 
                          component.statutory_type !== null && 
                          component.statutory_type !== undefined && 
                          component.statutory_type !== "";
                        const isStatutory = !!(component.is_statutory || hasStatutoryType);
                        
                        return (
                          <tr 
                            key={index} 
                            className={`component-row ${isStatutory ? 'table-info' : ''}`}
                            style={isStatutory ? { backgroundColor: '#e7f3ff' } : {}}
                          >
                            {/* Lock Icon */}
                            <td className="text-center">
                              {(isSystem || isStatutory) && (
                                <i
                                  className="ti ti-lock text-muted"
                                  style={{ fontSize: "0.875rem" }}
                                  title={
                                    isStatutory
                                      ? `Statutory component (${component.statutory_type}): Auto-calculated from Payroll Settings/PT Rules/Tax Engine`
                                      : isBalancer
                                      ? "System-managed: Auto-adjusted during pay assignment to complete gross salary"
                                      : "System-managed: Basic Salary component"
                                  }
                                />
                              )}
                            </td>
                            
                            {/* Component Name */}
                            <td>
                              {(isSystem || isStatutory) ? (
                                <div className="d-flex align-items-center gap-2">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={component.name}
                                    disabled
                                    readOnly
                                    style={{ 
                                      backgroundColor: isStatutory ? "#fff3cd" : "#f8f9fa", 
                                      fontWeight: "500", 
                                      fontSize: "0.8rem",
                                      border: isStatutory ? "1px solid #ffc107" : "1px solid #dee2e6"
                                    }}
                                  />
                                  {isStatutory && (
                                    <span 
                                      className="badge bg-warning text-dark" 
                                      style={{ fontSize: "0.65rem", fontWeight: "600" }}
                                      title={`Statutory Component: ${component.statutory_type || 'Unknown'}`}
                                    >
                                      🔒 Statutory
                                    </span>
                                  )}
                                  {isBalancer && !isStatutory && (
                                    <span className="badge bg-info text-dark" style={{ fontSize: "0.65rem", fontWeight: "600" }}>
                                      Auto
                                    </span>
                                  )}
                                </div>
                              ) : customComponentNames[index] !== undefined ? (
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={component.name}
                                  onChange={(e) => handleCustomNameChange(index, e.target.value)}
                                  placeholder="Enter custom name"
                                  required
                                  disabled={isBalancer || isStatutory}
                                  style={{
                                    fontSize: "0.8rem",
                                    ...((isBalancer || isStatutory) ? {
                                      backgroundColor: "#f8f9fa",
                                      opacity: 0.6,
                                      cursor: "not-allowed"
                                    } : {})
                                  }}
                                />
                              ) : (
                                <select
                                  className="form-select form-select-sm"
                                  value={component.name || ""}
                                  onChange={(e) => handleComponentNameChange(index, e.target.value)}
                                  required
                                  disabled={isBalancer || isStatutory}
                                  style={{
                                    fontSize: "0.8rem",
                                    ...((isBalancer || isStatutory) ? {
                                      backgroundColor: "#f8f9fa",
                                      opacity: 0.6,
                                      cursor: "not-allowed"
                                    } : {})
                                  }}
                                >
                                  <option value="">Select Component Name</option>
                                  {/* REMOVED: availableComponents dropdown - SalaryComponent model removed */}
                                  {PREDEFINED_COMPONENT_NAMES[component.component_type as "earning" | "deduction"]
                                    .filter((name) => {
                                      // Remove system components (Basic Salary and Special Allowance)
                                      if (name === "Basic Salary" || name === "Special Allowance") {
                                        return false;
                                      }
                                      // Remove already added components (except current one)
                                      const isAlreadyAdded = components.some(
                                        (c, idx) => c.name === name && idx !== index && !c.is_system && !c.is_statutory
                                      );
                                      return !isAlreadyAdded;
                                    })
                                    .map((name) => (
                                      <option key={name} value={name}>
                                        {name}
                                      </option>
                                    ))}
                                  <option value="custom">+ Add Custom Component</option>
                                </select>
                              )}
                            </td>
                            
                            {/* Component Type */}
                            <td className="text-center">
                                <select
                                  className="form-select form-select-sm"
                                  value={component.component_type}
                                  onChange={(e) =>
                                    handleComponentChange(
                                      index,
                                      "component_type",
                                      e.target.value as "earning" | "deduction"
                                    )
                                  }
                                  required
                                  disabled={isSystem || isStatutory}
                                  style={{ minWidth: "100px", fontSize: "0.8rem" }}
                                >
                                <option value="earning">Earning</option>
                                <option value="deduction">Deduction</option>
                              </select>
                            </td>
                            
                            {/* Calculation Type */}
                            <td className="text-center">
                              {(isBalancer || isStatutory) ? (
                                <div className="d-flex flex-column align-items-center gap-1">
                                  <div className="position-relative w-100">
                                <input
                                  type="text"
                                  className="form-control form-control-sm text-center"
                                      value={isStatutory ? "Auto 🔒" : "Auto-calculated"}
                                  disabled
                                  readOnly
                                      style={{ 
                                        backgroundColor: isStatutory ? "#fff3cd" : "#f8f9fa", 
                                        cursor: "not-allowed", 
                                        fontSize: "0.8rem", 
                                        fontWeight: "500",
                                        border: isStatutory ? "1px solid #ffc107" : "1px solid #dee2e6"
                                      }}
                                />
                                    {isStatutory && (
                                      <i 
                                        className="ti ti-lock position-absolute" 
                                        style={{ 
                                          right: "8px", 
                                          top: "50%", 
                                          transform: "translateY(-50%)",
                                          color: "#856404",
                                          fontSize: "0.7rem"
                                        }} 
                                      />
                                    )}
                                  </div>
                                  {isStatutory && (
                                    <small className="text-muted text-center" style={{ fontSize: "0.65rem", maxWidth: "120px" }}>
                                      {component.statutory_type === "PF" || component.statutory_type === "PF_EMPLOYEE" || component.statutory_type === "PF_EMPLOYER"
                                        ? "From Payroll Settings"
                                        : component.statutory_type === "PT"
                                        ? "From PT Rules"
                                        : component.statutory_type === "ESI"
                                        ? "From Payroll Settings"
                                        : component.statutory_type === "GRATUITY"
                                        ? "From Payroll Settings"
                                        : "System Calculated"}
                                    </small>
                                  )}
                                </div>
                              ) : (
                                <select
                                  className="form-select form-select-sm"
                                  value={component.calculation_type}
                                  onChange={(e) =>
                                    handleComponentChange(
                                      index,
                                      "calculation_type",
                                      e.target.value as "fixed" | "percentage"
                                    )
                                  }
                                  required
                                  disabled={isSystem && !isBalancer}
                                  style={{ minWidth: "120px", fontSize: "0.8rem" }}
                                >
                                  <option value="fixed">Fixed</option>
                                  <option value="percentage">Percentage</option>
                                </select>
                              )}
                            </td>
                            
                            {/* Component Value */}
                            <td className="text-end">
                              {(isBalancer || isStatutory) ? (
                                <div className="d-flex flex-column align-items-end gap-1">
                                  <div className="position-relative" style={{ minWidth: "140px" }}>
                                <input
                                  type="text"
                                  className="form-control form-control-sm text-center"
                                      value={isStatutory ? "Auto-calculated 🔒" : "Auto Generate"}
                                  disabled
                                  readOnly
                                      style={{ 
                                        backgroundColor: isStatutory ? "#fff3cd" : "#f8f9fa", 
                                        cursor: "not-allowed", 
                                        fontSize: "0.8rem", 
                                        fontWeight: "500",
                                        border: isStatutory ? "1px solid #ffc107" : "1px solid #dee2e6"
                                      }}
                                />
                                    {isStatutory && (
                                      <i 
                                        className="ti ti-lock position-absolute" 
                                        style={{ 
                                          right: "8px", 
                                          top: "50%", 
                                          transform: "translateY(-50%)",
                                          color: "#856404",
                                          fontSize: "0.7rem"
                                        }} 
                                      />
                                    )}
                                  </div>
                                  {isStatutory && (
                                    <small className="text-muted text-end" style={{ fontSize: "0.65rem", maxWidth: "160px" }}>
                                      Statutory components are system calculated and cannot be edited
                                    </small>
                                  )}
                                </div>
                              ) : (
                                <div className="d-flex flex-column align-items-end gap-1" style={{ width: "100%" }}>
                                <div className="input-group input-group-sm" style={{ maxWidth: "170px", marginLeft: "auto" }}>
                                  {component.calculation_type === "fixed" && (
                                    <span className="input-group-text bg-light" style={{ fontSize: "0.8rem" }}>₹</span>
                                  )}
                                  <input
                                    type="number"
                                    className="form-control text-end"
                                    value={component.component_value}
                                    onChange={(e) =>
                                      handleComponentChange(index, "component_value", e.target.value)
                                    }
                                    min="0"
                                    max={component.calculation_type === "percentage" ? "100" : undefined}
                                    step={component.calculation_type === "percentage" ? "0.01" : "1"}
                                    required
                                    disabled={isSystem && !isBalancer && component.calculation_type !== "percentage"}
                                    placeholder="0"
                                    style={{ 
                                      textAlign: "right",
                                      fontFamily: "monospace",
                                      fontSize: "0.8rem"
                                    }}
                                  />
                                  {component.calculation_type === "percentage" && (
                                    <span className="input-group-text bg-light" style={{ fontSize: "0.8rem" }}>%</span>
                                  )}
                                  </div>
                                  <small className="text-muted" style={{ fontSize: "0.65rem" }}>
                                    This value will be used to calculate salary
                                  </small>
                                </div>
                              )}
                            </td>
                            
                            {/* Actions */}
                            <td>
                              {!isSystem && !isStatutory && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeComponent(index)}
                                  title="Remove component"
                                >
                                  <i className="ti ti-trash" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Info Tooltip */}
                <div className="alert alert-info mt-4 mb-0 d-flex align-items-start" style={{ fontSize: "0.875rem" }}>
                  <i className="ti ti-info-circle me-2 mt-1" style={{ fontSize: "1.1rem" }} />
                  <div>
                    <strong>Component Types:</strong>
                    <ul className="mb-0 mt-2" style={{ paddingLeft: "1.5rem" }}>
                      <li><strong>System Components:</strong> Basic Salary and Special Allowance are system-managed. Basic Salary percentage is editable. Special Allowance is auto-calculated during pay assignment.</li>
                      <li><strong>Statutory Components:</strong> PF, ESI, PT, Gratuity are statutory components. They are auto-calculated from Payroll Settings/PT Rules and cannot be manually edited.</li>
                      <li><strong>Custom Components:</strong> You can enter Fixed Amount or Percentage values for custom earning and deduction components.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer border-top bg-light">
              <button type="button" className="btn btn-light" onClick={onClose}>
                <i className="ti ti-x me-1" />
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary d-flex align-items-center gap-2"
              >
                <i className="ti ti-check" />
                {structure?.id ? "Update Structure" : "Create Structure"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SalaryStructureModal;


