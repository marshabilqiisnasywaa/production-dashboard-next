"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/shell/Icon";

export type CustomSelectOption = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  value?: string;
  defaultValue?: string;
  options: readonly (string | CustomSelectOption)[];
  onChange?: (value: string) => void;
  ariaLabel?: string;
};

function normalize(options: readonly (string | CustomSelectOption)[]): CustomSelectOption[] {
  return options.map((item) => (typeof item === "string" ? { value: item, label: item } : item));
}

export default function CustomSelect({ value, defaultValue = "", options, onChange, ariaLabel }: CustomSelectProps) {
  const normalized = normalize(options);
  const [internal, setInternal] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = value ?? internal;
  const selected = normalized.find((item) => item.value === current) ?? { value: current, label: current };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  const pick = (optionValue: string) => {
    if (value === undefined) setInternal(optionValue);
    onChange?.(optionValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-block", minWidth: 120, maxWidth: "100%" }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { setHighlight(Math.max(normalized.findIndex((item) => item.value === current), 0)); setOpen((state) => !state); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((index) => (index + (event.key === "ArrowDown" ? 1 : normalized.length - 1)) % Math.max(normalized.length, 1));
          } else if (event.key === "Enter" && open && normalized[highlight]) {
            event.preventDefault();
            pick(normalized[highlight].value);
          }
        }}
        style={{ width: "100%", minHeight: 34, padding: "0 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: "1px solid var(--border)", borderRadius: 9, background: "var(--card)", color: "var(--text)", fontSize: 11, cursor: "pointer" }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.label}</span>
        <Icon name="chevron" size={13} />
      </button>
      {open && (
        <div role="listbox" aria-label={ariaLabel} style={{ position: "absolute", zIndex: 80, top: "calc(100% + 5px)", left: 0, minWidth: "100%", maxWidth: 260, maxHeight: 240, overflowY: "auto", padding: 5, border: "1px solid var(--border)", borderRadius: 10, background: "var(--card)", boxShadow: "var(--shadow)" }}>
          {normalized.map((item, index) => (
            <button
              key={`${item.value}-${index}`}
              type="button"
              role="option"
              aria-selected={item.value === current}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => pick(item.value)}
              style={{ width: "100%", minHeight: 31, padding: "0 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: 0, borderRadius: 7, background: index === highlight ? "rgba(var(--accent-rgb),.07)" : "transparent", color: item.value === current ? "var(--accent-2)" : "var(--text)", fontSize: 11, textAlign: "left", cursor: "pointer" }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
              {item.value === current && <b>✓</b>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
