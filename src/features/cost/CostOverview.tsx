"use client";
import { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import CustomSelect from "@/components/shell/CustomSelect";
import ChartTooltip from "@/components/shell/ChartTooltip";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";
import ChartTimeTabs from "@/components/shell/ChartTimeTabs";
import PicMetricCard, { type PicMetricCardData } from "@/features/pic-repair/PicMetricCard";

type CostPeriod = "Daily" | "Week" | "Month" | "Year";

const periodOptions: CostPeriod[] = ["Daily", "Week", "Month", "Year"];

const EMERALD = "#059669";
const EMERALD_LIGHT = "#10B981";
const TEAL = "#0D9488";
const SLATE = "#64748B";
const AMBER = "#F59E0B";
const GRID = "#E2E8F0";

type CostChartKey = "trend" | "structure" | "manpower" | "overtime";

const metrics: PicMetricCardData[] = [
  { id: "slc", name: "SLC (per unit)", value: 2.85, display: "¥2.85", unit: "", target: 3, targetLabel: "¥3.00", gap: "0.15", direction: "lower", subtext: "YoY -4.2% · ¥/unit" },
  { id: "ope", name: "OPE Productivity", value: 78.5, display: "78.5", unit: "%", target: 77, targetLabel: "77.0%", gap: "1.5", direction: "higher", subtext: "MoM +1.6pp" },
  { id: "upph", name: "UPPH", value: 42.6, display: "42.6", unit: "", target: 40, targetLabel: "40.0", gap: "2.6", direction: "higher", subtext: "MoM +2.3 · units/p-h" },
  { id: "ratio", name: "Direct : Indirect", value: 3.2, display: "3.2 : 1", unit: "", target: 3, targetLabel: "3.0 : 1", gap: "0.2", direction: "higher", subtext: "Target 3.0:1" },
  { id: "intern", name: "Internship Rate", value: 18.5, display: "18.5", unit: "%", target: 15, targetLabel: "15.00%", gap: "3.5", direction: "lower", subtext: "Cap 20% · watch" },
];

const chartFor: Record<string, CostChartKey> = {
  "slc": "trend",
  "ope": "manpower",
  "upph": "manpower",
  "ratio": "structure",
  "intern": "overtime",
};

const slcTrend: Record<CostPeriod, { labels: string[]; actual: number[]; target: number }> = {
  "Daily": { labels: ["1 Oct", "2 Oct", "3 Oct", "4 Oct", "5 Oct", "6 Oct", "7 Oct"], actual: [2.91, 2.9, 2.89, 2.88, 2.87, 2.86, 2.85], target: 2.9 },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], actual: [2.98, 2.96, 2.94, 2.93, 2.91, 2.89, 2.87, 2.85], target: 2.9 },
  "Month": { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], actual: [3.12, 3.08, 3.05, 3.02, 2.99, 2.97, 2.94, 2.92, 2.9, 2.88, 2.86, 2.85], target: 2.9 },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], actual: [3.42, 3.28, 3.1, 2.96, 2.85], target: 2.9 },
};

const costStructure = [
  { name: "Direct Labor", value: 58, color: EMERALD },
  { name: "Indirect Labor", value: 18, color: TEAL },
  { name: "Overtime", value: 12, color: AMBER },
  { name: "Others", value: 12, color: SLATE },
];

const manpowerBase: Record<CostPeriod, { labels: string[]; manpower: number[]; hours: number[] }> = {
  "Daily": { labels: ["1 Oct", "2 Oct", "3 Oct", "4 Oct", "5 Oct", "6 Oct", "7 Oct"], manpower: [288, 291, 289, 292, 290, 287, 286], hours: [7.5, 7.6, 7.5, 7.6, 7.5, 7.4, 7.2] },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], manpower: [294, 292, 291, 290, 289, 288, 287, 286], hours: [7.6, 7.6, 7.5, 7.5, 7.4, 7.4, 7.3, 7.2] },
  "Month": { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], manpower: [298, 296, 295, 293, 292, 291, 290, 289, 288, 287, 287, 286], hours: [7.7, 7.7, 7.6, 7.6, 7.5, 7.5, 7.4, 7.4, 7.3, 7.3, 7.2, 7.2] },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], manpower: [312, 305, 296, 290, 286], hours: [7.9, 7.8, 7.6, 7.4, 7.2] },
};

const shiftScale: Record<string, number> = { "Semua Shift": 1, "Shift 1": 0.42, "Shift 2": 0.38, "Shift 3": 0.2 };

const overtimeBase: Record<CostPeriod, { labels: string[]; rate: number[] }> = {
  "Daily": { labels: ["1 Oct", "2 Oct", "3 Oct", "4 Oct", "5 Oct", "6 Oct", "7 Oct"], rate: [3.1, 2.9, 3.0, 2.8, 2.7, 2.6, 2.5] },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], rate: [4.2, 4.0, 3.8, 3.5, 3.2, 3.0, 2.7, 2.5] },
  "Month": { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], rate: [4.8, 4.5, 4.3, 4.1, 3.9, 3.7, 3.5, 3.3, 3.1, 2.9, 2.7, 2.5] },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], rate: [6.4, 5.6, 4.4, 3.2, 2.5] },
};

