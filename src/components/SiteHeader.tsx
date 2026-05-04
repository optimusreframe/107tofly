import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun, Plane } from "lucide-react";

const nav = [
  { to: "/course", label: "Curso" },
  { to: "/simulator", label: "Simulador" },
  { to: "/flycoach", label: "FlyCoach AI" },
  { to: "/certificate", label: "Certificado" },
];

export function SiteHeader() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto mt-3 max-w-6xl px-4">
        <div className="glass-strong flex h-14 items-center justify-between rounded-full px-4 shadow-glass">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--gradient-sky)] text-primary-foreground">
              <Plane className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span>107<span className="text-gradient">toFly</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-accent text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 text-foreground transition hover:bg-accent"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              to="/course"
              className="hidden rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 sm:inline-flex"
            >
              Empezar
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
