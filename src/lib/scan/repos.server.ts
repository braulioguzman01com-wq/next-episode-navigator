// Extension repository importer (Mangayomi / Aniyomi / generic JSON / protobuf index).
// Only reads catalog metadata; extension code is never executed. Each source base URL
// is registered as a scan site and handled by the generic site scanner.
import { fetchWithPolicy } from "@/lib/sync/http.server";
import { runSiteScan } from "@/lib/scan/scanner.server";

export type ExtSource = { pkg: string; name: string; version?: string; lang?: string; kind?: string; icon_url?: string; base_url?: string };

const isUrl = (s: unknown): s is string => typeof s === "string" && /^https?:\/\/[^\s]+\.[^\s]+/.test(s);
const str = (v: unknown) => (v == null ? undefined : String(v));
const KIND: Record<string, string> = { "0": "manga", "1": "video", "2": "novela" };

/** Candidate catalog URLs for a pasted link (GitHub repo pages become raw files). */
function candidates(input: string): string[] {
  const u = new URL(input);
  if (u.hostname === "github.com") {
    const [owner, repo, , branch, ...rest] = u.pathname.split("/").filter(Boolean);
    if (owner && repo) {
      const branches = branch ? [branch] : ["main", "master", "repo"];
      const files = rest.length ? [rest.join("/")] : ["index.min.json", "index.json", "anime_index.json", "repo.json", "index.pb", "repo/index.min.json"];
      return branches.flatMap((b) => files.map((f) => `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${f}`));
    }
  }
  if (/\.(json|pb)(\?|$)/.test(u.pathname)) return [input];
  const base = input.replace(/\/$/, "");
  return [input, `${base}/index.min.json`, `${base}/index.json`, `${base}/repo.json`, `${base}/index.pb`];
}

function fromJson(json: any, catalogUrl: string): ExtSource[] {
  const list: any[] = Array.isArray(json) ? json : json?.extensions ?? json?.sources ?? json?.data ?? json?.items ?? [];
  const repoBase = catalogUrl.replace(/[^/]*$/, "");
  const out: ExtSource[] = [];
  for (const e of list) {
    if (!e || typeof e !== "object") continue;
    const pkg = str(e.pkg ?? e.id ?? e.packageName ?? e.name) ?? "desconocido";
    const icon = isUrl(e.iconUrl) ? e.iconUrl : isUrl(e.icon) ? e.icon : e.pkg ? `${repoBase}icon/${e.pkg}.png` : undefined;
    const kind = e.itemType != null ? KIND[String(e.itemType)] : str(e.type ?? e.typeSource);
    const base = { pkg, name: str(e.name) ?? pkg, version: str(e.version), lang: str(e.lang), kind, icon_url: icon };
    const subs: any[] = Array.isArray(e.sources) ? e.sources : [];
    if (subs.length) for (const s of subs) out.push({ ...base, name: str(s.name) ?? base.name, lang: str(s.lang) ?? base.lang, base_url: isUrl(s.baseUrl) ? s.baseUrl : undefined });
    else out.push({ ...base, base_url: [e.baseUrl, e.base_url, e.url, e.website].find(isUrl) });
  }
  return out;
}

/** Schemaless protobuf decoding: any message that holds a URL becomes a source. */
function fromProtobuf(buf: Uint8Array): ExtSource[] {
  const dec = new TextDecoder("utf-8", { fatal: true });
  const out: ExtSource[] = [];
  const parse = (b: Uint8Array, depth: number): (string | null)[] | null => {
    let i = 0;
    const strings: string[] = [];
    const varint = () => { let r = 0, s = 0, x; do { if (i >= b.length) throw 0; x = b[i++]; r += (x & 0x7f) * 2 ** s; s += 7; } while (x & 0x80); return r; };
    try {
      while (i < b.length) {
        const tag = varint(), wt = tag & 7;
        if (tag >> 3 === 0) return null;
        if (wt === 0) varint();
        else if (wt === 1) i += 8;
        else if (wt === 5) i += 4;
        else if (wt === 2) {
          const len = varint(); if (i + len > b.length) return null;
          const chunk = b.subarray(i, i + len); i += len;
          const nested = depth < 6 && len > 1 ? parse(chunk, depth + 1) : null;
          if (nested) continue;
          try { const t = dec.decode(chunk); if (/^[\p{L}\p{N}\p{P}\p{S} ]+$/u.test(t)) strings.push(t); } catch { /* binary */ }
        } else return null;
      }
    } catch { return null; }
    const url = strings.find(isUrl);
    if (url) {
      const words = strings.filter((s) => !isUrl(s));
      const name = words.find((s) => s.length > 1 && !/^[a-z]{2}(-\w+)?$/.test(s) && !/^\d/.test(s)) ?? new URL(url).hostname;
      const pkg = words.find((s) => /^[a-z]+(\.[\w]+){2,}$/.test(s)) ?? name;
      out.push({ pkg, name, lang: words.find((s) => /^[a-z]{2}(-\w+)?$/.test(s) || s === "all"), version: words.find((s) => /^\d+(\.\d+)+$/.test(s)), icon_url: strings.find((s) => isUrl(s) && /\.(png|jpe?g|webp|svg)/i.test(s)), base_url: strings.find((s) => isUrl(s) && !/\.(png|jpe?g|webp|svg|apk|js|dart)/i.test(s)) });
    }
    return strings as any;
  };
  parse(buf, 0);
  return out;
}

