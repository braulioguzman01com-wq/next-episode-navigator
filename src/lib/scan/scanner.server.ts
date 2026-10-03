import { fetchWithPolicy, SourceError } from "@/lib/sync/http.server";

export type ScanChapter = { number: number; lang: string; title: string | null; page_url: string | null; play_url: string | null; video_type: string | null };
export type ChapterCheck = { season: number | null; page_ok: boolean | null; embed: "ok" | "none" | "unchecked" };
export type ScanChecks = { url_ok: boolean; title_source: string; cover_ok: boolean | null; numbers_ok: boolean; same_content: boolean; pages: number; rendered: boolean };
export type ScanContent = { stable_key: string; title: string; description: string | null; cover_url: string | null; page_url: string | null; chapters: ScanChapter[]; kind: "sub" | "dub" | "ambos" | "No confirmado"; seasons: number[]; checks: ScanChecks; chapter_checks: Record<string, ChapterCheck> };
export type ScanResult = { contents: ScanContent[]; strategy: string; errors: { code: string; message: string; url: string }[]; ms: number };

const MAX_CONTENTS = 30;
const MAX_CHAPTER_PAGES = 40;

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ").trim();

const attr = (tag: string, name: string) => {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return m ? decode(m[1] ?? m[2] ?? m[3] ?? "") : null;
};

function abs(u: string | null | undefined, base: string): string | null {
  if (!u || /^(javascript:|mailto:|#|data:)/i.test(u)) return null;
  try { return new URL(u, base).toString(); } catch { return null; }
}

function meta(html: string, keys: string[]): string | null {
  for (const tag of html.match(/<meta\s[^>]*>/gi) ?? []) {
    const k = (attr(tag, "property") ?? attr(tag, "name") ?? "").toLowerCase();
    if (keys.includes(k)) { const c = attr(tag, "content"); if (c) return c; }
  }
  return null;
}

function imgOf(block: string, base: string): string | null {
  for (const tag of block.match(/<(img|source)\s[^>]*>/gi) ?? []) {
    for (const k of ["data-src", "data-lazy-src", "data-original", "src"]) {
      const v = attr(tag, k);
      if (v && !v.startsWith("data:")) return abs(v, base);
    }
    const ss = attr(tag, "srcset") ?? attr(tag, "data-srcset");
    if (ss) return abs(ss.split(",").pop()!.trim().split(/\s+/)[0], base);
  }
  const bg = /background-image:\s*url\(['"]?([^'")]+)/i.exec(block)?.[1];
  return abs(bg, base);
}

const CH_RE = /(?:cap[ií]tulo|cap\.?|episodio|episode|ep\.?|e)\s*[-#:]?\s*(\d{1,4}(?:\.\d)?)/i;
const URL_CH_RE = /(?:capitulo|episodio|episode|ep|cap|chapter)[-_/]?(\d{1,4})(?:[/?#.-]|$)/i;

export function chapterNumber(text: string, href: string): number | null {
  const t = CH_RE.exec(text)?.[1] ?? URL_CH_RE.exec(href)?.[1] ?? (/^\s*(\d{1,4})\s*$/.exec(text)?.[1] ?? null);
  const n = t ? Number(t) : NaN;
  return Number.isFinite(n) && n >= 0 && n < 10000 ? n : null;
}

function langOf(s: string): string {
  const x = s.toLowerCase();
  if (/\b(latino|lat)\b/.test(x)) return "es-419";
  if (/\b(castellano|espa[nñ]ol|esp)\b/.test(x)) return "es";
  if (/\b(dub|doblado)\b/.test(x)) return "dub";
  if (/\b(sub|subtitulado)\b/.test(x)) return "sub";
  return "und";
}

export function stableKey(pageUrl: string | null, title: string): string {
  if (pageUrl) { try { const u = new URL(pageUrl); return (u.pathname.replace(/\/+$/, "") || "/").toLowerCase(); } catch { /* fallthrough */ } }
  return "t:" + title.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "");
}

export function detectVideo(html: string, base: string): { url: string; type: string } | null {
  for (const tag of html.match(/<(video|source)\s[^>]*>/gi) ?? []) {
    const s = abs(attr(tag, "src") ?? attr(tag, "data-src"), base);
    if (s) return { url: s, type: /\.m3u8/i.test(s) ? "hls" : /\.webm/i.test(s) ? "webm" : "mp4" };
  }
  for (const v of fromJsonLdVideo(html, base)) return v;
  {
  }
  const direct = /["'](https?:\/\/[^"'\s]+?\.(m3u8|mp4|webm)(?:\?[^"'\s]*)?)["']/i.exec(html);
  if (direct?.[1] && direct[2]) return { url: direct[1], type: direct[2].toLowerCase() === "m3u8" ? "hls" : direct[2].toLowerCase() };
  for (const tag of html.match(/<iframe\s[^>]*>/gi) ?? []) {
    const s = abs(attr(tag, "src") ?? attr(tag, "data-src"), base);
    if (!s) continue;
    if (/youtube\.com|youtu\.be/.test(s)) return { url: s, type: "youtube" };
    if (/vimeo\.com/.test(s)) return { url: s, type: "vimeo" };
    return { url: s, type: "iframe" };
  }
  const ogv = meta(html, ["og:video", "og:video:url", "og:video:secure_url", "twitter:player"]);
  return ogv ? { url: abs(ogv, base)!, type: /\.m3u8/.test(ogv) ? "hls" : /youtu/.test(ogv) ? "youtube" : "iframe" } : null;
}

/** Optional server-side JS rendering via Firecrawl (only if the connector is linked). */
async function renderJs(url: string): Promise<string | null> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) return null;
  const gw = key.startsWith("lovc_");
  const lk = process.env["LOVABLE_API_KEY"];
  if (gw && !lk) return null;
  try {
    const res = await fetch(gw ? "https://connector-gateway.lovable.dev/firecrawl/v2/scrape" : "https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(gw ? { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": key } : { Authorization: `Bearer ${key}` }) },
      body: JSON.stringify({ url, formats: ["rawHtml"], onlyMainContent: false, waitFor: 1500 }),
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    return j.rawHtml ?? j.data?.rawHtml ?? null;
  } catch { return null; }
}

function fromJsonLdVideo(html: string, base: string): { url: string; type: string }[] {
  const out: { url: string; type: string }[] = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (o: any): void => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) return o.forEach(walk); if (/VideoObject/.test(String(o["@type"]))) { const u = abs(o.embedUrl ?? o.contentUrl, base); if (u) out.push({ url: u, type: /\.m3u8/.test(u) ? "hls" : /\.(mp4|webm)/.test(u) ? "mp4" : /youtu/.test(u) ? "youtube" : "iframe" }); } if (o["@graph"]) walk(o["@graph"]); };
      walk(JSON.parse(m[1] ?? ""));
    } catch { /* ignore */ }
  }
  return out;
}

