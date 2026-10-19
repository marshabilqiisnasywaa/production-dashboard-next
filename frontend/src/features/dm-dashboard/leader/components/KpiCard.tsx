import type { ReactNode } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TARGET, TONE_LABEL, toneFor } from "../utils";

interface KpiCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  target?: number;
  /** Change in % points vs previous period. Omit to hide the line. */
  delta?: number | null;
}

export function KpiCard({ title, value, icon, target = TARGET, delta }: KpiCardProps) {
  const tone = toneFor(value, target);

  return (
    <article className="dml-kpi">
      <div className="dml-kpi__top">
        <h3>{title}</h3>
        <span className={`dml-kpi__icon dml-kpi__icon--${tone}`}>{icon}</span>
      </div>

      <p className="dml-kpi__value">{value}%</p>

      {delta !== undefined && delta !== null && (
        <p className={`dml-kpi__delta ${delta > 0 ? "is-up" : delta < 0 ? "is-down" : ""}`}>
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta)}% vs periode sebelumnya
        </p>
      )}

      <p className="dml-kpi__hint">
        Target {target}% · {TONE_LABEL[tone]}
      </p>
      <ProgressBar value={value} target={target} tone={tone} />
    </article>
  );
}
