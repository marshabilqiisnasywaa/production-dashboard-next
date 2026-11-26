"use client";

import "./loading-state.css";

export function InlineSpinner({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`dm-inline-spinner${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function SessionLoader({
  label,
  sublabel,
  fullScreen = false,
}: {
  label: string;
  sublabel?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={`dm-session-loader${fullScreen ? " is-fullscreen" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="dm-session-loader__card">
        <div className="dm-session-loader__visual" aria-hidden="true">
          <span className="dm-session-loader__ring" />
          <span className="dm-session-loader__bars">
            <span />
            <span />
            <span />
            <span />
          </span>
        </div>
        <p className="dm-session-loader__label">{label}</p>
        {sublabel ? <p className="dm-session-loader__sub">{sublabel}</p> : null}
      </div>
    </div>
  );
}

export function ChartLoader({
  label,
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`dm-chart-loader${compact ? " is-compact" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="dm-chart-loader__bars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      {label ? <p className="dm-chart-loader__label">{label}</p> : null}
    </div>
  );
}

const SKELETON_WIDTHS = ["72%", "90%", "64%", "85%", "58%", "78%"];

export function TableSkeleton({
  rows = 5,
  columns = 5,
  label,
}: {
  rows?: number;
  columns?: number;
  label?: string;
}) {
  const gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;

  return (
    <div
      className="dm-table-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="dm-table-skeleton__head"
        style={{ gridTemplateColumns }}
        aria-hidden="true"
      >
        {Array.from({ length: columns }).map((_, colIdx) => (
          <span
            key={colIdx}
            className="dm-table-skeleton__cell"
            style={{ width: colIdx === 0 ? "55%" : "68%" }}
          />
        ))}
      </div>

      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="dm-table-skeleton__row"
          style={{ gridTemplateColumns }}
          aria-hidden="true"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <span
              key={colIdx}
              className="dm-table-skeleton__cell"
              style={{
                width: SKELETON_WIDTHS[(rowIdx + colIdx) % SKELETON_WIDTHS.length],
                animationDelay: `${rowIdx * 0.08}s`,
              }}
            />
          ))}
        </div>
      ))}

      {label ? (
        <div className="dm-table-skeleton__footer">
          <InlineSpinner size={13} />
          <span>{label}</span>
        </div>
      ) : null}
    </div>
  );
}
