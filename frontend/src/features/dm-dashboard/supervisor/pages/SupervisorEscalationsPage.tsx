"use client";

import { useEffect, useMemo, useState } from "react";
import { ProblemTable } from "../../leader/problems/components/ProblemTable";
import { formatOverdue } from "../../leader/problems/utils";
import "../../leader/problems/problems.css";
import { useSupervisor } from "../SupervisorProvider";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function SupervisorEscalationsPage() {
  const { escalatedRows } = useSupervisor();
  const [search, setSearch] = useState("");
  const [lineFilter, setLineFilter] = useState("all");

  const lines = useMemo(
    () =>
      [
        ...new Set(
          escalatedRows.map((row) => row.line).filter((line) => line && line !== "-"),
        ),
      ].sort(),
    [escalatedRows],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    return escalatedRows.filter((row) => {
      const matchesSearch =
        !query ||
        [row.problem, row.line, row.picName, row.sessionLabel, row.date].some((value) =>
          String(value ?? "").toLowerCase().includes(query),
        );

      const matchesLine = lineFilter === "all" || row.line === lineFilter;

      return matchesSearch && matchesLine;
    });
  }, [escalatedRows, search, lineFilter]);

  const hasFilters = search !== "" || lineFilter !== "all";
  const lateOverDay = escalatedRows.filter((row) => row.overdueMs > DAY_MS).length;
  const overdueMax = escalatedRows.reduce((max, row) => Math.max(max, row.overdueMs), 0);

  function resetFilters() {
    setSearch("");
    setLineFilter("all");
  }

  return (
    <div className="dml-pb">
      <div className="dml-page-head dml-pb-heading">
        <div>
          <h1>Eskalasi Masalah</h1>
          <p>Daftar masalah bawahan yang melewati tenggat waktu (due date) dan belum diselesaikan.</p>
        </div>
      </div>

      <div className="dml-pb-summary">
        <div className="dml-pb-stat">
          <span className="dml-pb-stat__label">Total Eskalasi</span>
          <strong>{escalatedRows.length}</strong>
        </div>

        <div className="dml-pb-stat">
          <span className="dml-pb-stat__label">Terlambat &gt; 1 Hari</span>
          <strong>{lateOverDay}</strong>
        </div>

        <div className="dml-pb-stat">
          <span className="dml-pb-stat__label">Line Terdampak</span>
          <strong>{lines.length}</strong>
        </div>

        <div className="dml-pb-stat">
          <span className="dml-pb-stat__label">Terlama</span>
          <strong>{overdueMax > 0 ? formatOverdue(overdueMax) : "-"}</strong>
        </div>
      </div>

      <section className="dml-pb-panel">
        <div className="dml-pb-toolbar">
          <div className="dml-pb-search">
            <input
              type="search"
              aria-label="Cari masalah"
              placeholder="Cari masalah, PIC, line, atau sesi..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="dml-pb-filters">
            <select
              aria-label="Filter line"
              value={lineFilter}
              onChange={(event) => setLineFilter(event.target.value)}
            >
              <option value="all">Semua line</option>
              {lines.map((line) => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                type="button"
                className="dml-pb-reset"
                onClick={resetFilters}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <ProblemTable
          rows={visible}
          emptyMessage="Tidak ada masalah bawahan yang tereskalasi saat ini."
        />
      </section>
    </div>
  );
}
