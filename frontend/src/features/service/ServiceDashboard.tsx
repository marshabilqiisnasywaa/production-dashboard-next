"use client";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { serviceOverviewGroups, servicePages, type ServiceKpiDefinition, type ServicePageKey } from "@/data/serviceData";

type ServiceChartItem = {
  label: string;
  target: number;
  actual: number;
};

function getStatus(current: number, target: number, higherIsBetter: boolean): "ok" | "warn" | "bad" {
  if (higherIsBetter) {
    if (current >= target) return "ok";
    if (current >= target * 0.97) return "warn";
    return "bad";
  }

  if (current <= target) return "ok";
  if (current <= target * 1.05) return "warn";
  return "bad";
}

function isOnTarget(actual: number, target: number, higherIsBetter: boolean) {
  return higherIsBetter ? actual >= target : actual <= target;
}

function Sparkline({ success }: { success: boolean }) {
  return <svg className="repair-spark" viewBox="0 0 112 35" preserveAspectRatio="none"><path d="M1 28 8 25 15 27 22 18 29 21 36 15 43 18 50 11 57 14 64 8 71 13 78 6 85 10 92 5 99 9 111 3" fill="none" stroke={success ? "var(--success)" : "var(--danger)"} strokeWidth="2"/><path d="M1 34V28L8 25 15 27 22 18 29 21 36 15 43 18 50 11 57 14 64 8 71 13 78 6 85 10 92 5 99 9 111 3V34Z" fill={success ? "var(--success-soft)" : "var(--danger-soft)"}/></svg>;
}

type ServiceChartPoint = ServiceChartItem & { higherIsBetter: boolean };

function ServiceTooltip({ active, payload, label, unit }: { active?: boolean; payload?: readonly { payload?: ServiceChartPoint }[]; label?: string; unit: string }) {
  if (!active || !payload?.[0]?.payload) return null;
  const point = payload[0].payload;
  return <div className="repair-tooltip"><strong>{label}</strong><div><span>Target</span><b>{point.target.toFixed(2)}{unit}</b></div><div><span>Actual</span><b>{point.actual.toFixed(2)}{unit}</b></div><div><span>Selisih</span><b>{(point.actual - point.target).toFixed(2)}{unit}</b></div></div>;
}

function ServiceStatusDot(props: { cx?: number; cy?: number; payload?: ServiceChartPoint }) {
  if (props.cx === undefined || props.cy === undefined || !props.payload) return <g />;
  const good = isOnTarget(props.payload.actual, props.payload.target, props.payload.higherIsBetter);
  return <circle cx={props.cx} cy={props.cy} r="4" fill={good ? "var(--success)" : "var(--danger)"} stroke="var(--card)" strokeWidth="2" />;
}

function ServiceKpiCard({
  item,
  onSelect,
  selected,
}: {
  item: { id: string; label: string; value: number; target: number };
  onSelect: (id: string) => void;
  selected: boolean;
}) {
  const status = getStatus(item.value, item.target, item.target >= 90 || item.label.toLowerCase().includes("pass") || item.label.toLowerCase().includes("rate"));
  const good = status === "ok";

  return (
    <button
      type="button"
      className={`repair-kpi status-${status} ${selected ? "service-selected" : ""}`}
      onClick={() => onSelect(item.id)}
      style={{ textAlign: "left", cursor: "pointer" }}
    >
      <div className="repair-kpi-top"><span>{item.label}</span><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? "On Target" : "Off Target"}</span></div>
      <strong>{item.value.toFixed(1)}%</strong>
      <p>Target: {item.target.toFixed(1)}%</p>
      <Sparkline success={good} />
    </button>
  );
}

function ServiceLineChart({
  id,
  title,
  data,
  targetValue,
  targetLabel,
  actualLabel,
  yMax,
  yTicks,
  unit = "%",
  selected,
}: {
  id: string;
  title: string;
  data: ServiceChartItem[];
  targetValue: number;
  targetLabel: string;
  actualLabel: string;
  yMax: number;
  yTicks: number[];
  unit?: string;
  selected: boolean;
}) {
  const [labels, setLabels] = useState(false);
  const chartData = data.map((point) => ({ ...point, target: targetValue, actual: point.actual }));
  const higherIsBetter = targetValue >= 90 || title.toLowerCase().includes("pass") || title.toLowerCase().includes("rate");

  return (
    <article id={id} className={`repair-panel metric-chart ${selected ? "service-chart-card-active" : ""}`}>
      <div className="repair-card-head">
        <div>
          <h2>{title}</h2>
          <p>Performa aktual terhadap target • 2025</p>
        </div>
        <label className="label-toggle"><input type="checkbox" checked={labels} onChange={(event) => setLabels(event.target.checked)} /><span />Tampilkan label</label>
      </div>

      <div className="line-chart-wrap service-chart-shell">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 18, right: 18, left: 6, bottom: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={0}
              height={42}
            />
            <YAxis
              domain={[0, yMax]}
              ticks={yTicks}
              tickFormatter={(value) => `${Number(value).toFixed(2)}${unit}`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ServiceTooltip unit={unit} />} cursor={{ stroke: "var(--line)" }} />
            <Legend
              verticalAlign="bottom"
              iconType="line"
              wrapperStyle={{ paddingTop: 8, marginTop: 0 }}
            />
            <Line
              type="monotone"
              dataKey="target"
              name={targetLabel}
              stroke="var(--success)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name={actualLabel}
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={(props) => <ServiceStatusDot {...props} />}
              isAnimationActive={false}
            >
              {labels && <LabelList dataKey="actual" position="top" className="repair-point-label" formatter={(value: number) => `${Number(value).toFixed(2)}${unit}`} />}
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="metric-chart-footer"><strong>Target dan actual untuk periode terpilih</strong><span>Nilai aktual dibandingkan dengan standar yang ditetapkan</span></div>
    </article>
  );
}

