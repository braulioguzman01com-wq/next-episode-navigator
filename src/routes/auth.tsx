import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const ADMIN_EMAIL = "mayil.ramos.kv@gmail.com";

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
          const { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
          setBusy(false);
          if (error) return setErr("Contraseña incorrecta.");
          nav({ to: "/admin" });
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
