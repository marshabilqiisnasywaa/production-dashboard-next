"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function LeaderDashboardDrawer({ title, onClose, children }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function trapFocus(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="dml-drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="dml-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dml-drawer-title"
        onKeyDown={trapFocus}
      >
        <header className="dml-drawer__header">
          <h2 id="dml-drawer-title">{title}</h2>
          <button
            ref={closeButton}
            type="button"
            aria-label="Tutup detail"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="dml-drawer__body">{children}</div>
      </section>
    </div>
  );
}
