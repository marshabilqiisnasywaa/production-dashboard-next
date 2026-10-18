"use client";

import { IconAlert, IconCheckCircle } from "@/components/ui/icons";
import type { DmPapercardSubmission } from "../../api";
import { LEADER_USER, LINE_TEAM_MEMBERS } from "../mockData";
import type { TeamMember } from "../types";

export interface TeamShopfloorMonitorProps {
  submissions?: DmPapercardSubmission[];
  teamMembers?: TeamMember[];
  supervisorName?: string;
  lineName?: string;
  loading?: boolean;
}

const DEPTS = [
  { key: "PROD", label: "Produksi", defaultName: "Budi Santoso", defaultPosition: "Senior Operator" },
  { key: "ME", label: "Maintenance", defaultName: "Reza Pratama", defaultPosition: "ME Technician" },
  { key: "PE", label: "Process Eng", defaultName: "Maulana I. Arif", defaultPosition: "PE Technician" },
  { key: "QC", label: "Quality Control", defaultName: "Siti Rahma", defaultPosition: "IPQC Inspector" },
];

export function TeamShopfloorMonitor({
  submissions = [],
  teamMembers = LINE_TEAM_MEMBERS,
  supervisorName = LEADER_USER.supervisor.name,
  lineName = LEADER_USER.lineName,
  loading = false,
}: TeamShopfloorMonitorProps) {
  // Compute summary stats
  let okCount = 0;
  let ngCount = 0;
  let pendingCount = 0;

  DEPTS.forEach((d) => {
    const sub = submissions.find((s) => s.department === d.key);
    if (!sub) {
      pendingCount++;
    } else if (sub.status === "NG") {
      ngCount++;
    } else {
      okCount++;
    }
  });

  return (
    <div>
      <div className="dms-section-head">
        <div>
          <h2 className="dms-section-title">Status Papercard Rekan Tim ({lineName})</h2>
          <p className="dms-section-desc">
            Pantau kesiapan Papercard 4 pilar (PROD, ME, PE, QC) sebelum lini beroperasi normal.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span className="dms-pill dms-pill--line" style={{ fontSize: "11px", padding: "2px 7px" }}>
            {okCount} OK
          </span>
          {ngCount > 0 && (
            <span className="dms-pill" style={{ fontSize: "11px", padding: "2px 7px", background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" }}>
              {ngCount} NG
            </span>
          )}
          {pendingCount > 0 && (
            <span className="dms-pill dms-pill--shift" style={{ fontSize: "11px", padding: "2px 7px" }}>
              {pendingCount} Belum Kirim
            </span>
          )}
        </div>
      </div>

      <div className="dms-team-grid">
        {DEPTS.map((d) => {
          const sub = submissions.find((s) => s.department === d.key);
          const member = teamMembers.find((m) => m.dept === d.key && m.role !== "leader") || teamMembers.find((m) => m.dept === d.key);

          const isSubmitted = Boolean(sub);
          const isOK = sub?.status === "OK";
          const isNG = sub?.status === "NG";
          const isPending = !isSubmitted;

          const name = sub?.employeeName || member?.name || d.defaultName;
          const position = member?.position || d.defaultPosition;
          const initials = name
            .split(" ")
            .map((n) => n[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase() || d.key;

          const submitTime = sub?.submittedAt
            ? sub.submittedAt.includes("T")
              ? new Date(sub.submittedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
              : sub.submittedAt + " WIB"
            : null;

          const abnormalNote = sub?.abnormalNotes || null;

          return (
            <div key={d.key} className="dms-member-card">
              <div>
                <div className="dms-member-top">
                  <span className={`dms-dept-badge dms-dept-badge--${d.key}`}>
                    {d.key}
                  </span>
                  {isOK && (
                    <span className="dms-status-badge dms-status-badge--approved" style={{ fontSize: "10.5px", padding: "2px 6px" }}>
                      <IconCheckCircle size={11} />
                      OK
                    </span>
                  )}
                  {isNG && (
                    <span className="dms-status-badge dms-status-badge--ng" style={{ fontSize: "10.5px", padding: "2px 6px" }}>
                      <IconAlert size={11} />
                      1 NG
                    </span>
                  )}
                  {isPending && (
                    <span className="dms-status-badge dms-status-badge--pending" style={{ fontSize: "10.5px", padding: "2px 6px" }}>
                      Belum Kirim
                    </span>
                  )}
                </div>

                <div className="dms-member-profile">
                  <span className="dms-avatar">{initials}</span>
                  <div className="dms-member-info">
                    <strong>{name}</strong>
                    <span>{position}</span>
                  </div>
                </div>

                {isNG && abnormalNote && (
                  <div className="dms-abnormal-box">
                    <div className="dms-abnormal-label">
                      <IconAlert size={11} />
                      <span>Temuan:</span>
                    </div>
                    {abnormalNote}
                  </div>
                )}
              </div>

              <div className="dms-member-footer">
                <span>
                  {submitTime ? `Submit: ${submitTime}` : "Belum diisi"}
                </span>
                <span style={{ color: "#4338ca", fontWeight: 600 }}>
                  SPV: {supervisorName.split(" ")[0]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

