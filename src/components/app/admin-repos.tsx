import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addRepo, repoAction } from "@/lib/scan.functions";
import { cn } from "@/lib/utils";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("es", { dateStyle: "short", timeStyle: "short" }) : "—");
const btn = "press rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50";

export function Repos() {
  const qc = useQueryClient();
  const add = useServerFn(addRepo);
  const act = useServerFn(repoAction);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const repos = useQuery({ queryKey: ["adm-repos"], queryFn: async () => (await supabase.from("ext_repos").select("*").order("created_at")).data ?? [] });
  const exts = useQuery({ queryKey: ["adm-exts", open], enabled: !!open, queryFn: async () => (await supabase.from("ext_extensions").select("*, scan_sites(status,last_contents,last_chapters)").eq("repo_id", open!).order("name")).data ?? [] });
  const report = (r: any) => toast.success(`${r.extensions} extensiones (${r.format}) · ${r.withUrl} con URL · ${r.newSites} fuentes nuevas · ${r.contents} contenidos${r.pending ? ` · ${r.pending} se escanearán en la próxima sincronización` : ""}`);
  const run = async (k: string, fn: () => Promise<void>) => { setBusy(k); try { await fn(); } catch (e) { toast.error((e as Error).message); } setBusy(null); qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("adm-") }); };

  return (
    <div className="space-y-3">
      <div className="glass space-y-3 rounded-2xl p-4">
        <p className="font-medium">Agregar repositorio</p>
        <p className="text-xs text-muted-foreground">Pega el enlace del repositorio (GitHub o catálogo JSON / index.pb). Se detectan las extensiones y sus fuentes, y cada fuente se escanea automáticamente cada 5 horas.</p>
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/usuario/repositorio" className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-2 text-sm outline-none" />
          <button disabled={!url || busy === "add"} className={cn(btn, "bg-primary text-primary-foreground")} onClick={() => run("add", async () => { report(await add({ data: { url: url.trim() } })); setUrl(""); })}>{busy === "add" ? "Analizando…" : "Agregar"}</button>
        </div>
      </div>
      {repos.data?.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay repositorios.</p>}
      {repos.data?.map((r) => (
        <div key={r.id} className="glass space-y-2 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">{r.name ?? r.url} <span className="text-xs text-muted-foreground">· {r.status}{r.format ? ` · ${r.format}` : ""}</span></p>
              <p className="truncate text-xs text-muted-foreground">{r.url}</p>
              <p className="text-xs text-muted-foreground">Última lectura: {fmt(r.last_sync_at)} · {r.ext_count} extensiones{r.last_error ? ` · ${r.last_error}` : ""}</p>
            </div>
            <div className="flex gap-2">
              <button disabled={busy === r.id} className={cn(btn, "bg-primary text-primary-foreground")} onClick={() => run(r.id, async () => report(await act({ data: { id: r.id, action: "sync" } })))}>{busy === r.id ? "Sincronizando…" : "Sincronizar"}</button>
              <button className={cn(btn, "bg-muted")} onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Ocultar" : "Extensiones"}</button>
              <button className={cn(btn, "bg-destructive text-destructive-foreground")} onClick={() => confirm("¿Eliminar este repositorio? Las fuentes ya registradas se conservan en Mis sitios.") && run("d" + r.id, async () => void (await act({ data: { id: r.id, action: "delete" } })))}>Eliminar</button>
            </div>
          </div>
          {open === r.id && (
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {exts.data?.map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg bg-muted/40 p-2 text-xs">
                  {e.icon_url ? <img src={e.icon_url} alt="" loading="lazy" className="h-8 w-8 shrink-0 rounded" onError={(ev) => (ev.currentTarget.style.visibility = "hidden")} /> : <div className="h-8 w-8 shrink-0 rounded bg-muted" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.name} <span className="text-muted-foreground">{[e.lang, e.version, e.kind].filter(Boolean).join(" · ")}</span></p>
                    <p className="truncate text-muted-foreground">{e.base_url || e.note} {e.scan_sites ? `· ${e.scan_sites.status} · ${e.scan_sites.last_contents} contenidos · ${e.scan_sites.last_chapters} capítulos` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
