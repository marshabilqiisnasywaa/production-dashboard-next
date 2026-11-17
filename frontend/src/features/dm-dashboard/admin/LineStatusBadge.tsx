"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import type { DmLineStatus } from "../dmData";

const OPTIONS: { value: DmLineStatus; label: string; hint: string }[] = [
  { value: "running", label: "RUNNING", hint: "Beroperasi normal" },
  { value: "idle", label: "IDLE", hint: "Standby atau ganti model" },
  { value: "stopped", label: "STOPPED", hint: "Berhenti atau maintenance" },
];

interface LineStatusBadgeProps {
  status: DmLineStatus;
  disabled?: boolean;
  onChange: (next: DmLineStatus) => void;
}

/** Badge status yang bisa langsung di-tap untuk mengganti status line. */
export default function LineStatusBadge({
  status,
  disabled = false,
  onChange,
}: LineStatusBadgeProps) {
  const { text: uiText } = useUiText();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="dm-status-switch" ref={rootRef}>
      <button
        type="button"
        className={`dm-status-badge is-${status} is-switchable`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        title={uiText("Ketuk untuk mengganti status line")}
      >
        <span className="dm-status-dot" aria-hidden="true" />
        {status.toUpperCase()}
        <ChevronDown size={12} aria-hidden="true" className="dm-status-caret" />
      </button>

      {open ? (
        <div className="dm-status-menu" role="menu">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === status}
              className={`dm-status-option is-${option.value}`}
              onClick={() => {
                setOpen(false);
                if (option.value !== status) onChange(option.value);
              }}
            >
              <span className="dm-status-dot" aria-hidden="true" />
              <span className="dm-status-option-text">
                <strong>{option.label}</strong>
                <small>{uiText(option.hint)}</small>
              </span>
              {option.value === status ? <Check size={14} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
