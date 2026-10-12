"use client";
import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import CustomSelect from "@/components/shell/CustomSelect";
import PeriodControl, { periodView, windowForPeriod, type PeriodKey } from "@/components/shell/PeriodControl";
import {
  QC_AREAS,
  QC_DAY_ISO,
  QC_DAY_LABEL,
  QC_DEFECTS,
  QC_DEFECT_COLORS,
  QC_MODELS,
  QC_MODULE_DATA,
  cutoffIndex,
  type QcModuleKey,
} from "@/data/qcMonitoringData";

const EMERALD = "#059669";
const RED = "#ef4444";

type QcMonitoringProps = {
  module: QcModuleKey;
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function ChartShell({ title, subtitle, period, onPeriod, labels, onLabels, children }: {
  title: string;
  subtitle: string;
  period: PeriodKey;
  onPeriod: (period: PeriodKey) => void;
  labels: boolean;
  onLabels: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <article className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-xs">
      <div className="repair-card-head">
        <div><h2>{title}</h2><p>{subtitle}</p></div>
        <div className="flex items-center justify-end gap-4">
          <label className="label-toggle flex items-center gap-2 text-xs text-slate-500 font-medium">
            <input type="checkbox" checked={labels} onChange={(event) => onLabels(event.target.checked)} /><span />Show labels
          </label>
          <PeriodControl value={period} onChange={onPeriod} />
        </div>
      </div>
      <div style={{ height: 260 }}>{children}</div>
    </article>
  );
}

function RateByDateChart({ moduleKey, endIdx }: { moduleKey: QcModuleKey; endIdx: number }) {
  const [period, setPeriod] = useState<PeriodKey>("Week");
  const [labels, setLabels] = useState(false);
  const dataDef = QC_MODULE_DATA[moduleKey];
  const view = periodView(QC_DAY_LABEL.slice(0, endIdx + 1), dataDef.dailyAcc.slice(0, endIdx + 1), period);
  const ngTaken = dataDef.dailyNg.slice(0, endIdx + 1).slice(-view.labels.length);
  const rows = view.labels.map((date, index) => ({ date, acc: view.values[index] ?? 0, ng: ngTaken[index] ?? 0 }));
  return (
    <ChartShell title={`${moduleKey} Rate by Date`} subtitle="NG Rate & Acceptance Rate harian" period={period} onPeriod={setPeriod} labels={labels} onLabels={setLabels}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 18, right: 6, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} width={40} tick={{ fontSize: 10 }} domain={[0, "auto"]} />
          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} width={44} tick={{ fontSize: 10 }} domain={[90, 100]} />
          <Tooltip cursor={{ fill: "rgba(4,106,57,0.05)" }} />
          <Legend wrapperStyle={{ paddingTop: 8 }} />
          <Bar yAxisId="left" dataKey="ng" name="NG Rate" fill={RED} radius={[6, 6, 0, 0]} maxBarSize={26}>
            {labels && <LabelList dataKey="ng" position="top" fontSize={9} formatter={(value) => `${Number(value).toFixed(1)}`} />}
          </Bar>
          <Line yAxisId="right" type="natural" dataKey="acc" name="Acc Rate" stroke={EMERALD} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }}>
            {labels && <LabelList dataKey="acc" position="top" fontSize={9} formatter={(value) => `${Number(value).toFixed(1)}`} />}
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function ModelByDateChart({ moduleKey, endIdx, modelSel }: { moduleKey: QcModuleKey; endIdx: number; modelSel: string }) {
  const [period, setPeriod] = useState<PeriodKey>("Week");
  const [labels, setLabels] = useState(false);
  const dataDef = QC_MODULE_DATA[moduleKey];
  const window = windowForPeriod(endIdx + 1, period);
  const models = modelSel === "All Models" ? QC_MODELS : QC_MODELS.filter((model) => model === modelSel);
  const rows = models.map((model) => {
    const modelIndex = QC_MODELS.indexOf(model);
    const slice = dataDef.modelNg[modelIndex].slice(0, endIdx + 1).slice(window.start, window.end + 1);
    return { model, ng: Number(mean(slice).toFixed(2)) };
  });
  return (
    <ChartShell title={`${moduleKey} Model by Date`} subtitle="NG Rate per model (aggregat)" period={period} onPeriod={setPeriod} labels={labels} onLabels={setLabels}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="model" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 10 }} interval={0} />
          <YAxis axisLine={false} tickLine={false} width={40} tick={{ fontSize: 10 }} domain={[0, "auto"]} />
          <Tooltip cursor={{ fill: "rgba(4,106,57,0.05)" }} />
          <Legend wrapperStyle={{ paddingTop: 8 }} />
          <Bar dataKey="ng" name="NG Rate" fill={EMERALD} radius={[6, 6, 0, 0]} maxBarSize={44}>
            {labels && <LabelList dataKey="ng" position="top" fontSize={10} formatter={(value) => `${Number(value).toFixed(1)}`} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function AreaChart({ moduleKey, endIdx, areaSel }: { moduleKey: QcModuleKey; endIdx: number; areaSel: string }) {
  const [period, setPeriod] = useState<PeriodKey>("Week");
  const [labels, setLabels] = useState(false);
  const dataDef = QC_MODULE_DATA[moduleKey];
  const window = windowForPeriod(endIdx + 1, period);
  const areas = areaSel === "All Areas" ? QC_AREAS : QC_AREAS.filter((area) => area === areaSel);
  const rows = areas.map((area) => {
    const areaIndex = QC_AREAS.indexOf(area);
    const slice = dataDef.areaAcc[areaIndex].slice(0, endIdx + 1).slice(window.start, window.end + 1);
    return { area, acc: Number(mean(slice).toFixed(2)) };
  });
  return (
    <ChartShell title={`${moduleKey} by Area`} subtitle="Acceptance rate per area" period={period} onPeriod={setPeriod} labels={labels} onLabels={setLabels}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--line)" />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} domain={[90, 100]} />
          <YAxis type="category" dataKey="area" axisLine={false} tickLine={false} width={104} tick={{ fontSize: 10 }} />
          <Tooltip cursor={{ fill: "rgba(4,106,57,0.05)" }} />
          <Legend wrapperStyle={{ paddingTop: 8 }} />
          <Bar dataKey="acc" name="Acc Rate" fill={EMERALD} radius={[0, 6, 6, 0]} maxBarSize={26}>
            {labels && <LabelList dataKey="acc" position="right" fontSize={10} formatter={(value) => `${Number(value).toFixed(1)}`} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function AreaDefectChart({ moduleKey, endIdx, areaSel }: { moduleKey: QcModuleKey; endIdx: number; areaSel: string }) {
  const [period, setPeriod] = useState<PeriodKey>("Week");
  const [labels, setLabels] = useState(false);
  const dataDef = QC_MODULE_DATA[moduleKey];
  const window = windowForPeriod(endIdx + 1, period);
  const areas = areaSel === "All Areas" ? QC_AREAS : QC_AREAS.filter((area) => area === areaSel);
  const rows = areas.map((area) => {
    const areaIndex = QC_AREAS.indexOf(area);
    const point: Record<string, number | string> = { area };
    QC_DEFECTS.forEach((defect, defectIndex) => {
      const slice = dataDef.defects[areaIndex][defectIndex].slice(0, endIdx + 1).slice(window.start, window.end + 1);
      point[defect] = slice.reduce((total, value) => total + value, 0);
    });
    return point;
  });
  return (
    <ChartShell title={`${moduleKey} by Area Defect`} subtitle="Jenis defect per area (stacked)" period={period} onPeriod={setPeriod} labels={labels} onLabels={setLabels}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--line)" />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="area" axisLine={false} tickLine={false} width={104} tick={{ fontSize: 10 }} />
          <Tooltip cursor={{ fill: "rgba(4,106,57,0.05)" }} />
          <Legend wrapperStyle={{ paddingTop: 8 }} />
          {QC_DEFECTS.map((defect, defectIndex) => (
            <Bar key={defect} dataKey={defect} stackId="defects" fill={QC_DEFECT_COLORS[defectIndex]} maxBarSize={26}>
              {labels && <LabelList dataKey={defect} position="center" fontSize={8} fill="#fff" formatter={(value) => (Number(value) > 0 ? `${value}` : "")} />}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export default function PicQcMonitoring({ module }: QcMonitoringProps) {
  const [asOf, setAsOf] = useState(QC_DAY_ISO[QC_DAY_ISO.length - 1]);
  const [areaSel, setAreaSel] = useState("All Areas");
  const [modelSel, setModelSel] = useState("All Models");
  const endIdx = cutoffIndex(asOf);

  const dataDef = QC_MODULE_DATA[module];
  const acc = dataDef.dailyAcc[endIdx] ?? dataDef.dailyAcc[dataDef.dailyAcc.length - 1];
  const ng = dataDef.dailyNg[endIdx] ?? dataDef.dailyNg[dataDef.dailyNg.length - 1];
  const prevIdx = Math.max(endIdx - 7, 0);
  const trend = acc - (dataDef.dailyAcc[prevIdx] ?? acc);
  const good = acc >= dataDef.accTarget;
  const ngCount = Math.round((dataDef.totalSample * ng) / 100).toLocaleString("en-US");

  const exportCsv = () => {
    const dataDef = QC_MODULE_DATA[module];
    const header = "Module,Date,Acc Rate %,NG Rate %";
    const lines = QC_DAY_ISO.slice(0, endIdx + 1).map((iso, index) => `${module},${iso},${dataDef.dailyAcc[index].toFixed(2)},${dataDef.dailyNg[index].toFixed(2)}`);
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `qc-${module.toLowerCase()}-monitoring.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MONITORING • DEEP DIVE</div>
          <div className="repair-title-row">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{module} Monitoring</h1>
          </div>
          <p>Acceptance and defect monitoring with daily trend for {module} area.</p>
        </div>
        <div className="repair-actions" style={{ flexWrap: "wrap", justifyContent: "flex-end", rowGap: 8, maxWidth: 560 }}>
          <input type="date" className="mm-sq-date w-44" value={asOf} min={QC_DAY_ISO[0]} max={QC_DAY_ISO[QC_DAY_ISO.length - 1]} onChange={(event) => setAsOf(event.target.value || QC_DAY_ISO[QC_DAY_ISO.length - 1])} aria-label="Filter date" />
          <CustomSelect value={areaSel} options={[{ value: "All Areas", label: "All Areas" }, ...QC_AREAS]} onChange={setAreaSel} ariaLabel="Area filter" />
          <CustomSelect value={modelSel} options={[{ value: "All Models", label: "All Models" }, ...QC_MODELS]} onChange={setModelSel} ariaLabel="Model filter" />
          <button type="button" className="repair-primary text-white font-bold" style={{ background: "linear-gradient(135deg,var(--accent-1),var(--accent-2))", color: "#fff" }} onClick={exportCsv}>Export</button>
        </div>
      </div>

      <article className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 w-full max-w-[420px]">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{module} RATE</div>
            <div className="text-3xl font-semibold text-slate-900 tracking-tight">{acc.toFixed(1)}%</div>
            <div className="text-xs font-semibold text-emerald-600 mt-2">{trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(2)} pp vs prev period</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-[11px] font-semibold mb-3 inline-block">{good ? "On Target" : "Off Target"}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "right" }}>
              <div className="text-xs text-gray-500">Total Sample : <span className="font-bold text-slate-900">{dataDef.totalSample.toLocaleString("en-US")} units</span></div>
              <div className="text-xs text-gray-500">Actual NG : <span className="font-bold text-red-600">{ngCount} units</span></div>
              <div className="text-xs text-gray-500">NG Rate : <span className="font-bold text-red-600">{ng.toFixed(1)}%</span></div>
            </div>
          </div>
        </div>
      </article>

      <div className="repair-charts">
        <RateByDateChart moduleKey={module} endIdx={endIdx} />
        <ModelByDateChart moduleKey={module} endIdx={endIdx} modelSel={modelSel} />
        <AreaChart moduleKey={module} endIdx={endIdx} areaSel={areaSel} />
        <AreaDefectChart moduleKey={module} endIdx={endIdx} areaSel={areaSel} />
      </div>
    </div>
  );
}
