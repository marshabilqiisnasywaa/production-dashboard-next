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
import { Download, RefreshCw } from "lucide-react";
import CustomSelect from "@/components/shell/CustomSelect";
import ChartTooltip from "@/components/shell/ChartTooltip";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";
import ChartTimeTabs from "@/components/shell/ChartTimeTabs";
import PicMetricCard, { type PicMetricCardData } from "@/features/pic-repair/PicMetricCard";
import { DataTable } from "@/features/cost/shared";

type FinishGoodPeriod = "Daily" | "Week" | "Month" | "Year";

const periodOptions: FinishGoodPeriod[] = ["Daily", "Week", "Month", "Year"];

const EMERALD = "#059669";
const TEAL = "#0D9488";
const AMBER = "#F59E0B";
const GRID = "#E2E8F0";

type FinishGoodChartKey = "trend" | "brand" | "line" | "models";

const metrics: PicMetricCardData[] = [
  { id: "total", name: "Total Finishgood", value: 43612, display: "43,612", unit: "units", target: 40000, targetLabel: "40,000 units", gap: "8.4%", direction: "higher" },
  { id: "oppo", name: "OPPO Units", value: 21368, display: "21,368", unit: "units", target: 20000, targetLabel: "20,000 (49% share)", gap: "1,368", direction: "higher" },
  { id: "realme", name: "REALME Units", value: 22244, display: "22,244", unit: "units", target: 20000, targetLabel: "20,000 (51% share)", gap: "2,244", direction: "higher" },
  { id: "wo", name: "Work Orders", value: 43821, display: "43,821", unit: "", target: 43821, targetLabel: "", gap: "", direction: "higher" },
  { id: "lines", name: "Active Lines", value: 7, display: "7", unit: "Lines", target: 7, targetLabel: "", gap: "", direction: "higher" },
];

const cardSubtext: Record<string, string> = {
  "wo": "RMMN 99.5% / UMMN 0.5%",
  "lines": "PS01 - PS07",
};

const chartFor: Record<string, FinishGoodChartKey> = {
  "total": "trend",
  "oppo": "brand",
  "realme": "brand",
  "wo": "line",
  "lines": "line",
};

const trendData: Record<FinishGoodPeriod, { labels: string[]; value: number[] }> = {
  "Daily": { labels: ["1 Oct", "2 Oct", "3 Oct", "4 Oct", "5 Oct", "6 Oct", "7 Oct"], value: [40100, 40800, 41400, 42100, 42800, 43200, 43612] },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], value: [35200, 36400, 37600, 38900, 40200, 41500, 42600, 43612] },
  "Month": { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], value: [21200, 24500, 28900, 33400, 39100, 43612] },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], value: [18200, 24800, 31500, 38900, 43612] },
};

const brandShare = [
  { name: "OPPO", value: 21368, color: EMERALD },
  { name: "REALME", value: 22244, color: TEAL },
];

const lineData: Record<FinishGoodPeriod, { line: string; rmmn: number; ummn: number }[]> = {
  "Daily": ["PS01", "PS02", "PS03", "PS04", "PS05", "PS06", "PS07"].map((line, index) => ({ line, rmmn: [880, 860, 900, 850, 890, 870, 860][index], ummn: [7, 6, 8, 5, 6, 5, 5][index] })),
  "Week": ["PS01", "PS02", "PS03", "PS04", "PS05", "PS06", "PS07"].map((line, index) => ({ line, rmmn: [5900, 5850, 6010, 5790, 5940, 5820, 5780][index], ummn: [42, 38, 48, 33, 40, 36, 34][index] })),
  "Month": ["PS01", "PS02", "PS03", "PS04", "PS05", "PS06", "PS07"].map((line, index) => ({ line, rmmn: [6100, 6050, 6200, 6000, 6150, 5980, 5920][index], ummn: [45, 38, 52, 30, 41, 35, 32][index] })),
  "Year": ["PS01", "PS02", "PS03", "PS04", "PS05", "PS06", "PS07"].map((line, index) => ({ line, rmmn: [52000, 51500, 53000, 51000, 52500, 51200, 50800][index], ummn: [390, 340, 430, 310, 370, 330, 300][index] })),
};

