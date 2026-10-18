"use client";
import { useMemo, useState } from "react";
import { MetricChart, Sparkline, isOnTarget } from "@/features/repair/RepairDashboard";
import { Download } from "lucide-react";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";
import PicMetricCard, { type PicMetricCardData } from "@/features/pic-repair/PicMetricCard";

type CostTrendKey = "slc" | "ope" | "upph" | "ratio" | "intern";

export type CostSection = "overview" | "productivity" | "manpower" | "breakdown" | "finish-good" | "data-source";

type CostMeetingCard = {
  id: CostTrendKey;
  name: string;
  value: number;
  display: string;
  unit: string;
  target: number;
  targetLabel: string;
  delta: string;
  subtext: string;
  higherIsBetter: boolean;
};

const baseCards: CostMeetingCard[] = [
  { id: "slc", name: "SLC (per unit)", value: 2.85, display: "¥2.85", unit: "", target: 3, targetLabel: "¥3.00", delta: "-0.15", subtext: "YoY -4.2% · ¥/unit", higherIsBetter: false },
  { id: "ope", name: "OPE Productivity", value: 78.5, display: "78.5%", unit: "", target: 77, targetLabel: "77.0%", delta: "+1.5", subtext: "MoM +1.6pp", higherIsBetter: true },
  { id: "upph", name: "UPPH", value: 42.6, display: "42.6", unit: "", target: 40, targetLabel: "40.0", delta: "+2.6", subtext: "MoM +2.3 · units/p-h", higherIsBetter: true },
  { id: "ratio", name: "Direct : Indirect", value: 3.2, display: "3.2 : 1", unit: "", target: 3, targetLabel: "3.0 : 1", delta: "+0.2", subtext: "Target 3.0:1", higherIsBetter: true },
  { id: "intern", name: "Internship Rate", value: 18.5, display: "18.5%", unit: "", target: 15, targetLabel: "15.00%", delta: "+3.5", subtext: "Cap 20% · watch", higherIsBetter: false },
];

const trendSeeds: Record<CostTrendKey, number[]> = {
  "slc": [3.12, 3.08, 3.05, 3.01, 2.98, 2.95, 2.92, 2.88, 2.85],
  "ope": [75.2, 75.8, 76.3, 76.9, 77.2, 77.6, 77.9, 78.2, 78.5],
  "upph": [39.8, 40.2, 40.6, 41, 41.4, 41.8, 42, 42.3, 42.6],
  "ratio": [2.9, 2.95, 3, 2.98, 3.05, 3.08, 3.1, 3.15, 3.2],
  "intern": [15.8, 16.2, 16.5, 16.9, 17.2, 17.5, 17.9, 18.2, 18.5],
};

const chartDomains: Record<CostTrendKey, [number, number]> = {
  "slc": [2.5, 3.5],
  "ope": [74, 80],
  "upph": [38, 44],
  "ratio": [2.5, 3.5],
  "intern": [14, 20],
};

const sectionMeta: Record<CostSection, { title: string; subtitle: string; focus: CostTrendKey[] }> = {
  "overview": { title: "Meeting Dashboard", subtitle: "Ringkasan metric inti morning review area Cost: SLC, OPE Productivity, UPPH, Direct : Indirect, dan Internship Rate.", focus: ["slc", "ope", "upph", "ratio", "intern"] },
  "productivity": { title: "Productivity", subtitle: "Fokus produktivitas area Cost: UPPH dan OPE Productivity sebagai penggerak utama output per jam.", focus: ["upph", "ope"] },
  "manpower": { title: "Manpower & Hours", subtitle: "Kecukupan dan jam kerja manpower pabrik terhadap target OPE Productivity.", focus: ["ope"] },
  "breakdown": { title: "Cost Breakdown", subtitle: "Rincian komponen biaya dan SLC terhadap target pengendalian kerugian.", focus: ["slc"] },
  "finish-good": { title: "Finish Good", subtitle: "Kesiapan finish good packing dan UPPH terhadap target pengiriman.", focus: ["upph"] },
  "data-source": { title: "Data Source", subtitle: "Sumber data metric Cost dan waktu pembaruan terakhir tiap sumber.", focus: ["slc", "ope", "upph", "ratio", "intern"] },
};

