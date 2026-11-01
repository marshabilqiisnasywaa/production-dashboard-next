"use client";
import { useMemo, useState } from "react";
import { picAreaOptions, type PicAreaKey } from "@/components/providers/RoleProvider";
import PicPlan from "@/features/pic-repair/PicPlan";
import { usePicPlans, type PicPlan as PicPlanRecord } from "@/features/pic-repair/picPlanStore";
import { useServicePlans } from "@/features/pic-service/servicePlanStore";
import { useQcPlans } from "@/features/pic-qc/qcPlanStore";
import { useAssemblyPlans } from "@/features/pic-assembly/assemblyPlanStore";
import { useCostPlans } from "@/features/cost/costPlanStore";
import { useSafetyPlans } from "@/features/safety/safetyPlanStore";
import "./HodDailyPlan.css";

const dailyPlanAreaOrder: PicAreaKey[] = ["repair", "service", "qc", "assembly", "cost", "safety"];

function planTimestamp(plan: PicPlanRecord): number {
  const match = plan.createdAt.match(/(\d{1,2})[.:](\d{2})(?:\s*([AP]M))?/i);
  let hour = match ? Number(match[1]) : 0;
  const minute = match ? match[2] : "00";
  const suffix = match?.[3]?.toUpperCase();
  if (suffix === "PM" && hour < 12) hour += 12;
  if (suffix === "AM" && hour === 12) hour = 0;
  const timestamp = Date.parse(`${plan.tanggal}T${String(hour).padStart(2, "0")}:${minute}:00`);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function newestFirst(plans: PicPlanRecord[]): PicPlanRecord[] {
  return [...plans].sort((a, b) => planTimestamp(b) - planTimestamp(a));
}

export default function HodDailyPlan() {
  const repairPlans = usePicPlans();
  const servicePlans = useServicePlans();
  const qcPlans = useQcPlans();
  const assemblyPlans = useAssemblyPlans();
  const costPlans = useCostPlans();
  const safetyPlans = useSafetyPlans();
  const [activeArea, setActiveArea] = useState<PicAreaKey | "all">("all");

  const plansByArea = useMemo<Partial<Record<PicAreaKey, PicPlanRecord[]>>>(() => ({
    repair: newestFirst(repairPlans),
    service: newestFirst(servicePlans),
    qc: newestFirst(qcPlans),
    assembly: newestFirst(assemblyPlans),
    cost: newestFirst(costPlans),
    safety: newestFirst(safetyPlans),
  }), [repairPlans, servicePlans, qcPlans, assemblyPlans, costPlans, safetyPlans]);

  const allPlans = useMemo(() => newestFirst(dailyPlanAreaOrder.flatMap((area) => plansByArea[area] ?? [])), [plansByArea]);
  const tabs = useMemo(() => dailyPlanAreaOrder.map((area) => ({
    area,
    label: picAreaOptions.find((option) => option.key === area)?.label ?? area,
    count: plansByArea[area]?.length ?? 0,
  })), [plansByArea]);
  const filteredPlans = activeArea === "all" ? allPlans : plansByArea[activeArea] ?? [];

  return (
    <div className="mmd-daily-plan">
      <div className="mmd-plan-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={activeArea === "all"} className={`mmd-plan-tab ${activeArea === "all" ? "active" : ""}`} onClick={() => setActiveArea("all")}>Semua <span className="mmd-plan-tab-count">({allPlans.length})</span></button>
        {tabs.map((tab) => (
          <button key={tab.area} type="button" role="tab" aria-selected={activeArea === tab.area} className={`mmd-plan-tab ${activeArea === tab.area ? "active" : ""}`} onClick={() => setActiveArea(tab.area)}>
            {tab.label} <span className="mmd-plan-tab-count">({tab.count})</span>
          </button>
        ))}
      </div>
      <PicPlan plans={filteredPlans} />
    </div>
  );
}
