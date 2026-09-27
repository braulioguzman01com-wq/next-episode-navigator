import { createFileRoute } from "@tanstack/react-router";

const ADMIN_EMAIL = "mayil.ramos.kv@gmail.com";

// Idempotent: creates the admin account from the ADMIN_INITIAL_PASSWORD secret only if it does not exist yet.
// Takes no input, never returns credentials.
export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      POST: async () => {
        const password = process.env["ADMIN_INITIAL_PASSWORD"];
        if (!password || password.length < 8) return Response.json({ ok: false, reason: "secret_missing" }, { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        let user = list?.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
        let created = false;
        if (!user) {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({ email: ADMIN_EMAIL, password, email_confirm: true });
          if (error) return Response.json({ ok: false, reason: "create_failed" }, { status: 500 });
          user = data.user;
          created = true;
        }
        await supabaseAdmin.from("user_roles").upsert({ user_id: user!.id, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
        return Response.json({ ok: true, created });
      },
    },
  },
});
