"use client";

export type ChartTimeTab = "Daily" | "Week" | "Month" | "Year";
export const chartTimeTabOptions: ChartTimeTab[] = ["Daily", "Week", "Month", "Year"];

type ChartTimeTabsProps = {
  activeTab: ChartTimeTab;
  onChange: (tab: ChartTimeTab) => void;
  ariaLabel?: string;
  className?: string;
};

export default function ChartTimeTabs({
  activeTab,
  onChange,
  ariaLabel,
  className = "",
}: ChartTimeTabsProps) {
  return (
    <div
      className={`bg-slate-100/90 dark:bg-slate-800/90 p-0.5 rounded-lg inline-flex items-center gap-0.5 border border-slate-200/60 dark:border-slate-700/60 ${className}`}
      role="group"
      aria-label={ariaLabel ?? "Chart time period"}
    >
      {chartTimeTabOptions.map((option) => {
        const isActive = activeTab === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={isActive}
            style={{ fontSize: "11px", lineHeight: "24px" }}
            className={`!text-[11px] h-full flex items-center justify-center transition-all cursor-pointer ${
              isActive
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold shadow-xs rounded-md px-1.5"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-normal px-2.5"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}