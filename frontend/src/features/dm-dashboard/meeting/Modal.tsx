"use client";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

export default function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dm-modal" aria-labelledby={titleId} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      {open ? (
        <div className="dm-modal-body">
          <div className="dm-modal-head">
            <h2 className="dm-modal-title" id={titleId}>{title}</h2>
            <button type="button" className="dm-btn is-secondary" onClick={onClose}>Tutup</button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
