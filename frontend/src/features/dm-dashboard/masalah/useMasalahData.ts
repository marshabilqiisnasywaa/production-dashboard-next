import { useEffect, useState } from "react";
import {
  publicApi,
  type DmPublicAbnormalCategory,
  type DmPublicMeetingProblem,
  type DmPublicPapercardProblem,
} from "../api";

export type AbnormalLevel = 1 | 2 | 3;

export type MasalahState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      papercard: DmPublicPapercardProblem[];
      meeting: DmPublicMeetingProblem[];
      abnormalCategories: DmPublicAbnormalCategory[];
    };

/** Ambil data masalah (papercard NG + masalah DM & Workshop meeting + katalog 3-code) dari backend. */
export function useMasalahData(range: { from: string; to: string }, attempt: number) {
  const [state, setState] = useState<MasalahState>({ kind: "loading" });

  useEffect(() => {
    if (!range.from || !range.to) return;
    let cancelled = false;
    setState({ kind: "loading" });

    publicApi
      .problemsReport({ from: range.from, to: range.to })
      .then((data) => {
        if (!cancelled)
          setState({
            kind: "ready",
            papercard: data.papercard ?? [],
            meeting: data.meeting ?? [],
            abnormalCategories: data.abnormalCategories ?? [],
          });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : "Terjadi kesalahan.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to, attempt]);

  return state;
}

/* ---------- Kategori papercard (5M + 1E, sesuai template papercard) ---------- */

export const PAPERCARD_CATEGORIES = [
  "Manusia",
  "Mesin",
  "Material",
  "Metode",
  "Measurement",
  "Lingkungan",
];

/** Label English untuk tampilan (5M + 1E). */
export const PAPERCARD_EN: Record<string, string> = {
  Manusia: "Man",
  Mesin: "Machine",
  Material: "Material",
  Metode: "Method",
  Measurement: "Measurement",
  Lingkungan: "Environment",
};

/** Nama kategori template papercard bebas diisi admin ("Mesin & Peralatan Lini",
 *  "Jig, Fixture & Instruksi Kerja", dll.), jadi dicocokkan lewat kata kunci di dalam namanya. */
const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  Manusia: /\b(manusia|man|operator|pekerja|karyawan|personel|personil|mp|manpower)\b/,
  Mesin: /\b(mesin|machine|peralatan|equipment|tools|alat kerja|conveyor)\b/,
  Material: /\b(material|bahan|komponen|part|parts)\b/,
  Metode: /\b(metode|method|prosedur|sop|jig|fixture|instruksi|wi|proses|process)\b/,
  Measurement: /\b(alat ukur|pengukuran|measurement|kalibrasi|kalibrator|gauge|ukur)\b/,
  Lingkungan: /\b(lingkungan|environment|suhu|kelembapan|esd|pencahayaan)\b/,
};

/** Kata kunci yang muncul paling awal di nama kategori menang ("Mesin & Temperatur" = Mesin).
 *  Hasilnya selalu nama Indonesia. null = di luar 5M+1E (5S, Lainnya, dll.). */
export function papercardCategory(raw: string): string | null {
  const text = raw.trim().toLowerCase();
  let best: { name: string; index: number } | null = null;
  for (const name of PAPERCARD_CATEGORIES) {
    const index = text.search(CATEGORY_KEYWORDS[name]);
    if (index >= 0 && (!best || index < best.index)) best = { name, index };
  }
  return best?.name ?? null;
}

/* ---------- Kategori abnormal 3-code DM meeting (Code 1 / Code 2 / Code 3) ---------- */

export const LOSS_CATEGORIES = [
  { key: "P", label: "P-Planning Losses" },
  { key: "H", label: "H-Human Losses (MP)" },
  { key: "T", label: "T-Time Losses (Overtime)" },
  { key: "R", label: "R-Result Losses (Output)" },
  { key: "Q", label: "Q-Quality Losses" },
  { key: "M", label: "M-Machine Losses" },
];

/** Fallback pencocokan data lama (sebelum 3-code) lewat huruf depan ("R-ResuIt", "M--Machine"). */
export function legacyLossCategory(raw: string, level1Catalog: DmPublicAbnormalCategory[] = []): string | null {
  const text = raw.trim();
  if (!text) return null;
  const prefix = text.charAt(0).toUpperCase();
  if (text.charAt(1) === "-") {
    const fromCatalog = level1Catalog.find((item) => item.code.toUpperCase() === prefix);
    if (fromCatalog) return `${fromCatalog.code}-${fromCatalog.name}`;
    const fromLegacy = LOSS_CATEGORIES.find((category) => category.key === prefix);
    if (fromLegacy) return fromLegacy.label;
  }
  return null;
}

export function categoryLabelOf(cat: DmPublicAbnormalCategory): string {
  return `${cat.code}-${cat.name}`;
}

/** Ambil daftar label kategori untuk satu masalah meeting pada level tertentu (Code 1, 2, atau 3). */
export function meetingLabelsAtLevel(
  problem: DmPublicMeetingProblem,
  level: AbnormalLevel,
  catalog: DmPublicAbnormalCategory[] = []
): string[] {
  const codes = problem.categoryCodes ?? [];
  const rawLabels = problem.categories ?? [];

  if (codes.length > 0) {
    const idx = level - 1;
    const code = codes[idx]?.trim();
    if (!code) return [];
    const fromCatalog = catalog.find(
      (item) => item.level === level && item.code.toUpperCase() === code.toUpperCase()
    );
    if (fromCatalog) return [categoryLabelOf(fromCatalog)];
    const raw = rawLabels[idx]?.trim();
    return [raw || code];
  }

  // Data lama tanpa categoryCodes: hanya petakan ke Code 1.
  if (level !== 1) return [];
  const level1Catalog = catalog.filter((item) => item.level === 1);
  const mapped = rawLabels.flatMap((raw) => {
    const matched = legacyLossCategory(raw, level1Catalog);
    return matched ? [matched] : [];
  });
  return [...new Set(mapped)];
}

/** Format tampilan jalur kategori untuk tabel detail DM Meeting. */
export function meetingCategoryPath(
  problem: DmPublicMeetingProblem,
  catalog: DmPublicAbnormalCategory[] = []
): { isPath: boolean; parts: string[] } {
  const codes = problem.categoryCodes ?? [];
  const rawLabels = problem.categories ?? [];
  if (codes.length > 0) {
    const parts = codes.map((code, index) => {
      const level = (index + 1) as AbnormalLevel;
      const match = catalog.find(
        (item) => item.level === level && item.code.toUpperCase() === code.toUpperCase()
      );
      if (match) return categoryLabelOf(match);
      return rawLabels[index]?.trim() || code;
    });
    return { isPath: true, parts };
  }
  const level1Catalog = catalog.filter((item) => item.level === 1);
  const legacy = [...new Set(rawLabels.flatMap((raw) => legacyLossCategory(raw, level1Catalog) ?? (raw.trim() ? [raw.trim()] : [])))];
  return { isPath: false, parts: legacy };
}

export type RankRow = { name: string; count: number };

export type SubCodeRow = {
  key: string;
  parts: string[];
  count: number;
};

/** Rincian sub-kode (Code 2 › Code 3) di bawah satu Code 1, hanya yang punya masalah (> 0). */
export function meetingSubCodeBreakdown(
  problems: DmPublicMeetingProblem[],
  code1Label: string,
  catalog: DmPublicAbnormalCategory[] = []
): SubCodeRow[] {
  const counts = new Map<string, { parts: string[]; count: number }>();
  for (const problem of problems) {
    if (!meetingLabelsAtLevel(problem, 1, catalog).includes(code1Label)) continue;
    const path = meetingCategoryPath(problem, catalog);
    const subParts = path.isPath ? path.parts.slice(1) : [];
    const parts = subParts.length > 0 ? subParts : ["Lainnya / tanpa sub-kode"];
    const key = parts.join(" › ");
    const prev = counts.get(key);
    if (prev) prev.count += 1;
    else counts.set(key, { parts, count: 1 });
  }
  return [...counts.entries()]
    .map(([key, value]) => ({ key, parts: value.parts, count: value.count }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/** Hitung per kategori, tampilkan semua kategori baku, urut dari terbanyak. */
export function rankCategories(names: string[], all: string[]): RankRow[] {
  const counts = new Map(all.map((name) => [name, 0]));
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const ia = all.indexOf(a.name);
      const ib = all.indexOf(b.name);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
}

/** Peringkat 5M+1E: selalu tampilkan ke-6 kategori 5M+1E agar konsisten. */
export function papercardRank(items: DmPublicPapercardProblem[]): RankRow[] {
  const names = items.flatMap((item) => {
    const name = papercardCategory(item.category);
    return name ? [name] : [];
  });
  return rankCategories(names, PAPERCARD_CATEGORIES);
}

/** Peringkat masalah DM/Workshop meeting berdasarkan level Code 1, Code 2, atau Code 3. */
export function meetingRank(
  problems: DmPublicMeetingProblem[],
  level: AbnormalLevel = 1,
  catalog: DmPublicAbnormalCategory[] = []
): RankRow[] {
  const names = problems.flatMap((problem) => meetingLabelsAtLevel(problem, level, catalog));
  if (level === 1) {
    const level1Catalog = catalog.filter((item) => item.level === 1);
    const baseline = level1Catalog.length
      ? level1Catalog.map(categoryLabelOf)
      : LOSS_CATEGORIES.map((category) => category.label);
    return rankCategories(names, baseline);
  }
  return rankCategories(names, []);
}
