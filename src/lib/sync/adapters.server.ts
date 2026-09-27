import { fetchWithPolicy, SourceError } from "./http.server";

/** Normalized record produced by every info adapter. */
export type NormalizedAnime = {
  anilist_id?: number | null;
  mal_id?: number | null;
  title: string;
  title_english?: string | null;
  title_native?: string | null;
  synonyms: string[];
  synopsis?: string | null;
  genres: string[];
  year?: number | null;
  season?: string | null;
  studio?: string | null;
  status?: string | null;
  episodes?: number | null;
  duration?: number | null;
  cover_url?: string | null;
  banner_url?: string | null;
  color?: string | null;
  start_date?: string | null;
  next_episode?: number | null;
  next_airing_at?: string | null;
  aired: { number: number; aired_at: string | null; title?: string | null }[];
  links: { site: string; url: string; episode?: number | null; label?: string | null }[];
};

export type AdapterResult = { items: NormalizedAnime[]; ms: number };

const ANILIST_QUERY = `query($page:Int,$from:Int,$to:Int){Page(page:$page,perPage:50){pageInfo{hasNextPage}
airingSchedules(airingAt_greater:$from,airingAt_lesser:$to,sort:TIME){episode airingAt media{
id idMal isAdult title{romaji english native} synonyms description(asHtml:false) genres seasonYear season status episodes duration
coverImage{extraLarge large color} bannerImage startDate{year month day} studios(isMain:true){nodes{name}}
nextAiringEpisode{episode airingAt} streamingEpisodes{title url site} externalLinks{site url type}}}}}`;

function stripHtml(s?: string | null) {
  return s ? s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim() : null;
}

export async function anilistAdapter(): Promise<AdapterResult> {
  const started = Date.now();
  const now = Math.floor(Date.now() / 1000);
  const from = now - 7 * 86400;
  const to = now + 35 * 86400;
  const map = new Map<number, NormalizedAnime>();
  for (let page = 1; page <= 8; page++) {
    const res = await fetchWithPolicy("https://graphql.anilist.co", {
      retries: 1,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: ANILIST_QUERY, variables: { page, from, to } }),
      },
    });
    const json = (await res.json()) as any;
    if (json.errors?.length) throw new SourceError("GRAPHQL", json.errors[0]?.message ?? "Error GraphQL");
    const pg = json.data?.Page;
    for (const s of pg?.airingSchedules ?? []) {
      const m = s.media;
      if (!m || m.isAdult) continue;
      let rec = map.get(m.id);
      if (!rec) {
        const sd = m.startDate;
        rec = {
          anilist_id: m.id,
          mal_id: m.idMal ?? null,
          title: m.title?.romaji ?? m.title?.english ?? "Sin título",
          title_english: m.title?.english ?? null,
          title_native: m.title?.native ?? null,
          synonyms: m.synonyms ?? [],
          synopsis: stripHtml(m.description),
          genres: m.genres ?? [],
          year: m.seasonYear ?? sd?.year ?? null,
          season: m.season ?? null,
          studio: m.studios?.nodes?.[0]?.name ?? null,
          status: m.status ?? null,
          episodes: m.episodes ?? null,
          duration: m.duration ?? null,
          cover_url: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
          banner_url: m.bannerImage ?? null,
          color: m.coverImage?.color ?? null,
          start_date: sd?.year ? `${sd.year}-${String(sd.month ?? 1).padStart(2, "0")}-${String(sd.day ?? 1).padStart(2, "0")}` : null,
          next_episode: m.nextAiringEpisode?.episode ?? null,
          next_airing_at: m.nextAiringEpisode ? new Date(m.nextAiringEpisode.airingAt * 1000).toISOString() : null,
          aired: [],
          links: [],
        };
        for (const l of m.externalLinks ?? []) if (l.type === "STREAMING" && l.url) rec.links.push({ site: l.site, url: l.url });
        for (const se of m.streamingEpisodes ?? []) {
          const n = Number(/Episode\s+(\d+)/i.exec(se.title ?? "")?.[1]);
          if (se.url) rec.links.push({ site: se.site, url: se.url, episode: Number.isFinite(n) ? n : null, label: se.title });
        }
        map.set(m.id, rec);
      }
      if (s.airingAt <= now) rec.aired.push({ number: s.episode, aired_at: new Date(s.airingAt * 1000).toISOString() });
    }
    if (!pg?.pageInfo?.hasNextPage) break;
  }
  return { items: [...map.values()], ms: Date.now() - started };
}

