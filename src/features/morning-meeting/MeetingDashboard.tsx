"use client";
import { useMemo, useState } from "react";
import { InputDialog, MetricChart, Sparkline, isOnTarget } from "@/features/repair/RepairDashboard";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";

type CostTrendKey = "slc" | "ope-pabrik" | "ope-instalasi" | "ope-packing" | "upph";

type CostMeetingCard = {
  id: CostTrendKey;
  name: string;
  value: number;
  display: string;
  unit: string;
  target: number;
  targetLabel: string;
  delta: string;
  higherIsBetter: boolean;
};

const baseCards: CostMeetingCard[] = [
  { id: "slc", name: "SLC (Single Labor Cost)", value: 3.56, display: "3.56", unit: "%", target: 3.7, targetLabel: "3.70%", delta: "-0.14", higherIsBetter: false },
  { id: "ope-pabrik", name: "OPE Pabrik", value: 82.4, display: "82.40", unit: "%", target: 85, targetLabel: "85.00%", delta: "-2.6", higherIsBetter: true },
  { id: "ope-instalasi", name: "OPE Instalasi", value: 91.2, display: "91.20", unit: "%", target: 90, targetLabel: "90.00%", delta: "+1.2", higherIsBetter: true },
  { id: "ope-packing", name: "OPE Packing", value: 87.5, display: "87.50", unit: "%", target: 88, targetLabel: "88.00%", delta: "-0.5", higherIsBetter: true },
  { id: "upph", name: "UPPH", value: 5.57, display: "5.57", unit: "pcs/h", target: 5.4, targetLabel: "5.40 pcs/h", delta: "+0.17", higherIsBetter: true },
];

const trendSeeds: Record<CostTrendKey, number[]> = {
  "slc": [3.82, 3.78, 3.74, 3.71, 3.68, 3.64, 3.6, 3.58, 3.56],
  "ope-pabrik": [80.1, 80.8, 81.2, 81.6, 81.9, 82.1, 82.2, 82.3, 82.4],
  "ope-instalasi": [89.4, 89.8, 90.1, 90.4, 90.7, 90.9, 91, 91.1, 91.2],
  "ope-packing": [86.2, 86.5, 86.8, 87, 87.2, 87.3, 87.4, 87.4, 87.5],
  "upph": [5.21, 5.28, 5.33, 5.38, 5.42, 5.47, 5.51, 5.54, 5.57],
};

export default function MeetingDashboard() {
  const [selected, setSelected] = useState<CostTrendKey | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [inputOpen, setInputOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [aiCard, setAiCard] = useState<CostMeetingCard | null>(null);

  const cards = useMemo(() => baseCards.map((card) => {
    if (values[card.id] === undefined) return card;
    const value = values[card.id];
    return { ...card, value, display: value.toFixed(2) };
  }), [values]);

  const saveInput = (id: string, actual: number) => {
    setValues((current) => ({ ...current, [id]: actual }));
    setInputOpen(false);
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
  };

  const toggle = (id: CostTrendKey) => setSelected((current) => (current === id ? null : id));

  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MORNING MEETING • PIC AREA</div>
          <div className="repair-title-row">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Meeting Dashboard</h1>
          </div>
          <p>Ringkasan metric inti morning review area Cost: SLC, OPE Pabrik, OPE Instalasi, OPE Packing, dan UPPH.</p>
        </div>
        <div className="repair-actions">
          <button className="repair-outline" type="button">07 Oct 2026</button>
          <button className="repair-primary text-white font-bold" type="button" onClick={() => setInputOpen(true)}>+ Input Data</button>
        </div>
      </div>

      <div className="repair-kpis pic-kpis-five">
        {cards.map((card) => {
          const good = isOnTarget(card.value, card.target, card.higherIsBetter ? "higher" : "lower");
          const active = selected === card.id;
          return (
            <article className="repair-kpi pic-kpi bg-white! border border-gray-200/80!" key={card.id} style={active ? { borderColor: "var(--accent-1)" } : undefined}>
              <div className="repair-kpi-top"><span>{card.name}</span><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? "On Target" : "Off Target"}</span></div>
              <strong>{card.display} <small>{card.unit}</small></strong>
              <p>Target: {card.targetLabel} <b className={good ? "good-text" : "bad-text"}>{card.delta}</b></p>
              <Sparkline success={good} />
              <div className="pic-kpi-actions">
                <button type="button" className="repair-outline pic-mini" onClick={() => toggle(card.id)}>{active ? "Tutup Tren" : "Lihat Tren"}</button>
                {!good && <button type="button" className="pic-ai-btn" onClick={() => setAiCard(card)}>Tanya AI</button>}
              </div>
            </article>
          );
        })}
      </div>

      {selected === null ? (
        <div className="repair-charts">
          {(Object.keys(trendSeeds) as CostTrendKey[]).map((key) => {
            const card = baseCards.find((item) => item.id === key)!;
            return <MetricChart key={key} id={`pic-cost-${key}`} title={card.name} values={trendSeeds[key]} target={card.target} direction={card.higherIsBetter ? "higher" : "lower"} full />;
          })}
        </div>
      ) : (
        <div className="repair-charts">
          {(() => {
            const card = baseCards.find((item) => item.id === selected)!;
            return <MetricChart id={`pic-cost-${selected}`} title={card.name} values={trendSeeds[selected]} target={card.target} direction={card.higherIsBetter ? "higher" : "lower"} full />;
          })()}
        </div>
      )}

      {aiCard && (
        <PicAiInsight
          metricName={aiCard.name}
          actualLabel={`${aiCard.display} ${aiCard.unit}`}
          targetLabel={aiCard.targetLabel}
          gapLabel={aiCard.delta}
          direction={aiCard.higherIsBetter ? "higher" : "lower"}
          onClose={() => setAiCard(null)}
        />
      )}
      {inputOpen && <InputDialog onClose={() => setInputOpen(false)} onSave={saveInput} />}
      {toast && <div className="repair-toast"><span>✓</span>Data berhasil disimpan</div>}
    </div>
  );
}
