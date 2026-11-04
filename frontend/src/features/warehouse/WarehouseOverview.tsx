"use client";
import { useUiText } from "@/locales/useUiText";

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
  const { text: uiText } = useUiText();
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{uiText(label)}</strong>
      {payload.map((entry) => (
        <div key={entry.name}>
          <i style={{ background: entry.color }} />
          <span>{entry.name}</span>
          <b>{Number(entry.value).toFixed(1)}{uiText(" days")}</b>
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
  const { text: uiText } = useUiText();
  const [rangeOpen, setRangeOpen] = useState(false);
  const [chartYear, setChartYear] = useState("2025");
  const [yearOpen, setYearOpen] = useState(false);
  const [activeBar, setActiveBar] = useState<number | null>(null);

  return (
    <>
      <div className="page-heading">
        <div><p>{uiText("WAREHOUSE ANALYTICS")}</p><h1>{uiText("Material overview")}</h1><span>{uiText("Track inventory health and clearance performance.")}</span></div>
        <div className="range-wrap">
          <button className="filter-pill" onClick={() => setRangeOpen(!rangeOpen)}><Icon name="calendar" size={15} />{uiText("Jun 10 – Jun 16")}<Icon name="chevron" size={12} /></button>
          {rangeOpen && <div className="range-menu"><button>{uiText("This week")}</button><button>{uiText("Last 30 days")}</button><button>{uiText("This quarter")}</button></div>}
        </div>
      </div>

      <div className="bento-top">
        <div className="stat-stack">
          <article className="glass-card stat-card focus-card">
            <div className="card-icon"><Icon name="boxes" /></div>
            <div className="stat-copy"><span>{uiText("Inventory DOH")}</span><strong>2.4 <small>{uiText("Days")}</small></strong><p><b>↓ 20%</b>{uiText(" from target 3.0 days")}</p></div>
            <span className="status active">{uiText("Active")}</span>
          </article>
          <article className="glass-card stat-card">
            <div className="card-icon warm"><Icon name="refresh" /></div>
            <div className="stat-copy"><span>{uiText("Clearance frequency")}</span><strong>12× <small>{uiText("/ Week")}</small></strong><p><b>↑ 9.1%</b>{uiText(" from last week")}</p></div>
            <span className="status active">{uiText("On track")}</span>
          </article>
        </div>

        <article className="glass-card chart-card">
          <div className="card-head">
            <div><h2>{uiText("Inventory coverage")}</h2><p>{uiText("Days on hand performance by day")}</p></div>
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
                <Bar dataKey="actual" name={uiText("Actual")} fill="var(--chart-1)" radius={6} maxBarSize={28}>
                  {chartData.map((item, index) => <Cell key={`actual-${item.day}`} opacity={activeBar === null || activeBar === index ? 1 : .6} />)}
                </Bar>
                <Bar dataKey="capacity" name={uiText("Capacity")} fill="var(--chart-2)" radius={6} maxBarSize={28}>
                  {chartData.map((item, index) => <Cell key={`capacity-${item.day}`} opacity={activeBar === null || activeBar === index ? 1 : .6} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer"><strong>{uiText("Trending up by 5.2% this month ")}<Icon name="trending" size={13} /></strong><span>{uiText("Showing inventory coverage for the last 7 days")}</span></div>
        </article>
      </div>

      <div className="bento-bottom">
        <article className="glass-card summary-card">
          <div className="card-head"><div><h2>{uiText("Warehouse summary")}</h2><p>{uiText("Live material flow status")}</p></div><button>{uiText("View report ")}<Icon name="arrow" size={14} /></button></div>
          <div className="summary-body">
            <div className="donut"><span><strong>94%</strong><small>{uiText("Optimized")}</small></span></div>
            <div className="summary-list">
              <div><span><i className="green" />{uiText("Regular material pull")}</span><strong>12</strong></div>
              <div><span><i className="primary" />{uiText("Optimized inventory")}</span><strong>8</strong></div>
              <div><span><i className="orange" />{uiText("Urgent restocking")}</span><strong>2</strong></div>
            </div>
          </div>
        </article>

        <article className="glass-card team-card">
          <div className="card-head"><div><h2>{uiText("Warehouse activity")}</h2><p>{uiText("Team and clearance progress")}</p></div><span className="live"><i />{uiText("Live")}</span></div>
          <div className="activity-metrics">
            <div><Icon name="users" /><span>{uiText("Active team")}<strong>18</strong></span></div>
            <div><Icon name="package" /><span>{uiText("Clearances today")}<strong>7</strong></span></div>
            <div><Icon name="alert" /><span>{uiText("Multi-clearance")}<strong className="orange-text">2</strong></span></div>
          </div>
          <div className="activity-foot"><div className="avatar-stack"><span>{uiText("AR")}</span><span>{uiText("DK")}</span><span>{uiText("NS")}</span><span>+5</span></div><p>{uiText("8 operators currently active")}</p><button>{uiText("Manage team")}</button></div>
        </article>
      </div>

      <article className="glass-card table-card">
        <div className="card-head"><div><h2>{uiText("Material inventory")}</h2><p>{uiText("Current stock and clearance status")}</p></div><button>{uiText("View all materials ")}<Icon name="arrow" size={14} /></button></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>{uiText("MATERIAL / BATCH")}</th><th>{uiText("CATEGORY")}</th><th>{uiText("INVENTORY DOH")}</th><th>{uiText("STATUS")}</th><th>{uiText("OWNER")}</th><th /></tr></thead>
            <tbody>
              {materials.map((item) => <tr key={item.id}>
                <td><strong>{item.name}</strong><small>{item.id}</small></td>
                <td>{item.category}</td><td>{item.doh}</td>
                <td><span className={`row-status ${item.status === "Low stock" ? "inactive" : ""}`}><i />{uiText(item.status)}</span></td>
                <td><span className={`owner ${item.color}`}>{item.owner}</span></td><td>•••</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
