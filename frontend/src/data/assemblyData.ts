export type LeaderSummary = {
  line: string;
  leader: string;
  oqc: number;
  violation: number;
  upph: number;
  ngProduksi: number;
  woClose: number;
  wip: number;
  rework: number;
  bigProblem: number;
  safetyBattery: number;
  totalNilai: number;
  ranking: number;
};

export type AssemblyKpiDefinition = {
  id: string;
  label: string;
  unit: string;
  weight: number;
  t1: number;
  t2: number;
  higherIsBetter: boolean;
  daily: Array<{ date: string; value: number | null; leader: string; line: string }>;
  perLeader: Array<{ leader: string; line: string; value: number; target: number }>;
  notes?: string;
};

export const assemblyLeaders = [
  "Edi Prasetyo",
  "Ahmad Riswanto",
  "M Wildan Firdaus",
  "Rudiyansyah",
  "Agus Riyadi",
];

export const assemblyOverviewKpis: Array<{
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  weight: number;
  score: number;
  spark: number[];
  higherIsBetter: boolean;
}> = [
  { id: "assembly-oqc", label: "OQC", current: 0.76, target: 0.6, unit: "%", weight: 20, score: 10, spark: [1.3, 1.1, 0.9, 0.7, 0.87, 0.76], higherIsBetter: false },
  { id: "assembly-violation", label: "Violation", current: 0.08, target: 0.05, unit: "%", weight: 10, score: 10, spark: [0.12, 0.11, 0.09, 0.08, 0.07, 0.06], higherIsBetter: false },
  { id: "assembly-upph", label: "UPPH", current: 9.04, target: 6.0, unit: "", weight: 20, score: 20, spark: [7.5, 8.2, 9.1, 8.8, 9.2, 9.04], higherIsBetter: true },
  { id: "assembly-ngp", label: "NG Produksi", current: 18.41, target: 29, unit: "%", weight: 10, score: 10, spark: [32, 27, 23, 19, 18, 18.41], higherIsBetter: false },
  { id: "assembly-woclose", label: "Wo Close", current: 100, target: 100, unit: "%", weight: 10, score: 10, spark: [100, 100, 100, 100, 100, 100], higherIsBetter: true },
  { id: "assembly-wip", label: "WIP", current: 384.6, target: 900, unit: "pcs", weight: 10, score: 10, spark: [400, 390, 360, 370, 385, 384.6], higherIsBetter: false },
  { id: "assembly-rework", label: "Rework", current: 0.44, target: 0.5, unit: "%", weight: 20, score: 10, spark: [1.1, 0.8, 0.6, 0.5, 0.46, 0.44], higherIsBetter: false },
];

export const assemblyOverviewTable: LeaderSummary[] = [
  { line: "Line 1", leader: "Edi Prasetyo", oqc: 0, violation: 10, upph: 0, ngProduksi: 10, woClose: 10, wip: 10, rework: 10, bigProblem: 0, safetyBattery: 0, totalNilai: 50, ranking: 5 },
  { line: "Line 2", leader: "Ahmad Riswanto", oqc: 10, violation: 10, upph: 20, ngProduksi: 10, woClose: 10, wip: 10, rework: 10, bigProblem: 0, safetyBattery: 0, totalNilai: 80, ranking: 2 },
  { line: "Line 3", leader: "M Wildan Firdaus", oqc: 0, violation: 10, upph: 0, ngProduksi: 10, woClose: 10, wip: 10, rework: 10, bigProblem: 0, safetyBattery: 0, totalNilai: 50, ranking: 5 },
  { line: "Line 4", leader: "Rudiyansyah", oqc: 20, violation: 10, upph: 20, ngProduksi: 10, woClose: 10, wip: 10, rework: 10, bigProblem: 0, safetyBattery: 0, totalNilai: 90, ranking: 1 },
  { line: "Line 5", leader: "Agus Riyadi", oqc: 10, violation: 10, upph: 20, ngProduksi: 10, woClose: 10, wip: 10, rework: 10, bigProblem: 0, safetyBattery: 0, totalNilai: 80, ranking: 2 },
];

export const assemblyPerLeaderValues = [
  { leader: "Edi Prasetyo", totalNilai: 88, target: 85 },
  { leader: "Ahmad Riswanto", totalNilai: 91, target: 85 },
  { leader: "M Wildan Firdaus", totalNilai: 74, target: 85 },
  { leader: "Rudiyansyah", totalNilai: 97, target: 85 },
  { leader: "Agus Riyadi", totalNilai: 92, target: 85 },
];

