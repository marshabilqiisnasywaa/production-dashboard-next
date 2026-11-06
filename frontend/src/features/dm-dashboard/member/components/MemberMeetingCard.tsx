"use client";
import { useUiText } from "@/locales/useUiText";
import { IconUsers } from "@/components/ui/icons";

interface MemberMeetingCardProps {
  leaderName: string;
  supervisorName: string;
  meetingTimes?: string[];
}

export function MemberMeetingCard({ leaderName, supervisorName, meetingTimes = [] }: MemberMeetingCardProps) {
  const { text: uiText } = useUiText();
  return (
    <div className="member-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "#eef2ff",
              color: "#4338ca",
              display: "grid",
              placeItems: "center",
            }}
          >
            <IconUsers size={16} />
          </div>
          <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>{uiText("DM Meeting")}</span>
        </div>

        <span style={{ fontSize: "11px", background: "#eef2ff", color: "#4338ca", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
          {meetingTimes.length > 0 ? uiText("{{v0}} WIB", { v0: meetingTimes.join(" - ") }) : uiText("Jadwal belum diatur")}
        </span>
      </div>

      <div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>{uiText("Daily Management")}</div>
        <div style={{ fontSize: "12px", color: "#64748b" }}>{uiText("Dipimpin oleh Leader ")}<strong>{leaderName}</strong>{uiText(" Dan Supervisor ")}<strong>{supervisorName}</strong>{uiText(" Sebagai Approver Papercard.")}</div>
      </div>

      <div style={{ fontSize: "11.5px", color: "#475569" }}>{uiText("Kehadiran: ")}<strong>{uiText("4 dari 4 Personil Siap")}</strong>
      </div>
    </div>
  );
}
