import { Button } from "@/components/ui/Button";
import { IconCheckCircle } from "@/components/ui/icons";
import { IconFaceScan, IconUser, IconVideo } from "./MeetingIcons";

interface Props {
  requireAllPresent: boolean;
  onStart: () => void;
}

/** Step 1: presensi must happen before the meeting can start. */
export function AttendanceEmptyState({ requireAllPresent, onStart }: Props) {
  return (
    <section className="ui-card dml-mt-empty">
      <div className="dml-mt-empty__panel">
        {/* <span className="dml-mt-empty__icon">
          <IconFaceScan size={44} />
        </span> */}
        <h2>Lakukan presensi terlebih dahulu</h2>
        <p>
          Seluruh member DM wajib melakukan presensi dengan face recognition sebelum meeting dapat dimulai.
        </p>

        <ol className="dml-mt-steps">
          <li>
            <IconUser size={22} />
            <strong>Seluruh member</strong>
            <span>lakukan presensi</span>
          </li>
          <li>
            <IconFaceScan size={22} />
            <strong>Gunakan kamera</strong>
            <span>untuk verifikasi wajah</span>
          </li>
          <li>
            <IconCheckCircle size={22} />
            <strong>{requireAllPresent ? "Setelah semua hadir" : "Setelah presensi ditutup"}</strong>
            <span>meeting dapat dimulai</span>
          </li>
        </ol>

<Button
  variant="primary"
  size="lg"
  className="dml-mt-empty__cta justify-center"
  onClick={onStart}
>
  <IconFaceScan size={20} />
  Mulai Presensi
</Button>
      </div>
    </section>
  );
}
