import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeSite, saveSite, scanSiteNow, updateSiteState } from "@/lib/scan.functions";
import { cn } from "@/lib/utils";

const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("es", { dateStyle: "short", timeStyle: "short" }) : "—");
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cn("glass rounded-2xl p-4", className)}>{children}</div>;
const Btn = (p: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) => (
  <button {...p} className={cn("press rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50", p.variant === "danger" ? "bg-destructive text-destructive-foreground" : p.variant === "ghost" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground", p.className)} />
);
const input = "rounded-lg bg-muted px-3 py-2 text-sm outline-none";

type Preview = Awaited<ReturnType<typeof analyzeSite>>;

export function Sitios() {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeSite);
  const save = useServerFn(saveSite);
  const scan = useServerFn(scanSiteNow);
  const setState = useServerFn(updateSiteState);
  const [form, setForm] = useState<{ id?: string; name: string; url: string }>({ name: "", url: "" });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const sites = useQuery({ queryKey: ["adm-sites"], queryFn: async () => (await supabase.from("scan_sites").select("*").order("created_at")).data ?? [], refetchInterval: busy ? 3000 : false });
  const errs = useQuery({ queryKey: ["adm-scan-errors"], queryFn: async () => (await supabase.from("scan_errors").select("*").order("id", { ascending: false }).limit(30)).data ?? [] });
  const contents = useQuery({
    queryKey: ["adm-site-contents", open],
    enabled: !!open,
    queryFn: async () => (await supabase.from("site_contents").select("id,title,cover_url,page_url,missing_since,site_chapters(number,lang,play_url,video_type)").eq("site_id", open!).order("title")).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("adm-s") });
  const wrap = async (key: string, fn: () => Promise<void>) => { setBusy(key); try { await fn(); } catch (e) { toast.error((e as Error).message); } setBusy(null); refresh(); };
  const report = (r: any) => r.skipped ? toast.info("Ya hay un escaneo en curso para esta fuente.") : toast.success(`${r.found} contenidos detectados · ${r.newContents} nuevos · ${r.newChapters} capítulos nuevos · ${r.updatedChapters} actualizados${r.errors ? ` · ${r.errors} avisos` : ""}`);

  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <p className="font-medium">{form.id ? "Editar sitio" : "Añadir sitio"}</p>
        <p className="text-xs text-muted-foreground">Solo sitios propios o con contenido que tengas derecho a mostrar. Los sitios con verificación anti-bots no se evaden.</p>
        <div className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
          <input placeholder="https://misitio.com/catalogo" value={form.url} onChange={(e) => (setForm({ ...form, url: e.target.value }), setPreview(null))} className={input} />
          <Btn disabled={!form.url || busy === "analyze"} onClick={() => wrap("analyze", async () => setPreview(await analyze({ data: { url: form.url.trim() } })))}>{busy === "analyze" ? "Analizando…" : "Analizar"}</Btn>
        </div>
        {preview && (
          <div className="space-y-2 rounded-xl bg-muted/50 p-3">
            <p className="text-sm font-medium">{preview.contents.length} contenidos encontrados · {preview.contents.reduce((a, c) => a + c.chapters.length, 0)} capítulos · método: {preview.strategy} · {Math.round(preview.ms / 100) / 10} s</p>
            {preview.errors.length > 0 && <p className="text-xs text-destructive">{preview.errors.length} avisos: {preview.errors.slice(0, 3).map((e) => `${e.code} ${e.message}`).join(" · ")}</p>}
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {preview.contents.map((c) => (
                <div key={c.stable_key} className="flex gap-3 rounded-lg bg-background/40 p-2">
                  {c.cover_url ? <img src={c.cover_url} alt="" loading="lazy" className="h-16 w-11 shrink-0 rounded object-cover" /> : <div className="h-16 w-11 shrink-0 rounded bg-muted" />}
                  <div className="min-w-0 text-xs">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="text-muted-foreground">Portada {c.cover_url ? "encontrada" : "no encontrada"} · descripción {c.description ? "encontrada" : "no encontrada"} · {c.chapters.length} capítulos · {c.chapters.filter((x) => x.play_url).length} con video</p>
                    {c.chapters.length > 0 && <p className="truncate text-muted-foreground">{c.chapters.slice(0, 12).map((x) => `${x.number}${x.lang !== "und" ? ` (${x.lang})` : ""}${x.video_type ? ` ${x.video_type}` : ""}`).join(" · ")}</p>}
                  </div>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} /> Confirmo que este sitio es mío o que tengo derecho a mostrar su contenido.</label>
            <div className="flex gap-2">
              <Btn disabled={!form.name || !rights || !preview.contents.length || busy === "save"} onClick={() => wrap("save", async () => { report(await save({ data: { id: form.id, name: form.name, url: form.url.trim() } })); setForm({ name: "", url: "" }); setPreview(null); setRights(false); })}>{busy === "save" ? "Guardando…" : "Confirmar y guardar"}</Btn>
              <Btn variant="ghost" onClick={() => setPreview(null)}>Descartar</Btn>
            </div>
          </div>
        )}
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Los sitios activos se escanean también cada 5 horas. Un fallo nunca borra datos.</p>
        <Btn disabled={busy === "all"} onClick={() => wrap("all", async () => { const r = await scan({ data: {} }); toast.success(`${r.length} sitios escaneados · ${r.reduce((a: number, x: any) => a + (x.newChapters ?? 0), 0)} capítulos nuevos`); })}>
          <RefreshCw className={cn("mr-1 inline h-4 w-4", busy === "all" && "animate-spin")} />{busy === "all" ? "Escaneando…" : "Escanear todo"}
        </Btn>
      </Card>

      {sites.data?.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay sitios.</p>}
      {sites.data?.map((s) => (
        <Card key={s.id} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">{s.name} <span className="text-xs text-muted-foreground">· {s.active ? s.status : "desactivado"}</span></p>
              <p className="truncate text-xs text-muted-foreground">{s.url}</p>
              <p className="text-xs text-muted-foreground">Último escaneo: {fmt(s.last_scan_at)} · {s.last_contents} contenidos · {s.last_chapters} capítulos{s.last_error ? ` · ${s.last_error}` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn disabled={busy === s.id} onClick={() => wrap(s.id, async () => report((await scan({ data: { id: s.id } }))[0]))}>{busy === s.id ? "Escaneando…" : "Analizar ahora"}</Btn>
              <Btn variant="ghost" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? "Ocultar" : "Contenidos"}</Btn>
              <Btn variant="ghost" onClick={() => (setForm({ id: s.id, name: s.name, url: s.url }), setPreview(null), window.scrollTo({ top: 0, behavior: "smooth" }))}>Editar</Btn>
              <Btn variant="ghost" onClick={() => wrap("st" + s.id, async () => void (await setState({ data: { id: s.id, action: s.active ? "deactivate" : "activate" } })))}>{s.active ? "Desactivar" : "Activar"}</Btn>
              <Btn variant="danger" onClick={() => confirm(`¿Eliminar "${s.name}" y todos sus contenidos?`) && wrap("del" + s.id, async () => void (await setState({ data: { id: s.id, action: "delete" } })))}>Eliminar</Btn>
            </div>
          </div>
          {open === s.id && (
            <div className="max-h-96 space-y-1 overflow-y-auto text-xs">
              {contents.isLoading && <p className="text-muted-foreground">Cargando…</p>}
              {contents.data?.map((c: any) => (
                <details key={c.id} className="rounded-lg bg-muted/40 p-2">
                  <summary className="cursor-pointer"><span className="font-medium">{c.title}</span> · {c.site_chapters.length} capítulos{c.missing_since ? " · no visto en el último escaneo" : ""}</summary>
                  <div className="mt-1 space-y-0.5">
                    {[...c.site_chapters].sort((a: any, b: any) => a.number - b.number).map((ch: any) => (
                      <p key={`${ch.number}${ch.lang}`} className="truncate text-muted-foreground">Cap. {ch.number}{ch.lang !== "und" ? ` (${ch.lang})` : ""} · {ch.play_url ? `${ch.video_type}: ${ch.play_url}` : "sin video detectado"}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </Card>
      ))}

      {!!errs.data?.length && (
        <Card className="space-y-1">
          <p className="font-medium">Errores recientes de escaneo</p>
          {errs.data.map((e) => <p key={e.id} className="truncate text-xs text-muted-foreground">{fmt(e.created_at)} · {e.code} · {e.message} · {e.url}</p>)}
        </Card>
      )}
    </div>
  );
}
