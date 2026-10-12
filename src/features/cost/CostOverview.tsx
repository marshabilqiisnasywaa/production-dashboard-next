"use client";
import { useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
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
import { Sparkles } from "lucide-react";
import CustomSelect from "@/components/shell/CustomSelect";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";
import type { Direction } from "@/features/repair/RepairDashboard";

type CostPeriod = "Harian" | "Mingguan" | "Bulanan" | "Tahunan";

const periodOptions: CostPeriod[] = ["Harian", "Mingguan", "Bulanan", "Tahunan"];

const EMERALD = "#059669";
const EMERALD_LIGHT = "#10B981";
const TEAL = "#0D9488";
const SLATE = "#64748B";
const AMBER = "#F59E0B";
const ROSE = "#E11D48";
const GRID = "#E2E8F0";

type CostOverviewMetric = {
  id: string;
  label: string;
  value: string;
  target: string;
  delta: string;
  onTarget: boolean;
  direction: Direction;
  chart: "trend" | "structure" | "manpower" | "overtime";
  spark: number[];
};

const metrics: CostOverviewMetric[] = [
  { id: "slc", label: "SLC (per unit)", value: "¥2.85", target: "¥3.00", delta: "-0.15", onTarget: true, direction: "lower", chart: "trend", spark: [3.0, 2.97, 2.95, 2.92, 2.9, 2.87, 2.85] },
  { id: "ope", label: "OPE Productivity", value: "78.5%", target: "80.00%", delta: "-1.5", onTarget: false, direction: "higher", chart: "manpower", spark: [80.2, 79.8, 79.5, 79.2, 79.0, 78.7, 78.5] },
  { id: "upph", label: "UPPH", value: "42.6 pcs/h", target: "40.0 pcs/h", delta: "+2.6", onTarget: true, direction: "higher", chart: "manpower", spark: [40.1, 40.5, 40.9, 41.4, 41.8, 42.2, 42.6] },
  { id: "ratio", label: "Direct : Indirect", value: "3.2 : 1", target: "3.0 : 1", delta: "+0.2", onTarget: true, direction: "higher", chart: "structure", spark: [2.9, 3.0, 3.0, 3.1, 3.1, 3.2, 3.2] },
  { id: "intern", label: "Internship Rate", value: "18.5%", target: "15.00%", delta: "+3.5", onTarget: false, direction: "lower", chart: "overtime", spark: [15.2, 15.8, 16.3, 16.9, 17.4, 18.0, 18.5] },
];

const slcTrend: Record<CostPeriod, { labels: string[]; actual: number[]; target: number }> = {
  "Harian": { labels: ["1 Okt", "2 Okt", "3 Okt", "4 Okt", "5 Okt", "6 Okt", "7 Okt"], actual: [2.91, 2.9, 2.89, 2.88, 2.87, 2.86, 2.85], target: 2.9 },
  "Mingguan": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], actual: [2.98, 2.96, 2.94, 2.93, 2.91, 2.89, 2.87, 2.85], target: 2.9 },
  "Bulanan": { labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], actual: [3.12, 3.08, 3.05, 3.02, 2.99, 2.97, 2.94, 2.92, 2.9, 2.88, 2.86, 2.85], target: 2.9 },
  "Tahunan": { labels: ["2022", "2023", "2024", "2025", "2026"], actual: [3.42, 3.28, 3.1, 2.96, 2.85], target: 2.9 },
};

const costStructure = [
  { name: "Direct Labor", value: 58, color: EMERALD },
  { name: "Indirect Labor", value: 18, color: TEAL },
  { name: "Overtime", value: 12, color: AMBER },
  { name: "Others", value: 12, color: SLATE },
];

const manpowerBase: Record<CostPeriod, { labels: string[]; manpower: number[]; hours: number[] }> = {
  "Harian": { labels: ["1 Okt", "2 Okt", "3 Okt", "4 Okt", "5 Okt", "6 Okt", "7 Okt"], manpower: [288, 291, 289, 292, 290, 287, 286], hours: [7.5, 7.6, 7.5, 7.6, 7.5, 7.4, 7.2] },
  "Mingguan": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], manpower: [294, 292, 291, 290, 289, 288, 287, 286], hours: [7.6, 7.6, 7.5, 7.5, 7.4, 7.4, 7.3, 7.2] },
  "Bulanan": { labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], manpower: [298, 296, 295, 293, 292, 291, 290, 289, 288, 287, 287, 286], hours: [7.7, 7.7, 7.6, 7.6, 7.5, 7.5, 7.4, 7.4, 7.3, 7.3, 7.2, 7.2] },
  "Tahunan": { labels: ["2022", "2023", "2024", "2025", "2026"], manpower: [312, 305, 296, 290, 286], hours: [7.9, 7.8, 7.6, 7.4, 7.2] },
};

const shiftScale: Record<string, number> = { "Semua Shift": 1, "Shift 1": 0.42, "Shift 2": 0.38, "Shift 3": 0.2 };

const overtimeBase: Record<CostPeriod, { labels: string[]; rate: number[] }> = {
  "Harian": { labels: ["1 Okt", "2 Okt", "3 Okt", "4 Okt", "5 Okt", "6 Okt", "7 Okt"], rate: [3.1, 2.9, 3.0, 2.8, 2.7, 2.6, 2.5] },
  "Mingguan": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], rate: [4.2, 4.0, 3.8, 3.5, 3.2, 3.0, 2.7, 2.5] },
  "Bulanan": { labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], rate: [4.8, 4.5, 4.3, 4.1, 3.9, 3.7, 3.5, 3.3, 3.1, 2.9, 2.7, 2.5] },
  "Tahunan": { labels: ["2022", "2023", "2024", "2025", "2026"], rate: [6.4, 5.6, 4.4, 3.2, 2.5] },
};

