"use client";
import { useEffect, useRef, type ReactNode } from "react";

type ConfirmDialogProps = {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="mmu-modal" role="alertdialog" aria-modal="true" aria-labelledby="mmu-confirm-title" onMouseDown={onCancel}>
      <div className="mmu-confirm" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="mmu-confirm-title">{title}</h2>
        <div className="mmu-confirm__body">{children}</div>
        <div className="mmu-confirm__actions">
          <button ref={cancelRef} type="button" className="mmu-secondary" onClick={onCancel}>Batal</button>
          <button type="button" className={tone === "danger" ? "mmu-danger-solid" : "mmu-primary"} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
