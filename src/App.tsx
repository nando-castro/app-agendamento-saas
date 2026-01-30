import { getAdminToken } from "@/lib/storage";
import { Navigate, Route, Routes } from "react-router-dom";

import AdminBookingsPage from "@/pages/admin/AdminBookingsPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminRegisterPage from "@/pages/admin/AdminRegisterPage";
import AdminSchedulePage from "@/pages/admin/AdminSchedulePage";
import AdminServicesPage from "@/pages/admin/AdminServicesPage";

import PublicBookingPage from "@/pages/public/PublicBookingPage";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const token = getAdminToken();
  if (!token) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />

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
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
