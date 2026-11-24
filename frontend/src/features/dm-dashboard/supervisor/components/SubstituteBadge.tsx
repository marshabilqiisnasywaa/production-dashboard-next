"use client";

import { useUiText } from "@/locales/useUiText";

interface SubstituteBadgeProps {
  /** Nama orang yang mengisi papercard (pengganti). */
  filledByName: string;
  /** Nama pengisi asli yang digantikan. */
  replacedName?: string | null;
  /** inline: untuk tabel & kartu. detail: untuk modal review. */
  variant?: "inline" | "detail";
}

export function SubstituteBadge({
  filledByName,
  replacedName,
  variant = "inline",
}: SubstituteBadgeProps) {
  const { text: uiText } = useUiText();
  const original = replacedName?.trim() || uiText("pengisi asli (tidak tercatat)");

  if (variant === "detail") {
    return (
      <div className="spv-sub-note">
        {uiText("Diisi oleh ")}
        <strong>{filledByName}</strong>
        {uiText(", menggantikan ")}
        <strong>{original}</strong>
      </div>
    );
  }

  return (
    <div className="spv-sub-note spv-sub-note--small">
      {uiText("Menggantikan ")}
      <strong>{original}</strong>
    </div>
  );
}