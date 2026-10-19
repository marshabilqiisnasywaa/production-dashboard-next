import { IconCheck, IconClock } from "@/components/ui/icons";
import type { DepartmentKey } from "../../leader/types";
import type { MemberPapercardApproval } from "./MemberPapercardStatusCard";

export interface MappedTeamMember {
  id: string;
  name: string;
  employeeNo: string;
  dept: DepartmentKey;
  position: string;
  role: "leader" | "member";
  initials: string;
  photoUrl?: string | null;
  papercardStatus: "OK" | "NG" | "EMPTY";
  approvalStatus: MemberPapercardApproval;
  submittedAt: string;
  sortOrder?: number;
}

export interface MappedMpvMember {
  id: string;
  name: string;
  employeeNo: string;
  dept: DepartmentKey;
  position: string;
  role: "member";
  initials: string;
  photoUrl?: string | null;
  papercardStatus: "OK" | "NG" | "EMPTY";
  approvalStatus: MemberPapercardApproval;
  submittedAt: string;
  period: string;
}

interface MemberTeamSectionProps {
  lineName: string;
  currentUsername?: string;
  currentName?: string;
  topTeamMembers: MappedTeamMember[];
  mpvTeamMember: MappedMpvMember | null;
}

export function MemberTeamSection({
  lineName,
  currentUsername,
  currentName,
  topTeamMembers,
  mpvTeamMember,
}: MemberTeamSectionProps) {
  return (
    <section className="member-team">
      <div
        className="member-team__head"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
            DM TRIANGLE TEAM Line {lineName}
          </h2>
          <span style={{ fontSize: "12px", color: "#64748b" }}>Status Papercard</span>
        </div>

        <span
          style={{
            fontSize: "11.5px",
            color: "#64748b",
            background: "#f8fafc",
            padding: "3px 10px",
            borderRadius: "999px",
            border: "1px solid #e2e8f0",
          }}
        >
          DM TRIANGLE TEAM
        </span>
      </div>

      {/* 4 Compact Team Member Cards */}
      {topTeamMembers.length === 0 && (
        <div style={{ fontSize: "12.5px", color: "#94a3b8", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
          Belum ada member di lini ini yang diatur admin.
        </div>
      )}
      <div className="member-team__grid">
        {topTeamMembers.map((member) => {
          const isCurrentUser = member.employeeNo === currentUsername || member.name === currentName;
          const isLeader = member.role === "leader";

          return (
            <div
              key={member.id}
              className={`member-team__card ${isCurrentUser ? "is-me" : ""}`}
              style={{
                background: isCurrentUser ? "#f0fdfa" : "#f8fafc",
                border: isCurrentUser ? "1.5px solid #0f766e" : "1px solid #e2e8f0",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span className={`dms-dept-badge dms-dept-badge--${member.dept}`} style={{ fontSize: "10px", padding: "1px 6px" }}>
                    {isLeader ? " LEADER" : member.dept}
                  </span>

                  {isCurrentUser && (
                    <span style={{ fontSize: "10px", fontWeight: 700, background: "#0f766e", color: "#fff", padding: "1px 6px", borderRadius: "999px" }}>
                      Kamu
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    className="member-team__avatar"
                    style={{
                      borderRadius: "50%",
                      background: isCurrentUser ? "#ccfbf1" : "#e2e8f0",
                      color: isCurrentUser ? "#0f766e" : "#475569",
                      fontWeight: 700,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {member.initials}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <strong className="member-team__name" style={{ display: "block", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {member.name}
                    </strong>
                    <span className="member-team__pos" style={{ display: "block", color: "#64748b" }}>
                      {member.position}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="member-team__footer"
                style={{
                  borderTop: "1px dashed #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: "#64748b" }}>
                  {member.submittedAt !== "-" ? `Submit: ${member.submittedAt}` : "Belum diisi"}
                </span>

                {member.approvalStatus === "APPROVED" ? (
                  <span style={{ color: "#047857", fontWeight: 700, display: "flex", alignItems: "center", gap: "2px" }}>
                    <IconCheck size={11} /> Approved
                  </span>
                ) : member.approvalStatus === "PENDING_APPROVAL" ? (
                  <span style={{ color: "#b45309", fontWeight: 700, display: "flex", alignItems: "center", gap: "2px" }}>
                    <IconClock size={11} /> Pending
                  </span>
                ) : (
                  <span style={{ color: "#94a3b8" }}>Belum submit</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MPV of the Month (Compact 1-row banner) */}
      {/* {mpvTeamMember && (
        <div className="member-mpv-banner">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>🏆</span>
            <div>
              <strong className="member-mpv-title" style={{ color: "#854d0e" }}>
                MPV of The Month ({mpvTeamMember.period}): {mpvTeamMember.name}
              </strong>
              <span className="member-mpv-sub" style={{ color: "#a16207", marginLeft: "6px" }}>
                ({mpvTeamMember.dept}) · {mpvTeamMember.position}
              </span>
            </div>
          </div>

          <span className="member-mpv-badge" style={{ background: "#fef9c3", color: "#854d0e", border: "1px solid #fef08a", borderRadius: "6px", fontWeight: 700 }}>
            Teladan Bulan Ini
          </span>
        </div>
      )} */}
    </section>
  );
}
