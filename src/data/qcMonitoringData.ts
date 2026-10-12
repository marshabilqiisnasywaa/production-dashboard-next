export type QcModuleKey = "FQC" | "OQC" | "ODM";

export const QC_MODULES: QcModuleKey[] = ["FQC", "OQC", "ODM"];

export const QC_MODELS = ["CB4", "Nairobi", "Baikal B4 LX", "DB 5"];

export const QC_AREAS = ["Top Cover", "Battery Cover", "Bottom Cover", "Speaker Cover"];

export const QC_DEFECTS = ["Contamination", "Crack", "Dent", "Misalignment", "Scratch"];

export const QC_DEFECT_COLORS = ["#064E3B", "#047857", "#0D9488", "#10B981", "#64748B"];

export const QC_DAY_ISO: string[] = [
  "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27",
  "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02",
  "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06",
];

export const QC_DAY_LABEL: string[] = [
  "23 Sep", "24 Sep", "25 Sep", "26 Sep", "27 Sep",
  "28 Sep", "29 Sep", "30 Sep", "1 Oct", "2 Oct",
  "3 Oct", "4 Oct", "5 Oct", "6 Oct",
];

function wave(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export type QcModuleData = {
  key: QcModuleKey;
  title: string;
  accTarget: number;
  ngTarget: number;
  totalSample: number;
  dailyAcc: number[];
  dailyNg: number[];
  modelNg: number[][];
  areaAcc: number[][];
  defects: number[][][];
};

function buildModule(key: QcModuleKey, seedBase: number, accBase: number, ngBase: number, totalSample: number): QcModuleData {
  const days = QC_DAY_ISO.length;
  const dailyAcc = QC_DAY_ISO.map((_, day) => Number((accBase + Math.sin((day + seedBase) * 0.85) * 0.9 + wave(seedBase * 10 + day) * 0.5).toFixed(2)));
  const dailyNg = QC_DAY_ISO.map((_, day) => Number(Math.max(0.2, ngBase + Math.sin((day + seedBase + 3) * 0.9) * 0.45 + wave(seedBase * 20 + day) * 0.3).toFixed(2)));
  const modelNg = QC_MODELS.map((_, model) => QC_DAY_ISO.map((_, day) => Number(Math.max(0.2, ngBase + (model - 1.5) * 0.35 + Math.sin((day + seedBase + model * 2) * 0.8) * 0.5 + wave(seedBase * 30 + model * 7 + day) * 0.3).toFixed(2))));
  const areaAcc = QC_AREAS.map((_, area) => QC_DAY_ISO.map((_, day) => Number((accBase + (1.5 - area) * 0.3 + Math.sin((day + seedBase + area) * 0.75) * 0.6 + wave(seedBase * 40 + area * 11 + day) * 0.3).toFixed(2))));
  const defects = QC_AREAS.map((_, area) => QC_DEFECTS.map((_, defect) => QC_DAY_ISO.map((_, day) => Math.max(0, Math.round(6 + (defect === 0 ? 4 : 0) + Math.sin((day + seedBase + area * 3 + defect * 5) * 0.9) * 4 + wave(seedBase * 50 + area * 13 + defect * 17 + day) * 5)))));
  return { key, title: `${key} Monitoring`, accTarget: 100 - ngBase - 1, ngTarget: ngBase, totalSample, dailyAcc, dailyNg, modelNg, areaAcc, defects };
}

export const QC_MODULE_DATA: Record<QcModuleKey, QcModuleData> = {
  FQC: buildModule("FQC", 1, 97.4, 2.1, 12480),
  OQC: buildModule("OQC", 5, 98.5, 1.2, 8960),
  ODM: buildModule("ODM", 9, 96.6, 2.8, 5340),
};

export function cutoffIndex(asOf: string): number {
  let end = QC_DAY_ISO.length - 1;
  for (let index = 0; index < QC_DAY_ISO.length; index += 1) {
    if (QC_DAY_ISO[index] <= asOf) end = index;
  }
  return end;
}
