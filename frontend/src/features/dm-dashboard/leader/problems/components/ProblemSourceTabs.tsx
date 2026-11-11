"use client";

import { useUiText } from "@/locales/useUiText";

export type ProblemSource = "meeting" | "papercard";

const SOURCES: readonly { key: ProblemSource; label: string }[] = [
  { key: "meeting", label: "DM Meeting" },
  { key: "papercard", label: "Papercard" },
];

export function ProblemSourceTabs({
  value,
  onChange,
}: {
  value: ProblemSource;
  onChange: (next: ProblemSource) => void;
}) {
  const { text: uiText } = useUiText();

  return (
    <div
      className="dml-pb-sources"
      role="group"
      aria-label={uiText("Sumber tracking masalah")}
    >
      {SOURCES.map((source) => (
        <button
          key={source.key}
          type="button"
          className={"dml-pb-source" + (value === source.key ? " is-active" : "")}
          aria-pressed={value === source.key}
          onClick={() => onChange(source.key)}
        >
          {uiText(source.label)}
        </button>
      ))}
    </div>
  );
}
