"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fqcData,
  initialSolutions,
  oqcData,
  qcAchievementData,
  type SolutionRecord,
  type SolutionSource,
} from "@/data/qcData";

export type Page = "qc-achievement" | "fqc" | "oqc" | "solusi";

function MetricCard({
  label,
  value,
  delta,
  tone = "neutral",
  statusClass,
}: {
  label: string;
  value: string;
  delta: string;
  tone?: "up" | "down" | "neutral";
  statusClass?: string;
}) {
  return (
    <article className={`oqc-metric-card ${statusClass ?? ""}`}>
      <span className="metric-accent" />
      <div className="oqc-metric-label">{label}</div>
      <div className={`oqc-metric-value ${tone}`}>{value}</div>
      <div className={`oqc-metric-delta ${tone}`}>{delta}</div>
    </article>
  );
}

function KpiCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 700;
    const from = 0;
    const to = value;

    const tick = (current: number) => {
      const progress = Math.min((current - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const formatted = unit === "%" ? `${display.toFixed(1)}%` : Number.isInteger(display) ? `${Math.round(display)}` : display.toFixed(1);

  return (
    <article className="qc-kpi-card">
      <span className="kpi-label">{label}</span>
      <strong>{formatted}</strong>
      <span className="kpi-unit">{unit}</span>
    </article>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="qc-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function DonutChartCard({
  headline,
  sublabel,
  items,
  filterLabel,
}: {
  headline: string;
  sublabel: string;
  items: Array<{ name: string; percent: number; count: number; unit: string }>;
  filterLabel: string;
}) {
  const [filter, setFilter] = useState("Semua Area");

  return (
    <article className="qc-card large-card">
      <div className="qc-card-header compact">
        <div>
          <h3>Defect Fenomena Problem</h3>
          <p>Gabungan semua lini</p>
        </div>
        <label className="qc-select-wrap">
          <span>Filter Area / Material</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            {[
              "Semua Area",
              "Top Cover",
              "Bottom Cover",
              "Battery Cover",
              "Kamera",
              "Decorative",
              "Lainnya",
            ].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="qc-donut-wrap">
        <div className="qc-donut-shell">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={items} dataKey="percent" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={3}>
                {items.map((entry) => (
                  <Cell key={entry.name} fill={entry.name === "Gores" ? "var(--chart-1)" : entry.name === "Penyok" ? "var(--chart-2)" : entry.name === "Warna" ? "var(--chart-3)" : entry.name === "Komponen" ? "var(--chart-4)" : "var(--chart-5)"} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}%`, "Persentase"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="qc-donut-center">
            <strong>{headline}</strong>
            <span>{sublabel}</span>
          </div>
        </div>

        <div className="qc-donut-legend">
          {items.map((item) => (
            <div key={item.name} className="qc-legend-row">
              <span><i style={{ background: item.name === "Gores" ? "var(--chart-1)" : item.name === "Penyok" ? "var(--chart-2)" : item.name === "Warna" ? "var(--chart-3)" : item.name === "Komponen" ? "var(--chart-4)" : "var(--chart-5)" }} />{item.name}</span>
              <strong>{item.percent}%</strong>
              <span>{item.count} {item.unit}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="qc-filter-note">{filterLabel}</div>
    </article>
  );
}

function AreaTrendCard({
  title,
  subtitle,
  data,
  yLabel,
  xLabel,
  color,
}: {
  title: string;
  subtitle: string;
  data: Array<{ date: string; value: number }>;
  yLabel: string;
  xLabel: string;
  color: string;
}) {
  return (
    <article className="qc-card large-card">
      <div className="qc-card-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="qc-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`area-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} label={{ value: xLabel, position: "insideBottom", offset: -4, fontSize: 11, fontFamily: "Montserrat", fill: "var(--muted)", fontWeight: 600 }} tick={{ fontSize: 11, fill: "var(--muted)", fontFamily: "Montserrat" }} />
            <YAxis tickLine={false} axisLine={false} label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 8, fontSize: 11, fontFamily: "Montserrat", fill: "var(--muted)", fontWeight: 600 }} tick={{ fontSize: 11, fill: "var(--muted)", fontFamily: "Montserrat" }} domain={[0, "dataMax + 2"]} />
            <Tooltip contentStyle={{ fontFamily: "Montserrat", fontSize: 12, background: "rgba(27, 43, 35, 0.92)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff" }} />
            <Area type="monotone" dataKey="value" stroke={color} fill={`url(#area-${title})`} strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function BarCard({
  title,
  subtitle,
  data,
  yLabel,
  xLabel,
  valueKey,
  color,
}: {
  title: string;
  subtitle: string;
  data: Array<{ [key: string]: string | number }>;
  yLabel: string;
  xLabel: string;
  valueKey: string;
  color: string;
}) {
  return (
    <article className="qc-card large-card">
      <div className="qc-card-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="qc-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={Object.keys(data[0] ?? {})[0]} tickLine={false} axisLine={false} label={{ value: xLabel, position: "insideBottom", offset: -4, fontSize: 11, fontFamily: "Montserrat", fill: "var(--muted)", fontWeight: 600 }} tick={{ fontSize: 11, fill: "var(--muted)", fontFamily: "Montserrat" }} />
            <YAxis tickLine={false} axisLine={false} label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 8, fontSize: 11, fontFamily: "Montserrat", fill: "var(--muted)", fontWeight: 600 }} tick={{ fontSize: 11, fill: "var(--muted)", fontFamily: "Montserrat" }} />
            <Tooltip contentStyle={{ fontFamily: "Montserrat", fontSize: 12, background: "rgba(27, 43, 35, 0.92)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff" }} />
            <Bar dataKey={valueKey} fill={color} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function HBarCard({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <article className="qc-card large-card">
      <div className="qc-card-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="qc-hbar-list">
        {data.map((item) => (
          <div key={item.name} className="qc-hbar-item">
            <div className="qc-hbar-label-row">
              <span>{item.name}</span>
              <strong>{item.value}%</strong>
            </div>
            <div className="qc-hbar-track">
              <i style={{ width: `${item.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function QcAchievement() {
  return (
    <div className="qc-page-shell">
      <header className="qc-page-header">
        <div>
          <div className="qc-kicker">QC</div>
          <h1>QC Summary</h1>
          <p>Ringkasan FQC dan OQC produksi</p>
        </div>
      </header>

      <div className="qc-achievement-grid">
        {qcAchievementData.map((item) => {
          const statusClass = item.status === "ok" ? "status-ok" : item.status === "warn" ? "status-warn" : "status-bad";
          const tone = item.status === "ok" ? "up" : item.status === "warn" ? "down" : "down";

          return (
            <MetricCard
              key={item.title}
              label={item.title}
              value={item.value}
              delta={item.label}
              tone={tone}
              statusClass={statusClass}
            />
          );
        })}
      </div>

      <div className="qc-grid-2">
        <AreaTrendCard
          title="Trend NG FQC"
          subtitle="7 hari terakhir"
          data={fqcData.trend.map((point) => ({ date: point.date, value: point.value }))}
          yLabel="Jumlah NG"
          xLabel="Tanggal"
          color="var(--chart-1)"
        />
        <AreaTrendCard
          title="Trend NG OQC"
          subtitle="Per jam hari ini"
          data={oqcData.trend.map((point) => ({ date: point.date, value: point.value }))}
          yLabel="Jumlah NG"
          xLabel="Jam"
          color="var(--chart-3)"
        />
      </div>
    </div>
  );
}

function FqcPage() {
  const [updatedAt, setUpdatedAt] = useState(() => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
  const [toast, setToast] = useState<string | null>(null);

  const refreshData = () => {
    const time = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    setUpdatedAt(time);
    setToast("Data FQC dimuat ulang");
  };

  useEffect(() => {
    if (!toast) return;
    const handle = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(handle);
  }, [toast]);

  return (
    <div className="qc-page-shell">
      <header className="qc-page-header">
        <div>
          <div className="qc-kicker">Kualitas / FQC</div>
          <h1>FQC — Final Quality Control</h1>
        </div>
        <div className="qc-toolbar">
          <div className="qc-live">
            <span className="live-dot" />
            <span>Terakhir diperbarui: {updatedAt}</span>
          </div>
          <button className="qc-primary-button" onClick={refreshData}>Muat Ulang</button>
        </div>
      </header>

      {toast && <div className="qc-toast">{toast}</div>}

      <div className="qc-kpi-grid">
        {fqcData.kpis.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} unit={item.unit} />
        ))}
      </div>

      <div className="qc-grid-2">
        <AreaTrendCard title="Tren NG FQC per Tanggal" subtitle="7 hari terakhir" data={fqcData.trend.map((point) => ({ date: point.date, value: point.value }))} yLabel="Jumlah NG (unit)" xLabel="Tanggal" color="var(--chart-1)" />
        <BarCard title="NG Rate per Model" subtitle="Persentase NG" data={fqcData.modelRates.map((point) => ({ Model: point.model, "NG Rate": point.value }))} yLabel="NG Rate (%)" xLabel="Model" valueKey="NG Rate" color="var(--chart-2)" />
      </div>

      <div className="qc-grid-2">
        <HBarCard title="Area Material" subtitle="Detil per area" data={fqcData.areaMaterial} />
        <DonutChartCard headline="54" sublabel="Total NG" items={fqcData.defectBreakdown} filterLabel="Semua Area" />
      </div>

      <article className="qc-card summary-panel">
        <div className="qc-card-header compact">
          <div>
            <h3>Summary Data Analysis</h3>
            <p>Rangkuman penyebab</p>
          </div>
        </div>
        <div className="qc-summary-grid">
          {fqcData.summaryCards.map((item) => (
            <SummaryCard key={item.label} label={item.label} value={item.value} note={item.note} />
          ))}
        </div>
      </article>
    </div>
  );
}

function OqcPage() {
  const [updatedAt, setUpdatedAt] = useState(() => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
  const [toast, setToast] = useState<string | null>(null);

  const refreshData = () => {
    const time = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    setUpdatedAt(time);
    setToast("Data OQC dimuat ulang");
  };

  useEffect(() => {
    if (!toast) return;
    const handle = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(handle);
  }, [toast]);

  return (
    <div className="qc-page-shell">
      <header className="qc-page-header">
        <div>
          <div className="qc-kicker">Kualitas / OQC</div>
          <h1>OQC — Outgoing Quality Control</h1>
        </div>
        <div className="qc-toolbar">
          <div className="qc-live">
            <span className="live-dot" />
            <span>Terakhir diperbarui: {updatedAt}</span>
          </div>
          <button className="qc-primary-button" onClick={refreshData}>Muat Ulang</button>
        </div>
      </header>

      {toast && <div className="qc-toast">{toast}</div>}

      <div className="qc-kpi-grid">
        {oqcData.kpis.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} unit={item.unit} />
        ))}
      </div>

      <div className="qc-grid-2">
        <AreaTrendCard title="Tren NG OQC per Jam" subtitle="Real-time hari ini" data={oqcData.trend.map((point) => ({ date: point.date, value: point.value }))} yLabel="Jumlah NG (unit)" xLabel="Jam" color="var(--chart-1)" />
        <BarCard title="NG OQC per Lini" subtitle="Hari ini" data={oqcData.lineRates.map((point) => ({ Lini: point.line, NG: point.value }))} yLabel="Jumlah NG (unit)" xLabel="Lini" valueKey="NG" color="var(--chart-4)" />
      </div>

      <div className="qc-grid-2">
        <HBarCard title="Area Material" subtitle="Detil per area" data={oqcData.areaMaterial} />
        <DonutChartCard headline="74" sublabel="Total NG" items={oqcData.defectBreakdown} filterLabel="Semua Area" />
      </div>

      <article className="qc-card summary-panel">
        <div className="qc-card-header compact">
          <div>
            <h3>Summary Data Analysis</h3>
            <p>Rangkuman penyebab</p>
          </div>
        </div>
        <div className="qc-summary-grid">
          {oqcData.summaryCards.map((item) => (
            <SummaryCard key={item.label} label={item.label} value={item.value} note={item.note} />
          ))}
        </div>
      </article>
    </div>
  );
}

function SolusiImprovementPage() {
  const [source, setSource] = useState<SolutionSource>("FQC");
  const [model, setModel] = useState("");
  const [solution, setSolution] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [evidence, setEvidence] = useState("");
  const [records, setRecords] = useState<SolutionRecord[]>(initialSolutions);
  const [filter, setFilter] = useState<"Semua" | SolutionSource>("Semua");

  const filteredRecords = useMemo(() => {
    if (filter === "Semua") return records;
    return records.filter((item) => item.source === filter);
  }, [records, filter]);

  const handleSave = () => {
    if (!model.trim() || !solution.trim() || !dueDate) return;

    const next: SolutionRecord = {
      id: Date.now(),
      source,
      model: model.trim(),
      solution: solution.trim(),
      dueDate,
      evidence: evidence || "No attachment",
    };

    setRecords((current) => [next, ...current]);
    setModel("");
    setSolution("");
    setDueDate("");
    setEvidence("");
    setSource("FQC");
  };

  const handleDelete = () => {
    setModel("");
    setSolution("");
    setDueDate("");
    setEvidence("");
    setSource("FQC");
  };

  return (
    <div className="qc-page-shell">
      <header className="qc-page-header">
        <div>
          <div className="qc-kicker">Improvement</div>
          <h1>🛠 Solusi Improvement</h1>
        </div>
      </header>

      <article className="qc-card form-card">
        <div className="qc-card-header compact">
          <div>
            <h3>Solusi Improvement</h3>
            <p>Input perbaikan yang perlu ditindaklanjuti</p>
          </div>
        </div>

        <div className="qc-form-grid">
          <label>
            <span>Sumber</span>
            <select value={source} onChange={(e) => setSource(e.target.value as SolutionSource)}>
              <option value="FQC">FQC</option>
              <option value="OQC">OQC</option>
            </select>
          </label>

          <label>
            <span>Model</span>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Contoh: DB5" />
          </label>

          <label className="full-width">
            <span>Solusi</span>
            <textarea value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="Tulis solusi perbaikan..." rows={4} />
          </label>

          <label>
            <span>Due Date</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>

          <label>
            <span>Bukti (Evidence)</span>
            <input type="file" accept="image/*" onChange={(e) => setEvidence(e.target.files?.[0]?.name ?? "")} />
          </label>
        </div>

        <div className="qc-actions">
          <button className="qc-primary-button" onClick={handleSave}>💾 Save</button>
          <button className="qc-secondary-button" onClick={handleDelete}>🗑 Delete</button>
        </div>
      </article>

      <article className="qc-card log-card">
        <div className="qc-card-header compact">
          <div>
            <h3>📋 Log Historical Problem</h3>
            <p>Riwayat solusi tersimpan</p>
          </div>
          <div className="qc-filter-group">
            {(["Semua", "FQC", "OQC"] as const).map((option) => (
              <button key={option} className={filter === option ? "active" : ""} onClick={() => setFilter(option)}>{option}</button>
            ))}
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="qc-empty-state">Belum ada solusi tercatat.</div>
        ) : (
          <div className="qc-log-list">
            {filteredRecords.map((record) => (
              <div key={record.id} className="qc-log-item">
                <div className="qc-log-meta">
                  <span className={`qc-source-badge ${record.source.toLowerCase()}`}>{record.source}</span>
                  <strong>{record.model}</strong>
                </div>
                <p>{record.solution}</p>
                <div className="qc-log-foot">
                  <small>Due: {record.dueDate}</small>
                  <small>{record.evidence}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

export function OqcDashboard({ page, onPageChange }: { page: Page; onPageChange: (page: Page) => void }) {
  const renderPage = () => {
    if (page === "qc-achievement") return <QcAchievement />;
    if (page === "fqc") return <FqcPage />;
    if (page === "oqc") return <OqcPage />;
    return <SolusiImprovementPage />;
  };

  return <div className="qc-content-panel">{renderPage()}</div>;
}

export default OqcDashboard;


