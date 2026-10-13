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
import { QC_MODELS, QC_MODULES, QC_MODULE_DATA, type QcModuleKey } from "@/data/qcMonitoringData";

type TrendKey = QcModuleKey;

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
  { id: "FQC", name: "FQC Rate", value: 1.45, display: "1.45%", unit: "", target: 1.5, targetLabel: "1.50%" },
  { id: "OQC", name: "OQC Rate", value: 1.82, display: "1.82%", unit: "", target: 1.2, targetLabel: "1.20%" },
  { id: "ODM", name: "ODM Rate", value: 1.15, display: "1.15%", unit: "", target: 1.3, targetLabel: "1.30%" },
];

function Breakdown({ trendKey }: { trendKey: TrendKey }) {
  const dataDef = QC_MODULE_DATA[trendKey];
  return (
    <article className="repair-panel wide">
      <div className="repair-card-head"><div><h2>Breakdown NG {trendKey} per Model</h2><p>Detail NG rate per model</p></div></div>
      <div className="repair-table-scroll">
        <table className="repair-data-table pic-table">
          <thead><tr><th>Model</th><th>NG Rate</th><th>Target</th><th>Status</th></tr></thead>
          <tbody>
            {QC_MODELS.map((model, modelIndex) => {
              const values = dataDef.modelNg[modelIndex];
              const latest = values[values.length - 1];
              const good = latest <= dataDef.ngTarget;
              return (
                <tr key={model}>
                  <td>{model}</td>
                  <td>{latest.toFixed(2)}%</td>
                  <td>{dataDef.ngTarget.toFixed(2)}%</td>
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

function QcInputDialog({ onClose, onSave }: { onClose: () => void; onSave: (id: string, actual: number) => void }) {
  const [tab, setTab] = useState<"manual" | "import">("manual");
  const [selectedKpi, setSelectedKpi] = useState("FQC");
  return <div className="repair-modal-backdrop" onMouseDown={onClose}><form className="repair-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave(String(data.get("kpi")), Number(data.get("actual"))); }}>
    <div className="repair-dialog-head"><div><h2>Input Data KPI</h2><p>Tambahkan data aktual untuk periode baru.</p></div><button type="button" onClick={onClose}><Glyph name="close" /></button></div>
    <div className="dialog-tabs"><button type="button" className={tab === "manual" ? "active" : ""} onClick={() => setTab("manual")}>Input Manual</button><button type="button" className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}>Import Excel</button></div>
    {tab === "manual" ? <div className="repair-form"><label>Pilih KPI<CustomSelect value={selectedKpi} options={QC_MODULES.map((module) => ({ value: module, label: `${module} Rate` }))} onChange={(next) => setSelectedKpi(next)} /></label><div className="form-grid"><label>Periode<input type="date" required /></label><label>Tipe<CustomSelect defaultValue="Harian" options={["Harian", "Mingguan", "Bulanan"]} /></label><label>Target<input name="target" type="number" step="any" required /></label><label>Actual<input name="actual" type="number" step="any" required /></label></div><label>Catatan<textarea rows={3} placeholder="Catatan PIC..." /></label></div> : <div className="repair-dropzone"><Glyph name="upload" /><strong>Drop file Excel atau CSV di sini</strong><span>.xlsx, .xls, atau .csv maksimal 10 MB</span><input type="file" accept=".xlsx,.xls,.csv" /><div className="import-preview"><span>Preview akan tampil setelah file dipilih</span></div></div>}
    <div className="repair-dialog-actions"><button type="button" className="repair-outline" onClick={onClose}>Batal</button><button className="repair-primary">{tab === "manual" ? "Simpan" : "Konfirmasi Import"}</button></div>
  </form></div>;
}

export default function PicQcHome() {
  const [selected, setSelected] = useState<TrendKey | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [inputOpen, setInputOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [aiCard, setAiCard] = useState<MeetingCard | null>(null);

  const cards = useMemo(() => baseCards.map((card) => {
    if (values[card.id] === undefined) return card;
    const value = values[card.id];
    return { ...card, value, display: `${value.toFixed(2)}%` };
  }), [values]);

  const trendConfig = useMemo(() => ({
    FQC: { title: "FQC Rate Performance", values: [1.62, 1.58, 1.66, 1.55, 1.6, 1.52, 1.57, 1.49, 1.54, 1.47, 1.51, 1.48, 1.5, 1.45], target: 1.5, direction: "lower" as const },
    OQC: { title: "OQC Rate Performance", values: [1.25, 1.3, 1.28, 1.35, 1.42, 1.38, 1.45, 1.52, 1.48, 1.55, 1.6, 1.58, 1.7, 1.82], target: 1.2, direction: "lower" as const },
    ODM: { title: "ODM Rate Performance", values: [1.42, 1.38, 1.35, 1.4, 1.32, 1.28, 1.33, 1.25, 1.29, 1.22, 1.26, 1.2, 1.18, 1.15], target: 1.3, direction: "lower" as const },
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
          <p>Core metric summary for QC area: FQC Rate, OQC Rate, and ODM Rate.</p>
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
          const diff = card.value - card.target;
          const gap = `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}%`;
          return (
            <article className="repair-kpi pic-kpi bg-white/80! backdrop-blur-md border border-white/60! shadow-xs! rounded-2xl!" key={card.id} style={active ? { borderColor: "var(--accent-1)" } : undefined}>
              <div className="repair-kpi-top"><span>{card.name}</span><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? "On Target" : "Off Target"}</span></div>
              <strong>{card.display} <small>{card.unit}</small></strong>
              <p>Target: {card.targetLabel} <b className={good ? "good-text" : "bad-text"}> {gap}</b></p>
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
            <MetricChart key={key} id={`pic-qc-${key}`} title={trendConfig[key].title} values={trendConfig[key].values} target={trendConfig[key].target} direction={trendConfig[key].direction} domain={[0.5, 2.5]} full />
          ))}
        </div>
      ) : (
        <div className="repair-charts pic-qc-glass">
          <MetricChart id={`pic-qc-${selected}`} title={trendConfig[selected].title} values={trendConfig[selected].values} target={trendConfig[selected].target} direction={trendConfig[selected].direction} domain={[0.5, 2.5]} full />
          <Breakdown trendKey={selected} />
        </div>
      )}

      {aiCard && (
        <PicAiInsight
          metricName={aiCard.name}
          actualLabel={aiCard.display}
          targetLabel={aiCard.targetLabel}
          gapLabel={`${(aiCard.value - aiCard.target) >= 0 ? "+" : ""}${(aiCard.value - aiCard.target).toFixed(2)}%`}
          direction="lower"
          onClose={() => setAiCard(null)}
        />
      )}
      {inputOpen && <QcInputDialog onClose={() => setInputOpen(false)} onSave={saveInput} />}
      {toast && <div className="repair-toast"><span>✓</span>Data berhasil disimpan</div>}
    </div>
  );
}
