"use client";
import { useMemo, useState } from "react";
import {
  InputDialog,
  MetricChart,
  Sparkline,
  WipTable,
  isOnTarget,
  reworkPlanning,
  warrantyDaily,
  wipActual,
  wipTargets,
} from "@/features/repair/RepairDashboard";
import { PIC_NAME } from "@/features/pic-repair/RepairPicContext";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";

type TrendKey = "wip-pre" | "wip-rework" | "wip-warranty";

type MeetingCard = {
  id: TrendKey;
  name: string;
  value: number;
  display: string;
  unit: string;
  target: number;
  targetLabel: string;
};

const baseCards: MeetingCard[] = [
  { id: "wip-pre", name: "WIP Pre-assembly", value: 2456, display: "2,456", unit: "pcs", target: 2800, targetLabel: "2,800 pcs" },
  { id: "wip-rework", name: "WIP Rework", value: 1284, display: "1,284", unit: "pcs", target: 1500, targetLabel: "1,500 pcs" },
  { id: "wip-warranty", name: "WIP Warranty", value: 52, display: "52", unit: "units", target: 40, targetLabel: "40 units" },
];

function Breakdown({ trendKey }: { trendKey: TrendKey }) {
  if (trendKey === "wip-pre") {
    return (
      <article className="repair-panel wide">
        <div className="repair-card-head"><div><h2>Breakdown WIP Pre-assembly</h2><p>Detail unit per proses dan model</p></div></div>
        <WipTable />
      </article>
    );
  }
  if (trendKey === "wip-rework") {
    return (
      <article className="repair-panel wide">
        <div className="repair-card-head"><div><h2>Breakdown WIP Rework</h2><p>Plan vs actual per tanggal dan model</p></div></div>
        <div className="repair-table-scroll">
          <table className="repair-data-table pic-table">
            <thead><tr><th>Tanggal</th><th>Model</th><th>Plan Qty</th><th>Actual Qty</th><th>Achievement</th><th>Status</th></tr></thead>
            <tbody>
              {reworkPlanning.map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td>{row.model}</td>
                  <td>{row.plan}</td>
                  <td>{row.actual}</td>
                  <td><div className="achievement"><i style={{ width: `${Math.min((row.actual / row.plan) * 100, 100)}%` }} /><span>{((row.actual / row.plan) * 100).toFixed(1)}%</span></div></td>
                  <td><span className={`repair-status ${row.actual >= row.plan ? "good" : "bad"}`}>{row.actual >= row.plan ? "Achieved" : "Behind"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    );
  }
  return (
    <article className="repair-panel wide">
      <div className="repair-card-head"><div><h2>Breakdown WIP Warranty</h2><p>Detail input market dan phone off harian</p></div></div>
      <div className="repair-table-scroll">
        <table className="repair-data-table pic-table">
          <thead><tr><th>Tanggal</th><th>Input Unit Market</th><th>Phone Off</th><th>Share</th></tr></thead>
          <tbody>
            {warrantyDaily.map((row) => (
              <tr key={row.day}>
                <td>{row.day}</td>
                <td>{row.input}</td>
                <td>{row.off}</td>
                <td>{((row.off / row.input) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function PicRepairHome() {
  const [selected, setSelected] = useState<TrendKey | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [inputOpen, setInputOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [aiCard, setAiCard] = useState<MeetingCard | null>(null);

  const cards = useMemo(() => baseCards.map((card) => {
    if (values[card.id] === undefined) return card;
    const value = values[card.id];
    const display = card.unit === "pcs" ? value.toLocaleString("en-US") : String(value);
    return { ...card, value, display };
  }), [values]);

  const trendConfig = useMemo(() => ({
    "wip-pre": { title: "WIP Pre-assembly", values: wipActual, target: wipTargets, direction: "lower" as const },
    "wip-rework": { title: "WIP Rework", values: wipActual.map((v) => (v === null ? null : Math.round(v * 0.45))), target: 1500, direction: "lower" as const },
    "wip-warranty": { title: "WIP Warranty", values: warrantyDaily.map((d) => d.input), target: 40, direction: "lower" as const },
  }), []);

  const saveInput = (id: string, actual: number) => {
    setValues((current) => ({ ...current, [id]: actual }));
    setInputOpen(false);
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
  };

  const toggle = (id: TrendKey) => setSelected((current) => (current === id ? null : id));

  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MORNING MEETING • PIC AREA</div>
          <div className="repair-title-row">
            <h1>Beranda Meeting</h1>
            <span className="pic-chip"><span>YU</span>PIC: {PIC_NAME}</span>
          </div>
          <p>Ringkasan metric inti morning review: WIP Pre-assembly, Rework, dan Warranty.</p>
        </div>
        <div className="repair-actions">
          <button className="repair-outline" type="button">07 Oct 2026</button>
          <button className="repair-primary" type="button" onClick={() => setInputOpen(true)}>+ Input Data</button>
        </div>
      </div>

      <div className="repair-kpis pic-kpis-three">
        {cards.map((card) => {
          const good = isOnTarget(card.value, card.target, "lower");
          const active = selected === card.id;
          const gap = Math.abs(card.value - card.target).toLocaleString("en-US");
          return (
            <article className="repair-kpi pic-kpi" key={card.id} style={active ? { borderColor: "var(--accent-1)" } : undefined}>
              <div className="repair-kpi-top"><span>{card.name}</span><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? "On Target" : "Off Target"}</span></div>
              <strong>{card.display} <small>{card.unit}</small></strong>
              <p>Target: {card.targetLabel} <b className={good ? "good-text" : "bad-text"}>{good ? "↓" : "↑"} {gap}</b></p>
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
          {(Object.keys(trendConfig) as TrendKey[]).map((key) => (
            <MetricChart key={key} id={`pic-${key}`} title={trendConfig[key].title} values={trendConfig[key].values} target={trendConfig[key].target} direction={trendConfig[key].direction} full />
          ))}
        </div>
      ) : (
        <div className="repair-charts">
          <MetricChart id={`pic-${selected}`} title={trendConfig[selected].title} values={trendConfig[selected].values} target={trendConfig[selected].target} direction={trendConfig[selected].direction} full />
          <Breakdown trendKey={selected} />
        </div>
      )}

      {aiCard && (
        <PicAiInsight
          metricName={aiCard.name}
          actualLabel={`${aiCard.display} ${aiCard.unit}`}
          targetLabel={aiCard.targetLabel}
          gapLabel={Math.abs(aiCard.value - aiCard.target).toLocaleString("en-US")}
          direction="lower"
          onClose={() => setAiCard(null)}
        />
      )}
      {inputOpen && <InputDialog onClose={() => setInputOpen(false)} onSave={saveInput} />}
      {toast && <div className="repair-toast"><span>✓</span>Data berhasil disimpan</div>}
    </div>
  );
}