const areaScale: Record<string, number> = { "Semua Area": 1, "Pabrik": 1.1, "Instalasi": 0.85, "Packing": 1.25 };



export default function CostOverview() {
  const [period, setPeriod] = useState<CostPeriod>("Week");
  const [trendPeriod, setTrendPeriod] = useState<CostPeriod>("Week");
  const [manpowerPeriod, setManpowerPeriod] = useState<CostPeriod>("Week");
  const [overtimePeriod, setOvertimePeriod] = useState<CostPeriod>("Week");
  const [shift, setShift] = useState("Semua Shift");
  const [area, setArea] = useState("Semua Area");
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

  const trend = slcTrend[trendPeriod];
  const trendData = useMemo(() => trend.labels.map((label, index) => ({ label, actual: trend.actual[index], target: trend.target })), [trend]);

  const manpower = manpowerBase[manpowerPeriod];
  const manpowerData = useMemo(() => {
    const scale = shiftScale[shift] ?? 1;
    return manpower.labels.map((label, index) => ({ label, manpower: Math.round(manpower.manpower[index] * scale), hours: manpower.hours[index] }));
  }, [manpower, shift]);

  const overtime = overtimeBase[overtimePeriod];
  const overtimeData = useMemo(() => {
    const scale = areaScale[area] ?? 1;
    return overtime.labels.map((label, index) => ({ label, rate: Number((overtime.rate[index] * scale).toFixed(1)) }));
  }, [overtime, area]);

  const applyGlobalPeriod = (next: CostPeriod) => {
    setPeriod(next);
    setTrendPeriod(next);
    setManpowerPeriod(next);
    setOvertimePeriod(next);
  };

  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MONITORING • COST • OVERVIEW</div>
          <div className="repair-title-row">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Single Labor Cost Overview</h1>
          </div>
          <p className="text-slate-500">Ringkasan biaya tenaga kerja langsung dan produktivitas area Cost.</p>
        </div>
        <div className="repair-actions">
          <CustomSelect value={period} options={periodOptions} onChange={(next) => applyGlobalPeriod(next as CostPeriod)} ariaLabel="Filter period" />
          <CustomSelect value={shift} options={Object.keys(shiftScale)} onChange={setShift} ariaLabel="Filter shift" />
          <CustomSelect value={area} options={Object.keys(areaScale)} onChange={setArea} ariaLabel="Filter area" />
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
              <h2 className="text-slate-900 font-semibold">SLC Trend</h2>
              <p className="text-slate-500">12 months • ¥ per unit vs target</p>
            </div>
            <ChartTimeTabs activeTab={trendPeriod} onChange={setTrendPeriod} ariaLabel="SLC trend period" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={52} tick={{ fontSize: 11 }} domain={[2.5, 3.5]} tickFormatter={(value) => `¥${Number(value).toFixed(2)}`} />
                <Tooltip content={<ChartTooltip format={(value) => `¥${Number(value).toFixed(2)}`} />} />
                <Legend />
                <Line type="monotone" dataKey="target" name="Target" stroke={SLATE} strokeDasharray="5 5" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="actual" name="SLC Actual" stroke={EMERALD} strokeWidth={2} dot={{ r: 3, stroke: EMERALD_LIGHT }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["structure"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("structure")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">SLC Cost Structure</h2>
              <p className="text-slate-500">by component</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <div className="warranty-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={costStructure} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} strokeWidth={2}>
                      {costStructure.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <strong className="block text-slate-900 text-xl font-semibold">¥2.85</strong>
                  <small className="text-slate-500 text-xs">SLC / unit</small>
                </div>
              </div>
            </div>
            <ul className="w-full sm:w-44 grid gap-2">
              {costStructure.map((entry) => (
                <li key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-2 text-slate-500"><i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />{entry.name}</span>
                  <b className="text-slate-900 font-semibold">{entry.value}%</b>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["manpower"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("manpower")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Manpower vs Working Hours</h2>
              <p className="text-slate-500">{shift} • headcount vs working hours</p>
            </div>
            <ChartTimeTabs activeTab={manpowerPeriod} onChange={setManpowerPeriod} ariaLabel="Manpower period" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={manpowerData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} width={36} tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="manpower" name="Manpower" stroke={EMERALD} strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="hours" name="Working Hours" stroke={TEAL} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["overtime"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("overtime")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Overtime Rate</h2>
              <p className="text-slate-500">{area} • % overtime per period</p>
            </div>
            <ChartTimeTabs activeTab={overtimePeriod} onChange={setOvertimePeriod} ariaLabel="Overtime period" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overtimeData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="rate" name="Overtime %" fill={EMERALD} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
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
