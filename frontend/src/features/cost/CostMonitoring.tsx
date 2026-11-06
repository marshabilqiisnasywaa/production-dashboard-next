"use client";
import { useUiText } from "@/locales/useUiText";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getSeries, lossCategories, lossRecords, SLC_COST_BASE, type CostNav, type NavigateCost } from "@/data/costData";
import { formatMoney, formatPct } from "./format";
import { HBarList, Panel, PeriodTabs, StatCard } from "./shared";

function Header({ onNavigate }: { onNavigate: NavigateCost }) {
  const { text: uiText, locale: uiLocale } = useUiText();
  const [updatedAt, setUpdatedAt] = useState("--:--");

  useEffect(() => {
    setUpdatedAt(new Date().toLocaleTimeString(uiLocale, { hour: "2-digit", minute: "2-digit" }));
  }, []);

  return (
    <div className="qc-page-shell">
      <header className="qc-page-header">
        <div>
          <div className="qc-kicker">{uiText("MORNING MEETING • COST AREA")}</div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{uiText("Cost Meeting Dashboard")}</h1>
        </div>
        <div className="qc-toolbar">
          <div className="qc-live">
            <span className="live-dot" />
            <span>{uiText("Last updated: ")}{updatedAt}</span>
          </div>
          <button className="qc-secondary-button" type="button"><Download size={14} />{uiText("Export")}</button>
          <button className="qc-primary-button" type="button" onClick={() => onNavigate("Losses Cost")}><ArrowRight size={14} />{uiText("Losses Cost")}</button>
        </div>
      </header>
    </div>
  );
}

