"use client";
import { useUiText } from "@/locales/useUiText";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function OverallProgress({ done, total }: { done: number; total: number }) {
  const { text: uiText } = useUiText();
  const value = total === 0 ? 0 : (done / total) * 100;
  return (
    <section className="ui-card dml-pc-progress" aria-label={uiText("Progres keseluruhan")}>
      <div className="dml-pc-progress__head">
        <h2>{uiText("Progres keseluruhan")}</h2>
        <strong>
          {done}/{total}
        </strong>
      </div>
      <ProgressBar value={value} tone="ok" />
    </section>
  );
}
