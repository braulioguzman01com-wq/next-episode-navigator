export function fmtTime(iso: string | null | undefined, tz: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
}
export function fmtDate(iso: string | null | undefined, tz: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es", { ...opts, timeZone: tz }).format(new Date(iso));
}
export function fmtDateTime(iso: string | null | undefined, tz: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short", timeZone: tz }).format(new Date(iso));
}
function dayKey(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d); // YYYY-MM-DD
}
export type Bucket = "Hoy" | "Mañana" | "Esta semana" | "Este mes" | "Próximamente";
export const BUCKETS: Bucket[] = ["Hoy", "Mañana", "Esta semana", "Este mes", "Próximamente"];
export function bucketFor(iso: string, tz: string): Bucket {
  const now = new Date();
  const k = dayKey(new Date(iso), tz);
  if (k === dayKey(now, tz)) return "Hoy";
  if (k === dayKey(new Date(now.getTime() + 86400e3), tz)) return "Mañana";
  const diff = (new Date(iso).getTime() - now.getTime()) / 86400e3;
  if (diff <= 7) return "Esta semana";
  if (diff <= 31) return "Este mes";
  return "Próximamente";
}
export function relative(iso: string | null | undefined) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const abs = Math.abs(s);
  if (abs < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
}
export const STATUS_LABEL: Record<string, string> = {
  RELEASING: "En emisión",
  NOT_YET_RELEASED: "Próximamente",
  FINISHED: "Finalizado",
  HIATUS: "En pausa",
  CANCELLED: "Cancelado",
};
export const SEASON_LABEL: Record<string, string> = { WINTER: "Invierno", SPRING: "Primavera", SUMMER: "Verano", FALL: "Otoño" };

/** Next scheduled sync for cron "0 *\/5 * * *" (UTC hours 0,5,10,15,20). */
export function nextCronRun(from = new Date()) {
  const d = new Date(from);
  d.setUTCMinutes(0, 0, 0);
  for (let i = 0; i < 26; i++) {
    d.setUTCHours(d.getUTCHours() + 1);
    if (d.getUTCHours() % 5 === 0 && d > from) return d;
  }
  return d;
}
