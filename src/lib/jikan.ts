import { queryOptions } from "@tanstack/react-query";

// Cliente Jikan con cola: respeta 3 req/s y 60 req/min (usamos 1 petición cada 1.1 s como máximo).
const BASE = "https://api.jikan.moe/v4";
let last = 0;
let chain: Promise<unknown> = Promise.resolve();

async function jget<T>(path: string, attempt = 0): Promise<T> {
  const run = async () => {
    const wait = Math.max(0, last + 1100 - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    return fetch(BASE + path);
  };
  const p = chain.then(run, run);
  chain = p.catch(() => undefined);
  const res = await p;
  if ((res.status === 429 || res.status >= 500) && attempt < 2) {
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    return jget<T>(path, attempt + 1);
  }
  if (!res.ok) throw new Error(res.status === 429 ? "Demasiadas peticiones, espera un momento." : `El catálogo no respondió (${res.status}).`);
  return res.json() as Promise<T>;
}

export type JAnime = {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  synopsis: string | null;
  year: number | null;
  episodes: number | null;
  score: number | null;
  status: string | null;
  genres: { mal_id: number; name: string }[];
  images: { jpg: { image_url: string; large_image_url?: string } };
  trailer?: { youtube_id: string | null } | null;
};
export type JEpisode = { mal_id: number; title: string | null; aired: string | null };

export const STATUS_ES: Record<string, string> = {
  "Currently Airing": "En emisión",
  "Finished Airing": "Finalizado",
  "Not yet aired": "Próximamente",
};

const H = 30 * 60e3;

export const jikanSearch = (q: string, genre?: number, year?: number) =>
  queryOptions({
    queryKey: ["jikan-search", q, genre, year],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: "20", sfw: "true" });
      if (q) p.set("q", q);
      if (genre) p.set("genres", String(genre));
      if (year) { p.set("start_date", `${year}-01-01`); p.set("end_date", `${year}-12-31`); }
      if (!q) p.set("order_by", "popularity");
      return (await jget<{ data: JAnime[] }>(`/anime?${p}`)).data;
    },
    staleTime: H,
    gcTime: H,
  });

export const jikanTop = () =>
  queryOptions({ queryKey: ["jikan-top"], queryFn: async () => (await jget<{ data: JAnime[] }>("/top/anime?filter=airing&limit=20")).data, staleTime: H, gcTime: H });

export const jikanGenres = () =>
  queryOptions({ queryKey: ["jikan-genres"], queryFn: async () => (await jget<{ data: { mal_id: number; name: string }[] }>("/genres/anime")).data, staleTime: 24 * H });

export const jikanAnime = (id: number) =>
  queryOptions({ queryKey: ["jikan-anime", id], queryFn: async () => (await jget<{ data: JAnime }>(`/anime/${id}/full`)).data, staleTime: H });

export const jikanEpisodes = (id: number) =>
  queryOptions({ queryKey: ["jikan-eps", id], queryFn: async () => (await jget<{ data: JEpisode[] }>(`/anime/${id}/episodes`)).data, staleTime: H });
