import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { anilistAdapter, jikanAdapter, rssAdapter, type NormalizedAnime } from "./adapters.server";
import { SourceError } from "./http.server";
import { matchKeys, searchText } from "./normalize";

type DB = SupabaseClient<Database>;
type Source = Database["public"]["Tables"]["sources"]["Row"];
type AnimeRow = Database["public"]["Tables"]["animes"]["Row"];

const TRUST_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };
const TRACKED: (keyof AnimeRow)[] = ["status", "start_date", "next_airing_at", "next_episode", "episodes"];
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export type SyncSummary = {
  runId: number;
  status: "success" | "partial" | "failed" | "skipped";
  sources_ok: number;
  sources_failed: number;
  animes_found: number;
  animes_new: number;
  episodes_new: number;
  merged: number;
  changes: number;
};

export async function runSync(db: DB, trigger: "cron" | "manual", onlySourceId?: string): Promise<SyncSummary> {
  const { data: gotLock } = await db.rpc("acquire_sync_lock", { _seconds: 600 });
  if (!gotLock) return { runId: 0, status: "skipped", sources_ok: 0, sources_failed: 0, animes_found: 0, animes_new: 0, episodes_new: 0, merged: 0, changes: 0 };

  const started = Date.now();
  const { data: run } = await db.from("sync_runs").insert({ trigger, stage: "Preparando" }).select("id").single();
  const runId = run!.id;
  const log: { source: string; ok: boolean; ms?: number; items?: number; error?: string }[] = [];
  const stage = (s: string) => db.from("sync_runs").update({ stage: s, log }).eq("id", runId);
  const stats = { ok: 0, failed: 0, found: 0, created: 0, eps: 0, merged: 0, changes: 0 };

  try {
    let q = db.from("sources").select("*").in("status", ["active", "problems", "unavailable"]).in("kind", ["info", "news"]).order("priority");
    if (onlySourceId) q = q.eq("id", onlySourceId);
    const { data: sources = [] } = await q;
    const { data: videoSources = [] } = await db.from("sources").select("*").eq("kind", "video");
    await db.from("sync_runs").update({ sources_total: sources!.length }).eq("id", runId);

    await stage("Consultando fuentes");
    const collected: { src: Source; items: NormalizedAnime[] }[] = [];
    for (const src of sources!.filter((s) => s.kind === "info")) {
      try {
        const r = src.integration_method === "anilist" ? await anilistAdapter() : src.integration_method === "jikan" ? await jikanAdapter() : null;
        if (!r) throw new SourceError("UNSUPPORTED", "Método de integración no soportado para información");
        collected.push({ src, items: r.items });
        await markOk(db, src, r.ms, r.items.length);
        log.push({ source: src.name, ok: true, ms: r.ms, items: r.items.length });
        stats.ok++;
      } catch (e) {
        await markFail(db, src, e);
        log.push({ source: src.name, ok: false, error: (e as Error).message });
        stats.failed++;
      }
    }

    await stage("Procesando feeds");
    for (const src of sources!.filter((s) => s.kind === "news" && s.feed_url)) {
      try {
        const r = await rssAdapter(src.feed_url!);
        if (r.items.length) {
          await db.from("news_items").upsert(r.items.map((i) => ({ ...i, source_id: src.id })), { onConflict: "url", ignoreDuplicates: true });
        }
        await markOk(db, src, r.ms, r.items.length);
        log.push({ source: src.name, ok: true, ms: r.ms, items: r.items.length });
        stats.ok++;
      } catch (e) {
        await markFail(db, src, e);
        log.push({ source: src.name, ok: false, error: (e as Error).message });
        stats.failed++;
      }
    }

    await stage("Analizando títulos");
    // Highest trust first so lower-trust data only fills gaps.
    collected.sort((a, b) => (TRUST_RANK[b.src.trust] ?? 1) - (TRUST_RANK[a.src.trust] ?? 1) || a.src.priority - b.src.priority);
    const videoByName = new Map(videoSources!.map((v) => [v.name.toLowerCase(), v]));

    await stage("Comparando datos");
    const touched = new Map<string, AnimeRow>(); // id -> merged row
    const history: Database["public"]["Tables"]["change_history"]["Insert"][] = [];
    const epPlans: { anime_id: string; number: number; aired_at: string | null; source_id: string }[] = [];
    const linkPlans: { anime_id: string; episode: number | null; site: string; url: string; label: string | null }[] = [];
    const isNew = new Set<string>();

    for (const { src, items } of collected) {
      stats.found += items.length;
      const existing = await loadExisting(db, items, touched);
      for (const it of items) {
        const keys = matchKeys([it.title, it.title_english, it.title_native, ...it.synonyms]);
        const byId = (it.anilist_id && existing.byAnilist.get(it.anilist_id)) || (it.mal_id && existing.byMal.get(it.mal_id)) || undefined;
        const viaKeys = byId ? undefined : findByKeys(existing.byKey, keys, it.year);
        let row: AnimeRow | undefined = byId || viaKeys;
        if (viaKeys || (byId && touched.has(byId.id) && !isNew.has(byId.id) === false && byId.primary_source_id !== src.id)) stats.merged++;
        if (!row) {
          const id = crypto.randomUUID();
          row = {
            id, anilist_id: it.anilist_id ?? null, mal_id: it.mal_id ?? null, title: it.title,
            title_english: it.title_english ?? null, title_native: it.title_native ?? null, synonyms: it.synonyms,
            match_keys: keys, search_text: "", synopsis: it.synopsis ?? null, genres: it.genres, year: it.year ?? null,
            season: it.season ?? null, studio: it.studio ?? null, status: it.status ?? null, episodes: it.episodes ?? null,
            duration: it.duration ?? null, cover_url: it.cover_url ?? null, banner_url: it.banner_url ?? null, color: it.color ?? null,
            start_date: it.start_date ?? null, next_episode: it.next_episode ?? null, next_airing_at: it.next_airing_at ?? null,
            latest_episode: null, latest_episode_at: null, primary_source_id: src.id, hidden: false,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          };
          isNew.add(id);
          stats.created++;
          history.push({ anime_id: id, run_id: runId, source_id: src.id, kind: "new_anime", new_value: it.title });
        } else {
          row = { ...row };
          const primaryTrust = TRUST_RANK[sources!.find((s) => s.id === row!.primary_source_id)?.trust ?? "low"] ?? 1;
          const canOverride = (TRUST_RANK[src.trust] ?? 1) >= primaryTrust || !row.primary_source_id;
          const setField = (field: keyof AnimeRow, value: unknown) => {
            if (value === null || value === undefined || (Array.isArray(value) && !value.length)) return;
            const old = row![field] as unknown;
            const same = JSON.stringify(old) === JSON.stringify(value) ||
              (field === "next_airing_at" && old && Math.abs(+new Date(old as string) - +new Date(value as string)) < 60000);
            if (same) return;
            if (old !== null && old !== undefined && !canOverride) {
              if (TRACKED.includes(field)) history.push({ anime_id: row!.id, run_id: runId, source_id: src.id, kind: "conflict_ignored", field, old_value: String(old), new_value: String(value) });
              return;
            }
            if (TRACKED.includes(field) && old !== null && old !== undefined) {
              history.push({ anime_id: row!.id, run_id: runId, source_id: src.id, kind: field === "start_date" || field === "next_airing_at" ? "date_changed" : "field_changed", field, old_value: String(old), new_value: String(value) });
              stats.changes++;
            }
            (row as any)[field] = value;
          };
          if (!row.anilist_id && it.anilist_id) row.anilist_id = it.anilist_id;
          if (!row.mal_id && it.mal_id) row.mal_id = it.mal_id;
          for (const f of ["title_english", "title_native", "synopsis", "year", "season", "studio", "status", "episodes", "duration", "cover_url", "banner_url", "color", "start_date", "next_episode", "next_airing_at"] as const) setField(f, (it as any)[f]);
          if (!row.genres.length) row.genres = it.genres;
          row.synonyms = [...new Set([...row.synonyms, ...it.synonyms, ...(it.title !== row.title ? [it.title] : [])])];
          row.match_keys = [...new Set([...row.match_keys, ...keys])];
          if (canOverride) row.primary_source_id = src.id;
          row.updated_at = new Date().toISOString();
        }
        row.search_text = searchText([row.title, row.title_english, row.title_native, ...row.synonyms]);
        touched.set(row.id, row);
        existing.register(row);
        for (const e of it.aired) epPlans.push({ anime_id: row.id, number: e.number, aired_at: e.aired_at, source_id: src.id });
        for (const l of it.links) linkPlans.push({ anime_id: row.id, episode: l.episode ?? null, site: l.site, url: l.url, label: l.label ?? null });
      }
    }

    await stage("Detectando episodios");
    const ids = [...touched.keys()];
    const existingEps = new Set<string>();
    for (const c of chunk(ids, 150)) {
      const { data } = await db.from("episodes").select("anime_id,number").in("anime_id", c).limit(10000);
      for (const e of data ?? []) existingEps.add(`${e.anime_id}:${e.number}`);
    }
    const newEps = new Map<string, (typeof epPlans)[number]>();
    for (const e of epPlans) {
      const k = `${e.anime_id}:${e.number}`;
      if (!existingEps.has(k) && !newEps.has(k)) newEps.set(k, e);
    }
    for (const e of newEps.values()) {
      const row = touched.get(e.anime_id)!;
      const prev = row.latest_episode;
      if (!prev || e.number > prev) {
        row.latest_episode = e.number;
        row.latest_episode_at = e.aired_at ?? new Date().toISOString();
        history.push({ anime_id: row.id, run_id: runId, source_id: e.source_id, kind: "new_episode", field: "latest_episode", old_value: prev ? String(prev) : null, new_value: String(e.number) });
      }
    }
    stats.eps = newEps.size;

    await stage("Actualizando base de datos");
    for (const c of chunk([...touched.values()], 100)) {
      const { error } = await db.from("animes").upsert(c, { onConflict: "id" });
      if (error) throw new Error(`Guardar animes: ${error.message}`);
    }
    const epRows = [...newEps.values()].map((e) => ({ anime_id: e.anime_id, number: e.number, aired_at: e.aired_at, status: "available" }));
    const epIdMap = new Map<string, string>();
    for (const c of chunk(epRows, 300)) {
      const { data, error } = await db.from("episodes").upsert(c, { onConflict: "anime_id,number", ignoreDuplicates: true }).select("id,anime_id,number");
      if (error) throw new Error(`Guardar episodios: ${error.message}`);
      for (const e of data ?? []) epIdMap.set(`${e.anime_id}:${e.number}`, e.id);
    }
    // Resolve episode ids for episode-level links pointing at older episodes.
    const needEp = linkPlans.filter((l) => l.episode && !epIdMap.has(`${l.anime_id}:${l.episode}`));
    for (const c of chunk([...new Set(needEp.map((l) => l.anime_id))], 150)) {
      const { data } = await db.from("episodes").select("id,anime_id,number").in("anime_id", c).limit(10000);
      for (const e of data ?? []) epIdMap.set(`${e.anime_id}:${e.number}`, e.id);
    }
    // Official platforms only: unknown sites from official metadata are registered as new video sources.
    const linkRows: Database["public"]["Tables"]["watch_links"]["Insert"][] = [];
    for (const l of linkPlans) {
      let vs = videoByName.get(l.site.toLowerCase());
      if (!vs) {
        const { data } = await db.from("sources").upsert({ kind: "video", name: l.site, site_url: new URL(l.url).origin, trust: "medium", priority: 60, integration_method: "link_only" }, { onConflict: "kind,name" }).select("*").single();
        if (!data) continue;
        vs = data;
        videoByName.set(l.site.toLowerCase(), data);
        history.push({ run_id: runId, source_id: data.id, kind: "new_source", new_value: data.name });
      }
      if (vs.status === "inactive") continue;
      linkRows.push({ anime_id: l.anime_id, source_id: vs.id, url: l.url, label: l.label, episode_id: l.episode ? epIdMap.get(`${l.anime_id}:${l.episode}`) ?? null : null });
    }
    const dedup = [...new Map(linkRows.map((r) => [`${r.anime_id}|${r.url}`, r])).values()];
    for (const c of chunk(dedup, 300)) await db.from("watch_links").upsert(c, { onConflict: "anime_id,url", ignoreDuplicates: true });
    for (const c of chunk(history, 300)) await db.from("change_history").insert(c);

    await stage("Finalizando");
    const status = stats.failed === 0 ? "success" : stats.ok > 0 ? "partial" : "failed";
    await db.from("sync_runs").update({
      status, stage: "Completado", finished_at: new Date().toISOString(), duration_ms: Date.now() - started,
      sources_ok: stats.ok, sources_failed: stats.failed, animes_found: stats.found, animes_new: stats.created,
      episodes_new: stats.eps, changes: stats.changes + stats.eps, merged: stats.merged, log,
    }).eq("id", runId);
    return { runId, status, sources_ok: stats.ok, sources_failed: stats.failed, animes_found: stats.found, animes_new: stats.created, episodes_new: stats.eps, merged: stats.merged, changes: stats.changes };
  } catch (e) {
    console.error(e);
    await db.from("sync_runs").update({ status: "failed", stage: `Error: ${(e as Error).message}`.slice(0, 200), finished_at: new Date().toISOString(), duration_ms: Date.now() - started, sources_ok: stats.ok, sources_failed: stats.failed, log }).eq("id", runId);
    return { runId, status: "failed", sources_ok: stats.ok, sources_failed: stats.failed, animes_found: stats.found, animes_new: 0, episodes_new: 0, merged: 0, changes: 0 };
  } finally {
    await db.rpc("release_sync_lock");
  }
}

