import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { base_path } from "./environment";
import store from "./core/data/redux/store";
import { Provider } from "react-redux";
import { initModalTouchFix } from "./core/utils/modalHelpers";

// Critical CSS - load immediately (moved to top for ESLint)
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "../src/style/css/feather.css";
import "../src/index.scss";

// Lazy load routes for code splitting
const ALLRoutes = React.lazy(() => import("./feature-module/router/router"));

// Non-critical CSS - load asynchronously after initial render
// These will be loaded after the main bundle to improve initial load time
if (typeof window !== "undefined") {
  const loadNonCriticalCSS = () => {
    // Use dynamic imports for non-critical CSS
    import("../src/style/icon/boxicons/boxicons/css/boxicons.min.css");
    import("../src/style/icon/weather/weathericons.css");
    import("../src/style/icon/typicons/typicons.css");
    import("../node_modules/@fortawesome/fontawesome-free/css/fontawesome.min.css");
    import("../node_modules/@fortawesome/fontawesome-free/css/all.min.css");
    import("../src/style/icon/ionic/ionicons.css");
    import("../src/style/icon/tabler-icons/webfont/tabler-icons.css");
  };

  // Load after initial render
  if (document.readyState === "complete") {
    setTimeout(loadNonCriticalCSS, 100);
  } else {
    window.addEventListener("load", () => setTimeout(loadNonCriticalCSS, 100));
  }
}

// Initialize modal touch fix for mobile/touch devices
initModalTouchFix();

// Loading fallback component
const LoadingFallback = () => (
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

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter basename={base_path}>
        <Suspense fallback={<LoadingFallback />}>
          <ALLRoutes />
        </Suspense>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