export async function readRepo(input: string) {
  const errors: string[] = [];
  for (const url of candidates(input)) {
    try {
      const res = await fetchWithPolicy(url, { timeoutMs: 12000, retries: 1 });
      const bytes = new Uint8Array(await res.arrayBuffer());
      const text = new TextDecoder().decode(bytes).trim();
      if (text.startsWith("[") || text.startsWith("{")) {
        const list = fromJson(JSON.parse(text), url);
        if (list.length) return { catalogUrl: url, format: "json", sources: list };
      } else if (!/^\s*</.test(text)) {
        const list = fromProtobuf(bytes);
        if (list.length) return { catalogUrl: url, format: "protobuf", sources: list };
      }
      errors.push(`${url}: sin extensiones reconocibles`);
    } catch (e) { errors.push(`${url}: ${(e as Error).message}`); }
  }
  throw new Error(`No se encontró un catálogo válido. ${errors.slice(0, 3).join(" · ")}`);
}

/** Reads the repo, upserts extensions, registers each base URL as a scan site and scans a bounded batch. */
export async function syncRepo(db: any, repoId: string, scanLimit = 3) {
  const { data: repo } = await db.from("ext_repos").select("*").eq("id", repoId).single();
  if (!repo) throw new Error("Repositorio no encontrado");
  try {
    const r = await readRepo(repo.url);
    const seen = new Set<string>();
    const rows = r.sources.filter((s) => { const k = `${s.pkg}|${s.base_url ?? ""}`; if (seen.has(k)) return false; seen.add(k); return true; });
    let newSites = 0;
    const toScan: string[] = [];
    for (const s of rows) {
      let siteId: string | null = null;
      if (s.base_url) {
        const url = s.base_url.replace(/\/$/, "");
        const { data: ex } = await db.from("scan_sites").select("id,last_scan_at").eq("url", url).maybeSingle();
        if (ex) { siteId = ex.id; if (!ex.last_scan_at) toScan.push(ex.id); }
        else {
          const { data: ins } = await db.from("scan_sites").insert({ name: s.name, url }).select("id").single();
          if (ins) { siteId = ins.id; newSites++; toScan.push(ins.id); }
        }
      }
      await db.from("ext_extensions").upsert({
        repo_id: repoId, pkg: s.pkg, name: s.name, version: s.version ?? null, lang: s.lang ?? null, kind: s.kind ?? null,
        icon_url: s.icon_url ?? null, base_url: s.base_url ?? "", compatible: !!s.base_url, site_id: siteId,
        note: s.base_url ? null : "Sin URL base en el catálogo", updated_at: new Date().toISOString(),
      }, { onConflict: "repo_id,pkg,base_url" });
    }
    let scanned = 0, contents = 0;
    for (const id of toScan.slice(0, scanLimit)) {
      const x: any = await runSiteScan(db, id).catch(() => null);
      scanned++; contents += x?.found ?? 0;
    }
    const name = repo.name ?? new URL(repo.url).pathname.split("/").filter(Boolean).slice(0, 2).join("/") || new URL(repo.url).hostname;
    await db.from("ext_repos").update({ name, format: r.format, status: "ok", last_error: null, ext_count: rows.length, last_sync_at: new Date().toISOString() }).eq("id", repoId);
    return { extensions: rows.length, withUrl: rows.filter((x) => x.base_url).length, newSites, scanned, pending: Math.max(0, toScan.length - scanned), contents, format: r.format };
  } catch (e) {
    // Keep existing data; retry on next scheduled run.
    await db.from("ext_repos").update({ status: "error", last_error: (e as Error).message.slice(0, 500), last_sync_at: new Date().toISOString() }).eq("id", repoId);
    throw e;
  }
}

export async function syncAllRepos(db: any) {
  const { data } = await db.from("ext_repos").select("id");
  const out = [];
  for (const r of data ?? []) out.push(await syncRepo(db, r.id, 0).catch((e) => ({ error: (e as Error).message })));
  return out;
}
