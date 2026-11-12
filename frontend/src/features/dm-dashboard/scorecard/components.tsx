"use client";
import { useUiText } from "@/locales/useUiText";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  Info,
  Search,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge, Button, Card, Input, Select } from "./ui";
import {
  formatScore,
  scoreBar,
  type ScoreDetailItem,
  type ScoreTrend,
} from "./data";
import { formatTrendDate, type SqdipTrend } from "./sqdipTrend";
import type { DimKey } from "../admin/sqdip/sqdipModel";
import type { PapercardRow, StandupRow, TrendSeries } from "./useScorecardData";
import "./dm-scorecard.css";
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  className = "",
  labels,
}: {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className={`scorecard-segment ${className}`}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={value === item}
          className={value === item ? "is-active" : ""}
          onClick={() => onChange(item)}
        >
          {labels?.[item] ?? item}
        </button>
      ))}
    </div>
  );
}

export function ScoreProgress({
  value,
  max = 100,
}: {
  value: number;
  max?: number;
  target?: number;
}) {
  const percent = Math.min(100, (value / max) * 100);
  return (
    <div className="scorecard-kpi-progress">
      <div className="scorecard-kpi-progress-bar">
        <div
          className={`scorecard-kpi-progress-fill ${scoreBar(
            (value / max) * 100
          )}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function SummaryScoreCard({
  title,
  icon: Icon,
  highlighted = false,
  value,
  max,
  targetEquivalent,
}: {
  title: string;
  icon: LucideIcon;
  highlighted?: boolean;
  value?: number;
  max: number;
  detail?: ScoreDetailItem[];
  expanded?: boolean;
  onExpand?: () => void;
  targetEquivalent: number;
  totalComposition?: { before: number; current: number; after: number };
  rank?: number;
}) {
  const { text: uiText } = useUiText();
  const normalized = value === undefined ? 0 : (value / max) * 100;
  const [titleText, subtitle] = title.split(" · ");
  const iconTone =
    value === undefined
      ? "neutral"
      : normalized >= 90
      ? "ok"
      : normalized >= 80
      ? "warn"
      : "bad";
  return (
    <Card
      className={`scorecard-kpi flex h-full flex-col${
        highlighted ? " scorecard-kpi--primary" : ""
      }`}
    >
      <div className="scorecard-kpi-main">
        <div className="scorecard-kpi-head">
          <div className="min-w-0">
            <div className="scorecard-kpi-title">{uiText(titleText)}</div>
            {subtitle && (
              <div className="scorecard-kpi-subtitle">{uiText(subtitle)}</div>
            )}
          </div>
          <span
            className={`scorecard-kpi-icon scorecard-kpi-icon--${iconTone}`}
          >
            <Icon size={16} strokeWidth={2} />
          </span>
        </div>
        <div className="scorecard-kpi-value">
          {value === undefined ? "—" : formatScore(value)}{" "}
          <span className="scorecard-kpi-value-suffix">
            / {formatScore(max)}
          </span>
        </div>
        {value === undefined && (
          <div className="scorecard-kpi-hint">{uiText("Belum ada data")}</div>
        )}
        {value === undefined ? (
          <div className="scorecard-kpi-progress scorecard-kpi-progress--empty">
            <div className="scorecard-kpi-progress-bar" />
          </div>
        ) : (
          <ScoreProgress value={value} max={max} target={targetEquivalent} />
        )}
      </div>
    </Card>
  );
}

export function ScoreGauge({
  dm,
  score,
  leader,
  rank,
  gap,
  selected,
  onClick,
}: {
  dm: string;
  score?: number;
  leader?: string;
  rank?: number;
  gap?: number;
  selected: boolean;
  onClick: () => void;
}) {
  const { text: uiText } = useUiText();
  const color =
    score === undefined
      ? "var(--color-border)"
      : score >= 90
      ? "var(--color-primary)"
      : score >= 80
      ? "var(--color-warning)"
      : "var(--color-danger)";
  const arc = score === undefined ? 0 : Math.min(100, score) * 1.57;
  return (
    <Card
      onClick={onClick}
      className={`score-gauge cursor-pointer p-3 transition hover:-translate-y-0.5 hover:shadow-popover ${
        selected ? "border-primary ring-2 ring-primary-soft" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-text">
          {dm}
          <span
            title={uiText(
              "Nilai DM dihitung dari data level DM milik Leader DM, sehingga bisa berbeda dari nilai line yang dipimpinnya di tabel ranking."
            )}
          >
            <Info size={14} className="text-text-secondary" />
          </span>
        </div>
        {selected && <Badge tone="primary">{uiText("Dipilih")}</Badge>}
      </div>
      <div className="score-gauge-body">
        <div className="score-gauge-visual">
          <svg
            viewBox="0 0 200 112"
            className="mx-auto mt-1 w-full max-w-56"
            role="img"
            aria-label={uiText("Nilai {{v0}}", { v0: dm })}
          >
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={score === undefined ? "3 7" : undefined}
            />
            {score !== undefined && (
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke={color}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${arc} 157`}
              />
            )}
            <line
              x1="175"
              y1="62"
              x2="185"
              y2="57"
              stroke="var(--color-text)"
              strokeWidth="3"
            />
            <text
              x="100"
              y="88"
              textAnchor="middle"
              className="fill-text text-3xl font-bold"
            >
              {score === undefined ? "—" : formatScore(score)}
            </text>
            <text
              x="100"
              y="108"
              textAnchor="middle"
              className="fill-text-secondary text-xs"
            >
              {uiText("Target 90")}
            </text>
          </svg>
        </div>
        {leader ? (
          <div className="score-gauge-info mt-2 grid grid-rows-4 gap-1 border-t border-border pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">{uiText("Ass SPV")}</span>
              <strong>{uiText("Ikhwan")}</strong>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-text-secondary">{uiText("Leader DM")}</span>
              <strong className="text-right">{leader}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">
                {uiText("Peringkat DM")}
              </span>
              <strong>{rank}</strong>
            </div>
            <div className="text-warning-dark">
              {uiText("Kurang ")}
              {formatScore(gap ?? 0)}
              {uiText(" poin dari target")}
            </div>
          </div>
        ) : (
          <div className="score-gauge-info mt-2 flex items-start justify-center border-t border-border pt-4 text-center text-sm text-text-secondary">
            {uiText("Belum ada Leader DM")}
          </div>
        )}
      </div>
    </Card>
  );
}
const TREND_LABEL = {
  Total: "Total",
  Before: "Papercard",
  Current: "Standup Meeting",
  After: "SQDIP",
} as const;

const TREND_TARGET = { Total: 90, Before: 27, Current: 36, After: 27 } as const;
const TREND_CAP = { Total: 100, Before: 30, Current: 40, After: 30 } as const;

function niceStep(range: number, count = 5) {
  const raw = range / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

// Skala mengikuti data + target, jadi garis ada di tengah area grafik
function buildScale(series: number[], target: number, cap: number) {
  const lo = Math.min(...series, target);
  const hi = Math.max(...series, target);
  const span = Math.max(hi - lo, cap * 0.1);
  const pad = span * 0.5;
  const step = niceStep(span + pad * 2);
  const min = Math.max(0, Math.floor((lo - pad) / step) * step);
  const max = Math.ceil((hi + pad) / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= Math.min(max, cap) + 1e-9; v += step)
    ticks.push(Math.round(v * 100) / 100);
  return { min, max, target, ticks };
}

// Skala untuk dimensi angka bulat (Safety, Inventory): mulai dari 0, tick bilangan bulat
function buildIntScale(series: number[], target: number) {
  const top = Math.max(...series, target, 0);
  const range = Math.max(top * 1.15, 4);
  const step = Math.max(1, Math.ceil(niceStep(range)));
  const max = Math.ceil(range / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step)
    ticks.push(Math.round(v * 100) / 100);
  return { min: 0, max, target, ticks };
}

export function formatSqdipValue(value: number, kind: SqdipTrend["kind"]) {
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}${
    kind === "pct" ? "%" : ""
  }`;
}

export const SQDIP_DIMS: DimKey[] = [
  "Safety",
  "Quality",
  "Delivery",
  "Inventory",
  "Productivity",
];
const SQDIP_LETTER: Record<string, string> = {
  Safety: "S",
  Quality: "Q",
  Delivery: "D",
  Inventory: "I",
  Productivity: "P",
};

// Ukuran bagian SQDIP di kartu Tren. Ubah angka ini kalau mau lebih tinggi/rendah.
const SQDIP_TILE_HEIGHT = 120;
const SQDIP_TILE_TOP_GAP = 20;
const SQDIP_CHART_HEIGHT = 450;

// Lima kotak S/Q/D/I/P. Aktual = rata-rata pada periode terpilih. Klik kotak untuk mengganti grafik.
export function SqdipDimTiles({
  tiles,
  selected,
  onSelect,
}: {
  tiles: { key: DimKey; trend: SqdipTrend }[];
  selected: DimKey;
  onSelect: (key: DimKey) => void;
}) {
  const { text: uiText } = useUiText();
  return (
    <div
      className="grid grid-cols-5 gap-2 sm:gap-3"
      style={{ marginTop: SQDIP_TILE_TOP_GAP }}
    >
      {tiles.map(({ key, trend }) => {
        const actual = trend.series.length
          ? trend.series.reduce((sum, value) => sum + value, 0) /
            trend.series.length
          : null;
        const ok =
          actual === null
            ? null
            : trend.dir === "max"
            ? actual <= trend.target
            : actual >= trend.target;
        const active = key === selected;
        const chipTone =
          ok === null
            ? "bg-section text-text-secondary"
            : ok
            ? "bg-primary-soft text-primary"
            : "bg-danger-soft text-danger";
        const valueTone =
          ok === null
            ? "text-text-secondary"
            : ok
            ? "text-primary"
            : "text-danger";
        return (
          <button
            key={key}
            type="button"
            title={uiText(key)}
            aria-pressed={active}
            onClick={() => onSelect(key)}
            className={`flex min-w-0 flex-col justify-between rounded-xl border bg-white px-3 py-2.5 text-left transition hover:-translate-y-0.5 ${
              active
                ? "border-primary ring-2 ring-primary-soft"
                : "border-border"
            }`}
            style={{ height: SQDIP_TILE_HEIGHT }}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm font-bold ${chipTone}`}
              >
                {SQDIP_LETTER[key] ?? key[0]}
              </span>
              <span
                className="truncate pt-0.5 font-light uppercase tracking-wide text-text-secondary"
                style={{ fontSize: 10 }}
              >
                {key}
              </span>
            </div>
            <div
              className={`text-xl font-semibold leading-none ${valueTone}`}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {actual === null ? "—" : formatSqdipValue(actual, trend.kind)}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-text-secondary">
                {uiText("Target : ")}
                {trend.dir === "max" ? "≤ " : ""}
                {formatSqdipValue(trend.target, trend.kind)}
              </span>
              {ok !== null && (
                <span
                  className={`flex shrink-0 items-center gap-1 font-medium ${valueTone}`}
                  style={{ fontSize: 10 }}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                  {ok ? uiText("On Target") : uiText("Off Target")}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function TrendChart({
  metric,
  custom,
  trend,
  granularity = "Harian",
}: {
  metric: ScoreTrend;
  custom?: SqdipTrend;
  trend?: TrendSeries;
  granularity?: "Harian" | "Mingguan" | "Bulanan";
}) {
  const { text: uiText, locale: uiLocale } = useUiText();
  const seriesByMetric = {
    Total: trend?.total ?? [],
    Before: trend?.before ?? [],
    Current: trend?.current ?? [],
    After: trend?.after ?? [],
  };
  const series = custom ? custom.series : seriesByMetric[metric];
  const scale = custom
    ? custom.kind === "int"
      ? buildIntScale(series, custom.target)
      : buildScale(
          series,
          custom.target,
          custom.kind === "pct"
            ? 100
            : Math.max(1, Math.max(...custom.series, custom.target) * 1.5)
        )
    : buildScale(series, TREND_TARGET[metric], TREND_CAP[metric]);
  const fmt = (value: number) =>
    custom
      ? formatSqdipValue(value, custom.kind)
      : value.toLocaleString(uiLocale);
  const meetsTarget = (value: number) =>
    custom?.dir === "max" ? value <= scale.target : value >= scale.target;
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 700, height: 320 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;
    const update = () => {
      const rect = svg.getBoundingClientRect();
      setSize({
        width: Math.max(320, Math.round(rect.width)),
        height: Math.max(160, Math.round(rect.height)),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const width = size.width;
  const height = size.height;
  const padding = { top: 32, right: custom ? 80 : 64, bottom: 34, left: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const step = plotWidth / (series.length - 1);
  const x = (index: number) => padding.left + index * step;
  const y = (value: number) =>
    padding.top + ((scale.max - value) / (scale.max - scale.min)) * plotHeight;
  const points = series
    .map((value, index) => `${x(index)},${y(value)}`)
    .join(" ");
  const hovered =
    hoverIndex === null
      ? null
      : { index: hoverIndex, x: x(hoverIndex), y: y(series[hoverIndex]) };
  const tooltipWidth = 176;
  const tooltipHeight = 156;
  const gap = hovered ? series[hovered.index] - scale.target : 0;
  const wrap = wrapRef.current;
  const visibleLeft = wrap ? wrap.scrollLeft : 0;
  const visibleWidth = wrap ? wrap.clientWidth : width;
  const visibleCenter = visibleLeft + visibleWidth / 2;
  const tooltipLeft = hovered
    ? Math.max(
        visibleLeft + 4,
        Math.min(
          hovered.x > visibleCenter
            ? hovered.x - 12 - tooltipWidth
            : hovered.x + 12,
          visibleLeft + visibleWidth - tooltipWidth - 4
        )
      )
    : 0;
  const tooltipTop = hovered
    ? Math.max(
        4,
        Math.min(hovered.y - tooltipHeight / 2, height - tooltipHeight - 4)
      )
    : 0;
  const lastTouchAt = useRef(0);

  const handleTouch = (event: TouchEvent<SVGSVGElement>) => {
    const touch = event.touches[0];
    const svg = svgRef.current;
    if (!touch || !svg) return;
    lastTouchAt.current = Date.now();
    const rect = svg.getBoundingClientRect();
    const position = ((touch.clientX - rect.left) / rect.width) * width;
    const index = Math.round((position - padding.left) / step);
    setHoverIndex(Math.max(0, Math.min(series.length - 1, index)));
  };

  const handleHover = (index: number) => {
    if (Date.now() - lastTouchAt.current < 700) return;
    setHoverIndex(index);
  };

  const handleLeave = () => {
    if (Date.now() - lastTouchAt.current < 700) return;
    setHoverIndex(null);
  };

  return (
    <div
      ref={wrapRef}
      className="score-trend-scroll relative overflow-x-auto"
      onMouseLeave={handleLeave}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="score-trend-svg h-score-chart min-w-trend-chart w-full"
        style={custom ? { height: SQDIP_CHART_HEIGHT } : undefined}
        role="img"
        aria-label={uiText("Tren nilai harian")}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        onTouchEnd={() => {
          lastTouchAt.current = Date.now();
          setHoverIndex(null);
        }}
        onTouchCancel={() => {
          lastTouchAt.current = Date.now();
          setHoverIndex(null);
        }}
      >
        <defs>
          <linearGradient
            id={`trend-fill-${metric}`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={padding.top}
            x2="0"
            y2={height - padding.bottom}
          >
            <stop
              offset="0%"
              stopColor="var(--color-primary)"
              stopOpacity="0.06"
            />
            <stop
              offset="60%"
              stopColor="var(--color-primary)"
              stopOpacity="0.03"
            />
            <stop
              offset="100%"
              stopColor="var(--color-primary)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        {scale.ticks.map((value) => (
          <g key={value}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--color-border)"
              strokeOpacity="0.8"
            />
            <text
              x={padding.left - 10}
              y={y(value) + 4}
              textAnchor="end"
              className="fill-text-secondary text-tab"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmt(value)}
            </text>
          </g>
        ))}
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={y(scale.target)}
          y2={y(scale.target)}
          stroke="var(--color-warning)"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <text
          x={width - padding.right + 8}
          y={y(scale.target) + 4}
          className="fill-warning-dark text-xs font-semibold"
        >
          {uiText("Target ")}
          {fmt(scale.target)}
        </text>
        <polygon
          points={`${x(0)},${height - padding.bottom} ${points} ${x(
            series.length - 1
          )},${height - padding.bottom}`}
          fill={`url(#trend-fill-${metric})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="var(--color-border-strong)"
            strokeWidth="1"
          />
        )}
        {series.map((value, index) => (
          <g key={`${value}-${index}`}>
            <circle
              cx={x(index)}
              cy={y(value)}
              r={hoverIndex === index ? 5 : 3.5}
              fill={
                meetsTarget(value)
                  ? "var(--color-primary)"
                  : "var(--color-warning)"
              }
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </g>
        ))}
        {(custom
          ? custom.dates
          : (trend?.dates ?? []).map((d) => formatTrendDate(d, granularity))
        ).map((date, index) => {
          const every = Math.max(1, Math.ceil(80 / step));
          if (index % every !== 0) return null;
          return (
            <text
              key={`xl-${index}`}
              x={x(index)}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="fill-text-secondary text-tab"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {date}
            </text>
          );
        })}
        {series.map((_, index) => {
          const left = Math.max(0, x(index) - step / 2);
          const right = Math.min(width, x(index) + step / 2);
          return (
            <rect
              key={`hit-${index}`}
              x={left}
              y={0}
              width={right - left}
              height={height}
              fill="transparent"
              onMouseEnter={() => handleHover(index)}
            />
          );
        })}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 w-44 rounded-lg border border-border bg-white p-3 text-xs shadow-popover"
          style={{ left: tooltipLeft, top: tooltipTop }}
        >
          {custom ? (
            <>
              <div className="font-semibold text-text">
                {formatTrendDate(
                  trend?.dates[hovered.index] ?? "",
                  granularity
                )}
              </div>
              <div className="mt-1.5 space-y-0.5">
                <div className="flex items-center justify-between gap-3 font-bold text-text">
                  <span>{uiText("Aktual")}</span>
                  <span>{fmt(series[hovered.index])}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-text-secondary">
                  <span>{uiText("Target")}</span>
                  <span>{fmt(scale.target)}</span>
                </div>
              </div>
              <div
                className={`mt-1.5 border-t border-border pt-1.5 font-semibold ${
                  meetsTarget(series[hovered.index])
                    ? "text-primary"
                    : "text-warning-dark"
                }`}
              >
                {meetsTarget(series[hovered.index])
                  ? uiText("Memenuhi target")
                  : uiText("{{v0}} {{v1}} target", {
                      v0: fmt(Math.abs(gap)),
                      v1: gap > 0 ? "di atas" : "di bawah",
                    })}
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold text-text">
                {formatTrendDate(trend?.dates[hovered.index] ?? "")}
              </div>
              <div className="mt-1.5 space-y-0.5">
                {(["Total", "Before", "Current", "After"] as const).map(
                  (key) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between gap-3 ${
                        metric === key
                          ? "font-bold text-text"
                          : "text-text-secondary"
                      }`}
                    >
                      <span>{TREND_LABEL[key]}</span>
                      <span>
                        {formatScore(seriesByMetric[key][hovered.index])}
                      </span>
                    </div>
                  )
                )}
              </div>
              <div
                className={`mt-1.5 border-t border-border pt-1.5 font-semibold ${
                  gap >= 0 ? "text-primary" : "text-warning-dark"
                }`}
              >
                {gap >= 0
                  ? uiText("+{{v0}} di atas target", { v0: formatScore(gap) })
                  : uiText("-{{v0}} di bawah target", {
                      v0: formatScore(Math.abs(gap)),
                    })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function StatusChip({
  value,
  late = false,
}: {
  value: string;
  late?: boolean;
}) {
  const tone =
    value === "OK" || value === "Closed" || value === "Achieved"
      ? "success"
      : value === "NG"
      ? "danger"
      : value === "Libur"
      ? "neutral"
      : "warning";
  return (
    <Badge tone={tone}>
      {late && <Clock3 size={11} />}
      {value}
    </Badge>
  );
}

export function matchesQuery(query: string, ...fields: string[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.join(" ").toLowerCase().includes(needle);
}

export function searchOptions(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function DetailSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { text: uiText } = useUiText();
  return (
    <label className="scorecard-detail-search">
      <Search size={14} aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={uiText("Cari line atau leader")}
        aria-label={uiText("Cari line atau leader")}
        autoComplete="off"
        spellCheck={false}
      />
    </label>
  );
}

export function DetailHeader({
  caption,
  canExport,
  query,
  onQuery,
}: {
  caption: string;
  canExport: boolean;
  query?: string;
  onQuery?: (value: string) => void;
  options?: string[];
}) {
  const { text: uiText } = useUiText();
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        {onQuery && <DetailSearch value={query ?? ""} onChange={onQuery} />}
        {caption && (
          <div className="text-sm text-text-secondary">{uiText(caption)}</div>
        )}
      </div>
      {canExport && (
        <Button variant="ghost" size="sm">
          <Download size={15} />
          {uiText(" Export")}
        </Button>
      )}
    </div>
  );
}

export type StatusCount = { ok: number; ng: number };

function countStatuses(statuses: string[]): StatusCount {
  const ok = statuses.filter(
    (status) => status === "OK" || status === "OK terlambat"
  ).length;
  return { ok, ng: statuses.length - ok };
}

export function papercardCount(rows: PapercardRow[]) {
  return countStatuses(
    rows.flatMap((row) => row.statuses.filter((status) => status !== "-"))
  );
}

export function standupCount(rows: StandupRow[]) {
  return countStatuses(
    rows.flatMap((row) => {
      if (row.source === "excel") {
        return [1, 2].flatMap((number) => {
          const statuses =
            row.historicalStatuses?.filter((item) => item.session === number) ??
            [];
          if (!statuses.length || statuses.some((item) => item.status === null))
            return [];
          return [statuses.every((item) => item.status === "OK") ? "OK" : "NG"];
        });
      }
      return row.meetings
        .filter((meeting) => meeting.held)
        .map((meeting) => (meeting.complete ? "OK" : "NG"));
    })
  );
}

export function PapercardDetail({
  canExport,
  rows: visibleRows,
}: {
  canExport: boolean;
  rows: PapercardRow[];
}) {
  const { text: uiText } = useUiText();
  return (
    <>
      <DetailHeader canExport={canExport} caption="" />
      {visibleRows.some((row) => row.source === "excel") && (
        <p className="mb-3 text-xs text-text-secondary">
          {uiText("Histori Excel")}
        </p>
      )}
      {visibleRows.length === 0 ? (
        <div className="flex min-h-empty items-center justify-center rounded-xl border border-border text-sm text-text-secondary">
          {uiText("Belum ada data")}
        </div>
      ) : (
        <div className="scorecard-tab-table overflow-x-auto rounded-xl border border-border">
          <table className="w-full table-auto text-left text-sm">
            <thead className="bg-section text-xs text-text-secondary">
              <tr>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-4 py-3 text-left font-semibold"
                >
                  {uiText("Tanggal")}
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-4 py-3 text-left font-semibold"
                >
                  {uiText("Line")}
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-4 py-3 text-left font-semibold"
                >
                  {uiText("Nama Leader")}
                </th>
                <th
                  colSpan={4}
                  className="whitespace-nowrap border-x border-b border-border px-4 py-2 text-center font-semibold"
                >
                  {uiText("Status pengisian")}
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-4 py-3 text-center font-semibold"
                >
                  {uiText("Rate")}
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold"
                >
                  {uiText("Tepat waktu")}
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold"
                >
                  {uiText("Terdaftar")}
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold"
                >
                  {uiText("Close loop")}
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold"
                >
                  {uiText("Total harian")}
                </th>
              </tr>
              <tr>
                {["Leader", "ME", "PE", "IPQC"].map((role, index) => (
                  <th
                    key={role}
                    className={`whitespace-nowrap border-l border-border px-4 py-2 text-center font-semibold${
                      index === 3 ? " border-r" : ""
                    }`}
                  >
                    {uiText(role)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleRows.map((row) => (
                <tr key={row.key} className="hover:bg-section/60">
                  <td className="whitespace-nowrap px-4 py-3 text-left">
                    {row.date}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                    {row.line}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-left">
                    {row.leader}
                  </td>
                  {row.statuses.map((status, index) => (
                    <td
                      key={index}
                      className="whitespace-nowrap px-4 py-3 text-center"
                    >
                      {status === "OK terlambat" ? (
                        <Badge tone="warning">
                          <Clock3 size={11} />
                          {uiText(" OK terlambat")}
                        </Badge>
                      ) : status === "Belum diisi" || status === "-" ? (
                        <Badge tone="neutral">{uiText(status)}</Badge>
                      ) : (
                        <StatusChip value={status} />
                      )}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                    {row.rate === null ? "—" : `${row.rate}%`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                    {formatScore(row.onTime)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                    {formatScore(row.registered)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                    {formatScore(row.closed)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                    {formatScore(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function MeetingCell({
  meeting,
  historical,
  statuses = [],
  number,
}: {
  meeting: StandupRow["meetings"][number] | undefined;
  historical?: boolean;
  statuses?: StandupRow["historicalStatuses"];
  number: number;
}) {
  const { text: uiText } = useUiText();
  if (!meeting && historical) {
    const session = statuses.filter((item) => item.session === number);
    if (!session.length)
      return (
        <Badge tone="neutral">
          {uiText("Attendance Excel tidak tersedia")}
        </Badge>
      );
    const ok = session.filter((item) => item.status === "OK").length;
    const unknown = session.filter((item) => item.status === null).length;
    return (
      <details className="text-xs">
        <summary className="cursor-pointer">
          <Badge
            tone={
              unknown ? "neutral" : ok === session.length ? "success" : "danger"
            }
          >
            {unknown === session.length
              ? uiText("Status belum diketahui")
              : uiText("{{v0}}/{{v1}} role OK", { v0: ok, v1: session.length })}
          </Badge>
        </summary>
        <div className="mt-2 space-y-1 text-left text-text-secondary">
          {session.map((item) => (
            <div key={item.role}>
              {item.role}: {uiText(item.status ?? "Tidak diketahui")}
            </div>
          ))}
        </div>
      </details>
    );
  }
  if (!meeting || !meeting.held)
    return <Badge tone="neutral">{uiText("Tidak ada")}</Badge>;
  return (
    <Badge tone={meeting.complete ? "success" : "danger"}>
      {meeting.complete ? uiText("OK") : uiText("NG")} {meeting.present}/
      {meeting.required}
    </Badge>
  );
}

export function StandupDetail({
  canExport,
  rows,
}: {
  canExport: boolean;
  rows: StandupRow[];
}) {
  const { text: uiText } = useUiText();
  return (
    <>
      <DetailHeader canExport={canExport} caption="" />
      {rows.some((row) => row.source === "excel") && (
        <p className="mb-3 text-xs text-text-secondary">
          {uiText(
            "Status Meeting 1/2 berasal dari attendance Excel per role. Klik status untuk melihat rincian. Poin berasal dari sheet rekap Standup Meeting; tanda — berarti rekap tidak tersedia atau poin perlu diverifikasi, bukan nilai nol."
          )}
        </p>
      )}
      <div className="scorecard-tab-table overflow-x-auto rounded-xl border border-border">
        <table className="w-full table-auto text-left text-sm">
          <thead className="bg-section text-xs text-text-secondary">
            <tr>
              <th
                rowSpan={2}
                className="whitespace-nowrap px-4 py-3 text-left font-semibold"
              >
                {uiText("Tanggal")}
              </th>
              <th
                rowSpan={2}
                className="whitespace-nowrap px-4 py-3 text-left font-semibold"
              >
                {uiText("Line")}
              </th>
              <th
                rowSpan={2}
                className="whitespace-nowrap px-4 py-3 text-left font-semibold"
              >
                {uiText("Nama Leader")}
              </th>
              <th
                colSpan={2}
                className="whitespace-nowrap border-x border-b border-border px-4 py-2 text-center font-semibold"
              >
                {uiText("Status kehadiran")}
              </th>
              <th
                rowSpan={2}
                className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold"
              >
                {uiText("Presensi")}
              </th>
              <th
                rowSpan={2}
                className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold"
              >
                {uiText("Isi rapat")}
              </th>
              <th
                rowSpan={2}
                className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold"
              >
                {uiText("Close loop")}
              </th>
              <th
                rowSpan={2}
                className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold"
              >
                {uiText("Total harian")}
              </th>
            </tr>
            <tr>
              {["Meeting 1", "Meeting 2"].map((role, index) => (
                <th
                  key={role}
                  className={`whitespace-nowrap border-l border-border px-4 py-2 text-center font-semibold${
                    index === 1 ? " border-r" : ""
                  }`}
                >
                  {uiText(role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-3 text-center text-text-secondary"
                >
                  {uiText("Belum ada data")}
                </td>
              </tr>
            )}
            {rows.map((row) => {
              return (
                <tr key={row.key} className="hover:bg-section/60">
                  <td className="whitespace-nowrap px-4 py-3 text-left">
                    {row.date}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                    {row.line}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-left">
                    {row.leader}
                  </td>
                  {[1, 2].map((number) => (
                    <td
                      key={number}
                      className="whitespace-nowrap px-4 py-3 text-center"
                    >
                      <MeetingCell
                        historical={row.source === "excel"}
                        statuses={row.historicalStatuses}
                        number={number}
                        meeting={row.meetings.find(
                          (meeting) => meeting.number === number
                        )}
                      />
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                    {row.attendance === null
                      ? "—"
                      : formatScore(row.attendance)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                    {row.content === null ? "—" : formatScore(row.content)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                    {row.closeLoop === null ? "—" : formatScore(row.closeLoop)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                    {row.total === null ? "—" : formatScore(row.total)}
                    {row.scoreNote && (
                      <details className="mt-1 max-w-64 text-left text-xs font-normal text-text-secondary">
                        <summary className="cursor-pointer">
                          {uiText(
                            row.sourceScores?.length
                              ? "Poin perlu verifikasi"
                              : "Rekap poin tidak tersedia"
                          )}
                        </summary>
                        <p className="mt-2 whitespace-normal">
                          {uiText(row.scoreNote)}
                        </p>
                        {Boolean(row.sourceScores?.length) && (
                          <p>
                            {uiText("Nilai sumber Excel")}:{" "}
                            {row.sourceScores?.join(" + ")}
                          </p>
                        )}
                      </details>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function SqdipDetail({ canExport }: { canExport: boolean }) {
  const { text: uiText } = useUiText();
  const rows = [
    ["Safety", "0", "0", "0", 6],
    ["Quality", "93%", "91,24%", "-1,76%", 0],
    ["Delivery", "100%", "100%", "0%", 6],
    ["Inventory", "400", "730", "+330", 0],
    ["Productivity", "87%", "94%", "+7%", 6],
  ];
  return (
    <>
      <DetailHeader
        canExport={canExport}
        caption={uiText(
          "Lima dimensi, masing-masing 6 poin jika target tercapai"
        )}
      />
      <div className="scorecard-tab-subhead flex flex-wrap gap-3">
        <Input
          type="date"
          value="2026-09-17"
          onChange={() => undefined}
          className="w-auto"
        />
        <Select value="TAC20604" onChange={() => undefined}>
          <option>{uiText("TAC20604")}</option>
          <option>{uiText("TAC20603")}</option>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-section text-xs text-text-secondary">
            <tr>
              {["Dimensi", "Target", "Aktual", "Selisih", "Poin"].map(
                (item) => (
                  <th key={item} className="px-4 py-3">
                    {uiText(item)}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row[0]}>
                <td className="px-4 py-4 font-semibold">{row[0]}</td>
                <td className="px-4 py-4">{row[1]}</td>
                <td className="px-4 py-4">{row[2]}</td>
                <td className="px-4 py-4">{row[3]}</td>
                <td
                  className={`px-4 py-4 font-bold ${
                    row[4] ? "text-primary" : "text-danger"
                  }`}
                >
                  {row[4] ? (
                    <CheckCircle2 size={16} className="mr-2 inline" />
                  ) : (
                    <X size={16} className="mr-2 inline" />
                  )}
                  {row[4]}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border bg-section">
            <tr>
              <td colSpan={4} className="px-4 py-4 font-bold">
                {uiText("Total")}
              </td>
              <td className="px-4 py-4 font-bold text-danger">
                {uiText("18 dari 30")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-5">
        <div className="mb-3 text-sm font-bold">
          {uiText("Kalender skor September")}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 30 }, (_, index) => {
            const score = [18, 24, 30, 24, 18, 30][index % 6];
            return (
              <div
                key={index}
                className={`rounded-lg border p-2 text-center text-xs ${
                  score === 30
                    ? "border-primary-border bg-primary-soft text-primary"
                    : score >= 24
                    ? "border-warning-border bg-warning-soft text-warning-dark"
                    : "border-danger-border bg-danger-soft text-danger"
                }`}
              >
                <div>{index + 1}</div>
                <strong>{score}</strong>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function RewardDetail({ canExport }: { canExport: boolean }) {
  const { text: uiText } = useUiText();
  const rules = [
    "Attendance: tidak ada konfirmasi",
    "Papercard: pengisian tidak tepat waktu (maksimal 2 jam setelah masuk kerja)",
    "Kartu Standup: masalah tidak ditulis, atau penyebab dan solusi tidak terisi",
    "Problem Solving: 5W per dua minggu tidak dilaporkan",
  ];
  return (
    <>
      <DetailHeader
        canExport={canExport}
        caption={uiText(
          "Rekap reward dan punishment bulanan berdasarkan aturan assessment."
        )}
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <div className="font-bold text-danger">{uiText("Punishment")}</div>
          <div className="mt-3 space-y-2">
            {rules.map((rule, index) => (
              <div
                key={rule}
                className="flex gap-3 rounded-lg bg-section p-3 text-sm"
              >
                <span className="font-bold text-danger">{index + 1}</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-danger-border bg-danger-soft p-3 text-xs text-danger">
            {uiText("Salah satu dari 4 poin NG: punishment −5 poin per hari")}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-rate text-left text-xs">
              <thead>
                <tr className="text-text-secondary">
                  {[
                    "Leader",
                    "Attendance",
                    "Papercard",
                    "Kartu Standup",
                    "Problem Solving",
                    "Total punishment",
                  ].map((item) => (
                    <th key={item} className="px-2 py-3">
                      {uiText(item)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-2 py-3 font-semibold">
                    {uiText("Ahmad Riswanto")}
                  </td>
                  <td className="px-2 py-3">0</td>
                  <td className="px-2 py-3">0</td>
                  <td className="px-2 py-3">0</td>
                  <td className="px-2 py-3">0</td>
                  <td className="px-2 py-3 font-bold">0</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-2 py-3 font-semibold">
                    {uiText("Rudiyansyah")}
                  </td>
                  <td className="px-2 py-3">1</td>
                  <td className="px-2 py-3">0</td>
                  <td className="px-2 py-3">2</td>
                  <td className="px-2 py-3">0</td>
                  <td className="px-2 py-3 font-bold text-danger">−15</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="p-5">
          <div className="font-bold text-primary">{uiText("Reward")}</div>
          <div className="mt-3 rounded-lg border border-primary-border bg-primary-soft p-4 text-sm font-semibold text-primary">
            {uiText(
              "Juara 1 (nilai tertinggi): Leader +20 poin, Member +10 poin"
            )}
          </div>
          <div className="mt-4 space-y-2 text-sm text-text-secondary">
            <div>
              {uiText("Nilai DM di bawah 80 tidak mendapat reward bulanan")}
            </div>
            <div>
              {uiText(
                "Jika juara 1 punya poin punishment, reward dipotong sesuai poin"
              )}
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-primary-border p-5 text-center">
            <Trophy size={28} className="mx-auto text-primary" />
            <div className="mt-3 font-bold">{uiText("Ahmad Riswanto")}</div>
            <div className="mt-1 text-2xl font-bold text-primary">90,9</div>
            <div className="mt-4 text-sm">
              {uiText("Reward 20 − punishment 0 =")}{" "}
              <strong className="text-primary">20</strong>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

export function AnnualDetail({ canExport }: { canExport: boolean }) {
  const { text: uiText } = useUiText();
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const dmRows = ["DM 1", "DM 2", "DM 3", "DM 4"];
  return (
    <>
      <DetailHeader
        canExport={canExport}
        caption={uiText(
          "Rekap target, perolehan nilai, dan evaluasi tahunan per DM."
        )}
      />
      <Card className="mb-5 p-4">
        <div className="mb-3 font-bold">{uiText("Tren nilai tahunan")}</div>
        <svg viewBox="0 0 600 180" className="w-full min-w-rate">
          <polyline
            points="25,120 275,120 325,70 575,70"
            fill="none"
            stroke="var(--color-warning)"
            strokeWidth="2"
            strokeDasharray="6 5"
          />
          {[0, 1, 2, 3].map((line) => (
            <polyline
              key={line}
              points={`25,${145 - line * 6} 75,${130 - line * 5} 125,${
                120 - line * 4
              } 175,${112 - line * 3} 225,${105 - line * 4} 275,${
                98 - line * 3
              } 325,${82 - line * 2} 375,${76 - line * 4} 425,${72 - line * 3}`}
              fill="none"
              stroke={
                line === 2
                  ? "var(--color-primary)"
                  : "var(--color-border-strong)"
              }
              strokeWidth={line === 2 ? 3 : 2}
            />
          ))}
        </svg>
      </Card>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-table w-full text-center text-xs">
          <thead className="bg-section">
            <tr>
              <th className="px-3 py-3 text-left">{uiText("DM / Ass SPV")}</th>
              <th className="px-3 py-3 text-left">{uiText("Jenis")}</th>
              {months.map((month) => (
                <th key={month} className="px-3 py-3">
                  {uiText(month)}
                </th>
              ))}
              <th className="px-3 py-3">{uiText("Rata-rata")}</th>
            </tr>
          </thead>
          <tbody>
            {dmRows.flatMap((dm, dmIndex) =>
              ["Target", "Perolehan Nilai", "Evaluasi"].map(
                (type, typeIndex) => (
                  <tr key={`${dm}-${type}`} className="border-t border-border">
                    {typeIndex === 0 && (
                      <td rowSpan={3} className="px-3 py-3 text-left">
                        <strong>{dm}</strong>
                        <div className="mt-1 text-text-secondary">
                          {uiText("Ikhwan")}
                        </div>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-3 text-left font-semibold">
                      {type}
                    </td>
                    {months.map((month) => {
                      if (type === "Target")
                        return (
                          <td key={month} className="px-3 py-3">
                            {month <= 6 ? 80 : 90}
                          </td>
                        );
                      if (month > 9 || dmIndex < 2)
                        return (
                          <td key={month} className="px-3 py-3">
                            -
                          </td>
                        );
                      const achieved = month !== 8 || dmIndex === 2;
                      if (type === "Evaluasi")
                        return (
                          <td key={month} className="px-3 py-3">
                            <StatusChip
                              value={achieved ? "Achieved" : "Not achieved"}
                            />
                          </td>
                        );
                      return (
                        <td key={month} className="px-3 py-3">
                          {achieved ? 90 + dmIndex : 86 + dmIndex}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 font-bold">
                      {type === "Target"
                        ? "85"
                        : type === "Perolehan Nilai" && dmIndex >= 2
                        ? "89,4"
                        : "-"}
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
