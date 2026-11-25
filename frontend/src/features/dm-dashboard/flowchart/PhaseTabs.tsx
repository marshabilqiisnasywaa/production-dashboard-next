
"use client";

import { Fragment } from "react";
import {
  CalendarClock,
  ClipboardList,
  Send,
  ArrowRight,
} from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import { FLOWCHART_PHASES, type FlowchartPhase } from "./types";

type Props = {
  value: FlowchartPhase;
  counts: Record<FlowchartPhase, number>;
  onChange: (phase: FlowchartPhase) => void;
};

export default function PhaseTabs({
  value,
  counts,
  onChange,
}: Props) {
  const { text: uiText } = useUiText();

  const icons = {
    pre: Send,
    during: ClipboardList,
    post: CalendarClock,
  };

  return (
    <div
      className="dmfc-phase-tabs"
      role="tablist"
      aria-label={uiText("Fase dokumen")}
    >
      {FLOWCHART_PHASES.map((phase, index) => {
        const Icon = icons[phase.value];

        return (
          <Fragment key={phase.value}>
            <button
              type="button"
              role="tab"
              aria-selected={value === phase.value}
              className={value === phase.value ? "is-active" : ""}
              onClick={() => onChange(phase.value)}
            >
              <Icon size={18} />
              <span>{uiText(phase.label)}</span>
              <b>{counts[phase.value]}</b>
            </button>

            {index < FLOWCHART_PHASES.length - 1 && (
              <ArrowRight
                size={16}
                className="dmfc-phase-tabs__arrow"
                aria-hidden="true"
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