export default function CostMonitoring({ focus, onNavigate }: { focus?: CostNav; onNavigate: NavigateCost }) {
  const { text: uiText } = useUiText();
  const [period, setPeriod] = useState<"Today" | "Week" | "Month" | "Year">("Month");
  const totalLoss = lossRecords.reduce((sum, record) => sum + record.cost, 0);
  const previousLoss = lossRecords.filter((record) => record.week <= 4).reduce((sum, record) => sum + record.cost, 0);
  const categoryRows = useMemo(() => lossCategories.map((category) => ({ name: category, value: lossRecords.filter((record) => record.category === category).reduce((sum, record) => sum + record.cost, 0) })), []);
  const areaRows = useMemo(() => [...new Set(lossRecords.map((record) => record.area))].map((area) => ({ name: area, value: lossRecords.filter((record) => record.area === area).reduce((sum, record) => sum + record.cost, 0) })), []);
  const trend = getSeries("loss", period);
  const totalSaving = lossRecords.filter((record) => record.week === 8).reduce((sum, record) => sum + record.cost, 0);
  const kpis = [
    { label: "SLC", value: 3.56, unit: "%", target: 3.70, delta: "-0.14", higherIsBetter: false },
    { label: "OPE Pabrik", value: 82.4, unit: "%", target: 85, delta: "-2.6", higherIsBetter: true },
    { label: "OPE Instalasi", value: 91.2, unit: "%", target: 90, delta: "+1.2", higherIsBetter: true },
    { label: "OPE Packing", value: 87.5, unit: "%", target: 88, delta: "-0.5", higherIsBetter: true },
    { label: "UPPH", value: 5.57, unit: "pcs/h", target: 5.4, delta: "+0.17", higherIsBetter: true },
  ];

  return <div className="sqcdip-content cm-page"><Header onNavigate={onNavigate} />{focus?.kpiKey && <div className="sq-panel cm-banner"><p>{uiText("Menampilkan konteks KPI ")}{focus.kpiKey}.</p><button type="button" onClick={() => onNavigate("Monitoring")}>{uiText("Tutup")}</button></div>}<div className="repair-kpis">{kpis.map((kpi) => { const good = kpi.higherIsBetter ? kpi.value >= kpi.target : kpi.value <= kpi.target; return <article key={kpi.label} className="repair-kpi"><div className="repair-kpi-top"><span>{uiText(kpi.label)}</span><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? uiText("On Target") : uiText("Off Target")}</span></div><strong>{kpi.value.toFixed(2)}{uiText(kpi.unit)}</strong><p>{uiText("Target: ")}{kpi.target.toFixed(2)}{uiText(kpi.unit)}<b className={good ? "good-text" : "bad-text"}>{kpi.delta}</b></p><svg className="repair-spark" viewBox="0 0 112 35" preserveAspectRatio="none"><path d="M1 28 8 25 15 27 22 18 29 21 36 15 43 18 50 11 57 14 64 8 71 13 78 6 85 10 92 5 99 9 111 3" fill="none" stroke={good ? "var(--success)" : "var(--danger)"} strokeWidth="2"/><path d="M1 34V28L8 25 15 27 22 18 29 21 36 15 43 18 50 11 57 14 64 8 71 13 78 6 85 10 92 5 99 9 111 3V34Z" fill={good ? "var(--success-soft)" : "var(--danger-soft)"}/></svg></article>; })}</div><div className="cm-panel-grid"><Panel title={uiText("Cost Performance")} subtitle={uiText("Loss Cost Trend dan cost achievement")}><PeriodTabs options={["Today", "Week", "Month", "Year"]} value={period} onChange={(value) => setPeriod(value as typeof period)} /><div className="cm-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={trend}><CartesianGrid vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => formatMoney(Number(value))} axisLine={false} tickLine={false} /><Tooltip formatter={(value: number) => formatMoney(Number(value))} /><Bar dataKey="value" name={uiText("Monthly Loss")} fill="var(--chart-1)" radius={[5, 5, 0, 0]} /></ComposedChart></ResponsiveContainer></div></Panel><Panel title={uiText("Cost Achievement")} subtitle={uiText("Before vs After per strategi")}><div className="cm-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={lossCategories.slice(0, 5).map((category, index) => ({ category, before: 4.3 + index * .2, after: 3.7 + index * .16 }))}><CartesianGrid vertical={false} /><XAxis dataKey="category" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="before" name={uiText("Before")} fill="var(--chart-1)" radius={[5, 5, 0, 0]} /><Bar dataKey="after" name={uiText("After")} fill="var(--success)" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel></div><div className="cm-panel-grid equal"><Panel title={uiText("Loss Cost by Category")} subtitle={uiText("Kategori dengan kontribusi terbesar")} action={<button className="cm-link" type="button" onClick={() => onNavigate("Losses Cost")}>{uiText("Lihat detail ")}<ArrowRight size={12} /></button>}><HBarList rows={categoryRows} /></Panel><Panel title={uiText("Loss Cost by Area")} subtitle={uiText("Kontribusi area produksi")}><HBarList rows={areaRows} /></Panel></div><div className="cm-panel-grid equal"><Panel title={uiText("Improvement Strategy")} subtitle={uiText("Strategi pengurangan cost")} action={<button className="cm-link" type="button" onClick={() => onNavigate("Cost Improvement")}>{uiText("Lihat strategi ")}<ArrowRight size={12} /></button>}><div className="cm-empty">{uiText("Data improvement tersedia di Cost Improvement.")}</div></Panel><Panel title={uiText("Cost Transfer")} subtitle={uiText("Biaya yang dapat ditransfer ke vendor")} action={<button className="cm-link" type="button" onClick={() => onNavigate("Cost Transfer")}>{uiText("Lihat transfer ")}<ArrowRight size={12} /></button>}><div className="cm-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={getSeries("transfer", period)}><CartesianGrid vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => formatMoney(Number(value))} axisLine={false} tickLine={false} /><Tooltip /><Line dataKey="value" name={uiText("Transfer Cost")} stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></Panel></div><span className="cm-kpi-sub">{uiText("Total saving periode terakhir: ")}{formatMoney(totalSaving)}</span></div>;
}


