"use client";
import Icon from "@/components/shell/Icon";

export default function CostSafetyArea() {
  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MONITORING • COST • SAFETY</div>
          <div className="repair-title-row">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Safety Area</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">Pemantauan safety area Cost: battery, incident, information, dan material.</p>
        </div>
      </div>

      <article className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 shadow-xs border border-white/60 dark:border-slate-800/60">
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="text-slate-400"><Icon name="shield" size={40} /></span>
          <h2 className="text-slate-900 dark:text-slate-100 font-semibold text-lg">Coming Soon</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">No Data Available — halaman Safety Area sedang disiapkan.</p>
        </div>
      </article>
    </div>
  );
}
