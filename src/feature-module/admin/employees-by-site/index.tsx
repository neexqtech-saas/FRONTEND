import React, { useState, useEffect, useCallback } from "react";
import { BACKEND_PATH } from "../../../environment";
import axios from "axios";
import { toast } from "react-toastify";

interface Employee {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  custom_employee_id: string;
  designation?: string;
  job_title?: string;
  phone_number?: string;
  assignment_start_date: string;
  assignment_end_date?: string;
  is_active: boolean;
  profile_photo?: string;
}

interface SiteInfo {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
}

interface SiteEmployeesResponse {
  status: number;
  message: string;
  data: {
    site: SiteInfo;
    employees: Employee[];
    total_employees: number;
  };
}

const EmployeesBySite: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);

  useEffect(() => {
    const siteId = sessionStorage.getItem("selected_site_id");
    if (siteId) {
      const parsedSiteId = parseInt(siteId);
      if (!isNaN(parsedSiteId)) {
        setSelectedSiteId(parsedSiteId);
        fetchEmployees(parsedSiteId);
      } else {
        toast.error("Invalid site ID");
        setLoading(false);
      }
    } else {
      toast.error("Please select a site first");
      setLoading(false);
    }
  }, []);

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("access_token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const fetchEmployees = useCallback(async (siteId: number) => {
    try {
      setLoading(true);
      console.log("Fetching employees for site:", siteId);
      const response = await axios.get<SiteEmployeesResponse>(
        `${BACKEND_PATH}admin/site-employees/?site_id=${siteId}`,
        getAuthHeaders()
      );

      console.log("API Response:", response.data);

      if (response.data.status === 200 && response.data.data) {
        setEmployees(response.data.data.employees || []);
        setSiteInfo(response.data.data.site);
        if (!response.data.data.employees || response.data.data.employees.length === 0) {
          toast.info("No employees assigned to this site yet");
        }
      } else {
        toast.error(response.data.message || "Failed to fetch employees");
        setEmployees([]);
      }
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch employees";
      toast.error(errorMessage);
      setEmployees([]);
      // If site not found, try to get site info from sessionStorage
      const siteName = sessionStorage.getItem("selected_site_name");
      if (siteName) {
        setSiteInfo({
          id: siteId,
          name: siteName,
          address: "",
          city: "",
          state: ""
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      emp.employee_name.toLowerCase().includes(query) ||
      emp.employee_email.toLowerCase().includes(query) ||
      emp.custom_employee_id.toLowerCase().includes(query) ||
      (emp.designation && emp.designation.toLowerCase().includes(query)) ||
      (emp.job_title && emp.job_title.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="container-fluid">
      {/* Site Info Header */}
      {siteInfo && (
        <div className="card mb-4 border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap">
              <div>
                <h4 className="mb-2" style={{ fontWeight: "600", color: "#333" }}>
                  <i className="feather-map-pin me-2 text-primary"></i>
                  {siteInfo.name}
                </h4>
                <p className="text-muted mb-0">
                  <i className="feather-map me-1"></i>
                  {siteInfo.address}, {siteInfo.city}, {siteInfo.state}
                </p>
              </div>
              <div className="text-end">
                <div className="badge bg-primary fs-6 px-3 py-2">
                  {employees.length} Employee{employees.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-body p-3">
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
              <i className="feather-search"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search employees by name, email, ID, designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ borderLeft: "none" }}
            />
            {searchQuery && (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setSearchQuery("")}
              >
                <i className="feather-x"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Employees Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center p-5">
            <i className="feather-users" style={{ fontSize: "64px", color: "#ccc" }}></i>
            <h5 className="mt-3 text-muted">No employees found</h5>
            <p className="text-muted">
              {searchQuery
                ? "Try adjusting your search criteria"
                : "No employees are assigned to this site"}
            </p>
          </div>
        </div>
      ) : (
        <div className="row">
          {filteredEmployees.map((employee) => (
            <div key={employee.employee_id} className="col-md-6 col-lg-4 col-xl-3 mb-4">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: "10px" }}>
                <div className="card-body p-4">
                  <div className="text-center mb-3">
                    {employee.profile_photo ? (
                      <img
                        src={employee.profile_photo}
                        className="rounded-circle"
                        style={{ width: "80px", height: "80px", objectFit: "cover" }}
                        alt={employee.employee_name}
                      />
                    ) : (
                      <div
                        className="rounded-circle d-inline-flex align-items-center justify-content-center"
                        style={{
                          width: "80px",
                          height: "80px",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "white",
                          fontSize: "32px",
                          fontWeight: "600",
                        }}
                      >
                        {employee.employee_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h6 className="mb-1" style={{ fontWeight: "600", color: "#333" }}>
                      {employee.employee_name}
                    </h6>
                    <p className="text-muted small mb-2">{employee.employee_email}</p>
                    <div className="mb-2">
                      <span className="badge bg-light text-dark">
                        ID: {employee.custom_employee_id}
                      </span>
                    </div>
                    {employee.designation && (
                      <p className="small text-muted mb-1">
                        <i className="feather-briefcase me-1"></i>
                        {employee.designation}
                      </p>
                    )}
                    {employee.job_title && (
                      <p className="small text-muted mb-2">
                        {employee.job_title}
                      </p>
                    )}
                    {employee.phone_number && (
                      <p className="small text-muted mb-2">
                        <i className="feather-phone me-1"></i>
                        {employee.phone_number}
                      </p>
                    )}
                    <div className="mt-3 pt-3 border-top">
                      <small className="text-muted d-block">
                        <i className="feather-calendar me-1"></i>
                        Assigned: {new Date(employee.assignment_start_date).toLocaleDateString()}
                      </small>
                      {employee.assignment_end_date && (
                        <small className="text-muted d-block mt-1">
                          Until: {new Date(employee.assignment_end_date).toLocaleDateString()}
                        </small>
                      )}
                      <span
                        className={`badge mt-2 ${
                          employee.is_active ? "bg-success" : "bg-secondary"
                        }`}
                      >
                        {employee.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default EmployeesBySite;

