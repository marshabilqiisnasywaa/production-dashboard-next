"use client";

import { useEffect, useRef } from "react";
import { useUiText } from "@/locales/useUiText";
import { IconCheck, IconClock } from "@/components/ui/icons";
import type { HeatCell, HeatRow, ViewMode } from "../types";
import { dayHeader, formatLongDate } from "../utils";

interface Props {
  days: string[];
  rows: HeatRow[];
  today: string;
  mode: ViewMode;
  selectedId: string | null;
  onOpen: (resultId: string) => void;
}

function cellLabel(roleLabel: string, cell: HeatCell): string {
  const r = cell.result;
  if (!r) return "";
  const verdict = r.ngCount > 0 ? `NG, ${r.ngCount} aspek` : "OK, semua aspek OK";
  return `${roleLabel}, ${formatLongDate(cell.date)}: ${verdict}${r.late ? ", terlambat" : ""}`;
}

export function ResultsHeatmap({ days, rows, today, mode, selectedId, onOpen }: Props) {
  const { text: uiText } = useUiText();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollLeft = gridRef.current.scrollWidth;
    }
  }, [days]);

  return (
    <div className="dmr-gridwrap dmr-matrix-viewport" ref={gridRef}>
      <table
        className="dmr-grid"
        style={{ minWidth: `${Math.max(620, 132 + days.length * 52)}px` }}
      >
        <thead>
          <tr>
            <th scope="col" className="dmr-grid__corner">{uiText("Role")}</th>
            {days.map((d) => {
              const h = dayHeader(d);
              return (
                <th key={d} scope="col" className={d === today ? "is-today" : undefined}>
                  <span>
                    {h.weekday} {h.day}
                  </span>
                  {d === today && <i aria-label={uiText("Hari ini")} className="dmr-dot" />}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {uiText(rows.map((row) => (
            <tr key={row.role}>
              <th scope="row" className="dmr-grid__role">
                {uiText(row.label)}
              </th>
              {row.cells.map((cell) => {
                const r = cell.result;
                const td = cell.date === today ? "is-today" : undefined;

                if (r && (cell.state === "ok" || cell.state === "ng")) {
                  const dim = mode === "ng" && cell.state === "ok";
                  const label = cellLabel(row.label, cell);
                  return (
                    <td key={cell.date} className={td}>
                      <button
                        type="button"
                        className={`dmr-cell dmr-cell--${cell.state}${dim ? " is-dim" : ""}${selectedId === r.id ? " is-selected" : ""}`}
                        aria-label={uiText(label)}
                        title={uiText(label)}
                        onClick={() => onOpen(r.id)}
                      >
                        {cell.state === "ok" ? <IconCheck size={18} /> : <span>{r.ngCount}</span>}
                        {r.late && (
                          <span className="dmr-cell__late" aria-hidden="true">
                            <IconClock size={12} />
                          </span>
                        )}
                      </button>
                    </td>
                  );
                }

                if (cell.state === "missing") {
                  return (
                    <td key={cell.date} className={td}>
                      <span className="dmr-cell dmr-cell--missing" title={uiText("Belum diisi. Lihat Inspection Rate.")}>
                        –
                      </span>
                    </td>
                  );
                }

                return (
                  <td key={cell.date} className={td}>
                    <span className="dmr-cell dmr-cell--future" aria-hidden="true" />
                  </td>
                );
              })}
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  );
}
