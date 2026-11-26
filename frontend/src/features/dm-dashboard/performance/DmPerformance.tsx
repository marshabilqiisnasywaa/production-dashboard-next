"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Segmented } from "../scorecard/components";
import { FilterPortalContext, FilterSelect } from "../scorecard/ScorecardFilters";
import { Card } from "../scorecard/ui";
import "../scorecard/dm-scorecard.css";
import PerformanceTable from "./PerformanceTable";
import {
  METRICS,
  MONTHS,
  filledMonths,
  fmt,
  latestYear,
  loadStore,
  meets,
  periodValue,
  type MetricConfig,
  type MetricKey,
  type PerfStore,
  type YearData,
} from "./performanceModel";

/* ===================== HELPER SKALA ===================== */

function niceStep(range: number, count = 4) {
  const raw = range / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

function buildScale(values: number[]) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, Math.abs(hi) * 0.05, 1);
  const step = niceStep(span * 1.6);
  const min = Math.max(0, Math.floor((lo - span * 0.3) / step) * step);
  const max = Math.ceil((hi + span * 0.3) / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min, max: ticks[ticks.length - 1], ticks };
}

/* ===================== GRAFIK ===================== */

function MetricChart({
  metric,
  data,
  months,
  year,
  height,
  showValues,
  selected,
}: {
  metric: MetricConfig;
  data: YearData;
  months: number[];
  year: string;
  height: number;
  showValues: boolean;
  selected: number | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const update = () => setWidth(Math.max(480, wrap.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [months]);

  const used = months.filter((i) => data[metric.key].actual[i] !== null && data[metric.key].target[i] !== null);
  const actual = used.map((i) => data[metric.key].actual[i] as number);
  const target = used.map((i) => data[metric.key].target[i] as number);
  const labels = used.map((i) => MONTHS[i]);
  const count = actual.length;
  if (count === 0) return <div ref={wrapRef} className="py-10 text-center text-sm text-text-secondary">Belum ada data</div>;
  const scale = buildScale([...actual, ...target]);
  const pad = { top: 24, right: 92, bottom: 34, left: 52 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const inset = 22; // ruang supaya angka di titik ujung tidak menabrak label sumbu
  const step = (plotWidth - inset * 2) / Math.max(1, count - 1);
  const x = (i: number) => (count === 1 ? pad.left + plotWidth / 2 : pad.left + inset + i * step);
  const y = (v: number) => pad.top + ((scale.max - v) / (scale.max - scale.min)) * plotHeight;
  const isOk = (i: number) => meets(metric, actual[i], target[i]) !== false;
  const hovered = hover !== null && hover < count ? hover : null;
  const baseline = height - pad.bottom;
  const actualPoints = actual.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const targetPoints = target.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const lastTarget = target[count - 1];
  const gradientId = `perf-fill-${metric.key}`;

  const handlePointer = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const position = ((event.clientX - rect.left) / rect.width) * width;
    const index = count === 1 ? 0 : Math.round((position - pad.left - inset) / step);
    setHover(Math.max(0, Math.min(count - 1, index)));
  };

  const tooltipWidth = 176;
  const gap = hovered === null ? 0 : actual[hovered] - target[hovered];
  const gapUnit = metric.unit === "%" ? " poin" : " unit";
  let tooltipLeft = 0;
  if (hovered !== null) {
    const preferred = x(hovered) > width / 2 ? x(hovered) - 12 - tooltipWidth : x(hovered) + 12;
    tooltipLeft = Math.max(4, Math.min(preferred, width - tooltipWidth - 4));
  }

  return (
    <div ref={wrapRef} className="relative w-full overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
        style={{ touchAction: "pan-y" }}
        role="img"
        aria-label={`Tren bulanan ${metric.key} ${year}`}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setHover(null);
        }}
      >
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1={pad.top} x2="0" y2={baseline}>
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-border)" />
            <text x={pad.left - 10} y={y(tick) + 4} textAnchor="end" className="fill-text-secondary text-tab">
              {fmt(tick, metric.unit, 1)}
            </text>
          </g>
        ))}

        <polygon points={`${x(0)},${baseline} ${actualPoints} ${x(count - 1)},${baseline}`} fill={`url(#${gradientId})`} />
        <polyline points={targetPoints} fill="none" stroke="var(--color-warning)" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={width - pad.right + 8} y={y(lastTarget) + 4} className="fill-warning-dark text-xs font-semibold">
          Target {fmt(lastTarget, metric.unit, 1)}
        </text>
        <polyline
          points={actualPoints}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hovered !== null && (
          <line x1={x(hovered)} x2={x(hovered)} y1={pad.top} y2={baseline} stroke="var(--color-border-strong)" />
        )}

        {actual.map((value, i) => (
          <circle
            key={used[i]}
            cx={x(i)}
            cy={y(value)}
            r={hovered === i || selected === used[i] ? 6 : 3.5}
            fill={isOk(i) ? "var(--color-primary)" : "var(--color-warning)"}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        ))}

        {showValues &&
          actual.map((value, i) => (
            // angka diletakkan menjauhi garis target supaya tidak bertumpuk
            <text
              key={used[i]}
              x={x(i)}
              y={value >= target[i] ? y(value) - 10 : y(value) + 19}
              textAnchor="middle"
              className={`text-xs font-semibold ${isOk(i) ? "fill-text" : "fill-warning-dark"}`}
              style={{ paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 3 }}
            >
              {fmt(value, metric.unit, metric.decimals.actual)}
            </text>
          ))}

        {labels.map((month, i) => (
          <text key={month} x={x(i)} y={baseline + 20} textAnchor="middle" className="fill-text-secondary text-tab">
            {month}
          </text>
        ))}
      </svg>

      {hovered !== null && (
        <div
          className="pointer-events-none absolute z-10 w-44 rounded-lg border border-border bg-white p-3 text-xs shadow-popover"
          style={{ left: tooltipLeft, top: 8 }}
        >
          <div className="font-semibold text-text">
            {labels[hovered]} {year}
          </div>
          <div className="mt-1.5 flex justify-between gap-3 font-bold text-text">
            <span>Aktual</span>
            <span>{fmt(actual[hovered], metric.unit, 1)}</span>
          </div>
          <div className="mt-0.5 flex justify-between gap-3 text-text-secondary">
            <span>Target</span>
            <span>{metric.dir === "max" ? "≤ " : ""}{fmt(target[hovered], metric.unit, 1)}</span>
          </div>
          <div
            className={`mt-1.5 border-t border-border pt-1.5 font-semibold ${
              isOk(hovered) ? "text-primary" : "text-warning-dark"
            }`}
          >
            {isOk(hovered)
              ? "Memenuhi target"
              : `${fmt(Math.abs(gap), "", 1)}${gapUnit} ${gap > 0 ? "di atas" : "di bawah"} target`}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== KARTU RINGKASAN (bilangan bulat) ===================== */

function MetricTile({
  metric,
  data,
  months,
  periodLabel,
  active,
  onSelect,
}: {
  metric: MetricConfig;
  data: YearData;
  months: number[];
  periodLabel: string;
  active: boolean;
  onSelect: () => void;
}) {
  const total = periodValue(data[metric.key], months);
  const ok = meets(metric, total.actual, total.target);
  const tone = ok === false ? "text-danger" : "text-primary";
  const whole = (value: number | null) => fmt(value === null ? null : Math.round(value), metric.unit, 0);

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`flex min-w-0 flex-col gap-3 rounded-xl border bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 ${
        active ? "border-primary ring-2 ring-primary-soft" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm font-bold ${
            ok === false ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"
          }`}
        >
          {metric.letter}
        </span>
        <span className="truncate text-xs uppercase tracking-wide text-text-secondary">
          {metric.key} · {periodLabel}
        </span>
      </div>
      <div className={`text-2xl font-semibold leading-none tabular-nums ${tone}`}>{whole(total.actual)}</div>
      <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs">
        <span className="text-text-secondary">
          Target: {metric.dir === "max" ? "≤ " : ""}{whole(total.target)}
        </span>
        {ok !== null && <span className={`font-medium ${tone}`}>{ok ? "On Target" : "Off Target"}</span>}
      </div>
    </button>
  );
}

