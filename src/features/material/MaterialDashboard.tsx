"use client";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  actionPlanRows,
  clearanceFrequencyData,
  clearanceHistoryRows,
  clearanceSummaryKpis,
  clearanceTimeData,
  dominantIssueData,
  goodMaterialScrapData,
  lossByDepartment,
  lossModelRows,
  materialHandlingDonut,
  materialOverviewCards,
  monthlyClearanceData,
  newModelMilestones,
  newModelRows,
  prepChecklistRows,
  progressHandlingData,
  trackingClearanceCards,
  type ClearanceTab,
} from "@/data/materialData";
import {
  factoryAchievementByType,
  lineRankingByType,
  woAchievementData,
  woCloseBreakdown,
  woCloseWorkOrderCategories,
  woCloseWorkOrderTypes,
  woCloseKpiByType,
  woDistributionByType,
  workshopRankingByType,
  type WoType,
} from "@/data/woCloseData";

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "danger" | "warning" }) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

function Sparkline({ success }: { success: boolean }) {
  return <svg className="repair-spark" viewBox="0 0 112 35" preserveAspectRatio="none"><path d="M1 28 8 25 15 27 22 18 29 21 36 15 43 18 50 11 57 14 64 8 71 13 78 6 85 10 92 5 99 9 111 3" fill="none" stroke={success ? "var(--success)" : "var(--danger)"} strokeWidth="2"/><path d="M1 34V28L8 25 15 27 22 18 29 21 36 15 43 18 50 11 57 14 64 8 71 13 78 6 85 10 92 5 99 9 111 3V34Z" fill={success ? "var(--success-soft)" : "var(--danger-soft)"}/></svg>;
}

function PageHeader({ eyebrow, title, subtitle, actionLabel }: { eyebrow: string; title: string; subtitle?: string; actionLabel?: string }) {
  return (
    <header className="material-header glass-card">
      <div>
        <div className="qc-kicker">{eyebrow}</div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actionLabel ? <button className="btn btn-primary">{actionLabel}</button> : null}
    </header>
  );
}

function KpiCard({
  label,
  value,
  target,
  tone = "neutral",
  onClick,
  selected = false,
}: {
  label: string;
  value: string | number;
  target: string;
  tone?: "danger" | "primary" | "neutral" | "success" | "warning";
  onClick?: () => void;
  selected?: boolean;
}) {
  const success = tone === "success" || tone === "primary" || tone === "neutral";
  return (
    <button type="button" className={`repair-kpi material-kpi-card ${selected ? "selected" : ""} ${tone}`} onClick={onClick}>
      <div className="repair-kpi-top"><span>{label}</span><span className={`repair-status ${success ? "good" : "bad"}`}>{success ? "On Target" : "Off Target"}</span></div>
      <strong>{value}</strong>
      <p>Target: {target}</p>
      <Sparkline success={success} />
    </button>
  );
}

function MaterialOverview({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="material-page">
      <PageHeader eyebrow="MATERIAL" title="Material Overview" subtitle="Ringkasan material dan pengendalian WO close." actionLabel="Export" />
      <div className="material-kpi-grid">
        {materialOverviewCards.map((card) => (
          <KpiCard
            key={card.key}
            label={card.label}
            value={card.value}
            target={card.target}
            tone={card.tone}
            onClick={() => onNavigate(card.page)}
          />
        ))}
      </div>
    </div>
  );
}

