import { ProgressBar } from "@/components/ui/ProgressBar";

export function OverallProgress({ done, total }: { done: number; total: number }) {
  const value = total === 0 ? 0 : (done / total) * 100;
  return (
    <section className="ui-card dml-pc-progress" aria-label="Progres keseluruhan">
      <div className="dml-pc-progress__head">
        <h2>Progres keseluruhan</h2>
        <strong>
          {done}/{total}
        </strong>
      </div>
      <ProgressBar value={value} tone="ok" />
    </section>
  );
}
