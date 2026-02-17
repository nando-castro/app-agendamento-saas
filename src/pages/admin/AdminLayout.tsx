import AdminSettingsMenu from "@/components/AdminSettingsMenu";
import ThemeToggle from "@/components/ThemeToggle";
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
import { useEffect } from "react";
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
            ? "text-foreground font-medium"
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

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverflowX = document.body.style.overflowX;

    document.body.style.overflow = "hidden";
    document.body.style.overflowX = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overflowX = prevOverflowX;
    };
  }, []);

  return (
    // trava o scroll do layout todo
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      {/* MOBILE TOP BAR (não rola) */}
      <header className="md:hidden shrink-0 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-none">Admin</div>
            <div className="text-xs text-muted-foreground">{sectionLabel}</div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="exit"
              size="sm"
              onClick={logout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* área “corpo” com scroll controlado */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto h-full max-w-6xl p-0 md:p-4">
          <div className="grid h-full gap-4 md:grid-cols-[240px_1fr]">
            {/* DESKTOP SIDEBAR (fixo) */}
            <aside className="hidden md:block">
              <div className="sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border bg-card p-3">
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

                <div className="space-y-2 px-2 pb-2">
                  <AdminSettingsMenu />
                </div>

                <Button variant="exit" className="w-full" onClick={logout}>
                  Sair
                </Button>
              </div>
            </aside>

            {/* CONTENT (único lugar que rola) */}
            <main className="h-full overflow-y-auto no-scrollbar md:rounded-xl md:border md:bg-card md:p-4">
              <div className="px-4 py-4 md:px-0 md:py-0 pb-24 md:pb-0">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM TAB BAR (fixo) */}
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
