import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft } from "lucide-react";
import { getFeed, getManga } from "@/lib/mangadex.functions";
import { Cover, SectionTitle } from "@/components/app/ui";

export const Route = createFileRoute("/manga/$id")({
  head: () => ({
    meta: [
      { title: "Manga — Capítulos en español" },
      { name: "description", content: "Sinopsis y capítulos en español de este manga." },
      { property: "og:title", content: "Manga — Capítulos en español" },
      { property: "og:description", content: "Sinopsis y capítulos en español de este manga." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MangaLayout,
});

const STATUS: Record<string, string> = { ongoing: "En publicación", completed: "Finalizado", hiatus: "En pausa", cancelled: "Cancelado" };

function MangaLayout() {
  const matches = useMatches();
  if (matches.some((m) => m.routeId === "/manga/$id/$chapter")) return <Outlet />;
  return <MangaPage />;
}

function MangaPage() {
  const { id } = Route.useParams();
  const info = useServerFn(getManga);
  const feed = useServerFn(getFeed);
  const m = useQuery({ queryKey: ["md-manga", id], queryFn: () => info({ data: { id } }), staleTime: 10 * 60e3 });
  const ch = useInfiniteQuery({
    queryKey: ["md-feed", id],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => feed({ data: { id, offset: pageParam } }),
    getNextPageParam: (p) => p.next ?? undefined,
    staleTime: 10 * 60e3,
  });
  const chapters = ch.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="animate-page">
      <Link to="/" className="press mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Inicio</Link>
      {m.isLoading ? <div className="shimmer h-48 rounded-2xl" /> : m.data && (
        <div className="flex gap-4">
          <Cover src={m.data.cover} alt={m.data.title} eager className="aspect-[2/3] w-32 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight">{m.data.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{STATUS[m.data.status ?? ""] ?? m.data.status ?? "—"} · {m.data.year ?? "—"}</p>
          </div>
        </div>
      )}
      {m.data?.description && <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">{m.data.description}</p>}
      <SectionTitle count={ch.data?.pages[0]?.total}>Capítulos</SectionTitle>
      {ch.isLoading ? Array.from({ length: 6 }, (_, i) => <div key={i} className="shimmer mb-2 h-14 rounded-xl" />)
        : ch.isError ? <p className="text-sm text-destructive">No se pudieron cargar los capítulos.</p>
        : !chapters.length ? <p className="text-sm text-muted-foreground">No hay capítulos en español disponibles.</p>
        : (
          <div className="divide-y divide-border">
            {chapters.map((c) => (
              <Link key={c.id} to="/manga/$id/$chapter" params={{ id, chapter: c.id }} className="press flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">Cap. {c.chapter ?? "—"}{c.title ? ` — ${c.title}` : ""}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.volume ? `Vol. ${c.volume} · ` : ""}{c.group ?? "Sin grupo"} · {c.lang}</p>
                </div>
                <span className="text-xs text-muted-foreground">{c.pages} pág.</span>
              </Link>
            ))}
          </div>
        )}
      {ch.hasNextPage && (
        <button onClick={() => ch.fetchNextPage()} disabled={ch.isFetchingNextPage} className="press mt-4 w-full rounded-full bg-muted py-3 text-sm font-semibold">
          {ch.isFetchingNextPage ? "Cargando…" : "Cargar más"}
        </button>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">Datos y capítulos de MangaDex y sus grupos de traducción.</p>
    </div>
  );
}
