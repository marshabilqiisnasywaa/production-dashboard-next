"use client";
import { useMemo, useState } from "react";
import {
  Glyph,
  MetricChart,
  Sparkline,
} from "@/features/repair/RepairDashboard";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";
import CustomSelect from "@/components/shell/CustomSelect";
import {
  ASSEMBLY_LINES,
  ASSEMBLY_LINE_OUTPUT,
  ASSEMBLY_LINE_PLAN,
  ASSEMBLY_TRENDS,
  PACKAGING_LINES,
  PACKAGING_LINE_OUTPUT,
  PACKAGING_LINE_PLAN,
} from "@/data/assemblyMonitoringData";

type TrendKey = "plan" | "actual" | "rate" | "pack" | "fg";

type MeetingCard = {
  id: TrendKey;
  name: string;
  value: number;
  display: string;
  unit: string;
  target: number;
  targetLabel: string;
  gap: string;
  tolerance: number;
  isPercent: boolean;
};

const baseCards: MeetingCard[] = [
  { id: "plan", name: "Assembly Plan", value: 45000, display: "45,000", unit: "units", target: 45000, targetLabel: "45,000 units", gap: "", tolerance: 0, isPercent: false },
  { id: "actual", name: "Assembly Actual", value: 43820, display: "43,820", unit: "units", target: 45000, targetLabel: "45,000 units", gap: "-1,180 units", tolerance: 0, isPercent: false },
  { id: "rate", name: "Achievement Rate", value: 97.38, display: "97.38%", unit: "", target: 98, targetLabel: "98.00%", gap: "-0.62%", tolerance: 0, isPercent: true },
  { id: "pack", name: "Packaging Plan", value: 45000, display: "45,000", unit: "units", target: 45000, targetLabel: "45,000 units", gap: "", tolerance: 0, isPercent: false },
  { id: "fg", name: "FG Actual", value: 43612, display: "43,612", unit: "units", target: 44000, targetLabel: "44,000 units", gap: "-388 units", tolerance: 500, isPercent: false },
];

function formatGap(value: number, target: number, isPercent: boolean): string {
  const diff = value - target;
  if (diff === 0) return "";
  const signed = `${diff > 0 ? "+" : ""}${isPercent ? diff.toFixed(2) : Math.round(diff).toLocaleString("en-US")}`;
  return `${signed}${isPercent ? "%" : " units"}`;
}

const breakdownSource: Record<TrendKey, { lines: string[]; plans: number[]; actuals: number[] }> = {
  plan: { lines: ASSEMBLY_LINES, plans: ASSEMBLY_LINE_PLAN, actuals: ASSEMBLY_LINE_OUTPUT },
  actual: { lines: ASSEMBLY_LINES, plans: ASSEMBLY_LINE_PLAN, actuals: ASSEMBLY_LINE_OUTPUT },
  rate: { lines: ASSEMBLY_LINES, plans: ASSEMBLY_LINE_PLAN, actuals: ASSEMBLY_LINE_OUTPUT },
  pack: { lines: PACKAGING_LINES, plans: PACKAGING_LINE_PLAN, actuals: PACKAGING_LINE_OUTPUT },
  fg: { lines: PACKAGING_LINES, plans: PACKAGING_LINE_PLAN, actuals: PACKAGING_LINE_OUTPUT },
};