const PAGE_RE = /[?&](?:page|p|pagina|pg)=(\d{1,3})\b|\/(?:page|pagina|p)\/(\d{1,3})\/?$/i;
const MAX_PAGES = 30;
/** Finds pagination links ("1 2 3 … 25") on the same path family. */
function paginationUrls(html: string, base: string): string[] {
  const host = new URL(base).host;
  const nums = new Map<number, string>();
  let tpl: string | null = null;
  for (const m of html.matchAll(/<a\s([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = abs(attr("<a " + (m[1] ?? ""), "href"), base);
    if (!href) continue;
    try { if (new URL(href).host !== host) continue; } catch { continue; }
    const pm = PAGE_RE.exec(href);
    const n = Number(pm?.[1] ?? pm?.[2]);
    if (!pm || !Number.isFinite(n) || n < 2) continue;
    nums.set(n, href); tpl ??= href;
  }
  if (!nums.size || !tpl) return [];
  const max = Math.min(Math.max(...nums.keys()), MAX_PAGES);
  const out: string[] = [];
  for (let n = 2; n <= max; n++) out.push(nums.get(n) ?? tpl.replace(PAGE_RE, (x) => x.replace(/\d{1,3}/, String(n))));
  return [...new Set(out)];
}

function seasonOf(s: string): number | null {
  const m = /(?:temporada|season|\bs)\s*[-_]?\s*(\d{1,2})\b/i.exec(s);
  return m ? Number(m[1]) : null;
}

async function getText(url: string, errors: ScanResult["errors"]): Promise<string | null> {
  try {
    const res = await fetchWithPolicy(url, { retries: 1, timeoutMs: 10000, init: { headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es,en;q=0.8" } } });
    const t = await res.text();
    if (!t || t.trim().length < 50) throw new SourceError("EMPTY", "Respuesta vacía");
    if (/cf-challenge|cf_chl_|captcha/i.test(t) && t.length < 20000) throw new SourceError("BLOCKED", "Protegido por verificación anti-bots (no se intenta evadir)");
    return t;
  } catch (e) {
    const err = e as SourceError;
    errors.push({ code: err.code ?? "ERROR", message: err.message, url });
    return null;
  }
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k] as T); } }));
  return out;
}

