/**
 * Mock Leader template (Line x Role x Version, BR-01).
 * TODO: replace with the template fetched from the Template Manager API.
 * Manusia comes from the Figma design; the other categories are PLACEHOLDERS
 * with the right item counts (Mesin 5, Material 6, Metode 4, 5S 5, Lainnya 2).
 * Real item text lives in Template_DM.xlsx (sheet Leader).
 */
import type { ChecklistCategory, ChecklistTemplate, WindowState } from "./types";

function placeholders(id: string, name: string, count: number): ChecklistCategory {
  return {
    id,
    name,
    groups: [
      {
        id: `${id}-g1`,
        items: Array.from({ length: count }, (_, i) => ({
          id: `${id}-${i + 1}`,
          number: i + 1,
          title: `Item ${name} ${i + 1} (placeholder)`,
        })),
      },
    ],
  };
}

const MANUSIA: ChecklistCategory = {
  id: "manusia",
  name: "Manusia",
  groups: [
    {
      id: "manusia-pos",
      title: "Pengecekan POS Penting",
      items: [
        { id: "m-1", number: 1, title: "Ada penandaan pada pos pergerakan operator", askPosName: true },
        { id: "m-2", number: 2, title: "Mengetahui nama leader" },
        { id: "m-3", number: 3, title: "Telah melalui training JI" },
        { id: "m-4", number: 4, title: "Pengerjaan operator tidak mengalami abnormal" },
        { id: "m-5", number: 5, title: "Apakah ada pergantian operator" },
        { id: "m-6", number: 6, title: "Apakah sudah dilakukan JI" },
        { id: "m-7", number: 7, title: "Apakah pengerjaan operator mengalami abnormal" },
      ],
    },
    {
      id: "manusia-esd",
      title: "ESD",
      items: [{ id: "m-8", number: 8, title: "Kipas ion / gelang statis sesuai aturan" }],
    },
    {
      id: "manusia-sampling",
      title: "Sampling nama POS yang diperiksa",
      items: [
        { id: "m-9", number: 9, title: "Operator bekerja sesuai SOP" },
        { id: "m-10", number: 10, title: "Operator bisa menghafal pekerjaan di SOP" },
        { id: "m-11", number: 11, title: "Operator tahu ketentuan yang harus ditaati" },
      ],
    },
  ],
};

export const LEADER_TEMPLATE: ChecklistTemplate = {
  id: "leader-v1",
  version: 1,
  window: { start: "08:00", end: "09:00" },
  // The single rule template (PRD 8.3): used by every item's "Lihat aturan".
  rule: {
    ok: "OK jika tidak ada masalah pada item ini.",
    ng: "NG jika ada abnormal. Wajib isi penyebab dan solusi yang spesifik.",
  },
  categories: [
    MANUSIA,
    placeholders("mesin", "Mesin", 5),
    placeholders("material", "Material", 6),
    placeholders("metode", "Metode", 4),
    placeholders("5s", "5S", 5),
    placeholders("lainnya", "Lainnya", 2),
  ],
};

// Q-10: line code format is still open (501 vs TAC20601). TODO: lines come from Tim DM (FR-1.4).
export const PAPERCARD_LINES = ["501", "502", "503"];

export const PAPERCARD_CONFIG: {
  shift: string;
  /** Dev only: force the banner state to preview it outside 08:00–09:00. null = real clock. */
  simulateWindow: Exclude<WindowState, "loading"> | null;
} = {
  shift: "Shift 1",
  simulateWindow: null,
};
