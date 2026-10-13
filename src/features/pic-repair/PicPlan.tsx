"use client";
import { useMemo } from "react";
import { picAreaOptions, useRole } from "@/components/providers/RoleProvider";
import { PIC_NAME } from "@/features/pic-repair/RepairPicContext";
import { usePicPlans, type PicPlan as PicPlanRecord, type PicPlanInput, type PicPlanPatch } from "@/features/pic-repair/picPlanStore";
import PicPlanSection from "@/features/pic-repair/PicPlanSection";
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
  const summary = useMemo(() => ([
    { label: "Today's Plan", value: String(plans.filter((item) => item.tanggal === todayIso).length), helper: "Today's plan date", tone: "today", icon: CalendarDays, iconBox: "text-emerald-700 bg-emerald-100/60 border border-emerald-200/50 backdrop-blur-sm" },
    { label: "Total Plan", value: String(plans.length), helper: "All recorded plans", tone: "total", icon: ClipboardList, iconBox: "text-slate-800 bg-slate-100/60 border border-slate-200/50 backdrop-blur-sm" },
  ]), [plans, todayIso]);
  const metricCardClass: Record<string, string> = {
    today: "bg-gradient-to-br! from-emerald-50/80 via-teal-50/30 to-white border border-emerald-200/60! rounded-xl! shadow-sm",
    total: "bg-gradient-to-br! from-slate-50 via-teal-50/20 to-white border border-slate-200/70! rounded-xl! shadow-sm",
  };
  const metricValueClass: Record<string, string> = {
    today: "text-emerald-700 font-bold!",
    total: "text-slate-800 font-bold!",
  };
  return <div className="abnormality-page pic-page"><header className="qc-page-header"><div><div className="qc-kicker">DAILY PLAN</div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Plan</h1><p>Daily work plans. For follow-up tasks, see the Follow-up menu.</p></div></header><div className="space-y-6"><section className="qc-kpi-grid abnormality-kpis pic-kpis">{summary.map((item) => <article key={item.label} className={`sq-kpi ${metricCardClass[item.tone]}`}><div className="sq-kpi-head flex justify-between items-start"><span>{item.label}</span><div className={`p-2.5 rounded-xl ${item.iconBox}`}><item.icon className="w-5 h-5" /></div></div><strong className={metricValueClass[item.tone]}>{item.value}</strong><p>{item.helper}</p></article>)}</section><PicPlanSection plans={plans} title="Daily Work Plans" editable={canAdd} blokDefault={blokDefault} picName={picName} showToolbar addPlan={props.addPlan} updatePlan={props.updatePlan} deletePlan={props.deletePlan} /></div></div>;
}
