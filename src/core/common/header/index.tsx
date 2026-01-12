import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  setDataLayout,
} from "../../data/redux/themeSettingSlice";
import ImageWithBasePath from "../imageWithBasePath";
import {
  setMobileSidebar,
  toggleMiniSidebar,
} from "../../data/redux/sidebarSlice";
import { all_routes } from "../../../feature-module/router/all_routes";
import { HorizontalSidebarData } from '../../data/json/horizontalSidebar'
import axios from "axios";
import { BACKEND_PATH } from "../../../environment";
import { toast } from "react-toastify";
import { getAdminIdForApi, notifySiteChange } from "../../utils/apiHelpers";

interface Admin {
  id: string;
  admin_name: string;
  user_id?: string; // From new API structure
  email?: string; // From new API structure
  username?: string; // From new API structure
  phone_number?: string; // From new API structure
  status?: boolean; // From new API structure
  is_active?: boolean; // From new API structure
  user?: { // For backward compatibility with nested structure
    id: string;
    email: string;
    username: string;
    phone_number: string;
    is_active: boolean;
  };
  organization: string;
  created_at: string;
  updated_at?: string;
}

interface AdminListResponse {
  results: Admin[];
  count: number;
  next: string | null;
  previous: string | null;
  summary: {
    total: number;
    active: number;
    inactive: number;
  };
}