/* ===================== HALAMAN TAB ===================== */

const ALL_MONTHS = "Semua bulan";

// Tab Q1 sampai Q4 selalu tampil. Q yang belum ada datanya menampilkan "Belum ada data".
const QUARTERS = [
  { label: "Q1", months: [0, 1, 2] },
  { label: "Q2", months: [3, 4, 5] },
  { label: "Q3", months: [6, 7, 8] },
  { label: "Q4", months: [9, 10, 11] },
];

export default function DmPerformance() {
  const [store, setStore] = useState<PerfStore | null>(null);
  const [yearSel, setYearSel] = useState("");
  const [period, setPeriod] = useState("");
  const [month, setMonth] = useState(ALL_MONTHS);
  const [focus, setFocus] = useState<MetricKey | null>(null);
  const [showValues, setShowValues] = useState(true);
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const sync = () => setStore(loadStore());
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // Daftar tahun diambil dari data yang tersimpan (terbaru di atas)
  const years = store ? Object.keys(store).sort().reverse() : [];
  const year = store ? (yearSel in store ? yearSel : latestYear(store)) : "";
  const data = store ? store[year] : null;
  const filled = useMemo(() => (data ? filledMonths(data) : []), [data]);
  const quarter = QUARTERS.find((q) => q.label === period);
  // Untuk Q, hanya bulan yang sudah terisi yang dipakai (Q4 yang baru terisi Okt = hanya Okt)
  const months = useMemo(
    () => (quarter ? quarter.months.filter((i) => filled.includes(i)) : filled),
    // isi Q selalu sama untuk label yang sama
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filled, quarter?.label]
  );

  if (!data) return null;

  const selected = month === ALL_MONTHS ? null : MONTHS.indexOf(month);
  const latest = filled[filled.length - 1];
  // Kartu: bulan terpilih, atau rata-rata Q, atau bulan terakhir saat melihat setahun
  const cardMonths = selected !== null ? [selected] : quarter ? months : latest !== undefined ? [latest] : [];
  const cardLabel = selected !== null ? month : quarter ? quarter.label : MONTHS[latest] ?? "-";
  const shown = focus ? METRICS.filter((m) => m.key === focus) : METRICS;

  return (
    <FilterPortalContext.Provider value={portalEl}>
      <div ref={setPortalEl} className="pb-8">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">KPI Achievement</h1>
            <p className="mt-1 text-sm text-text-secondary">Tren bulanan OTP, Output, WIP, dan OPE tahun {year}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              ariaLabel="Pilih tahun"
              value={year}
              options={years}
              onChange={(next) => {
                setYearSel(next);
                setPeriod("");
                setMonth(ALL_MONTHS);
              }}
            />
            <FilterSelect
              ariaLabel="Pilih bulan"
              value={month}
              options={[ALL_MONTHS, ...months.map((i) => MONTHS[i])]}
              onChange={setMonth}
            />
            <div className="max-w-full overflow-x-auto">
              <Segmented<string>
                items={QUARTERS.map((q) => q.label)}
                value={quarter ? quarter.label : ""}
                onChange={(next) => {
                  // klik Q yang sedang aktif = kembali ke tampilan setahun
                  setPeriod(next === period ? "" : next);
                  setMonth(ALL_MONTHS);
                }}
              />
            </div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {METRICS.map((metric) => (
            <MetricTile
              key={metric.key}
              metric={metric}
              data={data}
              months={cardMonths}
              periodLabel={cardLabel}
              active={focus === metric.key}
              onSelect={() => setFocus(focus === metric.key ? null : metric.key)}
            />
          ))}
        </div>

        <div className={`grid gap-4 ${focus ? "" : "xl:grid-cols-2"}`}>
          {shown.map((metric) => (
            <Card key={metric.key} className="min-w-0 p-5">
              <div className="mb-2 font-bold text-text">{metric.key}</div>
              <MetricChart
                metric={metric}
                data={data}
                months={months}
                year={year}
                height={focus ? 450 : 300}
                showValues={showValues}
                selected={selected}
              />
            </Card>
          ))}
        </div>

        <Card className="mt-4 min-w-0 p-5">
          <div className="mb-3 font-bold text-text">Detail KPI {year}</div>
          <PerformanceTable
            year={year}
            data={data}
            highlight={selected !== null ? [selected] : quarter ? quarter.months : []}
          />
        </Card>
      </div>
    </FilterPortalContext.Provider>
  );
}