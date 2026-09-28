import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, BarChart3, Database, Film, KeyRound, ListVideo, LogOut, Menu, RefreshCw, Rss, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { syncNow, testSourceUrl } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "resumen", label: "Resumen", icon: BarChart3 },
  { id: "animes", label: "Animes", icon: Film },
  { id: "episodios", label: "Episodios", icon: ListVideo },
  { id: "fuentes", label: "Fuentes", icon: Rss },
  { id: "sync", label: "Sincronización", icon: RefreshCw },
  { id: "errores", label: "Errores", icon: AlertTriangle },
  { id: "cuenta", label: "Cuenta", icon: KeyRound },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: z.object({ s: z.enum(["resumen", "animes", "episodios", "fuentes", "sync", "errores", "cuenta"]).optional() }),
  head: () => ({
    meta: [
      { title: "Administración — Estrenos" },
      { name: "description", content: "Panel privado de administración." },
      { property: "og:title", content: "Administración — Estrenos" },
      { property: "og:description", content: "Panel privado de administración." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("es", { dateStyle: "short", timeStyle: "short" }) : "—");
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cn("glass rounded-2xl p-4", className)}>{children}</div>;
const Btn = (p: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) => (
  <button {...p} className={cn("press rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50", p.variant === "danger" ? "bg-destructive text-destructive-foreground" : p.variant === "ghost" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground", p.className)} />
);

function AdminPage() {
  const { s = "resumen" } = Route.useSearch();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const role = useQuery({
    queryKey: ["admin-role"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user!.id).eq("role", "admin").maybeSingle();
      return { isAdmin: !!data, email: u.user?.email };
    },
  });
  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  };
  if (role.isLoading) return <div className="p-8 text-muted-foreground">Cargando…</div>;
  if (!role.data?.isAdmin)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-semibold">Esta cuenta no tiene acceso de administrador.</p>
        <Btn variant="ghost" onClick={signOut}>Cerrar sesión</Btn>
      </div>
    );
  const go = (id: SectionId) => (nav({ to: "/admin", search: { s: id } }), setOpen(false));
  const nav_ = (
    <nav className="flex flex-col gap-1">
      {SECTIONS.map(({ id, label, icon: I }) => (
        <button key={id} onClick={() => go(id)} className={cn("press flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium", s === id ? "bg-accent text-primary" : "text-muted-foreground")}>
          <I className="h-4 w-4" /> {label}
        </button>
      ))}
      <button onClick={signOut} className="press mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground"><LogOut className="h-4 w-4" /> Cerrar sesión</button>
    </nav>
  );
  return (
    <div className="min-h-dvh bg-background md:flex">
      <aside className="hidden w-60 shrink-0 border-r border-border p-4 md:block">
        <p className="mb-4 px-3 text-lg font-semibold">Administración</p>
        {nav_}
      </aside>
      <header className="flex items-center justify-between border-b border-border p-4 md:hidden">
        <p className="font-semibold">Administración</p>
        <button aria-label="Menú" onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <div className="glass-strong absolute inset-y-0 left-0 w-72 p-4 animate-page" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between px-3"><p className="font-semibold">Menú</p><button aria-label="Cerrar" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></div>
            {nav_}
          </div>
        </div>
      )}
      <main className="min-w-0 flex-1 space-y-4 p-4 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{SECTIONS.find((x) => x.id === s)!.label}</h1>
        {s === "resumen" && <Resumen />}
        {s === "animes" && <Animes />}
        {s === "episodios" && <Episodios />}
        {s === "fuentes" && <Fuentes />}
        {s === "sync" && <Sync />}
        {s === "errores" && <Errores />}
        {s === "cuenta" && <Cuenta email={role.data.email} />}
      </main>
    </div>
  );
}

