"use client";
import { useUiText } from "@/locales/useUiText";
interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const { text: uiText } = useUiText();
  return (
    <div className="ui-segmented" role="group" aria-label={uiText(ariaLabel)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? "ui-segmented__btn is-active" : "ui-segmented__btn"}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {uiText(o.label)}
        </button>
      ))}
    </div>
  );
}
