"use client";
import { useMemo, useState } from "react";
import { MetricChart, Sparkline, isOnTarget } from "@/features/repair/RepairDashboard";
import { Download } from "lucide-react";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";

type CostTrendKey = "slc" | "ope-pabrik" | "ope-instalasi" | "ope-packing" | "upph";

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

const sectionMeta: Record<CostSection, { title: string; subtitle: string; focus: CostTrendKey[] }> = {
  "overview": { title: "Meeting Dashboard", subtitle: "Ringkasan metric inti morning review area Cost: SLC, OPE Pabrik, OPE Instalasi, OPE Packing, dan UPPH.", focus: ["slc", "ope-pabrik", "ope-instalasi", "ope-packing", "upph"] },
  "productivity": { title: "Productivity", subtitle: "Fokus produktivitas area Cost: UPPH dan OPE sebagai penggerak utama output per jam.", focus: ["upph", "ope-pabrik", "ope-instalasi"] },
  "manpower": { title: "Manpower & Hours", subtitle: "Kecukupan dan jam kerja manpower pabrik terhadap target OPE Pabrik.", focus: ["ope-pabrik"] },
  "breakdown": { title: "Cost Breakdown", subtitle: "Rincian komponen biaya dan SLC terhadap target pengendalian kerugian.", focus: ["slc"] },
  "finish-good": { title: "Finish Good", subtitle: "Kesiapan finish good packing dan OPE Packing terhadap target pengiriman.", focus: ["ope-packing"] },
  "data-source": { title: "Data Source", subtitle: "Sumber data metric Cost dan waktu pembaruan terakhir tiap sumber.", focus: ["slc", "ope-pabrik", "ope-instalasi", "ope-packing", "upph"] },
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

export default function MeetingDashboard({ section = "overview" }: { section?: CostSection }) {
  const meta = sectionMeta[section];
  const [selected, setSelected] = useState<CostTrendKey | null>(null);
  const [toast, setToast] = useState(false);
  const [aiCard, setAiCard] = useState<CostMeetingCard | null>(null);

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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{meta.title}</h1>
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

      <div className="repair-charts">
        {chartKeys.map((key) => {
          const card = baseCards.find((item) => item.id === key)!;
          return <MetricChart key={key} id={`pic-cost-${section}-${key}`} title={card.name} values={trendSeeds[key]} target={card.target} direction={card.higherIsBetter ? "higher" : "lower"} full />;
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
      {toast && <div className="repair-toast"><span>✓</span>Data berhasil diekspor</div>}
    </div>
  );
}
