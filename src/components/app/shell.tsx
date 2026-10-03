import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, CalendarClock, PlayCircle, Search, Settings, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Nuevos", icon: CalendarClock },
  { to: "/buscar", label: "Buscar", icon: Search },
  { to: "/videos", label: "Videos", icon: PlayCircle },
  { to: "/guardados", label: "Guardados", icon: Bookmark },
  { to: "/ajustes", label: "Configuración", icon: Settings },
] as const;

export const APP_NAME = "Estrenos";

function Splash() {
  const [phase, setPhase] = useState<"show" | "hide" | "gone">("show");
  useEffect(() => {
    if (sessionStorage.getItem("aa.splash")) return setPhase("gone");
    sessionStorage.setItem("aa.splash", "1");
    const a = setTimeout(() => setPhase("hide"), 900);
    const b = setTimeout(() => setPhase("gone"), 1350);
    return () => (clearTimeout(a), clearTimeout(b));
  }, []);
  if (phase === "gone") return null;
  return (
    <div className={cn("fixed inset-0 z-[100] flex items-center justify-center bg-background transition-[opacity,filter] duration-500", phase === "hide" && "pointer-events-none opacity-0 blur-sm")}>
      <div className="animate-splash text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] glass">
          <CalendarClock className="h-8 w-8 text-primary" strokeWidth={1.6} />
        </div>
        <p className="text-[22px] font-semibold tracking-tight">{APP_NAME}</p>
      </div>
    </div>
  );
}

function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const qc = useQueryClient();
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => {
      setOnline(true);
      qc.invalidateQueries();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => (window.removeEventListener("online", on), window.removeEventListener("offline", off));
  }, [qc]);
  if (online) return null;
  return (
    <div className="glass-strong fixed left-1/2 top-[max(env(safe-area-inset-top),0.75rem)] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium animate-page">
      <WifiOff className="h-4 w-4 text-warning" /> Sin conexión
    </div>
  );
}

function TabBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.6rem)]">
      <div className="glass-strong flex w-full max-w-md items-center justify-between rounded-full border border-border/40 px-2 py-1.5 shadow-[0_18px_40px_-12px_oklch(0_0_0/85%)]">
        {TABS.map(({ to, label, icon: Icon }) => {
          const on = active(to);
          return (
            <Link key={to} to={to} viewTransition aria-label={label} aria-current={on ? "page" : undefined}
              className={cn("press flex h-11 items-center justify-center gap-1.5 rounded-full transition-all duration-300 ease-out", on ? "bg-primary px-4 text-primary-foreground" : "w-11 text-muted-foreground hover:text-foreground")}>
              <Icon className="h-[20px] w-[20px] shrink-0" strokeWidth={on ? 2.3 : 1.8} />
              {on && <span className="whitespace-nowrap text-[13px] font-semibold">{label === "Configuración" ? "Ajustes" : label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isApp = !path.startsWith("/admin") && !path.startsWith("/auth");
  if (!isApp) return <>{children}</>;
  return (
    <>
      <Splash />
      <OfflineBanner />
      <div className="relative mx-auto min-h-dvh w-full max-w-3xl px-5 pb-safe">{children}</div>
      <TabBar />
    </>
  );
}
