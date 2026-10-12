import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const API = "https://api.mangadex.org";

type Rel = { id: string; type: string; attributes?: Record<string, any> };
type MdManga = { id: string; attributes: Record<string, any>; relationships: Rel[] };

export type MangaCard = { id: string; title: string; cover: string | null; year: number | null; status: string | null; lastVolume: string | null; lastChapter: string | null; description: string | null };
export type ChapterItem = { id: string; chapter: string | null; volume: string | null; title: string | null; pages: number; lang: string; group: string | null; publishAt: string | null };

async function md<T>(path: string): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(API + path, { signal: ctrl.signal, headers: { "User-Agent": "MangaReaderApp/1.0", Accept: "application/json" } });
      if (res.status === 429 && attempt === 0) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      if (!res.ok) throw new Error(`MangaDex respondió ${res.status}`);
      return (await res.json()) as T;
    } catch (e) {
      if (attempt === 1) throw e instanceof Error && e.name === "AbortError" ? new Error("MangaDex no respondió a tiempo") : e;
    } finally { clearTimeout(t); }
  }
  throw new Error("MangaDex no disponible");
}

const pick = (o: Record<string, string> | undefined) => (o ? o.es ?? o["es-la"] ?? o["es-419"] ?? o.en ?? o["ja-ro"] ?? Object.values(o)[0] ?? null : null);

function toCard(m: MdManga): MangaCard {
  const a = m.attributes;
  const alt = (a.altTitles as Record<string, string>[] | undefined)?.find((t) => t.es || t["es-la"]);
  const cov = m.relationships.find((r) => r.type === "cover_art")?.attributes?.fileName;
  return {
    id: m.id,
    title: (alt && (alt.es ?? alt["es-la"])) || pick(a.title) || "Sin título",
    cover: cov ? `/api/public/mdimg?u=${encodeURIComponent(`https://uploads.mangadex.org/covers/${m.id}/${cov}.512.jpg`)}` : null,
    year: a.year ?? null,
    status: a.status ?? null,
    lastVolume: a.lastVolume || null,
    lastChapter: a.lastChapter || null,
    description: pick(a.description),
  };
}

const LANGS = "translatedLanguage[]=es&translatedLanguage[]=es-la";

export const searchManga = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ q: z.string().trim().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const r = await md<{ data: MdManga[] }>(`/manga?title=${encodeURIComponent(data.q)}&limit=20&contentRating[]=safe&contentRating[]=suggestive&includes[]=cover_art&availableTranslatedLanguage[]=es&availableTranslatedLanguage[]=es-la`);
    return r.data.map(toCard);
  });

export const getManga = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => toCard((await md<{ data: MdManga }>(`/manga/${data.id}?includes[]=cover_art`)).data));

export const getFeed = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), offset: z.number().int().min(0).default(0) }).parse(d))
  .handler(async ({ data }) => {
    const r = await md<{ data: MdManga[]; total: number }>(`/manga/${data.id}/feed?${LANGS}&order[chapter]=desc&limit=100&offset=${data.offset}&includes[]=scanlation_group&contentRating[]=safe&contentRating[]=suggestive`);
    const items: ChapterItem[] = r.data
      .filter((c) => !c.attributes.externalUrl && c.attributes.pages > 0)
      .map((c) => ({
        id: c.id, chapter: c.attributes.chapter ?? null, volume: c.attributes.volume ?? null, title: c.attributes.title || null,
        pages: c.attributes.pages, lang: c.attributes.translatedLanguage, publishAt: c.attributes.publishAt ?? null,
        group: c.relationships.find((x) => x.type === "scanlation_group")?.attributes?.name ?? null,
      }));
    return { items, total: r.total, next: data.offset + 100 < r.total ? data.offset + 100 : null };
  });

export const getChapterPages = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ chapterId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const r = await md<{ baseUrl: string; chapter: { hash: string; data: string[]; dataSaver: string[] } }>(`/at-home/server/${data.chapterId}`);
    return {
      data: r.chapter.data.map((f) => `${r.baseUrl}/data/${r.chapter.hash}/${f}`),
      saver: r.chapter.dataSaver.map((f) => `${r.baseUrl}/data-saver/${r.chapter.hash}/${f}`),
    };
  });

export const pingMangaDex = createServerFn({ method: "GET" }).handler(async () => {
  try { await md(`/manga?limit=1`); return { ok: true, at: new Date().toISOString() }; }
  catch { return { ok: false, at: new Date().toISOString() }; }
});
