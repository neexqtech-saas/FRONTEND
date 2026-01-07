// import { useSelector } from "react-redux";
// import { Outlet, useLocation } from "react-router";
// import Header from "../core/common/header";
// import Sidebar from "../core/common/sidebar";
// import ThemeSettings from "../core/common/theme-settings";
// import { useEffect, useState } from "react";
// import HorizontalSidebar from "../core/common/horizontal-sidebar";
// import TwoColumnSidebar from "../core/common/two-column";
// import StackedSidebar from "../core/common/stacked-sidebar";
// import DeleteModal from "../core/modals/deleteModal";
// const Feature = () => {
//   const [showLoader, setShowLoader] = useState(true);
//   const headerCollapse = useSelector((state: any) => state.themeSetting.headerCollapse);
//   const mobileSidebar = useSelector(
//     (state: any) => state.sidebarSlice.mobileSidebar
//   );
//   const miniSidebar = useSelector(
//     (state: any) => state.sidebarSlice.miniSidebar
//   );
//   const expandMenu = useSelector((state: any) => state.sidebarSlice.expandMenu);
//   const dataWidth = useSelector((state: any) => state.themeSetting.dataWidth);
//   const dataLayout = useSelector((state: any) => state.themeSetting.dataLayout);
//   const dataLoader = useSelector((state: any) => state.themeSetting.dataLoader);
//   const dataTheme = useSelector((state: any) => state.themeSetting.dataTheme);
//   const dataSidebarAll = useSelector((state: any) => state.themeSetting.dataSidebarAll);
//   const dataColorAll = useSelector((state: any) => state.themeSetting.dataColorAll);
//   const dataTopBarColorAll = useSelector((state: any) => state.themeSetting.dataTopBarColorAll);
//   const dataTopbarAll = useSelector((state: any) => state.themeSetting.dataTopbarAll);
//   const location = useLocation();
//   useEffect(() => {
//     if (dataTheme === "dark_data_theme") {
//       document.documentElement.setAttribute("data-theme", "darks");
//     } else {
//       document.documentElement.setAttribute("data-theme", "");
//     }
//   }, [dataTheme]);
//   useEffect(() => {
//     if (dataLoader === 'enable') {
//       // Show the loader when navigating to a new route
//       setShowLoader(true);

//       // Hide the loader after 2 seconds
//       const timeoutId = setTimeout(() => {
//         setShowLoader(false);
//       }, 2000);

//       return () => {
//         clearTimeout(timeoutId); // Clear the timeout when component unmounts
//       };
//     } else {
//       setShowLoader(false);
//     }
//     window.scrollTo(0, 0);
//   }, [location.pathname, dataLoader]);
//   const Preloader = () => {
//     return (
//       <div id="global-loader">
//         <div className="page-loader"></div>
//       </div>
//     );
//   };
//   return (
//     <>
//       <style>
//         {`
//       :root {
//         --sidebar--rgb-picr: ${dataSidebarAll};
//         --topbar--rgb-picr:${dataTopbarAll};
//         --topbarcolor--rgb-picr:${dataTopBarColorAll};
//         --primary-rgb-picr:${dataColorAll};
//       }
//     `}
//       </style>
//       <div
//         className={`
//        ${dataLayout === "mini" || dataWidth === 'box' ? "mini-sidebar" : ''}
//        ${dataLayout === "horizontal" || dataLayout === "horizontal-single" || dataLayout === "horizontal-overlay" || dataLayout === "horizontal-box" ? 'menu-horizontal' : ''}
//       ${miniSidebar && dataLayout !== "mini" ? "mini-sidebar" : ""}
//       ${dataWidth === 'box' ? 'layout-box-mode' : ''} ${headerCollapse ? "header-collapse" : ""}
//      ${(expandMenu && miniSidebar) ||
//             (expandMenu && dataLayout === "mini")
//             ? "expand-menu"
//             : ""
//           }
      
//       `}
//       >
//         <>
//           {showLoader ?
//             <>
//               <Preloader />
//               <div
//                 className={`main-wrapper
//                   ${mobileSidebar ? "slide-nav" : ""}`}
//               >
//                 <Header />
//                 <Sidebar />
//                 <HorizontalSidebar />
//                 <TwoColumnSidebar />
//                 <StackedSidebar />
//                 <Outlet />
//                 <DeleteModal />
//                 {!location.pathname.includes("layout") && <ThemeSettings />}
//               </div>
//             </> :
//             <>
//               <div
//                 className={`main-wrapper
//                            ${mobileSidebar ? "slide-nav" : ""}`}
//           >
//             <Header />
//             <Sidebar />
//             <HorizontalSidebar />
//             <TwoColumnSidebar />
//             <StackedSidebar />
//             <Outlet />
//             <DeleteModal />
//             {!location.pathname.includes("layout") && <ThemeSettings />}
//           </div>
//         </>}

//         </>
//         {/* <Loader/> */}

//         <div className="sidebar-overlay"></div>
//       </div>
//     </>
//   );
// };

// export default Feature;






// src/layout/Feature.tsx
import React, { useEffect, useState, useMemo, memo } from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { all_routes } from "./router/all_routes";

