import type { Kpi, KpiActual, KpiTarget } from "@/types/morningMeeting";
import { productionKpis, productionKpiTargets2026 } from "@/data/morningMeetingMasterData";

export const morningMeetingMonths = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"] as const;
export const latestMorningMeetingMonth = "2026-07" as const;

type MonthlyValue = Record<(typeof morningMeetingMonths)[number], number | null>;

export type ProductionKpiActualRow = {
  no: number;
  code: string;
  kpi: Kpi;
  target: KpiTarget;
  pic: string | null;
  aktual2026Excel: number | null;
  monthly: MonthlyValue;
  actuals: KpiActual[];
};

const rawKpiActuals: { no: number; code: string; kpiId: string; pic: string | null; t1: number; t2: number; aktual2026Excel: number | null; monthly: MonthlyValue }[] = [
  { no: 1, code: "oqc", kpiId: "oqc-defect-rate", pic: "SOLI", t1: 0.02, t2: 0.01, aktual2026Excel: 0.0126, monthly: { "2026-01": 0.0105, "2026-02": 0.0126, "2026-03": 0.0155, "2026-04": 0.0152, "2026-05": 0.0123, "2026-06": 0.0111, "2026-07": 0.011 } },
  { no: 2, code: "slc", kpiId: "single-labor-cost", pic: "ALVIN CHANDRA / REYNARD", t1: 3.7, t2: 3.67, aktual2026Excel: 3.56, monthly: { "2026-01": 4.05, "2026-02": 3.35, "2026-03": 6.81, "2026-04": 2.78, "2026-05": 3.93, "2026-06": 3.36, "2026-07": 2.98 } },
  { no: 3, code: "ngp", kpiId: "ngp", pic: "SOLI", t1: 0.3, t2: 0.3, aktual2026Excel: 0.22, monthly: { "2026-01": 0.11, "2026-02": 0.21, "2026-03": 0.36, "2026-04": 0.25, "2026-05": 0.24, "2026-06": 0.3, "2026-07": 0.244 } },
  { no: 4, code: "losses-material", kpiId: "losses-material", pic: "RICKHY LADIANSYAH", t1: 0.51, t2: 0.51, aktual2026Excel: 0.43, monthly: { "2026-01": 0.24, "2026-02": 0.38, "2026-03": 0.48, "2026-04": 0.42, "2026-05": 0.41, "2026-06": 0.55, "2026-07": 0.54 } },
  { no: 5, code: "e2e-delivery", kpiId: "end-to-end-delivery-time", pic: "ALVIN CHANDRA", t1: 60.45, t2: 58.41, aktual2026Excel: 62.1, monthly: { "2026-01": 57.52, "2026-02": 58.33, "2026-03": 62.93, "2026-04": 63.28, "2026-05": 68.87, "2026-06": 62.31, "2026-07": 104.6 } },
  { no: 6, code: "wo-close", kpiId: "wo-close-3d-on-time", pic: "IRFAN NURCHOLIS", t1: 0.98, t2: 0.99, aktual2026Excel: 0.9961, monthly: { "2026-01": 0.9869, "2026-02": 0.9922, "2026-03": 0.9932, "2026-04": 1, "2026-05": 1, "2026-06": 1, "2026-07": 1 } },
  { no: 7, code: "big-problem", kpiId: "big-problem", pic: "AS'AD", t1: 0, t2: 0, aktual2026Excel: 0, monthly: { "2026-01": 0, "2026-02": 0, "2026-03": 0, "2026-04": 0, "2026-05": 0, "2026-06": 0, "2026-07": 0 } },
  { no: 8, code: "safety-battery", kpiId: "battery-safety", pic: "IKHWAN HANDOKO", t1: 0, t2: 0, aktual2026Excel: 0, monthly: { "2026-01": 0, "2026-02": 0, "2026-03": 0, "2026-04": 0, "2026-05": 0, "2026-06": 0, "2026-07": 0 } },
  { no: 9, code: "safety-incident", kpiId: "safety-incident", pic: "ALVIN CHANDRA", t1: 0, t2: 0, aktual2026Excel: 0, monthly: { "2026-01": 0, "2026-02": 0, "2026-03": 0, "2026-04": 0, "2026-05": 0, "2026-06": 0, "2026-07": 0 } },
  { no: 10, code: "safety-information", kpiId: "safety-information", pic: null, t1: 0, t2: 0, aktual2026Excel: 0, monthly: { "2026-01": 0, "2026-02": 0, "2026-03": 0, "2026-04": 0, "2026-05": 0, "2026-06": 0, "2026-07": 0 } },
  { no: 11, code: "safety-material", kpiId: "safety-material", pic: null, t1: 0, t2: 0, aktual2026Excel: 0, monthly: { "2026-01": 0, "2026-02": 0, "2026-03": 0, "2026-04": 0, "2026-05": 0, "2026-06": 0, "2026-07": 0 } },
  { no: 12, code: "upph", kpiId: "upph", pic: "SUBAGYO", t1: 5.26, t2: 5.26, aktual2026Excel: 5.57, monthly: { "2026-01": 5.46, "2026-02": 5.66, "2026-03": 5.48, "2026-04": 5.43, "2026-05": 5.3, "2026-06": 5.55, "2026-07": 6.17 } },
  { no: 13, code: "material-mgmt-impact", kpiId: "material-management-impact", pic: "IRFAN NURCHOLIS", t1: 3, t2: 1, aktual2026Excel: 1, monthly: { "2026-01": 0, "2026-02": 0, "2026-03": 1, "2026-04": 0, "2026-05": 0, "2026-06": 0, "2026-07": 0 } },
  { no: 14, code: "smed", kpiId: "smed", pic: "FAJRUL AL HUDA", t1: 6, t2: 6, aktual2026Excel: 9.9, monthly: { "2026-01": 9.8, "2026-02": 7.3, "2026-03": null, "2026-04": 7.85, "2026-05": 7.2, "2026-06": 8, "2026-07": 7.1 } },
  { no: 15, code: "lean-5s", kpiId: "lean-maturity-5s", pic: "REYNARD", t1: 3, t2: 3, aktual2026Excel: 3, monthly: { "2026-01": 3, "2026-02": 3, "2026-03": 3, "2026-04": 3, "2026-05": 3, "2026-06": 3, "2026-07": 3 } },
  { no: 16, code: "lean-dm", kpiId: "lean-maturity-dm", pic: "REYNARD", t1: 2, t2: 2, aktual2026Excel: 2, monthly: { "2026-01": 2, "2026-02": 2, "2026-03": 2, "2026-04": 2, "2026-05": 2, "2026-06": 2, "2026-07": 2 } },
  { no: 17, code: "resign-rate", kpiId: "resign-rate", pic: "YOGI SASTRA DINATA", t1: 0.015, t2: 0.01, aktual2026Excel: 0.0147, monthly: { "2026-01": 0.016, "2026-02": 0.0195, "2026-03": 0.0146, "2026-04": 0.0138, "2026-05": 0.0123, "2026-06": 0.0063, "2026-07": 0.0104 } },
];

export const productionKpiActualRows: ProductionKpiActualRow[] = rawKpiActuals.map((row) => {
  const kpi = productionKpis.find((item) => item.id === row.kpiId);
  const target = productionKpiTargets2026.find((item) => item.kpiId === row.kpiId);
  if (!kpi || !target) throw new Error(`KPI source ${row.kpiId} tidak cocok dengan master data`);
  return { ...row, kpi, target: { ...target, t1: row.t1, t2: row.t2 }, actuals: morningMeetingMonths.map((month) => ({ kpiId: row.kpiId, tipePeriode: "bulanan", tanggal: `${month}-01`, nilai: row.monthly[month], sumber: "upload", submittedBy: "KPI Admin" })) };
});