const manpowerRows = [
  { shift: "Shift 1", plan: 120, actual: 118, hours: 7.5 },
  { shift: "Shift 2", plan: 110, actual: 112, hours: 7.5 },
  { shift: "Shift 3", plan: 60, actual: 58, hours: 7 },
];

const breakdownRows = [
  { category: "Direct Labor", before: 1.82, after: 1.71 },
  { category: "Overtime", before: 0.64, after: 0.58 },
  { category: "Rework", before: 0.71, after: 0.66 },
  { category: "Scrap", before: 0.45, after: 0.38 },
  { category: "Other", before: 0.28, after: 0.23 },
];

const finishGoodRows = [
  { model: "121516", stock: 12400, target: 12000 },
  { model: "121518", stock: 8600, target: 9000 },
  { model: "121520", stock: 5300, target: 5000 },
];

const dataSourceRows = [
  { source: "IoT Line Sensor", metric: "UPPH, OPE", updated: "07 Oct 2026 08:30" },
  { source: "HR Attendance", metric: "Manpower & Hours", updated: "07 Oct 2026 08:00" },
  { source: "ERP Cost", metric: "SLC, Breakdown", updated: "06 Oct 2026 17:00" },
  { source: "WMS", metric: "Finish Good", updated: "07 Oct 2026 07:45" },
];

const safetyCards: PicMetricCardData[] = [
  { id: "safety-battery", name: "Safety Battery", value: 0, display: "0", unit: "incident", target: 0, targetLabel: "0 incident", gap: "0", direction: "lower" },
  { id: "safety-incident", name: "Safety Incident", value: 1, display: "1", unit: "incident", target: 0, targetLabel: "0 incident", gap: "1", direction: "lower" },
  { id: "safety-info", name: "Safety Information", value: 98.5, display: "98.5", unit: "%", target: 100, targetLabel: "100%", gap: "1.5%", direction: "higher", status: "good" },
  { id: "safety-material", name: "Safety Material", value: 92, display: "92.0", unit: "%", target: 100, targetLabel: "100%", gap: "8.0%", direction: "higher" },
];

