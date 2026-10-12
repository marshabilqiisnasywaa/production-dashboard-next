import type { PicAreaKey } from "@/components/providers/RoleProvider";
import type { KpiStatus } from "@/utils/kpiStatus";
import type { Kpi, SqcdipDimension } from "@/types/morningMeeting";
import { latestMorningMeetingMonth, morningMeetingMonths, productionKpiActualRows, type ProductionKpiActualRow } from "@/data/morningMeetingActualData";
import { project2026Rows, type Project2026Row } from "@/data/morningMeetingProjectData";
import { hitungStatusKpi } from "@/utils/kpiStatus";

export type KpiInsight = {
  row: ProductionKpiActualRow;
  status: KpiStatus | "kosong";
  latestValue: number | null;
  reason: string;
  severity: number;
};

export const kpiAreaMap: Record<string, PicAreaKey> = {
  "oqc-defect-rate": "qc",
  "single-labor-cost": "cost",
  ngp: "qc",
  "losses-material": "material",
  "end-to-end-delivery-time": "assembly",
  "wo-close-3d-on-time": "material",
  "big-problem": "qc",
  "battery-safety": "qc",
  "safety-incident": "assembly",
  "safety-information": "assembly",
  "safety-material": "material",
  upph: "assembly",
  "material-management-impact": "material",
  smed: "assembly",
  "lean-maturity-5s": "cost",
  "lean-maturity-dm": "cost",
  "resign-rate": "service",
};

export const projectAreaMap: Record<string, PicAreaKey> = {
  "WO Close": "material",
  "OTD Achievement": "assembly",
  "Clearance Model": "material",
  "Flexible Delivery (SMED)": "assembly",
  "FQC/OQC Defect": "qc",
  "Battery Safety": "qc",
  "Major Quality Incident": "qc",
  "Packing Aesthetic": "packing",
  "Pre Assembly Quality": "repair",
  "Scratch, White Spot, Fuzzy Hair": "qc",
  "AI Import": "qc",
  "ODM New Project Quality": "qc",
  Screenguard: "qc",
  "SLC/UPPH": "cost",
  NGP: "qc",
  "Losses Material": "material",
  "QEP Standardization": "assembly",
  "Asset-light": "cost",
  "Reliable Workshop Site": "cost",
  "DM/5S/TPM": "cost",
  "Cost Improve (Digitalisasi)": "cost",
  "Quality Foolproof": "qc",
  "Digitalisasi Lean": "cost",
  "Personnel Stability": "service",
};

export function statusForValue(row: ProductionKpiActualRow, value: number | null): KpiStatus | "kosong" {
  if (value === null) return "kosong";
  return hitungStatusKpi({ ...row.kpi, target: row.target }, value);
}

export function formatKpiValue(kpi: Kpi, value: number | null): string {
  if (value === null) return "-";
  if (kpi.unit === "%") return `${(value * 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
  return value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

export function formatTarget(kpi: Kpi, value: number): string {
  if (kpi.unit === "%") return `${(value * 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
  return value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function isWorsening(row: ProductionKpiActualRow): boolean {
  const values = morningMeetingMonths.map((month) => row.monthly[month]).filter((value): value is number => value !== null).slice(-3);
  if (values.length < 3) return false;
  if (row.kpi.arah === "turun") return values[0] < values[1] && values[1] < values[2];
  return values[0] > values[1] && values[1] > values[2];
}

export function getKpiInsights(rows = productionKpiActualRows): KpiInsight[] {
  return rows.map((row) => {
    const latestValue = row.monthly[latestMorningMeetingMonth];
    const status = statusForValue(row, latestValue);
    const worsening = status === "kuning" && isWorsening(row);
    const reason = status === "merah" ? `Merah: ${formatKpiValue(row.kpi, latestValue)} vs T1 ${formatTarget(row.kpi, row.target.t1)}` : worsening ? `Kuning memburuk 3 periode: ${formatKpiValue(row.kpi, latestValue)} vs T2 ${formatTarget(row.kpi, row.target.t2)}` : row.kpi.deduction && latestValue && latestValue > 0 ? `Safety tidak nol: ${formatKpiValue(row.kpi, latestValue)}` : `Aman: ${formatKpiValue(row.kpi, latestValue)}`;
    const severity = status === "merah" ? 3 : worsening ? 2 : status === "kuning" ? 1 : 0;
    return { row, status, latestValue, reason, severity };
  });
}

export function getExceptionInsights(): KpiInsight[] {
  return getKpiInsights().filter((item) => item.status === "merah" || item.reason.startsWith("Kuning memburuk") || item.reason.startsWith("Safety tidak nol")).sort((a, b) => b.severity - a.severity || (b.row.kpi.bobot ?? 0) - (a.row.kpi.bobot ?? 0));
}

export function getOffTrackProjects(projects = project2026Rows): Project2026Row[] {
  return projects.filter((project) => project.progress.find((item) => item.kuartal === "Q2")?.status === "off-track");
}

export function getSafeKpiCount(): number {
  return getKpiInsights().filter((item) => item.status === "hijau").length;
}

export function getDimensionStatus(dimension: SqcdipDimension): KpiStatus {
  const statuses = getKpiInsights(productionKpiActualRows.filter((row) => row.kpi.dimensi === dimension)).map((item) => item.status);
  if (statuses.includes("merah")) return "merah";
  if (statuses.includes("kuning")) return "kuning";
  return "hijau";
}

export function filterInsightsByArea(area: PicAreaKey): KpiInsight[] {
  return getKpiInsights().filter((item) => kpiAreaMap[item.row.kpi.id] === area && item.status !== "hijau");
}

export function filterProjectsByArea(area: PicAreaKey): Project2026Row[] {
  return project2026Rows.filter((project) => projectAreaMap[project.nama] === area && project.progress.find((item) => item.kuartal === "Q2")?.status !== "on-track");
}

export function formatProjectValue(value: number | string | null): string {
  if (value === null) return "belum dilaporkan";
  if (typeof value === "string") return value;
  if (value > 0 && value <= 1) return `${(value * 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
  return value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}