function Resumen() {
  const q = useQuery({
    queryKey: ["adm-summary"],
    queryFn: async () => {
      const c = (t: "animes" | "episodios" | "news_items" | "sources" | "source_errors") =>
        supabase.from(t === "episodios" ? "episodes" : t).select("*", { count: "exact", head: true }).then((r) => r.count ?? 0);
      const [animes, eps, news, sources, errors, last] = await Promise.all([c("animes"), c("episodios"), c("news_items"), c("sources"), c("source_errors"), supabase.from("sync_runs").select("*").order("id", { ascending: false }).limit(1).maybeSingle()]);
      return { animes, eps, news, sources, errors, last: last.data };
    },
  });
  const d = q.data;
  const stats: [string, number | undefined][] = [["Animes", d?.animes], ["Episodios", d?.eps], ["Noticias", d?.news], ["Fuentes", d?.sources], ["Errores", d?.errors]];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map(([l, v]) => <Card key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-semibold">{v ?? "…"}</p></Card>)}
      </div>
      <Card>
        <p className="text-sm text-muted-foreground">Última sincronización</p>
        {d?.last ? <p className="mt-1">{fmt(d.last.started_at)} · {d.last.status} · {d.last.animes_new} animes nuevos · {d.last.episodes_new} episodios nuevos</p> : <p className="mt-1">Aún no se ha sincronizado.</p>}
      </Card>
    </div>
  );
}

function Animes() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["adm-animes", q],
    queryFn: async () => {
      let r = supabase.from("animes").select("id,title,year,season,status,hidden,next_airing_at").order("updated_at", { ascending: false }).limit(50);
      if (q.trim()) r = r.ilike("search_text", `%${q.trim().toLowerCase()}%`);
      return (await r).data ?? [];
    },
  });
  const act = async (id: string, patch: { hidden: boolean } | "delete") => {
    if (patch === "delete") {
      if (!confirm("¿Eliminar este anime y sus episodios y enlaces?")) return;
      await supabase.from("watch_links").delete().eq("anime_id", id);
      await supabase.from("episodes").delete().eq("anime_id", id);
      await supabase.from("news_items").update({ anime_id: null }).eq("anime_id", id);
      const { error } = await supabase.from("animes").delete().eq("id", id);
      if (error) return toast.error("No se pudo eliminar: " + error.message);
    } else {
      const { error } = await supabase.from("animes").update(patch).eq("id", id);
      if (error) return toast.error(error.message);
    }
    toast.success("Hecho");
    qc.invalidateQueries({ queryKey: ["adm-animes"] });
  };
  return (
    <div className="space-y-3">
      <input placeholder="Buscar anime…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded-xl bg-muted px-4 py-2.5 outline-none" />
      {list.data?.length === 0 && <p className="text-muted-foreground">Sin resultados.</p>}
      {list.data?.map((a) => (
        <Card key={a.id} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className={cn("truncate font-medium", a.hidden && "text-muted-foreground line-through")}>{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.year ?? "—"} · {a.season ?? "—"} · {a.status ?? "—"} · próximo: {fmt(a.next_airing_at)}</p>
            </div>
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => setSel(sel === a.id ? null : a.id)}>{sel === a.id ? "Cerrar" : "Editar"}</Btn>
              <Btn variant="ghost" onClick={() => act(a.id, { hidden: !a.hidden })}>{a.hidden ? "Restaurar" : "Ocultar"}</Btn>
              <Btn variant="danger" onClick={() => act(a.id, "delete")}>Eliminar</Btn>
            </div>
          </div>
          {sel === a.id && <AnimeEditor id={a.id} />}
        </Card>
      ))}
    </div>
  );
}

