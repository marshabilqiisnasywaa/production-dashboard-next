"use client";

import { useEffect, useMemo, useState } from "react";
import "./problems.css";
import { Card } from "@/components/ui/Card";
import { ProblemTable } from "./components/ProblemTable";
import { ProblemLoadError } from "./components/ProblemLoadError";
import { useProblems } from "./hooks/useProblems";
import type { ProblemFilter } from "./types";

export default function ProblemsPage({
  adminLayout = false,
}: {
  adminLayout?: boolean;
}) {
  const { rows, counts, ready, error, refresh } = useProblems();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProblemFilter>("all");
  const [lineFilter, setLineFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");

  const lines = useMemo(
    () => [...new Set(rows.map((r) => r.line).filter((line) => line && line !== "-"))].sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((r) => {
      const matchesSearch =
        !q ||
        [r.problem, r.line, r.picName, r.sessionLabel, r.date]
          .some((value) => String(value ?? "").toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" || r.status === statusFilter;

      const matchesLine =
        lineFilter === "all" || r.line === lineFilter;

      const matchesDue =
        dueFilter === "all" ||
        (dueFilter === "overdue" && r.status === "escalated") ||
        (dueFilter === "not-overdue" && r.status !== "escalated");

      return matchesSearch && matchesStatus && matchesLine && matchesDue;
    });
  }, [rows, search, statusFilter, lineFilter, dueFilter]);

  const hasFilters =
    search !== "" ||
    statusFilter !== "all" ||
    lineFilter !== "all" ||
    dueFilter !== "all";

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setLineFilter("all");
    setDueFilter("all");
  }

  return (
    <div className={"dml-pb" + (adminLayout ? " is-admin" : "")}>
      {!adminLayout && (
        <div className="dml-page-head dml-pb-heading">
          <div>
            <h1>Tracking Masalah</h1>
            <p>
              Pantau penanggung jawab, tenggat waktu, dan status tindak lanjut
              dari DM meeting.
            </p>
          </div>
        </div>
      )}

      <div className="dml-pb-summary">
        <div className="dml-pb-stat">
          <span className="dml-pb-stat__label">Total Masalah</span>
          <strong>{counts.all}</strong>
          <span className="dml-pb-stat__note">Semua masalah tercatat</span>
        </div>

        <div className="dml-pb-stat">
          <span className="dml-pb-stat__label">Belum Selesai</span>
          <strong>{counts.unsolved}</strong>
          <span className="dml-pb-stat__note">Perlu ditindaklanjuti</span>
        </div>

        <div className="dml-pb-stat">
          <span className="dml-pb-stat__label">Selesai</span>
          <strong>{counts.solved}</strong>
          <span className="dml-pb-stat__note">Tindak lanjut selesai</span>
        </div>

        <div className="dml-pb-stat">
          <span className="dml-pb-stat__label">Eskalasi SPV</span>
          <strong>{counts.escalated}</strong>
          <span className="dml-pb-stat__note">Perlu perhatian supervisor</span>
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
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="dml-pb-filters">
            <select
              aria-label="Filter status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ProblemFilter)
              }
            >
              <option value="all">Semua status ({counts.all})</option>
              <option value="unsolved">Belum selesai ({counts.unsolved})</option>
              <option value="escalated">Eskalasi SPV ({counts.escalated})</option>
              <option value="solved">Selesai ({counts.solved})</option>
            </select>

            <select
              aria-label="Filter line"
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
            >
              <option value="all">Semua line</option>
              {lines.map((line) => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter tenggat"
              value={dueFilter}
              onChange={(e) => setDueFilter(e.target.value)}
            >
              <option value="all">Semua tenggat</option>
              <option value="overdue">Terlambat</option>
              <option value="not-overdue">Belum terlambat</option>
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

        <div className="dml-pb-result-count">
          Menampilkan <strong>{visible.length}</strong> dari{" "}
          <strong>{rows.length}</strong> masalah
        </div>

        {error ? <ProblemLoadError error={error} onRetry={refresh} /> : ready ? (
          <ProblemTable rows={visible} />
        ) : (
          <div className="dml-empty">Memuat masalah…</div>
        )}
      </section>
    </div>
  );
}
