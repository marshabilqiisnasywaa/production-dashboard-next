"use client";
import { Sparkline, isOnTarget } from "@/features/repair/RepairDashboard";
import type { Direction } from "@/features/repair/RepairDashboard";

export type PicMetricCardData = {
  id: string;
  name: string;
  value: number;
  display: string;
  unit: string;
  target: number;
  targetLabel: string;
  gap: string;
  direction: Direction;
  status?: "good" | "bad";
  subtext?: string;
};

type PicMetricCardProps = {
  card: PicMetricCardData;
  selected: boolean;
  onToggle: (id: string) => void;
  onAskAi: (card: PicMetricCardData) => void;
  subtext?: string;
};

export default function PicMetricCard({ card, selected, onToggle, onAskAi, subtext }: PicMetricCardProps) {
  const good = card.status ? card.status === "good" : isOnTarget(card.value, card.target, card.direction);
  const text = subtext ?? card.subtext;
  return (
    <article className="repair-kpi pic-kpi bg-white! border border-gray-200/80!" style={selected ? { borderColor: "var(--accent-1)" } : undefined}>
      <div className="repair-kpi-top"><span>{card.name}</span><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? "On Target" : "Off Target"}</span></div>
      <strong>{card.display} <small>{card.unit}</small></strong>
      {text ? <p>{text}</p> : <p>Target: {card.targetLabel} <b className={good ? "good-text" : "bad-text"}>{good ? "↓" : "↑"} {card.gap}</b></p>}
      <Sparkline success={good} />
      <div className="pic-kpi-actions">
        <button type="button" className="repair-outline pic-mini" onClick={() => onToggle(card.id)}>{selected ? "Hide Trend" : "View Trend"}</button>
        {!good && <button type="button" className="pic-ai-btn" onClick={() => onAskAi(card)}>Ask AI</button>}
      </div>
    </article>
  );
}
