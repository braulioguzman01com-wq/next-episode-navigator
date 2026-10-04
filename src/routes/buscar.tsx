import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, SearchX, Star, TriangleAlert } from "lucide-react";
import { jikanGenres, jikanSearch, jikanTop, STATUS_ES, type JAnime } from "@/lib/jikan";
import { usePrefs } from "@/lib/prefs";
import { Chip, Cover, EmptyState, LargeTitle, PosterSkeleton, SearchField, SectionTitle, useDebounced } from "@/components/app/ui";

export const Route = createFileRoute("/buscar")({
  head: () => ({
    meta: [
      { title: "Buscar — Catálogo de anime | Estrenos" },
      { name: "description", content: "Busca cualquier anime del catálogo: portada, sinopsis, año, episodios y puntuación." },
      { property: "og:title", content: "Buscar — Catálogo de anime" },
      { property: "og:description", content: "Busca cualquier anime del catálogo: portada, sinopsis, año, episodios y puntuación." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Buscar,
});

export function JCard({ a }: { a: JAnime }) {
  return (
    <Link to="/catalogo/$id" params={{ id: String(a.mal_id) }} className="press block transition-transform duration-300 hover:scale-[1.04]">
      <Cover src={a.images.jpg.image_url} alt={a.title} className="aspect-[2/3] w-full rounded-xl" />
      <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-tight">{a.title}</p>
      <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted-foreground">
        {a.score != null && <><Star className="h-3 w-3 text-warning" />{a.score} · </>}
        {a.year ?? "—"} · {a.episodes ?? "?"} ep · {STATUS_ES[a.status ?? ""] ?? a.status}
      </p>
    </Link>
  );
}

function Buscar() {
  const { history, hydrated } = usePrefs();
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<number>();
  const [year, setYear] = useState<number>();
  const dq = useDebounced(q.trim(), 400);
  const active = dq.length >= 2 || genre || year;
  const top = useQuery(jikanTop());
  const res = useQuery({ ...jikanSearch(dq.length >= 2 ? dq : "", genre, year), enabled: !!active });
  const genres = useQuery(jikanGenres());
  const hero = top.data?.[0];
  const now = new Date().getFullYear();
  const cont = history.filter((h) => h.source === "catalogo");

  return (
    <div className="animate-page">
      <LargeTitle title="Buscar" />
      <SearchField value={q} onChange={setQ} placeholder="Buscar" />
      {active && <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {Array.from({ length: 8 }, (_, i) => now - i).map((y) => <Chip key={y} active={year === y} onClick={() => setYear(year === y ? undefined : y)}>{y}</Chip>)}
      </div>}
      {active && <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
        {(genres.data ?? []).slice(0, 30).map((g) => <Chip key={g.mal_id} active={genre === g.mal_id} onClick={() => setGenre(genre === g.mal_id ? undefined : g.mal_id)}>{g.name}</Chip>)}
      </div>}

      {active ? (
        <section>
          <SectionTitle count={res.data?.length}>Resultados</SectionTitle>
          {res.isError ? (
            <EmptyState icon={TriangleAlert} title="Error al buscar" text={(res.error as Error).message} action={<button onClick={() => res.refetch()} className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Reintentar</button>} />
          ) : res.isLoading ? (
            <div className="grid grid-cols-3 gap-3.5 sm:grid-cols-4 md:grid-cols-5"><PosterSkeleton n={10} /></div>
          ) : !res.data?.length ? (
            <EmptyState icon={SearchX} title="Sin resultados" text="Prueba con otro título o quita filtros." />
          ) : (
            <div className="grid grid-cols-3 gap-x-3.5 gap-y-5 sm:grid-cols-4 md:grid-cols-5">{res.data.map((a) => <JCard key={a.mal_id} a={a} />)}</div>
          )}
        </section>
      ) : (
        top.isLoading ? <PosterSkeleton n={6} /> : !hero ? (
          <EmptyState icon={Search} title="Empieza a escribir para buscar" />
        ) : <>
          {hero && (
            <Link to="/catalogo/$id" params={{ id: String(hero.mal_id) }} className="press relative mt-5 block overflow-hidden rounded-3xl">
              <img src={hero.images.jpg.large_image_url ?? hero.images.jpg.image_url} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />
              <div className="relative flex gap-4 p-4">
                <Cover src={hero.images.jpg.image_url} alt={hero.title} className="aspect-[2/3] w-28 shrink-0 rounded-xl" eager />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Tendencia n.º 1</p>
                  <p className="mt-1 text-[20px] font-bold leading-tight">{hero.title}</p>
                  <p className="mt-2 line-clamp-4 text-[13px] text-muted-foreground">{hero.synopsis}</p>
                </div>
              </div>
            </Link>
          )}
          {hydrated && cont.length > 0 && (
            <section>
              <SectionTitle>Continuar viendo</SectionTitle>
              <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
                {cont.map((h) => (
                  <Link key={h.animeId} to="/catalogo/$id" params={{ id: h.animeId }} search={{ ep: h.episode }} className="press glass flex w-[220px] shrink-0 items-center gap-3 rounded-2xl p-2.5">
                    <Cover src={h.cover} alt={h.title} className="h-16 w-12 shrink-0 rounded-lg" />
                    <div className="min-w-0"><p className="truncate text-[14px] font-semibold">{h.title}</p><p className="text-[12px] text-muted-foreground">Episodio {h.episode}</p></div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section>
            <SectionTitle>Tendencias</SectionTitle>
            {top.isError ? (
              <EmptyState icon={TriangleAlert} title="No se pudo cargar" text={(top.error as Error).message} action={<button onClick={() => top.refetch()} className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Reintentar</button>} />
            ) : (
              <div className="grid grid-cols-3 gap-x-3.5 gap-y-5 sm:grid-cols-4 md:grid-cols-5">{top.isLoading ? <PosterSkeleton n={10} /> : top.data?.map((a) => <JCard key={a.mal_id} a={a} />)}</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
