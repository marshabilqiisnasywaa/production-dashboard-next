"use client";
import { MetricChart } from "@/features/repair/RepairDashboard";
import {
  ASSEMBLY_LINES,
  ASSEMBLY_LINE_OUTPUT,
  ASSEMBLY_LINE_PLAN,
  ASSEMBLY_TRENDS,
  PACKAGING_LINES,
  PACKAGING_LINE_OUTPUT,
  PACKAGING_LINE_PLAN,
  type AssemblyModuleKey,
} from "@/data/assemblyMonitoringData";

function LineBreakdown({ lines, plans, actuals, subtitle }: { lines: string[]; plans: number[]; actuals: number[]; subtitle: string }) {
  return (
    <article className="repair-panel wide">
      <div className="repair-card-head"><div><h2>Output per Line</h2><p>{subtitle}</p></div></div>
      <div className="repair-table-scroll">
        <table className="repair-data-table pic-table">
          <thead><tr><th>Line</th><th>Plan</th><th>Actual</th><th>Achievement</th><th>Status</th></tr></thead>
          <tbody>
            {lines.map((line, lineIndex) => {
              const plan = plans[lineIndex];
              const actual = actuals[lineIndex];
              const pct = (actual / plan) * 100;
              const good = pct >= 98;
              return (
                <tr key={line}>
                  <td>{line}</td>
                  <td>{plan.toLocaleString("en-US")}</td>
                  <td>{actual.toLocaleString("en-US")}</td>
                  <td>{pct.toFixed(2)}%</td>
                  <td><span className={`repair-status ${good ? "good" : "bad"}`}>{good ? "Achieved" : "Behind"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function PicAssemblyMonitoring({ module }: { module: AssemblyModuleKey }) {
  const isAssembly = module === "assembly";
  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MORNING MEETING • PIC AREA • ASSEMBLY</div>
          <div className="repair-title-row">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isAssembly ? "Assembly Monitoring" : "Packaging Monitoring"}</h1>
          </div>
          <p>{isAssembly ? "Output, cycle time, dan plan vs actual Line Assembly 01 - 07." : "Output line packing, sealing, dan boxing vs plan."}</p>
        </div>
        <div className="repair-actions">
          <button className="repair-outline" type="button">07 Oct 2026</button>
        </div>
      </div>

      <div className="repair-charts pic-qc-glass">
        {isAssembly ? (
          <>
            <MetricChart id="pic-asm-mon-output" title="Assembly Output vs Plan" values={ASSEMBLY_TRENDS.output} target={ASSEMBLY_TRENDS.outputPlan} direction="higher" domain={[38000, 46000]} full />
            <MetricChart id="pic-asm-mon-cycle" title="Cycle Time" values={ASSEMBLY_TRENDS.cycleTime} target={ASSEMBLY_TRENDS.cycleTarget} direction="lower" domain={[2, 2.6]} full />
            <LineBreakdown lines={ASSEMBLY_LINES} plans={ASSEMBLY_LINE_PLAN} actuals={ASSEMBLY_LINE_OUTPUT} subtitle="Plan vs actual Line Assembly 01 - 07" />
          </>
        ) : (
          <>
            <MetricChart id="pic-asm-mon-pack" title="Packaging Output vs Plan" values={ASSEMBLY_TRENDS.packaging} target={ASSEMBLY_TRENDS.packagingPlan} direction="higher" domain={[38000, 46000]} full />
            <MetricChart id="pic-asm-mon-box" title="Boxing Output vs Plan" values={ASSEMBLY_TRENDS.boxing} target={ASSEMBLY_TRENDS.boxingPlan} direction="higher" domain={[12000, 15000]} full />
            <LineBreakdown lines={PACKAGING_LINES} plans={PACKAGING_LINE_PLAN} actuals={PACKAGING_LINE_OUTPUT} subtitle="Plan vs actual line packing, sealing, dan boxing" />
          </>
        )}
      </div>
    </div>
  );
}
