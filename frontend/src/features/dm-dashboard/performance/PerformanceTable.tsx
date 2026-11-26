"use client";

import type { CSSProperties } from "react";
import { METRICS, MONTHS, completedQuarters, filledMonths, fmt, meets, periodValue } from "./performanceModel";
import type { RowKind, YearData } from "./performanceModel";

/* ===== Warna: semua netral (abu & putih). Merah hanya untuk angka yang tidak capai target. ===== */
const LINE = "1px solid #eceef1"; // garis antar baris/kolom (tipis)
const GROUP_LINE = "1px solid #cfd4da"; // garis pemisah antar KPI (OTP | OUTPUT | WIP | OPE)
const SECTION_LINE = "1px solid #cfd4da"; // garis pemisah bulan | Q | tahun
const TEXT = "#111827";
const MUTED = "#6b7280";
const MISS_BG = "#fdecee";
const MISS_TEXT = "#b42318";

const cell: CSSProperties = {
  padding: "9px 12px",
  borderBottom: LINE,
  textAlign: "center",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
  fontSize: 13,
  color: TEXT,
  background: "#ffffff",
};

const head: CSSProperties = {
  ...cell,
  padding: "10px 12px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: MUTED,
  background: "#f8f9fa",
  borderBottom: "1px solid #e1e4e8",
};

const stickyLabel: CSSProperties = { position: "sticky", left: 0, zIndex: 1, minWidth: 84 };
const stickyKind: CSSProperties = { position: "sticky", left: 84, zIndex: 1, minWidth: 72 };

/** Tabel detail KPI. Kolom bulan, Q, dan tahun dihitung otomatis dari data. */
export default function PerformanceTable({
  year,
  data,
  highlight = [],
}: {
  year: string;
  data: YearData;
  highlight?: number[];
}) {
  const months = filledMonths(data);
  const periods = [...completedQuarters(data), { label: year, months }];

  return (
    <div style={{ width: "100%", overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 12, background: "#ffffff" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13, color: TEXT }}>
        <thead>
          <tr>
            <th scope="col" style={{ ...head, ...stickyLabel, textAlign: "left" }}>KPI</th>
            <th scope="col" style={{ ...head, ...stickyKind, textAlign: "left" }}></th>
            {months.map((i) => (
              <th scope="col" key={i} style={head}>{MONTHS[i]}</th>
            ))}
            {periods.map((period, n) => (
              <th
                scope="col"
                key={period.label}
                style={{
                  ...head,
                  color: period.label === year ? TEXT : MUTED,
                  borderLeft: n === 0 ? SECTION_LINE : undefined,
                }}
              >
                {period.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Satu <tbody> per KPI supaya tiap grup (OTP, OUTPUT, WIP, OPE) kelihatan terpisah */}
        {METRICS.map((metric, groupIndex) => (
          <tbody key={metric.key}>
            {(["target", "actual"] as RowKind[]).map((kind) => {
              const values = data[metric.key];
              const isActual = kind === "actual";
              const isFirstRow = !isActual;
              const topBorder = isFirstRow && groupIndex > 0 ? { borderTop: GROUP_LINE } : undefined;

              return (
                <tr key={`${metric.key}-${kind}`}>
                  {isFirstRow && (
                    <th
                      scope="rowgroup"
                      rowSpan={2}
                      style={{
                        ...cell,
                        ...stickyLabel,
                        ...topBorder,
                        textAlign: "left",
                        fontWeight: 700,
                        borderBottom: "none",
                      }}
                    >
                      {metric.key}
                    </th>
                  )}
                  <th
                    scope="row"
                    style={{
                      ...cell,
                      ...stickyKind,
                      ...topBorder,
                      textAlign: "left",
                      fontWeight: 500,
                      color: MUTED,
                    }}
                  >
                    {isActual ? "Actual" : "Target"}
                  </th>

                  {months.map((i) => {
                    const ok = meets(metric, values.actual[i], values.target[i]);
                    const miss = isActual && ok === false;
                    return (
                      <td
                        key={i}
                        style={{
                          ...cell,
                          ...topBorder,
                          fontWeight: isActual ? 600 : 400,
                          color: isActual ? (miss ? MISS_TEXT : TEXT) : MUTED,
                          background: miss ? MISS_BG : highlight.includes(i) ? "#f3f4f6" : "#ffffff",
                        }}
                      >
                        {fmt(values[kind][i], metric.unit, metric.decimals[kind])}
                      </td>
                    );
                  })}

                  {periods.map((period, n) => {
                    const total = periodValue(values, period.months);
                    const ok = meets(metric, total.actual, total.target);
                    const miss = isActual && ok === false;
                    return (
                      <td
                        key={period.label}
                        style={{
                          ...cell,
                          ...topBorder,
                          fontWeight: isActual ? 700 : 500,
                          color: isActual ? (miss ? MISS_TEXT : TEXT) : MUTED,
                          background: miss ? MISS_BG : "#ffffff",
                          borderLeft: n === 0 ? SECTION_LINE : undefined,
                        }}
                      >
                        {fmt(total[kind], metric.unit, metric.decimals[kind])}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}