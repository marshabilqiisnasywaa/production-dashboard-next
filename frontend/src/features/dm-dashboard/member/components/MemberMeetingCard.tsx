import { IconUsers } from "@/components/ui/icons";

interface MemberMeetingCardProps {
  leaderName: string;
  supervisorName: string;
}

export function MemberMeetingCard({ leaderName, supervisorName }: MemberMeetingCardProps) {
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
          <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
            DM Meeting
          </span>
        </div>

        <span style={{ fontSize: "11px", background: "#eef2ff", color: "#4338ca", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
          10:00 - 14:00 - 16:00 WIB
        </span>
      </div>

      <div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>
          Daily Management
        </div>
        <div style={{ fontSize: "12px", color: "#64748b" }}>
          Dipimpin oleh Leader <strong>{leaderName}</strong> Dan Supervisor <strong>{supervisorName}</strong> Sebagai Approver Papercard.
        </div>
      </div>

      <div style={{ fontSize: "11.5px", color: "#475569" }}>
        Kehadiran: <strong>4 dari 4 Personil Siap</strong>
      </div>
    </div>
  );
}