const topModels = [
  { name: "CPH2895", value: 9500 },
  { name: "RMX5377", value: 8900 },
  { name: "CPH2817", value: 8200 },
  { name: "RMX5299", value: 7600 },
  { name: "CPH2901", value: 6900 },
  { name: "RMX5410", value: 6400 },
  { name: "CPH2877", value: 5900 },
  { name: "RMX5355", value: 5400 },
  { name: "CPH2833", value: 4900 },
  { name: "RMX5311", value: 4500 },
];

const topMax = Math.max(...topModels.map((row) => row.value));

type FinishGoodRow = {
  id: string;
  date: string;
  dept: string;
  material: string;
  model: string;
  woType: string;
  orderNo: string;
  brand: string;
  quantity: number;
};

const tableModels = ["CPH2895", "RMX5377", "CPH2817", "RMX5299", "CPH2901", "RMX5410", "CPH2877", "RMX5355", "CPH2833", "RMX5311"];

const tableRows: FinishGoodRow[] = Array.from({ length: 120 }, (_, index) => {
  const model = tableModels[index % tableModels.length];
  return {
    id: `FG-${String(index + 1).padStart(3, "0")}`,
    date: `2026-09-${String((index % 30) + 1).padStart(2, "0")}`,
    dept: `DEPT-10${(index % 5) + 1}`,
    material: `MAT-XR${231 + (index % 40)}`,
    model,
    woType: index % 24 === 0 ? "UMMN" : "RMMN",
    orderNo: `SO-${2201 + index}`,
    brand: model.startsWith("CPH") ? "OPPO" : "REALME",
    quantity: 800 + ((index * 137) % 1400),
  };
});