export const assemblySpvValues = [
  { spv: "Workshop 6", totalNilai: 90, target: 85 },
  { spv: "Ikhwan", totalNilai: 83, target: 85 },
  { spv: "Workshop 3", totalNilai: 76, target: 85 },
  { spv: "Workshop 4", totalNilai: 88, target: 85 },
  { spv: "Workshop 5", totalNilai: 79, target: 85 },
];

export const assemblyKpiDefinitions: Record<string, AssemblyKpiDefinition> = {
  "assembly-oqc": {
    id: "assembly-oqc",
    label: "OQC",
    unit: "%",
    weight: 20,
    t1: 1.0,
    t2: 0.6,
    higherIsBetter: false,
    daily: [
      { date: "01 Sep", value: 1.20, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "02 Sep", value: 1.32, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "03 Sep", value: 0.87, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "04 Sep", value: 0.42, leader: "Rudiyansyah", line: "Line 4" },
      { date: "05 Sep", value: 0.76, leader: "Agus Riyadi", line: "Line 5" },
      { date: "06 Sep", value: 1.08, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "07 Sep", value: 0.81, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "08 Sep", value: 0.63, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "09 Sep", value: 0.48, leader: "Rudiyansyah", line: "Line 4" },
      { date: "10 Sep", value: 0.57, leader: "Agus Riyadi", line: "Line 5" },
      { date: "11 Sep", value: 1.30, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "12 Sep", value: 0.90, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "13 Sep", value: 1.79, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "14 Sep", value: 0.44, leader: "Rudiyansyah", line: "Line 4" },
      { date: "15 Sep", value: 0.75, leader: "Agus Riyadi", line: "Line 5" },
      { date: "16 Sep", value: 0.91, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "17 Sep", value: 0.72, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "18 Sep", value: 0.66, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "19 Sep", value: 0.44, leader: "Rudiyansyah", line: "Line 4" },
      { date: "20 Sep", value: 0.74, leader: "Agus Riyadi", line: "Line 5" },
    ],
    perLeader: [
      { leader: "Edi Prasetyo", line: "Line 1", value: 1.30, target: 1.0 },
      { leader: "Ahmad Riswanto", line: "Line 2", value: 0.87, target: 1.0 },
      { leader: "M Wildan Firdaus", line: "Line 3", value: 1.79, target: 1.0 },
      { leader: "Rudiyansyah", line: "Line 4", value: 0.42, target: 1.0 },
      { leader: "Agus Riyadi", line: "Line 5", value: 0.76, target: 1.0 },
    ],
  },
  "assembly-violation": {
    id: "assembly-violation",
    label: "Violation",
    unit: "%",
    weight: 10,
    t1: 0.1,
    t2: 0.05,
    higherIsBetter: false,
    daily: [
      { date: "01 Sep", value: 0.16, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "02 Sep", value: 0.14, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "03 Sep", value: 0.09, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "04 Sep", value: 0.07, leader: "Rudiyansyah", line: "Line 4" },
      { date: "05 Sep", value: 0.08, leader: "Agus Riyadi", line: "Line 5" },
      { date: "06 Sep", value: 0.10, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "07 Sep", value: 0.12, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "08 Sep", value: 0.07, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "09 Sep", value: 0.09, leader: "Rudiyansyah", line: "Line 4" },
      { date: "10 Sep", value: 0.06, leader: "Agus Riyadi", line: "Line 5" },
    ],
    perLeader: [
      { leader: "Edi Prasetyo", line: "Line 1", value: 0.12, target: 0.1 },
      { leader: "Ahmad Riswanto", line: "Line 2", value: 0.09, target: 0.1 },
      { leader: "M Wildan Firdaus", line: "Line 3", value: 0.08, target: 0.1 },
      { leader: "Rudiyansyah", line: "Line 4", value: 0.07, target: 0.1 },
      { leader: "Agus Riyadi", line: "Line 5", value: 0.08, target: 0.1 },
    ],
  },
  "assembly-upph": {
    id: "assembly-upph",
    label: "UPPH",
    unit: "",
    weight: 20,
    t1: 5.5,
    t2: 6,
    higherIsBetter: true,
    daily: [
      { date: "01 Sep", value: 8.98, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "02 Sep", value: 7.87, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "03 Sep", value: 8.65, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "04 Sep", value: 6.70, leader: "Rudiyansyah", line: "Line 4" },
      { date: "05 Sep", value: 4.44, leader: "Agus Riyadi", line: "Line 5" },
      { date: "06 Sep", value: 8.70, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "07 Sep", value: 8.51, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "08 Sep", value: 8.92, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "09 Sep", value: 10.14, leader: "Rudiyansyah", line: "Line 4" },
      { date: "10 Sep", value: 9.21, leader: "Agus Riyadi", line: "Line 5" },
      { date: "11 Sep", value: 9.30, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "12 Sep", value: 8.73, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "13 Sep", value: 8.90, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "14 Sep", value: 11.21, leader: "Rudiyansyah", line: "Line 4" },
      { date: "15 Sep", value: 9.04, leader: "Agus Riyadi", line: "Line 5" },
    ],
    perLeader: [
      { leader: "Edi Prasetyo", line: "Line 1", value: 8.64, target: 6 },
      { leader: "Ahmad Riswanto", line: "Line 2", value: 8.81, target: 6 },
      { leader: "M Wildan Firdaus", line: "Line 3", value: 7.93, target: 6 },
      { leader: "Rudiyansyah", line: "Line 4", value: 11.21, target: 6 },
      { leader: "Agus Riyadi", line: "Line 5", value: 9.04, target: 6 },
    ],
  },
  "assembly-ngp": {
    id: "assembly-ngp",
    label: "NG Produksi",
    unit: "%",
    weight: 10,
    t1: 32,
    t2: 29,
    higherIsBetter: false,
    daily: [
      { date: "01 Sep", value: 37.22, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "02 Sep", value: 20.19, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "03 Sep", value: 16.14, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "04 Sep", value: 9.17, leader: "Rudiyansyah", line: "Line 4" },
      { date: "05 Sep", value: 18.41, leader: "Agus Riyadi", line: "Line 5" },
      { date: "06 Sep", value: 28.50, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "07 Sep", value: 23.14, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "08 Sep", value: 19.01, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "09 Sep", value: 13.80, leader: "Rudiyansyah", line: "Line 4" },
      { date: "10 Sep", value: 14.93, leader: "Agus Riyadi", line: "Line 5" },
    ],
    perLeader: [
      { leader: "Edi Prasetyo", line: "Line 1", value: 37.22, target: 29 },
      { leader: "Ahmad Riswanto", line: "Line 2", value: 20.19, target: 29 },
      { leader: "M Wildan Firdaus", line: "Line 3", value: 16.14, target: 29 },
      { leader: "Rudiyansyah", line: "Line 4", value: 9.17, target: 29 },
      { leader: "Agus Riyadi", line: "Line 5", value: 18.41, target: 29 },
    ],
  },
  "assembly-woclose": {
    id: "assembly-woclose",
    label: "Wo Close",
    unit: "%",
    weight: 10,
    t1: 24,
    t2: 10,
    higherIsBetter: true,
    daily: [
      { date: "01 Sep", value: 100, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "02 Sep", value: 100, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "03 Sep", value: 100, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "04 Sep", value: 100, leader: "Rudiyansyah", line: "Line 4" },
      { date: "05 Sep", value: 100, leader: "Agus Riyadi", line: "Line 5" },
      { date: "06 Sep", value: 100, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "07 Sep", value: 100, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "08 Sep", value: 100, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "09 Sep", value: 100, leader: "Rudiyansyah", line: "Line 4" },
      { date: "10 Sep", value: 100, leader: "Agus Riyadi", line: "Line 5" },
    ],
    perLeader: [
      { leader: "Edi Prasetyo", line: "Line 1", value: 100, target: 100 },
      { leader: "Ahmad Riswanto", line: "Line 2", value: 100, target: 100 },
      { leader: "M Wildan Firdaus", line: "Line 3", value: 100, target: 100 },
      { leader: "Rudiyansyah", line: "Line 4", value: 100, target: 100 },
      { leader: "Agus Riyadi", line: "Line 5", value: 100, target: 100 },
    ],
  },
  "assembly-wip": {
    id: "assembly-wip",
    label: "WIP",
    unit: "pcs",
    weight: 10,
    t1: 1000,
    t2: 900,
    higherIsBetter: false,
    daily: [
      { date: "01 Sep", value: 425.3, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "02 Sep", value: 358.0, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "03 Sep", value: 177.0, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "04 Sep", value: 291.7, leader: "Rudiyansyah", line: "Line 4" },
      { date: "05 Sep", value: 384.6, leader: "Agus Riyadi", line: "Line 5" },
      { date: "06 Sep", value: 402.8, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "07 Sep", value: 344.2, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "08 Sep", value: 204.1, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "09 Sep", value: 312.4, leader: "Rudiyansyah", line: "Line 4" },
      { date: "10 Sep", value: 389.1, leader: "Agus Riyadi", line: "Line 5" },
    ],
    perLeader: [
      { leader: "Edi Prasetyo", line: "Line 1", value: 425.3, target: 900 },
      { leader: "Ahmad Riswanto", line: "Line 2", value: 358.0, target: 900 },
      { leader: "M Wildan Firdaus", line: "Line 3", value: 177.0, target: 900 },
      { leader: "Rudiyansyah", line: "Line 4", value: 291.7, target: 900 },
      { leader: "Agus Riyadi", line: "Line 5", value: 384.6, target: 900 },
    ],
  },
  "assembly-rework": {
    id: "assembly-rework",
    label: "Rework",
    unit: "%",
    weight: 20,
    t1: 1.0,
    t2: 0.5,
    higherIsBetter: false,
    daily: [
      { date: "01 Sep", value: 1.32, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "02 Sep", value: 0.0, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "03 Sep", value: 0.0, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "04 Sep", value: 0.0, leader: "Rudiyansyah", line: "Line 4" },
      { date: "05 Sep", value: 0.0, leader: "Agus Riyadi", line: "Line 5" },
      { date: "06 Sep", value: 0.80, leader: "Edi Prasetyo", line: "Line 1" },
      { date: "07 Sep", value: 0.0, leader: "Ahmad Riswanto", line: "Line 2" },
      { date: "08 Sep", value: 0.0, leader: "M Wildan Firdaus", line: "Line 3" },
      { date: "09 Sep", value: 0.0, leader: "Rudiyansyah", line: "Line 4" },
      { date: "10 Sep", value: 0.0, leader: "Agus Riyadi", line: "Line 5" },
    ],
    perLeader: [
      { leader: "Edi Prasetyo", line: "Line 1", value: 1.32, target: 0.5 },
      { leader: "Ahmad Riswanto", line: "Line 2", value: 0.0, target: 0.5 },
      { leader: "M Wildan Firdaus", line: "Line 3", value: 0.0, target: 0.5 },
      { leader: "Rudiyansyah", line: "Line 4", value: 0.0, target: 0.5 },
      { leader: "Agus Riyadi", line: "Line 5", value: 0.0, target: 0.5 },
    ],
  },
};

