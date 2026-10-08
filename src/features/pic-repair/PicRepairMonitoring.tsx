"use client";
import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MetricChart,
  Sparkline,
  WipTable,
  inputRate,
  isOnTarget,
  wipActual,
  wipTargets,
  Rework,
  Warranty,
  type Direction,
} from "@/features/repair/RepairDashboard";
import { PIC_NAME } from "@/features/pic-repair/RepairPicContext";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";

export type PicMonitorArea = "Preassembly" | "Rework" | "Warranty";

type PicRepairMonitoringProps = {
  area: PicMonitorArea;
};

type OpsCard = {
  id: string;
  name: string;
  display: string;
  unit: string;
  value: number;
  target: number;
  targetLabel: string;
  direction: Direction;
};

const opsCards: OpsCard[] = [
  { id: "wip", name: "WIP / Inventory Qty", display: "2,456", unit: "pcs", value: 2456, target: 2800, targetLabel: "2,800 pcs", direction: "lower" },
  { id: "input", name: "Input Rate", display: "1.18%", unit: "", value: 1.18, target: 1, targetLabel: "1.00%", direction: "lower" },
  { id: "assembly", name: "Assembly Output", display: "100.0%", unit: "", value: 100, target: 99, targetLabel: "99%", direction: "higher" },
  { id: "qa", name: "QA Pass Rate", display: "100.0%", unit: "", value: 100, target: 99, targetLabel: "99%", direction: "higher" },
  { id: "nc", name: "NC Production Rate", display: "0.98%", unit: "", value: 0.98, target: 1, targetLabel: "1.00%", direction: "lower" },
];

const dailyLabels = ["30 Sep", "1 Oct", "2 Oct", "3 Oct", "4 Oct", "5 Oct", "6 Oct"];
const outputDaily = [98.8, 99.5, 99.7, 99.8, 99.7, 100, 100];
const qaDaily = [99.4, 99.5, 99.9, 99.8, 99.7, 100, 100];
const ncDaily = [1.29, 1.46, 1.39, 1.82, 1.99, 1.02, 0.98];
const inputDaily = [1.39, 1.82, 1.99, 1.02, 0.98, 1.5, 1.18];

function DailyTrend({ title, subtitle, series, target }: { title: string; subtitle: string; series: { key: string; name: string; color: string; values: number[] }[]; target: number }) {
  const data = dailyLabels.map((day, index) => {
    const point: Record<string, number | string> = { day, Target: target };
    for (const item of series) point[item.name] = item.values[index];
    return point;
  });
  return (
    <article className="repair-panel">
      <div className="repair-card-head"><div><h2>{title}</h2><p>{subtitle}</p></div></div>
      <div className="warranty-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={8} />
            <YAxis axisLine={false} tickLine={false} width={44} />
            <Tooltip />
            <Legend />
            <Line type="natural" dataKey="Target" stroke="var(--success)" strokeDasharray="5 5" dot={false} strokeWidth={2} />
            {series.map((item) => (
              <Line key={item.key} type="natural" dataKey={item.name} stroke={item.color} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function PreassemblyDeepDive() {
  const [aiCard, setAiCard] = useState<OpsCard | null>(null);
  const [showWipTable, setShowWipTable] = useState(false);
  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MONITORING • DEEP DIVE</div>
          <div className="repair-title-row">
            <h1>Pre-Assembly</h1>
            <span className="pic-chip"><span>YU</span>PIC: {PIC_NAME}</span>
          </div>
          <p>Metric operasional dan tren histori harian area Pre-assembly.</p>
        </div>
        <div className="repair-actions">
          <button className="repair-outline" type="button">07 Oct 2026</button>
        </div>
      </div>

      <div className="repair-kpis pic-kpis-five">
        {opsCards.map((card) => {
          const good = isOnTarget(card.value, card.target, card.direction);
          return (
            <article className="repair-kpi pic-kpi" key={card.id}>
              <div className="repair-kpi-top"><span>{card.name}</span><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? "On Target" : "Off Target"}</span></div>
              <strong>{card.display} <small>{card.unit}</small></strong>
              <p>Target: {card.targetLabel}</p>
              <Sparkline success={good} />
              {!good && (
                <div className="pic-kpi-actions">
                  <button type="button" className="pic-ai-btn" onClick={() => setAiCard(card)}>Tanya AI</button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="repair-charts">
        <MetricChart id="pic-pre-wip" title="WIP / Inventory Qty" values={wipActual} target={wipTargets} direction="lower" full />
        <MetricChart id="pic-pre-input" title="Input Rate" values={inputRate} target={1} direction="lower" domain={[0, 2.1]} />
        <DailyTrend
          title="Assembly Output & QA Pass Rate"
          subtitle="Histori harian 30 Sep - 6 Oct • target 99%"
          target={99}
          series={[
            { key: "output", name: "Assembly Output", color: "var(--chart-1)", values: outputDaily },
            { key: "qa", name: "QA Pass Rate", color: "var(--chart-2)", values: qaDaily },
          ]}
        />
        <DailyTrend
          title="Input Rate & NC Production Rate"
          subtitle="Histori harian 30 Sep - 6 Oct • target max 1.00%"
          target={1}
          series={[
            { key: "input", name: "Input Rate", color: "var(--chart-1)", values: inputDaily },
            { key: "nc", name: "NC Rate", color: "var(--chart-5)", values: ncDaily },
          ]}
        />
        <article className="repair-panel wide">
          <div className="repair-card-head">
            <div><h2>Breakdown WIP per Proses</h2><p>Stok per proses dan model Pre-assembly</p></div>
            <button type="button" className={`chart-toggle ${showWipTable ? "active" : ""}`} onClick={() => setShowWipTable((value) => !value)}>{showWipTable ? "Sembunyikan Tabel" : "Tampilkan Tabel"}</button>
          </div>
          {showWipTable && <WipTable />}
        </article>
      </div>

      {aiCard && (
        <PicAiInsight
          metricName={aiCard.name}
          actualLabel={`${aiCard.display} ${aiCard.unit}`.trim()}
          targetLabel={aiCard.targetLabel}
          gapLabel={aiCard.unit === "pcs" ? Math.abs(aiCard.value - aiCard.target).toLocaleString("en-US") : `${Math.abs(aiCard.value - aiCard.target).toFixed(2)}%`}
          direction={aiCard.direction}
          onClose={() => setAiCard(null)}
        />
      )}
    </div>
  );
}

export default function PicRepairMonitoring({ area }: PicRepairMonitoringProps) {
  if (area === "Rework") return <Rework />;
  if (area === "Warranty") return <Warranty />;
  return <PreassemblyDeepDive />;
}
