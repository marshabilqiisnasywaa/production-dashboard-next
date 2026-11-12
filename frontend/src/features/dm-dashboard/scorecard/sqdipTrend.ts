import { DIMS, type DimKey, type DimKind } from "../admin/sqdip/sqdipModel";
import { bucketKey, type ScorecardLine, type TrendGranularity } from "./useScorecardData";

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

function isoWeekLabel(monday: string) {
  const thursday = new Date(`${monday}T00:00:00Z`);
  thursday.setUTCDate(thursday.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const week = Math.floor((thursday.getTime() - Date.UTC(year, 0, 1)) / 86400000 / 7) + 1;
  return `${year}W${week}`;
}

export function formatTrendDate(date: string, granularity: TrendGranularity = "Harian") {
  if (granularity === "Mingguan") return isoWeekLabel(bucketKey(date, "Mingguan"));
  if (granularity === "Tahunan") return date.slice(0, 4);
  const [year, month, day] = date.split("-");
  const monthName = MONTHS[Number(month) - 1] ?? "";
  if (granularity === "Bulanan") return `${monthName} ${year}`;
  return `${Number(day)} ${monthName}`;
}

export function buildSqdipTrend(
  dim: DimKey,
  lines: ScorecardLine[],
  granularity: TrendGranularity = "Harian"
): SqdipTrend {
  const config = DIMS.find((item) => item.key === dim) ?? DIMS[0];
  const index = DIMS.indexOf(config);
  const factor = config.kind === "pct" ? 100 : 1;

  const byDate = new Map<string, { sum: number; count: number }>();
  for (const line of lines) {
    for (const day of line.sqdip) {
      if (!day.final) continue;
      const actual = day.actuals[index];
      if (actual === null || actual === undefined) continue;
      const key = bucketKey(day.date, granularity);
      const entry = byDate.get(key) ?? { sum: 0, count: 0 };
      entry.sum += actual;
      entry.count += 1;
      byDate.set(key, entry);
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