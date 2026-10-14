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
import ChartTooltip from "@/components/shell/ChartTooltip";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";
import ChartTimeTabs from "@/components/shell/ChartTimeTabs";
import PicMetricCard, { type PicMetricCardData } from "@/features/pic-repair/PicMetricCard";

type BreakdownPeriod = "Daily" | "Week" | "Month" | "Year";

const periodOptions: BreakdownPeriod[] = ["Daily", "Week", "Month", "Year"];

const EMERALD = "#059669";
const TEAL = "#0D9488";
const GRID = "#E2E8F0";

type BreakdownChartKey = "losses" | "trend" | "improvement" | "transfer";

const metrics: PicMetricCardData[] = [
  { id: "total", name: "Total Cost", value: 6.2, display: "¥6.20M", unit: "", target: 6, targetLabel: "¥6.00M", gap: "¥200k", direction: "lower" },
  { id: "losses", name: "Losses Cost", value: 1.3, display: "¥1.30M", unit: "", target: 1.1, targetLabel: "¥1.10M", gap: "¥200k", direction: "lower" },
  { id: "improvement", name: "Project Improvement", value: 1.82, display: "¥1.82M", unit: "", target: 1.5, targetLabel: "¥1.50M", gap: "¥320k", direction: "higher" },
  { id: "transfer", name: "Transfer Cost", value: 670, display: "¥670k", unit: "", target: 700, targetLabel: "¥700k", gap: "¥30k", direction: "lower" },
  { id: "ratio", name: "Direct : Indirect", value: 3.2, display: "3.2 : 1", unit: "", target: 3, targetLabel: "3.0 : 1", gap: "0.2", direction: "higher" },
];

const chartFor: Record<string, BreakdownChartKey> = {
  "total": "trend",
  "losses": "losses",
  "improvement": "improvement",
  "transfer": "transfer",
  "ratio": "trend",
};

const lossesByCategory = [
  { name: "Rework", value: 420 },
  { name: "Scrap", value: 310 },
  { name: "Idle Time", value: 260 },
  { name: "Downtime", value: 180 },
  { name: "Material Loss", value: 150 },
];

const lossesTrend: Record<BreakdownPeriod, { labels: string[]; value: number[] }> = {
  "Daily": { labels: ["1 Oct", "2 Oct", "3 Oct", "4 Oct", "5 Oct", "6 Oct", "7 Oct"], value: [1270, 1275, 1282, 1288, 1292, 1296, 1300] },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], value: [1150, 1170, 1195, 1215, 1235, 1255, 1275, 1300] },
  "Month": { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], value: [980, 1020, 1080, 1150, 1220, 1300] },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], value: [980, 1050, 1140, 1220, 1300] },
};

const improvementRows = [
  { name: "Lean", savings: 520, spend: 310 },
  { name: "Automation", savings: 480, spend: 350 },
  { name: "Energy Project", savings: 320, spend: 180 },
  { name: "Quality", savings: 280, spend: 190 },
  { name: "Logistics", savings: 220, spend: 150 },
];

const transferData: Record<BreakdownPeriod, { name: string; value: number }[]> = {
  "Daily": [{ name: "Inter-line", value: 6 }, { name: "Inter-plant", value: 8 }, { name: "Temp Loan", value: 4 }, { name: "Relocation", value: 3 }, { name: "Other", value: 2 }],
  "Week": [{ name: "Inter-line", value: 42 }, { name: "Inter-plant", value: 56 }, { name: "Temp Loan", value: 28 }, { name: "Relocation", value: 19 }, { name: "Other", value: 12 }],
  "Month": [{ name: "Inter-line", value: 180 }, { name: "Inter-plant", value: 240 }, { name: "Temp Loan", value: 120 }, { name: "Relocation", value: 80 }, { name: "Other", value: 50 }],
  "Year": [{ name: "Inter-line", value: 2160 }, { name: "Inter-plant", value: 2880 }, { name: "Temp Loan", value: 1440 }, { name: "Relocation", value: 960 }, { name: "Other", value: 600 }],
};

type ComponentStatus = "Stable" | "Over Limit" | "Watch" | "Optimized";

const componentRows: { component: string; amount: string; share: string; mom: string; status: ComponentStatus }[] = [
  { component: "Direct Labor", amount: "¥1.15M", share: "46.0%", mom: "+1.2%", status: "Stable" },
  { component: "Indirect Labor", amount: "¥0.55M", share: "22.0%", mom: "+0.8%", status: "Stable" },
  { component: "Overtime", amount: "¥0.30M", share: "12.0%", mom: "+6.5%", status: "Over Limit" },
  { component: "Losses", amount: "¥0.22M", share: "9.0%", mom: "+8.5%", status: "Watch" },
  { component: "Transfer", amount: "¥0.18M", share: "6.3%", mom: "-2.1%", status: "Optimized" },
  { component: "Project Improvement", amount: "¥0.12M", share: "4.7%", mom: "-3.0%", status: "Optimized" },
];

