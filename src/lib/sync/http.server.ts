export class SourceError extends Error {
  constructor(
    public code: string,
    message: string,
    public fatalForRun = false,
  ) {
    super(message);
  }
}

type Opts = { retries?: number; timeoutMs?: number; init?: RequestInit };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch with timeout and a bounded retry policy.
 * 403 -> never retried (source marked unavailable).
 * 5xx/timeout -> up to `retries` attempts with exponential backoff.
 * 429 -> one wait honoring Retry-After (max 4s).
 */
export async function fetchWithPolicy(url: string, { retries = 0, timeoutMs = 12000, init }: Opts = {}) {
  let attempt = 0;
  let waited429 = false;
  for (;;) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        signal: ctrl.signal,
        headers: { "User-Agent": "AnimeAggregator/1.0 (+metadata sync)", ...(init?.headers ?? {}) },
      });
      clearTimeout(t);
      if (res.ok) return res;
      if (res.status === 403) throw new SourceError("403", "Acceso denegado por la fuente (no se intenta evadir)", true);
      if (res.status === 404) throw new SourceError("404", "Recurso no encontrado");
      if (res.status === 429 && !waited429) {
        waited429 = true;
        const ra = Number(res.headers.get("retry-after")) || 2;
        await sleep(Math.min(ra, 4) * 1000);
        continue;
      }
      if (res.status >= 500 && attempt < retries) {
        attempt++;
        await sleep(600 * 2 ** attempt + Math.random() * 300);
        continue;
      }
      throw new SourceError(String(res.status), `Respuesta HTTP ${res.status}`);
    } catch (e) {
      clearTimeout(t);
      if (e instanceof SourceError) throw e;
      if (attempt < retries) {
        attempt++;
        await sleep(600 * 2 ** attempt);
        continue;
      }
      const aborted = (e as Error)?.name === "AbortError";
      throw new SourceError(aborted ? "TIMEOUT" : "NETWORK", aborted ? "Tiempo de espera agotado" : String((e as Error)?.message ?? e));
    }
  }
}
