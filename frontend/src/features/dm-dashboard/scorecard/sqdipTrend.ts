import { DIMS, type DimKey, type DimKind } from "../admin/sqdip/sqdipModel";
import type { ScorecardLine } from "./useScorecardData";

export type SqdipTrend = {
  name: DimKey;
  dates: string[];
  series: number[];
  target: number;
  dir: "max" | "min";
  kind: DimKind;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const round = (value: number) => Math.round(value * 100) / 100;

export function formatTrendDate(
  date: string,
  granularity: "Harian" | "Mingguan" | "Bulanan" = "Harian"
) {
  const [year, month, day] = date.split("-");
  const monthName = MONTHS[Number(month) - 1] ?? "";
  if (granularity === "Bulanan") return `${monthName} ${year}`;
  if (granularity === "Mingguan") return `Mgg ${Number(day)} ${monthName}`;
  return `${Number(day)} ${monthName}`;
}

export function buildSqdipTrend(dim: DimKey, lines: ScorecardLine[]): SqdipTrend {
  const config = DIMS.find((item) => item.key === dim) ?? DIMS[0];
  const index = DIMS.indexOf(config);
  const factor = config.kind === "pct" ? 100 : 1;

  const byDate = new Map<string, { sum: number; count: number }>();
  for (const line of lines) {
    for (const day of line.sqdip) {
      if (!day.final) continue;
      const actual = day.actuals[index];
      if (actual === null || actual === undefined) continue;
      const entry = byDate.get(day.date) ?? { sum: 0, count: 0 };
      entry.sum += actual;
      entry.count += 1;
      byDate.set(day.date, entry);
    }
  }

  const dates = [...byDate.keys()].sort();

  return {
    name: config.key,
    dates,
    series: dates.map((date) => {
      const entry = byDate.get(date)!;
      return round((entry.sum / entry.count) * factor);
    }),
    target: round(config.target * factor),
    dir: config.dir,
    kind: config.kind,
  };
}
