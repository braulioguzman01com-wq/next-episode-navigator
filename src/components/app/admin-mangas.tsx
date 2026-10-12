import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pingMangaDex, searchManga, type MangaCard } from "@/lib/mangadex.functions";
import { Cover, SearchField, useDebounced } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export function Mangas() {
  const qc = useQueryClient();
  const search = useServerFn(searchManga);
  const ping = useServerFn(pingMangaDex);
  const [q, setQ] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const dq = useDebounced(q.trim(), 500);
  const status = useQuery({ queryKey: ["md-ping"], queryFn: () => ping(), refetchInterval: 120e3 });
  const res = useQuery({ queryKey: ["md-search", dq], enabled: dq.length >= 3, queryFn: () => search({ data: { q: dq } }), staleTime: 10 * 60e3 });
  const list = useQuery({
    queryKey: ["mangas"],
    queryFn: async () => (await supabase.from("mangas").select("*").order("position").order("created_at")).data ?? [],
  });
  const accepted = new Set((list.data ?? []).map((m) => m.mangadex_id));

  const accept = async (m: MangaCard) => {
    const { error } = await supabase.from("mangas").insert({
      mangadex_id: m.id, title: m.title, slug: slugify(m.title) || m.id, cover_url: m.cover,
      volumes: m.lastVolume, chapters_total: m.lastChapter ? Math.floor(Number(m.lastChapter)) || null : null,
      position: (list.data?.length ?? 0),
    });
    if (error) return toast.error(error.message);
    toast.success("Manga agregado");
    setHidden((h) => [...h, m.id]);
    qc.invalidateQueries({ queryKey: ["mangas"] });
  };
  const remove = async (id: string) => {
    await supabase.from("mangas").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["mangas"] });
  };
  const move = async (i: number, d: -1 | 1) => {
    const arr = [...(list.data ?? [])];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    await Promise.all(arr.map((m, k) => supabase.from("mangas").update({ position: k }).eq("id", m.id)));
    qc.invalidateQueries({ queryKey: ["mangas"] });
  };

  const results = (res.data ?? []).filter((m) => !hidden.includes(m.id) && !accepted.has(m.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Mangas</h2>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("h-2 w-2 rounded-full", status.data?.ok ? "bg-success" : status.data ? "bg-destructive" : "bg-muted")} />
          MangaDex: {status.data ? (status.data.ok ? "Operativa" : "Caída") : "…"}
          {status.data && ` · ${new Date(status.data.at).toLocaleTimeString("es", { timeStyle: "short" })}`}
        </span>
      </div>
      <SearchField value={q} onChange={setQ} placeholder="Buscar manga, ej: Punpun" />
      {dq.length >= 3 && (
        <div className="space-y-3">
          {res.isLoading ? Array.from({ length: 3 }, (_, i) => <div key={i} className="shimmer h-28 rounded-2xl" />)
            : res.isError ? <p className="text-sm text-destructive">{(res.error as Error).message}</p>
            : !results.length ? <p className="text-sm text-muted-foreground">Sin resultados.</p>
            : results.map((m) => (
              <div key={m.id} className="glass flex gap-3 rounded-2xl p-3">
                <Cover src={m.cover} alt={m.title} className="aspect-[2/3] w-16 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-semibold">{m.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Volumen {m.lastVolume ?? "—"} / {m.lastChapter ? `Hasta cap. ${m.lastChapter}` : "— cap."} · {m.year ?? "—"}</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => accept(m)} className="press rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">Aceptar</button>
                    <button onClick={() => setHidden((h) => [...h, m.id])} className="press rounded-full bg-muted px-4 py-1.5 text-sm font-semibold">Rechazar</button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Aceptados ({list.data?.length ?? 0})</h3>
        <div className="space-y-2">
          {(list.data ?? []).map((m, i) => (
            <div key={m.id} className="glass flex items-center gap-3 rounded-xl p-2">
              <Cover src={m.cover_url} alt={m.title} className="aspect-[2/3] w-10 shrink-0 rounded-md" />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{m.title}</p>
              <button aria-label="Subir" onClick={() => move(i, -1)} className="press p-1.5"><ArrowUp className="h-4 w-4" /></button>
              <button aria-label="Bajar" onClick={() => move(i, 1)} className="press p-1.5"><ArrowDown className="h-4 w-4" /></button>
              <button onClick={() => remove(m.id)} className="press rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground">Quitar</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