export default function CostFinishGood() {
  const [fiscal, setFiscal] = useState("FY2026 - Q3");
  const [trendPeriod, setTrendPeriod] = useState<FinishGoodPeriod>("Week");
  const [linePeriod, setLinePeriod] = useState<FinishGoodPeriod>("Week");
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
  const trendRows = useMemo(() => trend.labels.map((label, index) => ({ label, value: trend.value[index] })), [trend]);
  const brandTotal = brandShare.reduce((sum, entry) => sum + entry.value, 0);

  const exportCsv = () => {
    const lines = ["metric,period,value"];
    for (const row of trendRows) lines.push(`Finishgood Trend,${row.label},${row.value}`);
    for (const entry of brandShare) lines.push(`Brand - ${entry.name},Total,${entry.value}`);
    for (const row of lineData[linePeriod]) lines.push(`Line ${row.line} RMMN,,${row.rmmn}`, `Line ${row.line} UMMN,,${row.ummn}`);
    for (const row of topModels) lines.push(`Top Model - ${row.name},,${row.value}`);
    for (const row of tableRows) lines.push(`Detail,${row.date},${row.dept},${row.material},${row.model},${row.woType},${row.orderNo},${row.brand},${row.quantity}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "finish-good.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const refresh = () => {
    setTrendPeriod("Week");
    setLinePeriod("Week");
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
  };

  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MONITORING • COST • FINISH GOOD</div>
          <div className="repair-title-row">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Finish Good Production</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">Output finish good per brand, line, dan model area Cost.</p>
        </div>
        <div className="repair-actions">
          <CustomSelect value={fiscal} options={["FY2026 - Q1", "FY2026 - Q2", "FY2026 - Q3", "FY2026 - Q4"]} onChange={setFiscal} ariaLabel="Filter fiscal period" />
          <button className="repair-outline" type="button" onClick={exportCsv}><Download size={14} />Export</button>
          <button className="repair-outline" type="button" onClick={refresh}><RefreshCw size={14} />Refresh</button>
        </div>
      </div>

      <div className="repair-kpis pic-kpis-five">
        {metrics.map((metric) => (
          <PicMetricCard key={metric.id} card={metric} selected={focused === metric.id} onToggle={focusChart} onAskAi={setAiMetric} subtext={cardSubtext[metric.id]} />
        ))}
      </div>

      <div className="repair-charts">
        <article ref={(node) => { chartRefs.current["trend"] = node; }} className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60 dark:border-slate-800/60${chartRing("trend")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 dark:text-slate-100 font-semibold">Trend Finishgood</h2>
              <p className="text-slate-500 dark:text-slate-400">total units - monthly</p>
            </div>
            <ChartTimeTabs activeTab={trendPeriod} onChange={setTrendPeriod} ariaLabel="Finishgood trend period" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={48} tick={{ fontSize: 11 }} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="value" name="Total Units" stroke={EMERALD} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["brand"] = node; }} className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60 dark:border-slate-800/60${chartRing("brand")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 dark:text-slate-100 font-semibold">Finishgood By Brand</h2>
              <p className="text-slate-500 dark:text-slate-400">share</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <div className="warranty-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={brandShare} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} strokeWidth={2}>
                      {brandShare.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <strong className="block text-slate-900 dark:text-slate-100 text-xl font-semibold">43,612</strong>
                  <small className="text-slate-500 dark:text-slate-400 text-xs">Total units</small>
                </div>
              </div>
            </div>
            <ul className="w-full sm:w-44 grid gap-2">
              {brandShare.map((entry) => (
                <li key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400"><i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />{entry.name}</span>
                  <b className="text-slate-900 dark:text-slate-100 font-semibold">{entry.value.toLocaleString("en-US")} ({Math.round(entry.value / brandTotal * 100)}%)</b>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["line"] = node; }} className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60 dark:border-slate-800/60${chartRing("line")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 dark:text-slate-100 font-semibold">Finishgood Per Line</h2>
              <p className="text-slate-500 dark:text-slate-400">by work order type</p>
            </div>
            <ChartTimeTabs activeTab={linePeriod} onChange={setLinePeriod} ariaLabel="Per line period" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lineData[linePeriod]} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="line" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="rmmn" name="RMMN" fill={EMERALD} radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Bar dataKey="ummn" name="UMMN" fill={AMBER} radius={[6, 6, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={(node) => { chartRefs.current["models"] = node; }} className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60 dark:border-slate-800/60${chartRing("models")}`}>
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 dark:text-slate-100 font-semibold">Top 10 By Model</h2>
              <p className="text-slate-500 dark:text-slate-400">units</p>
            </div>
          </div>
          <div className="grid gap-2.5">
            {topModels.map((row, index) => (
              <div key={row.name}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">{row.name}</span>
                  <b className="text-slate-900 dark:text-slate-100 font-semibold">{row.value.toLocaleString("en-US")}</b>
                </div>
                <div className="pic-progress large"><i style={{ width: `${row.value / topMax * 100}%`, background: index % 2 === 0 ? EMERALD : AMBER }} /><span>{row.value.toLocaleString("en-US")}</span></div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60 dark:border-slate-800/60">
        <div className="repair-card-head">
          <div>
            <h2 className="text-slate-900 dark:text-slate-100 font-semibold">Detailed Data Finishgood</h2>
            <p className="text-slate-500 dark:text-slate-400">120 records • daily work orders</p>
          </div>
        </div>
        <DataTable
          columns={[
            { key: "date", header: "Date", sortable: true },
            { key: "dept", header: "Dept Code" },
            { key: "material", header: "Material No." },
            { key: "model", header: "Model", sortable: true },
            { key: "woType", header: "WO Type" },
            { key: "orderNo", header: "Order No." },
            { key: "brand", header: "Brand", sortable: true },
            { key: "quantity", header: "Quantity", sortable: true, align: "right", render: (row: FinishGoodRow) => row.quantity.toLocaleString("en-US") },
          ]}
          rows={tableRows}
          defaultSort={{ key: "date", direction: "desc" }}
          pageSizes={[30, 60, 120]}
        />
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
