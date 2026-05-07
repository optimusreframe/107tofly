import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ListChecks,
  Award,
  Image as ImageIcon,
  BarChart3,
  Settings,
  Globe,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDeviceMode } from "@/hooks/use-device-mode";

export const ADMIN_NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, ready: true },
  { to: "/admin/users", label: "Users", icon: Users, ready: true },
  { to: "/admin/lessons", label: "Lessons", icon: BookOpen, ready: true },
  { to: "/admin/questions", label: "Questions", icon: ListChecks, ready: true },
  { to: "/admin/certificates", label: "Certificates", icon: Award, ready: true },
  { to: "/admin/landing", label: "Landing", icon: Globe, ready: true },
  { to: "/admin/media", label: "Media", icon: ImageIcon, ready: true },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, ready: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, ready: true },
] as const;

export function AdminAppShell({ children }: { children: ReactNode }) {
  const { isMobile } = useDeviceMode();
  const { t } = useTranslation();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background">
        {t("nav.skip", { defaultValue: "Saltar al contenido" })}
      </a>
      <div className="flex">
        {!isMobile && (
          <aside aria-label="Admin navigation" className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border/40 bg-card/30 backdrop-blur-xl md:flex md:flex-col">
            <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background">
                <Shield className="h-4 w-4" />
              </span>
              <span>Admin</span>
            </div>
            <nav className="flex-1 space-y-0.5 px-3 py-2">
              {ADMIN_NAV.map((item) => {
                const active = path === item.to;
                const Icon = item.icon;
                const cls = `flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                } ${!item.ready ? "opacity-60 pointer-events-none" : ""}`;
                return (
                  <Link key={item.to} to={item.to} aria-disabled={!item.ready} aria-current={active ? "page" : undefined} className={cls}>
                    <span className="flex items-center gap-3"><Icon className="h-4 w-4" />{item.label}</span>
                    {!item.ready && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide">soon</span>}
                  </Link>
                );
              })}
            </nav>
            <Link to="/dashboard" className="m-3 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to app
            </Link>
          </aside>
        )}

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border/40 bg-background/70 px-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4" />
              <span>Admin Console</span>
            </div>
            {isMobile && (
              <Link to="/dashboard" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                ← App
              </Link>
            )}
          </header>
          <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
          {isMobile && (
            <nav aria-label="Admin sections" className="sticky bottom-0 z-40 overflow-x-auto border-t border-border/40 bg-background/85 backdrop-blur-xl">
              <ul className="flex min-w-max gap-1 px-2 py-2">
                {ADMIN_NAV.map((item) => {
                  const active = path === item.to;
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        aria-disabled={!item.ready}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                          active ? "bg-accent text-foreground" : "text-muted-foreground"
                        } ${!item.ready ? "opacity-60 pointer-events-none" : ""}`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
