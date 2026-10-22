import { Button } from "@/components/ui/Button";
import { IconCheckCircle } from "@/components/ui/icons";
import type { AbsenceNote, AttendanceRecord, GuestRecord, MeetingMember } from "../types";
import { formatClock } from "../utils";
import { MeetingAvatar } from "./MeetingAvatar";
import { IconPlay } from "./MeetingIcons";
import { AbsenceFields } from "./AbsenceFields";

interface Props {
  members: MeetingMember[];
  attendance: Record<string, AttendanceRecord>;
  guests: Record<string, GuestRecord>;
  photoFor: (employeeNo: string) => string | null;
  absences: Record<string, AbsenceNote>;
  onAbsenceChange: (memberId: string, next: AbsenceNote) => void;
  onRedo: () => void;
  onStart: () => void;
}

interface PresentRow {
  key: string;
  name: string;
  nik: string;
  detail: string;
  line: string | null;
  photo: string | null;
  at: string | null;
  guest: boolean;
}

const timeOf = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

/** Step 3: presensi is closed, everyone who came (team and guests) is listed, absent members are recorded, the Leader starts the meeting. */
export function PresensiResultCard({ members, attendance, guests, photoFor, absences, onAbsenceChange, onRedo, onStart }: Props) {
  const absent = members.filter((m) => attendance[m.id]?.status === "absent");
  const teamRows: PresentRow[] = members
    .filter((m) => attendance[m.id]?.status === "present")
    .map((m) => ({
      key: m.id,
      name: m.name,
      nik: m.employeeNo ?? "",
      detail: [m.dept, m.position].filter(Boolean).join(" · ") || m.roleLabel,
      line: m.lineCode ?? null,
      photo: m.photoUrl ?? (m.employeeNo ? photoFor(m.employeeNo) : null),
      at: attendance[m.id]?.at ?? null,
      guest: false,
    }));
  const guestRows: PresentRow[] = Object.values(guests).map((g) => ({
    key: "tamu-" + g.employeeNo,
    name: g.name,
    nik: g.employeeNo,
    detail: [g.dept, g.position].filter(Boolean).join(" · "),
    line: g.line,
    photo: photoFor(g.employeeNo),
    at: g.at,
    guest: true,
  }));
  const present = [...teamRows, ...guestRows].sort((a, b) => timeOf(a.at) - timeOf(b.at));
  const representedCount = absent.filter((m) => absences[m.id]?.reason === "represented").length;

  return (
    <section className="ui-card dml-mt-ready">
      <span className="dml-mt-ready__icon">
        <IconCheckCircle size={32} />
      </span>
      <h2>Presensi selesai</h2>
      <p>
        <strong>{teamRows.length}</strong> dari {members.length} member hadir
        {guestRows.length > 0 && <> · {guestRows.length} tamu</>}
        {absent.length > 0 && <> · {absent.length} tercatat tidak hadir</>}
        {representedCount > 0 && <> · {representedCount} diwakilkan</>}
      </p>

      <div className="dml-mt-ready__section">
        <h3>Hadir ({present.length})</h3>
        <ul className="dml-mt-ready__present" aria-label="Yang hadir">
          {present.map((row) => (
            <li key={row.key}>
              <MeetingAvatar className="dml-mt-avatar" name={row.name} photo={row.photo} />
              <div className="dml-mt-roster__who">
                <strong>
                  {row.name}
                  {row.guest && <span className="dml-mt-tag">Tamu</span>}
                </strong>
                <span>{[row.nik, row.detail].filter(Boolean).join(" · ")}</span>
              </div>
              <div className="dml-mt-ready__when">
                {row.at && <time dateTime={row.at}>{formatClock(row.at)}</time>}
                {row.line && <span className="dml-mt-ready__line">{row.line}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {absent.length > 0 && (
        <div className="dml-mt-ready__section">
          <h3>Tidak hadir ({absent.length})</h3>
          <ul className="dml-mt-absence" aria-label="Member tidak hadir">
            {absent.map((m) => {
              const entry: AbsenceNote = absences[m.id] ?? { reason: "none", note: "" };
              return (
                <li key={m.id}>
                  <div className="dml-mt-absence__who">
                    <MeetingAvatar className="dml-mt-avatar" name={m.name} photo={m.photoUrl ?? null} />
                    <div className="dml-mt-roster__who">
                      <strong>{m.name}</strong>
                      <span>{[m.employeeNo, m.roleLabel].filter(Boolean).join(" · ")}</span>
                    </div>
                  </div>
                  <div className="dml-mt-absence__fields">
                  <AbsenceFields idPrefix={"ar-" + m.id} name={m.name} value={entry} onChange={(next) => onAbsenceChange(m.id, next)} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="dml-mt-ready__actions">
        <Button variant="outline" size="lg" onClick={onRedo}>
          Ulangi presensi
        </Button>
        <Button variant="primary" size="lg" onClick={onStart}>
          <IconPlay size={18} /> Mulai Meeting
        </Button>
      </div>
    </section>
  );
}
