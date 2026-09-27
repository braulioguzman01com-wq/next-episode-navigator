import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "dark" | "black" | "auto";
export type SavedEntry = { id: string; title: string; cover: string | null; next_airing_at: string | null; savedAt: string };
export type WatchEntry = { animeId: string; title: string; cover: string | null; episode: number; source: string; url: string; at: string };
export type NotifPrefs = { enabled: boolean; newEpisode: boolean; newAnime: boolean; dateChange: boolean; upcoming: boolean };

type Prefs = {
  hydrated: boolean;
  timezone: string;
  detectedTimezone: string;
  setTimezone: (tz: string | null) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  saved: SavedEntry[];
  isSaved: (id: string) => boolean;
  toggleSaved: (e: Omit<SavedEntry, "savedAt">) => void;
  history: WatchEntry[];
  recordWatch: (e: Omit<WatchEntry, "at">) => void;
  clearData: () => void;
  notif: NotifPrefs;
  setNotif: (n: NotifPrefs) => void;
};

const Ctx = createContext<Prefs | null>(null);
const K = { tz: "aa.tz", theme: "aa.theme", saved: "aa.saved", hist: "aa.history", notif: "aa.notif" };
const DEFAULT_NOTIF: NotifPrefs = { enabled: true, newEpisode: true, newAnime: false, dateChange: true, upcoming: true };

function read<T>(k: string, fb: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [detected, setDetected] = useState("UTC");
  const [tzOverride, setTzOverride] = useState<string | null>(null);
  const [theme, setThemeState] = useState<Theme>("dark");
  const [saved, setSaved] = useState<SavedEntry[]>([]);
  const [history, setHistory] = useState<WatchEntry[]>([]);
  const [notif, setNotifState] = useState<NotifPrefs>(DEFAULT_NOTIF);

  useEffect(() => {
    setDetected(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    setTzOverride(read<string | null>(K.tz, null));
    setThemeState(read<Theme>(K.theme, "dark"));
    setSaved(read<SavedEntry[]>(K.saved, []));
    setHistory(read<WatchEntry[]>(K.hist, []));
    setNotifState(read<NotifPrefs>(K.notif, DEFAULT_NOTIF));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const apply = () => {
      const black = theme === "black" || (theme === "auto" && window.matchMedia("(prefers-contrast: more)").matches);
      document.documentElement.classList.toggle("theme-black", black);
    };
    apply();
  }, [theme, hydrated]);

  const persist = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

  const toggleSaved = useCallback((e: Omit<SavedEntry, "savedAt">) => {
    setSaved((prev) => {
      const next = prev.some((s) => s.id === e.id) ? prev.filter((s) => s.id !== e.id) : [{ ...e, savedAt: new Date().toISOString() }, ...prev];
      persist(K.saved, next);
      return next;
    });
  }, []);

  const recordWatch = useCallback((e: Omit<WatchEntry, "at">) => {
    setHistory((prev) => {
      const next = [{ ...e, at: new Date().toISOString() }, ...prev.filter((h) => h.animeId !== e.animeId)].slice(0, 40);
      persist(K.hist, next);
      return next;
    });
  }, []);

  const value = useMemo<Prefs>(
    () => ({
      hydrated,
      timezone: tzOverride ?? detected,
      detectedTimezone: detected,
      setTimezone: (tz) => {
        setTzOverride(tz);
        if (tz) persist(K.tz, tz);
        else localStorage.removeItem(K.tz);
      },
      theme,
      setTheme: (t) => {
        setThemeState(t);
        persist(K.theme, t);
      },
      saved,
      isSaved: (id) => saved.some((s) => s.id === id),
      toggleSaved,
      history,
      recordWatch,
      clearData: () => {
        Object.values(K).forEach((k) => localStorage.removeItem(k));
        setSaved([]);
        setHistory([]);
      },
      notif,
      setNotif: (n) => {
        setNotifState(n);
        persist(K.notif, n);
      },
    }),
    [hydrated, tzOverride, detected, theme, saved, history, notif, toggleSaved, recordWatch],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const c = useContext(Ctx);
  if (!c) throw new Error("PrefsProvider missing");
  return c;
}
