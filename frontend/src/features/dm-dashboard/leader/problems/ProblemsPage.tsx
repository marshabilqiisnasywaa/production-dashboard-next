"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useMemo, useState } from "react";
import "./problems.css";
import { Card } from "@/components/ui/Card";
import { ProblemTable } from "./components/ProblemTable";
import { ProblemLoadError } from "./components/ProblemLoadError";
import { useProblems } from "./hooks/useProblems";
import type { ProblemFilter } from "./types";

/** Share of all problems: percent + "dari total" on the right of a KPI card, after a short divider. */
function RateBadge({ tone, pct }: { tone: "warn" | "ok" | "bad"; pct: number }) {
  const { text: uiText } = useUiText();

  return (
    <span
      className={`dml-pb-stat__rate dml-pb-stat__rate--${tone}`}
      title={uiText("Persentase dari total masalah")}
    >
      <b>{pct}%</b>
      <small>{uiText("dari total")}</small>
    </span>
  );
}

export default function ProblemsPage({
  adminLayout = false,
  hideHeading = adminLayout,
}: {
  adminLayout?: boolean;
  hideHeading?: boolean;
}) {
  const { text: uiText } = useUiText();
  const { rows, counts, ready, error, refresh } = useProblems();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProblemFilter>("all");
  const [lineFilter, setLineFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  /** Share of all problems, rounded to a whole percent (0 when there is no data). */
  const rate = (n: number) =>
    counts.all > 0 ? Math.round((n / counts.all) * 100) : 0;

  const categories = useMemo(
    () =>
      [...new Set(rows.flatMap((r) => r.problemCategories ?? []).filter(Boolean))].sort(),
    [rows],
  );

  const lines = useMemo(
    () => [...new Set(rows.map((r) => r.line).filter((line) => line && line !== "-"))].sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((r) => {
      const matchesSearch =
        !q ||
        [r.problem, r.line, r.picName, r.sessionLabel, r.date, (r.problemCategories ?? []).join(" ")]
          .some((value) => String(value ?? "").toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" || r.status === statusFilter;

      const matchesLine =
        lineFilter === "all" || r.line === lineFilter;

      const matchesDue =
        dueFilter === "all" ||
        (dueFilter === "overdue" && r.status === "escalated") ||
        (dueFilter === "not-overdue" && r.status !== "escalated");

      const matchesCategory =
        categoryFilter === "all" ||
        (r.problemCategories ?? []).includes(categoryFilter);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesLine &&
        matchesDue &&
        matchesCategory
      );
    });
  }, [rows, search, statusFilter, lineFilter, dueFilter, categoryFilter]);

  const hasFilters =
    search !== "" ||
    statusFilter !== "all" ||
    lineFilter !== "all" ||
    dueFilter !== "all" ||
    categoryFilter !== "all";

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setLineFilter("all");
    setDueFilter("all");
    setCategoryFilter("all");
  }

  return (
    <div className={"dml-pb" + (adminLayout ? " is-admin" : "")}>
      {!hideHeading && (
        <div className="dml-page-head dml-pb-heading">
          <div>
            <h1>{uiText("Tracking Masalah")}</h1>
            <p>{uiText("Pantau penanggung jawab, tenggat waktu, dan status tindak lanjut dari DM meeting.")}</p>
          </div>
        </div>
      )}

      <div className="dml-pb-summary">
        <div className="dml-pb-stat">
          <span className="dml-pb-stat__label">{uiText("Total Masalah")}</span>
          <strong>{counts.all}</strong>
          <span className="dml-pb-stat__note">{uiText("Semua masalah tercatat")}</span>
        </div>

        <div className="dml-pb-stat">
          <span className="dml-pb-stat__label">{uiText("Selesai")}</span>
          <strong>{counts.solved}</strong>
          <span className="dml-pb-stat__note">{uiText("Tindak lanjut selesai")}</span>
          <RateBadge tone="ok" pct={rate(counts.solved)} />
        </div>

        <div className="dml-pb-stat">
          <span className="dml-pb-stat__label">{uiText("Belum Selesai")}</span>
          <strong>{counts.unsolved}</strong>
          <span className="dml-pb-stat__note">{uiText("Perlu ditindaklanjuti")}</span>
          <RateBadge tone="warn" pct={rate(counts.unsolved)} />
        </div>

        <div className="dml-pb-stat">
          <span className="dml-pb-stat__label">{uiText("Eskalasi SPV")}</span>
          <strong>{counts.escalated}</strong>
          <span className="dml-pb-stat__note">{uiText("Perlu perhatian supervisor")}</span>
          <RateBadge tone="bad" pct={rate(counts.escalated)} />
        </div>
      </div>

      <section className="dml-pb-panel">
        <div className="dml-pb-toolbar">
          <div className="dml-pb-search">
            <input
              type="search"
              aria-label={uiText("Cari masalah")}
              placeholder={uiText("Cari masalah, PIC, line, atau sesi...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="dml-pb-filters">
            <select
              aria-label={uiText("Filter status")}
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ProblemFilter)
              }
            >
              <option value="all">{uiText("Semua status (")}{counts.all})</option>
              <option value="unsolved">{uiText("Belum selesai (")}{counts.unsolved})</option>
              <option value="escalated">{uiText("Eskalasi SPV (")}{counts.escalated})</option>
              <option value="solved">{uiText("Selesai (")}{counts.solved})</option>
            </select>

            <select
              aria-label={uiText("Filter line")}
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
            >
              <option value="all">{uiText("Semua line")}</option>
              {lines.map((line) => (
                <option key={line} value={line}>
                  {uiText(line)}
                </option>
              ))}
            </select>

            <select
              aria-label={uiText("Filter kategori masalah")}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">{uiText("Semua kategori")}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              aria-label={uiText("Filter tenggat")}
              value={dueFilter}
              onChange={(e) => setDueFilter(e.target.value)}
            >
              <option value="all">{uiText("Semua tenggat")}</option>
              <option value="overdue">{uiText("Terlambat")}</option>
              <option value="not-overdue">{uiText("Belum terlambat")}</option>
            </select>

            {hasFilters && (
              <button
                type="button"
                className="dml-pb-reset"
                onClick={resetFilters}
              >{uiText("Reset")}</button>
            )}
          </div>
        </div>

        <div className="dml-pb-result-count">{uiText("Menampilkan ")}<strong>{visible.length}</strong>{uiText(" dari")}{" "}
          <strong>{rows.length}</strong>{uiText(" masalah")}</div>

        {error ? <ProblemLoadError error={error} onRetry={refresh} /> : ready ? (
          <ProblemTable rows={visible} />
        ) : (
          <div className="dml-empty">{uiText("Memuat masalah…")}</div>
        )}
      </section>
    </div>
  );
}
