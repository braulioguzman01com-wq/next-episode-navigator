import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Called every 5 hours by the backend scheduler. Requires the managed cron secret.
export const Route = createFileRoute("/api/public/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runSync } = await import("@/lib/sync/engine.server");
        const summary = await runSync(supabaseAdmin, "cron").catch((e) => ({ error: (e as Error).message }));
        const { runAllSiteScans } = await import("@/lib/scan/scanner.server");
        const sites = await runAllSiteScans(supabaseAdmin).catch((e) => ({ error: (e as Error).message }));
        return Response.json({ summary, sites });
      },
    },
  },
});
