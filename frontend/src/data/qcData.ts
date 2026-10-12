export type AchievementItem = {
  title: string;
  value: string;
  label: string;
  status: "ok" | "warn" | "bad";
};

export type DefectItem = {
  name: string;
  percent: number;
  count: number;
};

export const qcAchievementData: AchievementItem[] = [
  { title: "FQC", value: "95.8%", label: "Pass rate", status: "ok" },
  { title: "OQC", value: "92.3%", label: "Pass rate", status: "warn" },
  { title: "Pengecekan 302", value: "95.7%", label: "Lot diterima", status: "ok" },
  { title: "ODM", value: "68%", label: "Progress improvement", status: "ok" },
  { title: "NGP", value: "3.1%", label: "NGP rate", status: "bad" },
  { title: "Return China", value: "1.8%", label: "Return rate", status: "ok" },
];

export const fqcData = {
  updatedAt: "16:45 WIB",
  kpis: [
    { label: "Total Inspeksi", value: 1280, unit: "" },
    { label: "NG Ditemukan", value: 54, unit: "" },
    { label: "NG Rate", value: 4.2, unit: "%" },
    { label: "Pass Rate", value: 95.8, unit: "%" },
  ],
  trend: [
    { date: "12 Sep", value: 4 },
    { date: "13 Sep", value: 5 },
    { date: "14 Sep", value: 6 },
    { date: "15 Sep", value: 7 },
    { date: "16 Sep", value: 5 },
    { date: "17 Sep", value: 6 },
    { date: "18 Sep", value: 8 },
  ],
  modelRates: [
    { model: "CB4", value: 3.2 },
    { model: "Nairobi", value: 4.8 },
    { model: "Baikal B4 LX", value: 2.9 },
    { model: "DB5", value: 5.6 },
  ],
  areaMaterial: [
    { name: "Top Cover", value: 22 },
    { name: "Bottom Cover", value: 18 },
    { name: "Battery Cover", value: 15 },
    { name: "Kamera", value: 12 },
    { name: "Decorative", value: 10 },
    { name: "Lainnya", value: 23 },
  ],
  defectBreakdown: [
    { name: "Gores", percent: 30, count: 16, unit: "unit" },
    { name: "Penyok", percent: 26, count: 14, unit: "unit" },
    { name: "Warna", percent: 20, count: 11, unit: "unit" },
    { name: "Komponen", percent: 15, count: 8, unit: "unit" },
    { name: "Lainnya", percent: 9, count: 5, unit: "unit" },
  ],
  summaryCards: [
    { label: "MODEL TERBURUK", value: "DB5", note: "NG Rate tertinggi" },
    { label: "NG RATE", value: "5.6%", note: "rata-rata 4.2%" },
    { label: "TOTAL NG", value: "54", note: "dari 1280 inspeksi" },
    { label: "MASALAH DOMINAN", value: "Gores", note: "16 unit · 30%" },
    { label: "AREA PRIORITAS", value: "Top Cover", note: "22% · Bottom 18%" },
    { label: "PENYEBAB KEDUA", value: "Penyok", note: "14 unit · 26%" },
  ],
};

export const oqcData = {
  updatedAt: "15:30 WIB",
  kpis: [
    { label: "Total Inspeksi", value: 960, unit: "" },
    { label: "NG Ditemukan", value: 74, unit: "" },
    { label: "NG Rate", value: 7.7, unit: "%" },
    { label: "Pass Rate", value: 92.3, unit: "%" },
  ],
  trend: [
    { date: "08:00", value: 6 },
    { date: "09:00", value: 8 },
    { date: "10:00", value: 10 },
    { date: "11:00", value: 12 },
    { date: "12:00", value: 9 },
    { date: "13:00", value: 11 },
    { date: "14:00", value: 14 },
    { date: "15:00", value: 13 },
    { date: "16:00", value: 15 },
    { date: "17:00", value: 12 },
  ],
  lineRates: [
    { line: "L1", value: 20 },
    { line: "L2", value: 18 },
    { line: "L3", value: 14 },
    { line: "L4", value: 12 },
    { line: "L5", value: 10 },
  ],
  areaMaterial: [
    { name: "Top Cover", value: 24 },
    { name: "Bottom Cover", value: 20 },
    { name: "Battery Cover", value: 16 },
    { name: "Kamera", value: 13 },
    { name: "Decorative", value: 11 },
    { name: "Lainnya", value: 16 },
  ],
  defectBreakdown: [
    { name: "Gores", percent: 34, count: 25, unit: "unit" },
    { name: "Penyok", percent: 22, count: 16, unit: "unit" },
    { name: "Warna", percent: 18, count: 13, unit: "unit" },
    { name: "Komponen", percent: 16, count: 12, unit: "unit" },
    { name: "Lainnya", percent: 10, count: 8, unit: "unit" },
  ],
  summaryCards: [
    { label: "LINI TERBURUK", value: "L1", note: "NG 20 unit" },
    { label: "NG RATE", value: "7.7%", note: "74 dari 960 inspeksi" },
    { label: "TOTAL NG", value: "74", note: "keseluruhan" },
    { label: "MASALAH DOMINAN", value: "Gores", note: "25 unit · 34%" },
    { label: "AREA PRIORITAS", value: "Top Cover", note: "24% · Bottom 20%" },
    { label: "PENYEBAB KEDUA", value: "Penyok", note: "16 unit · 22%" },
  ],
};

export type SolutionSource = "FQC" | "OQC";

export type SolutionRecord = {
  id: number;
  source: SolutionSource;
  model: string;
  solution: string;
  dueDate: string;
  evidence: string;
};

export const initialSolutions: SolutionRecord[] = [
  {
    id: 1,
    source: "FQC",
    model: "DB5",
    solution: "Pengecekan alignment cover dan setting pressure pada proses pemasangan dilakukan pada jam shift 2.",
    dueDate: "2026-10-04",
    evidence: "foto-fqc-db5.png",
  },
  {
    id: 2,
    source: "OQC",
    model: "CB4",
    solution: "Penambahan inspeksi visual akhir pada area top cover untuk mencegah gores saat pengepakan.",
    dueDate: "2026-10-05",
    evidence: "foto-oqc-cb4.jpg",
  },
];
