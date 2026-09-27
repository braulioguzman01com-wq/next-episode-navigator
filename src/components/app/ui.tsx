import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bookmark, BookmarkCheck, Film, Search, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { usePrefs } from "@/lib/prefs";
import { fmtDate, fmtTime, STATUS_LABEL, relative } from "@/lib/format";
import type { CardAnime } from "@/lib/data";

export function Cover({ src, alt, className, color, eager }: { src: string | null; alt: string; className?: string; color?: string | null; eager?: boolean }) {
  const [state, setState] = useState<"loading" | "ok" | "error">(src ? "loading" : "error");
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth) setState("ok");
  }, []);
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)} style={color ? { backgroundColor: `${color}33` } : undefined}>
      {state === "loading" && <div className="absolute inset-0 shimmer" />}
      {state === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/60">
          <Film className="h-7 w-7" strokeWidth={1.4} />
        </div>
      ) : (
        <img
          ref={ref}
          src={src!}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
          className={cn("h-full w-full object-cover transition-[opacity,filter,transform] duration-500", state === "ok" ? "opacity-100 blur-0" : "opacity-0 blur-md scale-105")}
        />
      )}
    </div>
  );
}

export function SaveButton({ anime, className, withLabel }: { anime: { id: string; title: string; cover_url: string | null; next_airing_at: string | null }; className?: string; withLabel?: boolean }) {
  const { isSaved, toggleSaved } = usePrefs();
  const saved = isSaved(anime.id);
  return (
    <button
      type="button"
      aria-label={saved ? "Quitar de guardados" : "Guardar"}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved({ id: anime.id, title: anime.title, cover: anime.cover_url, next_airing_at: anime.next_airing_at });
      }}
      className={cn("press inline-flex items-center justify-center gap-2 transition-colors duration-300", saved ? "text-primary" : "text-foreground", className)}
    >
      <span className="relative h-5 w-5">
        <Bookmark className={cn("absolute inset-0 h-5 w-5 transition-all duration-300", saved ? "scale-50 opacity-0" : "scale-100 opacity-100")} />
        <BookmarkCheck className={cn("absolute inset-0 h-5 w-5 transition-all duration-300", saved ? "scale-100 opacity-100" : "scale-150 opacity-0")} />
      </span>
      {withLabel && <span className="text-[15px] font-semibold">{saved ? "Guardado" : "Guardar"}</span>}
    </button>
  );
}

function markCover(e: React.MouseEvent<HTMLElement>) {
  document.querySelectorAll<HTMLElement>("[data-cover]").forEach((el) => (el.style.viewTransitionName = ""));
  const el = e.currentTarget.querySelector<HTMLElement>("[data-cover]");
  if (el) el.style.viewTransitionName = "cover";
}

export function StatusDot({ status }: { status: string | null }) {
  const tone = status === "RELEASING" ? "bg-success" : status === "NOT_YET_RELEASED" ? "bg-warning" : "bg-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", tone)} />
      {STATUS_LABEL[status ?? ""] ?? "—"}
    </span>
  );
}

export function ReleaseRow({ a }: { a: CardAnime }) {
  const { timezone } = usePrefs();
  return (
    <Link to="/anime/$id" params={{ id: a.id }} viewTransition onClick={markCover} className="press group flex items-center gap-3.5 py-2.5">
      <div data-cover className="shrink-0 overflow-hidden rounded-xl">
        <Cover src={a.cover_url} alt={a.title} color={a.color} className="h-[84px] w-[60px] rounded-xl" />
      </div>
      <div className="min-w-0 flex-1 border-b border-hairline pb-2.5 group-last:border-0">
        <p className="truncate text-[16px] font-semibold leading-tight">{a.title}</p>
        <p className="mt-1 text-[13px] text-muted-foreground tabular-nums">
          {a.next_episode ? `Episodio ${a.next_episode} · ` : ""}
          {fmtDate(a.next_airing_at, timezone, { weekday: "short", day: "numeric", month: "short" })} · {fmtTime(a.next_airing_at, timezone)}
        </p>
        <div className="mt-1.5">
          <StatusDot status={a.status} />
        </div>
      </div>
      <SaveButton anime={a} className="h-10 w-10 rounded-full text-muted-foreground" />
    </Link>
  );
}

export function PosterCard({ a, subtitle, className }: { a: CardAnime; subtitle?: ReactNode; className?: string }) {
  return (
    <Link to="/anime/$id" params={{ id: a.id }} viewTransition onClick={markCover} className={cn("press block", className)}>
      <div data-cover className="relative overflow-hidden rounded-2xl shadow-[0_12px_30px_-12px_oklch(0_0_0/70%)]">
        <Cover src={a.cover_url} alt={a.title} color={a.color} className="aspect-[2/3] w-full" />
        {a.latest_episode ? (
          <span className="glass absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums">EP {a.latest_episode}</span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug">{a.title}</p>
      {subtitle ?? (
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {a.latest_episode ? `${a.latest_episode} episodios · ${relative(a.latest_episode_at)}` : "Sin episodios aún"}
        </p>
      )}
    </Link>
  );
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="glass flex h-11 items-center gap-2 rounded-xl px-3 text-muted-foreground focus-within:text-foreground">
      <Search className="h-[18px] w-[18px] shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground"
        enterKeyHint="search"
        type="search"
      />
      {value && (
        <button type="button" aria-label="Borrar" onClick={() => onChange("")} className="press rounded-full p-1">
          <X className="h-4 w-4" />
        </button>
      )}
    </label>
  );
}

export function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function LargeTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="pt-safe flex items-end justify-between gap-3 pb-4 pt-6">
      <div>
        <h1 className="text-[34px] font-bold leading-none tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function SectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="mb-1 mt-7 flex items-baseline gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
      {count !== undefined && <span className="tabular-nums text-muted-foreground/60">{count}</span>}
    </h2>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="animate-page flex flex-col items-center px-8 py-16 text-center">
      <div className="glass mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-muted-foreground">
        <Icon className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <p className="text-[17px] font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-[14px] text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function RowSkeleton({ n = 5 }: { n?: number }) {
  return (
    <div>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 py-2.5">
          <div className="h-[84px] w-[60px] rounded-xl shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded shimmer" />
            <div className="h-3 w-1/2 rounded shimmer" />
            <div className="h-3 w-1/4 rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PosterSkeleton({ n = 6, className }: { n?: number; className?: string }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className={className}>
          <div className="aspect-[2/3] w-full rounded-2xl shimmer" />
          <div className="mt-2 h-3.5 w-4/5 rounded shimmer" />
          <div className="mt-1.5 h-3 w-1/2 rounded shimmer" />
        </div>
      ))}
    </>
  );
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("press shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors", active ? "bg-foreground text-background" : "glass text-foreground")}>
      {children}
    </button>
  );
}
