"use client";
import { useUiText } from "@/locales/useUiText";
import type { ReactNode } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TARGET, TONE_LABEL, toneFor, type Tone } from "../utils";

interface KpiCardProps {
  title: string;
  value: number | null;
  icon: ReactNode;
  target?: number;
  /** Change in % points vs previous period. Omit to hide the line. */
  delta?: number | null;
  unit?: string;
  tone?: Tone | "missing";
  targetLabel?: string;
  progressSize?: "sm" | "md";
  featured?: boolean;
  showTarget?: boolean;
}

export function KpiCard({
  title,
  value,
  icon,
  target = TARGET,
  delta,
  unit = "%",
  tone: toneProp,
  targetLabel,
  progressSize = "md",
  featured = false,
  showTarget = true,
}: KpiCardProps) {
  const { text: uiText } = useUiText();
  const tone = toneProp ?? (value === null ? "missing" : toneFor(value, target));
  const hint = targetLabel ?? (
    tone === "missing" ? "data tidak tersedia" : TONE_LABEL[tone]
  );
  const progressTone = tone === "missing" ? "ok" : tone;

  return (
    <article
      className={`dml-kpi${featured ? " dml-kpi--focal" : ""}`}
      aria-current={featured ? "true" : undefined}
    >
      <div className="dml-kpi__top">
        <h3>{uiText(title)}</h3>
        <span className={`dml-kpi__icon dml-kpi__icon--${tone}`}>{icon}</span>
      </div>
      <p className="dml-kpi__value">
        {value === null ? "—" : `${uiText(value)}${uiText(unit)}`}
      </p>

      {delta !== undefined && delta !== null && (
        <p className={`dml-kpi__delta ${delta > 0 ? "is-up" : delta < 0 ? "is-down" : ""}`}>
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta)}{uiText("% vs periode sebelumnya")}</p>
      )}

      {showTarget && (
        <>
          <p className={`dml-kpi__hint is-${tone}`}>
            <span className="dml-kpi__status-dot" aria-hidden="true" />
            <span>
              {uiText("Target ")}{target}% · {uiText(hint)}
            </span>
          </p>
          {value === null ? (
            <div
              className={`ui-progress ui-progress--${progressSize} ui-progress--missing`}
              aria-hidden="true"
            >
              <span className="ui-progress__tick" style={{ left: `${target}%` }} />
            </div>
          ) : (
            <ProgressBar
              value={value}
              target={target}
              tone={progressTone}
              size={progressSize}
            />
          )}
        </>
      )}
    </article>
  );
}