const areaScale: Record<string, number> = { "Semua Area": 1, "Pabrik": 1.1, "Instalasi": 0.85, "Packing": 1.25 };

function ChartToggle({ value, onChange, ariaLabel }: { value: CostPeriod; onChange: (next: CostPeriod) => void; ariaLabel: string }) {
  return (
    <div className="sq-period" role="group" aria-label={ariaLabel}>
      {periodOptions.map((option) => (
        <button key={option} type="button" aria-pressed={value === option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>{option}</button>
      ))}
    </div>
  );
}

function badgeClass(onTarget: boolean): string {
  return onTarget
    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
    : "bg-rose-50 text-rose-700 border border-rose-200";
}

function CostSparkline({ id, values, positive }: { id: string; values: number[]; positive: boolean }) {
  const color = positive ? EMERALD : ROSE;
  const data = values.map((value, index) => ({ index, value }));
  return (
    <div className="w-24 h-9 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`cost-spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#cost-spark-${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function CostOverview() {
  const [period, setPeriod] = useState<CostPeriod>("Bulanan");
  const [trendPeriod, setTrendPeriod] = useState<CostPeriod>("Bulanan");
  const [manpowerPeriod, setManpowerPeriod] = useState<CostPeriod>("Bulanan");
  const [overtimePeriod, setOvertimePeriod] = useState<CostPeriod>("Bulanan");
  const [shift, setShift] = useState("Semua Shift");
  const [area, setArea] = useState("Semua Area");
  const [focused, setFocused] = useState<string | null>(null);
  const [aiMetric, setAiMetric] = useState<CostOverviewMetric | null>(null);
  const chartRefs = useRef<Record<string, HTMLElement | null>>({});

  const focusChart = (metric: CostOverviewMetric) => {
    if (focused === metric.id) {
      setFocused(null);
      return;
    }
    setFocused(metric.id);
    chartRefs.current[metric.chart]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const chartRing = (key: string): string => (focused && metrics.find((metric) => metric.id === focused)?.chart === key ? " ring-2 ring-emerald-500" : "");

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
          <CustomSelect value={period} options={periodOptions} onChange={(next) => applyGlobalPeriod(next as CostPeriod)} ariaLabel="Filter periode" />
          <CustomSelect value={shift} options={Object.keys(shiftScale)} onChange={setShift} ariaLabel="Filter shift" />
          <CustomSelect value={area} options={Object.keys(areaScale)} onChange={setArea} ariaLabel="Filter area" />
        </div>
      </div>

      <div className="repair-kpis pic-kpis-five">
        {metrics.map((metric) => (
          <article key={metric.id} className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 text-xs font-medium">{metric.label}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClass(metric.onTarget)}`}>{metric.onTarget ? "On Target" : "Off Target"}</span>
            </div>
            <strong className="block mt-2 text-slate-900 text-2xl font-bold tracking-tight">{metric.value}</strong>
            <p className="mt-1 text-slate-500 text-xs">Target: {metric.target} <b className={metric.onTarget ? "text-emerald-600" : "text-rose-600"}>({metric.delta})</b></p>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => focusChart(metric)} className="text-[11px] font-medium text-slate-700 bg-white/60 border border-slate-200 hover:bg-white px-3 py-1 rounded-full transition-all">{focused === metric.id ? "Tutup Tren" : "Lihat Tren"}</button>
                {!metric.onTarget && (
                  <button type="button" onClick={() => setAiMetric(metric)} className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50/80 border border-emerald-200 hover:bg-emerald-50 px-3 py-1 rounded-full transition-all"><Sparkles size={12} />Tanya AI</button>
                )}
              </div>
              <CostSparkline id={metric.id} values={metric.spark} positive={metric.onTarget} />
            </div>
          </article>
        ))}
      </div>

      <div className="repair-charts">
        <article ref={(node) => { chartRefs.current["trend"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("trend")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">SLC Trend</h2>
              <p className="text-slate-500">12 months • ¥ per unit vs target</p>
            </div>
            <ChartToggle value={trendPeriod} onChange={setTrendPeriod} ariaLabel="Periode tren SLC" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="target" name="Target" stroke={SLATE} strokeDasharray="5 5" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="actual" name="SLC Aktual" stroke={EMERALD} strokeWidth={2} dot={{ r: 3, stroke: EMERALD_LIGHT }} />
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
                    <Tooltip />
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
              <p className="text-slate-500">{shift} • headcount vs jam kerja</p>
            </div>
            <ChartToggle value={manpowerPeriod} onChange={setManpowerPeriod} ariaLabel="Periode manpower" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={manpowerData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} width={36} tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip />
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
              <p className="text-slate-500">{area} • % lembur per periode</p>
            </div>
            <ChartToggle value={overtimePeriod} onChange={setOvertimePeriod} ariaLabel="Periode overtime" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overtimeData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="rate" name="Overtime %" fill={EMERALD} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
      {aiMetric && (
        <PicAiInsight
          metricName={aiMetric.label}
          actualLabel={aiMetric.value}
          targetLabel={aiMetric.target}
          gapLabel={aiMetric.delta}
          direction={aiMetric.direction}
          onClose={() => setAiMetric(null)}
        />
      )}
    </div>
  );
}
