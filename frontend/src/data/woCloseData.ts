export type WoType = "Standard" | "Non-Standard";

export type KpiEntry = {
  key: "launch" | "completion" | "closing";
  label: string;
  value: number;
  target: number;
};

export const woCloseWorkOrderTypes: WoType[] = ["Standard", "Non-Standard"];

export const woCloseKpiByType: Record<WoType, Record<KpiEntry["key"], KpiEntry>> = {
  Standard: {
    launch: { key: "launch", label: "On-time work order launch rate", value: 33.73, target: 92 },
    completion: { key: "completion", label: "Standard Work Order - one time completion rate", value: 88.78, target: 97 },
    closing: { key: "closing", label: "On-time closing rate of work orders", value: 98.3, target: 95 },
  },
  "Non-Standard": {
    launch: { key: "launch", label: "On-time work order launch rate", value: 13.19, target: 92 },
    completion: { key: "completion", label: "Standard Work Order - one time completion rate", value: 72.11, target: 97 },
    closing: { key: "closing", label: "On-time closing rate of work orders", value: 100, target: 95 },
  },
};

export const woCloseBreakdown: Record<WoType, Array<{ name: string; rate: number | null; closed: number | null; total: number | null }>> = {
  Standard: [
    { name: "SMT", rate: 99.78, closed: 448, total: 449 },
    { name: "PA", rate: 98.1, closed: 670, total: 683 },
    { name: "TA", rate: 96.79, closed: 694, total: 717 },
    { name: "PK", rate: 99.0, closed: 789, total: 797 },
    { name: "KD", rate: null, closed: null, total: null },
  ],
  "Non-Standard": [
    { name: "Pack", rate: 100, closed: 26, total: 26 },
    { name: "Rework_NON", rate: 100, closed: 488, total: 488 },
    { name: "Disass'y", rate: 100, closed: 3, total: 3 },
    { name: "WP", rate: null, closed: null, total: null },
    { name: "Rework", rate: 100, closed: 48, total: 48 },
  ],
};

export const woAchievementData = [
  { period: "W10", dayRate: 1.36, closedRate: 100, target: 1.5 },
  { period: "3/9/2026", dayRate: 1.32, closedRate: 100, target: 1.5 },
  { period: "3/10/2026", dayRate: 1.32, closedRate: 100, target: 1.5 },
  { period: "3/11/2026", dayRate: 1.29, closedRate: 100, target: 1.5 },
  { period: "3/12/2026", dayRate: 1.4, closedRate: 100, target: 1.5 },
  { period: "3/13/2026", dayRate: 1.31, closedRate: 100, target: 1.5 },
  { period: "W11", dayRate: 1.32, closedRate: 100, target: 1.5 },
  { period: "Mar", dayRate: 1.36, closedRate: 100, target: 1.5 },
];

export const woDistributionByType: Record<WoType, Array<{ date: string; closedOnTime: number; total: number; rate: number; target: number }>> = {
  Standard: [
    { date: "20260301", closedOnTime: 35, total: 35, rate: 100, target: 92 },
    { date: "20260302", closedOnTime: 210, total: 215, rate: 97.67, target: 92 },
    { date: "20260303", closedOnTime: 238, total: 240, rate: 99.17, target: 92 },
    { date: "20260304", closedOnTime: 160, total: 163, rate: 98.16, target: 92 },
    { date: "20260305", closedOnTime: 203, total: 208, rate: 97.6, target: 92 },
    { date: "20260306", closedOnTime: 227, total: 235, rate: 96.6, target: 92 },
    { date: "20260307", closedOnTime: 92, total: 95, rate: 96.84, target: 92 },
    { date: "20260308", closedOnTime: 7, total: 7, rate: 100, target: 92 },
    { date: "20260309", closedOnTime: 230, total: 235, rate: 97.87, target: 92 },
    { date: "20260310", closedOnTime: 272, total: 277, rate: 98.19, target: 92 },
    { date: "20260311", closedOnTime: 285, total: 293, rate: 97.27, target: 92 },
  ],
  "Non-Standard": [
    { date: "20260301", closedOnTime: 5, total: 5, rate: 100, target: 92 },
    { date: "20260302", closedOnTime: 22, total: 22, rate: 100, target: 92 },
    { date: "20260303", closedOnTime: 22, total: 22, rate: 100, target: 92 },
    { date: "20260304", closedOnTime: 35, total: 35, rate: 100, target: 92 },
    { date: "20260305", closedOnTime: 53, total: 53, rate: 100, target: 92 },
    { date: "20260306", closedOnTime: 56, total: 56, rate: 100, target: 92 },
    { date: "20260307", closedOnTime: 25, total: 25, rate: 100, target: 92 },
    { date: "20260308", closedOnTime: 1, total: 1, rate: 100, target: 92 },
    { date: "20260309", closedOnTime: 61, total: 61, rate: 100, target: 92 },
    { date: "20260310", closedOnTime: 47, total: 47, rate: 100, target: 92 },
    { date: "20260311", closedOnTime: 60, total: 60, rate: 100, target: 92 },
  ],
};

export const factoryAchievementByType: Record<WoType, Array<{ factory: string; rate: number; highlight?: boolean }>> = {
  Standard: [
    { factory: "Indonesia", rate: 100, highlight: true },
    { factory: "SMT 制造部", rate: 100 },
    { factory: "India factory", rate: 99.43 },
    { factory: "Changan Factory", rate: 98.59 },
    { factory: "Chongqing Factory", rate: 96.14 },
  ],
  "Non-Standard": [
    { factory: "Changan Factory", rate: 100 },
    { factory: "Chongqing Factory", rate: 100 },
    { factory: "India factory", rate: 100 },
    { factory: "Indonesia", rate: 100, highlight: true },
  ],
};

export const workshopRankingByType: Record<WoType, Array<{ name: string; rate: number; quantity: number }>> = {
  Standard: [
    { name: "Changan Factory", rate: 100, quantity: 4 },
    { name: "Chongqing Factory", rate: 100, quantity: 3 },
    { name: "Indonesia factory", rate: 100, quantity: 2 },
  ],
  "Non-Standard": [
    { name: "Changan Factory", rate: 100, quantity: 4 },
    { name: "Chongqing Factory", rate: 100, quantity: 3 },
    { name: "Indonesia factory", rate: 100, quantity: 2 },
  ],
};

export const lineRankingByType: Record<WoType, string[]> = {
  Standard: ["ASC10301", "CSC10516", "CSC10517", "CSC10518", "PAB10301", "PAB10302", "PAB10304", "PAB10501", "PAB10503"],
  "Non-Standard": ["4RC20501", "PAB11703", "PAC20501", "PKB10602", "PKB10804", "PKB10806", "PKB10816", "PKB10904", "PKB61006"],
};

export const woCloseReportTypes = ["Daily report", "Weekly report", "Monthly report"] as const;
export const woCloseWorkshopTypes = ["Mass production", "All"] as const;
export const woCloseWorkOrderCategories = ["Standard", "Non-Standard", "All"] as const;