export default function MeetingDashboard({ section = "overview", onNavigate }: { section?: CostSection; onNavigate?: (target: string) => void }) {
  const meta = sectionMeta[section];
  const [selected, setSelected] = useState<CostTrendKey | null>(null);
  const [toast, setToast] = useState(false);
  const [aiCard, setAiCard] = useState<CostMeetingCard | null>(null);
  const [safetyAi, setSafetyAi] = useState<PicMetricCardData | null>(null);

  const cards = baseCards;

  const visibleCards = useMemo(() => cards.filter((card) => meta.focus.includes(card.id)), [cards, meta]);
  const chartKeys = (selected ? [selected] : meta.focus) as CostTrendKey[];

  const exportCsv = () => {
    const lines = ["metric,value,target"];
    for (const card of visibleCards) lines.push(`${card.name},${card.display} ${card.unit},${card.targetLabel}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cost-meeting-dashboard.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
  };

  const toggle = (id: CostTrendKey) => setSelected((current) => (current === id ? null : id));

  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MORNING MEETING • PIC AREA • COST</div>
          <div className="repair-title-row">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{meta.title}</h1>
          </div>
          <p>{meta.subtitle}</p>
        </div>
        <div className="repair-actions">
          <button className="repair-outline" type="button">07 Oct 2026</button>
          <button className="repair-outline" type="button" onClick={exportCsv}><Download size={14} />Export</button>
        </div>
      </div>

      <div className="repair-kpis pic-kpis-five">
        {visibleCards.map((card) => {
          const good = isOnTarget(card.value, card.target, card.higherIsBetter ? "higher" : "lower");
          const active = selected === card.id;
          return (
            <article className="repair-kpi pic-kpi bg-white dark:bg-slate-900! border border-gray-200/80!" key={card.id} style={active ? { borderColor: "var(--accent-1)" } : undefined}>
              <div className="repair-kpi-top"><span>{card.name}</span><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? "On Target" : "Off Target"}</span></div>
              <strong>{card.display} <small>{card.unit}</small></strong>
              <p>{card.subtext}</p>
              <Sparkline success={good} />
              <div className="pic-kpi-actions">
                <button type="button" className="repair-outline pic-mini" onClick={() => toggle(card.id)}>{active ? "Hide Trend" : "View Trend"}</button>
                {!good && <button type="button" className="pic-ai-btn" onClick={() => setAiCard(card)}>Ask AI</button>}
              </div>
            </article>
          );
        })}
      </div>

      <div className="repair-charts">
        {chartKeys.map((key) => {
          const card = baseCards.find((item) => item.id === key)!;
          return <MetricChart key={key} id={`pic-cost-${section}-${key}`} title={card.name} values={trendSeeds[key]} target={card.target} direction={card.higherIsBetter ? "higher" : "lower"} domain={chartDomains[key]} yFormat={key === "slc" ? (value) => `¥${value.toFixed(2)}` : undefined} full />;
        })}
      </div>

      {section === "manpower" && (
        <article className="repair-panel wide">
          <div className="repair-card-head"><div><h2>Manpower per Shift</h2><p>Plan vs actual kehadiran dan jam kerja</p></div></div>
          <div className="repair-table-scroll">
            <table className="repair-data-table pic-table">
              <thead><tr><th>Shift</th><th>Plan</th><th>Actual</th><th>Jam Kerja</th><th>Status</th></tr></thead>
              <tbody>
                {manpowerRows.map((row) => (
                  <tr key={row.shift}>
                    <td>{row.shift}</td>
                    <td>{row.plan}</td>
                    <td>{row.actual}</td>
                    <td>{row.hours} jam</td>
                    <td><span className={`repair-status ${row.actual >= row.plan ? "good" : "bad"}`}>{row.actual >= row.plan ? "Terpenuhi" : "Kurang"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {section === "breakdown" && (
        <article className="repair-panel wide">
          <div className="repair-card-head"><div><h2>Cost Breakdown</h2><p>Before vs after per komponen biaya (point SLC)</p></div></div>
          <div className="repair-table-scroll">
            <table className="repair-data-table pic-table">
              <thead><tr><th>Kategori</th><th>Before</th><th>After</th><th>Saving</th></tr></thead>
              <tbody>
                {breakdownRows.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td>{row.before.toFixed(2)}</td>
                    <td>{row.after.toFixed(2)}</td>
                    <td>{(row.before - row.after).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {section === "finish-good" && (
        <article className="repair-panel wide">
          <div className="repair-card-head"><div><h2>Finish Good Stock</h2><p>Stok vs target per model</p></div></div>
          <div className="repair-table-scroll">
            <table className="repair-data-table pic-table">
              <thead><tr><th>Model</th><th>Stock</th><th>Target</th><th>Status</th></tr></thead>
              <tbody>
                {finishGoodRows.map((row) => (
                  <tr key={row.model}>
                    <td>{row.model}</td>
                    <td>{row.stock.toLocaleString("en-US")}</td>
                    <td>{row.target.toLocaleString("en-US")}</td>
                    <td><span className={`repair-status ${row.stock >= row.target ? "good" : "bad"}`}>{row.stock >= row.target ? "Ready" : "Kurang"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {section === "data-source" && (
        <article className="repair-panel wide">
          <div className="repair-card-head"><div><h2>Data Source</h2><p>Sumber data dan waktu pembaruan terakhir</p></div></div>
          <div className="repair-table-scroll">
            <table className="repair-data-table pic-table">
              <thead><tr><th>Sumber</th><th>Metric</th><th>Terakhir Update</th></tr></thead>
              <tbody>
                {dataSourceRows.map((row) => (
                  <tr key={row.source}>
                    <td>{row.source}</td>
                    <td>{row.metric}</td>
                    <td>{row.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
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
      {section === "overview" && (
        <>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 dark:text-slate-100 font-semibold">Safety</h2>
              <p className="text-slate-500 dark:text-slate-400">KPI safety area Cost: battery, incident, information, dan material.</p>
            </div>
          </div>
          <div className="repair-kpis">
            {safetyCards.map((card) => (
              <PicMetricCard key={card.id} card={card} selected={false} onToggle={() => onNavigate?.("cost-overview")} onAskAi={setSafetyAi} />
            ))}
          </div>
        </>
      )}
      {safetyAi && (
        <PicAiInsight
          metricName={safetyAi.name}
          actualLabel={`${safetyAi.display} ${safetyAi.unit}`.trim()}
          targetLabel={safetyAi.targetLabel}
          gapLabel={safetyAi.gap}
          direction={safetyAi.direction}
          onClose={() => setSafetyAi(null)}
        />
      )}
      {toast && <div className="repair-toast"><span>✓</span>Data berhasil diekspor</div>}
    </div>
  );
}
