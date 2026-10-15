/**
 * Mock data that mirrors the Figma design.
 * Replace the exports below with real API calls (see hooks/useInspection.ts).
 */
import type { InspectionRow, PapercardStatus, RoleKey, SessionItem, TimeShare } from "./types";
import { addDays } from "./utils";

export const MOCK_TODAY = "2025-06-17";
export const LEADER_LINE = "TAC20601";

export const LEADER_USER = {
  name: "Andi Wijaya",
  initials: "AW",
  role: "Leader Line",
  line: LEADER_LINE,
};

type Overrides = Partial<Record<RoleKey, PapercardStatus>>;

// days-ago -> status overrides (everything else is OK)
const OVERRIDES: Record<number, Overrides> = {
  0: { pe: "NG" },
  4: { ipqc: "PENDING" },
  5: { me: "LIBUR" },
  12: { pe: "PENDING" },
  19: { leader: "NG" },
  27: { ipqc: "PENDING", me: "PENDING" },
  33: { pe: "LIBUR" },
};

function buildRow(daysAgo: number): InspectionRow {
  const date = addDays(MOCK_TODAY, -daysAgo);
  const statuses: Record<RoleKey, PapercardStatus> = {
    leader: "OK",
    me: "OK",
    pe: "OK",
    ipqc: "OK",
    ...OVERRIDES[daysAgo],
  };
  const all = Object.values(statuses);
  return {
    id: `${LEADER_LINE}-${date}`,
    date,
    line: LEADER_LINE,
    type: "Nairobi-N",
    statuses,
    total: all.filter((s) => s !== "LIBUR").length,
    submitted: all.filter((s) => s === "OK" || s === "NG").length,
  };
}

export const MOCK_ROWS: InspectionRow[] = Array.from({ length: 42 }, (_, i) => buildRow(i));

export const OTHER_KPIS = [
  { id: "ontime", title: "Papercard tepat waktu", value: 94, icon: "clipboard" as const },
  { id: "abnormal", title: "Penanganan abnormal tepat waktu", value: 86, icon: "alert" as const },
  { id: "closure", title: "Closure rate masalah meeting", value: 91, icon: "check" as const },
];

export const TIME_SHARES: TimeShare[] = [
  { label: "Pre-Management", value: 64, target: 60, mode: "min", targetText: "target ≥ 60%" },
  { label: "During-Management", value: 19, target: 20, mode: "approx", targetText: "target ≈ 20%" },
  { label: "Post-Management", value: 17, target: 20, mode: "max", targetText: "target ≤ 20%" },
];

export const SESSIONS: SessionItem[] = [
  { id: "pre", order: 1, time: "07:45–08:00", name: "Pre-Management", status: "done" },
  { id: "during-1", order: 2, time: "10:00", name: "During-Management 1", status: "live" },
  { id: "during-2", order: 3, time: "14:00", name: "During-Management 2", status: "upcoming" },
  { id: "post", order: 4, time: "16:00", name: "Post-Management", status: "upcoming" },
];