const DAYS: Record<string, number> = { sundays: 0, mondays: 1, tuesdays: 2, wednesdays: 3, thursdays: 4, fridays: 5, saturdays: 6 };

/** Next occurrence of a JST weekly broadcast slot, as UTC ISO. */
function nextJst(day?: string, time?: string): string | null {
  if (!day || !time) return null;
  const dow = DAYS[day.toLowerCase()];
  const [hh, mm] = time.split(":").map(Number);
  if (dow === undefined || !Number.isFinite(hh)) return null;
  const nowJst = new Date(Date.now() + 9 * 3600e3);
  const cand = new Date(Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate(), hh, mm || 0));
  let add = (dow - nowJst.getUTCDay() + 7) % 7;
  if (add === 0 && cand.getTime() <= nowJst.getTime()) add = 7;
  return new Date(cand.getTime() + add * 86400e3 - 9 * 3600e3).toISOString();
}

export async function jikanAdapter(): Promise<AdapterResult> {
  const started = Date.now();
  const items: NormalizedAnime[] = [];
  for (let page = 1; page <= 2; page++) {
    const res = await fetchWithPolicy(`https://api.jikan.moe/v4/schedules?sfw=true&page=${page}&limit=25`, { retries: 2, timeoutMs: 10000 });
    const json = (await res.json()) as any;
    for (const a of json.data ?? []) {
      items.push({
        mal_id: a.mal_id,
        title: a.title,
        title_english: a.title_english ?? null,
        title_native: a.title_japanese ?? null,
        synonyms: a.title_synonyms ?? [],
        synopsis: a.synopsis ?? null,
        genres: (a.genres ?? []).map((g: any) => g.name),
        year: a.year ?? null,
        season: a.season ? String(a.season).toUpperCase() : null,
        studio: a.studios?.[0]?.name ?? null,
        status: a.airing ? "RELEASING" : a.status === "Not yet aired" ? "NOT_YET_RELEASED" : "FINISHED",
        episodes: a.episodes ?? null,
        duration: Number(/(\d+)\s*min/.exec(a.duration ?? "")?.[1]) || null,
        cover_url: a.images?.webp?.large_image_url ?? a.images?.jpg?.large_image_url ?? null,
        start_date: a.aired?.from ? String(a.aired.from).slice(0, 10) : null,
        next_airing_at: nextJst(a.broadcast?.day, a.broadcast?.time),
        aired: [],
        links: [],
      });
    }
    if (!json.pagination?.has_next_page) break;
    await new Promise((r) => setTimeout(r, 700)); // respect 3 req/s
  }
  return { items, ms: Date.now() - started };
}

export type NewsItem = { title: string; url: string; published_at: string | null };

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export async function rssAdapter(feedUrl: string): Promise<{ items: NewsItem[]; ms: number }> {
  const started = Date.now();
  const res = await fetchWithPolicy(feedUrl, { retries: 1, timeoutMs: 10000, init: { headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } } });
  const xml = await res.text();
  if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(xml)) throw new SourceError("NOT_FEED", "La URL no devuelve un feed RSS/Atom válido");
  const items: NewsItem[] = [];
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  for (const b of blocks.slice(0, 25)) {
    const title = decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(b)?.[1] ?? "");
    let link = /<link[^>]*href="([^"]+)"/i.exec(b)?.[1] ?? decode(/<link[^>]*>([\s\S]*?)<\/link>/i.exec(b)?.[1] ?? "");
    if (!link) link = decode(/<guid[^>]*>([\s\S]*?)<\/guid>/i.exec(b)?.[1] ?? "");
    const date = decode(/<(pubDate|updated|published|dc:date)[^>]*>([\s\S]*?)<\/\1>/i.exec(b)?.[2] ?? "");
    const d = date ? new Date(date) : null;
    if (title && /^https?:\/\//.test(link)) items.push({ title, url: link, published_at: d && !isNaN(+d) ? d.toISOString() : null });
  }
  return { items, ms: Date.now() - started };
}
