import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, Film, Star, TriangleAlert } from "lucide-react";
import { z } from "zod";
import { jikanAnime, jikanEpisodes, STATUS_ES } from "@/lib/jikan";
import { SOURCES } from "@/config/sources";
import { usePrefs } from "@/lib/prefs";
import { VideoPlayer } from "@/components/app/video-player";
import { Chip, Cover, EmptyState, RowSkeleton, SectionTitle } from "@/components/app/ui";
import { ClientOnly } from "@tanstack/react-router";

export const Route = createFileRoute("/catalogo/$id")({
  validateSearch: z.object({ ep: z.number().int().positive().optional() }),
  head: () => ({
    meta: [
      { title: "Ficha del anime | Estrenos" },
      { name: "description", content: "Sinopsis, episodios y reproductor de fuentes oficiales." },
      { property: "og:title", content: "Ficha del anime" },
      { property: "og:description", content: "Sinopsis, episodios y reproductor de fuentes oficiales." },
      { property: "og:type", content: "video.tv_show" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Ficha,
});

function Ficha() {
  const id = Number(Route.useParams().id);
  const { ep: initialEp } = Route.useSearch();
  const { recordWatch } = usePrefs();
  const anime = useQuery(jikanAnime(id));
  const eps = useQuery({ ...jikanEpisodes(id), enabled: anime.isSuccess });
  const [ep, setEp] = useState(initialEp ?? 1);
  const [srcIdx, setSrcIdx] = useState(0);
  const a = anime.data;

  const list = useMemo(() => {
    if (eps.data?.length) return eps.data.map((e) => ({ n: e.mal_id, title: e.title ?? `Episodio ${e.mal_id}` }));
    if (a) return [{ n: 1, title: a.title }];
    return [];
  }, [eps.data, a]);

  if (anime.isError)
    return <EmptyState icon={TriangleAlert} title="No se pudo cargar" text={(anime.error as Error).message} action={<button onClick={() => anime.refetch()} className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Reintentar</button>} />;
  if (!a) return <div className="pt-16"><RowSkeleton n={6} /></div>;

  const available = SOURCES.map((s) => ({ s, url: s.getUrl(a, ep) })).filter((x) => x.url);
  const cur = available[Math.min(srcIdx, available.length - 1)];

  return (
    <div className="animate-page pb-8 pt-[max(env(safe-area-inset-top),1rem)]">
      <Link to="/buscar" className="press glass inline-flex h-10 w-10 items-center justify-center rounded-full" aria-label="Volver"><ChevronLeft className="h-5 w-5" /></Link>
      <div className="relative mt-4 overflow-hidden rounded-3xl">
        <img src={a.images.jpg.large_image_url ?? a.images.jpg.image_url} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
        <div className="relative flex gap-4 p-4">
          <Cover src={a.images.jpg.large_image_url ?? a.images.jpg.image_url} alt={a.title} className="aspect-[2/3] w-32 shrink-0 rounded-xl" eager />
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold leading-tight">{a.title}</h1>
            {a.title_english && <p className="mt-1 text-[13px] text-muted-foreground">{a.title_english}</p>}
            {a.title_japanese && <p className="text-[13px] text-muted-foreground">{a.title_japanese}</p>}
            <p className="mt-2 flex flex-wrap items-center gap-1 text-[12.5px] text-muted-foreground">
              {a.score != null && <><Star className="h-3.5 w-3.5 text-warning" />{a.score} · </>}
              {a.year ?? "—"} · {a.episodes ?? "?"} episodios · {STATUS_ES[a.status ?? ""] ?? a.status}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">{a.genres.map((g) => <span key={g.mal_id} className="glass rounded-full px-2 py-0.5 text-[11px]">{g.name}</span>)}</div>
          </div>
        </div>
      </div>

      <SectionTitle>Sinopsis <span className="ml-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">EN</span></SectionTitle>
      <p className="text-[14px] leading-relaxed text-muted-foreground">{a.synopsis ?? "Sin sinopsis disponible."}</p>

      <SectionTitle>Reproductor · Episodio {ep}</SectionTitle>
      {cur ? (
        <>
          {available.length > 1 && <div className="mb-2 flex gap-2">{available.map((x, i) => <Chip key={x.s.name} active={cur === x} onClick={() => setSrcIdx(i)}>{x.s.name}</Chip>)}</div>}
          <p className="mb-2 text-[12px] text-muted-foreground">Fuente: {cur.s.name}</p>
          <ClientOnly>
            <VideoPlayer
              key={`${cur.s.name}-${ep}`}
              type={cur.s.type}
              url={cur.url!}
              progressKey={`progress_${a.mal_id}_${ep}`}
              subtitles={cur.s.subtitles?.(a, ep)}
              onStart={() => recordWatch({ animeId: String(a.mal_id), title: a.title, cover: a.images.jpg.image_url, episode: ep, source: "catalogo", url: cur.url! })}
            />
          </ClientOnly>
        </>
      ) : (
        <EmptyState icon={Film} title="Sin fuente con licencia" text="Ninguna fuente oficial configurada tiene vídeo para este episodio." />
      )}

      <SectionTitle count={list.length}>Episodios</SectionTitle>
      {eps.isLoading ? <RowSkeleton n={4} /> : (
        <div className="space-y-1.5">
          {list.map((e) => (
            <button key={e.n} onClick={() => { setEp(e.n); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`press glass flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${e.n === ep ? "text-primary" : ""}`}>
              <span className="w-8 shrink-0 tabular-nums text-[13px] text-muted-foreground">{e.n}</span>
              <span className="truncate text-[14px]">{e.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
