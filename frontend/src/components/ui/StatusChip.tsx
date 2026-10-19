import type { ReactNode } from "react";

export type ChipTone = "ok" | "ng" | "wait" | "muted";

export function StatusChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return <span className={`ui-chip ui-chip--${tone}`}>{children}</span>;
}
