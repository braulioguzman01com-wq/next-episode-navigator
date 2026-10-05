import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const ADMIN_EMAIL = "mayil.ramos.kv@gmail.com";

// Simple per-instance throttle against brute force.
const attempts = new Map<string, { n: number; until: number }>();

function matches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

// Verifies the shared admin password server-side, then issues a one-time sign-in token
// for the internal admin account. The password itself never lives in Auth, so any length works.
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_LOGIN_PASSWORD"];
    if (!expected) return { ok: false as const, reason: "config" as const };
    const key = "admin";
    const now = Date.now();
    const a = attempts.get(key);
    if (a && a.until > now) return { ok: false as const, reason: "wait" as const };
    if (!matches(data.password.trim(), expected.trim())) {
      const n = (a?.n ?? 0) + 1;
      attempts.set(key, { n, until: n >= 5 ? now + 30_000 : 0 });
      await new Promise((r) => setTimeout(r, 400));
      return { ok: false as const, reason: "wrong" as const };
    }
    attempts.delete(key);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let user = list?.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
    if (!user) {
      const { data: c, error } = await supabaseAdmin.auth.admin.createUser({ email: ADMIN_EMAIL, email_confirm: true });
      if (error || !c.user) return { ok: false as const, reason: "config" as const };
      user = c.user;
    }
    await supabaseAdmin.from("user_roles").upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: ADMIN_EMAIL });
    if (error || !link?.properties?.hashed_token) return { ok: false as const, reason: "config" as const };
    return { ok: true as const, tokenHash: link.properties.hashed_token };
  });
