"use client";

import { useState } from "react";
import type { TrendPoint } from "../types";
import { TARGET, toneFor } from "../utils";

interface Props {
  data: TrendPoint[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  target?: number;
}

// Plain SVG chart (no chart library needed). Swap for recharts later if you prefer.
const W = 800;
const H = 300;
const PAD = { top: 36, right: 28, bottom: 36, left: 52 };
const IW = W - PAD.left - PAD.right;
const IH = H - PAD.top - PAD.bottom;
const TICKS = [0, 25, 50, 75, 100];

export function InspectionTrendChart({ data, selectedKey, onSelect, target = TARGET }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return <div className="dml-empty">Belum ada data inspeksi pada periode ini</div>;
  }

  const x = (i: number) => (data.length === 1 ? PAD.left + IW / 2 : PAD.left + (i * IW) / (data.length - 1));
  const y = (v: number) => PAD.top + IH * (1 - v / 100);

  const line = data.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `${x(0)},${y(0)} ${line} ${x(data.length - 1)},${y(0)}`;

  const labelStep = Math.ceil(data.length / 8); // keeps the X axis readable
  const showAllValues = data.length <= 10;
  const hovered = hover != null ? data[hover] : null;

  return (
    <div className="dml-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grafik tren Inspection Rate">
        {TICKS.map((t) => (
          <g key={t}>
            <line className="dml-chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="dml-chart__axis" x={PAD.left - 10} y={y(t) + 4} textAnchor="end">
              {t}%
            </text>
          </g>
        ))}

        <polygon className="dml-chart__area" points={area} />

        <line className="dml-chart__target" x1={PAD.left} x2={W - PAD.right} y1={y(target)} y2={y(target)} />
        <text className="dml-chart__target-label" x={W - PAD.right} y={y(target) + 16} textAnchor="end">
          Target {target}%
        </text>

        <polyline className="dml-chart__line" points={line} />

        {data.map((p, i) => {
          const tone = toneFor(p.value, target);
          const selected = p.key === selectedKey;
          const showValue = showAllValues || tone !== "ok" || selected || hover === i;
          return (
            <g
              key={p.key}
              className="dml-chart__point"
              tabIndex={0}
              role="button"
              aria-label={`${p.label}: ${p.value}% (${p.submitted} dari ${p.total} papercard)`}
              aria-pressed={selected}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => onSelect(selected ? null : p.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(selected ? null : p.key);
                }
              }}
            >
              <circle className="dml-chart__hit" cx={x(i)} cy={y(p.value)} r={16} />
              {selected && <circle className="dml-chart__ring" cx={x(i)} cy={y(p.value)} r={10} />}
              <circle className={`dml-chart__dot dml-chart__dot--${tone}`} cx={x(i)} cy={y(p.value)} r={5} />
              {showValue && (
                <text
                  className={`dml-chart__value dml-chart__value--${tone}`}
                  x={x(i)}
                  y={y(p.value) - 14}
                  textAnchor="middle"
                >
                  {p.value}%
                </text>
              )}
            </g>
          );
        })}

        {data.map(
          (p, i) =>
            i % labelStep === 0 && (
              <text key={p.key} className="dml-chart__axis" x={x(i)} y={H - 10} textAnchor="middle">
                {p.label}
              </text>
            ),
        )}
      </svg>

      {hovered && hover != null && (
        <div
          className="dml-chart__tooltip"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(hovered.value) / H) * 100}%` }}
          role="status"
        >
          <strong>{hovered.label}</strong>
          <span>
            {hovered.submitted}/{hovered.total} papercard · {hovered.value}%
          </span>
        </div>
      )}
    </div>
  );
}
