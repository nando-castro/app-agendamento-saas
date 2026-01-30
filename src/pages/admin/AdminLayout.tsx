import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { clearAdminToken } from "@/lib/storage";
import { CalendarDays, Link as LinkIcon, Scissors, Settings } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

function Item({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
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

export default function AdminLayout() {
  const nav = useNavigate();

  function logout() {
    clearAdminToken();
    nav("/admin/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl p-4">
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <aside className="rounded-xl border bg-card p-3">
            <div className="px-2 py-2 text-sm font-semibold">Agendamentos SaaS</div>
            <Separator className="my-2" />
            <nav className="space-y-1">
              <Item to="/admin" label="Dashboard" icon={<Settings className="h-4 w-4" />} />
              <Item to="/admin/services" label="Serviços" icon={<Scissors className="h-4 w-4" />} />
              <Item to="/admin/schedule" label="Horários / Bloqueios" icon={<CalendarDays className="h-4 w-4" />} />
              <Item to="/admin/bookings" label="Agenda" icon={<LinkIcon className="h-4 w-4" />} />
            </nav>

            <Separator className="my-3" />
            <Button variant="outline" className="w-full" onClick={logout}>
              Sair
            </Button>
          </aside>

          <main className="rounded-xl border bg-card p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
