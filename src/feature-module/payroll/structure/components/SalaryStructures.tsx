/**
 * Salary Structures Component
 * Full CRUD operations for Salary Structures
 */

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { salaryStructureAPI } from "../utils/api";
import Table from "../../../../core/common/dataTable/index";
import SalaryStructureModal from "../modals/SalaryStructureModal";
import ViewStructureModal from "../modals/ViewStructureModal";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import { all_routes } from "../../../../feature-module/router/all_routes";

const SalaryStructures: React.FC = () => {
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingStructure, setEditingStructure] = useState<any>(null);
  const [viewingStructure, setViewingStructure] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Get organization ID - simplified synchronous version
  const getOrganizationId = (): string | null => {
    const role = sessionStorage.getItem("role");
    if (role === "organization") {
      // For organization role, user_id is the organization_id
      return sessionStorage.getItem("user_id");
    }
    
    // For admin role, check if there's a selected organization
    const selectedOrgId = sessionStorage.getItem("selected_organization_id");
    if (selectedOrgId) {
      return selectedOrgId;
    }
    
    // For admin role, we need organization_id
    // Admin should select organization or we need to fetch from admin profile
    return null;
  };

  const fetchStructures = useCallback(async () => {
    const role = sessionStorage.getItem("role");
    let organizationId: string | null = null;
    
    if (role === "organization") {
      organizationId = sessionStorage.getItem("user_id");
    } else if (role === "admin") {
      // For admin, backend will automatically fetch organization_id from admin's profile
      // So we can use admin_id as placeholder (backend will override it)
      const adminId = getAdminIdForApi();
      if (!adminId) {
        toast.error("Admin ID not found. Please login again.");
        setLoading(false);
        return;
      }
      organizationId = adminId; // Backend will fetch actual organization_id from AdminProfile
    } else {
      toast.error("Invalid user role.");
      setLoading(false);
      return;
    }
    
    if (!organizationId) {
      toast.error("Organization ID not found. Please login again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await salaryStructureAPI.list(organizationId);

      if (response?.status === 200 && response?.data) {
        let structuresList = Array.isArray(response.data) ? response.data : [];
        
        // Apply search filter
        if (searchQuery) {
          structuresList = structuresList.filter((s: any) =>
            s.name?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        setStructures(structuresList);
        // Don't show success toast on fetch - it's expected behavior
      }
    } catch (error: any) {
      console.error("Error fetching salary structures:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to fetch salary structures";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchStructures();
  }, [fetchStructures]);

  const handleDelete = async (id: number) => {
    // Confirmation message updated - backend will handle the logic
    if (!window.confirm("Are you sure you want to delete this salary structure? If it's assigned to employees, it will be set to inactive instead.")) return;

    const role = sessionStorage.getItem("role");
    let organizationId: string | null = null;
    
    if (role === "organization") {
      organizationId = sessionStorage.getItem("user_id");
    } else if (role === "admin") {
      const adminId = getAdminIdForApi();
      if (!adminId) {
        toast.error("Admin ID not found.");
        return;
      }
      organizationId = adminId; // Backend will fetch actual organization_id from AdminProfile
    } else {
      toast.error("Invalid user role.");
      return;
    }
    
    if (!organizationId) {
      toast.error("Organization ID not found.");
      return;
    }

    try {
      const response = await salaryStructureAPI.delete(organizationId, id);
      if (response?.status === 200 || response?.status === 201) {
        // Check if structure was deactivated instead of deleted
        if (response?.data?.is_active === false) {
          toast.warning(response.message || "Salary structure is assigned to employees. Status set to inactive.");
        } else {
          toast.success(response.message || "Salary structure deleted successfully");
        }
        fetchStructures();
      } else {
        toast.warning(response?.message || "Delete operation completed with warnings");
      }
    } catch (error: any) {
      console.error("Error deleting salary structure:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to delete salary structure";
      toast.error(errorMessage);
    }
  };

  const fetchStructureDetails = async (record: any) => {
    const role = sessionStorage.getItem("role");
    let organizationId: string | null = null;
    
    if (role === "organization") {
      organizationId = sessionStorage.getItem("user_id");
    } else if (role === "admin") {
      const adminId = getAdminIdForApi();
      if (!adminId) {
        toast.error("Admin ID not found.");
        return null;
      }
      organizationId = adminId;
    } else {
      toast.error("Invalid user role.");
      return null;
    }
    
    if (!organizationId) {
      toast.error("Organization ID not found.");
      return null;
    }

    try {
      const response = await salaryStructureAPI.get(organizationId, record.id);
      if (response?.status === 200 && response?.data) {
        return response.data;
      } else {
        toast.error("Failed to load structure details");
        return null;
      }
    } catch (error: any) {
      console.error("Error fetching structure details:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to load structure details";
      toast.error(errorMessage);
      return null;
    }
  };

  const handleView = async (record: any) => {
    const structureDetails = await fetchStructureDetails(record);
    if (structureDetails) {
      setViewingStructure(structureDetails);
    }
  };

  const handleEdit = async (record: any) => {
    // Fetch full structure details with components when editing
    const structureDetails = await fetchStructureDetails(record);
    if (structureDetails) {
      setEditingStructure(structureDetails);
    }
  };

  const handleSubmit = async (data: any) => {
    const role = sessionStorage.getItem("role");
    let organizationId: string | null = null;
    
    if (role === "organization") {
      organizationId = sessionStorage.getItem("user_id");
    } else if (role === "admin") {
      const adminId = getAdminIdForApi();
      if (!adminId) {
        toast.error("Admin ID not found.");
        return;
      }
      organizationId = adminId; // Backend will fetch actual organization_id from AdminProfile
    } else {
      toast.error("Invalid user role.");
      return;
    }
    
    if (!organizationId) {
      toast.error("Organization ID not found.");
      return;
    }

    try {
      const isUpdate = !!data.id;
      const response = isUpdate
        ? await salaryStructureAPI.update(organizationId, data.id, data)
        : await salaryStructureAPI.create(organizationId, data);

      if (response?.status === 200 || response?.status === 201) {
        toast.success(response.message || `Salary structure ${isUpdate ? "updated" : "created"} successfully`);
        setEditingStructure(null);
        fetchStructures();
      } else {
        toast.warning(response?.message || `Salary structure ${isUpdate ? "update" : "creation"} completed with warnings`);
      }
    } catch (error: any) {
      console.error("Error saving salary structure:", error);
      
      // Handle validation errors
      if (error.response?.data?.data) {
        const validationErrors = error.response.data.data;
        if (validationErrors.components) {
          // Show component validation errors
          const componentErrors = validationErrors.components;
          Object.keys(componentErrors).forEach((key) => {
            const compErrors = componentErrors[key];
            Object.keys(compErrors).forEach((field) => {
              toast.error(`Component ${parseInt(key) + 1} - ${field}: ${compErrors[field][0]}`);
            });
          });
        } else {
          // Show other validation errors
          Object.keys(validationErrors).forEach((field) => {
            const fieldErrors = validationErrors[field];
            if (Array.isArray(fieldErrors)) {
              fieldErrors.forEach((err: string) => toast.error(`${field}: ${err}`));
            } else {
              toast.error(`${field}: ${fieldErrors}`);
            }
          });
        }
      } else {
        // Show general error message
        const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to save salary structure";
        toast.error(errorMessage);
      }
    }
  };

  const columns = [
    {
      title: "Structure Name",
      dataIndex: "name",
      render: (text: string) => <span className="fw-bold">{text || "N/A"}</span>,
    },
    {
      title: "Components",
      dataIndex: "items",
      render: (items: any[]) => {
        if (!items || items.length === 0) return <span className="text-muted">No components</span>;
        // Handle both formats: nested component object or flat component_type
        const earnings = items.filter((i: any) => {
          const componentType = i.component?.component_type || i.component_type;
          return componentType === "earning";
        }).length;
        const deductions = items.filter((i: any) => {
          const componentType = i.component?.component_type || i.component_type;
          return componentType === "deduction";
        }).length;
        return (
          <div>
            <span className="badge bg-success me-1">{earnings} Earnings</span>
            <span className="badge bg-danger">{deductions} Deductions</span>
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "is_active",
      render: (isActive: boolean) => (
        <span className={`badge ${isActive ? "bg-success" : "bg-danger"}`}>
          {isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      render: (date: string) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      },
    },
    {
      title: "Actions",
      dataIndex: "id",
      render: (_: any, record: any) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            onClick={(e) => {
              e.preventDefault();
              handleView(record);
            }}
            title="View Details"
          >
            <i className="ti ti-eye" />
          </Link>
          <Link
            to="#"
            className="me-2"
            onClick={(e) => {
              e.preventDefault();
              handleEdit(record);
            }}
            title="Edit"
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            onClick={(e) => {
              e.preventDefault();
              handleDelete(record.id);
            }}
            title="Delete"
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
        <h5>Salary Structures</h5>
        <div className="d-flex gap-2 flex-wrap">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search structures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "200px" }}
          />
          <Link
            to="#"
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              e.preventDefault();
              setEditingStructure({});
            }}
          >
            <i className="ti ti-plus me-1" />
            Create Structure
          </Link>
        </div>
      </div>
      <div className="card-body p-0">
        {loading ? (
          <p className="p-3">Loading salary structures...</p>
        ) : (
          <Table columns={columns} dataSource={structures} Selection={false} />
        )}
      </div>

      <SalaryStructureModal
        isOpen={editingStructure !== null}
        onClose={() => setEditingStructure(null)}
        onSubmit={handleSubmit}
        structure={editingStructure}
        organizationId={(() => {
          const role = sessionStorage.getItem("role");
          if (role === "organization") {
            return sessionStorage.getItem("user_id");
          } else if (role === "admin") {
            return getAdminIdForApi(); // Backend will fetch actual organization_id from AdminProfile
          }
          return null;
        })()}
      />

      <ViewStructureModal
        isOpen={viewingStructure !== null}
        onClose={() => setViewingStructure(null)}
        structure={viewingStructure}
        onEdit={async (structure) => {
          const structureDetails = await fetchStructureDetails(structure);
          if (structureDetails) {
            setEditingStructure(structureDetails);
          }
        }}
        onDelete={handleDelete}
      />
      
      {/* Toast Container */}
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
    </div>
  );
};

export default SalaryStructures;