function AnimeEditor({ id }: { id: string }) {
  const qc = useQueryClient();
  const a = useQuery({ queryKey: ["adm-anime", id], queryFn: async () => (await supabase.from("animes").select("*").eq("id", id).single()).data });
  const hist = useQuery({ queryKey: ["adm-hist", id], queryFn: async () => (await supabase.from("change_history").select("*").eq("anime_id", id).order("id", { ascending: false }).limit(30)).data ?? [] });
  const [form, setForm] = useState<Record<string, string> | null>(null);
  if (!a.data) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  const f = form ?? { title: a.data.title, synopsis: a.data.synopsis ?? "", studio: a.data.studio ?? "", status: a.data.status ?? "", episodes: String(a.data.episodes ?? "") };
  const save = async () => {
    const { error } = await supabase.from("animes").update({ title: f.title!, synopsis: f.synopsis || null, studio: f.studio || null, status: f.status || null, episodes: f.episodes ? Number(f.episodes) : null, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    qc.invalidateQueries({ queryKey: ["adm-animes"] });
    qc.invalidateQueries({ queryKey: ["adm-anime", id] });
  };
  return (
    <div className="space-y-2 border-t border-border pt-3">
      {(["title", "studio", "status", "episodes"] as const).map((k) => (
        <label key={k} className="block text-xs text-muted-foreground">{k}
          <input value={f[k]} onChange={(e) => setForm({ ...f, [k]: e.target.value })} className="mt-1 w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground outline-none" />
        </label>
      ))}
      <label className="block text-xs text-muted-foreground">synopsis
        <textarea rows={4} value={f.synopsis} onChange={(e) => setForm({ ...f, synopsis: e.target.value })} className="mt-1 w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground outline-none" />
      </label>
      <Btn onClick={save}>Guardar cambios</Btn>
      <p className="pt-2 text-sm font-medium">Historial</p>
      {hist.data?.length ? hist.data.map((h) => <p key={h.id} className="text-xs text-muted-foreground">{fmt(h.created_at)} · {h.kind} {h.field ?? ""}: {h.old_value ?? "∅"} → {h.new_value ?? "∅"}</p>) : <p className="text-xs text-muted-foreground">Sin cambios registrados.</p>}
    </div>
  );
}

function Episodios() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["adm-eps"], queryFn: async () => (await supabase.from("episodes").select("id,number,title,aired_at,status,animes(title)").order("aired_at", { ascending: false, nullsFirst: false }).limit(60)).data ?? [] });
  const del = async (id: string) => {
    if (!confirm("¿Eliminar este episodio?")) return;
    await supabase.from("watch_links").delete().eq("episode_id", id);
    const { error } = await supabase.from("episodes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["adm-eps"] });
  };
  if (list.data?.length === 0) return <p className="text-muted-foreground">Todavía no hay episodios. Ejecuta una sincronización.</p>;
  return (
    <div className="space-y-2">
      {list.data?.map((e) => (
        <Card key={e.id} className="flex items-center justify-between gap-2 py-3">
          <div className="min-w-0"><p className="truncate text-sm font-medium">{(e.animes as { title: string } | null)?.title} · Ep. {e.number}</p><p className="text-xs text-muted-foreground">{fmt(e.aired_at)} · {e.status}</p></div>
          <Btn variant="danger" onClick={() => del(e.id)}>Eliminar</Btn>
        </Card>
      ))}
    </div>
  );
}

