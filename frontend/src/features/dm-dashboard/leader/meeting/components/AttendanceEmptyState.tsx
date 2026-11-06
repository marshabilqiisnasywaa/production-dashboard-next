"use client";
import { useUiText } from "@/locales/useUiText";
import { Button } from "@/components/ui/Button";
import { IconCheckCircle } from "@/components/ui/icons";
import { IconFaceScan, IconUser, IconVideo } from "./MeetingIcons";

interface Props {
  requireAllPresent: boolean;
  onStart: () => void;
}

/** Step 1: presensi must happen before the meeting can start. */
export function AttendanceEmptyState({ requireAllPresent, onStart }: Props) {
  const { text: uiText } = useUiText();
  return (
    <section className="ui-card dml-mt-empty">
      <div className="dml-mt-empty__panel">
        {/* <span className="dml-mt-empty__icon">
          <IconFaceScan size={44} />
        </span> */}
        <h2>{uiText("Lakukan presensi terlebih dahulu")}</h2>
        <p>{uiText("Seluruh member wajib melakukan presensi dengan face recognition sebelum meeting dapat dimulai.")}</p>

        <ol className="dml-mt-steps">
          <li>
            <IconUser size={22} />
            <strong>{uiText("Seluruh member")}</strong>
            <span>{uiText("lakukan presensi")}</span>
          </li>
          <li>
            <IconFaceScan size={22} />
            <strong>{uiText("Gunakan kamera")}</strong>
            <span>{uiText("untuk verifikasi wajah")}</span>
          </li>
          <li>
            <IconCheckCircle size={22} />
            <strong>
              {requireAllPresent
                ? uiText("Setelah semua hadir")
                : uiText("Setelah presensi ditutup")}
            </strong>
            <span>{uiText("meeting dapat dimulai")}</span>
          </li>
        </ol>

        <Button
          variant="primary"
          size="lg"
          className="dml-mt-empty__cta justify-center"
          onClick={onStart}
        >
          <IconFaceScan size={20} />{uiText("Mulai Presensi")}</Button>
      </div>
    </section>
  );
}
