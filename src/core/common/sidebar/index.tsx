import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Scrollbars from "react-custom-scrollbars-2";
import ImageWithBasePath from "../imageWithBasePath";
import "../../../style/icon/tabler-icons/webfont/tabler-icons.css";
import { setExpandMenu } from "../../data/redux/sidebarSlice";
import { useDispatch } from "react-redux";
import {
  resetAllMode,
  setDataLayout,
  setDataSidebar,
} from "../../data/redux/themeSettingSlice";
import usePreviousRoute from "./usePreviousRoute";
import { SidebarDataTest } from "../sidebarMenu";
import { getFilteredSidebarData } from "../../utils/menuUtils";
import { useOrganizationSettings } from "../../utils/useOrganizationSettings";
import axios from "axios";
import { BACKEND_PATH } from "../../../environment";
import { getSelectedSiteId, getSelectedSiteName, getAdminIdForApi, notifySiteChange } from "../../utils/apiHelpers";
import { toast } from "react-toastify";

interface Admin {
  id: string;
  admin_name: string;
  user_id?: string;
  email?: string;
}

const Sidebar = () => {
  // Get organization settings to filter menu items
  const orgSettings = useOrganizationSettings();
  const enabledMenuItems = orgSettings?.enabled_menu_items || {};
  
  // Get user role from sessionStorage
  const currentRole = sessionStorage.getItem("role");
  
  // Get filtered sidebar data based on enabled menu items and role
  const filteredSidebarData = getFilteredSidebarData(enabledMenuItems, currentRole);
  const Location = useLocation();

  const [subOpen, setSubopen] = useState<any>("Dashboard");
  const [subsidebar, setSubsidebar] = useState("");
  
  // Site selection state for admin
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedSiteName, setSelectedSiteName] = useState<string | null>(null);
  const [loadingSites, setLoadingSites] = useState(false);
  
  const [userRole, setUserRole] = useState<string | null>(null);

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

  const handleLayoutChange = (layout: string) => {
    dispatch(setDataLayout(layout));
  };

  const handleClick = (label: any, themeSetting: any, layout: any) => {
    toggleSidebar(label);
    if (themeSetting) {
      handleLayoutChange(layout);
    }
  };

  const getLayoutClass = (label: any) => {
    switch (label) {
      case "Default":
        return "default_layout";
      case "Mini":
        return "mini_layout";
      case "Box":
        return "boxed_layout";
      case "Dark":
        return "dark_data_theme";
      case "RTL":
        return "rtl";
      default:
        return "";
    }
  };
  const location = useLocation();
  const dispatch = useDispatch();
  const previousLocation = usePreviousRoute();

  useEffect(() => {
    const layoutPages = [
      "/layout-dark",
      "/layout-rtl",
      "/layout-mini",
      "/layout-box",
      "/layout-default",
    ];

    const isCurrentLayoutPage = layoutPages.some((path) =>
      location.pathname.includes(path)
    );
    const isPreviousLayoutPage =
      previousLocation &&
      layoutPages.some((path) => previousLocation.pathname.includes(path));


  }, [location, previousLocation, dispatch]);

  useEffect(() => {
    // Always set sidebar color to darkgreen
    dispatch(setDataSidebar("darkgreen"));
    document.documentElement.setAttribute("data-sidebar", "darkgreen");
    localStorage.setItem("dataSidebar", "darkgreen");
  }, [dispatch]);

  // Fetch sites for admin role
  useEffect(() => {
    const role = sessionStorage.getItem("role");
    setUserRole(role);
    
    if (role === "admin") {
      const savedSiteId = getSelectedSiteId();
      const savedSiteName = getSelectedSiteName();
      if (savedSiteId) {
        setSelectedSiteId(savedSiteId);
        setSelectedSiteName(savedSiteName);
      }
      fetchSites();
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

  const fetchSites = async () => {
    try {
      setLoadingSites(true);
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        console.error("Admin ID not found");
        setLoadingSites(false);
        return;
      }
      // Admin role: backend gets admin_id from request.user
      // Organization role: admin_id should be passed as query param
      const role = sessionStorage.getItem("role");
      let url = `${BACKEND_PATH}admin/sites/`;
      if (role === "organization" && admin_id) {
        url += `?admin_id=${admin_id}`;
      }
      const response = await axios.get<{
        status: number;
        message: string;
        data: any[];
      }>(url, getAuthHeaders());

      if (response.data.status === 200 && response.data.data) {
        setSites(response.data.data);
        
        const savedSiteId = sessionStorage.getItem("selected_site_id");
        
        if (savedSiteId) {
          // Compare as strings (UUIDs are strings)
          const siteExists = response.data.data.some((s: any) => String(s.id) === String(savedSiteId));
          if (siteExists) {
            const site = response.data.data.find((s: any) => String(s.id) === String(savedSiteId));
            if (site) {
              setSelectedSiteId(site.id);
              setSelectedSiteName(site.site_name);
            }
          } else if (response.data.data.length > 0) {
            // Site doesn't exist, auto-select first site (skip reload to avoid errors)
            handleSiteChange(response.data.data[0].id, true);
          }
        } else if (response.data.data.length > 0) {
          // No site selected, auto-select first site on first login (skip reload)
          handleSiteChange(response.data.data[0].id, true);
        }
      } else {
        setSites([]);
      }
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      setSites([]);
    } finally {
      setLoadingSites(false);
    }
  };

  const handleSiteChange = (siteId: string | number, skipReload: boolean = false) => {
    // Convert to string for consistent comparison (UUIDs are strings)
    const siteIdStr = String(siteId);
    const site = sites.find((s: any) => String(s.id) === siteIdStr);
    if (site) {
      setSelectedSiteId(site.id);
      setSelectedSiteName(site.site_name);
      // Use notifySiteChange to update sessionStorage and dispatch event
      notifySiteChange(String(site.id), site.site_name);
      
      // Only show toast and reload if it's a manual change (not auto-select on first login)
      if (!skipReload) {
      toast.success(`Site selected: ${site.site_name}`);
      // Trigger page refresh to reload data with new site
        // Small delay ensures sessionStorage is updated before reload
      setTimeout(() => {
        window.location.reload();
        }, 100);
      }
    }
  };


  useEffect(() => {
    const currentMenu = localStorage.getItem("menuOpened") || 'Dashboard'
    setSubopen(currentMenu);
    // Select all 'submenu' elements
    const submenus = document.querySelectorAll(".submenu");
    // Loop through each 'submenu'
    submenus.forEach((submenu) => {
      // Find all 'li' elements within the 'submenu'
      const listItems = submenu.querySelectorAll("li");
      submenu.classList.remove("active");
      // Check if any 'li' has the 'active' class
      listItems.forEach((item) => {
        if (item.classList.contains("active")) {
          // Add 'active' class to the 'submenu'
          submenu.classList.add("active");
          return;
        }
      });
    });
  }, [Location.pathname]);

  const onMouseEnter = () => {
    dispatch(setExpandMenu(true));
  };
  const onMouseLeave = () => {
    dispatch(setExpandMenu(false));
  };
  return (
    <>
      <div
        className="sidebar"
        id="sidebar"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
  <div className="sidebar-logo" style={{ width: '128px', paddingTop: '4px' }}>
    <style>{`
      .sidebar-logo .logo img,
      .sidebar-logo .dark-logo img {
        max-width: none !important;
        width: 220px !important;
        height: auto !important;
      }
      .sidebar-logo .logo,
      .sidebar-logo .dark-logo {
        margin-top: -8px !important;
      }
    `}</style>
    <Link to="routes.index" className="logo logo-normal">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        <ImageWithBasePath 
          src="assets/img/logo/logo5.png" 
          alt="Logo" 
          className="login-logo"
          width={240}
        />
      </div>
    </Link>
    <Link to="routes.index" className="logo-small">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '50px', height: 'auto' }}>
          <ImageWithBasePath 
            src="assets/img/logo/logo5.png" 
            alt="Logo"
            width={50}
          />
        </div>
      </div>
    </Link>
    <Link to="routes.index" className="dark-logo">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        <ImageWithBasePath 
          src="assets/img/logo/logo5.png" 
          alt="Logo"
          width={240}
        />
      </div>
    </Link>
  </div>
        <Scrollbars>
          <div className="sidebar-inner slimscroll">
            {/* Site Selection Box for Admin */}
            {userRole === "admin" && (
              <div style={{ 
                padding: "12px 16px", 
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: "transparent"
              }}>
                <div className="menu-title" style={{ marginBottom: "8px", padding: "0" }}>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <i className="ti ti-map-pin me-1"></i>
                    Select Site
                  </span>
                </div>
                {loadingSites ? (
                  <div className="text-center" style={{ padding: "8px 0" }}>
                    <div className="spinner-border spinner-border-sm" style={{ color: "rgba(255,255,255,0.4)", width: "16px", height: "16px" }} role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : sites.length === 0 ? (
                  <div style={{ 
                    fontSize: "12px", 
                    padding: "8px 12px", 
                    backgroundColor: "rgba(255,255,255,0.05)", 
                    borderRadius: "4px",
                    color: "rgba(255,255,255,0.5)",
                    border: "none"
                  }}>
                    <i className="ti ti-alert-circle me-1"></i>
                    No added site
                  </div>
                ) : (
                  <select
                    value={selectedSiteId || ""}
                    onChange={(e) => handleSiteChange(e.target.value)}
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: "13px",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      outline: "none",
                      transition: "all 0.2s ease",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 10px center",
                      paddingRight: "30px"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    }}
                  >
                    {sites.map((site: any) => (
                      <option key={site.id} value={site.id} style={{ backgroundColor: "#1a1a2e", color: "#fff" }}>
                        {site.site_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <div id="sidebar-menu" className="sidebar-menu">
              <ul>
              {filteredSidebarData?.map((mainLabel, index) => (
                <React.Fragment key={`main-${index}`}>
                    <li className="menu-title">
                        <span>{mainLabel?.tittle}</span>
                    </li>
                    <li>
                    <ul>
                        {mainLabel?.submenuItems?.map((title: any, i) => {
                        let link_array: any = [];
                        if ("submenuItems" in title) {
                            title.submenuItems?.forEach((link: any) => {
                            link_array.push(link?.link);
                            if (link?.submenu && "submenuItems" in link) {
                                link.submenuItems?.forEach((item: any) => {
                                link_array.push(item?.link);
                                });
                            }
                            });
                        }
                        title.links = link_array;

                        return (
                            <li className="submenu" key={`title-${i}`}>
                            <Link
                                to={title?.submenu ? "#" : title?.link}
                                onClick={() =>
                                handleClick(
                                    title?.label,
                                    title?.themeSetting,
                                    getLayoutClass(title?.label)
                                )
                                }
                                className={`${
                                subOpen === title?.label ? "subdrop" : ""
                                } ${
                                title?.links?.includes(Location.pathname) ? "active" : ""
                                } ${
                                title?.submenuItems
                                    ?.map((link: any) => link?.link)
                                    .includes(Location.pathname) ||
                                title?.link === Location.pathname
                                    ? "active"
                                    : ""
                                }`}
                            >
                                {title?.logo ? (
                                    <span style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }}>
                                        <ImageWithBasePath 
                                            src={title.logo} 
                                            alt={title?.label || "Logo"} 
                                            width={20}
                                            height={20}
                                            className="sidebar-menu-logo"
                                        />
                                    </span>
                                ) : (
                                    <i className={`ti ti-${title.icon}`}></i>
                                )}
                                <span>{title?.label}</span>
                                {title?.dot && (
                                <span className="badge badge-danger fs-10 fw-medium text-white p-1">
                                    Hot
                                </span>
                                )}
                                <span className={title?.submenu ? "menu-arrow" : ""} />
                            </Link>
                            {title?.submenu !== false && subOpen === title?.label && (
                                <ul
                                style={{
                                    display: subOpen === title?.label ? "block" : "none",
                                }}
                                >
                                {title?.submenuItems?.map((item: any, j: any) => (
                                    <li
                                    className={
                                        item?.submenuItems ? "submenu submenu-two" : ""
                                    }
                                    key={`item-${j}`}
                                    >
                                    <Link
                                        to={ item?.submenu ? "#" :item?.link}
                                        className={`${
                                        item?.submenuItems
                                            ?.map((link: any) => link?.link)
                                            .includes(Location.pathname) ||
                                        item?.link === Location.pathname
                                            ? "active"
                                            : ""
                                        } ${
                                        subsidebar === item?.label ? "subdrop" : ""
                                        }`}
                                        onClick={() => {
                                        toggleSubsidebar(item?.label);
                                        }}
                                    >
                                        {item?.label}
                                        <span
                                        className={item?.submenu ? "menu-arrow" : ""}
                                        />
                                    </Link>
                                    {item?.submenuItems ? (
                                        <ul
                                        style={{
                                            display:
                                            subsidebar === item?.label ? "block" : "none",
                                        }}
                                        >
                                        {item?.submenuItems?.map((items: any, k: any) => (
                                            <li key={`submenu-item-${k}`}>
                                            <Link
                                                to={items?.submenu ? "#" :items?.link}
                                                className={`${
                                                subsidebar === items?.label
                                                    ? "submenu-two subdrop"
                                                    : "submenu-two"
                                                } ${
                                                items?.submenuItems
                                                    ?.map((link: any) => link.link)
                                                    .includes(Location.pathname) ||
                                                items?.link === Location.pathname
                                                    ? "active"
                                                    : ""
                                                }`}
                                            >
                                                {items?.label}
                                            </Link>
                                            </li>
                                        ))}
                                        </ul>
                                    ) : null}
                                    </li>
                                ))}
                                </ul>
                            )}
                            </li>
                        );
                        })}
                    </ul>
                    </li>
                </React.Fragment>
                ))}

              </ul>
            </div>
          </div>
        </Scrollbars>
      </div>
    </>
  );
};

export default Sidebar;