function Fuentes() {
  const qc = useQueryClient();
  const sync = useServerFn(syncNow);
  const test = useServerFn(testSourceUrl);
  const list = useQuery({ queryKey: ["adm-sources"], queryFn: async () => (await supabase.from("sources").select("*").order("kind").order("priority")).data ?? [] });
  const [busy, setBusy] = useState<string | null>(null);
  const [nw, setNw] = useState({ name: "", kind: "news", site_url: "", feed_url: "" });
  const setStatus = async (id: string, status: string) => {
    await supabase.from("sources").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["adm-sources"] });
  };
  const doTest = async (site: string, feed?: string | null) => {
    const r = await test({ data: { siteUrl: site, feedUrl: feed ?? "" } });
    const msg = `Sitio: ${r.site.ok ? `OK (${r.site.ms} ms)` : r.site.error}` + (r.feed ? ` · Feed: ${r.feed.ok ? `${r.feed.items} elementos` : r.feed.error}` : "");
    (r.site.ok && (!r.feed || r.feed.ok) ? toast.success : toast.error)(msg);
    return r;
  };
  const add = async () => {
    setBusy("new");
    try {
      const r = await doTest(nw.site_url, nw.feed_url);
      if (!r.site.ok || (r.feed && !r.feed.ok)) return;
      const { error } = await supabase.from("sources").insert({ name: nw.name, kind: nw.kind, site_url: nw.site_url, feed_url: nw.feed_url || null, integration_method: nw.kind === "video" ? "link" : "rss", trust: "medium" });
      if (error) return toast.error(error.message);
      setNw({ name: "", kind: "news", site_url: "", feed_url: "" });
      qc.invalidateQueries({ queryKey: ["adm-sources"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="space-y-3">
      <Card className="space-y-2">
        <p className="font-medium">Añadir fuente</p>
        <div className="grid gap-2 md:grid-cols-4">
          <input placeholder="Nombre" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} className="rounded-lg bg-muted px-3 py-2 text-sm outline-none" />
          <select value={nw.kind} onChange={(e) => setNw({ ...nw, kind: e.target.value })} className="rounded-lg bg-muted px-3 py-2 text-sm outline-none">
            <option value="news">Noticias (RSS)</option><option value="video">Video oficial</option>
          </select>
          <input placeholder="https://sitio" value={nw.site_url} onChange={(e) => setNw({ ...nw, site_url: e.target.value })} className="rounded-lg bg-muted px-3 py-2 text-sm outline-none" />
          <input placeholder="https://feed (opcional)" value={nw.feed_url} onChange={(e) => setNw({ ...nw, feed_url: e.target.value })} className="rounded-lg bg-muted px-3 py-2 text-sm outline-none" />
        </div>
        <Btn disabled={!nw.name || !nw.site_url || busy === "new"} onClick={add}>{busy === "new" ? "Probando…" : "Probar y guardar"}</Btn>
      </Card>
      {list.data?.map((s) => (
        <Card key={s.id} className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{s.name} <span className="text-xs text-muted-foreground">· {s.kind} · {s.integration_method} · {s.status}</span></p>
            <p className="text-xs text-muted-foreground">Última: {fmt(s.last_sync_at)} · {s.items_found} elementos · {s.last_response_ms ?? "—"} ms{s.last_error ? ` · ${s.last_error}` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {s.site_url && <Btn variant="ghost" disabled={busy === s.id} onClick={async () => (setBusy(s.id), await doTest(s.site_url!, s.feed_url).catch((e) => toast.error(e.message)), setBusy(null))}>Probar</Btn>}
            <Btn variant="ghost" onClick={() => setStatus(s.id, s.status === "disabled" ? "active" : "disabled")}>{s.status === "disabled" ? "Activar" : "Desactivar"}</Btn>
            {s.kind !== "video" && (
              <Btn disabled={busy === "sync" + s.id} onClick={async () => {
                setBusy("sync" + s.id);
                try { const r = await sync({ data: { sourceId: s.id } }); toast.success(`Sincronización: ${r.status} · ${r.animes_found} encontrados`); } catch (e) { toast.error((e as Error).message); }
                setBusy(null);
                qc.invalidateQueries();
              }}>Sincronizar</Btn>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function Sync() {
  const qc = useQueryClient();
  const sync = useServerFn(syncNow);
  const [running, setRunning] = useState(false);
  const runs = useQuery({
    queryKey: ["adm-runs"],
    queryFn: async () => (await supabase.from("sync_runs").select("*").order("id", { ascending: false }).limit(20)).data ?? [],
    refetchInterval: running ? 2000 : false,
  });
  const go = async () => {
    setRunning(true);
    try {
      const r = await sync({ data: {} });
      if (r.status === "skipped") toast.info("Ya hay una sincronización en curso.");
      else toast.success(`Listo (${r.status}): ${r.sources_ok} fuentes OK, ${r.sources_failed} fallaron, ${r.animes_new} animes nuevos, ${r.episodes_new} episodios nuevos, ${r.merged} fusionados.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setRunning(false);
    qc.invalidateQueries();
  };
  const cur = runs.data?.find((r) => r.status === "running");
  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-medium">Sincronizar ahora</p><p className="text-sm text-muted-foreground">{cur ? `En curso: ${cur.stage}` : "Se ejecuta también automáticamente cada 5 horas."}</p></div>
        <Btn disabled={running} onClick={go}><RefreshCw className={cn("mr-1 inline h-4 w-4", running && "animate-spin")} />{running ? "Sincronizando…" : "Sincronizar ahora"}</Btn>
      </Card>
      {runs.data?.map((r) => (
        <Card key={r.id}>
          <p className="font-medium">#{r.id} · {r.status} · {r.trigger} <span className="text-xs text-muted-foreground">· {fmt(r.started_at)} · {r.duration_ms ? `${Math.round(r.duration_ms / 1000)} s` : r.stage}</span></p>
          <p className="text-xs text-muted-foreground">Fuentes OK {r.sources_ok}/{r.sources_total} · fallaron {r.sources_failed} · encontrados {r.animes_found} · nuevos {r.animes_new} · episodios {r.episodes_new} · cambios {r.changes} · fusionados {r.merged}</p>
          <details className="mt-1 text-xs"><summary className="cursor-pointer text-muted-foreground">Detalle por fuente</summary>
            {(r.log as { source: string; ok: boolean; ms?: number; items?: number; error?: string }[]).map((l, i) => <p key={i} className={l.ok ? "" : "text-destructive"}>{l.source}: {l.ok ? `${l.items ?? 0} elementos, ${l.ms ?? "—"} ms` : l.error}</p>)}
          </details>
        </Card>
      ))}
    </div>
  );
}

function Errores() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["adm-errors"], queryFn: async () => (await supabase.from("source_errors").select("*, sources(name)").order("last_seen", { ascending: false }).limit(100)).data ?? [] });
  const mark = async (id: string) => {
    await supabase.from("source_errors").update({ reviewed: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["adm-errors"] });
  };
  if (list.data?.length === 0) return <p className="text-muted-foreground">No hay errores registrados.</p>;
  return (
    <div className="space-y-2">
      {list.data?.map((e) => (
        <Card key={e.id} className={cn("flex items-center justify-between gap-2", e.reviewed && "opacity-60")}>
          <div className="min-w-0"><p className="text-sm font-medium">{(e.sources as { name: string } | null)?.name} · {e.code} · ×{e.occurrences}</p><p className="truncate text-xs text-muted-foreground">{e.message} · {fmt(e.last_seen)}</p></div>
          {!e.reviewed && <Btn variant="ghost" onClick={() => mark(e.id)}>Revisado</Btn>}
        </Card>
      ))}
    </div>
  );
}

function Cuenta({ email }: { email?: string | undefined }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const save = async () => {
    if (p1.length < 8) return toast.error("Mínimo 8 caracteres.");
    if (p1 !== p2) return toast.error("Las contraseñas no coinciden.");
    const { error } = await supabase.auth.updateUser({ password: p1 });
    if (error) return toast.error(error.message);
    setP1(""); setP2("");
    toast.success("Contraseña actualizada.");
  };
  return (
    <Card className="max-w-md space-y-3">
      <p className="text-sm text-muted-foreground"><Database className="mr-1 inline h-4 w-4" />{email}</p>
      <input type="password" placeholder="Nueva contraseña" value={p1} onChange={(e) => setP1(e.target.value)} className="w-full rounded-lg bg-muted px-3 py-2 outline-none" />
      <input type="password" placeholder="Repetir contraseña" value={p2} onChange={(e) => setP2(e.target.value)} className="w-full rounded-lg bg-muted px-3 py-2 outline-none" />
      <Btn onClick={save}>Cambiar contraseña</Btn>
    </Card>
  );
}
