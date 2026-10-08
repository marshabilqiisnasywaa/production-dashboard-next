import type { Kpi, KpiTarget } from "@/types/morningMeeting";

export type KpiStatus = "hijau" | "kuning" | "merah";

export function hitungStatusKpi(kpi: Kpi & { target?: KpiTarget }, nilai: number): KpiStatus {
  const target = kpi.target;
  if (!target) throw new Error(`Target KPI ${kpi.id} tidak tersedia`);
  if (kpi.deduction) return nilai > 0 ? "merah" : "hijau";
  if (target.t1 === target.t2) {
    if (kpi.arah === "turun") {
      const batasKuning = target.t2 * 0.9;
      if (nilai <= batasKuning) return "hijau";
      if (nilai <= target.t1) return "kuning";
      return "merah";
    }
    const batasKuning = target.t2 * 0.9;
    if (nilai >= target.t2) return "hijau";
    if (nilai >= batasKuning) return "kuning";
    return "merah";
  }
  if (kpi.arah === "turun") {
    if (nilai <= target.t2) return "hijau";
    if (nilai <= target.t1) return "kuning";
    return "merah";
  }
  if (nilai >= target.t2) return "hijau";
  if (nilai >= target.t1) return "kuning";
  return "merah";
}
