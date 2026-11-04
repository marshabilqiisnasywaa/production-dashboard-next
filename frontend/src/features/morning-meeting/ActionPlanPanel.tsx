"use client";
import { useUiText } from "@/locales/useUiText";
import type { ProductionKpiActualRow } from "@/data/morningMeetingActualData";
import SimulationBadge from "@/features/morning-meeting/SimulationBadge";
import { dateOffset, getActionPlan } from "@/features/morning-meeting/aiFollowupData";

export default function ActionPlanPanel({ row, onCreateFollowup }: { row: ProductionKpiActualRow; onCreateFollowup?: (task: string) => void }) {
  const { text: uiText } = useUiText();
  const plan = getActionPlan(row);
  return <section className="mm-action-plan"><div className="mm-panel-head"><h2>{uiText("Saran Follow-up")}</h2><SimulationBadge /></div><p>{plan.summary}</p><div className="mm-action-columns"><article><b>{uiText("Kemungkinan penyebab")}</b>{plan.causes.map((item) => <span key={item}>{item}</span>)}</article><article><b>{uiText("Saran tindakan")}</b>{plan.actions.map((item) => <span key={item}>{item}</span>)}</article></div><div className="mm-action-footer"><span>{uiText("PIC usulan: ")}{plan.pic}</span><span>{uiText("Due date usulan: ")}{dateOffset(3)}</span><button onClick={() => onCreateFollowup?.(plan.actions[0])}>{uiText("Jadikan Follow-up")}</button></div></section>;
}
