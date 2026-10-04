import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarX2, SlidersHorizontal } from "lucide-react";
import { upcomingQuery, genresQuery, type CardAnime, type Filters } from "@/lib/data";
import { usePrefs } from "@/lib/prefs";
import { BUCKETS, bucketFor, SEASON_LABEL } from "@/lib/format";
import { Chip, EmptyState, LargeTitle, ReleaseRow, RowSkeleton, SearchField, SectionTitle, useDebounced } from "@/components/app/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inicio — Estrenos de anime" },
      { name: "description", content: "Estrenos de anime de hoy, mañana y esta semana, en tu zona horaria." },
      { property: "og:title", content: "Inicio — Estrenos de anime" },
      { property: "og:description", content: "Estrenos de anime de hoy, mañana y esta semana, en tu zona horaria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Nuevos,
});

const STATUSES = [
  { v: "RELEASING", l: "En emisión" },
  { v: "NOT_YET_RELEASED", l: "Próximos estrenos" },
];

function Nuevos() {
  const { timezone, hydrated } = usePrefs();
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [f, setF] = useState<Filters>({});
  const dq = useDebounced(q, 300);
  const filters = { ...f, q: dq.trim().length >= 2 ? dq : undefined };
  const { data, isLoading, isError, refetch } = useQuery(upcomingQuery(filters));
  const genres = useQuery({ ...genresQuery(), enabled: showFilters });

  const groups = useMemo(() => {
    const g = new Map<string, CardAnime[]>();
    for (const a of data ?? []) {
      if (!a.next_airing_at) continue;
      const b = bucketFor(a.next_airing_at, timezone);
      g.set(b, [...(g.get(b) ?? []), a]);
    }
    return g;
  }, [data, timezone]);

  const year = new Date().getFullYear();

  return (
    <div className="animate-page">
      <LargeTitle
        title="Inicio"
        right={
          <button type="button" aria-label="Filtros" onClick={() => setShowFilters((s) => !s)} className={cn("press glass flex h-10 w-10 items-center justify-center rounded-full", showFilters && "text-primary")}>
            <SlidersHorizontal className="h-[18px] w-[18px]" />
          </button>
        }
      />
      <SearchField value={q} onChange={setQ} placeholder="Buscar" />

      <div className={cn("grid transition-[grid-template-rows,opacity] duration-300", showFilters ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
            {STATUSES.map((s) => (
              <Chip key={s.v} active={f.status === s.v} onClick={() => setF((p) => ({ ...p, status: p.status === s.v ? undefined : s.v }))}>{s.l}</Chip>
            ))}
            {[year, year + 1].map((y) => (
              <Chip key={y} active={f.year === y} onClick={() => setF((p) => ({ ...p, year: p.year === y ? undefined : y }))}>{y}</Chip>
            ))}
            {Object.entries(SEASON_LABEL).map(([k, l]) => (
              <Chip key={k} active={f.season === k} onClick={() => setF((p) => ({ ...p, season: p.season === k ? undefined : k }))}>{l}</Chip>
            ))}
          </div>
          <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
            {(genres.data ?? []).map((g) => (
              <Chip key={g} active={f.genre === g} onClick={() => setF((p) => ({ ...p, genre: p.genre === g ? undefined : g }))}>{g}</Chip>
            ))}
          </div>
        </div>
      </div>

      {isLoading || !hydrated ? (
        <>
          <SectionTitle>Hoy</SectionTitle>
          <RowSkeleton n={6} />
        </>
      ) : isError ? (
        <EmptyState icon={CalendarX2} title="No se pudo cargar" text="Revisa tu conexión e inténtalo de nuevo." action={<button onClick={() => refetch()} className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Reintentar</button>} />
      ) : !data?.length ? (
        <EmptyState icon={CalendarX2} title={filters.q ? "No hay resultados" : "Aún no hay estrenos"} text={filters.q ? "Prueba con otro nombre." : "Los nuevos animes aparecerán aquí."} />
      ) : (
        BUCKETS.filter((b) => groups.get(b)?.length).map((b) => (
          <section key={b}>
            <SectionTitle count={groups.get(b)!.length}>{b}</SectionTitle>
            <div>
              {groups.get(b)!.map((a) => (
                <ReleaseRow key={a.id} a={a} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
