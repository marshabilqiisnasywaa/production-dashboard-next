import { Card } from "@/components/ui/Card";
import { IconCheck } from "@/components/ui/icons";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";
import type { SessionItem } from "../types";

const STATUS_VIEW: Record<SessionItem["status"], { tone: ChipTone; label: string }> = {
  done: { tone: "ok", label: "Selesai" },
  live: { tone: "ok", label: "Berlangsung" },
  upcoming: { tone: "muted", label: "Belum mulai" },
};

export function SessionTimeline({ sessions }: { sessions: SessionItem[] }) {
  return (
    <Card title="Timeline hari ini" subtitle="Progres sesi Daily Management">
      <ol className="dml-timeline">
        {sessions.map((s) => {
          const view = STATUS_VIEW[s.status];
          return (
            <li key={s.id} className={`dml-session dml-session--${s.status}`}>
              <div className="dml-session__head">
                <span className="dml-session__badge">{s.status === "done" ? <IconCheck size={14} /> : s.order}</span>
                <span className="dml-session__time">{s.time}</span>
              </div>
              <div className="dml-session__foot">
                <strong>{s.name}</strong>
                <StatusChip tone={view.tone}>{view.label}</StatusChip>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
