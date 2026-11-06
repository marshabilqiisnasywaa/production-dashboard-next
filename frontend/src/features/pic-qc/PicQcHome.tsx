"use client";
import { useUiText } from "@/locales/useUiText";

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

function ngCount(module: QcModuleKey): { value: number; target: number } {
  const dataDef = QC_MODULE_DATA[module];
  const latest = dataDef.dailyNg[dataDef.dailyNg.length - 1];
  return {
    value: Math.round((dataDef.totalSample * latest) / 100),
    target: Math.round((dataDef.totalSample * dataDef.ngTarget) / 100),
  };
}

const baseCards: MeetingCard[] = QC_MODULES.map((module) => {
  const dataDef = QC_MODULE_DATA[module];
  const count = ngCount(module);
  return {
    id: module,
    name: `${module} NG Units`,
    value: count.value,
    display: count.value.toLocaleString("en-US"),
    unit: "units",
    target: count.target,
    targetLabel: `${count.target.toLocaleString("en-US")} units`,
  };
});

function Breakdown({ trendKey }: { trendKey: TrendKey }) {
  const { text: uiText } = useUiText();
  const dataDef = QC_MODULE_DATA[trendKey];
  return (
    <article className="repair-panel wide">
      <div className="repair-card-head"><div><h2>{uiText("Breakdown NG ")}{trendKey}{uiText(" per Model")}</h2><p>{uiText("Detail NG rate per model")}</p></div></div>
      <div className="repair-table-scroll">
        <table className="repair-data-table pic-table">
          <thead><tr><th>{uiText("Model")}</th><th>{uiText("NG Rate")}</th><th>{uiText("Target")}</th><th>{uiText("Status")}</th></tr></thead>
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
                  <td><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? uiText("Achieved") : uiText("Behind")}</span></td>
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
  const { text: uiText } = useUiText();
  const [tab, setTab] = useState<"manual" | "import">("manual");
  const [selectedKpi, setSelectedKpi] = useState("FQC");
  return <div className="repair-modal-backdrop" onMouseDown={onClose}><form className="repair-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave(String(data.get("kpi")), Number(data.get("actual"))); }}>
    <div className="repair-dialog-head"><div><h2>{uiText("Input Data KPI")}</h2><p>{uiText("Tambahkan data aktual untuk periode baru.")}</p></div><button type="button" onClick={onClose}><Glyph name="close" /></button></div>
    <div className="dialog-tabs"><button type="button" className={tab === "manual" ? "active" : ""} onClick={() => setTab("manual")}>{uiText("Input Manual")}</button><button type="button" className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}>{uiText("Import Excel")}</button></div>
    {tab === "manual" ? <div className="repair-form"><label>{uiText("Pilih KPI")}<CustomSelect value={selectedKpi} options={QC_MODULES.map((module) => ({ value: module, label: `${module} NG Units` }))} onChange={(next) => setSelectedKpi(next)} /></label><div className="form-grid"><label>{uiText("Periode")}<input type="date" required /></label><label>{uiText("Tipe")}<CustomSelect defaultValue="Harian" options={["Harian", "Mingguan", "Bulanan"]} /></label><label>{uiText("Target")}<input name="target" type="number" step="any" required /></label><label>{uiText("Actual")}<input name="actual" type="number" step="any" required /></label></div><label>{uiText("Catatan")}<textarea rows={3} placeholder={uiText("Catatan PIC...")} /></label></div> : <div className="repair-dropzone"><Glyph name="upload" /><strong>{uiText("Drop file Excel atau CSV di sini")}</strong><span>{uiText(".xlsx, .xls, atau .csv maksimal 10 MB")}</span><input type="file" accept=".xlsx,.xls,.csv" /><div className="import-preview"><span>{uiText("Preview akan tampil setelah file dipilih")}</span></div></div>}
    <div className="repair-dialog-actions"><button type="button" className="repair-outline" onClick={onClose}>{uiText("Batal")}</button><button className="repair-primary">{tab === "manual" ? uiText("Simpan") : uiText("Konfirmasi Import")}</button></div>
  </form></div>;
}

