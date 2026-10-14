"use client";
import { useMemo, useState } from "react";
import {
  Glyph,
  MetricChart,
  Sparkline,
  isOnTarget,
} from "@/features/repair/RepairDashboard";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";
import CustomSelect from "@/components/shell/CustomSelect";

type TrendKey = "wip-mainboard" | "wip-external";

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
  { id: "wip-mainboard", name: "WIP Mainboard Service", value: 1842, display: "1,842", unit: "pcs", target: 2000, targetLabel: "2,000 pcs" },
  { id: "wip-external", name: "WIP Service External", value: 428, display: "428", unit: "units", target: 400, targetLabel: "400 units" },
];

const mainboardTrend = [2140, 2105, 2088, 2052, 2031, 2010, 1998, 1985, 1971, 1958, 1944, 1931, 1918, 1904, 1891, 1878, 1860, 1842];
const externalTrend = [462, 458, 455, 451, 449, 446, 444, 441, 439, 437, 435, 433, 431, 430, 429, 428, 428, 428];

const mainboardBreakdown = [
  { process: "SMT Rework", model: "121516", wip: 640, target: 700 },
  { process: "BGA Reball", model: "121516", wip: 512, target: 550 },
  { process: "Testing", model: "121518", wip: 388, target: 400 },
  { process: "Packing", model: "121518", wip: 302, target: 350 },
];

const externalBreakdown = [
  { type: "Screen Replacement", incoming: 184, completed: 162, backlog: 22 },
  { type: "Battery Replacement", incoming: 141, completed: 128, backlog: 13 },
  { type: "Board Level Repair", incoming: 96, completed: 81, backlog: 15 },
  { type: "Software Flash", incoming: 57, completed: 52, backlog: 5 },
];