function findByKeys(byKey: Map<string, AnimeRow[]>, keys: string[], year?: number | null) {
  for (const k of keys) {
    for (const r of byKey.get(k) ?? []) if (!year || !r.year || Math.abs(r.year - year) <= 1) return r;
  }
  return undefined;
}

async function loadExisting(db: DB, items: NormalizedAnime[], touched: Map<string, AnimeRow>) {
  const byAnilist = new Map<number, AnimeRow>();
  const byMal = new Map<number, AnimeRow>();
  const byKey = new Map<string, AnimeRow[]>();
  const register = (r: AnimeRow) => {
    if (r.anilist_id) byAnilist.set(r.anilist_id, r);
    if (r.mal_id) byMal.set(r.mal_id, r);
    for (const k of r.match_keys) byKey.set(k, [...(byKey.get(k) ?? []).filter((x) => x.id !== r.id), r]);
  };
  const add = (rows: AnimeRow[] | null) => rows?.forEach((r) => register(touched.get(r.id) ?? r));
  const al = items.map((i) => i.anilist_id).filter(Boolean) as number[];
  const mal = items.map((i) => i.mal_id).filter(Boolean) as number[];
  const keys = [...new Set(items.flatMap((i) => matchKeys([i.title, i.title_english, i.title_native, ...i.synonyms])))];
  for (const c of chunk(al, 200)) add((await db.from("animes").select("*").in("anilist_id", c)).data);
  for (const c of chunk(mal, 200)) add((await db.from("animes").select("*").in("mal_id", c)).data);
  for (const c of chunk(keys, 200)) add((await db.from("animes").select("*").overlaps("match_keys", c)).data);
  touched.forEach(register);
  return { byAnilist, byMal, byKey, register };
}

async function markOk(db: DB, src: Source, ms: number, items: number) {
  await db.from("sources").update({ status: "active", last_sync_at: new Date().toISOString(), last_response_ms: ms, items_found: items, last_error: null, consecutive_failures: 0 }).eq("id", src.id);
}

async function markFail(db: DB, src: Source, e: unknown) {
  const code = e instanceof SourceError ? e.code : "ERROR";
  const message = (e as Error)?.message ?? String(e);
  const failures = src.consecutive_failures + 1;
  const status = code === "403" ? "unavailable" : failures >= 3 ? "problems" : src.status === "unavailable" ? "problems" : src.status;
  await db.from("sources").update({ status, last_sync_at: new Date().toISOString(), last_error: `${code}: ${message}`, consecutive_failures: failures }).eq("id", src.id);
  const { data: ex } = await db.from("source_errors").select("id,occurrences").eq("source_id", src.id).eq("code", code).maybeSingle();
  if (ex) await db.from("source_errors").update({ occurrences: ex.occurrences + 1, last_seen: new Date().toISOString(), message, reviewed: false }).eq("id", ex.id);
  else await db.from("source_errors").insert({ source_id: src.id, code, message });
}
