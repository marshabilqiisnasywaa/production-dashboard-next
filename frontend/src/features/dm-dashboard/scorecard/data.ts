export type ScoreTab = "Papercard" | "Standup Meeting" | "SQDIP" | "Reward & Punishment" | "Tahunan";
export type ScoreTrend = "Total" | "Before" | "Current" | "After";

export const leaderScores = [
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

export type DmScoreConfig = {
  total: number;
  before: number;
  current: number;
  after: number;
  leader: string;
  rank: number;
  details: {
    before: ScoreDetailItem[];
    current: ScoreDetailItem[];
    after: ScoreDetailItem[];
  };
};

export const dmScoreConfigs: Record<"DM 3" | "DM 4", DmScoreConfig> = {
  "DM 3": {
    total: 88.35,
    before: 30,
    current: 32.3,
    after: 26.05,
    leader: "Ahmad Riswanto",
    rank: 1,
    details: {
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
  },
  "DM 4": {
    total: 88.25,
    before: 29.85,
    current: 32.35,
    after: 26.05,
    leader: "Rudiyansyah",
    rank: 2,
    details: {
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
  },
};

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
