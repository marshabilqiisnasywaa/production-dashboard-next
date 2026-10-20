"use client";

import Link from "next/link";
import { IconCheckCircle, IconUsers } from "@/components/ui/icons";
import type { DmMeetingSession } from "../../api";
import { LEADER_ROUTES } from "../routes";
import type { TeamMember } from "../types";

export interface QuickMeetingAttendanceCardProps {
  sessions?: DmMeetingSession[];
  members?: TeamMember[];
  loading?: boolean;
}

export function QuickMeetingAttendanceCard({
  sessions = [],
  members = [],
  loading = false,
}: QuickMeetingAttendanceCardProps) {
  if (loading) {
    return (
      <div className="dms-card" style={{ minHeight: "135px", justifyContent: "center", alignItems: "center" }}>
        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Memuat sesi DM meeting...</span>
      </div>
    );
  }

  const ordered = [...sessions].sort((a, b) => a.sessionNumber - b.sessionNumber);

  const completedCount = sessions.filter((s) => s.status === "completed").length;

  // Count attendance from the latest active or completed session
  const activeOrDoneSess = sessions.find((s) => s.status === "completed" || s.status === "in_progress");
  const presentCount = activeOrDoneSess?.attendances
    ? activeOrDoneSess.attendances.filter((a) => a.status === "present").length
    : 0;
  const totalCount = members.length;

  const renderSessionPill = (sess: DmMeetingSession) => {
    const num = sess.sessionNumber;
    const label = sess.label || `Sesi ${num}`;
    const isCompleted = sess?.status === "completed";
    const isInProgress = sess?.status === "in_progress";
    const time = sess.scheduledTime;

    let itemClass = "dms-session-item";
    let tagClass = "dms-session-tag dms-session-tag--pending";
    let statusText = "Menunggu";

    if (isCompleted) {
      itemClass += " dms-session-item--completed";
      tagClass = "dms-session-tag dms-session-tag--completed";
      const dur = sess.durationSeconds ? Math.round(sess.durationSeconds / 60) : 12;
      statusText = `${dur}m · Selesai`;
    } else if (isInProgress) {
      itemClass += " dms-session-item--active";
      tagClass = "dms-session-tag dms-session-tag--active";
      statusText = "Berjalan";
    }

    return (
      <div key={num} className={itemClass}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="dms-session-label">{label}</span>
          <span className={tagClass}>{statusText}</span>
        </div>
        <span className="dms-session-time">{time} WIB</span>
      </div>
    );
  };

  return (
    <div className="dms-card">
      <div className="dms-card-head">
        <div className="dms-card-head-left">
          <div className="dms-card-icon dms-card-icon--indigo">
            <IconUsers size={18} />
          </div>
          <div>
            <h2 className="dms-card-title">Presensi &amp; Sesi DM Meeting</h2>
            <p className="dms-card-subtitle">
              {ordered.length > 0
                ? `${ordered.length} sesi hari ini: ${ordered.map((x) => x.scheduledTime).join(" · ")} WIB`
                : "Belum ada jadwal meeting hari ini"}
            </p>
          </div>
        </div>
        <span className="dms-status-badge dms-status-badge--approved" style={{ fontSize: "11px", padding: "2px 8px" }}>
          <IconCheckCircle size={12} />
          {completedCount} / {ordered.length} Selesai
        </span>
      </div>

      {/* 3 Session Stepper Bar */}
      <div className="dms-session-stepper">
        {ordered.map((sess) => renderSessionPill(sess))}
      </div>

      {/* Attendance summary footer & link */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          marginTop: "6px",
          padding: "6px 10px",
          background: "#f8fafc",
          borderRadius: "8px",
          border: "1px solid #f1f5f9",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "#64748b" }}>Presensi Tim:</span>
          <strong style={{ fontSize: "12px", color: "#0f172a" }}>
            {presentCount} / {totalCount} Hadir
          </strong>
        </div>
        <Link
          href={LEADER_ROUTES.meeting}
          className="dms-btn-compact dms-btn-compact--secondary"
          style={{ padding: "3px 9px", fontSize: "11.5px" }}
        >
          Buka Ruang Sesi →
        </Link>
      </div>
    </div>
  );
}
