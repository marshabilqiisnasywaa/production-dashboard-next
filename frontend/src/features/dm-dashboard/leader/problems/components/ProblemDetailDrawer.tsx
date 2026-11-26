"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Clock3, Tag, UserRound, X } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import { departmentLabel } from "@/features/dm-dashboard/departments";
import { formatDue } from "../../meeting/utils";
import type { ProblemRow, ProblemStatus } from "../types";
import { formatMeetingDate, formatOverdue } from "../utils";
import { CategoryCodeBadges } from "./CategoryCodeBadges";

const STATUS_VIEW: Record<
  ProblemStatus,
  { label: string; className: string }
> = {
  unsolved: { label: "Belum Selesai", className: "is-unsolved" },
  escalated: { label: "Eskalasi SPV", className: "is-escalated" },
  solved: { label: "Selesai", className: "is-solved" },
};

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

export default function ProblemDetailDrawer({
  problem,
  onClose,
}: {
  problem: ProblemRow | null;
  onClose: () => void;
}) {
  const { text: uiText, locale: uiLocale } = useUiText();

  useEffect(() => {
    if (!problem) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [problem, onClose]);

  if (!problem || typeof document === "undefined") return null;

  const status = STATUS_VIEW[problem.status];

  return createPortal(
    <div
      className="dml-pb-detail-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="dml-pb-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dml-pb-detail-title"
      >
        <header className="dml-pb-detail-header">
          <div className="dml-pb-detail-heading">
            <h2 id="dml-pb-detail-title">{uiText("Detail Masalah")}</h2>
            <span className={`dml-pb-detail-status ${status.className}`}>
              {uiText(status.label)}
            </span>
          </div>
          <button
            type="button"
            className="dml-pb-detail-close"
            aria-label={uiText("Tutup detail masalah")}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="dml-pb-detail-content">
          <section className="dml-pb-detail-section">
            <h3>{uiText("Masalah")}</h3>
            <p className="dml-pb-detail-title">
              {problem.problem || "-"}
            </p>
          </section>

          <section className="dml-pb-detail-section">
            <h3>{uiText("Informasi Umum")}</h3>
            <div className="dml-pb-detail-grid">
              <div className="dml-pb-detail-info">
                <span className="dml-pb-detail-label">
                  <CalendarDays size={14} aria-hidden="true" />
                  {uiText("Tanggal")}
                </span>
                <div className="dml-pb-detail-value">
                  {problem.date
                    ? formatMeetingDate(problem.date, uiLocale)
                    : "-"}
                </div>
              </div>
              <div className="dml-pb-detail-info">
                <span className="dml-pb-detail-label">
                  <Clock3 size={14} aria-hidden="true" />
                  {uiText("Input By")}
                </span>
                <div className="dml-pb-detail-value">
                  {problem.sessionLabel || "-"}
                </div>
              </div>
              <div className="dml-pb-detail-info">
                <span className="dml-pb-detail-label">
                  {uiText("Line")}
                </span>
                <div className="dml-pb-detail-value">{problem.line || "-"}</div>
              </div>
              <div className="dml-pb-detail-info">
                <span className="dml-pb-detail-label">
                  <Tag size={14} aria-hidden="true" />
                  {uiText("Kategori")}
                </span>
                <div className="dml-pb-detail-value">
                  <CategoryCodeBadges
                    categories={problem.problemCategories}
                    codes={problem.categoryCodes}
                  />
                </div>
              </div>
              {problem.occurredAt || problem.respondedAt ? (
                <>
                  <div className="dml-pb-detail-info">
                    <span className="dml-pb-detail-label">
                      <Clock3 size={14} aria-hidden="true" />
                      {uiText("Jam terjadi")}
                    </span>
                    <div className="dml-pb-detail-value">
                      {problem.occurredAt ? formatDue(problem.occurredAt, uiLocale) : "-"}
                    </div>
                  </div>
                  <div className="dml-pb-detail-info">
                    <span className="dml-pb-detail-label">
                      <Clock3 size={14} aria-hidden="true" />
                      {uiText("Waktu respon")}
                    </span>
                    <div className="dml-pb-detail-value">
                      {problem.respondedAt
                        ? formatDue(problem.respondedAt, uiLocale)
                        : "-"}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </section>

          <section className="dml-pb-detail-section">
            <h3>{uiText("Deskripsi Masalah")}</h3>
            <p className="dml-pb-detail-copy">
              {problem.problem || uiText("Tidak ada deskripsi tercatat.")}
            </p>
          </section>

          <section className="dml-pb-detail-section">
            <h3>{uiText("Tindak Lanjut / Solusi")}</h3>
            <p
              className={
                "dml-pb-detail-copy" +
                (problem.solution ? "" : " is-muted")
              }
            >
              {problem.solution || uiText("Belum ada solusi tercatat.")}
            </p>
          </section>

          <section className="dml-pb-detail-section">
            <h3>{uiText("Penanggung Jawab (PIC)")}</h3>
            <div className="dml-pb-detail-pic">
              <span className="dml-pb-detail-avatar" aria-hidden="true">
                {initials(problem.picName) || <UserRound size={18} />}
              </span>
              <span className="dml-pb-detail-pic-name">
                {problem.picName || "-"}
                {problem.picDept ? (
                  <span className="is-muted">
                    {" "}
                    · {uiText(departmentLabel(problem.picDept))}
                  </span>
                ) : null}
              </span>
            </div>
          </section>

          <section className="dml-pb-detail-section">
            <h3>{uiText("Tenggat Waktu")}</h3>
            <div className="dml-pb-detail-info">
              <div className="dml-pb-detail-value">
                {problem.due
                  ? uiText(formatDue(problem.due, uiLocale))
                  : uiText("Tidak ada tenggat tercatat.")}
              </div>
              {problem.status === "escalated" && problem.overdueMs > 0 && (
                <div className="dml-pb-detail-due-note">
                  {uiText("Terlambat ")}
                  {uiText(formatOverdue(problem.overdueMs, uiLocale))}
                </div>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>,
    document.body
  );
}
