import { StatusChip } from "@/components/ui/StatusChip";
import type { AttendanceRecord, GuestRecord, MeetingMember } from "../types";
import { formatClock, initialsOf } from "../utils";
import { IconInfo } from "./MeetingIcons";

interface Props {
  /** "Daftar Member DM" before the meeting, "Kehadiran" once it runs */
  title: string;
  members: MeetingMember[];
  attendance: Record<string, AttendanceRecord>;
  guests?: Record<string, GuestRecord>;
  note?: string;
}

/** Right-hand list of members with their attendance state. Used in every phase. */
export function AttendanceRoster({ title, members, attendance, note, guests = {} }: Props) {
  const present = members.filter((m) => attendance[m.id]?.status === "present").length;
  const guestList = Object.values(guests);

  return (
    <section className="ui-card dml-mt-roster">
      <header className="dml-mt-roster__head">
        <div>
          <h2>{title}</h2>
          <p>{members.length} member{guestList.length ? ` · ${guestList.length} tamu` : ""}</p>
        </div>
        <span className="dml-mt-roster__count">
          {present}/{members.length} Hadir
        </span>
      </header>

      <ul className="dml-mt-roster__list">
        {members.map((m) => {
                  {guestList.map((g) => (
                    <li key={g.employeeNo}>
                      <span className="dml-mt-avatar">{initialsOf(g.name)}</span>
                      <div className="dml-mt-roster__who">
                        <strong>{g.name}</strong>
                        <span>Tamu{g.line ? ` · ${g.line}` : ""}</span>
                      </div>
                      <div className="dml-mt-roster__state">
                        <StatusChip tone="ok">Hadir</StatusChip>
                        <time>{formatClock(g.at)}</time>
                      </div>
                    </li>
                  ))}          
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