function Breakdown({ trendKey }: { trendKey: TrendKey }) {
  const source = breakdownSource[trendKey];
  return (
    <article className="repair-panel wide">
      <div className="repair-card-head"><div><h2>Breakdown Output per Line</h2><p>Plan vs actual per line</p></div></div>
      <div className="repair-table-scroll">
        <table className="repair-data-table pic-table">
          <thead><tr><th>Line</th><th>Plan</th><th>Actual</th><th>Achievement</th><th>Status</th></tr></thead>
          <tbody>
            {source.lines.map((line, lineIndex) => {
              const plan = source.plans[lineIndex];
              const actual = source.actuals[lineIndex];
              const pct = (actual / plan) * 100;
              const good = pct >= 98;
              return (
                <tr key={line}>
                  <td>{line}</td>
                  <td>{plan.toLocaleString("en-US")}</td>
                  <td>{actual.toLocaleString("en-US")}</td>
                  <td>{pct.toFixed(2)}%</td>
                  <td><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? "Achieved" : "Behind"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function AssemblyInputDialog({ onClose, onSave }: { onClose: () => void; onSave: (id: string, actual: number) => void }) {
  const [tab, setTab] = useState<"manual" | "import">("manual");
  const [selectedKpi, setSelectedKpi] = useState("plan");
  return <div className="repair-modal-backdrop" onMouseDown={onClose}><form className="repair-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave(String(data.get("kpi")), Number(data.get("actual"))); }}>
    <div className="repair-dialog-head"><div><h2>Input Data KPI</h2><p>Tambahkan data aktual untuk periode baru.</p></div><button type="button" onClick={onClose}><Glyph name="close" /></button></div>
    <div className="dialog-tabs"><button type="button" className={tab === "manual" ? "active" : ""} onClick={() => setTab("manual")}>Input Manual</button><button type="button" className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}>Import Excel</button></div>
    {tab === "manual" ? <div className="repair-form"><label>Pilih KPI<CustomSelect value={selectedKpi} options={baseCards.map((card) => ({ value: card.id, label: card.name }))} onChange={(next) => setSelectedKpi(next)} /></label><div className="form-grid"><label>Periode<input type="date" required /></label><label>Tipe<CustomSelect defaultValue="Harian" options={["Harian", "Mingguan", "Bulanan"]} /></label><label>Target<input name="target" type="number" step="any" required /></label><label>Actual<input name="actual" type="number" step="any" required /></label></div><label>Catatan<textarea rows={3} placeholder="Catatan PIC..." /></label></div> : <div className="repair-dropzone"><Glyph name="upload" /><strong>Drop file Excel atau CSV di sini</strong><span>.xlsx, .xls, atau .csv maksimal 10 MB</span><input type="file" accept=".xlsx,.xls,.csv" /><div className="import-preview"><span>Preview akan tampil setelah file dipilih</span></div></div>}
    <div className="repair-dialog-actions"><button type="button" className="repair-outline" onClick={onClose}>Batal</button><button className="repair-primary">{tab === "manual" ? "Simpan" : "Konfirmasi Import"}</button></div>
  </form></div>;
}

export default function PicAssemblyHome() {
  const [selected, setSelected] = useState<TrendKey | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [inputOpen, setInputOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [aiCard, setAiCard] = useState<MeetingCard | null>(null);

  const cards = useMemo(() => baseCards.map((card) => {
    if (values[card.id] === undefined) return card;
    const value = values[card.id];
    return {
      ...card,
      value,
      display: card.isPercent ? `${value.toFixed(2)}%` : value.toLocaleString("en-US"),
      gap: formatGap(value, card.target, card.isPercent),
    };
  }), [values]);

  const trendConfig = useMemo(() => ({
    plan: { title: "Assembly Plan", values: ASSEMBLY_TRENDS.output.map(() => ASSEMBLY_TRENDS.outputPlan), target: ASSEMBLY_TRENDS.outputPlan, direction: "higher" as const, domain: [42000, 46000] as [number, number] },
    actual: { title: "Assembly Actual", values: ASSEMBLY_TRENDS.output, target: ASSEMBLY_TRENDS.outputPlan, direction: "higher" as const, domain: [38000, 46000] as [number, number] },
    rate: { title: "Achievement Rate", values: [93.5, 94.2, 94.8, 95.3, 95.9, 96.4, 96.1, 96.7, 97, 97.2, 97.1, 97.3, 97.35, 97.38], target: 98, direction: "higher" as const, domain: [92, 100] as [number, number] },
    pack: { title: "Packaging Plan", values: ASSEMBLY_TRENDS.packaging.map(() => ASSEMBLY_TRENDS.packagingPlan), target: ASSEMBLY_TRENDS.packagingPlan, direction: "higher" as const, domain: [42000, 46000] as [number, number] },
    fg: { title: "FG Actual", values: ASSEMBLY_TRENDS.packaging, target: 44000, direction: "higher" as const, domain: [38000, 46000] as [number, number] },
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Meeting Dashboard</h1>
          </div>
          <p>Core metric summary for Assembly area: plan, actual, achievement, packaging, and finish good.</p>
        </div>
        <div className="repair-actions">
          <button className="repair-outline" type="button">07 Oct 2026</button>
          <button className="repair-primary text-white font-bold" type="button" onClick={() => setInputOpen(true)}>+ Input Data</button>
        </div>
      </div>

      <div className="repair-kpis pic-kpis-five">
        {cards.map((card) => {
          const good = card.value >= card.target - card.tolerance;
          const active = selected === card.id;
          return (
            <article className="repair-kpi pic-kpi bg-white/80! backdrop-blur-md border border-white/60! shadow-xs! rounded-2xl!" key={card.id} style={active ? { borderColor: "var(--accent-1)" } : undefined}>
              <div className="repair-kpi-top"><span>{card.name}</span><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? "On Target" : "Off Target"}</span></div>
              <strong>{card.display} <small>{card.unit}</small></strong>
              <p>Target: {card.targetLabel}{card.gap ? ` (${card.gap})` : ""}</p>
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
        <div className="repair-charts pic-qc-glass">
          {(Object.keys(trendConfig) as TrendKey[]).map((key) => (
            <MetricChart key={key} id={`pic-asm-${key}`} title={trendConfig[key].title} values={trendConfig[key].values} target={trendConfig[key].target} direction={trendConfig[key].direction} domain={trendConfig[key].domain} full />
          ))}
        </div>
      ) : (
        <div className="repair-charts pic-qc-glass">
          <MetricChart id={`pic-asm-${selected}`} title={trendConfig[selected].title} values={trendConfig[selected].values} target={trendConfig[selected].target} direction={trendConfig[selected].direction} domain={trendConfig[selected].domain} full />
          <Breakdown trendKey={selected} />
        </div>
      )}

      {aiCard && (
        <PicAiInsight
          metricName={aiCard.name}
          actualLabel={`${aiCard.display} ${aiCard.unit}`.trim()}
          targetLabel={aiCard.targetLabel}
          gapLabel={aiCard.gap || "0"}
          direction="higher"
          onClose={() => setAiCard(null)}
        />
      )}
      {inputOpen && <AssemblyInputDialog onClose={() => setInputOpen(false)} onSave={saveInput} />}
      {toast && <div className="repair-toast"><span>✓</span>Data berhasil disimpan</div>}
    </div>
  );
}
