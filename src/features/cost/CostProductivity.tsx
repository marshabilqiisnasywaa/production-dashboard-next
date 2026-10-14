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

type ProductivityPeriod = "Daily" | "Week" | "Month" | "Year";

const periodOptions: ProductivityPeriod[] = ["Daily", "Week", "Month", "Year"];

const EMERALD = "#059669";
const SLATE = "#64748B";
const AMBER = "#F59E0B";
const GRID = "#E2E8F0";

const opeData: Record<ProductivityPeriod, { labels: string[]; actual: number[]; target: number }> = {
  "Daily": { labels: ["1 Oct", "2 Oct", "3 Oct", "4 Oct", "5 Oct", "6 Oct", "7 Oct"], actual: [78.0, 78.1, 78.2, 78.3, 78.3, 78.4, 78.5], target: 80 },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], actual: [77.4, 77.6, 77.8, 78.0, 78.1, 78.2, 78.4, 78.5], target: 80 },
  "Month": { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], actual: [76.8, 77.2, 77.9, 78.1, 78.3, 78.5], target: 80 },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], actual: [74.2, 75.6, 76.9, 77.8, 78.5], target: 80 },
};

const upphData: Record<ProductivityPeriod, { labels: string[]; actual: number[]; target: number }> = {
  "Daily": { labels: ["1 Oct", "2 Oct", "3 Oct", "4 Oct", "5 Oct", "6 Oct", "7 Oct"], actual: [42.1, 42.2, 42.3, 42.4, 42.5, 42.5, 42.6], target: 40 },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], actual: [41.2, 41.4, 41.7, 41.9, 42.1, 42.3, 42.5, 42.6], target: 40 },
  "Month": { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], actual: [40.2, 40.8, 41.1, 41.7, 42.1, 42.6], target: 40 },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], actual: [36.4, 38.1, 39.6, 41.2, 42.6], target: 40 },
};

const ratioData: Record<ProductivityPeriod, { labels: string[]; ratio: number[] }> = {
  "Daily": { labels: ["1 Oct", "2 Oct", "3 Oct", "4 Oct", "5 Oct", "6 Oct", "7 Oct"], ratio: [3.1, 3.1, 3.2, 3.2, 3.2, 3.2, 3.2] },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], ratio: [3.0, 3.0, 3.1, 3.1, 3.1, 3.2, 3.2, 3.2] },
  "Month": { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], ratio: [2.9, 3.0, 3.0, 3.1, 3.1, 3.2] },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], ratio: [2.7, 2.8, 3.0, 3.1, 3.2] },
};

const internshipData: Record<ProductivityPeriod, { labels: string[]; rate: number[]; cap: number }> = {
  "Daily": { labels: ["1 Oct", "2 Oct", "3 Oct", "4 Oct", "5 Oct", "6 Oct", "7 Oct"], rate: [18.1, 18.2, 18.2, 18.3, 18.4, 18.4, 18.5], cap: 20 },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], rate: [17.2, 17.4, 17.6, 17.9, 18.1, 18.2, 18.4, 18.5], cap: 20 },
  "Month": { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], rate: [15.4, 16.0, 16.8, 17.3, 17.9, 18.5], cap: 20 },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], rate: [12.5, 14.1, 15.8, 17.2, 18.5], cap: 20 },
};

type ProductivityChartKey = "ope" | "upph" | "ratio" | "intern";

const metrics: PicMetricCardData[] = [
  { id: "ope", name: "OPE Productivity", value: 78.5, display: "78.5", unit: "%", target: 80, targetLabel: "80.00%", gap: "1.5", direction: "higher" },
  { id: "upph", name: "UPPH", value: 42.6, display: "42.6", unit: "pcs/h", target: 40, targetLabel: "40.0 pcs/h", gap: "2.6", direction: "higher" },
  { id: "ratio", name: "Direct : Indirect", value: 3.2, display: "3.2 : 1", unit: "", target: 3, targetLabel: "3.0 : 1", gap: "0.2", direction: "higher" },
  { id: "intern", name: "Internship Rate", value: 18.5, display: "18.5", unit: "%", target: 15, targetLabel: "15.00%", gap: "3.5", direction: "lower" },
];

