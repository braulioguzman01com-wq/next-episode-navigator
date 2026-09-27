import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ExternalLink, Film, PlayCircle } from "lucide-react";
import { animeQuery, episodesQuery } from "@/lib/data";
import { usePrefs } from "@/lib/prefs";
import { fmtDate, fmtDateTime, SEASON_LABEL, STATUS_LABEL } from "@/lib/format";
import { Cover, EmptyState, SaveButton, StatusDot } from "@/components/app/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/anime/$id")({
  head: () => ({
    meta: [
      { title: "Detalles del anime | Estrenos" },
      { name: "description", content: "Información, episodios y plataformas oficiales donde verlo." },
      { property: "og:title", content: "Detalles del anime | Estrenos" },
      { property: "og:description", content: "Información, episodios y plataformas oficiales donde verlo." },
      { property: "og:type", content: "video.tv_show" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { timezone, recordWatch } = usePrefs();
  const { data: a, isLoading } = useQuery(animeQuery(id));
  const eps = useQuery(episodesQuery(id));
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (!a) return <EmptyState icon={Film} title="Anime no encontrado" action={<Link to="/" className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Volver</Link>} />;

  const links = eps.data?.links ?? [];
  const animeLinks = links.filter((l) => !l.episode_id && l.source?.status !== "inactive");
  const platforms = [...new Map(animeLinks.map((l) => [l.source?.id, l])).values()].sort((x, y) => (x.source?.priority ?? 99) - (y.source?.priority ?? 99));
  const alt = [a.title_english, ...a.synonyms].filter((t) => t && t !== a.title).slice(0, 4);

  const facts: [string, string | number | null | undefined][] = [
    ["Año", a.year],
    ["Temporada", a.season ? SEASON_LABEL[a.season] ?? a.season : null],
    ["Estudio", a.studio],
    ["Estado", STATUS_LABEL[a.status ?? ""] ?? a.status],
    ["Episodios", a.episodes ?? (a.latest_episode ? `${a.latest_episode}+` : null)],
    ["Duración", a.duration ? `${a.duration} min` : null],
    ["Estreno", a.start_date ? fmtDate(`${a.start_date}T12:00:00Z`, "UTC", { day: "numeric", month: "long", year: "numeric" }) : null],
  ];

  const openLink = (url: string, episode: number, source: string) => {
    recordWatch({ animeId: a.id, title: a.title, cover: a.cover_url, episode, source, url });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="animate-page -mx-5">
      {/* Blurred backdrop from cover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden">
        {a.cover_url && <img src={a.banner_url ?? a.cover_url} alt="" aria-hidden className="h-full w-full scale-125 object-cover opacity-50 blur-3xl" />}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
      </div>

      <div className="relative px-5">
        <div className="pt-safe flex items-center justify-between pt-4">
          <button type="button" onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/" }))} aria-label="Atrás" className="press glass flex h-10 w-10 items-center justify-center rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <SaveButton anime={a} className="glass h-10 w-10 rounded-full" />
        </div>

        <div className="mt-6 flex flex-col items-center text-center sm:flex-row sm:items-end sm:gap-6 sm:text-left">
          <div style={{ viewTransitionName: "cover" }} className="overflow-hidden rounded-3xl shadow-[0_30px_60px_-20px_oklch(0_0_0/80%)]">
            <Cover src={a.cover_url} alt={a.title} color={a.color} eager className="h-[270px] w-[184px] rounded-3xl" />
          </div>
          <div className="mt-5 min-w-0 sm:mt-0">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight">{a.title}</h1>
            {a.title_native && <p className="mt-1 text-[15px] text-muted-foreground">{a.title_native}</p>}
            {alt.length > 0 && <p className="mt-1 text-[13px] text-muted-foreground/80">{alt.join(" · ")}</p>}
            <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {a.genres.slice(0, 5).map((g) => (
                <span key={g} className="glass rounded-full px-2.5 py-0.5 text-[12px]">{g}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <a href="#episodios" className="press flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground">
            <PlayCircle className="h-5 w-5" /> Ver episodios
          </a>
          <SaveButton anime={a} withLabel className="glass h-12 rounded-2xl" />
        </div>

        {a.next_airing_at && (
          <div className="glass mt-4 flex items-center justify-between rounded-2xl px-4 py-3">
            <div>
              <p className="text-[12px] uppercase tracking-wider text-muted-foreground">Próximo episodio</p>
              <p className="mt-0.5 text-[16px] font-semibold tabular-nums">{a.next_episode ? `Episodio ${a.next_episode}` : "Estreno"}</p>
            </div>
            <div className="text-right">
              <p className="text-[15px] font-medium tabular-nums">{fmtDateTime(a.next_airing_at, timezone)}</p>
              <p className="text-[12px] text-muted-foreground">Hora local · {timezone}</p>
            </div>
          </div>
        )}

        {a.synopsis && (
          <section className="mt-6">
            <h2 className="text-[17px] font-semibold">Sinopsis</h2>
            <p className={cn("mt-2 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground", !expanded && "line-clamp-4")}>{a.synopsis}</p>
            <button onClick={() => setExpanded((e) => !e)} className="press mt-1 text-[14px] font-medium text-primary">{expanded ? "Ver menos" : "Ver más"}</button>
          </section>
        )}

        <section className="mt-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {facts.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
              <div key={k}>
                <dt className="text-[12px] text-muted-foreground">{k}</dt>
                <dd className="text-[15px] font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-7">
          <h2 className="text-[17px] font-semibold">Dónde verlo</h2>
          {platforms.length ? (
            <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
              {platforms.map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="press glass flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium">
                  {l.source?.name} <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[14px] text-muted-foreground">Aún no hay plataformas oficiales registradas.</p>
          )}
        </section>

        <section id="episodios" className="mt-8 scroll-mt-6">
          <h2 className="text-[17px] font-semibold">Episodios</h2>
          {eps.isLoading ? (
            <div className="mt-3 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-2xl shimmer" />)}</div>
          ) : !eps.data?.episodes.length ? (
            <p className="mt-1 text-[14px] text-muted-foreground">No hay episodios disponibles todavía.</p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {eps.data.episodes.map((e) => {
                const own = links.filter((l) => l.episode_id === e.id);
                const sources = own.length ? own : platforms;
                return (
                  <div key={e.id} className="glass rounded-2xl p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold uppercase tracking-wider tabular-nums">Episodio {e.number}</p>
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" />Disponible</span>
                    </div>
                    {e.aired_at && <p className="mt-0.5 text-[12px] text-muted-foreground">{fmtDateTime(e.aired_at, timezone)}</p>}
                    {sources.length ? (
                      <div className="mt-2.5 divide-y divide-hairline">
                        {sources.map((l) => (
                          <div key={l.id} className="flex items-center justify-between py-2">
                            <span className="text-[14px]">{l.source?.name}{!own.length && <span className="text-muted-foreground"> · página de la serie</span>}</span>
                            <button onClick={() => openLink(l.url, e.number, l.source?.name ?? "")} className="press rounded-full bg-accent px-3.5 py-1 text-[13px] font-semibold text-primary">Ver</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[13px] text-muted-foreground">Sin fuentes oficiales todavía.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col items-center pt-20">
      <div className="h-[270px] w-[184px] rounded-3xl shimmer" />
      <div className="mt-5 h-6 w-2/3 rounded shimmer" />
      <div className="mt-2 h-4 w-1/3 rounded shimmer" />
      <div className="mt-6 grid w-full grid-cols-2 gap-3"><div className="h-12 rounded-2xl shimmer" /><div className="h-12 rounded-2xl shimmer" /></div>
      <div className="mt-6 w-full space-y-2"><div className="h-3.5 rounded shimmer" /><div className="h-3.5 rounded shimmer" /><div className="h-3.5 w-4/5 rounded shimmer" /></div>
    </div>
  );
}