const Header = () => {
  const routes = all_routes;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const dataLayout = useSelector((state: any) => state.themeSetting.dataLayout);
  const Location = useLocation();
  
  // Admin selector state for organization role
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  
  // Site selector state for organization role
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<any | null>(null);
  const [loadingSites, setLoadingSites] = useState(false);
  
  // Admin name state for admin role
  const [adminName, setAdminName] = useState<string | null>(null);
  const [adminSiteName, setAdminSiteName] = useState<string | null>(null);
  
  // Profile dropdown state
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  
  // Admin and Site dropdown states
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const adminDropdownRef = useRef<HTMLDivElement>(null);
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const siteDropdownRef = useRef<HTMLDivElement>(null);
  
  const role = sessionStorage.getItem("role")?.trim();

  const handleLogout = () => {
    // Clear all session storage
    sessionStorage.clear();
    localStorage.removeItem("remember_device");
    // Navigate to login and force reload
    window.location.href = routes.login;
  };

  // Fetch admins for organization role
  const fetchAdmins = async () => {
    if (role !== "organization") return;
    
    try {
      setLoadingAdmins(true);
      const token = sessionStorage.getItem("access_token");
      const response = await axios.get<{ status: number; message: string; data: AdminListResponse }>(
        `${BACKEND_PATH}organization/admins`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.data.status === 200 && response.data.data) {
        const data = response.data.data;
        let adminsList: Admin[] = [];
        
        if (Array.isArray(data)) {
          adminsList = data;
        } else if (data && typeof data === 'object' && data.results && Array.isArray(data.results)) {
          // Map flat API response to nested structure for backward compatibility
          adminsList = data.results.map((admin: any) => ({
            ...admin,
            user: admin.user || {
              id: admin.user_id || admin.id,
              email: admin.email || '',
              username: admin.username || '',
              phone_number: admin.phone_number || '',
              is_active: admin.is_active ?? admin.status ?? true,
            },
            is_active: admin.is_active ?? admin.status ?? true,
            status: admin.status ?? admin.is_active ?? true,
          }));
        } else {
          adminsList = [];
        }
        
        // Show all admins (both active and inactive)
        setAdmins(adminsList);
        
        // Check if there's a previously selected admin in sessionStorage
        const selectedAdminId = sessionStorage.getItem("selected_admin_id");
        if (selectedAdminId && adminsList.length > 0) {
          const foundAdmin = adminsList.find(a => (a.user?.id || a.user_id) === selectedAdminId);
          if (foundAdmin) {
            setSelectedAdmin(foundAdmin);
          } else if (adminsList.length > 0) {
            // Auto-select first admin if previously selected admin not found
            const firstAdmin = adminsList[0];
            setSelectedAdmin(firstAdmin);
            const firstAdminUserId = firstAdmin.user?.id || firstAdmin.user_id;
            if (firstAdminUserId) {
              sessionStorage.setItem("selected_admin_id", firstAdminUserId);
            }
          }
        } else if (adminsList.length > 0) {
          // Auto-select first admin if no previous selection
          const firstAdmin = adminsList[0];
          setSelectedAdmin(firstAdmin);
          const firstAdminUserId = firstAdmin.user?.id || firstAdmin.user_id;
          if (firstAdminUserId) {
            sessionStorage.setItem("selected_admin_id", firstAdminUserId);
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching admins:", error);
      // Don't show toast error in header to avoid disruption
    } finally {
      setLoadingAdmins(false);
    }
  };

  // Fetch sites for selected admin
  const fetchSitesForAdmin = async (adminUserId: string) => {
    if (role !== "organization") return;
    
    try {
      setLoadingSites(true);
      const token = sessionStorage.getItem("access_token");
      // Organization role: admin_id should be passed as query param
      const response = await axios.get<{ status: number; message: string; data: any[] }>(
        `${BACKEND_PATH}admin/sites/?admin_id=${adminUserId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.data.status === 200 && response.data.data) {
        setSites(response.data.data);
        
        // Check if there's a previously selected site in sessionStorage
        const selectedSiteId = sessionStorage.getItem("selected_site_id");
        if (selectedSiteId && response.data.data.length > 0) {
          // Compare as strings (UUIDs are strings)
          const foundSite = response.data.data.find((s: any) => String(s.id) === String(selectedSiteId));
          if (foundSite) {
            setSelectedSite(foundSite);
          } else if (response.data.data.length > 0) {
            // Auto-select first site if previously selected site not found
            const firstSite = response.data.data[0];
            setSelectedSite(firstSite);
            notifySiteChange(String(firstSite.id), firstSite.site_name);
          }
        } else if (response.data.data.length > 0) {
          // Auto-select first site if no previous selection (first time login)
          const firstSite = response.data.data[0];
          setSelectedSite(firstSite);
          notifySiteChange(String(firstSite.id), firstSite.site_name);
        }
      }
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      setSites([]);
    } finally {
      setLoadingSites(false);
    }
  };

  // Fetch admins on mount if organization role
  useEffect(() => {
    if (role === "organization") {
      fetchAdmins();
    }
  }, [role]);

  // Fetch sites when admin is selected
  useEffect(() => {
    if (role === "organization" && selectedAdmin) {
      const adminUserId = selectedAdmin.user?.id || selectedAdmin.user_id;
      if (adminUserId) {
        fetchSitesForAdmin(adminUserId);
      }
    }
  }, [selectedAdmin, role]);

  // Fetch admin name for admin role
  useEffect(() => {
    if (role === "admin") {
      const fetchAdminInfo = async () => {
        try {
          const token = sessionStorage.getItem("access_token");
          const response = await axios.get<{ status: number; message: string; data: any }>(
            `${BACKEND_PATH}session-info`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          
          if (response.data.status === 200 && response.data.data?.admin_name) {
            setAdminName(response.data.data.admin_name);
          }
        } catch (error: any) {
          console.error("Error fetching admin info:", error);
        }
      };
      fetchAdminInfo();
      
      // Get site name from sessionStorage
      const siteName = sessionStorage.getItem("selected_site_name");
      setAdminSiteName(siteName);
    }
  }, [role]);

  // Listen for storage changes to update site name for admin role
  useEffect(() => {
    if (role === "admin") {
      const handleStorageChange = () => {
        const siteName = sessionStorage.getItem("selected_site_name");
        setAdminSiteName(siteName);
      };
      
      // Listen for custom storage event
      window.addEventListener('storage', handleStorageChange);
      
      // Also check periodically (for same-tab updates)
      const interval = setInterval(() => {
        const siteName = sessionStorage.getItem("selected_site_name");
        if (siteName !== adminSiteName) {
          setAdminSiteName(siteName);
        }
      }, 500);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
      };
    }
  }, [role, adminSiteName]);

  // Handle admin selection change
  const handleAdminSelectionChange = (adminId: string) => {
    const admin = admins.find(a => a.id === adminId);
    if (admin) {
      setSelectedAdmin(admin);
      setShowAdminDropdown(false); // Close dropdown
      const userId = admin.user?.id || admin.user_id;
      if (userId) {
        sessionStorage.setItem("selected_admin_id", userId);
        // Clear site selection when admin changes
        setSelectedSite(null);
        sessionStorage.removeItem("selected_site_id");
        sessionStorage.removeItem("selected_site_name");
        toast.success(`Switched to admin: ${admin.admin_name}`);
        // Fetch sites for new admin
        fetchSitesForAdmin(userId);
        // Refresh page after a brief delay to reload data with new admin
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
  };

  // Handle site selection change
  const handleSiteSelectionChange = (siteId: string | number) => {
    // Convert to string for consistent comparison (UUIDs are strings)
    const siteIdStr = String(siteId);
    const site = sites.find((s: any) => String(s.id) === siteIdStr);
    if (site) {
      setSelectedSite(site);
      setShowSiteDropdown(false); // Close dropdown
      // Use notifySiteChange to update sessionStorage and dispatch event
      notifySiteChange(String(site.id), site.site_name);
      toast.success(`Switched to site: ${site.site_name}`);
      // Trigger page refresh to reload data with new site
      // Small delay ensures sessionStorage is updated before reload
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  // Add custom styles for profile dropdown and page background
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .profile-dropdown .dropdown-item:hover {
        background-color: #f8f9fa !important;
        transform: translateX(4px);
      }
      .profile-dropdown .dropdown-item.text-danger:hover {
        background-color: #fee !important;
      }
      /* Page background color - light gray instead of pure white */
      body, .page-wrapper, .content {
        background-color:rgb(255, 255, 255) !important;
      }
      .page-wrapper .content {
        background-color:rgb(236, 236, 236) !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Close profile dropdown when clicking outside
  React.useEffect(() => {
    if (!showProfileDropdown) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    
    // Use setTimeout to ensure the dropdown is rendered before adding listener
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [showProfileDropdown]);

  // Close admin dropdown when clicking outside
  React.useEffect(() => {
    if (!showAdminDropdown) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target as Node)) {
        setShowAdminDropdown(false);
      }
    };
    
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [showAdminDropdown]);

  // Close site dropdown when clicking outside
  React.useEffect(() => {
    if (!showSiteDropdown) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(event.target as Node)) {
        setShowSiteDropdown(false);
      }
    };
    
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [showSiteDropdown]);

  const [subOpen, setSubopen] = useState<any>("");
  const [subsidebar, setSubsidebar] = useState("");

  const toggleSidebar = (title: any) => {
	localStorage.setItem("menuOpened", title);
	if (title === subOpen) {
	  setSubopen("");
	} else {
	  setSubopen(title);
	}
  };

  const toggleSubsidebar = (subitem: any) => {
	if (subitem === subsidebar) {
	  setSubsidebar("");
	} else {
	  setSubsidebar(subitem);
	}
  };
  const mobileSidebar = useSelector(
    (state: any) => state.sidebarSlice.mobileSidebar
  );

  const toggleMobileSidebar = () => {
    dispatch(setMobileSidebar(!mobileSidebar));
  };


  const handleToggleMiniSidebar = () => {
    if (dataLayout === "mini_layout") {
      dispatch(setDataLayout("default_layout"));
      localStorage.setItem("dataLayout", "default_layout");
    } else {
      dispatch(toggleMiniSidebar());
    }
  };




  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
        });
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch((err) => {
          });
        }
        setIsFullscreen(false);
      }
    }
  };

  return (
    <>
      {/* Header */}
      <div className="header">
			<div className="main-header">

				<div className="header-left">
					<Link to={routes.adminDashboard} className="logo">
						<ImageWithBasePath src="assets/img/logo/logo4.png" alt="Logo"   className="login-logo"/>
					</Link>
					<Link to={routes.adminDashboard} className="dark-logo">
						<ImageWithBasePath src="assets/img/logo/logo4.png" alt="Logo"/>
					</Link>
					{/* Admin and Site Info Display */}
					{((role === "organization" && (selectedAdmin || selectedSite)) || 
					  (role === "admin" && (adminName || adminSiteName))) && (
						<div className="ms-3 d-flex align-items-center gap-3" style={{ fontSize: '14px' }}>
							{/* Admin Name Display */}
							{(role === "organization" && selectedAdmin) && (
								<div className="d-flex align-items-center" style={{ 
									background: 'rgba(99, 102, 241, 0.1)', 
									padding: '6px 12px', 
									borderRadius: '6px',
									border: '1px solid rgba(99, 102, 241, 0.2)'
								}}>
									<i className="ti ti-user-shield me-2" style={{ color: '#6366f1' }}></i>
									<span style={{ fontWeight: '500', color: '#1f2937' }}>
										Admin: <span style={{ color: '#6366f1' }}>{selectedAdmin.admin_name}</span>
									</span>
								</div>
							)}
							{role === "admin" && adminName && (
								<div className="d-flex align-items-center" style={{ 
									background: 'rgba(99, 102, 241, 0.1)', 
									padding: '6px 12px', 
									borderRadius: '6px',
									border: '1px solid rgba(99, 102, 241, 0.2)'
								}}>
									<i className="ti ti-user-shield me-2" style={{ color: '#6366f1' }}></i>
									<span style={{ fontWeight: '500', color: '#1f2937' }}>
										Admin: <span style={{ color: '#6366f1' }}>{adminName}</span>
									</span>
								</div>
							)}
							{/* Site Name Display */}
							{(role === "organization" && selectedSite) && (
								<div className="d-flex align-items-center" style={{ 
									background: 'rgba(16, 185, 129, 0.1)', 
									padding: '6px 12px', 
									borderRadius: '6px',
									border: '1px solid rgba(16, 185, 129, 0.2)'
								}}>
									<i className="ti ti-map-pin me-2" style={{ color: '#10b981' }}></i>
									<span style={{ fontWeight: '500', color: '#1f2937' }}>
										Site: <span style={{ color: '#10b981' }}>{selectedSite.site_name}</span>
									</span>
								</div>
							)}
							{role === "admin" && adminSiteName && (
								<div className="d-flex align-items-center" style={{ 
									background: 'rgba(16, 185, 129, 0.1)', 
									padding: '6px 12px', 
									borderRadius: '6px',
									border: '1px solid rgba(16, 185, 129, 0.2)'
								}}>
									<i className="ti ti-map-pin me-2" style={{ color: '#10b981' }}></i>
									<span style={{ fontWeight: '500', color: '#1f2937' }}>
										Site: <span style={{ color: '#10b981' }}>{adminSiteName}</span>
									</span>
								</div>
							)}
						</div>
					)}
				</div>

				<Link id="mobile_btn" onClick={toggleMobileSidebar} className="mobile_btn" to="#sidebar">
					<span className="bar-icon">
						<span></span>
						<span></span>
						<span></span>
					</span>
				</Link>

				<div className="header-user">
					<div className="nav user-menu nav-list">

						<div className="me-auto d-flex align-items-center" id="header-search">
							<div className="dropdown crm-dropdown">
								<div className="dropdown-menu dropdown-lg dropdown-menu-start">
									<div className="card mb-0 border-0 shadow-none">
										<div className="card-header">
											<h4>CRM</h4>
										</div>
										<div className="card-body pb-1">		
											<div className="row">
												<div className="col-sm-6">							
													<Link to={routes.contactList} className="d-flex align-items-center justify-content-between p-2 crm-link mb-3">
														<span className="d-flex align-items-center me-3">
															<i className="ti ti-user-shield text-default me-2"></i>Contacts
														</span>
														<i className="ti ti-arrow-right"></i>
													</Link>							
													<Link to={routes.dealsGrid} className="d-flex align-items-center justify-content-between p-2 crm-link mb-3">
														<span className="d-flex align-items-center me-3">
															<i className="ti ti-heart-handshake text-default me-2"></i>Deals
														</span>
														<i className="ti ti-arrow-right"></i>
													</Link>								
													<Link to={routes.pipeline} className="d-flex align-items-center justify-content-between p-2 crm-link mb-3">
														<span className="d-flex align-items-center me-3">
															<i className="ti ti-timeline-event-text text-default me-2"></i>Pipeline
														</span>
														<i className="ti ti-arrow-right"></i>
													</Link>		
												</div>
												<div className="col-sm-6">							
													<Link to={routes.companiesGrid} className="d-flex align-items-center justify-content-between p-2 crm-link mb-3">
														<span className="d-flex align-items-center me-3">
															<i className="ti ti-building text-default me-2"></i>Companies
														</span>
														<i className="ti ti-arrow-right"></i>
													</Link>								
													<Link to={routes.leadsGrid} className="d-flex align-items-center justify-content-between p-2 crm-link mb-3">
														<span className="d-flex align-items-center me-3">
															<i className="ti ti-user-check text-default me-2"></i>Leads
														</span>
														<i className="ti ti-arrow-right"></i>
													</Link>								
													<Link to={routes.activity} className="d-flex align-items-center justify-content-between p-2 crm-link mb-3">
														<span className="d-flex align-items-center me-3">
															<i className="ti ti-activity text-default me-2"></i>Activities
														</span>
														<i className="ti ti-arrow-right"></i>
													</Link>		
												</div>
											</div>		
										</div>
									</div>
								</div>
							</div>
						</div>

						<div className="sidebar sidebar-horizontal" id="horizontal-single">
							<div className="sidebar-menu">
								<div className="main-menu">
									<ul className="nav-menu">
										<li className="menu-title">
											<span>Main</span>
										</li>
										{HorizontalSidebarData?.map((mainMenu, index) => (
											<React.Fragment key={`main-${index}`}>
												{mainMenu?.menu?.map((data, i) => (
												<li className="submenu" key={`menu-${i}`}>
													<Link to="#" className={`
														${
															data?.subMenus
																?.map((link: any) => link?.route)
																.includes(Location.pathname) 
																? "active"
																: ""
															} ${subOpen === data.menuValue ? "subdrop" : ""}`} onClick={() => toggleSidebar(data.menuValue)}>
													<i className={`ti ti-${data.icon}`}></i>
													<span>{data.menuValue}</span>
													<span className="menu-arrow"></span>
													</Link>

													{/* First-level Submenus */}
													<ul style={{ display: subOpen === data.menuValue ? "block" : "none" }}>
													{data?.subMenus?.map((subMenu:any, j) => (
														<li
														key={`submenu-${j}`}
														className={subMenu?.customSubmenuTwo ? "submenu" : ""}
														>
														<Link to={subMenu?.route || "#"} className={`${
															subMenu?.subMenusTwo
																?.map((link: any) => link?.route)
																.includes(Location.pathname) || subMenu?.route === Location.pathname
																? "active"
																: ""
															} ${subsidebar === subMenu.menuValue ? "subdrop" : ""}`} onClick={() => toggleSubsidebar(subMenu.menuValue)}>
															<span>{subMenu?.menuValue}</span>
															{subMenu?.customSubmenuTwo && <span className="menu-arrow"></span>}
														</Link>

														{/* Check if `customSubmenuTwo` exists */}
														{subMenu?.customSubmenuTwo && subMenu?.subMenusTwo && (
															<ul style={{ display: subsidebar === subMenu.menuValue ? "block" : "none" }}>
															{subMenu.subMenusTwo.map((subMenuTwo:any, k:number) => (
																<li key={`submenu-two-${k}`}>
																<Link className={subMenuTwo.route === Location.pathname?'active':''} to={subMenuTwo.route}>{subMenuTwo.menuValue}</Link>
																</li>
															))}
															</ul>
														)}
														</li>
													))}
													</ul>
												</li>
												))}
											</React.Fragment>
											))}
									</ul>
								</div>
							</div>
						</div>

					<div className="d-flex align-items-center gap-3">
						{/* Admin Selector for Organization Role */}
						{role === "organization" && (
							<div className="d-flex align-items-center">
								{/* Main Admin Button - Navigates to Dashboard */}
								<Link
									to={routes.organizationDashboard}
									className="btn btn-light d-flex align-items-center text-decoration-none"
									style={{
										minWidth: '200px',
										justifyContent: 'space-between',
										borderRadius: '8px',
										fontSize: '14px',
										cursor: 'pointer',
										color: '#1f2937'
									}}
								>
									<span className="d-flex align-items-center">
										<i className="ti ti-user-shield me-2"></i>
										{loadingAdmins ? (
											<span>Loading...</span>
										) : selectedAdmin ? (
											<span>{selectedAdmin.admin_name}</span>
										) : (
											<span>Admin</span>
										)}
									</span>
								</Link>
								{/* Dropdown for Admin Selection */}
								<div className="dropdown ms-2" ref={adminDropdownRef} style={{ position: 'relative' }}>
									<button
										className="btn btn-light dropdown-toggle d-flex align-items-center justify-content-center"
										type="button"
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											setShowAdminDropdown(!showAdminDropdown);
										}}
										disabled={loadingAdmins}
										title="Select Admin"
										style={{
											borderRadius: '8px',
											fontSize: '16px',
											width: '40px',
											height: '40px',
											padding: '0',
											position: 'relative',
											zIndex: 1000,
											border: '1px solid #dee2e6',
											cursor: loadingAdmins ? 'not-allowed' : 'pointer'
										}}
									>
										<i className="ti ti-chevron-down"></i>
									</button>
									{showAdminDropdown && (
										<ul
											className="dropdown-menu dropdown-menu-end show"
											style={{ 
												minWidth: '250px', 
												maxHeight: '400px', 
												overflowY: 'auto',
												zIndex: 1050,
												position: 'absolute',
												top: '100%',
												right: 0,
												marginTop: '8px',
												display: 'block'
											}}
										>
									<li>
										<h6 className="dropdown-header">Select Admin</h6>
									</li>
									{admins.length === 0 ? (
										<li>
											<span className="dropdown-item-text text-muted">No admins available</span>
										</li>
									) : (
										admins.map((admin) => (
											<li key={admin.id}>
												<button
													className={`dropdown-item d-flex align-items-center ${
														selectedAdmin?.id === admin.id ? 'active' : ''
													}`}
													onClick={() => handleAdminSelectionChange(admin.id)}
													style={{ cursor: 'pointer' }}
												>
													<i className="ti ti-check me-2" style={{ 
														visibility: selectedAdmin?.id === admin.id ? 'visible' : 'hidden' 
													}}></i>
													<div className="flex-grow-1">
														<div className="fw-medium">{admin.admin_name}</div>
														<small className="text-muted">
															{admin.user?.email || admin.user?.username || ''}
														</small>
													</div>
												</button>
											</li>
										))
									)}
									<li><hr className="dropdown-divider" /></li>
									<li>
										<Link
											className="dropdown-item d-flex align-items-center"
											to={routes.organizationDashboard}
											state={{ openAddAdminModal: true }}
										>
											<i className="ti ti-user-plus me-2"></i>
											<span>Add Admin</span>
										</Link>
									</li>
									{admins.length > 0 && (
										<li>
											<Link
												className="dropdown-item d-flex align-items-center"
												to={routes.organizationDashboard}
											>
												<i className="ti ti-dashboard me-2"></i>
												<span>Go to Dashboard</span>
											</Link>
										</li>
									)}
									</ul>
									)}
								</div>
							</div>
						)}
						
						{/* Site Selector for Organization Role */}
						{role === "organization" && selectedAdmin && (
							<div className="d-flex align-items-center">
								{/* Main Site Button - Shows Selected Site */}
								<button
									className="btn btn-light d-flex align-items-center text-decoration-none"
									style={{
										minWidth: '200px',
										justifyContent: 'space-between',
										borderRadius: '8px',
										fontSize: '14px',
										cursor: 'pointer',
										color: '#1f2937',
										border: '1px solid #dee2e6'
									}}
									disabled
								>
									<span className="d-flex align-items-center">
										<i className="ti ti-map-pin me-2"></i>
										{loadingSites ? (
											<span>Loading...</span>
										) : selectedSite ? (
											<span>{selectedSite.site_name}</span>
										) : (
											<span>Select Site</span>
										)}
									</span>
								</button>
								{/* Dropdown for Site Selection */}
								<div className="dropdown ms-2" ref={siteDropdownRef} style={{ position: 'relative' }}>
									<button
										className="btn btn-light dropdown-toggle d-flex align-items-center justify-content-center"
										type="button"
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											setShowSiteDropdown(!showSiteDropdown);
										}}
										disabled={loadingSites || sites.length === 0}
										title="Select Site"
										style={{
											borderRadius: '8px',
											fontSize: '16px',
											width: '40px',
											height: '40px',
											padding: '0',
											position: 'relative',
											zIndex: 1000,
											border: '1px solid #dee2e6',
											cursor: (loadingSites || sites.length === 0) ? 'not-allowed' : 'pointer'
										}}
									>
										<i className="ti ti-chevron-down"></i>
									</button>
								{showSiteDropdown && (
									<ul
										className="dropdown-menu dropdown-menu-end show"
										style={{ 
											minWidth: '250px', 
											maxHeight: '400px', 
											overflowY: 'auto',
											zIndex: 1050,
											position: 'absolute',
											top: '100%',
											right: 0,
											marginTop: '8px',
											display: 'block'
										}}
									>
									<li>
										<h6 className="dropdown-header">Select Site</h6>
									</li>
									{sites.length === 0 ? (
										<li>
											<span className="dropdown-item-text text-muted">No sites available</span>
										</li>
									) : (
										sites.map((site: any) => {
											const isSelected = selectedSite && String(selectedSite.id) === String(site.id);
											return (
											<li key={site.id}>
												<button
													className={`dropdown-item d-flex align-items-center ${
														isSelected ? 'active' : ''
													}`}
													onClick={() => handleSiteSelectionChange(site.id)}
													style={{ cursor: 'pointer' }}
												>
													<i className="ti ti-check me-2" style={{ 
														visibility: isSelected ? 'visible' : 'hidden' 
													}}></i>
													<div className="flex-grow-1">
														<div className="fw-medium">{site.site_name}</div>
														<small className="text-muted">
															{site.city}, {site.state}
														</small>
													</div>
												</button>
											</li>
											);
										})
									)}
								</ul>
								)}
								</div>
							</div>
						)}
						
						<div className="dropdown profile-dropdown" ref={profileDropdownRef} style={{ position: 'relative' }}>
							<button 
								type="button"
								className="dropdown-toggle d-flex align-items-center border-0 bg-transparent p-0"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setShowProfileDropdown(!showProfileDropdown);
								}}
								style={{ cursor: 'pointer' }}
							>
								<span className="avatar avatar-md online">
									<ImageWithBasePath src="assets/img/profiles/avatar-12.jpg" alt="Img" className="img-fluid rounded-circle"/>
								</span>
							</button>
							{showProfileDropdown && (
								<div 
									className="dropdown-menu dropdown-menu-end shadow-lg border-0 p-2 show" 
									style={{ 
										minWidth: '220px', 
										borderRadius: '8px', 
										zIndex: 1050,
										position: 'absolute',
										top: '100%',
										right: 0,
										marginTop: '8px',
										display: 'block',
										opacity: 1,
										visibility: 'visible'
									}}
								>
									<div className="d-flex flex-column gap-2">
										{/* Change Password Button */}
										<Link 
											className="btn btn-outline-primary d-flex align-items-center justify-content-start w-100" 
											to={routes.securitysettings}
											onClick={() => setShowProfileDropdown(false)}
											style={{ 
												transition: 'all 0.3s ease',
												borderRadius: '6px',
												padding: '10px 15px'
											}}
										>
											<i className="ti ti-lock me-2" style={{ fontSize: '18px' }}></i>
											<span className="fw-medium">Change Password</span>
										</Link>
										
										{/* Logout Button */}
										<button
											className="btn btn-outline-danger d-flex align-items-center justify-content-start w-100"
											onClick={(e) => {
												e.preventDefault();
												setShowProfileDropdown(false);
												handleLogout();
											}}
											style={{ 
												transition: 'all 0.3s ease',
												borderRadius: '6px',
												padding: '10px 15px',
												cursor: 'pointer'
											}}
										>
											<i className="ti ti-logout me-2" style={{ fontSize: '18px' }}></i>
											<span className="fw-medium">Logout</span>
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				<div className="dropdown mobile-user-menu">
					<Link to="#" className="nav-link dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
						<i className="fa fa-ellipsis-v"></i>
					</Link>
					<div className="dropdown-menu dropdown-menu-end p-2" style={{ minWidth: '200px', borderRadius: '8px' }}>
						<div className="d-flex flex-column gap-2">
							<Link 
								className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-start w-100" 
								to={routes.securitysettings}
								style={{ borderRadius: '6px', padding: '8px 12px' }}
							>
								<i className="ti ti-lock me-2"></i>
								Change Password
							</Link>
							<button
								className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-start w-100"
								onClick={(e) => {
									e.preventDefault();
									handleLogout();
								}}
								style={{ borderRadius: '6px', padding: '8px 12px', cursor: 'pointer' }}
							>
								<i className="ti ti-logout me-2"></i>
								Logout
							</button>
						</div>
					</div>
				</div>

				</div>
			</div>

		</div>
      {/* /Header */}
    </>
  );
};

export default Header;
