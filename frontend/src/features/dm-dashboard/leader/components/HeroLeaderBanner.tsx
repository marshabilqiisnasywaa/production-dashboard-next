"use client";

import Link from "next/link";
import { IconClipboardCheck, IconUsers } from "@/components/ui/icons";
import { LEADER_USER } from "../mockData";
import { LEADER_ROUTES } from "../routes";

export interface HeroLeaderBannerProps {
  userName?: string;
  lineName?: string;
  lineCode?: string;
  workshopName?: string;
  supervisorName?: string;
  isPapercardSubmitted?: boolean;
  completedSessionsCount?: number;
}

export function HeroLeaderBanner({
  userName = LEADER_USER.name,
  lineName = LEADER_USER.lineName,
  lineCode = LEADER_USER.line,
  workshopName = LEADER_USER.workshop,
  supervisorName = LEADER_USER.supervisor.name,
  isPapercardSubmitted = false,
  completedSessionsCount = 0,
}: HeroLeaderBannerProps) {
  return (
    <div className="dms-hero-compact">
      <div className="dms-hero-left">
        <div className="dms-hero-title-group">
          <h1 className="dms-hero-compact-title">Dashboard Leader — {userName}</h1>
          <div className="dms-hero-badges-inline">
            <span className="dms-pill dms-pill--line">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              {lineName} ({lineCode}) · {workshopName}
            </span>
            <span className="dms-pill dms-pill--supervisor" title="Supervisor yang bertindak sebagai Approver">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              </svg>
              SPV Approver: <strong>{supervisorName}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="dms-hero-actions-compact">
        <Link
          href={LEADER_ROUTES.papercard}
          className="dms-btn-compact dms-btn-compact--primary"
          title={isPapercardSubmitted ? "Papercard hari ini sudah dikirim" : "Isi papercard kesiapan shift"}
        >
          <IconClipboardCheck size={14} />
          <span>Isi Papercard</span>
          {isPapercardSubmitted ? (
            <span className="dms-dot dms-dot--green" title="Sudah disubmit" />
          ) : (
            <span className="dms-dot dms-dot--amber" title="Belum disubmit" />
          )}
        </Link>
        <Link
          href={LEADER_ROUTES.meeting}
          className="dms-btn-compact dms-btn-compact--secondary"
          title="Buka Ruang DM Meeting"
        >
          <IconUsers size={14} />
          <span>DM Meeting</span>
          <span className="dms-counter-badge">{completedSessionsCount}/3 Selesai</span>
        </Link>
      </div>
    </div>
  );
}

