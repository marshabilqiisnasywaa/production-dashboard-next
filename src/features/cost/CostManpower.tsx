"use client";
import { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, RefreshCw } from "lucide-react";
import CustomSelect from "@/components/shell/CustomSelect";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";
import PicMetricCard, { type PicMetricCardData } from "@/features/pic-repair/PicMetricCard";

type ManpowerPeriod = "Daily" | "Week" | "Month" | "Year";

const periodOptions: ManpowerPeriod[] = ["Daily", "Week", "Month", "Year"];

const EMERALD = "#059669";
const TEAL = "#0D9488";
const MINT = "#6EE7B7";
const EMERALD_LIGHT = "#10B981";
const AMBER = "#F59E0B";
const GRID = "#E2E8F0";

type ManpowerChartKey = "trend" | "hours" | "overtime" | "docs";

const metrics: PicMetricCardData[] = [
  { id: "total", name: "Total Manpower", value: 2160, display: "2,160", unit: "headcount", target: 2100, targetLabel: "2,100 headcount", gap: "60", direction: "lower" },
  { id: "direct", name: "Direct Headcount", value: 1680, display: "1,680", unit: "headcount", target: 1650, targetLabel: "1,650 headcount", gap: "30", direction: "higher" },
  { id: "indirect", name: "Indirect Headcount", value: 480, display: "480", unit: "headcount", target: 450, targetLabel: "450 headcount", gap: "30", direction: "lower" },
  { id: "hours", name: "Working Hours", value: 398, display: "398k", unit: "hrs", target: 380, targetLabel: "380k hrs", gap: "18k", direction: "higher" },
  { id: "overtime", name: "Overtime Rate", value: 14.8, display: "14.8", unit: "%", target: 12, targetLabel: "12.0%", gap: "2.8%", direction: "lower" },
];

const chartFor: Record<string, ManpowerChartKey> = {
  "total": "trend",
  "direct": "trend",
  "indirect": "trend",
  "hours": "hours",
  "overtime": "overtime",
};

const trendData: Record<ManpowerPeriod, { labels: string[]; direct: number[]; indirect: number[] }> = {
  "Daily": { labels: ["1 Okt", "2 Okt", "3 Okt", "4 Okt", "5 Okt", "6 Okt", "7 Okt"], direct: [1672, 1674, 1675, 1677, 1678, 1679, 1680], indirect: [472, 474, 475, 477, 478, 479, 480] },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], direct: [1648, 1652, 1656, 1660, 1665, 1670, 1675, 1680], indirect: [448, 452, 458, 462, 468, 472, 476, 480] },
  "Month": { labels: ["Apr", "Mei", "Jun", "Jul", "Agu", "Sep"], direct: [1620, 1635, 1648, 1660, 1670, 1680], indirect: [420, 432, 445, 458, 470, 480] },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], direct: [1580, 1605, 1630, 1655, 1680], indirect: [380, 405, 430, 455, 480] },
};

const hoursData: Record<ManpowerPeriod, { labels: string[]; hours: number[] }> = {
  "Daily": { labels: ["1 Okt", "2 Okt", "3 Okt", "4 Okt", "5 Okt", "6 Okt", "7 Okt"], hours: [52, 55, 54, 57, 56, 58, 59] },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], hours: [352, 358, 364, 371, 378, 385, 392, 398] },
  "Month": { labels: ["Apr", "Mei", "Jun", "Jul", "Agu", "Sep"], hours: [320, 335, 352, 360, 382, 398] },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], hours: [3420, 3610, 3780, 3900, 3980] },
};

const overtimeData: Record<ManpowerPeriod, { labels: string[]; rate: number[]; limit: number }> = {
  "Daily": { labels: ["1 Okt", "2 Okt", "3 Okt", "4 Okt", "5 Okt", "6 Okt", "7 Okt"], rate: [13.9, 14.1, 14.2, 14.4, 14.5, 14.7, 14.8], limit: 12 },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], rate: [12.4, 12.7, 13.0, 13.4, 13.8, 14.1, 14.5, 14.8], limit: 12 },
  "Month": { labels: ["Apr", "Mei", "Jun", "Jul", "Agu", "Sep"], rate: [11.2, 11.8, 12.4, 13.0, 13.9, 14.8], limit: 12 },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], rate: [9.8, 10.9, 12.1, 13.4, 14.8], limit: 12 },
};

const docRows = [
  { name: "QA Doc", value: 38, color: EMERALD },
  { name: "Data Entry", value: 34, color: TEAL },
  { name: "Traceability", value: 25, color: MINT },
  { name: "Audit Support", value: 15, color: AMBER },
  { name: "Other", value: 9, color: EMERALD_LIGHT },
];

const docMax = Math.max(...docRows.map((row) => row.value));

