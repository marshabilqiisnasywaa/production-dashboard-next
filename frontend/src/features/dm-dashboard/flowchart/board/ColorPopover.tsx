"use client";

import { useEffect, useRef } from "react";
import { useUiText } from "@/locales/useUiText";

export default function ColorPopover({ open, value, colors, label, onClose, onChange }: {
  open: boolean;
  value: string;
  colors: { value: string; label: string }[];
  label: string;
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  const { text: uiText } = useUiText();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dmfc-toolbar-popover dmfc-color-popover" ref={ref}>
      <strong>{uiText(label)}</strong>
      <div className="dmfc-color-row">
        {colors.map((color) => (
          <button
            key={color.value}
            type="button"
            className={value === color.value ? "is-active" : ""}
            style={{ background: color.value }}
            title={uiText(color.label)}
            aria-label={uiText(color.label)}
            onClick={() => onChange(color.value)}
          />
        ))}
      </div>
    </div>
  );
}
