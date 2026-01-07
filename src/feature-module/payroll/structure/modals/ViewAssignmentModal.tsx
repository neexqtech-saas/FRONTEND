/**
 * View Assignment Modal Component
 * View employee structure assignment details
 */

import React, { useEffect } from "react";

interface ViewAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  employees: any[];
  structures: any[];
}

const ViewAssignmentModal: React.FC<ViewAssignmentModalProps> = ({
  isOpen,
  onClose,
  assignment,
  employees,
  structures,
}) => {
  useEffect(() => {
    const modalElement = document.getElementById("viewAssignmentModal");
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

  if (!isOpen || !assignment) return null;

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(
      (e: any) => e.user?.id === employeeId || e.id === employeeId || e.user_id === employeeId
    );
    return employee?.user_name || employee?.user?.username || employee?.user?.email || employee?.email || "N/A";
  };

  const getStructureName = (structureId: number) => {
    const structure = structures.find((s: any) => s.id === structureId);
    return structure?.name || "N/A";
  };

  const getStructureDetails = (structureId: number) => {
    return structures.find((s: any) => s.id === structureId);
  };

  const employeeId = assignment.employee_id || assignment.employee?.id;
  const structureId = assignment.structure_id || assignment.structure?.id;
  const structure = getStructureDetails(structureId);

  const isActive = () => {
    const today = new Date();
    const effectiveFrom = new Date(assignment.effective_from);

    if (today < effectiveFrom) return false;
    return true;
  };

  const earnings = structure?.items?.filter((item: any) => {
    const componentType = item.component?.component_type || item.component_type;
    return componentType === "earning";
  }) || [];

  const deductions = structure?.items?.filter((item: any) => {
    const componentType = item.component?.component_type || item.component_type;
    return componentType === "deduction";
  }) || [];

  return (
    <div
      className="modal fade"
      id="viewAssignmentModal"
      tabIndex={-1}
      aria-labelledby="viewAssignmentModalLabel"
      aria-hidden="true"
      style={{ zIndex: 1055 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="viewAssignmentModalLabel">
              Assignment Details
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {/* Assignment Details */}
            <div className="mb-4">
              <h6 className="mb-3">Assignment Information</h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Employee</label>
                  <p className="form-control-plaintext">{getEmployeeName(employeeId)}</p>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Structure</label>
                  <p className="form-control-plaintext">{getStructureName(structureId)}</p>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Gross Salary</label>
                  <p className="form-control-plaintext text-success fw-bold">
                    ₹{parseFloat(assignment.gross_salary?.toString() || "0").toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Status</label>
                  <p>
                    <span className={`badge ${isActive() ? "bg-success" : "bg-secondary"}`}>
                      {isActive() ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Effective From</label>
                  <p className="form-control-plaintext">
                    {assignment.effective_from
                      ? new Date(assignment.effective_from).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Structure Components */}
            {structure && (
              <div className="mb-4">
                <h6 className="mb-3">Structure Components</h6>

                {/* Earnings */}
                {earnings.length > 0 && (
                  <div className="mb-3">
                    <h6 className="text-success">
                      Earnings <span className="badge bg-success">{earnings.length}</span>
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead>
                          <tr>
                            <th>Component</th>
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
                  <div className="mb-3">
                    <h6 className="text-danger">
                      Deductions <span className="badge bg-danger">{deductions.length}</span>
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead>
                          <tr>
                            <th>Component</th>
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
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAssignmentModal;

