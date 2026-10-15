export type RoleKey = "leader" | "me" | "pe" | "ipqc";
export type PapercardStatus = "OK" | "NG" | "PENDING" | "LIBUR";

export interface InspectionRow {
  id: string;
  date: string; // ISO yyyy-mm-dd
  line: string;
  type: string; // product model, e.g. "Nairobi-N"
  statuses: Record<RoleKey, PapercardStatus>;
  /** Required papercards (LIBUR is excluded, BR-05) */
  total: number;
  /** Submitted papercards (OK or NG) */
  submitted: number;
}

export type TrendGranularity = "day" | "week" | "month";
export type DateRangeKey = "today" | "7d" | "30d" | "month";

export interface TrendPoint {
  key: string; // period key (day / week start / month)
  label: string;
  value: number; // 0-100
  submitted: number;
  total: number;
}

export interface InspectionSummary {
  rate: number;
  /** Difference in % points vs. the previous period, null when no data */
  delta: number | null;
}

export interface SessionItem {
  id: string;
  order: number;
  time: string;
  name: string;
  status: "done" | "live" | "upcoming";
}

export interface TimeShare {
  label: string;
  value: number;
  target: number;
  mode: "min" | "approx" | "max";
  targetText: string;
}
