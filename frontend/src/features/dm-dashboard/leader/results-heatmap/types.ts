import type { RoleKey } from "../types";

export type { RoleKey };

export const ROLE_ORDER: RoleKey[] = ["leader", "me", "pe", "ipqc"];

export const ROLE_LABEL: Record<RoleKey, string> = {
  leader: "Leader Line",
  me: "ME",
  pe: "PE",
  ipqc: "IPQC",
};

/** One checklist aspect (an item, or one rule line of a per-rule item) as answered in a papercard. */
export interface AspectResult {
  /** Stable key (item id, or `${itemId}#${ruleIndex}`) - used to detect the same aspect being NG again */
  key: string;
  categoryId: string;
  categoryName: string;
  groupTitle: string | null;
  title: string;
  /** Rule line text for per-rule items */
  ruleText: string | null;
  status: "OK" | "NG";
  cause: string;
  solution: string;
  /** Value typed for text-type items */
  textValue: string | null;
}

/** One submitted papercard: one role, one day. */
export interface PapercardResult {
  id: string;
  date: string; // yyyy-mm-dd
  role: RoleKey;
  late: boolean;
  submittedBy: string | null;
  /** ISO time, or null when unknown */
  submittedAt: string | null;
  aspects: AspectResult[];
  ngCount: number;
  okCount: number;
}

/**
 * ok / ng      = a papercard exists and was judged by its content
 * missing      = nobody filled it (this is what Inspection Rate tracks, not judged here)
 * future       = the day has not happened yet
 */
export type CellState = "ok" | "ng" | "missing" | "future";

export interface HeatCell {
  date: string;
  role: RoleKey;
  state: CellState;
  result: PapercardResult | null;
}

export interface HeatRow {
  role: RoleKey;
  label: string;
  cells: HeatCell[];
}

export type ViewMode = "all" | "ng";
