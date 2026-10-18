"use client";

import Link from "next/link";
import { IconAlert, IconCheckCircle, IconClipboardCheck } from "@/components/ui/icons";
import type { DmPapercardSubmission } from "../../api";
import { LEADER_USER } from "../mockData";
import { LEADER_ROUTES } from "../routes";

export interface LeaderPapercardStatusCardProps {
  submission?: DmPapercardSubmission | null;
  supervisorName?: string;
  loading?: boolean;
}

export function LeaderPapercardStatusCard({
  submission,
  supervisorName = LEADER_USER.supervisor.name,
  loading = false,
}: LeaderPapercardStatusCardProps) {
  if (loading) {
    return (
      <div className="dms-card" style={{ minHeight: "135px", justifyContent: "center", alignItems: "center" }}>
        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Memuat status papercard...</span>
      </div>
    );
  }

  const isSubmitted = Boolean(submission);
  const isApproved = submission?.approvalStatus === "APPROVED";
  const isPending = !submission || submission.approvalStatus === "PENDING";
  const isRejected = submission?.approvalStatus === "REJECTED";
  const isNG = submission?.status === "NG";

  // Format submit time
  const submitTimeStr = submission?.submittedAt
    ? submission.submittedAt.includes("T")
      ? new Date(submission.submittedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
      : submission.submittedAt + " WIB"
    : "07:42 WIB";

  // Item counts
  const totalItems = submission?.answers && Array.isArray(submission.answers) ? submission.answers.length : 29;
  const okItems =
    submission?.answers && Array.isArray(submission.answers)
      ? submission.answers.filter((a: any) => a.ok !== false && a.ok !== 0 && a.ok !== "NG").length
      : isSubmitted
      ? totalItems
      : 0;

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
          className="dms-btn-compact dms-btn-compact--secondary"
          style={{ padding: "4px 10px", fontSize: "11.5px" }}
        >
          {isSubmitted ? "Buka Checklist" : "Isi Sekarang"}
        </Link>
      </div>

      {isSubmitted ? (
        <>
          <div className="dms-leader-pc-status">
            <div>
              <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Status Pengajuan Hari Ini</span>
              <strong style={{ fontSize: "13.5px", color: "#0f172a", marginTop: "1px", display: "block" }}>
                {okItems} / {totalItems} Item OK {isNG ? "· 1 Temuan NG" : "· Kondisi Siap"}
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

          <div className="dms-categories-bar">
            <div className="dms-cat-item">
              <span className="dms-cat-name">Manusia</span>
              <span className="dms-cat-val" style={{ color: "#059669" }}>11/11 OK</span>
            </div>
            <div className="dms-cat-item">
              <span className="dms-cat-name">Mesin</span>
              <span className="dms-cat-val" style={{ color: "#059669" }}>5/5 OK</span>
            </div>
            <div className="dms-cat-item">
              <span className="dms-cat-name">Material</span>
              <span className="dms-cat-val" style={{ color: "#059669" }}>6/6 OK</span>
            </div>
            <div className="dms-cat-item">
              <span className="dms-cat-name">Metode</span>
              <span className="dms-cat-val" style={{ color: "#059669" }}>4/4 OK</span>
            </div>
            <div className="dms-cat-item">
              <span className="dms-cat-name">5S &amp; Lain</span>
              <span className="dms-cat-val" style={{ color: "#059669" }}>3/3 OK</span>
            </div>
          </div>

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