export const assemblyKpiOrder = [
  "assembly-oqc",
  "assembly-violation",
  "assembly-upph",
  "assembly-ngp",
  "assembly-woclose",
  "assembly-wip",
  "assembly-rework",
] as const;

export const assemblyPageMap = {
  "assembly-overview": "Overview",
  "assembly-oqc": "OQC",
  "assembly-violation": "Violation",
  "assembly-upph": "UPPH",
  "assembly-ngp": "NG Produksi",
  "assembly-woclose": "Wo Close",
  "assembly-wip": "WIP",
  "assembly-rework": "Rework",
} as const;

export const assemblyLeaderBar = [
  { leader: "Edi Prasetyo", total: 47190, target: 47200 },
  { leader: "Ahmad Riswanto", total: 53745, target: 53730 },
  { leader: "M Wildan Firdaus", total: 31612, target: 31510 },
  { leader: "Rudiyansyah", total: 52791, target: 52660 },
  { leader: "Agus Riyadi", total: 12991, target: 13070 },
];

export const assemblyPencapaianTarget = [
  { leader: "Edi Prasetyo", hasil: 47565, target: 47190 },
  { leader: "Ahmad Riswanto", hasil: 53745, target: 53730 },
  { leader: "M Wildan Firdaus", hasil: 31612, target: 31510 },
  { leader: "Rudiyansyah", hasil: 52791, target: 52660 },
  { leader: "Agus Riyadi", hasil: 12991, target: 13070 },
];
