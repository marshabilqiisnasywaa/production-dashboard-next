"use client";
export type ChartTimeTab = "Daily" | "Week" | "Month" | "Year";
export const chartTimeTabOptions: ChartTimeTab[] = ["Daily", "Week", "Month", "Year"];
type ChartTimeTabsProps = { activeTab: ChartTimeTab; onChange: (tab: ChartTimeTab) => void; ariaLabel?: string; className?: string };
export default function ChartTimeTabs({ activeTab, onChange, ariaLabel, className = "" }: ChartTimeTabsProps) {
  return (
    <div className={`bg-white/80 backdrop-blur-md border border-white/60 rounded-xl p-1 shadow-xs flex items-center gap-1 ${className}`} role="group" aria-label={ariaLabel ?? "Chart time period"}>
      {chartTimeTabOptions.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={activeTab === option}
          className={activeTab === option ? "bg-slate-900 text-white font-semibold rounded-lg px-3 py-1 text-xs transition-all" : "text-slate-500 hover:text-slate-900 rounded-lg px-3 py-1 text-xs font-medium transition-all"}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
