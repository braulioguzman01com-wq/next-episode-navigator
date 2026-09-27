// Title normalization used for duplicate detection across sources.
const ROMAN: Record<string, string> = { ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };
const ORD: Record<string, string> = { second: "2", third: "3", fourth: "4", fifth: "5", sixth: "6" };

export function normalizeTitle(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[:\-–—_!?.,'"’“”()[\]~]/g, " ");
  // "3rd season", "season 3", "third season", "part 2", roman numerals
  s = s.replace(/\b(\d+)(st|nd|rd|th)\s+season\b/g, " s$1 ");
  s = s.replace(/\bseason\s+(\d+)\b/g, " s$1 ");
  s = s.replace(/\b(second|third|fourth|fifth|sixth)\s+season\b/g, (_, w) => ` s${ORD[w]} `);
  s = s.replace(/\bpart\s+(\d+)\b/g, " p$1 ");
  s = s.replace(/\b(ii|iii|iv|vi|vii|viii|ix)\b/g, (_, r) => ` s${ROMAN[r]} `);
  s = s.replace(/\bs(\d+)\b/g, " s$1 ");
  s = s.replace(/\b(the|tv|anime)\b/g, " ");
  // bare trailing number after words => season number
  s = s.replace(/\s(\d)\s*$/g, " s$1");
  s = s.replace(/\s+/g, " ").trim();
  // "s1" is implicit
  s = s.replace(/\bs1\b/g, "").replace(/\s+/g, " ").trim();
  return s.replace(/\s/g, "") || null;
}

export function matchKeys(titles: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const t of titles) {
    const k = normalizeTitle(t);
    if (k && k.length >= 3) out.add(k);
  }
  return [...out];
}

export function searchText(titles: (string | null | undefined)[]): string {
  return titles.filter(Boolean).join(" | ").toLowerCase();
}
