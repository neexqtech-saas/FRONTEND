import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAdminIdForApi, getSelectedSiteId, buildApiUrlWithSite } from "../../core/utils/apiHelpers";
import Table from "../../core/common/dataTable/index";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import AssetCategoryModal from "./AssetCategoryModal";
import AssetModal from "./AssetModal";

const AssetManagement = () => {
  const [activeTab, setActiveTab] = useState<"categories" | "assets">("categories");
  const [categories, setCategories] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState({
    total_items: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
    has_next: false,
    has_previous: false
  });
  
  // Set default dates to last 10 days
  const getDefaultDates = () => {
    const today = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 10);
    return {
      from: tenDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
  };
  
  const defaultDates = getDefaultDates();
  const [dateFrom, setDateFrom] = useState<string>(defaultDates.from);
  const [dateTo, setDateTo] = useState<string>(defaultDates.to);
  
  // Debounce search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, statusFilter, categoryFilter, dateFrom, dateTo]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id) {
        const role = sessionStorage.getItem("role");
        if (role === "organization") {
          toast.error("Please select an admin first from the dashboard.");
        }
        setLoading(false);
        return;
      }

      if (!token) {
        toast.error("Please login again.");
        setLoading(false);
        return;
      }

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        setLoading(false);
        return;
      }

      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/asset/categories/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }

      const response = await axios.get(
        url,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data && response.data.status === 200 && response.data.data) {
        setCategories(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        setCategories([]);
      }
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      toast.error(error.response?.data?.message || "Failed to fetch categories");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id) {
        const role = sessionStorage.getItem("role");
        if (role === "organization") {
          toast.error("Please select an admin first from the dashboard.");
        }
        setLoading(false);
        return;
      }

      if (!token) {
        toast.error("Please login again.");
        setLoading(false);
        return;
      }

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        setLoading(false);
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/asset/assets/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      const params = new URLSearchParams();
      
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      if (categoryFilter) {
        params.append('category', categoryFilter);
      }
      if (dateFrom) {
        params.append('date_from', dateFrom);
      }
      if (dateTo) {
        params.append('date_to', dateTo);
      }
      params.append('page', currentPage.toString());
      params.append('page_size', pageSize.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle pagination response structure
      let assetsList = [];
      if (response.data) {
        // Check for pagination format with results
        if (response.data.results && Array.isArray(response.data.results)) {
          assetsList = response.data.results;
        } else if (response.data.status === 200 && response.data.data) {
          // Standard response format: { status: 200, data: [...] }
          assetsList = Array.isArray(response.data.data) ? response.data.data : [];
        } else if (Array.isArray(response.data)) {
          // Direct array response
          assetsList = response.data;
        }
        
        // Update pagination state
        if (response.data.count !== undefined) {
          setPagination({
            total_items: response.data.count || response.data.total_objects || 0,
            total_pages: response.data.total_pages || 1,
            current_page: response.data.current_page_number || currentPage,
            page_size: response.data.page_size || pageSize,
            has_next: response.data.has_next || false,
            has_previous: response.data.has_previous || false
          });
        }
      }
      
      setAssets(assetsList);
    } catch (error: any) {
      console.error("Error fetching assets:", error);
      toast.error(error.response?.data?.message || "Failed to fetch assets");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, statusFilter, categoryFilter, dateFrom, dateTo, currentPage, pageSize]);

  useEffect(() => {
    if (activeTab === "categories") {
      fetchCategories();
    } else {
      fetchAssets();
    }
  }, [activeTab, fetchCategories, fetchAssets]);

  const handleCategorySubmit = async (categoryData: any) => {
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id || !token) {
        toast.error("Please login again.");
        return;
      }

      // Check if categoryData has id (for update) or use editingCategory
      const categoryId = categoryData.id || editingCategory?.id;
      const isUpdate = !!categoryId;

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = isUpdate
        ? `http://127.0.0.1:8000/api/asset/categories/${site_id}/${categoryId}/`
        : `http://127.0.0.1:8000/api/asset/categories/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }

      // Remove id from data before sending
      const { id, ...dataToSend } = categoryData;

      const response = isUpdate
        ? await axios.put(url, dataToSend, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await axios.post(url, dataToSend, {
            headers: { Authorization: `Bearer ${token}` },
          });

      if (response.data && (response.data.status === 200 || response.data.status === 201)) {
        toast.success(response.data.message || "Category saved successfully");
        setEditingCategory(null);
        fetchCategories();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save category");
    }
  };

  const handleAssetSubmit = async (assetData: any) => {
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id || !token) {
        toast.error("Please login again.");
        return;
      }

      // Check if assetData has id (for update) or use editingAsset
      const assetId = assetData.id || editingAsset?.id;
      const isUpdate = !!assetId;

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = isUpdate
        ? `http://127.0.0.1:8000/api/asset/assets/${site_id}/${assetId}/`
        : `http://127.0.0.1:8000/api/asset/assets/${site_id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }

      // Remove id from data before sending
      const { id, ...dataToSend } = assetData;

      const response = isUpdate
        ? await axios.put(url, dataToSend, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await axios.post(url, dataToSend, {
            headers: { Authorization: `Bearer ${token}` },
          });

      if (response.data && (response.data.status === 200 || response.data.status === 201)) {
        toast.success(response.data.message || "Asset saved successfully");
        setEditingAsset(null);
        fetchAssets();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save asset");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id || !token) {
        toast.error("Please login again.");
        return;
      }

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/asset/categories/${site_id}/${id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }

      const response = await axios.delete(
        url,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data && response.data.status === 200) {
        toast.success(response.data.message || "Category deleted successfully");
        fetchCategories();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete category");
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id || !token) {
        toast.error("Please login again.");
        return;
      }

      const site_id = getSelectedSiteId();
      if (!site_id) {
        toast.error("Please select a site first");
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `http://127.0.0.1:8000/api/asset/assets/${site_id}/${id}/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }

      const response = await axios.delete(
        url,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data && response.data.status === 200) {
        toast.success(response.data.message || "Asset deleted successfully");
        fetchAssets();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete asset");
    }
  };

  const categoryColumns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (text: string) => <span>{text || "N/A"}</span>,
    },
    {
      title: "Code",
      dataIndex: "code",
      render: (text: string) => <span>{text || "N/A"}</span>,
    },
    {
      title: "Description",
      dataIndex: "description",
      render: (text: string) => <span>{text || "N/A"}</span>,
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
      title: "Actions",
      dataIndex: "id",
      render: (_: any, record: any) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            onClick={(e) => {
              e.preventDefault();
              setEditingCategory(record);
            }}
            title="Edit"
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            onClick={(e) => {
              e.preventDefault();
              handleDeleteCategory(record.id);
            }}
            title="Delete"
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  const assetColumns = [
    {
      title: "Asset Code",
      dataIndex: "asset_code",
      render: (text: string) => <span>{text || "—"}</span>,
      sorter: (a: any, b: any) => (a.asset_code ?? "").localeCompare(b.asset_code ?? ""),
    },
    {
      title: "Name",
      dataIndex: "name",
      render: (text: string) => <span>{text || "—"}</span>,
      sorter: (a: any, b: any) => (a.name ?? "").localeCompare(b.name ?? ""),
    },
    {
      title: "Category",
      dataIndex: "category_name",
      render: (text: string) => <span>{text || "—"}</span>,
      sorter: (a: any, b: any) => (a.category_name ?? "").localeCompare(b.category_name ?? ""),
    },
    {
      title: "Brand",
      dataIndex: "brand",
      render: (text: string) => <span>{text || "—"}</span>,
      sorter: (a: any, b: any) => (a.brand ?? "").localeCompare(b.brand ?? ""),
    },
    {
      title: "Model",
      dataIndex: "model",
      render: (text: string) => <span>{text || "—"}</span>,
      sorter: (a: any, b: any) => (a.model ?? "").localeCompare(b.model ?? ""),
    },
    {
      title: "Serial Number",
      dataIndex: "serial_number",
      render: (text: string) => <span>{text || "—"}</span>,
      sorter: (a: any, b: any) => (a.serial_number ?? "").localeCompare(b.serial_number ?? ""),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => {
        const statusColors: any = {
          available: "bg-success",
          assigned: "bg-info",
          maintenance: "bg-warning",
          retired: "bg-secondary",
          disposed: "bg-danger",
        };
        return (
          <span className={`badge ${statusColors[status] || "bg-secondary"}`}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : "N/A"}
          </span>
        );
      },
      sorter: (a: any, b: any) => (a.status ?? "").localeCompare(b.status ?? ""),
    },
    {
      title: "Condition",
      dataIndex: "condition",
      render: (condition: string) => {
        const conditionColors: any = {
          excellent: "bg-success",
          good: "bg-info",
          fair: "bg-warning",
          poor: "bg-danger",
        };
        return (
          <span className={`badge ${conditionColors[condition] || "bg-secondary"}`}>
            {condition ? condition.charAt(0).toUpperCase() + condition.slice(1) : "N/A"}
          </span>
        );
      },
      sorter: (a: any, b: any) => (a.condition ?? "").localeCompare(b.condition ?? ""),
    },
    {
      title: "Location",
      dataIndex: "location",
      render: (text: string) => <span>{text || "—"}</span>,
      sorter: (a: any, b: any) => (a.location ?? "").localeCompare(b.location ?? ""),
    },
    {
      title: "Purchase Date",
      dataIndex: "purchase_date",
      render: (date: string) => {
        if (date) {
          return <span>{new Date(date).toLocaleDateString("en-GB")}</span>;
        }
        return <span>—</span>;
      },
      sorter: (a: any, b: any) => {
        const dateA = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
        const dateB = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: "Purchase Price",
      dataIndex: "purchase_price",
      render: (price: string | number) => {
        if (price) {
          return <span>₹{parseFloat(String(price)).toFixed(2)}</span>;
        }
        return <span>—</span>;
      },
      sorter: (a: any, b: any) => parseFloat(String(a.purchase_price || "0")) - parseFloat(String(b.purchase_price || "0")),
    },
    {
      title: "Current Value",
      dataIndex: "current_value",
      render: (value: string | number) => {
        if (value) {
          return <span>₹{parseFloat(String(value)).toFixed(2)}</span>;
        }
        return <span>—</span>;
      },
      sorter: (a: any, b: any) => parseFloat(String(a.current_value || "0")) - parseFloat(String(b.current_value || "0")),
    },
    {
      title: "Warranty Expiry",
      dataIndex: "warranty_expiry",
      render: (date: string) => {
        if (date) {
          return <span>{new Date(date).toLocaleDateString("en-GB")}</span>;
        }
        return <span>—</span>;
      },
      sorter: (a: any, b: any) => {
        const dateA = a.warranty_expiry ? new Date(a.warranty_expiry).getTime() : 0;
        const dateB = b.warranty_expiry ? new Date(b.warranty_expiry).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: "Vendor",
      dataIndex: "vendor",
      render: (text: string) => <span>{text || "—"}</span>,
      sorter: (a: any, b: any) => (a.vendor ?? "").localeCompare(b.vendor ?? ""),
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
              setEditingAsset(record);
            }}
            title="Edit"
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            onClick={(e) => {
              e.preventDefault();
              handleDeleteAsset(record.id);
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
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Asset Management</h2>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="mb-2 d-flex gap-2">
                <Link
                  to="#"
                  className="btn btn-outline-primary d-flex align-items-center"
                  onClick={() => setEditingCategory({})}
                >
                  <i className="ti ti-tag me-2" />
                  Add Category
                </Link>
                <Link
                  to="#"
                  className="btn btn-primary d-flex align-items-center"
                  onClick={() => setEditingAsset({})}
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Asset
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Tabs */}
          <div className="card">
            <div className="card-body">
              <ul className="nav nav-tabs nav-tabs-solid nav-tabs-rounded">
                <li className="nav-item">
                  <a
                    className={`nav-link ${activeTab === "categories" ? "active" : ""}`}
                    onClick={() => setActiveTab("categories")}
                    style={{ cursor: "pointer" }}
                  >
                    Categories
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className={`nav-link ${activeTab === "assets" ? "active" : ""}`}
                    onClick={() => setActiveTab("assets")}
                    style={{ cursor: "pointer" }}
                  >
                    Assets
                  </a>
                </li>
              </ul>

              <div className="tab-content mt-3">
                {activeTab === "categories" && (
                  <div className="tab-pane fade show active">
                    <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                      <h5>Asset Categories</h5>
                    </div>
                    <div className="card-body p-0">
                      {loading ? (
                        <p className="p-3">Loading categories...</p>
                      ) : (
                        <Table
                          columns={categoryColumns}
                          dataSource={categories}
                          Selection={false}
                        />
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "assets" && (
                  <div className="tab-pane fade show active">
                    {/* Filters Card */}
                    <div className="card mb-3">
                      <div className="card-header">
                        <h5 className="mb-0">Filters</h5>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          <div className="col-md-3">
                            <label className="form-label">Search</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Search assets..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Status</label>
                            <select
                              className="form-select form-select-sm"
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                            >
                              <option value="">All Status</option>
                              <option value="available">Available</option>
                              <option value="assigned">Assigned</option>
                              <option value="maintenance">Maintenance</option>
                              <option value="retired">Retired</option>
                              <option value="disposed">Disposed</option>
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Category</label>
                            <select
                              className="form-select form-select-sm"
                              value={categoryFilter}
                              onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                              <option value="">All Categories</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Date From</label>
                            <input
                              type="date"
                              className="form-control form-control-sm"
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                            />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Date To</label>
                            <input
                              type="date"
                              className="form-control form-control-sm"
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                            />
                          </div>
                          <div className="col-md-1 d-flex align-items-end">
                            <button
                              className="btn btn-primary btn-sm w-100"
                              onClick={fetchAssets}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Assets Table */}
                    <div className="card">
                      <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                        <h5 className="mb-0">Assets</h5>
                        <button
                          className="btn btn-success btn-sm d-flex align-items-center"
                          onClick={async () => {
                            try {
                              const token = sessionStorage.getItem("access_token");
                              const admin_id = getAdminIdForApi();
                              
                              if (!admin_id || !token) {
                                toast.error("Please login again.");
                                return;
                              }
                              
                              const site_id = getSelectedSiteId();
                              if (!site_id) {
                                toast.error("Please select a site first");
                                return;
                              }
                              // Admin role: backend gets admin_id from request.user
                              // Organization role: admin_id should be passed as query param
                              const role = sessionStorage.getItem("role");
                              let url = `http://127.0.0.1:8000/api/asset/assets/${site_id}/?export=true`;
                              if (role === "organization" && admin_id) {
                                url += `&admin_id=${admin_id}`;
                              }
                              const params = new URLSearchParams();
                              
                              if (debouncedSearchQuery) {
                                params.append('search', debouncedSearchQuery);
                              }
                              if (statusFilter) {
                                params.append('status', statusFilter);
                              }
                              if (categoryFilter) {
                                params.append('category', categoryFilter);
                              }
                              if (dateFrom) {
                                params.append('date_from', dateFrom);
                              }
                              if (dateTo) {
                                params.append('date_to', dateTo);
                              }
                              
                              if (params.toString()) {
                                url += `&${params.toString()}`;
                              }
                              
                              const response = await axios.get(url, {
                                headers: { Authorization: `Bearer ${token}` },
                                responseType: 'blob',
                              });
                              
                              const blob = new Blob([response.data], {
                                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                              });
                              const url_blob = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url_blob;
                              link.download = 'assets.xlsx';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url_blob);
                              
                              toast.success("Excel file downloaded successfully");
                            } catch (error: any) {
                              console.error("Error downloading Excel:", error);
                              toast.error(error.response?.data?.message || "Failed to download Excel file");
                            }
                          }}
                        >
                          <i className="ti ti-download me-2" />
                          Download Excel
                        </button>
                      </div>
                      <div className="card-body p-0">
                        {loading ? (
                          <p className="p-3">Loading assets...</p>
                        ) : (
                          <>
                            <Table
                              columns={assetColumns}
                              dataSource={assets}
                              Selection={false}
                            />
                            {pagination.total_items > 0 && (
                              <div className="d-flex align-items-center justify-content-between mt-3 pt-3 border-top px-3">
                                <div className="d-flex align-items-center">
                                  <span className="me-2">Show:</span>
                                  <select
                                    className="form-select form-select-sm"
                                    style={{ width: "80px" }}
                                    value={pageSize}
                                    onChange={(e) => {
                                      setPageSize(Number(e.target.value));
                                      setCurrentPage(1);
                                    }}
                                  >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                  </select>
                                  <span className="ms-2">
                                    Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                                    {Math.min(currentPage * pageSize, pagination.total_items)} of{" "}
                                    {pagination.total_items} entries
                                  </span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    disabled={!pagination.has_previous || loading}
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                  >
                                    Previous
                                  </button>
                                  <span>
                                    Page {pagination.current_page || currentPage} of {pagination.total_pages || 1}
                                  </span>
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    disabled={!pagination.has_next || loading}
                                    onClick={() => setCurrentPage((prev) => prev + 1)}
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
          <p className="mb-0">2025 © NeexQ</p>
          <p>
            Designed &amp; Developed By{" "}
            <Link to="#" className="text-primary">
              NeexQ
            </Link>
          </p>
        </div>
      </div>
      {/* /Page Wrapper */}

      {/* Modals - Always render for Bootstrap to manage */}
      <AssetCategoryModal
        isOpen={editingCategory !== null}
        onClose={() => {
          setEditingCategory(null);
          // Cleanup backdrop
          const backdrops = document.querySelectorAll('.modal-backdrop');
          backdrops.forEach(backdrop => backdrop.remove());
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }}
        onSubmit={handleCategorySubmit}
        category={editingCategory}
        categories={categories}
      />

      <AssetModal
        isOpen={editingAsset !== null}
        onClose={() => {
          setEditingAsset(null);
          // Cleanup backdrop
          const backdrops = document.querySelectorAll('.modal-backdrop');
          backdrops.forEach(backdrop => backdrop.remove());
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }}
        onSubmit={handleAssetSubmit}
        asset={editingAsset}
        categories={categories}
      />

      <ToastContainer />
    </>
  );
};

export default AssetManagement;

