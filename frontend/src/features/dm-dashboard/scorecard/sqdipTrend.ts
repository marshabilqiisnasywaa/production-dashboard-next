import { loadSqdip } from "../admin/sqdip/sqdipImport";
import { DIMS, type DimKey, type DimKind } from "../admin/sqdip/sqdipModel";
import { leaderScores } from "./data";

export type SqdipTrend = {
  name: DimKey;
  dates: string[];
  series: number[];
  target: number;
  dir: "max" | "min";
  kind: DimKind;
};

type Scope = { leader: string | null; dm: string | null };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const round = (value: number) => Math.round(value * 100) / 100;

export function formatTrendDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? ""}`;
}

export function buildSqdipTrend(dim: DimKey, from: string, to: string, scope: Scope): SqdipTrend {
  const config = DIMS.find((item) => item.key === dim) ?? DIMS[0];
  const index = DIMS.indexOf(config);
  const factor = config.kind === "pct" ? 100 : 1;
  const empty: SqdipTrend = {
    name: config.key,
    dates: [],
    series: [],
    target: round(config.target * factor),
    dir: config.dir,
    kind: config.kind,
  };

  const dataset = loadSqdip();
  if (!dataset) return empty;

  const byDate = new Map<string, { sum: number; count: number }>();

  for (const row of dataset.rows) {
    if (row.date < from || row.date > to) continue;
    if (scope.leader) {
      if (row.leader.toLowerCase() !== scope.leader.toLowerCase()) continue;
    } else if (scope.dm && leaderScores.find((item) => item.line === row.line)?.dm !== scope.dm) {
      continue;
    }
    const actual = row.cells[index]?.actual;
    if (actual === null || actual === undefined) continue;
    const entry = byDate.get(row.date) ?? { sum: 0, count: 0 };
    entry.sum += actual;
    entry.count += 1;
    byDate.set(row.date, entry);
  }

  const dates = [...byDate.keys()].sort();

  return {
    ...empty,
    dates,
    series: dates.map((date) => {
      const entry = byDate.get(date)!;
      return round((entry.sum / entry.count) * factor);
    }),
  };
}