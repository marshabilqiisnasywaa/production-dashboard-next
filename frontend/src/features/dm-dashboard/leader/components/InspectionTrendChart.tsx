"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useRef, useState } from "react";
import type { TrendGranularity, TrendPoint } from "../types";
import { TARGET, toneFor } from "../utils";

interface Props {
  data: TrendPoint[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  target?: number;
  granularity?: TrendGranularity;
}

// Plain SVG chart (no chart library needed). Swap for recharts later if you prefer.
const TICKS = [0, 25, 50, 75, 100];

export function InspectionTrendChart({
  data,
  selectedKey,
  onSelect,
  target = TARGET,
  granularity = "day",
}: Props) {
  const { text: uiText } = useUiText();
  const [hover, setHover] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 300 });
  const W = size.width;
  const H = size.height;
  const PAD = { top: 28, right: 24, bottom: 32, left: 46 };
  const IW = Math.max(1, W - PAD.left - PAD.right);
  const IH = Math.max(1, H - PAD.top - PAD.bottom);
  const x = (i: number) =>
    data.length <= 1
      ? PAD.left + IW / 2
      : PAD.left + (i * IW) / (data.length - 1);
  const y = (v: number) => PAD.top + IH * (1 - v / 100);

  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width > 0 && height > 0) {
        setSize((current) =>
          current.width === width && current.height === height
            ? current
            : { width, height },
        );
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const segments: number[][] = [];
  data.forEach((point, index) => {
    if (point.total === 0) return;
    const lastSegment = segments[segments.length - 1];
    if (
      lastSegment &&
      data[lastSegment[lastSegment.length - 1] + 1]?.total > 0
    ) {
      lastSegment.push(index);
    } else {
      segments.push([index]);
    }
  });
  const line = segments
    .map((segment) =>
      segment
        .map((index, pointIndex) =>
          `${pointIndex === 0 ? "M" : "L"}${x(index)},${y(data[index].value)}`,
        )
        .join(" "),
    )
    .join(" ");
  const areas = segments
    .filter((segment) => segment.length > 1)
    .map((segment) => {
      const first = segment[0];
      const last = segment[segment.length - 1];
      return `M${x(first)},${y(0)} L${segment
        .map((index) => `${x(index)},${y(data[index].value)}`)
        .join(" L")} L${x(last)},${y(0)} Z`;
    });

  const showAllValues = data.length <= 10;
  const hovered =
    hover != null && data[hover]?.total > 0 ? data[hover] : null;

  return (
    <div className="dml-chart" ref={chartRef}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={uiText("Grafik tren Inspection Rate")}>
        {TICKS.map((t) => (
          <g key={t}>
            <line className="dml-chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="dml-chart__axis" x={PAD.left - 10} y={y(t) + 4} textAnchor="end">
              {t}%
            </text>
          </g>
        ))}

        {areas.map((area, index) => (
          <path key={index} className="dml-chart__area" d={area} />
        ))}

        <line className="dml-chart__target" x1={PAD.left} x2={W - PAD.right} y1={y(target)} y2={y(target)} />
        <text className="dml-chart__target-label" x={W - PAD.right} y={y(target) + 16} textAnchor="end">{uiText("Target ")}{target}%
        </text>

        <path className="dml-chart__line" d={line} />

        {data.map((p, i) => {
          if (p.total === 0) return null;
          const tone = toneFor(p.value, target);
          const selected = p.key === selectedKey;
          const showValue = showAllValues || tone !== "ok" || selected || hover === i;
          return (
            <g
              key={p.key}
              className="dml-chart__point"
              tabIndex={0}
              role="button"
              aria-label={uiText("{{v0}}: {{v1}}% ({{v2}} dari {{v3}} papercard)", { v0: p.label, v1: p.value, v2: p.submitted, v3: p.total })}
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

        {data.map((p, i) => {
          const label =
            granularity === "day" && data.length > 14
              ? String(Number(p.key.slice(-2)))
              : p.label;
          return (
            <text
              key={p.key}
              className="dml-chart__axis"
              x={x(i)}
              y={H - 10}
              textAnchor="middle"
            >
              {uiText(label)}
            </text>
          );
        })}
      </svg>

      {hovered && hover != null && (
        <div
          className="dml-chart__tooltip"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(hovered.value) / H) * 100}%` }}
          role="status"
        >
          <strong>{uiText(hovered.label)}</strong>
          <span>
            {hovered.submitted}/{hovered.total}{uiText(" papercard · ")}{hovered.value}%
          </span>
        </div>
      )}
    </div>
  );
}
