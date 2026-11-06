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
  /** Selanjutnya: tampil di semua langkah kecuali yang terakhir. Di langkah terakhir tombol utama jadi Kirim. */
  showNext?: boolean;
  onNext?: () => void;
  /** Sebelumnya: tampil di semua langkah kecuali yang pertama. */
  showPrev?: boolean;
  onPrev?: () => void;
}

function IconArrow({ dir, size = 16 }: { dir: "left" | "right"; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === "left" ? "M19 12H5M11 18l-6-6 6-6" : "M5 12h14M13 6l6 6-6 6"} />
    </svg>
  );
}

/** Fixed bottom bar spanning the whole page width. Selanjutnya/Sebelumnya untuk pindah kategori; Kirim hanya di langkah terakhir dan disabled sampai semua item (dan detail NG) lengkap. */
export function SubmitBar({
  done,
  total,
  complete,
  submitted,
  onSubmit,
  isRevision = false,
  buttonText,
  showNext = false,
  onNext,
  showPrev = false,
  onPrev,
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
          <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {showPrev && (
              <Button variant="outline" size="lg" onClick={onPrev}>
                <IconArrow dir="left" /> {uiText("Sebelumnya")}
              </Button>
            )}
            {showNext ? (
              <Button variant="primary" size="lg" onClick={onNext}>
                {uiText("Selanjutnya")} <IconArrow dir="right" />
              </Button>
            ) : (
              <Button variant="primary" size="lg" disabled={!complete} onClick={onSubmit}>
                <IconCheck size={18} /> {buttonText || (isRevision ? "Kirim Ulang Revisi" : "Kirim")}
              </Button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
