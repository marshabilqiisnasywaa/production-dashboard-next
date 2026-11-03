"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Eye, Tag, UserRound, X } from "lucide-react";
import { dmDepartments } from "@/features/dm-dashboard/api";
import {
  departmentLabel,
  normalizeDepartment,
} from "@/features/dm-dashboard/departments";
import { ProblemLoadError } from "@/features/dm-dashboard/leader/problems/components/ProblemLoadError";
import { useProblems } from "@/features/dm-dashboard/leader/problems/hooks/useProblems";
import type {
  ProblemFilter,
  ProblemRow,
  ProblemStatus,
} from "@/features/dm-dashboard/leader/problems/types";
import {
  formatMeetingDate,
  formatOverdue,
} from "@/features/dm-dashboard/leader/problems/utils";
import "@/features/dm-dashboard/leader/problems/problems.css";

const STATUS_VIEW: Record<
  ProblemStatus,
  { label: string; className: string }
> = {
  unsolved: { label: "Belum Selesai", className: "is-unsolved" },
  escalated: { label: "Eskalasi SPV", className: "is-escalated" },
  solved: { label: "Selesai", className: "is-solved" },
};

function formatDue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const HOD_STYLES = `
  .hod-problems { display: flex; flex-direction: column; gap: 16px; }
  .hod-problems .dml-page-head { margin-bottom: 0; }
  .hod-problems .dml-pb-summary { margin-bottom: 0; }
  .hod-problems .dml-pb-panel { overflow: hidden; }
  .hod-problems .dml-pb-table { width: 100%; min-width: 1360px; table-layout: fixed; }
  .hod-problems .dml-pb-table th,
  .hod-problems .dml-pb-table td {
    padding: 13px 18px;
    vertical-align: middle;
  }
  .hod-problems .dml-pb-table tbody td { height: 68px; }
  .hod-problems .dml-pb-table td { overflow-wrap: anywhere; }
  .hod-problems .dml-pb-table td:nth-child(1),
  .hod-problems .dml-pb-table td:nth-child(2),
  .hod-problems .dml-pb-table td:nth-child(3),
  .hod-problems .dml-pb-table td:nth-child(8),
  .hod-problems .dml-pb-table td:nth-child(9) { overflow-wrap: normal; }
  .hod-problems .dml-pb-table .dml-pb-problem .dml-pb-truncate {
    display: -webkit-box;
    overflow: hidden;
    line-height: 1.45;
    white-space: normal;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  .hod-problems .hod-due-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    white-space: nowrap;
  }
  .hod-problems .hod-due-date { color: #111827; }
  .hod-problems .hod-due-cell .dml-pb-overdue {
    margin: 0;
    line-height: 1.35;
  }
  .hod-problems .hod-pic-cell { line-height: 1.45; }
  .hod-problems .hod-status-cell { white-space: nowrap; }
  .hod-problems .dml-pb-table tbody tr.hod-problem-row { cursor: pointer; }
  .hod-problems .dml-pb-table tbody tr.hod-problem-row:hover,
  .hod-problems .dml-pb-table tbody tr.hod-problem-row:focus {
    background: #f3f8f5;
    outline: none;
  }
  .hod-problems .hod-problem-action { width: 52px; text-align: center; }
  .hod-problems .hod-eye-button {
    display: inline-flex; width: 32px; height: 32px; align-items: center;
    justify-content: center; border: 1px solid #e5e7eb; border-radius: 8px;
    background: #fff; color: #046a38; cursor: pointer;
  }
  .hod-problems .hod-eye-button:hover,
  .hod-problems .hod-eye-button:focus-visible {
    border-color: #c9dfd2; background: #e8f1ec; outline: none;
  }
  .hod-problems .hod-status {
    display: inline-flex; align-items: center; padding: 4px 8px;
    border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap;
  }
  .hod-problems .hod-status.is-unsolved { background: #fef7e8; color: #815d18; }
  .hod-problems .hod-status.is-escalated { background: #fdf0f0; color: #963b3b; }
  .hod-problems .hod-status.is-solved { background: #e8f1ec; color: #046a38; }
  .hod-problems .hod-overlay {
    position: fixed; inset: 0; z-index: 1000; display: flex;
    justify-content: flex-end; background: rgb(17 24 39 / 38%);
  }
  .hod-problems .hod-drawer {
    display: flex; width: min(460px, 100%); height: 100%; flex-direction: column;
    overflow-y: auto; overscroll-behavior: contain; background: #fff;
    box-shadow: -12px 0 36px rgb(17 24 39 / 14%);
  }
  .hod-problems .hod-drawer-header {
    position: sticky; top: 0; z-index: 1; display: flex; align-items: flex-start;
    justify-content: space-between; gap: 16px; padding: 20px 22px 16px;
    border-bottom: 1px solid #e5e7eb; background: #fff;
  }
  .hod-problems .hod-drawer-heading { min-width: 0; }
  .hod-problems .hod-drawer-heading h2 {
    margin: 0; color: #111827; font-size: 18px; font-weight: 700;
  }
  .hod-problems .hod-drawer-heading .hod-status { margin-top: 10px; }
  .hod-problems .hod-close-button {
    display: inline-flex; width: 36px; height: 36px; flex: 0 0 auto;
    align-items: center; justify-content: center; border: 1px solid #e5e7eb;
    border-radius: 8px; background: #fff; color: #4b5563; cursor: pointer;
  }
  .hod-problems .hod-close-button:hover,
  .hod-problems .hod-close-button:focus-visible {
    background: #f3f4f6; outline: 2px solid #046a38; outline-offset: 2px;
  }
  .hod-problems .hod-drawer-content {
    display: flex; flex-direction: column; gap: 22px; padding: 20px 22px 28px;
  }
  .hod-problems .hod-problem-title {
    margin: 0; color: #111827; font-size: 20px; font-weight: 650;
    line-height: 1.4; overflow-wrap: anywhere;
  }
  .hod-problems .hod-detail-section { display: flex; flex-direction: column; gap: 10px; }
  .hod-problems .hod-detail-section h3 {
    margin: 0; color: #374151; font-size: 13px; font-weight: 700;
  }
  .hod-problems .hod-info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .hod-problems .hod-info-item {
    min-width: 0; padding: 11px 12px; border: 1px solid #e5e7eb;
    border-radius: 9px; background: #fff;
  }
  .hod-problems .hod-info-label {
    display: flex; align-items: center; gap: 6px; margin-bottom: 5px;
    color: #6b7280; font-size: 11px; font-weight: 600;
  }
  .hod-problems .hod-info-label svg { color: #046a38; }
  .hod-problems .hod-info-value {
    color: #111827; font-size: 13px; line-height: 1.45; overflow-wrap: anywhere;
  }
  .hod-problems .hod-detail-copy {
    margin: 0; color: #374151; font-size: 14px; line-height: 1.65;
    white-space: pre-wrap; overflow-wrap: anywhere;
  }
  .hod-problems .hod-detail-muted { color: #9ca3af; }
  .hod-problems .hod-pic {
    display: flex; align-items: center; gap: 11px; padding: 12px;
    border: 1px solid #e5e7eb; border-radius: 9px;
  }
  .hod-problems .hod-pic-avatar {
    display: grid; width: 38px; height: 38px; flex: 0 0 auto;
    place-items: center; border-radius: 50%; background: #e8f1ec;
    color: #046a38; font-size: 13px; font-weight: 700;
  }
  .hod-problems .hod-pic-name { color: #111827; font-size: 14px; font-weight: 600; }
  .hod-problems .hod-due-note {
    margin-top: 6px; color: #963b3b; font-size: 12px; font-weight: 600;
  }
  @media (max-width: 600px) {
    .hod-problems { gap: 12px; }
    .hod-problems .dml-pb-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .hod-problems .dml-pb-toolbar { align-items: stretch; flex-direction: column; }
    .hod-problems .dml-pb-search { width: 100%; max-width: none; }
    .hod-problems .dml-pb-filters { justify-content: flex-start; }
    .hod-problems .dml-pb-filters select { flex: 1; min-width: 120px; }
    .hod-problems .hod-drawer-header { padding: 17px 16px 14px; }
    .hod-problems .hod-drawer-content { gap: 19px; padding: 17px 16px 24px; }
  }
`;

