"use client";
import { useMemo, useState } from "react";
import { MetricChart } from "@/features/repair/RepairDashboard";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";
import PicMetricCard, { type PicMetricCardData } from "@/features/pic-repair/PicMetricCard";

export type SafetySection = "overview" | "safety" | "isc" | "ga-admin" | "data-source";
type SafetyTrendKey = "safety-battery" | "safety-incident" | "safety-information" | "safety-material" | "isc-abnormal";

export const safetyHomeCards: PicMetricCardData[] = [
  { id: "safety-battery", name: "Safety Battery", value: 0, display: "0", unit: "case", target: 0, targetLabel: "0 case", gap: "0", direction: "lower" },
  { id: "safety-incident", name: "Safety Incident", value: 0, display: "0", unit: "case", target: 0, targetLabel: "0 case", gap: "0", direction: "lower" },
  { id: "safety-information", name: "Safety Information", value: 0, display: "0", unit: "case", target: 0, targetLabel: "0 case", gap: "0", direction: "lower" },
  { id: "safety-material", name: "Safety Material", value: 0, display: "0", unit: "case", target: 0, targetLabel: "0 case", gap: "0", direction: "lower" },
];
const safetyTrendSeeds: Record<SafetyTrendKey, number[]> = {
  "safety-battery": [0, 0, 0, 0, 0, 0, 0, 0, 0],
  "safety-incident": [0, 0, 0, 0, 0, 0, 0, 0, 0],
  "safety-information": [0, 0, 0, 0, 0, 0, 0, 0, 0],
  "safety-material": [0, 0, 0, 0, 0, 0, 0, 0, 0],
  "isc-abnormal": [0, 0, 0, 0, 0, 0, 0, 0, 0],
};

const sectionMeta: Record<SafetySection, { title: string; subtitle: string; eyebrow: string }> = {
  overview: { title: "Beranda Meeting", subtitle: "Ringkasan metric inti Safety, ISC, GA: Safety Battery, Safety Incident, Safety Information, dan Safety Material.", eyebrow: "MORNING MEETING • PIC AREA • SAFETY, ISC, GA" },
  safety: { title: "Safety", subtitle: "Metric operasional Safety: Safety Material, Safety Incident / Accident, dan Safety Information.", eyebrow: "MONITORING • SAFETY, ISC, GA • SAFETY" },
  isc: { title: "ISC", subtitle: "Metric operasional ISC: ISC Abnormal Target vs Actual.", eyebrow: "MONITORING • SAFETY, ISC, GA • ISC" },
  "ga-admin": { title: "GA Admin", subtitle: "Metric operasional GA Admin.", eyebrow: "MONITORING • SAFETY, ISC, GA • GA ADMIN" },
  "data-source": { title: "Data Source", subtitle: "Sumber data metric Safety, ISC, GA dan waktu pembaruan terakhir tiap sumber.", eyebrow: "DATA • SAFETY, ISC, GA • DATA SOURCE" },
};

const safetyMonitoringCards: PicMetricCardData[] = [
  { id: "safety-material", name: "Safety Material", value: 0, display: "0", unit: "case", target: 0, targetLabel: "0 case", gap: "0", direction: "lower" },
  { id: "safety-incident", name: "Safety Incident / Accident", value: 0, display: "0", unit: "case", target: 0, targetLabel: "0 case", gap: "0", direction: "lower" },
  { id: "safety-information", name: "Safety Information", value: 0, display: "0", unit: "case", target: 0, targetLabel: "0 case", gap: "0", direction: "lower" },
];

const iscCards: PicMetricCardData[] = [
  { id: "isc-abnormal", name: "ISC Abnormal", value: 0, display: "0", unit: "case", target: 0, targetLabel: "0 case", gap: "0", direction: "lower" },
];

const dataSourceRows = [
  { source: "Safety Patrol Log", metric: "Safety Battery, Safety Incident", updated: "07 Oct 2026 08:30" },
  { source: "Safety Information Board", metric: "Safety Information", updated: "07 Oct 2026 08:00" },
  { source: "Warehouse Safety Check", metric: "Safety Material", updated: "06 Oct 2026 17:00" },
  { source: "ISC Report", metric: "ISC Abnormal", updated: "07 Oct 2026 07:45" },
];

