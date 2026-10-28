export type ScoreTab = "Papercard" | "Standup Meeting" | "SQDIP" | "Reward & Punishment" | "Tahunan";
export type ScoreTrend = "Total" | "Before" | "Current" | "After";

export type LeaderScore = {
  rank: number;
  area: string;
  dm: string;
  line: string;
  leader: string;
  model: string;
  before: number;
  current: number;
  after: number;
  total: number;
  photoUrl?: string | null;
};

export type DmScore = {
  dm: string;
  before: number;
  current: number;
  after: number;
  total: number;
  rank: number;
  gap: number;
  hasLeaders: boolean;
  leader?: string;
  members: LeaderScore[];
};

export const DM_ORDER = ["DM 1", "DM 2", "DM 3", "DM 4"] as const;

export const leaderScores: LeaderScore[] = [
  { rank: 1, area: "6", dm: "DM 3", line: "TAC20604", leader: "Ahmad Riswanto", model: "Cruiser-B4 ABB", before: 30, current: 32.74, after: 28.2, total: 90.94 },
  { rank: 2, area: "6", dm: "DM 3", line: "TAC20605", leader: "Agus Riyadi", model: "-", before: 30, current: 32.5, after: 24, total: 86.5 },
  { rank: 3, area: "6", dm: "DM 4", line: "TAC20607", leader: "M Wildan Firdaus", model: "Nairobi-N", before: 30, current: 33.8, after: 22.4, total: 86.2 },
  { rank: 4, area: "6", dm: "DM 3", line: "TAC20603", leader: "Rudiyansyah", model: "-", before: 30, current: 29.75, after: 26.25, total: 86 },
  { rank: 5, area: "6", dm: "DM 4", line: "TAC20607", leader: "Edi Prasetyo", model: "Nairobi-N", before: 29.7, current: 32.4, after: 21.3, total: 83.4 },
];

export type ScoreDetailItem = {
  label: string;
  value: number;
  max: number;
};

export const dmScoreDetails: Record<"DM 3" | "DM 4", { before: ScoreDetailItem[]; current: ScoreDetailItem[]; after: ScoreDetailItem[] }> = {
  "DM 3": {
    before: [
      { label: "Eksekusi papercard tepat waktu", value: 8, max: 8 },
      { label: "Masalah terdaftar tepat waktu", value: 14, max: 14 },
      { label: "Close loop", value: 8, max: 8 },
    ],
    current: [
      { label: "Attendance", value: 7.9, max: 10 },
      { label: "Isi rapat diukur dan disiapkan", value: 14.4, max: 20 },
      { label: "Close loop", value: 10, max: 10 },
    ],
    after: [
      { label: "Safety", value: 6, max: 6 },
      { label: "Quality", value: 4, max: 6 },
      { label: "Delivery", value: 5.14, max: 6 },
      { label: "Inventory", value: 5.43, max: 6 },
      { label: "Productivity", value: 5.48, max: 6 },
    ],
  },
  "DM 4": {
    before: [
      { label: "Eksekusi papercard tepat waktu", value: 8, max: 8 },
      { label: "Masalah terdaftar tepat waktu", value: 13.85, max: 14 },
      { label: "Close loop", value: 8, max: 8 },
    ],
    current: [
      { label: "Attendance", value: 8.1, max: 10 },
      { label: "Isi rapat diukur dan disiapkan", value: 14.25, max: 20 },
      { label: "Close loop", value: 10, max: 10 },
    ],
    after: [
      { label: "Safety", value: 6, max: 6 },
      { label: "Quality", value: 4.1, max: 6 },
      { label: "Delivery", value: 5.2, max: 6 },
      { label: "Inventory", value: 5.4, max: 6 },
      { label: "Productivity", value: 5.35, max: 6 },
    ],
  },
};

export function computeDmScores(leaders: LeaderScore[], target = 90): Record<string, DmScore> {
  const groups = new Map<string, LeaderScore[]>();
  for (const dm of DM_ORDER) groups.set(dm, []);
  for (const leader of leaders) {
    const members = groups.get(leader.dm) ?? [];
    members.push(leader);
    groups.set(leader.dm, members);
  }

  const scored: DmScore[] = [...groups.entries()].map(([dm, members]) => {
    if (members.length === 0) {
      return { dm, before: 0, current: 0, after: 0, total: 0, rank: 0, gap: target, hasLeaders: false, members };
    }
    const average = (key: "before" | "current" | "after") => members.reduce((sum, member) => sum + member[key], 0) / members.length;
    const before = average("before");
    const current = average("current");
    const after = average("after");
    const total = before + current + after;
    const topLeader = [...members].sort((a, b) => b.total - a.total)[0];
    return { dm, before, current, after, total, rank: 0, gap: target - total, hasLeaders: true, leader: topLeader.leader, members };
  });

  scored
    .filter((dm) => dm.hasLeaders)
    .sort((a, b) => b.total - a.total)
    .forEach((dm, index) => {
      dm.rank = index + 1;
    });

  return Object.fromEntries(scored.map((dm) => [dm.dm, dm]));
}

export function scoreTone(score: number) {
  if (score >= 90) return "text-primary";
  if (score >= 80) return "text-warning-dark";
  return "text-danger";
}

export function scoreBar(score: number) {
  if (score >= 90) return "bg-primary";
  if (score >= 80) return "bg-warning";
  return "bg-danger";
}

export function formatScore(value: number, digits = 2) {
  return value.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
