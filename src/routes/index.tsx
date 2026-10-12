import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readProgress, type Progress } from "@/lib/reading";
import { Cover, EmptyState, LargeTitle, PosterSkeleton, SectionTitle } from "@/components/app/ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inicio — Mangas en español" },
      { name: "description", content: "Lee mangas en español: catálogo seleccionado y continúa donde lo dejaste." },
      { property: "og:title", content: "Inicio — Mangas en español" },
      { property: "og:description", content: "Lee mangas en español: catálogo seleccionado y continúa donde lo dejaste." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const [progress, setProgress] = useState<Progress[]>([]);
  useEffect(() => setProgress(readProgress()), []);
  const { data, isLoading } = useQuery({
    queryKey: ["mangas-public"],
    queryFn: async () => (await supabase.from("mangas").select("id,mangadex_id,title,cover_url,volumes,chapters_total").order("position").order("created_at")).data ?? [],
    staleTime: 60e3,
  });

  return (
    <div className="animate-page">
      <LargeTitle title="Inicio" />
      {!!data?.length && (
        <div className="no-scrollbar -mx-5 mb-2 flex gap-2 overflow-x-auto px-5 pb-1">
          {data.map((m) => (
            <Link key={m.id} to="/manga/$id" params={{ id: m.mangadex_id }} className="press shrink-0 rounded-full bg-muted px-4 py-2 text-sm font-medium">{m.title}</Link>
          ))}
        </div>
      )}
      {progress.length > 0 && (
        <section>
          <SectionTitle>Continuar leyendo</SectionTitle>
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {progress.map((p) => (
              <Link key={p.mangaId} to="/manga/$id/$chapter" params={{ id: p.mangaId, chapter: p.chapterId }} className="press w-28 shrink-0">
                <Cover src={p.cover} alt={p.title} className="aspect-[2/3] w-full rounded-xl" />
                <p className="mt-1.5 line-clamp-1 text-[13px] font-semibold">{p.title}</p>
                <p className="text-[11.5px] text-muted-foreground">Cap. {p.chapter ?? "—"}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <SectionTitle count={data?.length}>Mangas</SectionTitle>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3.5 sm:grid-cols-4 md:grid-cols-5"><PosterSkeleton n={6} /></div>
      ) : !data?.length ? (
        <EmptyState icon={BookOpen} title="Aún no hay mangas" text="Los mangas agregados aparecerán aquí." />
      ) : (
        <div className="grid grid-cols-3 gap-x-3.5 gap-y-5 sm:grid-cols-4 md:grid-cols-5">
          {data.map((m) => (
            <Link key={m.id} to="/manga/$id" params={{ id: m.mangadex_id }} className="press block">
              <Cover src={m.cover_url} alt={m.title} className="aspect-[2/3] w-full rounded-xl" />
              <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-tight">{m.title}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
