/**
 * View Salary Structure Modal Component
 * Display-only modal for viewing structure details
 */

import React, { useEffect } from "react";

interface ViewStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  structure: any;
  onEdit?: (structure: any) => void;
  onDelete?: (structureId: number) => void;
}

const ViewStructureModal: React.FC<ViewStructureModalProps> = ({
  isOpen,
  onClose,
  structure,
  onEdit,
  onDelete,
}) => {
  useEffect(() => {
    const modalElement = document.getElementById("viewStructureModal");
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

  if (!isOpen || !structure) return null;

  // Handle both formats: nested component object or flat component_name/component_type
  // Deduplicate by component ID to avoid showing same component twice
  const seenComponentIds = new Set<number>();
  const earnings = structure.items?.filter((item: any) => {
    const componentId = item.component?.id || item.component_id;
    const componentType = item.component?.component_type || item.component_type;
    
    // Skip if already seen (duplicate)
    if (componentId && seenComponentIds.has(componentId)) {
      return false;
    }
    
    if (componentId) {
      seenComponentIds.add(componentId);
    }
    
    return componentType === "earning";
  }) || [];
  
  const seenDeductionIds = new Set<number>();
  const deductions = structure.items?.filter((item: any) => {
    const componentId = item.component?.id || item.component_id;
    const componentType = item.component?.component_type || item.component_type;
    
    // Skip if already seen (duplicate)
    if (componentId && seenDeductionIds.has(componentId)) {
      return false;
    }
    
    if (componentId) {
      seenDeductionIds.add(componentId);
    }
    
    return componentType === "deduction";
  }) || [];

  return (
    <div
      className="modal fade"
      id="viewStructureModal"
      tabIndex={-1}
      aria-labelledby="viewStructureModalLabel"
      aria-hidden="true"
      style={{ zIndex: 1055 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="viewStructureModalLabel">
              View Salary Structure: {structure.name}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {/* Structure Details */}
            <div className="mb-4">
              <h6 className="mb-3">Structure Details</h6>
              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label fw-bold">Structure Name</label>
                  <p className="form-control-plaintext">{structure.name || "N/A"}</p>
                </div>
                <div className="col-md-12">
                  <label className="form-label fw-bold">Description</label>
                  <p className="form-control-plaintext">{structure.description || "N/A"}</p>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Status</label>
                  <p>
                    <span className={`badge ${structure.is_active ? "bg-success" : "bg-danger"}`}>
                      {structure.is_active ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Created At</label>
                  <p className="form-control-plaintext">
                    {structure.created_at
                      ? new Date(structure.created_at).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Earnings */}
            {earnings.length > 0 && (
              <div className="mb-4">
                <h6 className="mb-3">
                  Earnings <span className="badge bg-success">{earnings.length}</span>
                </h6>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead className="thead-light">
                      <tr>
                        <th>Component Name</th>
                        <th>Type</th>
                        <th className="text-end">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.map((item: any, index: number) => {
                        const componentName = item.component?.name || item.component_name || "N/A";
                        const calculationType = item.component?.calculation_type || "fixed";
                        const componentValue = item.component?.component_value || 0;
                        return (
                          <tr key={index}>
                            <td>{componentName}</td>
                            <td>
                              <span className="badge bg-info">
                                {calculationType === "percentage" ? "Percentage" : "Fixed"}
                              </span>
                            </td>
                            <td className="text-end">
                              {calculationType === "percentage"
                                ? `${componentValue}%`
                                : `₹${parseFloat(componentValue.toString()).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Deductions */}
            {deductions.length > 0 && (
              <div className="mb-4">
                <h6 className="mb-3">
                  Deductions <span className="badge bg-danger">{deductions.length}</span>
                </h6>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead className="thead-light">
                      <tr>
                        <th>Component Name</th>
                        <th>Type</th>
                        <th className="text-end">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deductions.map((item: any, index: number) => {
                        const componentName = item.component?.name || item.component_name || "N/A";
                        const calculationType = item.component?.calculation_type || "fixed";
                        const componentValue = item.component?.component_value || 0;
                        return (
                          <tr key={index}>
                            <td>{componentName}</td>
                            <td>
                              <span className="badge bg-info">
                                {calculationType === "percentage" ? "Percentage" : "Fixed"}
                              </span>
                            </td>
                            <td className="text-end">
                              {calculationType === "percentage"
                                ? `${componentValue}%`
                                : `₹${parseFloat(componentValue.toString()).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {earnings.length === 0 && deductions.length === 0 && (
              <div className="alert alert-info">
                <i className="ti ti-info-circle me-2" />
                No components found in this structure.
              </div>
            )}
          </div>
          <div className="modal-footer">
            {onEdit && (
              <button
                type="button"
                className="btn btn-primary me-2"
                onClick={() => {
                  onEdit(structure);
                  onClose();
                }}
              >
                <i className="ti ti-edit me-1" />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="btn btn-danger me-2"
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this salary structure? If it's assigned to employees, it will be set to inactive instead.")) {
                    onDelete(structure.id);
                    onClose();
                  }
                }}
              >
                <i className="ti ti-trash me-1" />
                Delete
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewStructureModal;

