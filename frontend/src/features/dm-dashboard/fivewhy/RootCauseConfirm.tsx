"use client";
import { useUiText } from "@/locales/useUiText";

import { useEffect, useRef, useState } from "react";

export type RootCauseTarget = {
  level: number;
  statement: string;
  lastFilledLevel: number;
  suggestedLevel: number | null;
  reasonDraft: string;
};

type RootCauseConfirmProps = {
  target: RootCauseTarget | null;
  onConfirm: (note: string) => void;
  onCancel: () => void;
};

const CHECKS = [
  "Kalau ini diperbaiki, masalah tidak muncul lagi.",
  "Tanpa penyebab ini, kejadian tidak akan terjadi.",
  "Tim bisa menindaklanjutinya dengan tindakan yang jelas.",
];

const STATEMENT_PREVIEW = 200;

export default function RootCauseConfirm({
  target,
  onConfirm,
  onCancel,
}: RootCauseConfirmProps) {
  const { text: uiText } = useUiText();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));
  const [note, setNote] = useState("");
  const open = target !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setChecked(CHECKS.map(() => false));
      setNote(target?.reasonDraft ?? "");
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>("input[type='checkbox']")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      returnFocusRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const level = target?.level ?? 0;
  const deeper = target !== null && target.level < target.lastFilledLevel;
  const differsFromSuggestion =
    target !== null &&
    target.suggestedLevel !== null &&
    target.suggestedLevel !== target.level;
  const ready = checked.every(Boolean) && note.trim().length > 0;
  const statement = target?.statement.trim() ?? "";
  const preview =
    statement.length > STATEMENT_PREVIEW
      ? `${statement.slice(0, STATEMENT_PREVIEW)}...`
      : statement;

  return (
    <dialog
      ref={dialogRef}
      className="dm-5w-root dm-5w-upload-modal dm-5w-confirm"
      aria-labelledby="dm-5w-confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) onConfirm(note.trim());
        }}
      >
        <h2 className="dm-5w-card-title" id="dm-5w-confirm-title">
          {uiText("Tandai Why {{v0}} sebagai Root Cause?", { v0: level })}
        </h2>
        {preview ? <p className="dm-5w-confirm-statement">{preview}</p> : null}

        {deeper && target ? (
          <p className="dm-5w-chain-warn" role="note">
            {uiText(
              "Why {{v0}} sudah terisi dan lebih dalam. Lanjutkan hanya kalau Why di bawahnya tidak lagi menjelaskan sebab.",
              { v0: target.lastFilledLevel }
            )}
          </p>
        ) : null}

        <fieldset className="dm-5w-confirm-checks">
          <legend className="dm-5w-label">{uiText("Cek dulu")}</legend>
          {CHECKS.map((label, index) => (
            <label className="dm-5w-confirm-check" key={label}>
              <input
                type="checkbox"
                checked={checked[index]}
                onChange={(event) =>
                  setChecked((current) =>
                    current.map((value, position) =>
                      position === index ? event.target.checked : value
                    )
                  )
                }
              />
              <span>{uiText(label)}</span>
            </label>
          ))}
        </fieldset>

        <label className="dm-5w-field">
          <span className="dm-5w-label">
            {differsFromSuggestion && target
              ? uiText("Kenapa bukan Why {{v0}} seperti saran?", {
                  v0: target.suggestedLevel,
                })
              : uiText("Alasan kenapa ini Root Cause")}
          </span>
          <textarea
            className="dm-5w-textarea"
            rows={2}
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={uiText("Tulis alasan singkat")}
            required
          />
        </label>

        <div className="dm-5w-upload-modal-footer">
          <button
            type="button"
            className="dm-5w-btn dm-5w-btn-secondary"
            onClick={onCancel}
          >
            {uiText("Batal")}
          </button>
          <button
            type="submit"
            className="dm-5w-btn dm-5w-btn-primary"
            disabled={!ready}
          >
            {uiText("Tandai Root Cause")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
