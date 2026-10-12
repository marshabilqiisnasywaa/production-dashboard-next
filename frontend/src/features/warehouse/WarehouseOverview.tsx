"use client";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import Icon from "@/components/shell/Icon";

const chartData = [
  { day: "Mon", actual: 2.8, capacity: 3.4 },
  { day: "Tue", actual: 3.1, capacity: 3.6 },
  { day: "Wed", actual: 2.5, capacity: 3.2 },
  { day: "Thu", actual: 3.4, capacity: 3.8 },
  { day: "Fri", actual: 2.9, capacity: 3.5 },
  { day: "Sat", actual: 2.2, capacity: 3.0 },
  { day: "Sun", actual: 2.6, capacity: 3.3 },
];

const materials = [
  { name: "Battery Cell B117", id: "MAT-250614-091", category: "Battery", doh: "2.1 Days", status: "Active", owner: "AR", color: "primary" },
  { name: "PCB Mainboard P204", id: "MAT-250613-047", category: "Electronics", doh: "1.8 Days", status: "Low stock", owner: "DK", color: "violet" },
  { name: "Housing Frame H083", id: "MAT-250612-018", category: "External", doh: "3.4 Days", status: "Active", owner: "NS", color: "rose" },
  { name: "Camera Module C021", id: "MAT-250611-036", category: "Component", doh: "2.7 Days", status: "Active", owner: "RP", color: "cyan" },
];

type TooltipEntry = { name?: string; value?: number | string; color?: string };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: readonly TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((entry) => (
        <div key={entry.name}>
          <i style={{ background: entry.color }} />
          <span>{entry.name}</span>
          <b>{Number(entry.value).toFixed(1)} days</b>
        </div>
      ))}
    </div>
  );
}

function ChartLegend({ payload }: { payload?: readonly { value?: string; color?: string }[] }) {
  return (
    <div className="chart-legend">
      {payload?.map((entry) => <span key={entry.value}><i style={{ background: entry.color }} />{entry.value}</span>)}
    </div>
  );
}

export default function WarehouseOverview() {
  const [rangeOpen, setRangeOpen] = useState(false);
  const [chartYear, setChartYear] = useState("2025");
  const [yearOpen, setYearOpen] = useState(false);
  const [activeBar, setActiveBar] = useState<number | null>(null);

  return (
    <>
      <div className="page-heading">
        <div><p>WAREHOUSE ANALYTICS</p><h1>Material overview</h1><span>Track inventory health and clearance performance.</span></div>
        <div className="range-wrap">
          <button className="filter-pill" onClick={() => setRangeOpen(!rangeOpen)}><Icon name="calendar" size={15} />Jun 10 – Jun 16<Icon name="chevron" size={12} /></button>
          {rangeOpen && <div className="range-menu"><button>This week</button><button>Last 30 days</button><button>This quarter</button></div>}
        </div>
      </div>

      <div className="bento-top">
        <div className="stat-stack">
          <article className="glass-card stat-card focus-card">
            <div className="card-icon"><Icon name="boxes" /></div>
            <div className="stat-copy"><span>Inventory DOH</span><strong>2.4 <small>Days</small></strong><p><b>↓ 20%</b> from target 3.0 days</p></div>
            <span className="status active">Active</span>
          </article>
          <article className="glass-card stat-card">
            <div className="card-icon warm"><Icon name="refresh" /></div>
            <div className="stat-copy"><span>Clearance frequency</span><strong>12× <small>/ Week</small></strong><p><b>↑ 9.1%</b> from last week</p></div>
            <span className="status active">On track</span>
          </article>
        </div>

        <article className="glass-card chart-card">
          <div className="card-head">
            <div><h2>Inventory coverage</h2><p>Days on hand performance by day</p></div>
            <div className="year-filter">
              <button onClick={() => setYearOpen(!yearOpen)}>{chartYear}<Icon name="chevron" size={12} /></button>
              {yearOpen && <div>{["2025", "2024", "2023"].map((year) => <button key={year} onClick={() => { setChartYear(year); setYearOpen(false); }}>{year}{chartYear === year && <b>✓</b>}</button>)}</div>}
            </div>
          </div>
          <div className="recharts-wrap" onMouseLeave={() => setActiveBar(null)}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4} barCategoryGap="28%" onMouseMove={(state) => setActiveBar(typeof state?.activeTooltipIndex === "number" ? state.activeTooltipIndex : null)}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--chart-cursor)" }} />
                <Legend verticalAlign="bottom" content={<ChartLegend />} />
                <Bar dataKey="actual" name="Actual" fill="var(--chart-1)" radius={6} maxBarSize={28}>
                  {chartData.map((item, index) => <Cell key={`actual-${item.day}`} opacity={activeBar === null || activeBar === index ? 1 : .6} />)}
                </Bar>
                <Bar dataKey="capacity" name="Capacity" fill="var(--chart-2)" radius={6} maxBarSize={28}>
                  {chartData.map((item, index) => <Cell key={`capacity-${item.day}`} opacity={activeBar === null || activeBar === index ? 1 : .6} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer"><strong>Trending up by 5.2% this month <Icon name="trending" size={13} /></strong><span>Showing inventory coverage for the last 7 days</span></div>
        </article>
      </div>

      <div className="bento-bottom">
        <article className="glass-card summary-card">
          <div className="card-head"><div><h2>Warehouse summary</h2><p>Live material flow status</p></div><button>View report <Icon name="arrow" size={14} /></button></div>
          <div className="summary-body">
            <div className="donut"><span><strong>94%</strong><small>Optimized</small></span></div>
            <div className="summary-list">
              <div><span><i className="green" />Regular material pull</span><strong>12</strong></div>
              <div><span><i className="primary" />Optimized inventory</span><strong>8</strong></div>
              <div><span><i className="orange" />Urgent restocking</span><strong>2</strong></div>
            </div>
          </div>
        </article>

        <article className="glass-card team-card">
          <div className="card-head"><div><h2>Warehouse activity</h2><p>Team and clearance progress</p></div><span className="live"><i />Live</span></div>
          <div className="activity-metrics">
            <div><Icon name="users" /><span>Active team<strong>18</strong></span></div>
            <div><Icon name="package" /><span>Clearances today<strong>7</strong></span></div>
            <div><Icon name="alert" /><span>Multi-clearance<strong className="orange-text">2</strong></span></div>
          </div>
          <div className="activity-foot"><div className="avatar-stack"><span>AR</span><span>DK</span><span>NS</span><span>+5</span></div><p>8 operators currently active</p><button>Manage team</button></div>
        </article>
      </div>

      <article className="glass-card table-card">
        <div className="card-head"><div><h2>Material inventory</h2><p>Current stock and clearance status</p></div><button>View all materials <Icon name="arrow" size={14} /></button></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>MATERIAL / BATCH</th><th>CATEGORY</th><th>INVENTORY DOH</th><th>STATUS</th><th>OWNER</th><th /></tr></thead>
            <tbody>
              {materials.map((item) => <tr key={item.id}>
                <td><strong>{item.name}</strong><small>{item.id}</small></td>
                <td>{item.category}</td><td>{item.doh}</td>
                <td><span className={`row-status ${item.status === "Low stock" ? "inactive" : ""}`}><i />{item.status}</span></td>
                <td><span className={`owner ${item.color}`}>{item.owner}</span></td><td>•••</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