export default function HodTrackingProblemsPage() {
  const { rows, counts, ready, loading, error, refresh } = useProblems();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProblemFilter>("all");
  const [lineFilter, setLineFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selectedProblem, setSelectedProblem] = useState<ProblemRow | null>(
    null
  );

  const lines = useMemo(
    () =>
      [...new Set(rows.map((row) => row.line).filter((line) => line && line !== "-"))]
        .sort(),
    [rows]
  );

  const departments = useMemo(
    () => [
      ...new Set([
        ...dmDepartments,
        ...rows.map((row) => normalizeDepartment(row.picDept)).filter(Boolean),
      ]),
    ],
    [rows]
  );

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        [row.problem, row.line, row.picName, row.sessionLabel, row.date].some(
          (value) => String(value ?? "").toLowerCase().includes(query)
        );
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;
      const matchesLine = lineFilter === "all" || row.line === lineFilter;
      const matchesDept =
        deptFilter === "all" || normalizeDepartment(row.picDept) === deptFilter;
      const matchesDue =
        dueFilter === "all" ||
        (dueFilter === "overdue" && row.status === "escalated") ||
        (dueFilter === "not-overdue" && row.status !== "escalated");
      return (
        matchesSearch && matchesStatus && matchesLine && matchesDept && matchesDue
      );
    });
  }, [rows, search, statusFilter, lineFilter, deptFilter, dueFilter]);

  useEffect(() => {
    document.title = "Tracking Masalah · DM Digital";
  }, []);

  useEffect(() => {
    if (!selectedProblem) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedProblem(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedProblem]);

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setLineFilter("all");
    setDeptFilter("all");
    setDueFilter("all");
  }

  function openProblem(problem: ProblemRow) {
    setSelectedProblem(problem);
  }

  const selectedStatus = selectedProblem
    ? STATUS_VIEW[selectedProblem.status]
    : null;

  return (
    <div className="hod-problems">
      <style>{HOD_STYLES}</style>

      <header className="dml-page-head">
        <div>
          <h1>Tracking Masalah</h1>
          <p>
            Pantau penanggung jawab, tenggat waktu, dan status tindak lanjut
            dari DM meeting.
          </p>
        </div>
      </header>

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
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="dml-pb-filters">
            <select
              aria-label="Filter status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as ProblemFilter)
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
              onChange={(event) => setLineFilter(event.target.value)}
            >
              <option value="all">Semua line</option>
              {lines.map((line) => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter departemen"
              value={deptFilter}
              onChange={(event) => setDeptFilter(event.target.value)}
            >
              <option value="all">Semua departemen</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {departmentLabel(department)}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter tenggat"
              value={dueFilter}
              onChange={(event) => setDueFilter(event.target.value)}
            >
              <option value="all">Semua tenggat</option>
              <option value="overdue">Terlambat</option>
              <option value="not-overdue">Belum terlambat</option>
            </select>

            {(search || statusFilter !== "all" || lineFilter !== "all" || deptFilter !== "all" || dueFilter !== "all") && (
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
          Menampilkan <strong>{visibleRows.length}</strong> dari{" "}
          <strong>{rows.length}</strong> masalah
        </div>

        {error ? (
          <ProblemLoadError error={error} onRetry={refresh} />
        ) : !ready || loading ? (
          <div className="dml-empty" role="status">
            Memuat masalah…
          </div>
        ) : (
          <div className="dml-table-wrap dml-pb-table-wrap">
            <table className="dml-table dml-pb-table">
              <colgroup>
                <col style={{ width: 120 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 260 }} />
                <col style={{ width: 145 }} />
                <col style={{ width: 185 }} />
                <col style={{ width: 145 }} />
                <col style={{ width: 70 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Sesi</th>
                  <th>Line</th>
                  <th>Kategori</th>
                  <th>Masalah</th>
                  <th>PIC</th>
                  <th>Due date</th>
                  <th>Status</th>
                  <th className="hod-problem-action">Detail</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="dml-empty">
                      Tidak ada masalah yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((problem) => {
                    const status = STATUS_VIEW[problem.status];
                    return (
                      <tr
                        key={problem.id}
                        className={
                          "hod-problem-row" +
                          (problem.status === "escalated"
                            ? " is-escalated"
                            : "")
                        }
                        tabIndex={0}
                        aria-label={`Lihat detail masalah: ${problem.problem}`}
                        onClick={() => openProblem(problem)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openProblem(problem);
                          }
                        }}
                      >
                        <td title={problem.date}>
                          {formatMeetingDate(problem.date)}
                        </td>
                        <td title={problem.sessionLabel}>
                          <span className="dml-pb-truncate">
                            {problem.sessionLabel}
                          </span>
                        </td>
                        <td title={problem.line}>{problem.line || "-"}</td>
                        <td>{problem.problemCategories?.join(", ") || "-"}</td>
                        <td className="dml-pb-problem" title={problem.problem}>
                          <span className="dml-pb-truncate">
                            {problem.problem || "-"}
                          </span>
                        </td>
                        <td className="hod-pic-cell">
                          {problem.picName || "-"}
                        </td>
                        <td>
                          {problem.due ? (
                            <div className="hod-due-cell">
                              <span className="hod-due-date">
                                {formatDue(problem.due)}
                              </span>
                              {problem.status === "escalated" &&
                                problem.overdueMs > 0 && (
                                  <span className="dml-pb-overdue">
                                    Terlambat{" "}
                                    {formatOverdue(problem.overdueMs)}
                                  </span>
                                )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="hod-status-cell">
                          <span
                            className={`hod-status ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="hod-problem-action">
                          <button
                            type="button"
                            className="hod-eye-button"
                            aria-label={`Lihat detail: ${problem.problem}`}
                            title="Lihat detail"
                            onClick={(event) => {
                              event.stopPropagation();
                              openProblem(problem);
                            }}
                          >
                            <Eye size={16} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedProblem && selectedStatus && (
        <div
          className="hod-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedProblem(null);
            }
          }}
        >
          <aside
            className="hod-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hod-drawer-title"
          >
            <header className="hod-drawer-header">
              <div className="hod-drawer-heading">
                <h2 id="hod-drawer-title">Detail Masalah</h2>
                <span className={`hod-status ${selectedStatus.className}`}>
                  {selectedStatus.label}
                </span>
              </div>
              <button
                type="button"
                className="hod-close-button"
                aria-label="Tutup detail masalah"
                onClick={() => setSelectedProblem(null)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="hod-drawer-content">
              <section className="hod-detail-section">
                <h3>Masalah</h3>
                <p className="hod-problem-title">
                  {selectedProblem.problem || "-"}
                </p>
              </section>

              <section className="hod-detail-section">
                <h3>Informasi Umum</h3>
                <div className="hod-info-grid">
                  <div className="hod-info-item">
                    <span className="hod-info-label">
                      <CalendarDays size={14} aria-hidden="true" />
                      Tanggal
                    </span>
                    <div className="hod-info-value">
                      {selectedProblem.date
                        ? formatMeetingDate(selectedProblem.date)
                        : "-"}
                    </div>
                  </div>
                  <div className="hod-info-item">
                    <span className="hod-info-label">
                      <Clock3 size={14} aria-hidden="true" />
                      Sesi
                    </span>
                    <div className="hod-info-value">
                      {selectedProblem.sessionLabel || "-"}
                    </div>
                  </div>
                  <div className="hod-info-item">
                    <span className="hod-info-label">
                      Line
                    </span>
                    <div className="hod-info-value">
                      {selectedProblem.line || "-"}
                    </div>
                  </div>
                  <div className="hod-info-item">
                    <span className="hod-info-label">
                      <Tag size={14} aria-hidden="true" />
                      Kategori
                    </span>
                    <div className="hod-info-value">
                      {selectedProblem.problemCategories?.join(", ") || "-"}
                    </div>
                  </div>
                </div>
              </section>

              <section className="hod-detail-section">
                <h3>Deskripsi Masalah</h3>
                <p className="hod-detail-copy">
                  {selectedProblem.problem || "Tidak ada deskripsi tercatat."}
                </p>
              </section>

              <section className="hod-detail-section">
                <h3>Tindak Lanjut / Solusi</h3>
                <p
                  className={
                    "hod-detail-copy" +
                    (selectedProblem.solution ? "" : " hod-detail-muted")
                  }
                >
                  {selectedProblem.solution || "Belum ada solusi tercatat."}
                </p>
              </section>

              <section className="hod-detail-section">
                <h3>Penanggung Jawab (PIC)</h3>
                <div className="hod-pic">
                  <span className="hod-pic-avatar" aria-hidden="true">
                    {initials(selectedProblem.picName) || (
                      <UserRound size={18} />
                    )}
                  </span>
                  <span className="hod-pic-name">
                    {selectedProblem.picName || "-"}
                    {selectedProblem.picDept ? (
                      <span className="hod-detail-muted">
                        {" "}
                        · {departmentLabel(selectedProblem.picDept)}
                      </span>
                    ) : null}
                  </span>
                </div>
              </section>

              <section className="hod-detail-section">
                <h3>Tenggat Waktu</h3>
                <div className="hod-info-item">
                  <div className="hod-info-value">
                    {selectedProblem.due
                      ? formatDue(selectedProblem.due)
                      : "Tidak ada tenggat tercatat."}
                  </div>
                  {selectedProblem.status === "escalated" &&
                    selectedProblem.overdueMs > 0 && (
                      <div className="hod-due-note">
                        Terlambat {formatOverdue(selectedProblem.overdueMs)}
                      </div>
                    )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
