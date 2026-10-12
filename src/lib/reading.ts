export type Progress = { mangaId: string; title: string; cover: string | null; chapterId: string; chapter: string | null; page: number; at: number };
const KEY = "reading_progress";

export function readProgress(): Progress[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
export function saveProgress(p: Progress) {
  const list = readProgress().filter((x) => x.mangaId !== p.mangaId);
  localStorage.setItem(KEY, JSON.stringify([p, ...list].slice(0, 30)));
}
