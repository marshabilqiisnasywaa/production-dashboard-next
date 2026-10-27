import type { AspectResult, HeatRow, PapercardResult, RoleKey } from "./types";
import { ROLE_LABEL, ROLE_ORDER } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const WEEKDAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const WEEKDAY_LONG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/* ---------- dates (all local, "yyyy-mm-dd") ---------- */

export const parseDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
};
export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(date: string, n: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** Monday of the week that contains `date` (weeks run Monday to Sunday) */
export function mondayOf(date: string): string {
  const d = parseDate(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateStr(d);
}

export const weekDays = (weekStart: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

export function dayHeader(date: string): { weekday: string; day: number } {
  const d = parseDate(date);
  return { weekday: WEEKDAY_SHORT[d.getDay()], day: d.getDate() };
}

export function formatLongDate(date: string): string {
  const d = parseDate(date);
  return `${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "19 – 25 Okt 2026", "26 Okt – 1 Nov 2026" or "28 Des 2026 – 3 Jan 2027" */
export function formatWeekRange(weekStart: string): string {
  const s = parseDate(weekStart);
  const e = parseDate(addDays(weekStart, 6));
  if (s.getFullYear() !== e.getFullYear()) {
    return `${s.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
  }
  if (s.getMonth() !== e.getMonth()) {
    return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
  }
  return `${s.getDate()} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
}

export function weekOptions(currentWeek: string, count: number): { value: string; label: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const value = addDays(currentWeek, -7 * i);
    return { value, label: i === 0 ? `${formatWeekRange(value)} (minggu ini)` : formatWeekRange(value) };
  });
}

/** ISO or "HH:mm" -> "08:12" */
export function formatTimeHm(value: string | null): string | null {
  if (!value) return null;
  if (!value.includes("T")) return value.slice(0, 5);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------- heatmap ---------- */

/**
 * Builds the 4 role rows x 7 day columns.
 * If a role has several papercards on the same day (PRD Q-07), the one with the most NG wins,
 * so an NG can never be hidden behind an OK.
 */
export function buildHeatRows(days: string[], results: PapercardResult[], today: string): HeatRow[] {
  const best = new Map<string, PapercardResult>();
  for (const r of results) {
    const key = `${r.date}:${r.role}`;
    const current = best.get(key);
    if (!current || r.ngCount > current.ngCount) best.set(key, r);
  }

  return ROLE_ORDER.map((role) => ({
    role,
    label: ROLE_LABEL[role],
    cells: days.map((date) => {
      const result = best.get(`${date}:${role}`) ?? null;
      const state = result ? (result.ngCount > 0 ? "ng" : "ok") : date > today ? "future" : "missing";
      return { date, role, state, result };
    }),
  }));
}

export function countCells(rows: HeatRow[]): { ok: number; ng: number } {
  let ok = 0;
  let ng = 0;
  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.state === "ok") ok += 1;
      if (cell.state === "ng") ng += 1;
    }
  }
  return { ok, ng };
}

/** How many papercards of this role had the same aspect as NG in the loaded week (for the "Berulang" tag). */
export function recurrenceCount(results: PapercardResult[], role: RoleKey, aspectKey: string): number {
  return results.filter((r) => r.role === role && r.aspects.some((a) => a.key === aspectKey && a.status === "NG")).length;
}

/* ---------- checklist grouping for the detail panel ---------- */

export interface AspectGroup {
  title: string | null;
  aspects: AspectResult[];
}
export interface AspectCategory {
  id: string;
  name: string;
  ngCount: number;
  okCount: number;
  groups: AspectGroup[];
}

/** category > group > aspects, keeping the order of the checklist */
export function groupAspects(aspects: AspectResult[]): AspectCategory[] {
  const categories: AspectCategory[] = [];
  for (const a of aspects) {
    let cat = categories.find((c) => c.id === a.categoryId);
    if (!cat) {
      cat = { id: a.categoryId, name: a.categoryName, ngCount: 0, okCount: 0, groups: [] };
      categories.push(cat);
    }
    let group = cat.groups.find((g) => g.title === a.groupTitle);
    if (!group) {
      group = { title: a.groupTitle, aspects: [] };
      cat.groups.push(group);
    }
    group.aspects.push(a);
    if (a.status === "NG") cat.ngCount += 1;
    else cat.okCount += 1;
  }
  return categories;
}
