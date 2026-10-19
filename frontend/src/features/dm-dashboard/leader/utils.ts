import type {
  DateRangeKey,
  InspectionRow,
  TrendGranularity,
  TrendPoint,
} from "./types";

export const TARGET = 90;

export type Tone = "ok" | "warn" | "bad";

export function rate(submitted: number, total: number): number {
  return total === 0 ? 0 : Math.round((submitted / total) * 100);
}

export function toneFor(value: number, target = TARGET): Tone {
  if (value >= target) return "ok";
  if (value >= target - 10) return "warn";
  return "bad";
}

export const TONE_LABEL: Record<Tone, string> = {
  ok: "di atas target",
  warn: "perlu perhatian",
  bad: "di bawah target",
};

/* ---------- dates (UTC based so SSR/CSR never disagree) ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const parseISO = (s: string) => new Date(`${s}T00:00:00Z`);
const toISO = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

export function getRange(range: DateRangeKey, today: string): { from: string; to: string } {
  switch (range) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
  }
}

export function filterByRange(rows: InspectionRow[], from: string, to: string): InspectionRow[] {
  return rows.filter((r) => r.date >= from && r.date <= to);
}

/** Number of days in an inclusive range */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000) + 1;
}

/* ---------- trend aggregation ---------- */

export function periodKey(date: string, g: TrendGranularity): string {
  if (g === "day") return date;
  if (g === "month") return date.slice(0, 7);
  // week -> Monday of that week
  const dow = parseISO(date).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}

export function periodLabel(key: string, g: TrendGranularity): string {
  if (g === "month") {
    const [y, m] = key.split("-");
    return `${MONTHS[Number(m) - 1]} ${y}`;
  }
  const d = parseISO(key);
  const base = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return g === "week" ? `Mgg ${base}` : base;
}

export function buildTrend(rows: InspectionRow[], g: TrendGranularity): TrendPoint[] {
  const map = new Map<string, { submitted: number; total: number }>();
  for (const r of rows) {
    const k = periodKey(r.date, g);
    const acc = map.get(k) ?? { submitted: 0, total: 0 };
    acc.submitted += r.submitted;
    acc.total += r.total;
    map.set(k, acc);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      key,
      label: periodLabel(key, g),
      value: rate(v.submitted, v.total),
      submitted: v.submitted,
      total: v.total,
    }));
}

export function sumRate(rows: InspectionRow[]): number | null {
  const total = rows.reduce((s, r) => s + r.total, 0);
  if (total === 0) return null;
  return rate(
    rows.reduce((s, r) => s + r.submitted, 0),
    total,
  );
}

/* ---------- CSV export ---------- */

export function toCsv(rows: InspectionRow[]): string {
  const head = ["Tanggal", "Line", "Tipe", "Leader Line", "ME", "PE", "IPQC", "Total", "Papercard", "Inspection Rate"];
  const lines = rows.map((r) =>
    [
      r.date,
      r.line,
      r.type,
      r.statuses.leader,
      r.statuses.me,
      r.statuses.pe,
      r.statuses.ipqc,
      r.total,
      r.submitted,
      `${rate(r.submitted, r.total)}%`,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [head.join(","), ...lines].join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
