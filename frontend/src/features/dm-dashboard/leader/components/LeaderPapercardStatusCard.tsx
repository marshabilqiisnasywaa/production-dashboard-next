"use client";

import { useMemo } from "react";
import Link from "next/link";
import { IconAlert, IconCheckCircle, IconClipboardCheck } from "@/components/ui/icons";
import type { DmPapercardSubmission } from "../../api";
import { LEADER_ROUTES } from "../routes";

export interface LeaderPapercardStatusCardProps {
  submission?: DmPapercardSubmission | null;
  supervisorName?: string;
  loading?: boolean;
}

export function LeaderPapercardStatusCard({
  submission,
  supervisorName = "Belum diatur admin",
  loading = false,
}: LeaderPapercardStatusCardProps) {
  const isSubmitted = Boolean(submission);
  const statusUpper = (submission?.approvalStatus || "").toUpperCase();
  const isApproved = statusUpper === "APPROVED";
  const isRejected = statusUpper === "REJECTED";
  const isPending = isSubmitted && (statusUpper === "PENDING" || !statusUpper);

  // Answers & Counts
  const answers = Array.isArray(submission?.answers) ? submission.answers : [];
  const totalItems = answers.length;
  const okItems = answers.filter(
    (a: any) => a.status === "OK" || (a.status !== "NG" && a.ok !== false && a.ok !== "NG")
  ).length;
  const ngCount = totalItems - okItems;
  const isNG = submission?.status === "NG" || ngCount > 0;

  // Group and count answers by category dynamically from database
  const categoryStats = useMemo(() => {
    if (answers.length === 0) return [];

    const map = new Map<string, { total: number; ok: number; ng: number }>();

    for (const ans of answers) {
      const catName = ans.category || ans.categoryName || "Umum";
      const isItemNG = ans.status === "NG" || ans.ok === "NG" || ans.ok === false;

      const current = map.get(catName) || { total: 0, ok: 0, ng: 0 };
      current.total += 1;
      if (isItemNG) {
        current.ng += 1;
      } else {
        current.ok += 1;
      }
      map.set(catName, current);
    }

    return Array.from(map.entries()).map(([name, stat]) => ({
      name,
      ...stat,
    }));
  }, [answers]);

  // Format submit time
  const submitTimeStr = submission?.submittedAt
    ? submission.submittedAt.includes("T")
      ? new Date(submission.submittedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
      : submission.submittedAt + " WIB"
    : "-";

  if (loading) {
    return (
      <div className="dms-card" style={{ minHeight: "135px", justifyContent: "center", alignItems: "center" }}>
        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Memuat status papercard...</span>
      </div>
    );
  }

  return (
    <div className="dms-card">
      <div className="dms-card-head">
        <div className="dms-card-head-left">
          <div className="dms-card-icon dms-card-icon--teal">
            <IconClipboardCheck size={18} />
          </div>
          <div>
            <h2 className="dms-card-title">Papercard Kesiapan Leader</h2>
            <p className="dms-card-subtitle">Checklist 5M &amp; 5S Kesiapan Lini Shift 1</p>
          </div>
        </div>
        <Link
          href={LEADER_ROUTES.papercard}
          className={`dms-btn-compact ${isRejected ? "dms-btn-compact--danger" : "dms-btn-compact--secondary"}`}
          style={{
            padding: "4px 10px",
            fontSize: "11.5px",
            background: isRejected ? "#fee2e2" : undefined,
            color: isRejected ? "#b91c1c" : undefined,
            borderColor: isRejected ? "#fca5a5" : undefined,
            fontWeight: isRejected ? 700 : undefined,
          }}
        >
          {isRejected
            ? "Perbaiki Checklist"
            : isApproved
            ? "Lihat Checklist (Terkunci)"
            : isSubmitted
            ? "Lihat Pengajuan"
            : "Isi Sekarang"}
        </Link>
      </div>

      {isSubmitted ? (
        <>
          <div className="dms-leader-pc-status">
            <div>
              <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Status Pengajuan Hari Ini</span>
              <strong style={{ fontSize: "13.5px", color: "#0f172a", marginTop: "1px", display: "block" }}>
                {okItems} / {totalItems} Item OK {isNG ? `· ${ngCount > 0 ? `${ngCount} Temuan NG` : "1 Temuan NG"}` : "· Kondisi Siap"}
              </strong>
            </div>

            {isApproved && (
              <span className="dms-status-badge dms-status-badge--approved">
                <IconCheckCircle size={13} />
                Disetujui SPV
              </span>
            )}
            {isPending && (
              <span className="dms-status-badge dms-status-badge--waiting">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Menunggu Review SPV
              </span>
            )}
            {isRejected && (
              <span className="dms-status-badge dms-status-badge--ng">
                <IconAlert size={13} />
                Perlu Revisi
              </span>
            )}
          </div>

          {/* Supervisor Revision Note if rejected */}
          {isRejected && submission?.supervisorNotes && (
            <div
              style={{
                padding: "6px 10px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "6px",
                marginBottom: "8px",
                fontSize: "11px",
                color: "#991b1b",
                lineHeight: "1.35",
              }}
            >
              Catatan SPV: <strong>"{submission.supervisorNotes}"</strong>
            </div>
          )}

          {categoryStats.length > 0 && (
            <div
              className="dms-categories-bar"
              style={{
                gridTemplateColumns: `repeat(${Math.min(Math.max(categoryStats.length, 1), 6)}, 1fr)`,
              }}
            >
              {categoryStats.map((cat) => {
                const isAllOk = cat.ng === 0;
                return (
                  <div key={cat.name} className="dms-cat-item">
                    <span className="dms-cat-name" title={cat.name}>
                      {cat.name}
                    </span>
                    <span
                      className="dms-cat-val"
                      style={{ color: isAllOk ? "#059669" : "#dc2626" }}
                    >
                      {cat.ok}/{cat.total} OK {cat.ng > 0 && `(${cat.ng} NG)`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="dms-spv-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              Disubmit pukul <strong>{submitTimeStr}</strong> · Approver SPV: <strong>{submission?.approvedByName || supervisorName}</strong>
            </div>
          </div>
        </>
      ) : (
        <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Belum Disubmit Hari Ini</span>
            <span className="dms-status-badge dms-status-badge--pending" style={{ fontSize: "11px" }}>
              Menunggu Input
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "11.5px", color: "#64748b" }}>
            Pastikan checklist 5M &amp; 5S Leader diselesaikan sebelum lini start beroperasi.
          </p>
        </div>
      )}
    </div>
  );
}

