import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { Bell, Clock, Database, Info, Moon, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { usePrefs, type Theme } from "@/lib/prefs";
import { statusQuery } from "@/lib/data";
import { fmtDateTime, nextCronRun } from "@/lib/format";
import { LargeTitle } from "@/components/app/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes | Estrenos" },
      { name: "description", content: "Tema, zona horaria, notificaciones y estado de las fuentes." },
      { property: "og:title", content: "Ajustes | Estrenos" },
      { property: "og:description", content: "Tema, zona horaria, notificaciones y estado de las fuentes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Ajustes,
});

const VERSION = "1.0.0";

function Group({ title, icon: Icon, children, footer }: { title: string; icon: React.ComponentType<{ className?: string }>; children: ReactNode; footer?: string }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 flex items-center gap-2 px-4 text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h2>
      <div className="divide-y divide-hairline overflow-hidden rounded-2xl bg-card">{children}</div>
      {footer && <p className="mt-2 px-4 text-[12px] text-muted-foreground">{footer}</p>}
    </section>
  );
}
function Row({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-2.5 text-[15px]">
      <span>{label}</span>
      <span className="min-w-0 truncate text-right text-muted-foreground">{children}</span>
    </div>
  );
}

const SOURCE_STATUS: Record<string, { l: string; c: string }> = {
  active: { l: "Operativa", c: "bg-success" },
  problems: { l: "Problemas", c: "bg-warning" },
  unavailable: { l: "No disponible", c: "bg-destructive" },
  inactive: { l: "Desactivada", c: "bg-muted-foreground" },
  unsupported: { l: "No compatible", c: "bg-muted-foreground" },
};

function Ajustes() {
  const p = usePrefs();
  const st = useQuery(statusQuery());
  const zones = useMemo(() => {
    try {
      return (Intl as any).supportedValuesOf("timeZone") as string[];
    } catch {
      return [p.detectedTimezone];
    }
  }, [p.detectedTimezone]);
  const themes: { v: Theme; l: string }[] = [
    { v: "dark", l: "Oscuro" },
    { v: "black", l: "Negro puro" },
    { v: "auto", l: "Automático" },
  ];
  const n = p.notif;

  return (
    <div className="animate-page">
      <LargeTitle title="Ajustes" />

      <Group title="Apariencia" icon={Moon}>
        <div className="p-1.5">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {themes.map((t) => (
              <button key={t.v} onClick={() => p.setTheme(t.v)} className={cn("press rounded-lg py-2 text-[14px] font-medium transition-colors", p.theme === t.v ? "bg-accent text-foreground shadow" : "text-muted-foreground")}>
                {t.l}
              </button>
            ))}
          </div>
        </div>
      </Group>

      <Group title="Zona horaria" icon={Clock} footer="Todas las horas se muestran en esta zona horaria.">
        <Row label="Detectada">{p.detectedTimezone}</Row>
        <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-2 text-[15px]">
          <label htmlFor="tz">Usar</label>
          <select
            id="tz"
            value={p.timezone === p.detectedTimezone ? "" : p.timezone}
            onChange={(e) => p.setTimezone(e.target.value || null)}
            className="max-w-[60%] truncate rounded-lg bg-transparent text-right text-muted-foreground outline-none"
          >
            <option value="">Automática</option>
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      </Group>

      <Group title="Notificaciones" icon={Bell} footer="Los avisos se muestran dentro de la aplicación para tus animes guardados.">
        <div className="flex min-h-12 items-center justify-between px-4 text-[15px]">
          <span>Activar notificaciones</span>
          <Switch checked={n.enabled} onCheckedChange={(v) => p.setNotif({ ...n, enabled: v })} />
        </div>
        {([
          ["newEpisode", "Nuevo episodio"],
          ["newAnime", "Nuevo anime"],
          ["dateChange", "Cambio de fecha o retraso"],
          ["upcoming", "Próximo estreno"],
        ] as const).map(([k, l]) => (
          <div key={k} className={cn("flex min-h-12 items-center justify-between px-4 text-[15px] transition-opacity", !n.enabled && "opacity-40")}>
            <span>{l}</span>
            <Switch disabled={!n.enabled} checked={n[k]} onCheckedChange={(v) => p.setNotif({ ...n, [k]: v })} />
          </div>
        ))}
      </Group>

      <Group title="Preferencias" icon={SlidersHorizontal}>
        <Row label="Idioma">Español</Row>
        <Row label="Guardados">{p.saved.length}</Row>
      </Group>

      <Group title="Datos" icon={Database} footer="Tus guardados e historial se almacenan solo en este dispositivo.">
        <Row label="Última sincronización">{st.data?.lastRun?.finished_at ? fmtDateTime(st.data.lastRun.finished_at, p.timezone) : "—"}</Row>
        <Row label="Próxima sincronización">{p.hydrated ? fmtDateTime(nextCronRun().toISOString(), p.timezone) : "—"}</Row>
        {st.data?.sources.map((s) => {
          const x = SOURCE_STATUS[s.status] ?? { l: "Desactivada", c: "bg-muted-foreground" };
          return (
            <Row key={s.id} label={s.name}>
              <span className="inline-flex items-center gap-1.5 text-[13px]"><span className={cn("h-1.5 w-1.5 rounded-full", x.c)} />{x.l}</span>
            </Row>
          );
        })}
        <button
          onClick={() => {
            p.clearData();
            toast.success("Datos locales borrados");
          }}
          className="press flex min-h-12 w-full items-center gap-2 px-4 text-[15px] text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Borrar guardados e historial
        </button>
      </Group>

      <Group title="Información" icon={Info} footer="Estrenos solo enlaza a plataformas oficiales. No aloja ni distribuye videos.">
        <Row label="Versión">{VERSION}</Row>
        <Row label="Datos de">AniList · MyAnimeList</Row>
      </Group>
    </div>
  );
}