export default function SafetyDashboard({ section = "overview", onNavigate }: { section?: SafetySection; onNavigate?: (t: string) => void }) {
  const meta = sectionMeta[section];
  const [selected, setSelected] = useState<SafetyTrendKey | null>(null);
  const [aiCard, setAiCard] = useState<PicMetricCardData | null>(null);
  const toggle = (id: string) => setSelected((c) => (c === id ? null : (id as SafetyTrendKey)));

  if (section === "ga-admin") {
    return (
      <div className="pic-page">
        <div className="repair-header">
          <div><div className="repair-eyebrow">{meta.eyebrow}</div>
          <div className="repair-title-row"><h1 className="text-2xl font-bold tracking-tight text-slate-900">{meta.title}</h1></div>
          <p>{meta.subtitle}</p></div>
          <div className="repair-actions"><button className="repair-outline" type="button">07 Oct 2026</button></div>
        </div>
        <article className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60">
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <h2 className="text-slate-900 font-semibold text-lg">No Data Available</h2>
            <p className="text-slate-500 text-sm">Coming Soon — halaman GA Admin sedang disiapkan.</p>
          </div>
        </article>
      </div>
    );
  }

  if (section === "data-source") {
    return (
      <div className="pic-page">
        <div className="repair-header">
          <div><div className="repair-eyebrow">{meta.eyebrow}</div>
          <div className="repair-title-row"><h1 className="text-2xl font-bold tracking-tight text-slate-900">{meta.title}</h1></div>
          <p>{meta.subtitle}</p></div>
          <div className="repair-actions"><button className="repair-outline" type="button">07 Oct 2026</button></div>
        </div>
        <article className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60">
          <div className="repair-card-head"><div><h2>Data Source</h2><p>Sumber data dan waktu pembaruan terakhir</p></div></div>
          <div className="repair-table-scroll"><table className="repair-data-table pic-table">
            <thead><tr><th>Sumber</th><th>Metric</th><th>Terakhir Update</th></tr></thead>
            <tbody>{dataSourceRows.map((r) => (<tr key={r.source}><td>{r.source}</td><td>{r.metric}</td><td>{r.updated}</td></tr>))}</tbody>
          </table></div>
        </article>
      </div>
    );
  }

  const cards = section === "overview" ? safetyHomeCards : section === "isc" ? iscCards : safetyMonitoringCards;
  const chartKeys: SafetyTrendKey[] = section === "overview"
    ? ["safety-battery", "safety-incident", "safety-information", "safety-material"]
    : section === "safety" ? ["safety-material", "safety-incident", "safety-information"]
    : section === "isc" ? ["isc-abnormal"] : [];
  const activeCharts = selected ? [selected] : chartKeys;
  const allCards = useMemo(() => [...safetyHomeCards, ...iscCards, ...safetyMonitoringCards], []);

  return (
    <div className="pic-page">
      <div className="repair-header">
        <div><div className="repair-eyebrow">{meta.eyebrow}</div>
        <div className="repair-title-row"><h1 className="text-2xl font-bold tracking-tight text-slate-900">{meta.title}</h1></div>
        <p>{meta.subtitle}</p></div>
        <div className="repair-actions">
          <button className="repair-outline" type="button">07 Oct 2026</button>
          <button className="repair-primary text-white font-bold" type="button" onClick={() => onNavigate?.("safety-data-source")}>Data Source</button>
        </div>
      </div>
      <div className="repair-kpis pic-kpis-three">
        {cards.map((card) => (
          <PicMetricCard key={card.id} card={card} selected={selected === card.id} onToggle={toggle} onAskAi={setAiCard} subtext={`Target vs Actual — Target: ${card.targetLabel}`} />
        ))}
      </div>
      <div className="repair-charts">
        {activeCharts.map((key) => {
          const card = allCards.find((i) => i.id === key) ?? cards[0];
          return <MetricChart key={key} id={`pic-safety-${section}-${key}`} title={card.name} values={safetyTrendSeeds[key]} target={card.target} direction={card.direction} full />;
        })}
      </div>
      {aiCard && (
        <PicAiInsight metricName={aiCard.name} actualLabel={`${aiCard.display} ${aiCard.unit}`.trim()} targetLabel={aiCard.targetLabel} gapLabel={aiCard.gap} direction={aiCard.direction} onClose={() => setAiCard(null)} />
      )}
    </div>
  );
}