type Card = { title: string; page_url: string | null; cover_url: string | null; description: string | null };

function fromJsonLd(html: string, base: string): Card[] {
  const out: Card[] = [];
  const walk = (o: any) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    const t = [].concat(o["@type"] ?? []).join(",");
    if (/TVSeries|Movie|CreativeWorkSeries|VideoObject|Book/.test(t) && o.name)
      out.push({ title: String(o.name), page_url: abs(o.url, base), cover_url: abs(typeof o.image === "string" ? o.image : o.image?.url ?? o.thumbnailUrl, base), description: o.description ? decode(String(o.description)) : null });
    if (o.itemListElement) walk([].concat(o.itemListElement).map((x: any) => x.item ?? x));
    if (o["@graph"]) walk(o["@graph"]);
  };
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) { try { walk(JSON.parse(m[1] ?? "")); } catch { /* JSON inválido: ignorar */ } }
  return out;
}

function fromCards(html: string, base: string): Card[] {
  const host = new URL(base).host;
  const body = html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, "").replace(/<(header|footer|nav)[\s>][\s\S]*?<\/\1>/gi, "");
  const re = /<(article|li|div)\s[^>]*class\s*=\s*["'][^"']*\b(item|card|post|video|content|serie|anime|entry|grid|thumb)[\w-]*[^"']*["'][^>]*>/gi;
  const starts = [...body.matchAll(re)].map((m) => m.index!);
  const cards: Card[] = [];
  const blocks = starts.length ? starts.map((s, i) => body.slice(s, Math.min(starts[i + 1] ?? body.length, s + 4000))) : (body.match(/<a\s[^>]*>[\s\S]*?<\/a>/gi) ?? []);
  for (const b of blocks) {
    const a = /<a\s[^>]*>/i.exec(b)?.[0];
    const href = a ? abs(attr(a, "href"), base) : null;
    if (!href) continue;
    try { if (new URL(href).host !== host) continue; } catch { continue; }
    const img = imgOf(b, base);
    const h = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(b)?.[1];
    const title = decode(h ?? "") || attr(a!, "title") || attr(/<img\s[^>]*>/i.exec(b)?.[0] ?? "", "alt") || decode(b).slice(0, 80);
    if (!img || !title || title.length < 2) continue;
    const p = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(b)?.[1];
    cards.push({ title, page_url: href, cover_url: img, description: p ? decode(p).slice(0, 600) || null : null });
  }
  // Keep the dominant URL pattern (repeated structure) to drop stray promos.
  const pat = (u: string | null) => (u ? new URL(u).pathname.split("/").filter(Boolean).slice(0, -1).join("/") : "");
  const counts = new Map<string, number>();
  cards.forEach((c) => counts.set(pat(c.page_url), (counts.get(pat(c.page_url)) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const kept = top && top[1] >= 2 ? cards.filter((c) => pat(c.page_url) === top[0]) : cards;
  const seen = new Set<string>();
  return kept.filter((c) => !seen.has(c.page_url!) && seen.add(c.page_url!));
}

async function fromFeed(html: string, base: string, errors: ScanResult["errors"]): Promise<Card[]> {
  const tag = (html.match(/<link\s[^>]*>/gi) ?? []).find((t) => /application\/(rss|atom)\+xml/i.test(t));
  const href = tag ? abs(attr(tag, "href"), base) : null;
  if (!href) return [];
  const xml = await getText(href, errors);
  if (!xml || !/<(rss|feed)[\s>]/i.test(xml)) return [];
  return (xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? []).map((b) => {
    const link = /<link[^>]*href="([^"]+)"/i.exec(b)?.[1] ?? decode(/<link[^>]*>([\s\S]*?)<\/link>/i.exec(b)?.[1] ?? "");
    const img = /<(?:media:thumbnail|media:content|enclosure)[^>]*url="([^"]+)"/i.exec(b)?.[1] ?? imgOf(decode(/<description>([\s\S]*?)<\/description>/i.exec(b)?.[1] ?? "").length ? b.replace(/&lt;/g, "<").replace(/&gt;/g, ">") : b, base);
    return { title: decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(b)?.[1] ?? ""), page_url: abs(link, base), cover_url: abs(img, base), description: decode(/<(description|summary)[^>]*>([\s\S]*?)<\/\1>/i.exec(b)?.[2] ?? "").slice(0, 600) || null };
  }).filter((c) => c.title && c.page_url);
}

