import { productionKpis, productionKpiTargets2026 } from "@/data/morningMeetingMasterData";
import { hitungStatusKpi, type KpiStatus } from "@/utils/kpiStatus";

function withTarget(id: string) {
  const kpi = productionKpis.find((item) => item.id === id);
  const target = productionKpiTargets2026.find((item) => item.kpiId === id);
  if (!kpi || !target) throw new Error(`Fixture ${id} tidak tersedia`);
  return { ...kpi, target };
}

const cases: { name: string; actual: KpiStatus; expected: KpiStatus }[] = [
  { name: "turun hijau", actual: hitungStatusKpi(withTarget("oqc-defect-rate"), 1), expected: "hijau" },
  { name: "turun kuning", actual: hitungStatusKpi(withTarget("oqc-defect-rate"), 1.5), expected: "kuning" },
  { name: "turun merah", actual: hitungStatusKpi(withTarget("oqc-defect-rate"), 2.1), expected: "merah" },
  { name: "naik hijau", actual: hitungStatusKpi(withTarget("wo-close-3d-on-time"), 99), expected: "hijau" },
  { name: "t1 sama t2 buffer kuning", actual: hitungStatusKpi(withTarget("losses-material"), 0.5), expected: "kuning" },
  { name: "deduction merah", actual: hitungStatusKpi(withTarget("safety-incident"), 1), expected: "merah" },
];

for (const item of cases) {
  if (item.actual !== item.expected) throw new Error(`${item.name}: expected ${item.expected}, got ${item.actual}`);
}
