"use client";
import { useMemo, useState } from "react";
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

type ProductivityPeriod = "Daily" | "Week" | "Month" | "Year";

const periodOptions: ProductivityPeriod[] = ["Daily", "Week", "Month", "Year"];

const EMERALD = "#059669";
const SLATE = "#64748B";
const AMBER = "#F59E0B";
const GRID = "#E2E8F0";

const opeData: Record<ProductivityPeriod, { labels: string[]; actual: number[]; target: number }> = {
  "Daily": { labels: ["1 Okt", "2 Okt", "3 Okt", "4 Okt", "5 Okt", "6 Okt", "7 Okt"], actual: [78.0, 78.1, 78.2, 78.3, 78.3, 78.4, 78.5], target: 80 },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], actual: [77.4, 77.6, 77.8, 78.0, 78.1, 78.2, 78.4, 78.5], target: 80 },
  "Month": { labels: ["Apr", "Mei", "Jun", "Jul", "Agu", "Sep"], actual: [76.8, 77.2, 77.9, 78.1, 78.3, 78.5], target: 80 },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], actual: [74.2, 75.6, 76.9, 77.8, 78.5], target: 80 },
};

const upphData: Record<ProductivityPeriod, { labels: string[]; actual: number[]; target: number }> = {
  "Daily": { labels: ["1 Okt", "2 Okt", "3 Okt", "4 Okt", "5 Okt", "6 Okt", "7 Okt"], actual: [42.1, 42.2, 42.3, 42.4, 42.5, 42.5, 42.6], target: 40 },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], actual: [41.2, 41.4, 41.7, 41.9, 42.1, 42.3, 42.5, 42.6], target: 40 },
  "Month": { labels: ["Apr", "Mei", "Jun", "Jul", "Agu", "Sep"], actual: [40.2, 40.8, 41.1, 41.7, 42.1, 42.6], target: 40 },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], actual: [36.4, 38.1, 39.6, 41.2, 42.6], target: 40 },
};

const ratioData: Record<ProductivityPeriod, { labels: string[]; ratio: number[] }> = {
  "Daily": { labels: ["1 Okt", "2 Okt", "3 Okt", "4 Okt", "5 Okt", "6 Okt", "7 Okt"], ratio: [3.1, 3.1, 3.2, 3.2, 3.2, 3.2, 3.2] },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], ratio: [3.0, 3.0, 3.1, 3.1, 3.1, 3.2, 3.2, 3.2] },
  "Month": { labels: ["Apr", "Mei", "Jun", "Jul", "Agu", "Sep"], ratio: [2.9, 3.0, 3.0, 3.1, 3.1, 3.2] },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], ratio: [2.7, 2.8, 3.0, 3.1, 3.2] },
};

const internshipData: Record<ProductivityPeriod, { labels: string[]; rate: number[]; cap: number }> = {
  "Daily": { labels: ["1 Okt", "2 Okt", "3 Okt", "4 Okt", "5 Okt", "6 Okt", "7 Okt"], rate: [18.1, 18.2, 18.2, 18.3, 18.4, 18.4, 18.5], cap: 20 },
  "Week": { labels: ["W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39"], rate: [17.2, 17.4, 17.6, 17.9, 18.1, 18.2, 18.4, 18.5], cap: 20 },
  "Month": { labels: ["Apr", "Mei", "Jun", "Jul", "Agu", "Sep"], rate: [15.4, 16.0, 16.8, 17.3, 17.9, 18.5], cap: 20 },
  "Year": { labels: ["2022", "2023", "2024", "2025", "2026"], rate: [12.5, 14.1, 15.8, 17.2, 18.5], cap: 20 },
};

function ChartToggle({ value, onChange, ariaLabel }: { value: ProductivityPeriod; onChange: (next: ProductivityPeriod) => void; ariaLabel: string }) {
  return (
    <div className="sq-period" role="group" aria-label={ariaLabel}>
      {periodOptions.map((option) => (
        <button key={option} type="button" aria-pressed={value === option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>{option}</button>
      ))}
    </div>
  );
}

export default function CostProductivity() {
  const [fiscal, setFiscal] = useState("FY2026 - Q1");
  const [opePeriod, setOpePeriod] = useState<ProductivityPeriod>("Month");
  const [upphPeriod, setUpphPeriod] = useState<ProductivityPeriod>("Month");
  const [ratioPeriod, setRatioPeriod] = useState<ProductivityPeriod>("Month");
  const [internPeriod, setInternPeriod] = useState<ProductivityPeriod>("Month");
  const [toast, setToast] = useState(false);

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
    setOpePeriod("Month");
    setUpphPeriod("Month");
    setRatioPeriod("Month");
    setInternPeriod("Month");
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
          <CustomSelect value={fiscal} options={["FY2026 - Q1", "FY2026 - Q2", "FY2026 - Q3", "FY2026 - Q4"]} onChange={setFiscal} ariaLabel="Filter periode fiskal" />
          <button className="repair-outline" type="button" onClick={exportCsv}><Download size={14} />Export</button>
          <button className="repair-outline" type="button" onClick={refresh}><RefreshCw size={14} />Refresh</button>
        </div>
      </div>

      <div className="repair-charts">
        <article className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60">
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">OPE Productivity</h2>
              <p className="text-slate-500">% • actual vs target</p>
            </div>
            <ChartToggle value={opePeriod} onChange={setOpePeriod} ariaLabel="Periode OPE" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={opeRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="target" name="Target" stroke={SLATE} strokeDasharray="5 5" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="actual" name="OPE Aktual" stroke={EMERALD} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60">
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">UPPH</h2>
              <p className="text-slate-500">units / person-hour • actual vs target</p>
            </div>
            <ChartToggle value={upphPeriod} onChange={setUpphPeriod} ariaLabel="Periode UPPH" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={upphRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="target" name="Target" stroke={SLATE} strokeDasharray="5 5" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="actual" name="UPPH Aktual" stroke={EMERALD} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60">
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Direct to Indirect Ratio</h2>
              <p className="text-slate-500">Ratio (D:I) • bulanan</p>
            </div>
            <ChartToggle value={ratioPeriod} onChange={setRatioPeriod} ariaLabel="Periode rasio" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratioRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} domain={[0, 4]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="ratio" name="Direct : Indirect" fill={EMERALD} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60">
          <div className="repair-card-head">
            <div>
              <h2 className="text-slate-900 font-semibold">Internship Rate</h2>
              <p className="text-slate-500">% of workforce • vs cap 20%</p>
            </div>
            <ChartToggle value={internPeriod} onChange={setInternPeriod} ariaLabel="Periode internship" />
          </div>
          <div className="warranty-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={internRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11 }} domain={[0, 25]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cap" name="Cap 20%" stroke={AMBER} strokeDasharray="5 5" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="rate" name="Internship %" stroke={EMERALD} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      {toast && <div className="repair-toast"><span>✓</span>Data berhasil diperbarui</div>}
    </div>
  );
}
