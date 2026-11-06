"use client";
import { useUiText } from "@/locales/useUiText";


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
  const { text: uiText } = useUiText();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dml-mt-dialog" onCancel={(e) => { e.preventDefault(); onCancel(); }}>
      <h2>{uiText("Akhiri meeting?")}</h2>
      <ul>
        <li>{uiText("Durasi meeting: ")}<strong>{uiText(durationText)}</strong>
        </li>
        <li>
          {itemCount > 0 ? (
            <>
              <strong>{itemCount}</strong>{uiText(" poin tindak lanjut akan disimpan")}</>
          ) : (
            "Tidak ada poin masalah yang dicatat"
          )}
        </li>
        {absentCount > 0 && (
          <li>
            <strong>{absentCount}</strong>{uiText(" member tercatat tidak hadir")}</li>
        )}
      </ul>
      <p>{uiText("Setelah diakhiri, meeting tidak bisa dibuka kembali.")}</p>
      <div className="dml-mt-dialog__actions">
        <Button variant="outline" size="lg" onClick={onCancel}>{uiText("Kembali")}</Button>
        <Button variant="primary" size="lg" className="dml-mt-danger" onClick={onConfirm}>{uiText("Akhiri Meeting")}</Button>
      </div>
    </dialog>
  );
}
