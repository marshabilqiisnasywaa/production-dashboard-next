"use client";
import { useUiText } from "@/locales/useUiText";
import type { KpiStatus } from "@/utils/kpiStatus";
import SimulationBadge from "@/features/morning-meeting/SimulationBadge";

type KpiStatusCardProps = {
  title: string;
  meta: string;
  value: string;
  target: string;
  status: KpiStatus | "kosong";
  reason: string;
  actions?: boolean;
  onDetail?: () => void;
};

export default function KpiStatusCard({ title, meta, value, target, status, reason, actions, onDetail }: KpiStatusCardProps) {
  const { text: uiText } = useUiText();
  return <article className={`mm-kpi-card ${status}`}><div><span className="mm-status-dot" /><p>{meta}</p>{actions && <SimulationBadge label={uiText("AI Simulasi")} />}</div><h3>{uiText(title)}</h3><strong>{value}</strong><small>{target}</small><em>{reason}</em>{actions && <div className="mm-card-actions"><button>{uiText("Acknowledge")}</button><button>{uiText("Beri instruksi")}</button><button>{uiText("Eskalasi")}</button><button onClick={onDetail}>{uiText("Lihat saran")}</button></div>}</article>;
}
