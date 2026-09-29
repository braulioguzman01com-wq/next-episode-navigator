import type { JAnime } from "@/lib/jikan";

/**
 * FUENTES DE VÍDEO
 * IMPORTANTE: añade SOLO fuentes con licencia (canales oficiales de YouTube como
 * Muse Asia / Ani-One Asia, o tu propio CDN con contenido que tengas derecho a emitir).
 * No añadas URLs de sitios que publican episodios sin licencia.
 * getUrl devuelve null cuando la fuente no tiene ese episodio: la app lo oculta.
 */
export type SourceType = "youtube" | "hls" | "mp4";
export type VideoSource = {
  name: string;
  type: SourceType;
  getUrl: (anime: JAnime, episode: number) => string | null;
  subtitles?: (anime: JAnime, episode: number) => { src: string; lang: string; label: string }[];
};

export const SOURCES: VideoSource[] = [
  {
    // Tráiler/PV oficial publicado en YouTube (dato real de la ficha del anime).
    name: "YouTube oficial (tráiler)",
    type: "youtube",
    getUrl: (a) => a.trailer?.youtube_id ?? null,
  },
  // Ejemplo de CDN propio (descomenta y adapta):
  // { name: "Mi CDN", type: "hls", getUrl: (a, ep) => `https://cdn.tudominio.com/${a.mal_id}/${ep}/index.m3u8` },
];
