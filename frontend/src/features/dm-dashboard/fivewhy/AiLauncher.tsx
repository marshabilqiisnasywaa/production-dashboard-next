"use client";
import { createPortal } from "react-dom";
import { useUiText } from "@/locales/useUiText";
import "./ai-float.css";

import type { SuggestionStatus } from "./RootCauseSuggestion";

type AiLauncherProps = {
  visible: boolean;
  status: SuggestionStatus;
  error: string;
  lastFilledLevel: number;
  onAsk: () => void;
};

/**
 * Satu tombol saran AI yang melayang di kanan bawah.
 * Tidak mengubah logika AI: hanya memanggil fungsi permintaan saran yang sama,
 * dan permintaannya tetap mengirim seluruh rantai Why.
 */
export default function AiLauncher({
  visible,
  status,
  error,
  lastFilledLevel,
  onAsk,
}: AiLauncherProps) {
  const { text: uiText } = useUiText();

  if (!visible || typeof document === "undefined") return null;

  const loading = status === "loading";
  const failed = status === "error";

    const title = loading
    ? uiText("Ollie sedang berpikir...")
    : failed
      ? uiText(error || "Saran gagal dimuat.")
      : uiText("Butuh saran?");

  const hint = loading
    ? uiText("Membaca seluruh rantai Why")
    : failed
      ? uiText("Ketuk untuk coba lagi")
      : uiText("Ollie siap membantu");

  return createPortal(
    <div className="dm-5w-root dm-5w-ai-launcher-wrap">
      <button
        type="button"
        className={`dm-5w-ai-launcher${failed ? " is-error" : ""}${
          loading ? " is-loading" : ""
        }`}
        onClick={onAsk}
        disabled={loading}
        aria-busy={loading}
      >
        <span
          className="dm-5w-ai-launcher-bubble"
          role={failed ? "alert" : undefined}
        >
          <strong>{title}</strong>
          <span>{hint}</span>
        </span>
        <img
          className="dm-5w-ai-launcher-ollie"
          src="/assets/ollie-ai.png"
          alt=""
          width={72}
          height={72}
        />
      </button>
    </div>,
    document.body
  );
}