function ClearanceSummaryTab() {
  return (
    <div className="material-section-stack">
      <div className="material-kpi-grid compact">
        {clearanceSummaryKpis.map((item, index) => (
          <KpiCard key={item.label} label={item.label} value={item.value} target={item.target as string} tone={(item.tone as "danger" | "primary" | "neutral" | "success" | "warning" | undefined) ?? (index === 1 ? "danger" : "neutral")} />
        ))}
      </div>

      <div className="material-grid-two">
        <article className="glass-card material-card">
          <div className="card-head"><div><h3>Frekuensi Clearance per Model</h3><p>Jumlah clearances per model</p></div></div>
          <div className="material-chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={clearanceFrequencyData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }} />
                <YAxis type="category" dataKey="model" width={90} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {clearanceFrequencyData.map((entry) => (
                    <Cell key={entry.model} fill={entry.value > 1 ? "var(--danger)" : "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="glass-card material-card">
          <div className="card-head"><div><h3>Penanganan Sisa Material</h3><p>Distribusi status material</p></div></div>
          <div className="material-pie-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={materialHandlingDonut} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
                  {materialHandlingDonut.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => [value, "Count"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className="material-grid-two">
        <article className="glass-card material-card">
          <div className="card-head"><div><h3>Masalah Dominan</h3><p>Cause by owner</p></div></div>
          <div className="material-chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dominantIssueData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="cause" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="glass-card material-card">
          <div className="card-head"><div><h3>Waktu Clearance: Target vs Aktual (jam)</h3><p>Actual above target highlighted</p></div></div>
          <div className="material-chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={clearanceTimeData} margin={{ left: 10, right: 20 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="model" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 9, fontFamily: "Montserrat" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="target" fill="var(--accent-amber)" radius={[4, 4, 0, 0]} name="Target" />
                <Bar dataKey="actual" fill="var(--danger)" radius={[4, 4, 0, 0]} name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="glass-card material-card">
        <div className="card-head"><div><h3>Sekali Habis per Bulan</h3><p>YES vs NO clearance</p></div></div>
        <div className="material-chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyClearanceData}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="yes" stackId="a" fill="var(--primary)" name="YES" radius={[8, 8, 0, 0]} />
              <Bar dataKey="no" stackId="a" fill="var(--accent-slate)" name="NO" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}

function PrepTrackingTab() {
  return (
    <div className="material-section-stack">
      <article className="glass-card material-card">
        <div className="card-head"><div><h3>Preparation checklist matrix</h3><p>Checklist per model and checkpoint</p></div></div>
        <div className="material-table-wrap">
          <table className="material-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Meeting Backup Material</th>
                <th>Meeting Internal</th>
                <th>Material Backup Tiba</th>
                <th>Material Terkumpul</th>
                <th>PIC</th>
              </tr>
            </thead>
            <tbody>
              {prepChecklistRows.map((row) => (
                <tr key={row.line}>
                  <td>{row.line}</td>
                  <td>2026-01-02</td>
                  <td>2026-01-04</td>
                  <td>2026-01-06</td>
                  <td>2026-01-09</td>
                  <td>{row.pic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="material-card-grid">
        {trackingClearanceCards.map((card) => (
          <article className="glass-card material-card" key={card.model}>
            <div className="card-head"><div><h3>{card.model}</h3><p>{card.note}</p></div></div>
            <div className="tracking-row">
              <div><span>Plan</span><strong>{card.plan.toLocaleString()}</strong></div>
              <div><span>Output</span><strong>{card.output.toLocaleString()}</strong></div>
              <div><span>Remaining</span><strong>{card.remaining.toLocaleString()}</strong></div>
            </div>
            <div className="tracking-progress">
              <div className="progress-bar"><span style={{ width: `${card.progress}%` }} /></div>
              <small>{card.progress}% complete</small>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function HistoryTab() {
  return (
    <article className="glass-card material-card">
      <div className="card-head"><div><h3>Riwayat Clearance</h3><p>History of material clearance</p></div></div>
      <div className="material-table-wrap">
        <table className="material-table">
          <thead>
            <tr>
              <th>Bulan</th>
              <th>Model</th>
              <th>Tanggal Clearance</th>
              <th>Penanganan</th>
              <th>Sekali Habis</th>
              <th>PIC</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {clearanceHistoryRows.map((row, index) => (
              <tr key={`${row.model}-${index}`}>
                <td>{row.bulan}</td>
                <td>{row.model}</td>
                <td>{row.tanggalClearance}</td>
                <td>{row.penanganan}</td>
                <td><StatusPill label={row.sekaliHabis} tone={row.sekaliHabis === "YES" ? "success" : "danger"} /></td>
                <td>{row.pic}</td>
                <td><StatusPill label={row.status} tone={row.status === "Closed" ? "success" : row.status === "Open" ? "danger" : "warning"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function LossTab() {
  return (
    <div className="material-section-stack">
      <div className="material-kpi-grid compact">
        <KpiCard label="Total Idle Price" value="IDR 180.7K" target="Target 200K" tone="neutral" />
        <KpiCard label="Loss per Unit vs Target" value="8.5" target="Target 6.0" tone="danger" />
        <KpiCard label="Material Belum Selesai" value="11" target="Target 5" tone="warning" />
        <KpiCard label="Good Material Scrap vs Target" value="42.6" target="Target 32" tone="neutral" />
      </div>

      <div className="material-grid-two">
        <article className="glass-card material-card">
          <div className="card-head"><div><h3>Kerugian per Departemen</h3><p>Idle price by department</p></div></div>
          <div className="material-pie-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={lossByDepartment} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3} nameKey="name">
                  {lossByDepartment.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => [value.toLocaleString(), "IDR"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="glass-card material-card">
          <div className="card-head"><div><h3>Good Material Scrap per Bulan</h3><p>Actual vs target</p></div></div>
          <div className="material-chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={goodMaterialScrapData}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="actual" fill="var(--primary)" name="Actual" radius={[8, 8, 0, 0]} />
                <Bar dataKey="target" fill="var(--accent-amber)" name="Target" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="glass-card material-card">
        <div className="card-head"><div><h3>Kerugian per Model</h3><p>Idle qty and loss per unit</p></div></div>
        <div className="material-table-wrap">
          <table className="material-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Idle Qty</th>
                <th>Idle Price</th>
                <th>Loss / Unit vs Target</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lossModelRows.map((row) => (
                <tr key={row.model}>
                  <td>{row.model}</td>
                  <td>{row.idleQty}</td>
                  <td>{row.idlePrice.toLocaleString()}</td>
                  <td>{row.lossUnit}</td>
                  <td><StatusPill label={row.status} tone={row.status === "Closed" ? "success" : row.status === "Monitoring" ? "warning" : "danger"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="glass-card material-card">
        <div className="card-head"><div><h3>Rencana Aksi</h3><p>Improvement actions</p></div></div>
        <div className="material-table-wrap">
          <table className="material-table">
            <thead>
              <tr><th>PIC</th><th>Dept</th><th>Due date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {actionPlanRows.map((row) => (
                <tr key={`${row.pic}-${row.dept}`}>
                  <td>{row.pic}</td>
                  <td>{row.dept}</td>
                  <td>{row.dueDate}</td>
                  <td><StatusPill label={row.status} tone={row.status === "On track" ? "success" : row.status === "Pending" ? "warning" : "neutral"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

function ClearancePage() {
  const [tab, setTab] = useState<ClearanceTab>("Ringkasan");
  return (
    <div className="material-page">
      <PageHeader eyebrow="MATERIAL" title="Clearance Discontinue" subtitle="Penghabisan material saat model berhenti diproduksi." actionLabel="Export" />
      <div className="material-tabs">
        {(["Ringkasan", "Persiapan & Tracking", "Riwayat", "Kerugian Material"] as ClearanceTab[]).map((tabName) => (
          <button key={tabName} type="button" className={tab === tabName ? "active" : ""} onClick={() => setTab(tabName)}>{tabName}</button>
        ))}
      </div>
      {tab === "Ringkasan" ? <ClearanceSummaryTab /> : tab === "Persiapan & Tracking" ? <PrepTrackingTab /> : tab === "Riwayat" ? <HistoryTab /> : <LossTab />}
    </div>
  );
}

function NewModelPage() {
  const total = newModelRows.length;
  const running = newModelRows.filter((row) => row.status === "On track").length;
  const completed = newModelRows.filter((row) => row.status === "Completed").length;
  const delayed = newModelRows.filter((row) => row.status === "Delayed").length;

  return (
    <div className="material-page">
      <PageHeader eyebrow="MATERIAL" title="New Model Progress" subtitle="Progress model baru sesuai milestone pembuatan material." actionLabel="Export" />
      <div className="material-kpi-grid compact">
        <KpiCard label="Total Model Baru" value={total} target="Target 6" tone="neutral" />
        <KpiCard label="Sedang Berjalan" value={running} target="Target 3" tone="primary" />
        <KpiCard label="Selesai" value={completed} target="Target 2" tone="success" />
        <KpiCard label="Terlambat" value={delayed} target="Target 1" tone="danger" />
      </div>

      <article className="glass-card material-card">
        <div className="card-head"><div><h3>Model baru</h3><p>Progress and milestone checklist</p></div></div>
        <div className="material-table-wrap">
          <table className="material-table">
            <thead>
              <tr><th>Model</th><th>Target Launch</th><th>Milestone</th><th>Progress %</th><th>PIC</th><th>Status</th></tr>
            </thead>
            <tbody>
              {newModelRows.map((row) => (
                <tr key={row.model}>
                  <td>{row.model}</td>
                  <td>{row.launch}</td>
                  <td>{newModelMilestones.join(" · ")}</td>
                  <td>
                    <div className="mini-progress"><span style={{ width: `${row.progress}%` }} /></div>
                    <small>{row.progress}%</small>
                  </td>
                  <td>{row.pic}</td>
                  <td><StatusPill label={row.status} tone={row.status === "Completed" ? "success" : row.status === "Delayed" ? "danger" : "warning"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      {/* TODO: confirm real columns and milestone values with the user before replacing this mock implementation. */}
    </div>
  );
}

function WoClosePage() {
  const [workOrderType, setWorkOrderType] = useState<WoType>("Non-Standard");
  const [selectedKpiKey, setSelectedKpiKey] = useState<"launch" | "completion" | "closing">("closing");
  const [search, setSearch] = useState("");

  const selectedKpi = woCloseKpiByType[workOrderType][selectedKpiKey];
  const chartData = useMemo(() => {
    const selectedRate = selectedKpiKey === "closing" ? "closing" : selectedKpiKey === "completion" ? "completion" : "launch";
    const data = woAchievementData.map((item) => ({ ...item, selectedRate: selectedKpi.value }));
    return data;
  }, [selectedKpi, selectedKpiKey]);

  const filteredDistribution = useMemo(() => {
    const rows = woDistributionByType[workOrderType].filter((row) => row.date.toLowerCase().includes(search.toLowerCase()) || String(row.closedOnTime).includes(search));
    return rows;
  }, [search, workOrderType]);

  return (
    <div className="material-page wo-close-page">
      <PageHeader eyebrow="MATERIAL" title="WO Close Rate Monitoring" subtitle="工单按时关闭率" actionLabel="Export" />

      <div className="wo-filter-card glass-card">
        <div className="wo-filter-head">
          <div>
            <strong>Filter</strong>
          </div>
          <button type="button" className="btn btn-outline">Retract</button>
        </div>
        <div className="wo-filter-grid">
          <label><span>Report type</span><select defaultValue="Daily report"><option>Daily report</option><option>Weekly report</option><option>Monthly report</option></select></label>
          <label><span>Target closing time</span><div className="range-field"><input defaultValue="2026-03-01" /><span>to</span><input defaultValue="2026-03-13" /></div></label>
          <label><span>Workshop type</span><select defaultValue="Mass production"><option>Mass production</option><option>All</option></select></label>
          <label><span>Work order type</span><select value={workOrderType} onChange={(event) => setWorkOrderType(event.target.value as WoType)}><option>Standard</option><option>Non-Standard</option></select></label>
          <label><span>Work order classification</span><button type="button" className="chip-select">all +5</button></label>
          <label><span>Factory Area</span><button type="button" className="chip-select">all +4</button></label>
          <label><span>Workshop</span><button type="button" className="chip-select">all +11</button></label>
          <label><span>Line ID</span><button type="button" className="chip-select">all +154</button></label>
          <div className="wo-filter-actions"><button className="btn btn-primary">Search</button><button className="btn btn-outline">Reset</button></div>
        </div>
      </div>

      <div className="wo-kpi-wrap">
        <div className="material-kpi-group">
          <h3>Work orders are prepared on time</h3>
          <div className="material-kpi-grid compact wo-kpi-grid">
            <KpiCard label={woCloseKpiByType[workOrderType].launch.label} value={`${woCloseKpiByType[workOrderType].launch.value.toFixed(2)}%`} target={`${woCloseKpiByType[workOrderType].launch.target.toFixed(2)}%`} tone={woCloseKpiByType[workOrderType].launch.value >= woCloseKpiByType[workOrderType].launch.target ? "primary" : "danger"} selected={selectedKpiKey === "launch"} onClick={() => setSelectedKpiKey("launch")} />
          </div>
        </div>
        <div className="material-kpi-group">
          <h3>Work order process progress</h3>
          <div className="material-kpi-grid compact wo-kpi-grid">
            <KpiCard label={woCloseKpiByType[workOrderType].completion.label} value={`${woCloseKpiByType[workOrderType].completion.value.toFixed(2)}%`} target={`${woCloseKpiByType[workOrderType].completion.target.toFixed(2)}%`} tone={woCloseKpiByType[workOrderType].completion.value >= woCloseKpiByType[workOrderType].completion.target ? "primary" : "danger"} selected={selectedKpiKey === "completion"} onClick={() => setSelectedKpiKey("completion")} />
            <KpiCard label={woCloseKpiByType[workOrderType].closing.label} value={`${woCloseKpiByType[workOrderType].closing.value.toFixed(2)}%`} target={`${woCloseKpiByType[workOrderType].closing.target.toFixed(2)}%`} tone={woCloseKpiByType[workOrderType].closing.value >= woCloseKpiByType[workOrderType].closing.target ? "primary" : "danger"} selected={selectedKpiKey === "closing"} onClick={() => setSelectedKpiKey("closing")} />
          </div>
        </div>
      </div>

      <div className="material-breakdown-strip">
        {woCloseBreakdown[workOrderType].map((segment) => {
          const rate = segment.rate ?? null;
          const value = rate !== null && rate < 95 ? "danger" : "primary";
          return (
            <div key={segment.name} className={`material-breakdown-item ${value}`}>
              <span>{segment.name}</span>
              <strong>{rate === null ? "--" : `${rate.toFixed(2)}%`}</strong>
              <small>{rate === null ? "-- / --" : `${segment.closed} / ${segment.total}`}</small>
            </div>
          );
        })}
      </div>

      <article className="glass-card material-card wo-chart-card">
        <div className="card-head"><div><h3>WO Close Achievement 2026</h3><p>Day rate and closed rate trend</p></div></div>
        <div className="material-chart-wrap wo-achievement-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={woAchievementData} margin={{ top: 12, right: 18, left: 8, bottom: 8 }}>
              <defs>
                <linearGradient id="dayRateFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.38} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} />
              <Tooltip
                formatter={(value: number, name: string) => [`${Number(value).toFixed(1)}%`, name]}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", boxShadow: "var(--shadow)", background: "var(--card)", color: "var(--text)" }}
                labelStyle={{ color: "var(--text)", fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ paddingTop: 12, fontSize: 11 }} iconType="circle" />
              <Area type="monotone" dataKey="dayRate" name="Day Rate" stroke="var(--primary)" strokeWidth={2} fill="url(#dayRateFill)" fillOpacity={1} />
              <Line type="monotone" dataKey="closedRate" name="Closed Rate" stroke="var(--primary)" strokeWidth={3} dot={{ r: 5, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }} activeDot={{ r: 7, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }} />
              <Line type="monotone" dataKey="target" name="Target" stroke="var(--accent-amber)" strokeDasharray="6 6" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <div className="material-grid-two">
        <article className="glass-card material-card">
          <div className="card-head"><div><h3>Quantity of work order distribution</h3><p>Closed on time vs total</p></div><button className="icon-btn">Export</button></div>
          <div className="material-chart-wrap">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={filteredDistribution} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="closedOnTime" name="Number of work orders closed on time" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                <Bar yAxisId="left" dataKey="total" name="Total number of work orders" fill="var(--accent-teal)" radius={[8, 8, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="rate" name="On-time closing rate of work orders" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="target" name="Target of Standard" stroke="var(--accent-amber)" strokeDasharray="6 6" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="glass-card material-card">
          <div className="card-head"><div><h3>Factory Achievements</h3><p>Achievement by factory</p></div></div>
          <div className="material-chart-wrap">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={factoryAchievementByType[workOrderType]} margin={{ top: 16, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="factory" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} />
                <YAxis domain={[95, 100]} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "Rate"]} />
                <Bar dataKey="rate" radius={[8, 8, 0, 0]}>
                  {factoryAchievementByType[workOrderType].map((entry) => (
                    <Cell key={entry.factory} fill={entry.highlight ? "var(--primary)" : "var(--accent-slate)"} stroke={entry.highlight ? "var(--primary)" : "transparent"} strokeWidth={2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className="material-grid-two">
        <article className="glass-card material-card ranking-card">
          <div className="card-head"><div><h3>Workshop ranking</h3><p>By rate</p></div></div>
          <div className="ranking-list">
            {workshopRankingByType[workOrderType].map((item) => (
              <div className="ranking-item" key={item.name}>
                <span className="ranking-name" title={item.name}>{item.name}</span>
                <div className="ranking-bar-wrap"><span className="ranking-bar" style={{ width: `${item.rate}%` }} /></div>
                <strong>{item.rate.toFixed(2)}%</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card material-card ranking-card">
          <div className="card-head"><div><h3>Line ranking</h3><p>By rate</p></div></div>
          <div className="ranking-list">
            {lineRankingByType[workOrderType].map((name) => (
              <div className="ranking-item" key={name}>
                <span className="ranking-name" title={name}>{name}</span>
                <div className="ranking-bar-wrap"><span className="ranking-bar" style={{ width: "100%" }} /></div>
                <strong>100.00%</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

export default function MaterialDashboard({ page, onNavigate }: { page: string; onNavigate: (page: string) => void }) {
  if (page === "material-overview") return <MaterialOverview onNavigate={onNavigate} />;
  if (page === "material-clearance") return <ClearancePage />;
  if (page === "material-new-model") return <NewModelPage />;
  return <WoClosePage />;
}

