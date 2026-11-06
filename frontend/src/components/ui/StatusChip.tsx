"use client";

import type { ReactNode } from "react";
import { useUiText } from "@/locales/useUiText";

export type ChipTone = "ok" | "ng" | "wait" | "muted";

export function StatusChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  const { text } = useUiText();
  return <span className={`ui-chip ui-chip--${tone}`}>{text(children)}</span>;
}
