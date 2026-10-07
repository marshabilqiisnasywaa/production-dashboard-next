"use client";
import { Preassembly, Rework, Warranty } from "@/features/repair/RepairDashboard";

export type PicMonitorArea = "Preassembly" | "Rework" | "Warranty";

type PicRepairMonitoringProps = {
  area: PicMonitorArea;
};

export default function PicRepairMonitoring({ area }: PicRepairMonitoringProps) {
  if (area === "Rework") return <Rework />;
  if (area === "Warranty") return <Warranty />;
  return <Preassembly />;
}
