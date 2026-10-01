import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Acceso denegado");
}
const url = z.string().url().max(500).refine((u) => /^https?:\/\//.test(u), "URL no válida");

/** Preview only: nothing is written. */
export const analyzeSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ url }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { scanSite } = await import("@/lib/scan/scanner.server");
    return scanSite(data.url);
  });

export const saveSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), name: z.string().min(1).max(120), url }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runSiteScan } = await import("@/lib/scan/scanner.server");
    let id = data.id;
    if (id) {
      const { error } = await supabaseAdmin.from("scan_sites").update({ name: data.name, url: data.url }).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await supabaseAdmin.from("scan_sites").insert({ name: data.name, url: data.url }).select("id").single();
      if (error) throw new Error(error.code === "23505" ? "Esa URL ya está registrada" : error.message);
      id = row.id;
    }
    return runSiteScan(supabaseAdmin, id!);
  });

export const scanSiteNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runSiteScan, runAllSiteScans } = await import("@/lib/scan/scanner.server");
    return data.id ? [{ id: data.id, ...(await runSiteScan(supabaseAdmin, data.id)) }] : runAllSiteScans(supabaseAdmin);
  });

export const updateSiteState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), action: z.enum(["activate", "deactivate", "delete"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = supabaseAdmin.from("scan_sites");
    const { error } = data.action === "delete" ? await q.delete().eq("id", data.id) : await q.update({ active: data.action === "activate" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