export default function PicQcHome() {
  const { text: uiText, locale: uiLocale } = useUiText();
  const [selected, setSelected] = useState<TrendKey | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [inputOpen, setInputOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [aiCard, setAiCard] = useState<MeetingCard | null>(null);

  const cards = useMemo(() => baseCards.map((card) => {
    if (values[card.id] === undefined) return card;
    const value = values[card.id];
    return { ...card, value, display: value.toLocaleString(uiLocale) };
  }), [values]);

  const trendConfig = useMemo(() => ({
    FQC: { title: "FQC NG Units", values: QC_MODULE_DATA.FQC.dailyNg.map((rate) => Math.round((QC_MODULE_DATA.FQC.totalSample * rate) / 100)), target: ngCount("FQC").target, direction: "lower" as const },
    OQC: { title: "OQC NG Units", values: QC_MODULE_DATA.OQC.dailyNg.map((rate) => Math.round((QC_MODULE_DATA.OQC.totalSample * rate) / 100)), target: ngCount("OQC").target, direction: "lower" as const },
    ODM: { title: "ODM NG Units", values: QC_MODULE_DATA.ODM.dailyNg.map((rate) => Math.round((QC_MODULE_DATA.ODM.totalSample * rate) / 100)), target: ngCount("ODM").target, direction: "lower" as const },
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
          <div className="repair-eyebrow">{uiText("MORNING MEETING • PIC AREA")}</div>
          <div className="repair-title-row">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{uiText("Meeting Dashboard")}</h1>
          </div>
          <p>{uiText("Core metric summary for QC area: FQC, OQC, and ODM NG units.")}</p>
        </div>
        <div className="repair-actions">
          <button className="repair-outline" type="button">{uiText("07 Oct 2026")}</button>
          <button className="repair-primary text-white font-bold" type="button" onClick={() => setInputOpen(true)}>{uiText("+ Input Data")}</button>
        </div>
      </div>

      <div className="repair-kpis pic-kpis-three">
        {cards.map((card) => {
          const good = isOnTarget(card.value, card.target, "lower");
          const active = selected === card.id;
          const gap = Math.abs(card.value - card.target).toLocaleString(uiLocale);
          return (
            <article className="repair-kpi pic-kpi bg-white/80! backdrop-blur-md border border-white/60! shadow-xs! rounded-2xl!" key={card.id} style={active ? { borderColor: "var(--accent-1)" } : undefined}>
              <div className="repair-kpi-top"><span>{card.name}</span><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? uiText("On Target") : uiText("Off Target")}</span></div>
              <strong>{card.display} <small>{uiText(card.unit)}</small></strong>
              <p>{uiText("Target: ")}{uiText(card.targetLabel)} <b className={good ? "good-text" : "bad-text"}>{good ? "↓" : "↑"} {gap}</b></p>
              <Sparkline success={good} />
              <div className="pic-kpi-actions">
                <button type="button" className="repair-outline pic-mini" onClick={() => toggle(card.id)}>{active ? uiText("Tutup Tren") : uiText("Lihat Tren")}</button>
                {!good && <button type="button" className="pic-ai-btn" onClick={() => setAiCard(card)}>{uiText("Tanya AI")}</button>}
              </div>
            </article>
          );
        })}
      </div>

      {selected === null ? (
        <div className="repair-charts pic-qc-glass">
          {(Object.keys(trendConfig) as TrendKey[]).map((key) => (
            <MetricChart key={key} id={`pic-qc-${key}`} title={uiText(trendConfig[key].title)} values={trendConfig[key].values} target={trendConfig[key].target} direction={trendConfig[key].direction} full />
          ))}
        </div>
      ) : (
        <div className="repair-charts pic-qc-glass">
          <MetricChart id={`pic-qc-${selected}`} title={uiText(trendConfig[selected].title)} values={trendConfig[selected].values} target={trendConfig[selected].target} direction={trendConfig[selected].direction} full />
          <Breakdown trendKey={selected} />
        </div>
      )}

      {aiCard && (
        <PicAiInsight
          metricName={aiCard.name}
          actualLabel={`${aiCard.display} ${aiCard.unit}`}
          targetLabel={aiCard.targetLabel}
          gapLabel={Math.abs(aiCard.value - aiCard.target).toLocaleString(uiLocale)}
          direction="lower"
          onClose={() => setAiCard(null)}
        />
      )}
      {inputOpen && <QcInputDialog onClose={() => setInputOpen(false)} onSave={saveInput} />}
      {toast && <div className="repair-toast"><span>✓</span>{uiText("Data berhasil disimpan")}</div>}
    </div>
  );
}
