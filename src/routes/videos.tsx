import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PlayCircle, SearchX } from "lucide-react";
import { allAnimesQuery, latestEpisodesQuery, recentlyUpdatedQuery } from "@/lib/data";
import { usePrefs } from "@/lib/prefs";
import { relative } from "@/lib/format";
import { Cover, EmptyState, LargeTitle, PosterCard, PosterSkeleton, SearchField, SectionTitle, useDebounced } from "@/components/app/ui";

export const Route = createFileRoute("/videos")({
  head: () => ({
    meta: [
      { title: "Videos — Episodios de anime | Estrenos" },
      { name: "description", content: "Últimos episodios de anime y dónde verlos en plataformas oficiales." },
      { property: "og:title", content: "Videos — Episodios de anime" },
      { property: "og:description", content: "Últimos episodios de anime y dónde verlos en plataformas oficiales." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Videos,
});

const rail = "no-scrollbar -mx-5 flex snap-x gap-3.5 overflow-x-auto px-5 pb-2";
const railItem = "w-[128px] shrink-0 snap-start sm:w-[150px]";

function Videos() {
  const { history, hydrated } = usePrefs();
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [page, setPage] = useState(0);
  const searching = dq.trim().length >= 2;
  const latest = useQuery(latestEpisodesQuery({}, 0));
  const updated = useQuery(recentlyUpdatedQuery());
  const all = useQuery({ ...allAnimesQuery({ q: searching ? dq : undefined }, searching ? 0 : page), placeholderData: keepPreviousData });

  return (
    <div className="animate-page">
      <LargeTitle title="Videos" subtitle="Biblioteca de episodios" />
      <SearchField value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Buscar anime" />

      {!searching && (
        <>
          {hydrated && history.length > 0 && (
            <section>
              <SectionTitle>Continuar viendo</SectionTitle>
              <div className={rail}>
                {history.map((h) => (
                  <Link key={h.animeId} to="/anime/$id" params={{ id: h.animeId }} hash="episodios" className="press w-[220px] shrink-0 snap-start">
                    <div className="glass flex items-center gap-3 rounded-2xl p-2.5">
                      <Cover src={h.cover} alt={h.title} className="h-16 w-12 shrink-0 rounded-lg" />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold">{h.title}</p>
                        <p className="text-[12px] text-muted-foreground">Episodio {h.episode} · {h.source}</p>
                        <p className="text-[11px] text-muted-foreground/70">{relative(h.at)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle>Últimos episodios</SectionTitle>
            <div className={rail}>
              {latest.isLoading ? <PosterSkeleton n={5} className={railItem} /> : latest.data?.rows.map((a) => <PosterCard key={a.id} a={a} className={railItem} />)}
            </div>
            {!latest.isLoading && !latest.data?.rows.length && <EmptyState icon={PlayCircle} title="No hay nuevos episodios" text="Aparecerán aquí cuando se detecten." />}
          </section>

          <section>
            <SectionTitle>Actualizados recientemente</SectionTitle>
            <div className={rail}>
              {updated.isLoading ? <PosterSkeleton n={5} className={railItem} /> : updated.data?.map((a) => <PosterCard key={a.id} a={a} className={railItem} subtitle={<p className="mt-0.5 text-[12px] text-muted-foreground">{a.latest_episode ? `EP ${a.latest_episode} disponible` : "Próximamente"}</p>} />)}
            </div>
          </section>
        </>
      )}

      <section>
        <SectionTitle count={all.data?.count}>{searching ? "Resultados" : "Todos los animes"}</SectionTitle>
        <div className="mt-2 grid grid-cols-3 gap-x-3.5 gap-y-5 sm:grid-cols-4 md:grid-cols-5">
          {all.isLoading ? <PosterSkeleton n={9} /> : all.data?.rows.map((a) => <PosterCard key={a.id} a={a} />)}
        </div>
        {!all.isLoading && !all.data?.rows.length && <EmptyState icon={SearchX} title="No hay resultados" text="Prueba con otro nombre o alias." />}
        {!searching && (all.data?.count ?? 0) > 40 && (
          <div className="mt-6 flex items-center justify-center gap-3 text-[14px]">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="press glass rounded-full px-4 py-2 disabled:opacity-40">Anterior</button>
            <span className="tabular-nums text-muted-foreground">{page + 1} / {Math.ceil((all.data?.count ?? 0) / 40)}</span>
            <button disabled={(page + 1) * 40 >= (all.data?.count ?? 0)} onClick={() => setPage((p) => p + 1)} className="press glass rounded-full px-4 py-2 disabled:opacity-40">Siguiente</button>
          </div>
        )}
      </section>
    </div>
  );
}