function Breakdown({ trendKey }: { trendKey: TrendKey }) {
  if (trendKey === "wip-mainboard") {
    return (
      <article className="repair-panel wide">
        <div className="repair-card-head"><div><h2>Breakdown WIP Mainboard Service</h2><p>Detail unit per process and model</p></div></div>
        <div className="repair-table-scroll">
          <table className="repair-data-table pic-table">
            <thead><tr><th>Process</th><th>Model</th><th>WIP</th><th>Target</th><th>Status</th></tr></thead>
            <tbody>
              {mainboardBreakdown.map((row) => (
                <tr key={row.process}>
                  <td>{row.process}</td>
                  <td>{row.model}</td>
                  <td>{row.wip.toLocaleString("en-US")}</td>
                  <td>{row.target.toLocaleString("en-US")}</td>
                  <td><span className={`repair-status ${row.wip <= row.target ? "good" : "bad"}`}>{row.wip <= row.target ? "Achieved" : "Behind"}</span></td>
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
      <div className="repair-card-head"><div><h2>Breakdown WIP Service External</h2><p>Detail incoming and backlog per unit type</p></div></div>
      <div className="repair-table-scroll">
        <table className="repair-data-table pic-table">
          <thead><tr><th>Unit Type</th><th>Incoming</th><th>Completed</th><th>Backlog</th><th>Status</th></tr></thead>
          <tbody>
            {externalBreakdown.map((row) => (
              <tr key={row.type}>
                <td>{row.type}</td>
                <td>{row.incoming.toLocaleString("en-US")}</td>
                <td>{row.completed.toLocaleString("en-US")}</td>
                <td>{row.backlog.toLocaleString("en-US")}</td>
                <td><span className={`repair-status ${row.backlog <= 15 ? "good" : "bad"}`}>{row.backlog <= 15 ? "Achieved" : "Behind"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function ServiceInputDialog({ onClose, onSave }: { onClose: () => void; onSave: (id: string, actual: number) => void }) {
  const [tab, setTab] = useState<"manual" | "import">("manual");
  const [selectedKpi, setSelectedKpi] = useState("wip-mainboard");
  return <div className="repair-modal-backdrop" onMouseDown={onClose}><form className="repair-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave(String(data.get("kpi")), Number(data.get("actual"))); }}>
    <div className="repair-dialog-head"><div><h2>Input Data KPI</h2><p>Tambahkan data aktual untuk periode baru.</p></div><button type="button" onClick={onClose}><Glyph name="close" /></button></div>
    <div className="dialog-tabs"><button type="button" className={tab === "manual" ? "active" : ""} onClick={() => setTab("manual")}>Input Manual</button><button type="button" className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}>Import Excel</button></div>
    {tab === "manual" ? <div className="repair-form"><label>Pilih KPI<CustomSelect value={selectedKpi} options={baseCards.map((card) => ({ value: card.id, label: card.name }))} onChange={(next) => setSelectedKpi(next)} /></label><div className="form-grid"><label>Periode<input type="date" required /></label><label>Type<CustomSelect defaultValue="Daily" options={["Daily", "Week", "Month"]} /></label><label>Target<input name="target" type="number" step="any" required /></label><label>Actual<input name="actual" type="number" step="any" required /></label></div><label>Catatan<textarea rows={3} placeholder="Catatan PIC..." /></label></div> : <div className="repair-dropzone"><Glyph name="upload" /><strong>Drop file Excel atau CSV di sini</strong><span>.xlsx, .xls, atau .csv maksimal 10 MB</span><input type="file" accept=".xlsx,.xls,.csv" /><div className="import-preview"><span>Preview akan tampil setelah file dipilih</span></div></div>}
    <div className="repair-dialog-actions"><button type="button" className="repair-outline" onClick={onClose}>Batal</button><button className="repair-primary">{tab === "manual" ? "Simpan" : "Konfirmasi Import"}</button></div>
  </form></div>;
}

export default function PicServiceHome() {
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
    "wip-mainboard": { title: "WIP Mainboard Service", values: mainboardTrend, target: 2000, direction: "lower" as const },
    "wip-external": { title: "WIP Service External", values: externalTrend, target: 400, direction: "lower" as const },
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
          <p>Core metric summary for Service area: WIP Mainboard Service and WIP Service External.</p>
        </div>
        <div className="repair-actions">
          <button className="repair-outline" type="button">07 Oct 2026</button>
          <button className="repair-primary text-white font-bold" type="button" onClick={() => setInputOpen(true)}>+ Input Data</button>
        </div>
      </div>

      <div className="repair-kpis pic-kpis-three">
        {cards.map((card) => {
          const good = isOnTarget(card.value, card.target, "lower");
          const active = selected === card.id;
          const gap = Math.abs(card.value - card.target).toLocaleString("en-US");
          return (
            <article className="repair-kpi pic-kpi bg-white! border border-gray-200/80!" key={card.id} style={active ? { borderColor: "var(--accent-1)" } : undefined}>
              <div className="repair-kpi-top"><span>{card.name}</span><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? "On Target" : "Off Target"}</span></div>
              <strong>{card.display} <small>{card.unit}</small></strong>
              <p>Target: {card.targetLabel} <b className={good ? "good-text" : "bad-text"}>{good ? "↓" : "↑"} {gap}</b></p>
              <Sparkline success={good} />
              <div className="pic-kpi-actions">
                <button type="button" className="repair-outline pic-mini" onClick={() => toggle(card.id)}>{active ? "Hide Trend" : "View Trend"}</button>
                {!good && <button type="button" className="pic-ai-btn" onClick={() => setAiCard(card)}>Ask AI</button>}
              </div>
            </article>
          );
        })}
      </div>

      {selected === null ? (
        <div className="repair-charts">
          {(Object.keys(trendConfig) as TrendKey[]).map((key) => (
            <MetricChart key={key} id={`pic-svc-${key}`} title={trendConfig[key].title} values={trendConfig[key].values} target={trendConfig[key].target} direction={trendConfig[key].direction} full />
          ))}
        </div>
      ) : (
        <div className="repair-charts">
          <MetricChart id={`pic-svc-${selected}`} title={trendConfig[selected].title} values={trendConfig[selected].values} target={trendConfig[selected].target} direction={trendConfig[selected].direction} full />
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
      {inputOpen && <ServiceInputDialog onClose={() => setInputOpen(false)} onSave={saveInput} />}
      {toast && <div className="repair-toast"><span>✓</span>Data berhasil disimpan</div>}
    </div>
  );
}
