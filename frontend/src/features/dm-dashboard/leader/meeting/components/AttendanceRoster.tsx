import { StatusChip } from "@/components/ui/StatusChip";
import type { AttendanceRecord, MeetingMember } from "../types";
import { formatClock } from "../utils";
import { IconInfo } from "./MeetingIcons";

interface Props {
  /** "Daftar Member DM" before the meeting, "Kehadiran" once it runs */
  title: string;
  members: MeetingMember[];
  attendance: Record<string, AttendanceRecord>;
  note?: string;
}

/** Right-hand list of members with their attendance state. Used in every phase. */
export function AttendanceRoster({ title, members, attendance, note }: Props) {
  const present = members.filter((m) => attendance[m.id]?.status === "present").length;

  return (
    <section className="ui-card dml-mt-roster">
      <header className="dml-mt-roster__head">
        <div>
          <h2>{title}</h2>
          <p>{members.length} member</p>
        </div>
        <span className="dml-mt-roster__count">
          {present}/{members.length} Hadir
        </span>
      </header>

      <ul className="dml-mt-roster__list">
        {members.map((m) => {
          const rec = attendance[m.id];
          return (
            <li key={m.id}>
              <span className="dml-mt-avatar">{m.initials}</span>
              <div className="dml-mt-roster__who">
                <strong>{m.name}</strong>
                <span>{m.roleLabel}</span>
              </div>
              <div className="dml-mt-roster__state">
                {rec?.status === "present" ? (
                  <>
                    <StatusChip tone="ok">Hadir</StatusChip>
                    {rec.at && <time>{formatClock(rec.at)}</time>}
                  </>
                ) : rec?.status === "absent" ? (
                  <StatusChip tone="wait">Tidak hadir</StatusChip>
                ) : (
                  <StatusChip tone="muted">Belum hadir</StatusChip>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {note && (
        <p className="dml-mt-roster__note">
          <IconInfo size={16} /> {note}
        </p>
      )}
    </section>
  );
}
