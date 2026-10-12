import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Gauge, X } from "lucide-react";
import { getChapterPages, getFeed, getManga } from "@/lib/mangadex.functions";
import { saveProgress } from "@/lib/reading";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manga/$id/$chapter")({
  head: () => ({
    meta: [
      { title: "Lector — Capítulo de manga" },
      { name: "description", content: "Lee este capítulo de manga en español." },
      { property: "og:title", content: "Lector — Capítulo de manga" },
      { property: "og:description", content: "Lee este capítulo de manga en español." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reader,
});

function Reader() {
  const { id, chapter } = Route.useParams();
  const nav = useNavigate();
  const pagesFn = useServerFn(getChapterPages);
  const feedFn = useServerFn(getFeed);
  const infoFn = useServerFn(getManga);
  const [saver, setSaver] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const [pct, setPct] = useState(0);
  const lastY = useRef(0);

  useEffect(() => setSaver(localStorage.getItem("data_saver") === "1"), []);
  const pages = useQuery({ queryKey: ["md-pages", chapter], queryFn: () => pagesFn({ data: { chapterId: chapter } }), staleTime: 10 * 60e3, gcTime: 12 * 60e3 });
  const info = useQuery({ queryKey: ["md-manga", id], queryFn: () => infoFn({ data: { id } }), staleTime: 10 * 60e3 });
  const feed = useInfiniteQuery({ queryKey: ["md-feed", id], initialPageParam: 0, queryFn: ({ pageParam }) => feedFn({ data: { id, offset: pageParam } }), getNextPageParam: (p) => p.next ?? undefined, staleTime: 10 * 60e3 });
  const list = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const idx = list.findIndex((c) => c.id === chapter);
  const cur = list[idx];
  const next = idx > 0 ? list[idx - 1] : undefined; // list is descending
  const prev = idx >= 0 ? list[idx + 1] : undefined;
  const urls = (saver ? pages.data?.saver : pages.data?.data) ?? [];

  useEffect(() => { window.scrollTo(0, 0); }, [chapter]);
  useEffect(() => {
    const on = () => {
      const y = window.scrollY;
      setShowBar(y < lastY.current || y < 60);
      lastY.current = y;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? y / h : 0;
      setPct(p);
      if (info.data && urls.length) saveProgress({ mangaId: id, title: info.data.title, cover: info.data.cover, chapterId: chapter, chapter: cur?.chapter ?? null, page: Math.round(p * (urls.length - 1)) + 1, at: Date.now() });
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [id, chapter, info.data, urls.length, cur?.chapter]);

  const go = (c?: { id: string }) => c && nav({ to: "/manga/$id/$chapter", params: { id, chapter: c.id } });
  const toggleSaver = () => { const v = !saver; setSaver(v); localStorage.setItem("data_saver", v ? "1" : "0"); };

  return (
    <div className="-mx-5 -mt-4">
      <div className={cn("glass fixed inset-x-0 top-0 z-40 transition-transform duration-300", showBar ? "translate-y-0" : "-translate-y-full")}>
        <div className="h-0.5 bg-primary" style={{ width: `${pct * 100}%` }} />
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
          <Link to="/manga/$id" params={{ id }} aria-label="Cerrar" className="press p-2"><X className="h-5 w-5" /></Link>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{info.data?.title ?? ""} · Cap. {cur?.chapter ?? "—"}</p>
          <button onClick={toggleSaver} className={cn("press flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold", saver ? "bg-primary text-primary-foreground" : "bg-muted")}><Gauge className="h-3.5 w-3.5" />Ahorro</button>
        </div>
      </div>
      <div className="mx-auto max-w-3xl pt-14">
        {pages.isLoading ? Array.from({ length: 3 }, (_, i) => <div key={i} className="shimmer mb-1 aspect-[2/3] w-full" />)
          : pages.isError ? <p className="p-8 text-center text-sm text-destructive">No se pudo cargar el capítulo. <button className="underline" onClick={() => pages.refetch()}>Reintentar</button></p>
          : urls.map((u, i) => <img key={u} src={u} alt={`Página ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} className="block min-h-[40vh] w-full bg-muted" onError={() => i === 0 && pages.refetch()} />)}
        {!!urls.length && (
          <div className="px-5 py-10 text-center">
            {next ? <button onClick={() => go(next)} className="press rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Siguiente: Cap. {next.chapter}</button>
              : <p className="text-sm text-muted-foreground">Has llegado al último capítulo disponible.</p>}
            {cur?.group && <p className="mt-4 text-xs text-muted-foreground">Traducción: {cur.group} · vía MangaDex</p>}
          </div>
        )}
      </div>
      <div className={cn("fixed bottom-24 right-4 z-40 flex gap-2 transition-opacity", showBar ? "opacity-100" : "pointer-events-none opacity-0")}>
        <button aria-label="Capítulo anterior" disabled={!prev} onClick={() => go(prev)} className="press glass flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
        <button aria-label="Capítulo siguiente" disabled={!next} onClick={() => go(next)} className="press glass flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
      </div>
    </div>
  );
}
