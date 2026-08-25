import React, { useState } from "react";
import { NavLink, Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarRange,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/auth/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/campanhas", label: "Campanhas", icon: CalendarRange },
  { to: "/admin/colaboradores", label: "Colaboradores", icon: Users },
  { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/admin/configuracoes", label: "Configurações", icon: SettingsIcon },
];

function NavLinks({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/admin" className="flex items-center gap-2.5 px-1">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-slate-900">Compensações</p>
        <p className="text-xs text-slate-400">Painel de Gestão</p>
      </div>
    </Link>
  );
}

function UserMenu() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const navigate = useNavigate();
  const initials = (user?.name ?? "G").split(" ").map((s) => s[0]).slice(0, 2).join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-border bg-white pl-1 pr-2 py-1 text-sm hover:bg-slate-50">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
            {initials}
          </span>
          <span className="hidden text-slate-700 sm:inline">{user?.name}</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="font-medium text-slate-900">{user?.name}</p>
          <p className="text-xs font-normal text-slate-500">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/admin/minha-conta")}>
          <UserIcon className="mr-2 h-4 w-4" /> Minha conta
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/admin/configuracoes")}>
          <ShieldCheck className="mr-2 h-4 w-4" /> Segurança
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-rose-600 focus:text-rose-700"
          onClick={async () => {
            await authClient.signOut();
            window.location.assign("/login");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Breadcrumbs({ items }) {
  if (!items?.length) return null;
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-slate-300">/</span>}
          {it.to ? (
            <Link to={it.to} className="hover:text-foreground">{it.label}</Link>
          ) : (
            <span className="text-foreground">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-white px-4 py-5 lg:flex">
        <Brand />
        <div className="mt-8">
          <NavLinks />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-4">
          <div className="mb-6 flex items-center justify-between">
            <Brand />
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-white/80 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            <span className="text-sm text-muted-foreground lg:hidden">Painel de Gestão</span>
          </div>
          <div className="flex items-center gap-3">
            <UserMenu />
          </div>
        </header>

        <main key={location.pathname} className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