function statusClass(status: ComponentStatus): string {
  if (status === "Stable") return "bg-slate-100 text-slate-600 border border-slate-200";
  if (status === "Over Limit") return "bg-rose-50 text-rose-700 border border-rose-200";
  if (status === "Watch") return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-emerald-50 text-emerald-700 border border-emerald-200";
}



export default function CostBreakdown() {
  const [fiscal, setFiscal] = useState("FY2026 - Q1");
  const [trendPeriod, setTrendPeriod] = useState<BreakdownPeriod>("Week");
  const [transferPeriod, setTransferPeriod] = useState<BreakdownPeriod>("Week");
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

  const trend = lossesTrend[trendPeriod];
  const trendRows = useMemo(() => trend.labels.map((label, index) => ({ label, value: trend.value[index] })), [trend]);
  const transferRows = transferData[transferPeriod];

  const exportCsv = () => {
    const lines = ["metric,period,value"];
    for (const row of lossesByCategory) lines.push(`Losses - ${row.name},Total,${row.value}`);
    for (const row of trendRows) lines.push(`Losses Trend,${row.label},${row.value}`);
    for (const row of improvementRows) lines.push(`Improvement - ${row.name} Savings,,${row.savings}`, `Improvement - ${row.name} Spend,,${row.spend}`);
    for (const row of transferRows) lines.push(`Transfer - ${row.name},${transferPeriod},${row.value}`);
    for (const row of componentRows) lines.push(`Component - ${row.component},,${row.amount} (${row.share})`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cost-breakdown.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const refresh = () => {
    setTrendPeriod("Week");
    setTransferPeriod("Week");
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
  };

  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MONITORING • COST • BREAKDOWN</div>
          <div className="repair-title-row">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cost Breakdown</h1>
          </div>
          <p className="text-slate-500">Rincian losses, improvement, transfer, dan komponen biaya area Cost.</p>
        </div>
        <div className="repair-actions">
          <CustomSelect value={fiscal} options={["FY2026 - Q1", "FY2026 - Q2", "FY2026 - Q3", "FY2026 - Q4"]} onChange={setFiscal} ariaLabel="Filter fiscal period" />
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
        <article ref={(node) => { chartRefs.current["losses"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("losses")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Losses Cost</h2>
              <p className="text-slate-500">¥ thousand • by category</p>
            </div>
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lossesByCategory} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="value" name="Losses (¥k)" fill={EMERALD} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["trend"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("trend")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Losses Cost Trend</h2>
              <p className="text-slate-500">¥ thousand • per period</p>
            </div>
            <ChartTimeTabs activeTab={trendPeriod} onChange={setTrendPeriod} ariaLabel="Losses trend period" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="value" name="Losses (¥k)" stroke={EMERALD} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["improvement"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("improvement")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Project Improvement Cost</h2>
              <p className="text-slate-500">Savings vs Spend (¥ k) • per proyek</p>
            </div>
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={improvementRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="savings" name="Savings (¥k)" fill={EMERALD} radius={[6, 6, 0, 0]} maxBarSize={22} />
                <Bar dataKey="spend" name="Spend (¥k)" fill={TEAL} radius={[6, 6, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["transfer"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("transfer")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Transfer Cost</h2>
              <p className="text-slate-500">¥ thousand • by type</p>
            </div>
            <ChartTimeTabs activeTab={transferPeriod} onChange={setTransferPeriod} ariaLabel="Transfer period" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transferRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="value" name="Transfer (¥k)" fill={EMERALD} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60">
        <div className="repair-card-head">
          <div>
            <h2 className="text-slate-900 font-semibold">Cost Component Detail</h2>
            <p className="text-slate-500">Rincian komponen, porsi, dan status pengendalian</p>
          </div>
        </div>
        <div className="repair-table-scroll">
          <table className="repair-data-table pic-table">
            <thead>
              <tr><th>Component</th><th>Amount</th><th>Share</th><th>MoM</th><th>Status</th></tr>
            </thead>
            <tbody>
              {componentRows.map((row) => (
                <tr key={row.component}>
                  <td><strong>{row.component}</strong></td>
                  <td>{row.amount}</td>
                  <td>{row.share}</td>
                  <td>{row.mom}</td>
                  <td><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusClass(row.status)}`}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

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