function ServiceOverview() {
  const [updatedAt, setUpdatedAt] = useState(() => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = () => {
    setUpdatedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
  };

  return (
    <div className="qc-page-shell">
      <header className="qc-page-header">
        <div>
          <div className="qc-kicker">Service</div>
          <h1>Service Overview</h1>
          <p>PIC: Ricky L</p>
        </div>
        <div className="qc-toolbar">
          <div className="qc-live">
            <span className="live-dot" />
            <span>Terakhir diperbarui: {updatedAt}</span>
          </div>
          <button className="qc-primary-button" onClick={refresh}>Muat Ulang</button>
        </div>
      </header>

      <div className="service-overview-grid">
        {serviceOverviewGroups.map((group) => (
          <article key={group.id} className="qc-card service-overview-card">
            <div className="qc-card-header compact">
              <div>
                <h3>{group.title}</h3>
                <p>{group.subtitle}</p>
              </div>
            </div>
            <div className="service-group-kpis">
              {group.kpis.map((item) => (
                <ServiceKpiCard
                  key={item.id}
                  item={{ ...item, target: item.target }}
                  selected={selectedId === item.id}
                  onSelect={(id) => {
                    setSelectedId(id);
                    const section = document.getElementById(`service-${id}`);
                    if (section) section.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ServicePage({ pageKey }: { pageKey: ServicePageKey }) {
  const [updatedAt, setUpdatedAt] = useState(() => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const page = servicePages[pageKey];

  useEffect(() => {
    if (!selectedChart) return;
    const block = document.getElementById(selectedChart);
    if (block) block.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedChart]);

  const cardConfigs = useMemo(() => {
    if (pageKey === "service-battery") {
      return [
        {
          id: "input-rate-battery",
          title: "Monitoring Battery Input",
          target: 2.0,
          targetLabel: "NG Rate",
          actualLabel: "Aktual NG",
          yMax: 2.5,
          yTicks: [0, 0.5, 1, 1.5, 2, 2.5],
          data: page.kpis[0].series,
        },
        {
          id: "pass-rate-repair-battery",
          title: "Repair Rate Battery",
          target: 98.0,
          targetLabel: "Standart repair",
          actualLabel: "Aktual repair",
          yMax: 100,
          yTicks: [0, 20, 40, 60, 80, 100],
          data: page.kpis[1].series,
        },
        {
          id: "pass-rate-qa-battery",
          title: "Monitoring penggunaan QA pass battery",
          target: 98.0,
          targetLabel: "NG rate",
          actualLabel: "Aktual NG",
          yMax: 100,
          yTicks: [0, 20, 40, 60, 80, 100],
          data: page.kpis[2].series,
        },
      ];
    }

    return page.kpis.map((item) => ({
      id: item.id,
      title: `Monitoring ${item.label}`,
      target: item.target,
      targetLabel: item.higherIsBetter ? "Standart" : "NG Rate",
      actualLabel: item.higherIsBetter ? "Aktual" : "Aktual NG",
      yMax: item.target >= 90 ? 100 : 2.5,
      yTicks: item.target >= 90 ? [0, 20, 40, 60, 80, 100] : [0, 0.5, 1, 1.5, 2, 2.5],
      data: item.series,
    }));
  }, [page, pageKey]);

  const pageTitle = pageKey === "service-battery" ? "Tabel Monitoring BATTERY Repair" : `Tabel Monitoring ${page.title.toUpperCase()}`;

  return (
    <div className="qc-page-shell">
      <header className="qc-page-header">
        <div>
          <div className="qc-kicker">Service / {page.title}</div>
          <h1>{page.title}</h1>
          <p>{page.subtitle}</p>
        </div>
        <div className="qc-toolbar">
          <div className="qc-live">
            <span className="live-dot" />
            <span>Terakhir diperbarui: {updatedAt}</span>
          </div>
          <button className="qc-primary-button" onClick={() => setUpdatedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))}>Muat Ulang</button>
        </div>
      </header>

      <div className="service-page-title">{pageTitle}</div>

      <div className="service-chart-grid">
        {cardConfigs.map((chart, index) => (
          <div key={chart.id} className={`service-chart-slot ${index % 2 === 1 ? "service-chart-second" : ""}`}>
            <ServiceLineChart
              id={chart.id}
              title={chart.title}
              data={chart.data}
              targetValue={chart.target}
              targetLabel={chart.targetLabel}
              actualLabel={chart.actualLabel}
              yMax={chart.yMax}
              yTicks={chart.yTicks}
              selected={selectedChart === chart.id}
            />
          </div>
        ))}
      </div>

      <div className="service-kpi-card-list">
        {page.kpis.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`oqc-metric-card status-${getStatus(item.series[item.series.length - 1].actual, item.target, item.higherIsBetter)} ${selectedChart === item.id ? "service-selected" : ""}`}
            onClick={() => {
              const target = document.getElementById(item.id);
              if (target) {
                setSelectedChart(item.id);
                target.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }}
            style={{ textAlign: "left", cursor: "pointer" }}
          >
            <span className="metric-accent" />
            <div className="oqc-metric-label">{item.label}</div>
            <div className="oqc-metric-value up">{item.series[item.series.length - 1].actual.toFixed(1)}%</div>
            <div className="oqc-metric-delta up">Target {item.target.toFixed(1)}%</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ServiceDashboard({ pageKey }: { pageKey: ServicePageKey }) {
  if (pageKey === "service-overview") return <ServiceOverview />;
  return <ServicePage pageKey={pageKey} />;
}


