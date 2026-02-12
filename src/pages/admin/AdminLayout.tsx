import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLoading } from "@/lib/loading";
import { clearAdminToken } from "@/lib/storage";
import {
  CalendarDays,
  Link as LinkIcon,
  LogOut,
  Scissors,
  Settings,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

function SideItem({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive ? "bg-muted font-medium" : "hover:bg-muted",
        ].join(" ")
      }
      end
    >
      {icon}
      {label}
    </NavLink>
  );
}

function BottomItem({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
        ].join(" ")
      }
      end
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

export default function AdminLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { show, hide } = useLoading();

  function logout() {
    show("Saindo...");
    try {
      clearAdminToken();
      nav("/admin/login", { replace: true });
    } finally {
      hide();
    }
  }

  const sectionLabel =
    location.pathname === "/admin"
      ? "Dashboard"
      : location.pathname.startsWith("/admin/services")
        ? "Serviços"
        : location.pathname.startsWith("/admin/schedule")
          ? "Horários"
          : location.pathname.startsWith("/admin/bookings")
            ? "Agenda"
            : "Admin";

  return (
    <div className="min-h-screen bg-background">
      {/* MOBILE TOP BAR */}
      <header className="md:hidden sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-none">Admin</div>
            <div className="text-xs text-muted-foreground">{sectionLabel}</div>
          </div>

          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-0 md:p-4">
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          {/* DESKTOP SIDEBAR */}
          <aside className="hidden md:block rounded-xl border bg-card p-3">
            <div className="px-2 py-2 text-sm font-semibold">
              Agendamentos SaaS
            </div>
            <Separator className="my-2" />

            <nav className="space-y-1">
              <SideItem
                to="/admin"
                label="Dashboard"
                icon={<Settings className="h-4 w-4" />}
              />
              <SideItem
                to="/admin/services"
                label="Serviços"
                icon={<Scissors className="h-4 w-4" />}
              />
              <SideItem
                to="/admin/schedule"
                label="Horários / Bloqueios"
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <SideItem
                to="/admin/bookings"
                label="Agenda"
                icon={<LinkIcon className="h-4 w-4" />}
              />
            </nav>

            <Separator className="my-3" />
            <Button variant="outline" className="w-full" onClick={logout}>
              Sair
            </Button>
          </aside>

          {/* CONTENT */}
          <main className="min-h-[calc(100vh-56px)] md:min-h-0 md:rounded-xl md:border md:bg-card md:p-4">
            {/* padding extra no mobile para não esconder conteúdo atrás do bottom bar */}
            <div className="px-4 py-4 md:px-0 md:py-0 pb-24 md:pb-0">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* MOBILE BOTTOM TAB BAR */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl px-2">
          <BottomItem
            to="/admin"
            label="Dashboard"
            icon={<Settings className="h-5 w-5" />}
          />
          <BottomItem
            to="/admin/services"
            label="Serviços"
            icon={<Scissors className="h-5 w-5" />}
          />
          <BottomItem
            to="/admin/schedule"
            label="Horários"
            icon={<CalendarDays className="h-5 w-5" />}
          />
          <BottomItem
            to="/admin/bookings"
            label="Agenda"
            icon={<LinkIcon className="h-5 w-5" />}
          />
        </div>
      </nav>
    </div>
  );
}
