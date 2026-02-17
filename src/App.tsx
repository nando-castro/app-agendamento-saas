import { clearAdminToken, getAdminToken } from "@/lib/storage";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import LandingPage from "@/pages/LandingPage";
import SubscribePage from "@/pages/SubscribePage";

import AdminBookingsPage from "@/pages/admin/AdminBookingsPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminRegisterPage from "@/pages/admin/AdminRegisterPage";
import AdminSchedulePage from "@/pages/admin/AdminSchedulePage";
import AdminServicesPage from "@/pages/admin/AdminServicesPage";
import PublicBookingPage from "@/pages/public/PublicBookingPage";

import FullscreenLoader from "@/components/ui/FullscreenLoader";
import { isJwtExpired } from "@/lib/jwt";
import NotFoundPage from "@/pages/NotFoundPage";
import AppearancePage from "./pages/admin/settings/AppearancePage";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<"checking" | "ok" | "nope">("checking");

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const token = getAdminToken();

      if (!token) {
        if (alive) setState("nope");
        return;
      }

      if (isJwtExpired(token)) {
        clearAdminToken();
        if (alive) setState("nope");
        return;
      }

      if (alive) setState("ok");
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  if (state === "checking") return <FullscreenLoader label="Verificando sessão..." />;

  if (state === "nope") {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Landing (antes do login/registro) */}
      <Route path="/" element={<LandingPage />} />

      {/* Assinatura (Stripe) */}
      <Route path="/subscribe" element={<SubscribePage />} />

      {/* Público */}
      <Route path="/public/:token" element={<PublicBookingPage />} />

      {/* Auth admin */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/register" element={<AdminRegisterPage />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="services" element={<AdminServicesPage />} />
        <Route path="schedule" element={<AdminSchedulePage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />

        <Route path="settings/appearance" element={<AppearancePage />} />
      </Route>

      {/* Fallback global: escolha UMA opção */}
      <Route path="*" element={<NotFoundPage />} />
      {/* ou se você preferir redirecionar tudo para a landing: */}
      {/* <Route path="*" element={<Navigate to="/" replace />} /> */}
    </Routes>
  );
}
