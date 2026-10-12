export type CostPage = "Monitoring" | "Losses Cost" | "Cost Transfer" | "Cost Improvement";
export type CostNav = { kpiKey?: string; area?: string; category?: string; date?: string };
export type NavigateCost = (page: CostPage, nav?: CostNav) => void;

export type TransferStage = "Konfirm Vendor" | "On Process SRM" | "G-FSC" | "Approve GFSC";
export type LossRecord = {
  id: string;
  week: number;
  date: string;
  area: string;
  description: string;
  type: "Internal" | "External";
  category: string;
  responsibility: string;
  pic: string;
  transfer: boolean;
  cost: number;
  weeklySlc: number;
  monthlySlc: number;
  vendor?: string;
  stage?: TransferStage;
};
export type ImprovementStatus = "Done" | "On Progress" | "Delayed";
export type Improvement = {
  id: string;
  category: string;
  title: string;
  pic: string;
  due: string;
  status: ImprovementStatus;
  startMonth: number;
  saving: number;
  monthlyImpact: number;
  accSaving: number;
  accImpact: number;
};

export const GFSC_TAX_RATE = 0.13;
export const SLC_COST_BASE = 1_300_000;
export const lossCategories = ["Changeover", "Clearance", "Manpower Doc PE", "Market Demand", "Masalah Material", "Masalah Software", "New Model", "New Model / Masalah Software"] as const;
export const lossAreas = ["Instalasi/Packing", "Instalasi", "Packing", "Assembly", "QC", "Changeover", "Rework", "Produksi"] as const;
export const improvementStrategies = ["Reduce Indirect", "Reduce Direct", "Increase UPH", "Rampup Optimization", "Saving Cost by Arrangement"] as const;
export const transferStages: TransferStage[] = ["Konfirm Vendor", "On Process SRM", "G-FSC", "Approve GFSC"];

const descriptions = ["Material mismatch during line preparation", "Clearance delay increased rework hours", "Manpower document review created idle time", "Demand revision caused excess handling", "Material defect required additional inspection", "Software issue blocked production release", "New model setup required extra support", "New model software validation created delay"];
const pics = ["Yusriyadi", "Andri", "Rina", "Siti Rahma", "Hendra Wijaya", "Dewi Lestari"];

// Deterministic seed; ganti dengan fetch API.
export const lossRecords: LossRecord[] = Array.from({ length: 128 }, (_, index) => {
  const transfer = index % 13 < 5;
  const stage = transfer ? transferStages[index % transferStages.length] : undefined;
  const vendor = transfer ? `Vendor ${String.fromCharCode(65 + (index % 12))}` : undefined;
  const cost = 240_000 + ((index * 83_000) % 1_860_000);
  return {
    id: `LOSS-${String(index + 1).padStart(3, "0")}`,
    week: (index % 8) + 1,
    date: `2026-${String((index % 9) + 1).padStart(2, "0")}-${String((index % 27) + 1).padStart(2, "0")}`,
    area: lossAreas[index % lossAreas.length],
    description: descriptions[index % descriptions.length],
    type: index % 3 === 0 ? "External" : "Internal",
    category: lossCategories[index % lossCategories.length],
    responsibility: index % 2 === 0 ? "Produksi" : "Engineering",
    pic: pics[index % pics.length],
    transfer,
    cost,
    weeklySlc: Math.round(cost / SLC_COST_BASE * 10000) / 100,
    monthlySlc: Math.round(cost / SLC_COST_BASE * 10000) / 100,
    vendor,
    stage,
  };
});

export const improvements: Improvement[] = (() => {
  let accSaving = 0;
  let accImpact = 0;
  return Array.from({ length: 128 }, (_, index) => {
    const status: ImprovementStatus = index < 84 ? "Done" : index < 116 ? "On Progress" : "Delayed";
    const saving = 120_000 + ((index * 47_000) % 680_000);
    const impact = 20_000 + ((index * 19_000) % 180_000);
    accSaving += saving;
    accImpact += impact;
    return {
      id: `IMP-${String(index + 1).padStart(3, "0")}`,
      category: improvementStrategies[index % improvementStrategies.length],
      title: `${improvementStrategies[index % improvementStrategies.length]} initiative ${index + 1}`,
      pic: pics[index % pics.length],
      due: `2026-${String((index % 9) + 1).padStart(2, "0")}-${String((index % 27) + 1).padStart(2, "0")}`,
      status,
      startMonth: (index % 8) + 1,
      saving,
      monthlyImpact: impact,
      accSaving,
      accImpact,
    };
  });
})();

export const achievementByStrategy = improvementStrategies.reduce<Record<string, { reducedMan: { before: number; after: number }; uph: { before: number; after: number } }>>((result, strategy, index) => {
  result[strategy] = { reducedMan: { before: 4.32 + index * .08, after: 3.76 + index * .05 }, uph: { before: 7.1 + index * .2, after: 8.2 + index * .24 } };
  return result;
}, {});

export function getSeries(metric: "loss" | "transfer" | "saving", period: "Today" | "Week" | "Month" | "Year" | "8 Minggu" | "6 Bulan" | "1 Tahun" | "Custom") {
  const length = period === "Today" ? 8 : period === "Year" || period === "1 Tahun" ? 12 : period === "Month" || period === "6 Bulan" ? 6 : 8;
  return Array.from({ length }, (_, index) => {
    const factor = metric === "transfer" ? .38 : metric === "saving" ? .22 : 1;
    const base = metric === "saving" ? improvements.filter((item) => item.startMonth === (index % 8) + 1).reduce((sum, item) => sum + item.saving, 0) : lossRecords.filter((item) => item.week === (index % 8) + 1 && (metric !== "transfer" || item.transfer)).reduce((sum, item) => sum + item.cost, 0);
    return { label: period === "Today" ? `${index + 1}:00` : period === "Year" || period === "1 Tahun" ? `Bulan ${index + 1}` : period === "Month" || period === "6 Bulan" ? `B${index + 1}` : `W${index + 1}`, value: Math.round(base * (metric === "transfer" ? 1 : factor || 1)) };
  });
}
