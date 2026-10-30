import { useEffect, useState } from "react";
import { loadSqdip } from "../admin/sqdip/sqdipImport";
import {
  formatScore,
  leaderScores,
  SQDIP_DIMS,
  type SqdipDimKey,
  type SqdipMonthly,
} from "./data";
import { DetailHeader } from "./components";

const MAX = 6;
const EPS = 0.004;
const TH = "whitespace-nowrap px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.02em]";
// urutan sama dengan DIMS di admin: Safety, Quality, Delivery, Inventory, Productivity
const KEYS: SqdipDimKey[] = ["safety", "quality", "delivery", "inventory", "productivity"];

// Rata-rata poin harian (0/6) per leader dalam rentang tanggal
function aggregateFromAdmin(from: string, to: string): SqdipMonthly[] {
  const dataset = loadSqdip();
  if (!dataset) return [];
  const map = new Map<string, { line: string; leader: string; sum: number[]; days: number }>();
  for (const row of dataset.rows) {
    if (row.date < from || row.date > to) continue;
    const key = `${row.line}|${row.leader}`;
    const entry = map.get(key) ?? { line: row.line, leader: row.leader, sum: [0, 0, 0, 0, 0], days: 0 };
    row.cells.forEach((cell, i) => { entry.sum[i] += cell.points; });
    entry.days += 1;
    map.set(key, entry);
  }
  return [...map.values()].map((e) => ({
    line: e.line,
    leader: e.leader,
    dm: leaderScores.find((l) => l.line === e.line)?.dm ?? "-",
    scores: Object.fromEntries(KEYS.map((k, i) => [k, e.sum[i] / e.days])) as Record<SqdipDimKey, number>,
  }));
}
const thStyle = (align: "left" | "center") =>
  ({
    textAlign: align,
    color: "var(--color-text-secondary)",
    background: "var(--color-section)",
  }) as const;

function totalOf(row: SqdipMonthly) {
  return SQDIP_DIMS.reduce((sum, dim) => sum + row.scores[dim.key], 0);
}

function chipClass(value: number) {
  return value >= MAX - EPS ? "sqdip-chip is-full" : "sqdip-chip is-miss";
}

function lowestKeys(row: SqdipMonthly): Set<string> {
  const values = SQDIP_DIMS.map((dim) => row.scores[dim.key]);
  const min = Math.min(...values);
  if (min >= MAX - EPS) return new Set();
  return new Set(SQDIP_DIMS.filter((dim) => row.scores[dim.key] - min < EPS).map((dim) => dim.key));
}

export function SqdipSummary({ dm, startDate, endDate }: { dm: string; startDate: string; endDate: string }) {
  const [data, setData] = useState<SqdipMonthly[]>([]);

  useEffect(() => {
    const sync = () => setData(aggregateFromAdmin(startDate, endDate));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [startDate, endDate]);

  const rows = data
    .filter((row) => dm === "Semua" || row.dm === dm)
    .sort((a, b) => totalOf(b) - totalOf(a));

  if (rows.length === 0) {
    return (
      <div className="flex min-h-empty items-center justify-center rounded-xl border border-border text-sm text-text-secondary">
        Belum ada data SQDIP pada periode ini. Impor data di Admin → SQDIP Monitoring.
      </div>
    );
  }

  const average = (value: (row: SqdipMonthly) => number) =>
    rows.reduce((sum, row) => sum + value(row), 0) / rows.length;

  return (
    <>
      <DetailHeader canExport={false} caption="" />
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full table-auto text-left text-sm">
          <caption className="sr-only">Skor SQDIP bulanan per leader</caption>
          <thead>
            <tr>
              <th scope="col" className={TH} style={thStyle("left")}>Line</th>
              <th scope="col" className={TH} style={thStyle("left")}>Nama Leader</th>
              {SQDIP_DIMS.map((dim, index) => (
                <th
                  key={dim.key}
                  scope="col"
                  style={thStyle("center")}
                  className={`${TH} border-l border-border${index === SQDIP_DIMS.length - 1 ? " border-r" : ""}`}
                >
                  {dim.label}
                </th>
              ))}
              <th scope="col" className={TH} style={thStyle("center")}>Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const lowest = lowestKeys(row);
              return (
                <tr key={`${row.line}-${row.leader}`} className="hover:bg-section/60">
                  <td className="whitespace-nowrap px-4 py-3 text-left font-semibold">{row.line}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-left">{row.leader}</td>
                  {SQDIP_DIMS.map((dim, index) => {
                    const value = row.scores[dim.key];
                    const lost = MAX - value;
                    return (
                      <td
  key={dim.key}
  title={`${dim.label} ${formatScore(value)} dari ${formatScore(MAX)}${lost > EPS ? `, kurang ${formatScore(lost)}` : ""}`}
  className={`whitespace-nowrap border-l border-border px-4 py-3 text-center${index === SQDIP_DIMS.length - 1 ? " border-r" : ""}`}
>
  <span className={chipClass(value)}>{formatScore(value)}</span>
</td>
                    );
                  })}
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                    {formatScore(totalOf(row))} / {formatScore(MAX * SQDIP_DIMS.length)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-border bg-section">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-left font-semibold text-text-secondary">Rata-rata</td>
              {SQDIP_DIMS.map((dim, index) => (
                <td
                  key={dim.key}
                  className={`whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold${index === SQDIP_DIMS.length - 1 ? " border-r" : ""}`}
                >
                  {formatScore(average((row) => row.scores[dim.key]))}
                </td>
              ))}
              <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                {formatScore(average(totalOf))} / {formatScore(MAX * SQDIP_DIMS.length)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

export default SqdipSummary;