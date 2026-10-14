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
import ChartTooltip from "@/components/shell/ChartTooltip";
import PicAiInsight from "@/features/pic-repair/PicAiInsight";
import PeriodControl, { periodView, type PeriodKey } from "@/components/shell/PeriodControl";

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

function ServiceStatusDot(props: { cx?: number; cy?: number; payload?: ServiceChartPoint }) {
  if (props.cx === undefined || props.cy === undefined || !props.payload) return <g />;
  const good = isOnTarget(props.payload.actual, props.payload.target, props.payload.higherIsBetter);
  return <circle cx={props.cx} cy={props.cy} r="4" fill={good ? "var(--success)" : "var(--danger)"} stroke="var(--card)" strokeWidth="2" />;
}

function ServiceKpiCard({
  item,
  onSelect,
  selected,
  higherIsBetter,
  onAsk,
}: {
  item: { id: string; label: string; value: number; target: number };
  onSelect: (id: string) => void;
  selected: boolean;
  higherIsBetter?: boolean;
  onAsk?: (kpi: { label: string; value: number; target: number; higherIsBetter: boolean }) => void;
}) {
  const status = getStatus(item.value, item.target, item.target >= 90 || item.label.toLowerCase().includes("pass") || item.label.toLowerCase().includes("rate"));
  const good = status === "ok";

  return (
    <article
      className={`repair-kpi status-${status} bg-white! border border-gray-200/80! rounded-xl! ${selected ? "service-selected" : ""}`}
      onClick={() => onSelect(item.id)}
      style={{ textAlign: "left", cursor: "pointer" }}
    >
      <div className="repair-kpi-top"><span>{item.label}</span><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? "On Target" : "Off Target"}</span></div>
      <strong className="text-2xl! font-bold!">{item.value.toFixed(1)}%</strong>
      <p>Target: {item.target.toFixed(1)}%</p>
      {!good && onAsk && (
        <div className="pic-kpi-actions">
          <button type="button" className="pic-ai-btn" onClick={(event) => { event.stopPropagation(); onAsk({ label: item.label, value: item.value, target: item.target, higherIsBetter: higherIsBetter ?? true }); }}>Ask AI</button>
        </div>
      )}
      <Sparkline success={good} />
    </article>
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
  const [period, setPeriod] = useState<PeriodKey>("Week");
  const view = periodView(data.map((point) => point.label), data.map((point) => point.actual), period);
  const chartData = view.labels.map((label, index) => ({ label, target: targetValue, actual: view.values[index] ?? 0 }));
  const higherIsBetter = targetValue >= 90 || title.toLowerCase().includes("pass") || title.toLowerCase().includes("rate");

  return (
    <article id={id} className={`repair-panel metric-chart ${selected ? "service-chart-card-active" : ""}`}>
      <div className="repair-card-head">
        <div>
          <h2>{title}</h2>
          <p>Actual performance vs target • 2025</p>
        </div>
        <div className="flex items-center justify-end gap-4"><label className="label-toggle flex items-center gap-2 text-xs text-slate-500 font-medium"><input type="checkbox" checked={labels} onChange={(event) => setLabels(event.target.checked)} /><span />Show labels</label><PeriodControl value={period} onChange={setPeriod} /></div>
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
            <Tooltip content={<ChartTooltip format={(value) => `${Number(value).toFixed(2)}${unit}`} />} cursor={{ stroke: "var(--line)" }} />
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
      <div className="metric-chart-footer"><strong>Target and actual for the selected period</strong><span>Actual values compared against defined standards</span></div>
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
        </div>
        <div className="qc-toolbar">
          <div className="qc-live">
            <span className="live-dot" />
            <span>Last updated: {updatedAt}</span>
          </div>
          <button className="qc-primary-button" onClick={refresh}>Reload</button>
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
  const [aiKpi, setAiKpi] = useState<{ label: string; value: number; target: number; higherIsBetter: boolean } | null>(null);
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
          title: "Battery Input Monitoring",
          target: 2.0,
          targetLabel: "NG Rate",
          actualLabel: "Actual NG",
          yMax: 2.5,
          yTicks: [0, 0.5, 1, 1.5, 2, 2.5],
          data: page.kpis[0].series,
        },
        {
          id: "pass-rate-repair-battery",
          title: "Battery Repair Rate",
          target: 98.0,
          targetLabel: "Repair Standard",
          actualLabel: "Actual Repair",
          yMax: 100,
          yTicks: [0, 20, 40, 60, 80, 100],
          data: page.kpis[1].series,
        },
        {
          id: "pass-rate-qa-battery",
          title: "Battery QA Pass Monitoring",
          target: 98.0,
          targetLabel: "NG Rate",
          actualLabel: "Actual NG",
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
      targetLabel: item.higherIsBetter ? "Standard" : "NG Rate",
      actualLabel: item.higherIsBetter ? "Actual" : "Actual NG",
      yMax: item.target >= 90 ? 100 : 2.5,
      yTicks: item.target >= 90 ? [0, 20, 40, 60, 80, 100] : [0, 0.5, 1, 1.5, 2, 2.5],
      data: item.series,
    }));
  }, [page, pageKey]);

  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MONITORING • DEEP DIVE</div>
          <div className="repair-title-row"><h1 className="text-2xl font-bold tracking-tight text-slate-900">{page.title}</h1></div>
          <p>{page.subtitle}</p>
        </div>
        <div className="repair-actions">
          <div className="qc-live">
            <span className="live-dot" />
            <span>Last updated: {updatedAt}</span>
          </div>
          <button className="qc-primary-button" onClick={() => setUpdatedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))}>Reload</button>
        </div>
      </div>

      <div className="repair-kpis">
        {page.kpis.map((item) => (
          <ServiceKpiCard
            key={item.id}
            item={{ id: item.id, label: item.label, value: item.series[item.series.length - 1].actual, target: item.target }}
            selected={selectedChart === item.id}
            onSelect={(id) => setSelectedChart(id)}
            higherIsBetter={item.higherIsBetter}
            onAsk={(kpi) => setAiKpi(kpi)}
          />
        ))}
      </div>

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

      {aiKpi && (
        <PicAiInsight
          metricName={aiKpi.label}
          actualLabel={`${aiKpi.value.toFixed(1)}%`}
          targetLabel={`${aiKpi.target.toFixed(1)}%`}
          gapLabel={`${Math.abs(aiKpi.value - aiKpi.target).toFixed(2)}%`}
          direction={aiKpi.higherIsBetter ? "higher" : "lower"}
          onClose={() => setAiKpi(null)}
        />
      )}
    </div>
  );
}

export default function ServiceDashboard({ pageKey }: { pageKey: ServicePageKey }) {
  if (pageKey === "service-overview") return <ServiceOverview />;
  return <ServicePage pageKey={pageKey} />;
}


