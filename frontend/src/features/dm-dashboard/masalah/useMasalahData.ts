import { useEffect, useState } from "react";
import {
  publicApi,
  type DmPublicMeetingProblem,
  type DmPublicPapercardProblem,
} from "../api";
import { jakartaToday } from "../scorecard/useScorecardData";

/**
 * true  = pakai data contoh (backend belum siap)
 * false = ambil dari GET /api/public/problems/report
 * Ubah ke false setelah endpoint backend jadi, lalu hapus blok "Data contoh" di bawah.
 */
const USE_MOCK = true;

export type MasalahState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      papercard: DmPublicPapercardProblem[];
      meeting: DmPublicMeetingProblem[];
    };

/** Ambil data masalah (papercard NG + masalah DM meeting) untuk satu rentang tanggal. */
export function useMasalahData(range: { from: string; to: string }, attempt: number) {
  const [state, setState] = useState<MasalahState>({ kind: "loading" });

  useEffect(() => {
    if (!range.from || !range.to) return;
    let cancelled = false;
    setState({ kind: "loading" });

    if (USE_MOCK) {
      const timer = setTimeout(() => {
        const inRange = <T extends { date: string }>(rows: T[]) =>
          rows.filter((row) => row.date >= range.from && row.date <= range.to);
        const mock = buildMock();
        if (!cancelled)
          setState({
            kind: "ready",
            papercard: inRange(mock.papercard),
            meeting: inRange(mock.meeting),
          });
      }, 300);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    publicApi
      .problemsReport({ from: range.from, to: range.to })
      .then((data) => {
        if (!cancelled)
          setState({
            kind: "ready",
            papercard: data.papercard ?? [],
            meeting: data.meeting ?? [],
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

/* ---------- Kategori papercard (5M 1E, sesuai template papercard) ---------- */

/** Hanya kategori ini yang dihitung. Kategori lain di template (5S, 6S, Lainnya) diabaikan.
 *  Measurement tidak dipakai di template mana pun, jadi tidak ada di sini. */
export const PAPERCARD_CATEGORIES = ["Manusia", "Mesin", "Material", "Metode", "Lingkungan"];

/** Label English untuk tampilan (5M 1E). */
export const PAPERCARD_EN: Record<string, string> = {
  Manusia: "Man",
  Mesin: "Machine",
  Material: "Material",
  Metode: "Method",
  Lingkungan: "Environment",
};

/** Cocokkan nama kategori dari backend (tidak peka huruf besar/kecil, terima Indonesia atau
 *  English). Hasilnya selalu nama Indonesia. null = diabaikan. */
export function papercardCategory(raw: string) {
  const text = raw.trim().toLowerCase();
  return (
    PAPERCARD_CATEGORIES.find(
      (name) => name.toLowerCase() === text || PAPERCARD_EN[name].toLowerCase() === text
    ) ?? null
  );
}

/* ---------- Kategori loss DM meeting (P-H-T-R-Q-M) ---------- */

export const LOSS_CATEGORIES = [
  { key: "P", label: "P-Planning Losses" },
  { key: "H", label: "H-Human Losses (MP)" },
  { key: "T", label: "T-Time Losses (Overtime)" },
  { key: "R", label: "R-Result Losses (Output)" },
  { key: "Q", label: "Q-Quality Losses" },
  { key: "M", label: "M-Machine Losses" },
];

/** Dicocokkan lewat huruf depan, jadi salah ketik lama di data ("ResuIt", "M--Machine")
 *  tetap masuk kategori yang benar. null = bukan kategori loss, diabaikan. */
export function lossCategory(raw: string) {
  const text = raw.trim();
  return (
    LOSS_CATEGORIES.find(
      (category) => text.charAt(0).toUpperCase() === category.key && text.charAt(1) === "-"
    )?.label ?? null
  );
}

export type RankRow = { name: string; count: number };

/** Hitung per kategori, tampilkan semua kategori baku, urut dari terbanyak. */
export function rankCategories(names: string[], all: string[]): RankRow[] {
  const counts = new Map(all.map((name) => [name, 0]));
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || all.indexOf(a.name) - all.indexOf(b.name));
}

export function papercardRank(items: DmPublicPapercardProblem[]) {
  const names = items.flatMap((item) => {
    const name = papercardCategory(item.category);
    return name ? [name] : [];
  });
  return rankCategories(names, PAPERCARD_CATEGORIES);
}

/** Satu masalah boleh punya beberapa kategori; tiap kategori dihitung sekali per masalah. */
export function meetingRank(problems: DmPublicMeetingProblem[]) {
  const names = problems.flatMap((problem) => [
    ...new Set((problem.categories ?? []).flatMap((raw) => lossCategory(raw) ?? [])),
  ]);
  return rankCategories(names, LOSS_CATEGORIES.map((category) => category.label));
}

/* ---------- Data contoh (hapus bersama USE_MOCK setelah backend siap) ---------- */

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, rows: { value: T; weight: number }[]) {
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  let roll = rand() * total;
  for (const row of rows) {
    roll -= row.weight;
    if (roll <= 0) return row.value;
  }
  return rows[rows.length - 1].value;
}

function isoDaysAgo(days: number) {
  const date = new Date(`${jakartaToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function buildMock() {
  const rand = seeded(20261123);
  const lines = ["TAC12345", "TAC20501", "TAC20502", "TAC20505", "TAC20601", "TAC20602"];

  const papercardCategories = [
    { value: "Mesin", weight: 9 },
    { value: "Manusia", weight: 7 },
    { value: "Metode", weight: 5 },
    { value: "Material", weight: 3 },
    { value: "Lingkungan", weight: 1 },
    { value: "5S", weight: 2 }, // sengaja: harus diabaikan
    { value: "Lainnya", weight: 1 }, // sengaja: harus diabaikan
  ];
  const titles: Record<string, string[]> = {
    Mesin: ["Sensor stopper dan interlock berfungsi", "Conveyor berjalan normal"],
    Manusia: ["Operator sesuai skill matrix", "APD lengkap dipakai"],
    Metode: ["Jig dan fixture sesuai instruksi kerja"],
    Material: ["Material lot pertama lengkap di rak"],
    Lingkungan: ["Suhu dan kelembapan area sesuai"],
    "5S": ["Area kerja bersih dan rapi"],
    Lainnya: ["Temuan lain"],
  };

  // Sengaja memakai penulisan lama dari form (R-ResuIt, M--Machine) untuk menguji penyeragaman nama.
  const lossCategories = [
    { value: "H-Human Losses (MP)", weight: 8 },
    { value: "M--Machine Losses", weight: 7 },
    { value: "Q-Quality Losses", weight: 5 },
    { value: "T-Time Losses (Overtime)", weight: 3 },
    { value: "R-ResuIt Losses (Output)", weight: 3 },
    { value: "P-Planning Losses", weight: 1 },
  ];

  const papercard: DmPublicPapercardProblem[] = [];
  const meeting: DmPublicMeetingProblem[] = [];

  for (let day = 0; day < 90; day++) {
    const date = isoDaysAgo(day);
    const ngCount = Math.floor(rand() * 5);
    for (let i = 0; i < ngCount; i++) {
      const category = pick(rand, papercardCategories);
      const options = titles[category];
      papercard.push({
        date,
        lineCode: lines[Math.floor(rand() * lines.length)],
        category,
        title: options[Math.floor(rand() * options.length)],
      });
    }
    if (rand() < 0.7) {
      const first = pick(rand, lossCategories);
      const second = rand() < 0.25 ? pick(rand, lossCategories) : null;
      const categories = rand() < 0.08 ? null : second && second !== first ? [first, second] : [first];
      meeting.push({
        date,
        lineCode: lines[Math.floor(rand() * lines.length)],
        problem: "Contoh masalah dari DM meeting",
        categories,
      });
    }
  }
  return { papercard, meeting };
}