// Lazy load layout components for better code splitting
const Header = React.lazy(() => import("../core/common/header"));
const Sidebar = React.lazy(() => import("../core/common/sidebar"));
const ThemeSettings = React.lazy(() => import("../core/common/theme-settings"));
const HorizontalSidebar = React.lazy(() => import("../core/common/horizontal-sidebar"));
const TwoColumnSidebar = React.lazy(() => import("../core/common/two-column"));
const StackedSidebar = React.lazy(() => import("../core/common/stacked-sidebar"));

// Loading fallback for layout components
const LayoutComponentFallback = () => <div style={{ minHeight: "50px" }} />;

const Feature = memo(() => {
  const [showLoader, setShowLoader] = useState(false);
  const location = useLocation();

  // Memoize selectors to prevent unnecessary re-renders
  const themeState = useSelector((state: any) => ({
    headerCollapse: state.themeSetting.headerCollapse,
    dataWidth: state.themeSetting.dataWidth,
    dataLayout: state.themeSetting.dataLayout,
    dataLoader: state.themeSetting.dataLoader,
    dataTheme: state.themeSetting.dataTheme,
    dataSidebarAll: state.themeSetting.dataSidebarAll,
    dataColorAll: state.themeSetting.dataColorAll,
    dataTopBarColorAll: state.themeSetting.dataTopBarColorAll,
    dataTopbarAll: state.themeSetting.dataTopbarAll,
  }));

  const sidebarState = useSelector((state: any) => ({
    mobileSidebar: state.sidebarSlice.mobileSidebar,
    miniSidebar: state.sidebarSlice.miniSidebar,
    expandMenu: state.sidebarSlice.expandMenu,
  }));

  const routes = all_routes;
  const isBrowser = typeof window !== "undefined";
  const isAuthenticated = isBrowser && !!sessionStorage.getItem("access_token");

  // Memoize className calculation to prevent recalculation on every render
  const containerClassName = useMemo(() => {
    const { dataLayout, dataWidth, headerCollapse } = themeState;
    const { miniSidebar, expandMenu } = sidebarState;
    
    return `
      ${dataLayout === "mini" || dataWidth === "box" ? "mini-sidebar" : ""}
      ${
        dataLayout === "horizontal" ||
        dataLayout === "horizontal-single" ||
        dataLayout === "horizontal-overlay" ||
        dataLayout === "horizontal-box"
          ? "menu-horizontal"
          : ""
      }
      ${miniSidebar && dataLayout !== "mini" ? "mini-sidebar" : ""}
      ${dataWidth === "box" ? "layout-box-mode" : ""}
      ${headerCollapse ? "header-collapse" : ""}
      ${
        (expandMenu && miniSidebar) ||
        (expandMenu && dataLayout === "mini")
          ? "expand-menu"
          : ""
      }
    `.trim().replace(/\s+/g, " ");
  }, [themeState, sidebarState]);

  // Memoize style object to prevent recreation on every render
  const rootStyle = useMemo(() => ({
    "--sidebar--rgb-picr": themeState.dataSidebarAll,
    "--topbar--rgb-picr": themeState.dataTopbarAll,
    "--topbarcolor--rgb-picr": themeState.dataTopBarColorAll,
    "--primary-rgb-picr": themeState.dataColorAll,
  }), [themeState.dataSidebarAll, themeState.dataTopbarAll, themeState.dataTopBarColorAll, themeState.dataColorAll]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      themeState.dataTheme === "dark_data_theme" ? "darks" : ""
    );
  }, [themeState.dataTheme]);

  useEffect(() => {
    setShowLoader(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const Preloader = memo(() => (
    <div id="global-loader">
      <div className="page-loader"></div>
    </div>
  ));

  // Move useMemo before conditional return (React Hooks rule)
  const mainWrapperClassName = useMemo(
    () => `main-wrapper ${sidebarState.mobileSidebar ? "slide-nav" : ""}`,
    [sidebarState.mobileSidebar]
  );

  if (!isAuthenticated) {
    return <Navigate to={routes.login} replace state={{ from: location.pathname }} />;
  }

  const showThemeSettings = !location.pathname.includes("layout");

  return (
    <>
      <style>
        {`:root {
          --sidebar--rgb-picr: ${themeState.dataSidebarAll};
          --topbar--rgb-picr: ${themeState.dataTopbarAll};
          --topbarcolor--rgb-picr: ${themeState.dataTopBarColorAll};
          --primary-rgb-picr: ${themeState.dataColorAll};
        }`}
      </style>
      <div className={containerClassName}>
        {showLoader ? (
          <>
            <Preloader />
            <div className={mainWrapperClassName}>
              <React.Suspense fallback={<LayoutComponentFallback />}>
                <Header />
                <Sidebar />
                <HorizontalSidebar />
                <TwoColumnSidebar />
                <StackedSidebar />
              </React.Suspense>
              <Outlet />
              {showThemeSettings && (
                <React.Suspense fallback={null}>
                  <ThemeSettings />
                </React.Suspense>
              )}
            </div>
          </>
        ) : (
          <div className={mainWrapperClassName}>
            <React.Suspense fallback={<LayoutComponentFallback />}>
              <Header />
              <Sidebar />
              <HorizontalSidebar />
              <TwoColumnSidebar />
              <StackedSidebar />
            </React.Suspense>
            <Outlet />
            {showThemeSettings && (
              <React.Suspense fallback={null}>
                <ThemeSettings />
              </React.Suspense>
            )}
          </div>
        )}
        <div className="sidebar-overlay"></div>
      </div>
    </>
  );
});

Feature.displayName = "Feature";

export default Feature;

