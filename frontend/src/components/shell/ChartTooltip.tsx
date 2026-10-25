"use client";

type ChartTooltipEntry = {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: readonly ChartTooltipEntry[];
  label?: string | number;
  format?: (value: number | string) => string;
};

function formatEntry(value: ChartTooltipEntry["value"], format?: ChartTooltipProps["format"]): string {
  if (typeof value === "number") return format ? format(value) : value.toLocaleString("en-US");
  if (typeof value === "string") return value;
  return "-";
}

export default function ChartTooltip({ active, payload, label, format }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-white/60 dark:border-slate-800/60 text-slate-800 dark:text-slate-100 z-50 min-w-[150px]">
      {label !== undefined && label !== "" && (
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 border-b border-slate-100 pb-1">{label}</div>
      )}
      {payload.map((entry, index) => (
        <div key={`${entry.dataKey ?? entry.name ?? index}`} className="flex items-center gap-1 pt-1">
          <span className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ background: entry.color ?? "#059669" }} />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{entry.name}</span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 ml-auto pl-3">{formatEntry(entry.value, format)}</span>
        </div>
      ))}
    </div>
  );
}
