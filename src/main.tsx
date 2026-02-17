import { LoadingProvider } from "@/lib/loading";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorFallback from "./components/ui/ErrorFallback";
import "./index.css";

import { applyThemeMode, getThemeMode } from "@/components/ThemeToggle";
import { applyUserTheme, loadUserTheme } from "@/lib/userTheme";
import { getMode, setMode } from "./lib/theme";
applyThemeMode(getThemeMode());
applyUserTheme(loadUserTheme());

setMode(getMode());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LoadingProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </LoadingProvider>
  </StrictMode>,
);
