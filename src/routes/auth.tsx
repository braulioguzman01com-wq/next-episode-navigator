import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5">
      <form
        className="glass w-full max-w-sm space-y-4 rounded-3xl p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          setBusy(false);
          if (error) return setErr("Correo o contraseña incorrectos.");
          nav({ to: "/admin" });
        }}
      >
        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <input type="email" required autoComplete="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl bg-muted px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary" />
        <input type="password" required autoComplete="current-password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl bg-muted px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary" />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button disabled={busy} className="press w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    </div>
  );
}
