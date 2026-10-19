export type DmLineStatus = "running" | "idle" | "stopped";

export type DmMember = {
  id?: number;
  name: string | null;
  employeeId: string | null;
  dept?: string | null;
  role?: string | null;
  position: string | null;
  supervisor?: string | null;
  workPhone?: string | null;
  photoUrl?: string | null;
  sortOrder?: number;
};

export type DmMpv = DmMember & { period: string };

export type DmBoard = {
  slug: string;
  lineCode: string;
  model: string | null;
  status: DmLineStatus;
  lineName: string;
  slogan: string | null;
  lineLabel: string | null;
  lineLabelZh: string | null;
  workshopLabel: string;
  values: readonly string[];
  teamPhotoUrl: string | null;
  members: readonly DmMember[];
  mpv: DmMpv | null;
};

export const dmStatusLabels: Record<DmLineStatus, string> = {
  running: "RUNNING",
  idle: "STANDBY",
  stopped: "STOPPED",
};

export function previousPeriod(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
