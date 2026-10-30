import { useEffect, useRef, useState, type TouchEvent } from "react";
import { CheckCircle2,  Clock3, Download, Info, Trophy, X, type LucideIcon } from "lucide-react";
import { Badge, Button, Card, Input, Select } from "./ui";
import { formatScore, scoreBar, type ScoreDetailItem, type ScoreTrend } from "./data";
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
          onClick={() => onChange(item)}
        >
          {labels?.[item] ?? item}
        </button>
      ))}
    </div>
  );
}

export function ScoreProgress({ value, max = 100 }: { value: number; max?: number; target?: number }) {
  const percent = Math.min(100, (value / max) * 100);
  return (
    <div className="scorecard-kpi-progress">
      <div className="scorecard-kpi-progress-bar">
        <div
          className={`scorecard-kpi-progress-fill ${scoreBar((value / max) * 100)}`}
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
  const normalized = value === undefined ? 0 : (value / max) * 100;
  const [titleText, subtitle] = title.split(" · ");
  const iconTone = value === undefined ? "neutral" : normalized >= 90 ? "ok" : normalized >= 80 ? "warn" : "bad";
  return (
    <Card className={`scorecard-kpi flex h-full flex-col${highlighted ? " scorecard-kpi--primary" : ""}`}>
      <div className="scorecard-kpi-main">
        <div className="scorecard-kpi-head">
          <div className="min-w-0">
            <div className="scorecard-kpi-title">{titleText}</div>
            {subtitle && <div className="scorecard-kpi-subtitle">{subtitle}</div>}
          </div>
          <span className={`scorecard-kpi-icon scorecard-kpi-icon--${iconTone}`}><Icon size={16} strokeWidth={2} /></span>
        </div>
        <div className="scorecard-kpi-value">
          {value === undefined ? "—" : formatScore(value)} <span className="scorecard-kpi-value-suffix">/ {formatScore(max)}</span>
        </div>
        {value === undefined && <div className="scorecard-kpi-hint">Belum ada data</div>}
        {value === undefined ? <div className="scorecard-kpi-progress scorecard-kpi-progress--empty"><div className="scorecard-kpi-progress-bar" /></div> : <ScoreProgress value={value} max={max} target={targetEquivalent} />}
        
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
  const color = score === undefined ? "var(--color-border)" : score >= 90 ? "var(--color-primary)" : score >= 80 ? "var(--color-warning)" : "var(--color-danger)";
  const arc = score === undefined ? 0 : Math.min(100, score) * 1.57;
  return (
    <Card
      onClick={onClick}
      className={`score-gauge cursor-pointer p-3 transition hover:-translate-y-0.5 hover:shadow-popover ${selected ? "border-primary ring-2 ring-primary-soft" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-text">
          {dm}
          <span title="Nilai DM dihitung dari data level DM milik Leader DM, sehingga bisa berbeda dari nilai line yang dipimpinnya di tabel ranking.">
            <Info size={14} className="text-text-secondary" />
          </span>
        </div>
        {selected && <Badge tone="primary">Dipilih</Badge>}
      </div>
      <div className="score-gauge-body">
        <div className="score-gauge-visual">
          <svg viewBox="0 0 200 112" className="mx-auto mt-1 w-full max-w-56" role="img" aria-label={`Nilai ${dm}`}>
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--color-border)" strokeWidth="16" strokeLinecap="round" strokeDasharray={score === undefined ? "3 7" : undefined} />
            {score !== undefined && <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${arc} 157`} />}
            <line x1="175" y1="62" x2="185" y2="57" stroke="var(--color-text)" strokeWidth="3" />
            <text x="100" y="88" textAnchor="middle" className="fill-text text-3xl font-bold">
              {score === undefined ? "—" : formatScore(score)}
            </text>
            <text x="100" y="108" textAnchor="middle" className="fill-text-secondary text-xs">Target 90</text>
          </svg>
        </div>
        {leader ? (
          <div className="score-gauge-info mt-2 grid grid-rows-4 gap-1 border-t border-border pt-3 text-xs">
            <div className="flex justify-between"><span className="text-text-secondary">Ass SPV</span><strong>Ikhwan</strong></div>
            <div className="flex justify-between gap-2"><span className="text-text-secondary">Leader DM</span><strong className="text-right">{leader}</strong></div>
            <div className="flex justify-between"><span className="text-text-secondary">Peringkat DM</span><strong>{rank}</strong></div>
            <div className="text-warning-dark">Kurang {formatScore(gap ?? 0)} poin dari target</div>
          </div>
        ) : (
          <div className="score-gauge-info mt-2 flex items-start justify-center border-t border-border pt-4 text-center text-sm text-text-secondary">Belum ada Leader DM</div>
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
  for (let v = min; v <= Math.min(max, cap) + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min, max, target, ticks };
} 

export function TrendChart({ metric }: { metric: ScoreTrend }) {
  const total = [86, 88, 91, 89, 92, 84, 87, 90, 93, 86, 88, 91, 89, 94, 82, 87, 90, 92, 88, 91, 86];
  const before = [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30];
  const current = [31, 32, 34, 33, 35, 29, 31, 33, 35, 30, 32, 34, 33, 36, 28, 31, 33, 35, 32, 34, 30];
  const after = total.map((value, index) => value - before[index] - current[index]);
  const seriesByMetric = { Total: total, Before: before, Current: current, After: after };
  const series = seriesByMetric[metric];
  const scale = buildScale(series, TREND_TARGET[metric], TREND_CAP[metric]);
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
  const padding = { top: 24, right: 64, bottom: 34, left: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const step = plotWidth / (series.length - 1);
  const x = (index: number) => padding.left + index * step;
  const y = (value: number) => padding.top + ((scale.max - value) / (scale.max - scale.min)) * plotHeight;
  const points = series.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const hovered = hoverIndex === null ? null : { index: hoverIndex, x: x(hoverIndex), y: y(series[hoverIndex]) };
  const tooltipWidth = 176;
  const tooltipHeight = 156;
  const gap = hovered ? series[hovered.index] - scale.target : 0;
  const wrap = wrapRef.current;
  const visibleLeft = wrap ? wrap.scrollLeft : 0;
  const visibleWidth = wrap ? wrap.clientWidth : width;
  const visibleCenter = visibleLeft + visibleWidth / 2;
  const tooltipLeft = hovered
    ? Math.max(visibleLeft + 4, Math.min(hovered.x > visibleCenter ? hovered.x - 12 - tooltipWidth : hovered.x + 12, visibleLeft + visibleWidth - tooltipWidth - 4))
    : 0;
  const tooltipTop = hovered ? Math.max(4, Math.min(hovered.y - tooltipHeight / 2, height - tooltipHeight - 4)) : 0;
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
    <div ref={wrapRef} className="score-trend-scroll relative overflow-x-auto" onMouseLeave={handleLeave}>
      <svg ref={svgRef} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="score-trend-svg h-score-chart min-w-trend-chart w-full" role="img" aria-label="Tren nilai harian" onTouchStart={handleTouch} onTouchMove={handleTouch} onTouchEnd={() => { lastTouchAt.current = Date.now(); setHoverIndex(null); }} onTouchCancel={() => { lastTouchAt.current = Date.now(); setHoverIndex(null); }}>
        <defs>
  <linearGradient id={`trend-fill-${metric}`} gradientUnits="userSpaceOnUse" x1="0" y1={padding.top} x2="0" y2={height - padding.bottom}>
  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.06" />
  <stop offset="60%" stopColor="var(--color-primary)" stopOpacity="0.03" />
  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
</linearGradient>
</defs>
        {scale.ticks.map((value) => (
  <g key={value}>
    <line x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} stroke="var(--color-border)" strokeOpacity="0.8" />
    <text
      x={padding.left - 10}
      y={y(value) + 4}
      textAnchor="end"
      className="fill-text-secondary text-tab"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {value.toLocaleString("id-ID")}
    </text>
  </g>
))}
        <line x1={padding.left} x2={width - padding.right} y1={y(scale.target)} y2={y(scale.target)} stroke="var(--color-warning)" strokeWidth="1.5" strokeDasharray="5 4" />
<text x={width - padding.right + 8} y={y(scale.target) + 4} className="fill-warning-dark text-xs font-semibold">
  Target {scale.target}
</text>
        <polygon
  points={`${x(0)},${height - padding.bottom} ${points} ${x(series.length - 1)},${height - padding.bottom}`}
  fill={`url(#trend-fill-${metric})`}
/>
        <polyline points={points} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hovered && <line x1={hovered.x} x2={hovered.x} y1={padding.top} y2={height - padding.bottom} stroke="var(--color-border-strong)" strokeWidth="1" />}
        {series.map((value, index) => (
          <g key={`${value}-${index}`}>
            <circle
  cx={x(index)}
  cy={y(value)}
  r={hoverIndex === index ? 5 : 3.5}
  fill={value >= scale.target ? "var(--color-primary)" : "var(--color-warning)"}
  stroke="#ffffff"
  strokeWidth="1.5"
/>
          </g>
        ))}
        {series.map((_, index) => {
          const left = Math.max(0, x(index) - step / 2);
          const right = Math.min(width, x(index) + step / 2);
          return <rect key={`hit-${index}`} x={left} y={0} width={right - left} height={height} fill="transparent" onMouseEnter={() => handleHover(index)} />;
        })}
      </svg>
      {hovered && (
        <div className="pointer-events-none absolute z-10 w-44 rounded-lg border border-border bg-white p-3 text-xs shadow-popover" style={{ left: tooltipLeft, top: tooltipTop }}>
          <div className="font-semibold text-text">{hovered.index + 1} Sep</div>
          <div className="mt-1.5 space-y-0.5">
            {(["Total", "Before", "Current", "After"] as const).map((key) => (
              <div key={key} className={`flex items-center justify-between gap-3 ${metric === key ? "font-bold text-text" : "text-text-secondary"}`}>
                <span>{TREND_LABEL[key]}</span>
                <span>{formatScore(seriesByMetric[key][hovered.index])}</span>
              </div>
            ))}
          </div>
          <div className={`mt-1.5 border-t border-border pt-1.5 font-semibold ${gap >= 0 ? "text-primary" : "text-warning-dark"}`}>
            {gap >= 0 ? `+${formatScore(gap)} di atas target` : `-${formatScore(Math.abs(gap))} di bawah target`}
          </div>
        </div>
      )}
    </div>
  );
}

export function StatusChip({ value, late = false }: { value: string; late?: boolean }) {
  const tone = value === "OK" || value === "Closed" || value === "Achieved" ? "success" : value === "NG" ? "danger" : value === "Libur" ? "neutral" : "warning";
  return <Badge tone={tone}>{late && <Clock3 size={11} />}{value}</Badge>;
}

export function DetailHeader({ caption, canExport }: { caption: string; canExport: boolean }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="text-sm text-text-secondary">{caption}</div>
      {canExport && <Button variant="ghost" size="sm"><Download size={15} /> Export</Button>}
    </div>
  );
}

export function PapercardDetail({ canExport, selectedDm, startDate, endDate }: { canExport: boolean; selectedDm: string; startDate: string; endDate: string }) {
  const rows = selectedDm === "DM 4"
    ? [
        ["2026-09-14", "TAC20607", "Edi Prasetyo", "OK", "OK", "OK", "OK", "100%", "8,00", "14,00", "8,00", "30,00"],
        ["2026-09-15", "TAC20605", "Rudiyansyah", "OK", "OK", "OK", "Belum diisi", "75%", "6,00", "10,50", "6,00", "22,50"],
        ["2026-09-16", "TAC20607", "Edi Prasetyo", "OK", "OK", "OK terlambat", "OK", "75%", "6,00", "10,50", "6,00", "22,50"],
      ]
    : selectedDm === "DM 3"
      ? [
          ["2026-09-14", "TAC20604", "Ahmad Riswanto", "OK", "OK", "OK", "OK", "100%", "8,00", "14,00", "8,00", "30,00"],
          ["2026-09-15", "TAC20603", "Rudiyansyah", "OK", "OK", "OK", "OK", "100%", "8,00", "14,00", "8,00", "30,00"],
          ["2026-09-16", "TAC20605", "Agus Riyadi", "OK", "OK", "OK", "OK", "100%", "8,00", "14,00", "8,00", "30,00"],
        ]
      : [];
  const visibleRows = rows;
  return (
    <>
      <DetailHeader canExport={canExport} caption="" />
      {visibleRows.length === 0 ? (
        <div className="flex min-h-empty items-center justify-center rounded-xl border border-border text-sm text-text-secondary">Belum ada data</div>
      ) : (
        <div className="scorecard-tab-table overflow-x-auto rounded-xl border border-border">
          <table className="w-full table-auto text-left text-sm">
            <thead className="bg-section text-xs text-text-secondary">
  <tr>
    <th rowSpan={2} className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tanggal</th>
    <th rowSpan={2} className="whitespace-nowrap px-4 py-3 text-left font-semibold">Line</th>
    <th rowSpan={2} className="whitespace-nowrap px-4 py-3 text-left font-semibold">Nama Leader</th>
    <th colSpan={4} className="whitespace-nowrap border-x border-b border-border px-4 py-2 text-center font-semibold">Status pengisian</th>
    <th rowSpan={2} className="whitespace-nowrap px-4 py-3 text-center font-semibold">Rate</th>
    <th rowSpan={2} className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold">Tepat waktu</th>
    <th rowSpan={2} className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold">Terdaftar</th>
    <th rowSpan={2} className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold">Close loop</th>
    <th rowSpan={2} className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold">Total harian</th>
  </tr>
  <tr>
    {["Leader", "ME", "PE", "IPQC"].map((role, index) => (
      <th
        key={role}
        className={`whitespace-nowrap border-l border-border px-4 py-2 text-center font-semibold${index === 3 ? " border-r" : ""}`}
      >
        {role}
      </th>
    ))}
  </tr>
</thead>
            <tbody className="divide-y divide-border">
              {visibleRows.map((row) => (
                <tr key={`${row[0]}-${row[1]}`} className="hover:bg-section/60">
                  <td className="whitespace-nowrap px-4 py-3 text-left">{row[0]}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-left font-semibold">{row[1]}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-left">{row[2]}</td>
                  {row.slice(3, 7).map((status, index) => (
                    <td key={index} className="whitespace-nowrap px-4 py-3 text-center">
                      {status === "OK terlambat" ? <Badge tone="warning"><Clock3 size={11} /> OK terlambat</Badge> : status === "Belum diisi" ? <Badge tone="neutral">Belum diisi</Badge> : <StatusChip value={status} />}
                    </td>
                  ))}
                  {row.slice(7).map((value, index) => <td key={index} className="whitespace-nowrap px-4 py-3 text-center font-semibold">{value}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

type StandupStatus = "OK" | "NG";
type StandupRow = {
  date: string;
  line: string;
  leader: string;
  status: StandupStatus[]; // urutan sama dengan STANDUP_ROLES
  attendance: number;
  content: number;
  closeLoop: number;
};

const STANDUP_ROLES = ["Leader", "ME", "PE", "QA"] as const;

// Data contoh, nanti diganti dari API
const STANDUP_ROWS: StandupRow[] = [
  { date: "2026-09-14", line: "TAC20604", leader: "Ahmad Riswanto", status: ["OK", "OK", "OK", "OK"], attendance: 10, content: 10, closeLoop: 10 },
  { date: "2026-09-15", line: "TAC20603", leader: "Rudiyansyah", status: ["OK", "NG", "OK", "OK"], attendance: 7.5, content: 10, closeLoop: 0 },
  { date: "2026-09-16", line: "TAC20605", leader: "Agus Riyadi", status: ["OK", "OK", "OK", "OK"], attendance: 10, content: 10, closeLoop: 10 },
];

export function StandupDetail({ canExport }: { canExport: boolean }) {
  return (
    <>
      <DetailHeader canExport={canExport} caption="" />
      <div className="scorecard-tab-table overflow-x-auto rounded-xl border border-border">
        <table className="w-full table-auto text-left text-sm">
          <thead className="bg-section text-xs text-text-secondary">
            <tr>
              <th rowSpan={2} className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tanggal</th>
              <th rowSpan={2} className="whitespace-nowrap px-4 py-3 text-left font-semibold">Line</th>
              <th rowSpan={2} className="whitespace-nowrap px-4 py-3 text-left font-semibold">Nama Leader</th>
              <th colSpan={4} className="whitespace-nowrap border-x border-b border-border px-4 py-2 text-center font-semibold">Status kehadiran</th>
              <th rowSpan={2} className="whitespace-nowrap px-4 py-3 text-center font-semibold">Rate</th>
              <th rowSpan={2} className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold">Presensi</th>
              <th rowSpan={2} className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold">Isi rapat</th>
              <th rowSpan={2} className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold">Close loop</th>
              <th rowSpan={2} className="whitespace-nowrap border-l border-border px-4 py-3 text-center font-semibold">Total harian</th>
            </tr>
            <tr>
              {STANDUP_ROLES.map((role, index) => (
                <th
                  key={role}
                  className={`whitespace-nowrap border-l border-border px-4 py-2 text-center font-semibold${index === STANDUP_ROLES.length - 1 ? " border-r" : ""}`}
                >
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {STANDUP_ROWS.map((row) => {
              const total = row.attendance + row.content + row.closeLoop;
              const rate = row.status.filter((s) => s === "OK").length / STANDUP_ROLES.length;
              return (
                <tr key={`${row.date}-${row.line}`} className="hover:bg-section/60">
                  <td className="whitespace-nowrap px-4 py-3 text-left">{row.date}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-left font-semibold">{row.line}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-left">{row.leader}</td>
                  {row.status.map((status, index) => (
                    <td key={STANDUP_ROLES[index]} className="whitespace-nowrap px-4 py-3 text-center">
                      <StatusChip value={status} />
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">{Math.round(rate * 100)}%</td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">{formatScore(row.attendance)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">{formatScore(row.content)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">{formatScore(row.closeLoop)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">{formatScore(total)}</td>
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
  const rows = [
    ["Safety", "0", "0", "0", 6],
    ["Quality", "93%", "91,24%", "-1,76%", 0],
    ["Delivery", "100%", "100%", "0%", 6],
    ["Inventory", "400", "730", "+330", 0],
    ["Productivity", "87%", "94%", "+7%", 6],
  ];
  return (
    <>
      <DetailHeader canExport={canExport} caption="Lima dimensi, masing-masing 6 poin jika target tercapai" />
      <div className="scorecard-tab-subhead flex flex-wrap gap-3"><Input type="date" value="2026-09-17" onChange={() => undefined} className="w-auto" /><Select value="TAC20604" onChange={() => undefined}><option>TAC20604</option><option>TAC20603</option></Select></div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm"><thead className="bg-section text-xs text-text-secondary"><tr>{["Dimensi", "Target", "Aktual", "Selisih", "Poin"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row[0]}><td className="px-4 py-4 font-semibold">{row[0]}</td><td className="px-4 py-4">{row[1]}</td><td className="px-4 py-4">{row[2]}</td><td className="px-4 py-4">{row[3]}</td><td className={`px-4 py-4 font-bold ${row[4] ? "text-primary" : "text-danger"}`}>{row[4] ? <CheckCircle2 size={16} className="mr-2 inline" /> : <X size={16} className="mr-2 inline" />}{row[4]}</td></tr>)}</tbody><tfoot className="border-t border-border bg-section"><tr><td colSpan={4} className="px-4 py-4 font-bold">Total</td><td className="px-4 py-4 font-bold text-danger">18 dari 30</td></tr></tfoot></table>
      </div>
      <div className="mt-5">
        <div className="mb-3 text-sm font-bold">Kalender skor September</div>
        <div className="grid grid-cols-7 gap-2">{Array.from({ length: 30 }, (_, index) => { const score = [18, 24, 30, 24, 18, 30][index % 6]; return <div key={index} className={`rounded-lg border p-2 text-center text-xs ${score === 30 ? "border-primary-border bg-primary-soft text-primary" : score >= 24 ? "border-warning-border bg-warning-soft text-warning-dark" : "border-danger-border bg-danger-soft text-danger"}`}><div>{index + 1}</div><strong>{score}</strong></div>; })}</div>
      </div>
    </>
  );
}

export function RewardDetail({ canExport }: { canExport: boolean }) {
  const rules = ["Attendance: tidak ada konfirmasi", "Papercard: pengisian tidak tepat waktu (maksimal 2 jam setelah masuk kerja)", "Kartu Standup: masalah tidak ditulis, atau penyebab dan solusi tidak terisi", "Problem Solving: 5W per dua minggu tidak dilaporkan"];
  return (
    <>
      <DetailHeader canExport={canExport} caption="Rekap reward dan punishment bulanan berdasarkan aturan assessment." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <div className="font-bold text-danger">Punishment</div>
          <div className="mt-3 space-y-2">{rules.map((rule, index) => <div key={rule} className="flex gap-3 rounded-lg bg-section p-3 text-sm"><span className="font-bold text-danger">{index + 1}</span><span>{rule}</span></div>)}</div>
          <div className="mt-4 rounded-lg border border-danger-border bg-danger-soft p-3 text-xs text-danger">Salah satu dari 4 poin NG: punishment −5 poin per hari</div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-rate text-left text-xs"><thead><tr className="text-text-secondary">{["Leader", "Attendance", "Papercard", "Kartu Standup", "Problem Solving", "Total punishment"].map((item) => <th key={item} className="px-2 py-3">{item}</th>)}</tr></thead><tbody><tr className="border-t border-border"><td className="px-2 py-3 font-semibold">Ahmad Riswanto</td><td className="px-2 py-3">0</td><td className="px-2 py-3">0</td><td className="px-2 py-3">0</td><td className="px-2 py-3">0</td><td className="px-2 py-3 font-bold">0</td></tr><tr className="border-t border-border"><td className="px-2 py-3 font-semibold">Rudiyansyah</td><td className="px-2 py-3">1</td><td className="px-2 py-3">0</td><td className="px-2 py-3">2</td><td className="px-2 py-3">0</td><td className="px-2 py-3 font-bold text-danger">−15</td></tr></tbody></table></div>
        </Card>
        <Card className="p-5">
          <div className="font-bold text-primary">Reward</div>
          <div className="mt-3 rounded-lg border border-primary-border bg-primary-soft p-4 text-sm font-semibold text-primary">Juara 1 (nilai tertinggi): Leader +20 poin, Member +10 poin</div>
          <div className="mt-4 space-y-2 text-sm text-text-secondary"><div>Nilai DM di bawah 80 tidak mendapat reward bulanan</div><div>Jika juara 1 punya poin punishment, reward dipotong sesuai poin</div></div>
          <div className="mt-6 rounded-xl border border-primary-border p-5 text-center"><Trophy size={28} className="mx-auto text-primary" /><div className="mt-3 font-bold">Ahmad Riswanto</div><div className="mt-1 text-2xl font-bold text-primary">90,9</div><div className="mt-4 text-sm">Reward 20 − punishment 0 = <strong className="text-primary">20</strong></div></div>
        </Card>
      </div>
    </>
  );
}

export function AnnualDetail({ canExport }: { canExport: boolean }) {
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const dmRows = ["DM 1", "DM 2", "DM 3", "DM 4"];
  return (
    <>
      <DetailHeader canExport={canExport} caption="Rekap target, perolehan nilai, dan evaluasi tahunan per DM." />
      <Card className="mb-5 p-4">
        <div className="mb-3 font-bold">Tren nilai tahunan</div>
        <svg viewBox="0 0 600 180" className="w-full min-w-rate">
          <polyline points="25,120 275,120 325,70 575,70" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeDasharray="6 5" />
          {[0, 1, 2, 3].map((line) => (
            <polyline
              key={line}
              points={`25,${145-line*6} 75,${130-line*5} 125,${120-line*4} 175,${112-line*3} 225,${105-line*4} 275,${98-line*3} 325,${82-line*2} 375,${76-line*4} 425,${72-line*3}`}
              fill="none"
              stroke={line === 2 ? "var(--color-primary)" : "var(--color-border-strong)"}
              strokeWidth={line === 2 ? 3 : 2}
            />
          ))}
        </svg>
      </Card>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-table w-full text-center text-xs"><thead className="bg-section"><tr><th className="px-3 py-3 text-left">DM / Ass SPV</th><th className="px-3 py-3 text-left">Jenis</th>{months.map((month) => <th key={month} className="px-3 py-3">{month}</th>)}<th className="px-3 py-3">Rata-rata</th></tr></thead><tbody>{dmRows.flatMap((dm, dmIndex) => ["Target", "Perolehan Nilai", "Evaluasi"].map((type, typeIndex) => <tr key={`${dm}-${type}`} className="border-t border-border">{typeIndex === 0 && <td rowSpan={3} className="px-3 py-3 text-left"><strong>{dm}</strong><div className="mt-1 text-text-secondary">Ikhwan</div></td>}<td className="whitespace-nowrap px-3 py-3 text-left font-semibold">{type}</td>{months.map((month) => { if (type === "Target") return <td key={month} className="px-3 py-3">{month <= 6 ? 80 : 90}</td>; if (month > 9 || dmIndex < 2) return <td key={month} className="px-3 py-3">-</td>; const achieved = month !== 8 || dmIndex === 2; if (type === "Evaluasi") return <td key={month} className="px-3 py-3"><StatusChip value={achieved ? "Achieved" : "Not achieved"} /></td>; return <td key={month} className="px-3 py-3">{achieved ? 90 + dmIndex : 86 + dmIndex}</td>; })}<td className="px-3 py-3 font-bold">{type === "Target" ? "85" : type === "Perolehan Nilai" && dmIndex >= 2 ? "89,4" : "-"}</td></tr>))}</tbody></table>
      </div>
    </>
  );
}
