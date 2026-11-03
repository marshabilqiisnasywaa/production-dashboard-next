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

export type ScoreDetailItem = {
  label: string;
  value: number;
  max: number;
};

export function computeDmScores(leaders: LeaderScore[], target = 90): Record<string, DmScore> {
  const groups = new Map<string, LeaderScore[]>();
  for (const leader of leaders) {
    const members = groups.get(leader.dm) ?? [];
    members.push(leader);
    groups.set(leader.dm, members);
  }

  const scored: DmScore[] = [...groups.entries()].map(([dm, members]) => {
    const average = (key: "before" | "current" | "after") => members.reduce((sum, member) => sum + member[key], 0) / members.length;
    const before = average("before");
    const current = average("current");
    const after = average("after");
    const total = before + current + after;
    const topLeader = [...members].sort((a, b) => b.total - a.total)[0];
    return { dm, before, current, after, total, rank: 0, gap: target - total, hasLeaders: true, leader: topLeader.leader, members };
  });

  scored
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

export type SqdipDimKey = "safety" | "quality" | "delivery" | "inventory" | "productivity";
export const SQDIP_DIMS: { key: SqdipDimKey; label: string }[] = [
  { key: "safety", label: "Safety" }, { key: "quality", label: "Quality" }, { key: "delivery", label: "Delivery" },
  { key: "inventory", label: "Inventory" }, { key: "productivity", label: "Productivity" }];
