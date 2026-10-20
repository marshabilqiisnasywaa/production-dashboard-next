import { Button } from "@/components/ui/Button";
import { IconCheckCircle } from "@/components/ui/icons";
import type { AttendanceRecord, MeetingMember } from "../types";
import { IconPlay } from "./MeetingIcons";

interface Props {
  members: MeetingMember[];
  attendance: Record<string, AttendanceRecord>;
  onRedo: () => void;
  onStart: () => void;
}

/** Step 3: presensi is closed, absent members are recorded, the Leader starts the meeting. */
export function PresensiResultCard({ members, attendance, onRedo, onStart }: Props) {
  const absent = members.filter((m) => attendance[m.id]?.status === "absent");
  const present = members.length - absent.length;

  return (
    <section className="ui-card dml-mt-ready">
      <span className="dml-mt-ready__icon">
        <IconCheckCircle size={32} />
      </span>
      <h2>Presensi selesai</h2>
      <p>
        <strong>{present}</strong> dari {members.length} member hadir
        {absent.length > 0 && <> · {absent.length} tercatat tidak hadir</>}
      </p>

      {absent.length > 0 && (
        <ul className="dml-mt-ready__absent" aria-label="Member tidak hadir">
          {absent.map((m) => (
            <li key={m.id}>
              {m.name} <span>({m.roleLabel})</span>
            </li>
          ))}
        </ul>
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
