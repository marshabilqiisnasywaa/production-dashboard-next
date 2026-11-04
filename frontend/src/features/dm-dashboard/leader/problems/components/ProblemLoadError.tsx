"use client";
import { useUiText } from "@/locales/useUiText";
export function ProblemLoadError({ error, onRetry }: { error: string; onRetry: () => void }) {
  const { text: uiText } = useUiText();
  return (
    <div className="dml-empty" role="alert">
      <p>{uiText("Daftar masalah gagal dimuat. ")}{uiText(error)}</p>
      <button type="button" className="dml-pb-act-btn" onClick={onRetry}>{uiText("Coba lagi")}</button>
    </div>
  );
}
