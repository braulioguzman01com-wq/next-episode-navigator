import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { adminLogin } from "@/lib/admin-login.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso — Estrenos" },
      { name: "description", content: "Acceso privado de administración." },
      { property: "og:title", content: "Acceso — Estrenos" },
      { property: "og:description", content: "Acceso privado de administración." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const login = useServerFn(adminLogin);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5">
      <form
        className="w-full max-w-sm space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            const r = await login({ data: { password } });
            if (!r.ok) {
              setBusy(false);
              return setErr(r.reason === "wait" ? "Demasiados intentos. Espera 30 segundos." : r.reason === "config" ? "No se pudo iniciar sesión. Inténtalo de nuevo." : "Contraseña incorrecta.");
            }
            const { error } = await supabase.auth.verifyOtp({ token_hash: r.tokenHash, type: "magiclink" });
            setBusy(false);
            if (error) return setErr("No se pudo iniciar sesión. Inténtalo de nuevo.");
            nav({ to: "/admin" });
          } catch {
            setBusy(false);
            setErr("Sin conexión. Inténtalo de nuevo.");
          }
        }}
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-card"><KeyRound className="h-7 w-7" /></div>
          <h1 className="text-[32px] font-bold">Administración</h1>
          <p className="mt-2 text-sm text-muted-foreground">Introduce la contraseña para continuar</p>
        </div>
        <input autoFocus type="password" required autoComplete="current-password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 w-full rounded-2xl bg-card px-4 text-[17px] outline-none ring-offset-background focus:ring-2 focus:ring-ring" />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button disabled={busy} size="lg" className="press h-13 w-full rounded-2xl text-[16px] font-semibold">{busy ? "Entrando…" : "Entrar"}</Button>
      </form>
    </div>
  );
}
