import { useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { SourceType } from "@/config/sources";

type Props = {
  type: SourceType;
  url: string;
  progressKey: string;
  subtitles?: { src: string; lang: string; label: string }[] | undefined;
  onStart?: () => void;
};

const fmt = (s: number) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

export function VideoPlayer({ type, url, progressKey, subtitles, onStart }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const v = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [d, setD] = useState(0);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (type === "youtube") { onStart?.(); return; }
    const el = v.current;
    if (!el) return;
    setErr(null);
    let hls: { destroy: () => void } | null = null;
    const resume = () => {
      const saved = Number(localStorage.getItem(progressKey) || 0);
      if (saved > 5 && saved < el.duration - 10) el.currentTime = saved;
    };
    el.addEventListener("loadedmetadata", resume, { once: true });
    if (type === "hls" && !el.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) return setErr("Tu navegador no soporta este formato.");
        const h = new Hls();
        h.on(Hls.Events.ERROR, (_e, data) => data.fatal && setErr("No se pudo cargar el vídeo."));
        h.loadSource(url);
        h.attachMedia(el);
        hls = h;
      });
    } else el.src = url;
    return () => { hls?.destroy(); el.removeEventListener("loadedmetadata", resume); };
  }, [type, url, progressKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (type === "youtube")
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-background">
        <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(url)}?rel=0`} title="Reproductor" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      </div>
    );

  const el = v.current;
  return (
    <div ref={wrap} className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-background">
      <video
        ref={v}
        className="h-full w-full"
        playsInline
        crossOrigin="anonymous"
        onClick={() => (el?.paused ? el.play() : el?.pause())}
        onPlay={() => { setPlaying(true); onStart?.(); }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => { const c = e.currentTarget.currentTime; setT(c); if (Math.floor(c) % 5 === 0) localStorage.setItem(progressKey, String(c)); }}
        onDurationChange={(e) => setD(e.currentTarget.duration)}
        onError={() => setErr("No se pudo cargar el vídeo.")}
      >
        {(subtitles ?? []).map((s, i) => <track key={s.src} kind="subtitles" src={s.src} srcLang={s.lang} label={s.label} default={i === 0} />)}
      </video>
      {err && <div className="absolute inset-0 flex items-center justify-center text-sm text-destructive">{err}</div>}
      <div className="glass-strong absolute inset-x-2 bottom-2 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button aria-label={playing ? "Pausa" : "Reproducir"} onClick={() => (el?.paused ? el.play() : el?.pause())}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
        <span className="tabular-nums">{fmt(t)}</span>
        <input aria-label="Progreso" type="range" min={0} max={d || 0} step={0.1} value={t} onChange={(e) => el && (el.currentTime = Number(e.target.value))} className="min-w-0 flex-1 accent-primary" />
        <span className="tabular-nums">{fmt(d)}</span>
        <button aria-label="Silenciar" onClick={() => { if (el) { el.muted = !muted; setMuted(!muted); } }}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
        <input aria-label="Volumen" type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => { const n = Number(e.target.value); setVol(n); if (el) el.volume = n; }} className="hidden w-16 accent-primary sm:block" />
        <select aria-label="Velocidad" value={rate} onChange={(e) => { const n = Number(e.target.value); setRate(n); if (el) el.playbackRate = n; }} className="rounded bg-transparent">
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r} className="bg-background">{r}x</option>)}
        </select>
        <button aria-label="Pantalla completa" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : wrap.current?.requestFullscreen())}><Maximize className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