function chaptersIn(html: string, base: string, contentUrl: string | null): ScanChapter[] {
  const host = new URL(base).host;
  const map = new Map<string, ScanChapter>();
  for (const m of html.matchAll(/<a\s([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = abs(attr("<a " + (m[1] ?? ""), "href"), base);
    if (!href || href === contentUrl) continue;
    const isMedia = /\.(m3u8|mp4|webm)(\?|$)/i.test(href);
    try { if (!isMedia && new URL(href).host !== host) continue; } catch { continue; }
    const text = decode(m[2] ?? "") || attr("<a " + (m[1] ?? ""), "title") || "";
    const n = chapterNumber(text, href);
    if (n === null || (!CH_RE.test(text) && !URL_CH_RE.test(href) && !isMedia)) continue;
    const lang = langOf(text + " " + href);
    const key = `${n}|${lang}`;
    if (!map.has(key)) map.set(key, { number: n, lang, title: text.slice(0, 160) || null, page_url: isMedia ? null : href, play_url: isMedia ? href : null, video_type: isMedia ? (/\.m3u8/i.test(href) ? "hls" : "mp4") : null });
  }
  return [...map.values()].sort((a, b) => a.number - b.number);
}

/** Full discovery: listing → contents → metadata → chapters → playback. Never throws on source errors. */
export async function scanSite(url: string, opts: { deep?: boolean } = {}): Promise<ScanResult> {
  const started = Date.now();
  const errors: ScanResult["errors"] = [];
  const html = await getText(url, errors);
  if (!html) return { contents: [], strategy: "none", errors, ms: Date.now() - started };

  let strategy = "json-ld";
  let cards = fromJsonLd(html, url).filter((c) => c.page_url && c.page_url !== url);
  if (cards.length < 2) { const c = fromCards(html, url); if (c.length >= cards.length) { cards = c; strategy = "estructura repetida"; } }
  if (cards.length < 2) { const f = await fromFeed(html, url, errors); if (f.length > cards.length) { cards = f; strategy = "rss/atom"; } }
  const selfChapters = chaptersIn(html, url, url);
  if (cards.length < 2 && selfChapters.length) {
    cards = [{ title: meta(html, ["og:title", "twitter:title"]) ?? decode(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? url), page_url: url, cover_url: abs(meta(html, ["og:image", "twitter:image"]), url), description: meta(html, ["og:description", "description", "twitter:description"]) }];
    strategy = "página individual";
  }
  cards = cards.slice(0, MAX_CONTENTS);

  const contents = await pool(cards, 4, async (c): Promise<ScanContent> => {
    let chapters: ScanChapter[] = [];
    let { title, description, cover_url } = c;
    let page = c.page_url === url ? html : c.page_url ? await getText(c.page_url, errors) : null;
    let pages = page ? 1 : 0, rendered = false, titleSource = "listado";
    const urlOk = !!page;
    if (page && c.page_url) {
      // Priority: JSON-LD > Open Graph/meta > visible HTML.
      const ld = fromJsonLd(page, c.page_url).find((x) => x.page_url === null || x.page_url === c.page_url) ?? fromJsonLd(page, c.page_url)[0];
      const og = meta(page, ["og:title"])?.replace(/\s*[|–-]\s*[^|–-]+$/, "");
      const h1 = decode(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(page)?.[1] ?? "");
      title = ld?.title || og || h1 || title;
      titleSource = ld?.title ? "JSON-LD" : og ? "Open Graph" : h1 ? "HTML visible" : "listado";
      description = ld?.description || meta(page, ["og:description", "description", "twitter:description"]) || description;
      cover_url = ld?.cover_url || abs(meta(page, ["og:image", "twitter:image"]), c.page_url) || cover_url;
      chapters = chaptersIn(page, c.page_url, c.page_url);
      if (!chapters.length) {
        const r = await renderJs(c.page_url);
        if (r) { rendered = true; page = r; chapters = chaptersIn(r, c.page_url, c.page_url); }
      }
      for (const pu of paginationUrls(page, c.page_url)) {
        const p = await getText(pu, errors);
        if (!p) continue;
        pages++;
        const seen = new Set(chapters.map((x) => `${x.number}|${x.lang}`));
        for (const ch of chaptersIn(p, pu, c.page_url)) if (!seen.has(`${ch.number}|${ch.lang}`)) chapters.push(ch);
      }
      chapters.sort((a, b) => a.number - b.number);
      if (!chapters.length) { const v = detectVideo(page, c.page_url); if (v) chapters = [{ number: 1, lang: "und", title, page_url: c.page_url, play_url: v.url, video_type: v.type }]; }
    }
    const cc: Record<string, ChapterCheck> = {};
    for (const ch of chapters) cc[`${ch.number}|${ch.lang}`] = { season: seasonOf(`${ch.title ?? ""} ${ch.page_url ?? ""}`), page_ok: null, embed: ch.play_url ? "ok" : "unchecked" };
    if (opts.deep !== false) {
      const need = chapters.filter((ch) => !ch.play_url && ch.page_url).slice(0, MAX_CHAPTER_PAGES);
      await pool(need, 4, async (ch) => {
        const p = await getText(ch.page_url!, errors);
        const v = p ? detectVideo(p, ch.page_url!) : null;
        const k = cc[`${ch.number}|${ch.lang}`]!;
        k.page_ok = !!p; k.embed = v ? "ok" : "none";
        if (v) { ch.play_url = v.url; ch.video_type = v.type; }
      });
    }
    // Drop chapters that clearly belong to another series (different slug family).
    const slug = c.page_url ? new URL(c.page_url).pathname.split("/").filter(Boolean).pop() ?? "" : "";
    const sameContent = !slug || chapters.every((ch) => !ch.page_url || ch.page_url.includes(slug.slice(0, Math.max(4, Math.floor(slug.length / 2)))) || ch.page_url.startsWith(c.page_url!));
    const langs = new Set(chapters.map((x) => x.lang));
    const hasDub = [...langs].some((l) => l === "dub" || l === "es-419" || l === "es");
    const hasSub = langs.has("sub") || (langs.has("und") && /sub/i.test(page ?? ""));
    const kind = hasDub && hasSub ? "ambos" : hasDub ? "dub" : hasSub ? "sub" : "No confirmado";
    const seasons = [...new Set(Object.values(cc).map((x) => x.season).filter((x): x is number => x !== null))].sort((a, b) => a - b);
    const nums = chapters.map((x) => x.number);
    const checks: ScanChecks = { url_ok: urlOk, title_source: titleSource, cover_ok: cover_url ? !/logo|favicon|placeholder|default/i.test(cover_url) : null, numbers_ok: nums.every((n) => n >= 0 && n < 5000), same_content: sameContent, pages, rendered };
    return { stable_key: stableKey(c.page_url, title), title: title.slice(0, 300), description: description?.slice(0, 2000) ?? null, cover_url, page_url: c.page_url, chapters, kind, seasons, checks, chapter_checks: cc };
  });
  return { contents, strategy, errors, ms: Date.now() - started };
}

/** Incremental, non-destructive persistence. Never deletes; fills only non-null fields. */
export async function persistScan(db: any, siteId: string, r: ScanResult) {
  const now = new Date().toISOString();
  let newContents = 0, newChapters = 0, updatedChapters = 0;
  const { data: existing } = await db.from("site_contents").select("id, stable_key, title, description, cover_url, page_url").eq("site_id", siteId);
  const byKey = new Map<string, any>((existing ?? []).map((e: any) => [e.stable_key, e]));
  for (const c of r.contents) {
    let row = byKey.get(c.stable_key);
    if (!row) {
      const { data, error } = await db.from("site_contents").insert({ site_id: siteId, stable_key: c.stable_key, title: c.title, description: c.description, cover_url: c.cover_url, page_url: c.page_url }).select("id").single();
      if (error) continue;
      row = data; newContents++;
    } else {
      const patch: any = { missing_since: null, updated_at: now };
      for (const k of ["title", "description", "cover_url", "page_url"] as const) if (c[k] && c[k] !== row[k]) patch[k] = c[k];
      await db.from("site_contents").update(patch).eq("id", row.id);
    }
    byKey.delete(c.stable_key);
    const { data: chs } = await db.from("site_chapters").select("id, number, lang, page_url, play_url, video_type, title").eq("content_id", row.id);
    const chMap = new Map<string, any>((chs ?? []).map((x: any) => [`${Number(x.number)}|${x.lang}`, x]));
    const inserts: any[] = [];
    for (const ch of c.chapters) {
      const ex = chMap.get(`${ch.number}|${ch.lang}`);
      if (!ex) { inserts.push({ content_id: row.id, ...ch }); continue; }
      const patch: any = {};
      for (const k of ["page_url", "play_url", "video_type", "title"] as const) if (ch[k] && ch[k] !== ex[k]) patch[k] = ch[k];
      if (Object.keys(patch).length) { await db.from("site_chapters").update({ ...patch, updated_at: now }).eq("id", ex.id); updatedChapters++; }
    }
    if (inserts.length) { const { error } = await db.from("site_chapters").insert(inserts); if (!error) newChapters += inserts.length; }
  }
  // Contents not seen this time are only flagged, never removed — and only when the scan itself succeeded.
  if (r.contents.length) {
    const gone = [...byKey.values()].map((x: any) => x.id);
    if (gone.length) await db.from("site_contents").update({ missing_since: now }).in("id", gone).is("missing_since", null);
  }
  return { newContents, newChapters, updatedChapters };
}

export async function runSiteScan(db: any, siteId: string) {
  const { data: site } = await db.from("scan_sites").select("*").eq("id", siteId).single();
  if (!site) throw new Error("Fuente no encontrada");
  if (site.scanning_until && new Date(site.scanning_until) > new Date()) return { skipped: true };
  await db.from("scan_sites").update({ scanning_until: new Date(Date.now() + 5 * 60e3).toISOString(), status: "scanning" }).eq("id", siteId);
  try {
    const r = await scanSite(site.url);
    if (r.errors.length) await db.from("scan_errors").insert(r.errors.slice(0, 50).map((e) => ({ site_id: siteId, ...e })));
    const p = r.contents.length ? await persistScan(db, siteId, r) : { newContents: 0, newChapters: 0, updatedChapters: 0 };
    const { count: cc } = await db.from("site_contents").select("id", { count: "exact", head: true }).eq("site_id", siteId);
    const { data: ids } = await db.from("site_contents").select("id").eq("site_id", siteId);
    const { count: chc } = await db.from("site_chapters").select("id", { count: "exact", head: true }).in("content_id", (ids ?? []).map((x: any) => x.id).concat(["00000000-0000-0000-0000-000000000000"]));
    const ok = r.contents.length > 0;
    await db.from("scan_sites").update({
      status: ok ? (r.errors.length ? "partial" : "ok") : "error",
      last_scan_at: new Date().toISOString(),
      last_error: ok ? (r.errors[0] ? `${r.errors.length} avisos: ${r.errors[0].message}` : null) : (r.errors[0]?.message ?? "No se detectaron contenidos"),
      last_contents: cc ?? 0, last_chapters: chc ?? 0, scanning_until: null,
    }).eq("id", siteId);
    return { skipped: false, found: r.contents.length, strategy: r.strategy, errors: r.errors.length, ...p };
  } catch (e) {
    await db.from("scan_sites").update({ status: "error", last_error: (e as Error).message, scanning_until: null }).eq("id", siteId);
    await db.from("scan_errors").insert({ site_id: siteId, code: "ENGINE", message: (e as Error).message, url: site.url });
    return { skipped: false, found: 0, errors: 1, newContents: 0, newChapters: 0, updatedChapters: 0 };
  }
}

export async function runAllSiteScans(db: any) {
  const { data } = await db.from("scan_sites").select("id").eq("active", true);
  const out = [];
  for (const s of data ?? []) out.push({ id: s.id, ...(await runSiteScan(db, s.id)) });
  return out;
}