function ChartToggle({ value, onChange, ariaLabel }: { value: ManpowerPeriod; onChange: (next: ManpowerPeriod) => void; ariaLabel: string }) {
  return (
    <div className="sq-period" role="group" aria-label={ariaLabel}>
      {periodOptions.map((option) => (
        <button key={option} type="button" aria-pressed={value === option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>{option}</button>
      ))}
    </div>
  );
}

export default function CostManpower() {
  const [fiscal, setFiscal] = useState("FY2026 - Q1");
  const [trendPeriod, setTrendPeriod] = useState<ManpowerPeriod>("Month");
  const [hoursPeriod, setHoursPeriod] = useState<ManpowerPeriod>("Month");
  const [overtimePeriod, setOvertimePeriod] = useState<ManpowerPeriod>("Month");
  const [toast, setToast] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [aiMetric, setAiMetric] = useState<PicMetricCardData | null>(null);
  const chartRefs = useRef<Record<string, HTMLElement | null>>({});

  const focusChart = (id: string) => {
    if (focused === id) {
      setFocused(null);
      return;
    }
    setFocused(id);
    const key = chartFor[id];
    if (key) chartRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const chartRing = (key: string): string => (focused && chartFor[focused] === key ? " ring-2 ring-emerald-500" : "");

  const trend = trendData[trendPeriod];
  const trendRows = useMemo(() => trend.labels.map((label, index) => ({ label, direct: trend.direct[index], indirect: trend.indirect[index] })), [trend]);
  const hours = hoursData[hoursPeriod];
  const hoursRows = useMemo(() => hours.labels.map((label, index) => ({ label, hours: hours.hours[index] })), [hours]);
  const overtime = overtimeData[overtimePeriod];
  const overtimeRows = useMemo(() => overtime.labels.map((label, index) => ({ label, rate: overtime.rate[index], limit: overtime.limit })), [overtime]);

  const exportCsv = () => {
    const lines = ["metric,period,value"];
    for (const row of trendRows) lines.push(`Direct Headcount,${row.label},${row.direct}`, `Indirect Headcount,${row.label},${row.indirect}`);
    for (const row of hoursRows) lines.push(`Working Hours (k),${row.label},${row.hours}`);
    for (const row of overtimeRows) lines.push(`Overtime Rate,${row.label},${row.rate}`);
    for (const row of docRows) lines.push(`Additional Manpower - ${row.name},Total,${row.value}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "manpower-hours.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const refresh = () => {
    setTrendPeriod("Month");
    setHoursPeriod("Month");
    setOvertimePeriod("Month");
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
  };

  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MONITORING • COST • MANPOWER & HOURS</div>
          <div className="repair-title-row">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manpower & Hours</h1>
          </div>
          <p className="text-slate-500">Headcount direct-indirect, jam kerja, dan lembur area Cost.</p>
        </div>
        <div className="repair-actions">
          <CustomSelect value={fiscal} options={["FY2026 - Q1", "FY2026 - Q2", "FY2026 - Q3", "FY2026 - Q4"]} onChange={setFiscal} ariaLabel="Filter periode fiskal" />
          <button className="repair-outline" type="button" onClick={exportCsv}><Download size={14} />Export</button>
          <button className="repair-outline" type="button" onClick={refresh}><RefreshCw size={14} />Refresh</button>
        </div>
      </div>

      <div className="repair-kpis pic-kpis-five">
        {metrics.map((metric) => (
          <PicMetricCard key={metric.id} card={metric} selected={focused === metric.id} onToggle={focusChart} onAskAi={setAiMetric} />
        ))}
      </div>

      <div className="repair-charts">
        <article ref={(node) => { chartRefs.current["trend"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("trend")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Manpower Trend</h2>
              <p className="text-slate-500">headcount • direct vs indirect</p>
            </div>
            <ChartToggle value={trendPeriod} onChange={setTrendPeriod} ariaLabel="Periode manpower trend" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="direct" name="Direct" stroke={EMERALD} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="indirect" name="Indirect" stroke={TEAL} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["hours"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("hours")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Working Hours</h2>
              <p className="text-slate-500">thousand hours • per periode</p>
            </div>
            <ChartToggle value={hoursPeriod} onChange={setHoursPeriod} ariaLabel="Periode working hours" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" name="Working Hours (k)" fill={EMERALD} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["overtime"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("overtime")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Overtime Rate</h2>
              <p className="text-slate-500">% of total hours • vs limit 12%</p>
            </div>
            <ChartToggle value={overtimePeriod} onChange={setOvertimePeriod} ariaLabel="Periode overtime" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overtimeRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} domain={[0, "auto"]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="limit" name="Limit 12%" stroke={AMBER} strokeDasharray="5 5" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="rate" name="Overtime %" stroke={EMERALD} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["docs"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("docs")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Document Additional Manpower</h2>
              <p className="text-slate-500">headcount by type</p>
            </div>
          </div>
          <div className="grid gap-3">
            {docRows.map((row) => (
              <div key={row.name}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 font-medium">{row.name}</span>
                  <b className="text-slate-900 font-semibold">{row.value}</b>
                </div>
                <div className="pic-progress large"><i style={{ width: `${row.value / docMax * 100}%`, background: row.color }} /><span>{row.value}</span></div>
              </div>
            ))}
          </div>
        </article>
      </div>

      {toast && <div className="repair-toast"><span>✓</span>Data berhasil diperbarui</div>}
      {aiMetric && (
        <PicAiInsight
          metricName={aiMetric.name}
          actualLabel={`${aiMetric.display} ${aiMetric.unit}`.trim()}
          targetLabel={aiMetric.targetLabel}
          gapLabel={aiMetric.gap}
          direction={aiMetric.direction}
          onClose={() => setAiMetric(null)}
        />
      )}
    </div>
  );
}
