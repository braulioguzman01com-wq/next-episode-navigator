import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Acceso denegado");
}

export const syncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sourceId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runSync } = await import("@/lib/sync/engine.server");
    return runSync(supabaseAdmin, "manual", data.sourceId);
  });

/** Validates a site / feed URL before saving a source. Never saves a broken source silently. */
export const testSourceUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ siteUrl: z.string().url().max(500), feedUrl: z.string().url().max(500).optional().or(z.literal("")) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { fetchWithPolicy } = await import("@/lib/sync/http.server");
    const { rssAdapter } = await import("@/lib/sync/adapters.server");
    const out: { site: { ok: boolean; ms?: number; error?: string }; feed?: { ok: boolean; items?: number; error?: string } } = { site: { ok: false } };
    const t = Date.now();
    try {
      await fetchWithPolicy(data.siteUrl, { timeoutMs: 8000 });
      out.site = { ok: true, ms: Date.now() - t };
    } catch (e) {
      out.site = { ok: false, error: (e as Error).message };
    }
    if (data.feedUrl) {
      try {
        const r = await rssAdapter(data.feedUrl);
        out.feed = { ok: r.items.length > 0, items: r.items.length, ...(r.items.length ? {} : { error: "El feed no contiene elementos" }) };
      } catch (e) {
        out.feed = { ok: false, error: (e as Error).message };
      }
    }
    return out;
  });
