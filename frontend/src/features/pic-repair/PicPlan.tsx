"use client";
import { useMemo } from "react";
import { picAreaOptions, useRole } from "@/components/providers/RoleProvider";
import { PIC_NAME } from "@/features/pic-repair/RepairPicContext";
import { usePicPlans, type PicPlan as PicPlanRecord, type PicPlanInput, type PicPlanPatch } from "@/features/pic-repair/picPlanStore";
import PicPlanSection from "@/features/pic-repair/PicPlanSection";
import KpiCard, { type KpiCardProps } from "@/components/ui/KpiCard";
import PageHeader from "@/components/ui/PageHeader";
import { CalendarDays, ClipboardList } from "lucide-react";

export type PicPlanProps = {
  plans?: PicPlanRecord[];
  picName?: string;
  blokDefault?: string;
  addPlan?: (input: PicPlanInput) => PicPlanRecord;
  updatePlan?: (id: string, patch: PicPlanPatch) => void;
  deletePlan?: (id: string) => void;
};

export default function PicPlan(props: PicPlanProps = {}) {
  const storePlans = usePicPlans();
  const plans = props.plans ?? storePlans;
  const { role, picArea } = useRole();
  const canAdd = role === "PIC Area";
  const blokDefault = props.blokDefault ?? picAreaOptions.find((item) => item.key === picArea)?.label ?? "Repair";
  const picName = props.picName ?? PIC_NAME;
  const todayIso = new Date().toISOString().slice(0, 10);
  const summary = useMemo<KpiCardProps[]>(() => ([
    { label: "Today's Plan", value: String(plans.filter((item) => item.tanggal === todayIso).length), helper: "Today's plan date", tone: "success", icon: CalendarDays },
    { label: "Total Plan", value: String(plans.length), helper: "All recorded plans", tone: "neutral", icon: ClipboardList },
  ]), [plans, todayIso]);
  return <div className="abnormality-page pic-page"><PageHeader eyebrow="DAILY PLAN" title="Daily Plan" subtitle="Daily work plans. For follow-up tasks, see the Follow-up menu." className="mb-0!" /><div className="space-y-6"><section className="qc-kpi-grid abnormality-kpis pic-kpis">{summary.map((item) => <KpiCard key={item.label} {...item} />)}</section><PicPlanSection plans={plans} title="Daily Work Plans" editable={canAdd} blokDefault={blokDefault} picName={picName} showToolbar addPlan={props.addPlan} updatePlan={props.updatePlan} deletePlan={props.deletePlan} /></div></div>;
}