const chartFor: Record<string, ProductivityChartKey> = {
  "ope": "ope",
  "upph": "upph",
  "ratio": "ratio",
  "intern": "intern",
};



export default function CostProductivity() {
  const [fiscal, setFiscal] = useState("FY2026 - Q1");
  const [opePeriod, setOpePeriod] = useState<ProductivityPeriod>("Week");
  const [upphPeriod, setUpphPeriod] = useState<ProductivityPeriod>("Week");
  const [ratioPeriod, setRatioPeriod] = useState<ProductivityPeriod>("Week");
  const [internPeriod, setInternPeriod] = useState<ProductivityPeriod>("Week");
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

  const ope = opeData[opePeriod];
  const opeRows = useMemo(() => ope.labels.map((label, index) => ({ label, actual: ope.actual[index], target: ope.target })), [ope]);
  const upph = upphData[upphPeriod];
  const upphRows = useMemo(() => upph.labels.map((label, index) => ({ label, actual: upph.actual[index], target: upph.target })), [upph]);
  const ratio = ratioData[ratioPeriod];
  const ratioRows = useMemo(() => ratio.labels.map((label, index) => ({ label, ratio: ratio.ratio[index] })), [ratio]);
  const intern = internshipData[internPeriod];
  const internRows = useMemo(() => intern.labels.map((label, index) => ({ label, rate: intern.rate[index], cap: intern.cap })), [intern]);

  const exportCsv = () => {
    const lines = ["metric,period,value,target"];
    for (const row of opeRows) lines.push(`OPE Productivity,${row.label},${row.actual},${row.target}`);
    for (const row of upphRows) lines.push(`UPPH,${row.label},${row.actual},${row.target}`);
    for (const row of ratioRows) lines.push(`Direct Indirect Ratio,${row.label},${row.ratio},`);
    for (const row of internRows) lines.push(`Internship Rate,${row.label},${row.rate},${row.cap}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "productivity-metrics.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const refresh = () => {
    setOpePeriod("Week");
    setUpphPeriod("Week");
    setRatioPeriod("Week");
    setInternPeriod("Week");
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
  };

  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MONITORING • COST • PRODUCTIVITY</div>
          <div className="repair-title-row">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Productivity Metrics</h1>
          </div>
          <p className="text-slate-500">OPE, UPPH, rasio direct-indirect, dan internship rate area Cost.</p>
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
        <article ref={(node) => { chartRefs.current["ope"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("ope")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">OPE Productivity</h2>
              <p className="text-slate-500">% • actual vs target</p>
            </div>
            <ChartTimeTabs activeTab={opePeriod} onChange={setOpePeriod} ariaLabel="OPE period" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={opeRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="target" name="Target" stroke={SLATE} strokeDasharray="5 5" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="actual" name="OPE Actual" stroke={EMERALD} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["upph"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("upph")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">UPPH</h2>
              <p className="text-slate-500">units / person-hour • actual vs target</p>
            </div>
            <ChartTimeTabs activeTab={upphPeriod} onChange={setUpphPeriod} ariaLabel="UPPH period" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={upphRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="target" name="Target" stroke={SLATE} strokeDasharray="5 5" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="actual" name="UPPH Actual" stroke={EMERALD} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["ratio"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("ratio")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Direct to Indirect Ratio</h2>
              <p className="text-slate-500">Ratio (D:I) • monthly</p>
            </div>
            <ChartTimeTabs activeTab={ratioPeriod} onChange={setRatioPeriod} ariaLabel="Ratio period" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratioRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} domain={[0, 4]} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="ratio" name="Direct : Indirect" fill={EMERALD} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["intern"] = node; }} className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60${chartRing("intern")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Internship Rate</h2>
              <p className="text-slate-500">% of workforce • vs cap 20%</p>
            </div>
            <ChartTimeTabs activeTab={internPeriod} onChange={setInternPeriod} ariaLabel="Internship period" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={internRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} domain={[0, 25]} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="cap" name="Cap 20%" stroke={AMBER} strokeDasharray="5 5" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="rate" name="Internship %" stroke={EMERALD} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
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
