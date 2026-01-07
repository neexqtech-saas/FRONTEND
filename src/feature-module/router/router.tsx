import React, { Suspense } from "react";
import { Route, Routes, Navigate } from "react-router";
import { authRoutes, publicRoutes } from "./router.link";
import { all_routes } from "./all_routes";

// Lazy load layout components
const Feature = React.lazy(() => import("../feature"));
const AuthFeature = React.lazy(() => import("../authFeature"));
const SystemOwnerOrganizations = React.lazy(() => import("../super-admin/organizations"));
const Login = React.lazy(() => import("../auth/login/login"));

// Loading fallback for layout components
const LayoutLoadingFallback = () => (
  <div style={{ 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    height: "100vh",
    fontSize: "18px"
  }}>
    Loading...
  </div>
);

const ALLRoutes: React.FC = () => {
  // Check authentication status
  const isBrowser = typeof window !== "undefined";
  const isAuthenticated = isBrowser && !!sessionStorage.getItem("access_token");

  return (
    <Suspense fallback={<LayoutLoadingFallback />}>
      <Routes>
        {/* Root path - show login page directly, URL stays at / */}
        <Route element={
          <Suspense fallback={<LayoutLoadingFallback />}>
            <AuthFeature />
          </Suspense>
        }>
          <Route path="/" element={
            <Suspense fallback={<LayoutLoadingFallback />}>
              <Login />
            </Suspense>
          } />
        </Route>

        {/* System Owner Organizations Page - No Sidebar */}
        <Route 
          path={all_routes.systemOwnerOrganizations} 
          element={
            <Suspense fallback={<LayoutLoadingFallback />}>
              <SystemOwnerOrganizations />
            </Suspense>
          } 
        />
        
        <Route element={
          <Suspense fallback={<LayoutLoadingFallback />}>
            <Feature />
          </Suspense>
        }>
          {publicRoutes
            .filter(route => route.path !== "/") // Exclude root path as it's handled above
            .map((route, idx) => (
              <Route path={route.path} element={route.element} key={idx} />
            ))}
        </Route>

        <Route element={
          <Suspense fallback={<LayoutLoadingFallback />}>
            <AuthFeature />
          </Suspense>
        }>
          {authRoutes.map((route, idx) => (
            <Route path={route.path} element={route.element} key={idx} />
          ))}
        </Route>

        {/* Catch-all route - redirect unknown paths to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default ALLRoutes;
