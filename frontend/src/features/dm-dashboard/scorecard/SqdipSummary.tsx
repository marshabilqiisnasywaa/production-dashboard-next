import { useEffect, useState } from "react";
import { loadSqdip } from "../admin/sqdip/sqdipImport";
import { DIMS, type SqdipLeaderDay } from "../admin/sqdip/sqdipModel";
import { formatScore, leaderScores, SQDIP_DIMS } from "./data";
import { DetailHeader, matchesQuery, searchOptions } from "./components";

const MAX = 6;
const TH = "whitespace-nowrap px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.02em]";

type DayRow = SqdipLeaderDay & { dm: string; sum: number };

function loadRows(from: string, to: string): DayRow[] {
  const dataset = loadSqdip();
  if (!dataset) return [];
  return dataset.rows
    .filter((row) => row.date >= from && row.date <= to)
    .map((row) => ({
      ...row,
      dm: leaderScores.find((item) => item.line === row.line)?.dm ?? "-",
      sum: row.cells.reduce((total, cell) => total + cell.points, 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.line.localeCompare(b.line) || a.leader.localeCompare(b.leader));
}

function actualText(index: number, actual: number | null) {
  if (actual === null) return "belum diisi";
  const dim = DIMS[index];
  const value = dim.kind === "pct" ? Math.round(actual * 10000) / 100 : actual;
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}${dim.kind === "pct" ? "%" : ""}`;
}

const thStyle = (align: "left" | "center") =>
  ({
    textAlign: align,
    color: "var(--color-text-secondary)",
    background: "var(--color-section)",
  }) as const;

export function SqdipSummary({ dm, startDate, endDate, query = "", onQuery }: { dm: string; startDate: string; endDate: string; query?: string; onQuery?: (value: string) => void }) {
  const [data, setData] = useState<DayRow[]>([]);

  useEffect(() => {
    const sync = () => setData(loadRows(startDate, endDate));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [startDate, endDate]);

  const scoped = data.filter((row) => dm === "Semua" || row.dm === dm);

  if (scoped.length === 0) {
    return (
      <div className="flex min-h-empty items-center justify-center rounded-xl border border-border text-sm text-text-secondary">
        Belum ada data SQDIP pada periode ini. Impor data di Admin → SQDIP Monitoring.
      </div>
    );
  }

  const rows = scoped.filter((row) => matchesQuery(query, row.line, row.leader));
  const options = searchOptions(scoped.flatMap((row) => [row.line, row.leader]));

  const average = (value: (row: DayRow) => number) =>
    rows.reduce((sum, row) => sum + value(row), 0) / rows.length;

  return (
    <>
      <DetailHeader canExport={false} caption="" query={query} onQuery={onQuery} options={options} />
      {rows.length === 0 ? (
        <div className="flex min-h-empty items-center justify-center rounded-xl border border-border text-sm text-text-secondary">Tidak ada hasil pencarian</div>
      ) : (
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full table-auto text-left text-sm">
          <caption className="sr-only">Poin SQDIP harian per leader</caption>
          <thead>
            <tr>
              <th scope="col" className={TH} style={thStyle("left")}>Tanggal</th>
              <th scope="col" className={TH} style={thStyle("left")}>Line</th>
              <th scope="col" className={TH} style={thStyle("left")}>Nama Leader</th>
              {SQDIP_DIMS.map((dim, index) => (
                <th
                  key={dim.key}
                  scope="col"
                  style={thStyle("center")}
                  className={`${TH} border-l border-border${index === SQDIP_DIMS.length - 1 ? " border-r" : ""}`}
                >
                  <span title={dim.label}>{dim.label.charAt(0)}</span>
                </th>
              ))}
              <th scope="col" className={TH} style={thStyle("center")}>Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={`${row.date}-${row.line}-${row.leader}`} className="hover:bg-section/60">
                <td className="whitespace-nowrap px-4 py-3 text-left">{row.date}</td>
                <td className="whitespace-nowrap px-4 py-3 text-left font-semibold">{row.line}</td>
                <td className="whitespace-nowrap px-4 py-3 text-left">{row.leader}</td>
                {SQDIP_DIMS.map((dim, index) => {
                  const cell = row.cells[index];
                  const points = cell?.points ?? 0;
                  return (
                    <td
                      key={dim.key}
                      title={`${dim.label}: aktual ${actualText(index, cell?.actual ?? null)} · target ${DIMS[index].label}`}
                      className={`whitespace-nowrap border-l border-border px-4 py-3 text-center${index === SQDIP_DIMS.length - 1 ? " border-r" : ""}`}
                    >
                      <span className={points >= MAX ? "sqdip-chip is-full" : "sqdip-chip is-miss"}>{points}</span>
                    </td>
                  );
                })}
                <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                  {row.sum} / {MAX * SQDIP_DIMS.length}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border bg-section">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-left font-semibold text-text-secondary">Rata-rata</td>
              {SQDIP_DIMS.map((dim, index) => (
                <td
                  key={dim.key}
                  className={`whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold${index === SQDIP_DIMS.length - 1 ? " border-r" : ""}`}
                >
                  {formatScore(average((row) => row.cells[index]?.points ?? 0), 1)}
                </td>
              ))}
              <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                {formatScore(average((row) => row.sum), 1)} / {MAX * SQDIP_DIMS.length}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      )}
    </>
  );
}

export default SqdipSummary;
