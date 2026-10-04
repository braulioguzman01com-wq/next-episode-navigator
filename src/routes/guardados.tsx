import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LibraryBig } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/prefs";
import { EmptyState, LargeTitle, ReleaseRow, RowSkeleton, SectionTitle } from "@/components/app/ui";
import type { CardAnime } from "@/lib/data";

export const Route = createFileRoute("/guardados")({
  head: () => ({
    meta: [
      { title: "Colección — Tus animes | Estrenos" },
      { name: "description", content: "Tus animes guardados, ordenados por el próximo estreno." },
      { property: "og:title", content: "Colección — Tus animes" },
      { property: "og:description", content: "Tus animes guardados, ordenados por el próximo estreno." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Guardados,
});

function Guardados() {
  const { saved, hydrated } = usePrefs();
  const ids = saved.map((s) => s.id);
  // Always read fresh data from the database so saved items reflect the latest sync.
  const { data, isLoading } = useQuery({
    queryKey: ["saved", ids],
    enabled: hydrated && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animes")
        .select("id,title,title_english,cover_url,color,next_airing_at,next_episode,status,latest_episode,latest_episode_at,episodes,year,season,genres")
        .in("id", ids);
      if (error) throw error;
      return data as CardAnime[];
    },
  });
  const now = Date.now();
  const rows = (data ?? []).slice();
  const upcoming = rows.filter((a) => a.next_airing_at && +new Date(a.next_airing_at) > now - 3 * 3600e3).sort((a, b) => +new Date(a.next_airing_at!) - +new Date(b.next_airing_at!));
  const rest = rows.filter((a) => !upcoming.includes(a));

  return (
    <div className="animate-page">
       <LargeTitle title="Colección" subtitle={hydrated && ids.length ? `${ids.length} ${ids.length === 1 ? "anime" : "animes"}` : undefined} />
      {!hydrated || (isLoading && ids.length) ? (
        <RowSkeleton n={4} />
      ) : !ids.length ? (
        <EmptyState icon={LibraryBig} title="Tu colección está vacía" text="Los animes que guardes aparecerán aquí." action={<Link to="/buscar" className="press rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Buscar anime</Link>} />
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <SectionTitle>Próximo estreno</SectionTitle>
              {upcoming.map((a) => <ReleaseRow key={a.id} a={a} />)}
            </>
          )}
          {rest.length > 0 && (
            <>
              <SectionTitle>Sin fecha próxima</SectionTitle>
              {rest.map((a) => <ReleaseRow key={a.id} a={a} />)}
            </>
          )}
        </>
      )}
    </div>
  );
}
