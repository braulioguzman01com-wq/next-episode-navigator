import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Public read-only queries (RLS: visible rows only). Columns kept narrow for list views.
const CARD = "id,title,title_english,cover_url,color,next_airing_at,next_episode,status,latest_episode,latest_episode_at,episodes,year,season,genres";
export type CardAnime = {
  id: string; title: string; title_english: string | null; cover_url: string | null; color: string | null;
  next_airing_at: string | null; next_episode: number | null; status: string | null; latest_episode: number | null;
  latest_episode_at: string | null; episodes: number | null; year: number | null; season: string | null; genres: string[];
};

export type Filters = { q?: string | undefined; year?: number | undefined; season?: string | undefined; genre?: string | undefined; status?: string | undefined };

function applyFilters<T extends { ilike: any; eq: any; contains: any }>(q: T, f: Filters): T {
  let r: any = q;
  if (f.q && f.q.trim().length >= 2) r = r.ilike("search_text", `%${f.q.trim().toLowerCase().replace(/[%_]/g, "")}%`);
  if (f.year) r = r.eq("year", f.year);
  if (f.season) r = r.eq("season", f.season);
  if (f.status) r = r.eq("status", f.status);
  if (f.genre) r = r.contains("genres", [f.genre]);
  return r;
}

export const upcomingQuery = (f: Filters) =>
  queryOptions({
    queryKey: ["upcoming", f],
    queryFn: async () => {
      const q = supabase.from("animes").select(CARD).gte("next_airing_at", new Date(Date.now() - 3 * 3600e3).toISOString()).order("next_airing_at").limit(250);
      const { data, error } = await applyFilters(q, f);
      if (error) throw error;
      return data as CardAnime[];
    },
    staleTime: 5 * 60e3,
  });

export const latestEpisodesQuery = (f: Filters, page = 0) =>
  queryOptions({
    queryKey: ["latest", f, page],
    queryFn: async () => {
      const q = supabase.from("animes").select(CARD, { count: "exact" }).not("latest_episode", "is", null).order("latest_episode_at", { ascending: false }).range(page * 30, page * 30 + 29);
      const { data, error, count } = await applyFilters(q, f);
      if (error) throw error;
      return { rows: data as CardAnime[], count: count ?? 0 };
    },
    staleTime: 5 * 60e3,
  });

export const recentlyUpdatedQuery = () =>
  queryOptions({
    queryKey: ["updated"],
    queryFn: async () => {
      const { data, error } = await supabase.from("animes").select(CARD).order("updated_at", { ascending: false }).limit(15);
      if (error) throw error;
      return data as CardAnime[];
    },
    staleTime: 5 * 60e3,
  });

export const allAnimesQuery = (f: Filters, page: number) =>
  queryOptions({
    queryKey: ["all", f, page],
    queryFn: async () => {
      const q = supabase.from("animes").select(CARD, { count: "exact" }).order("title").range(page * 40, page * 40 + 39);
      const { data, error, count } = await applyFilters(q, f);
      if (error) throw error;
      return { rows: data as CardAnime[], count: count ?? 0 };
    },
    staleTime: 5 * 60e3,
  });

export const animeQuery = (id: string) =>
  queryOptions({
    queryKey: ["anime", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("animes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60e3,
  });

export const episodesQuery = (id: string) =>
  queryOptions({
    queryKey: ["episodes", id],
    queryFn: async () => {
      const [eps, links] = await Promise.all([
        supabase.from("episodes").select("id,number,title,aired_at,status").eq("anime_id", id).order("number", { ascending: false }).limit(500),
        supabase.from("watch_links").select("id,url,label,episode_id,source:sources(id,name,trust,priority,status)").eq("anime_id", id).limit(500),
      ]);
      if (eps.error) throw eps.error;
      if (links.error) throw links.error;
      return { episodes: eps.data, links: links.data as any[] };
    },
    staleTime: 5 * 60e3,
  });

export const statusQuery = () =>
  queryOptions({
    queryKey: ["sys-status"],
    queryFn: async () => {
      const [run, sources] = await Promise.all([
        supabase.from("sync_runs").select("id,status,finished_at,started_at").neq("status", "running").order("id", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("sources").select("id,name,kind,status").in("kind", ["info", "news"]).order("priority"),
      ]);
      return { lastRun: run.data, sources: sources.data ?? [] };
    },
    staleTime: 60e3,
  });

export const genresQuery = () =>
  queryOptions({
    queryKey: ["genres"],
    queryFn: async () => {
      const { data } = await supabase.from("animes").select("genres").limit(1000);
      return [...new Set((data ?? []).flatMap((r) => r.genres))].sort();
    },
    staleTime: 30 * 60e3,
  });
