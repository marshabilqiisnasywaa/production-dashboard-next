"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  durationText: string;
  itemCount: number;
  absentCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Native <dialog>: focus trap, Esc to close and backdrop come for free. */
export function EndMeetingDialog({ open, durationText, itemCount, absentCount, onCancel, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dml-mt-dialog" onCancel={(e) => { e.preventDefault(); onCancel(); }}>
      <h2>Akhiri meeting?</h2>
      <ul>
        <li>
          Durasi meeting: <strong>{durationText}</strong>
        </li>
        <li>
          {itemCount > 0 ? (
            <>
              <strong>{itemCount}</strong> poin tindak lanjut akan disimpan
            </>
          ) : (
            "Tidak ada poin masalah yang dicatat"
          )}
        </li>
        {absentCount > 0 && (
          <li>
            <strong>{absentCount}</strong> member tercatat tidak hadir
          </li>
        )}
      </ul>
      <p>Setelah diakhiri, meeting tidak bisa dibuka kembali.</p>
      <div className="dml-mt-dialog__actions">
        <Button variant="outline" size="lg" onClick={onCancel}>
          Kembali
        </Button>
        <Button variant="primary" size="lg" className="dml-mt-danger" onClick={onConfirm}>
          Akhiri Meeting
        </Button>
      </div>
    </dialog>
  );
}
