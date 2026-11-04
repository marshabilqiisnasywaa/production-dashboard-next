"use client";
import { useUiText } from "@/locales/useUiText";
import { Button } from "@/components/ui/Button";
import { IconCheck } from "@/components/ui/icons";

interface Props {
  done: number;
  total: number;
  complete: boolean;
  submitted: boolean;
  onSubmit: () => void;
  isRevision?: boolean;
  buttonText?: string;
}

/** Fixed bottom bar spanning the whole page width. Kirim stays disabled until every item (and NG detail) is complete. */
export function SubmitBar({
  done,
  total,
  complete,
  submitted,
  onSubmit,
  isRevision = false,
  buttonText,
}: Props) {
  const { text: uiText } = useUiText();
  return (
    <div className="dml-submitbar">
      <div className="dml-submitbar__inner">
        <div>
          <strong>
            {done}/{total}{uiText(" selesai")}</strong>
          <p>
            {submitted
              ? uiText("Papercard berstatus terkunci dan tidak dapat diubah lagi hari ini.")
              : isRevision
                ? uiText("Mode Revisi: Perbaiki poin yang diminta lalu kirim ulang ke Supervisor.")
                : complete
                  ? uiText("Semua item sudah terisi. Siap dikirim.")
                  : uiText("Lengkapi semua jawaban dan detail wajib.")}
          </p>
        </div>
        {!submitted && (
          <Button variant="primary" size="lg" disabled={!complete} onClick={onSubmit}>
            <IconCheck size={18} /> {buttonText || (isRevision ? "Kirim Ulang Revisi" : "Kirim")}
          </Button>
        )}
      </div>
    </div>
  );
}
