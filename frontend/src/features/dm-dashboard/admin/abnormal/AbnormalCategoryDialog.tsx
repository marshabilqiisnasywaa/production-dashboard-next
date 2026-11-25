"use client";
import { useUiText } from "@/locales/useUiText";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { DmAbnormalCategory } from "../../api";
import "../UserModal.css";
import "./abnormal.css";

export type CategoryDialogState =
  | { mode: "create"; parent: DmAbnormalCategory | null; suggestedCode: string }
  | { mode: "edit"; node: DmAbnormalCategory; descendantCount: number };

interface AbnormalCategoryDialogProps {
  state: CategoryDialogState | null;
  busy: boolean;
  error: string | null;
  onSubmit: (values: { code: string; name: string }) => void;
  onClose: () => void;
}

const LEVEL_ROLE: Record<number, string> = {
  1: "Kategori utama",
  2: "Sub-kategori",
  3: "Rincian kode",
};

export default function AbnormalCategoryDialog({
  state,
  busy,
  error,
  onSubmit,
  onClose,
}: AbnormalCategoryDialogProps) {
  const { text: uiText } = useUiText();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const codeId = useId();
  const nameId = useId();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!state) return;
    setCode(state.mode === "edit" ? state.node.code : state.suggestedCode);
    setName(state.mode === "edit" ? state.node.name : "");
    setTouched(false);
  }, [state]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (state && !dialog.open) dialog.showModal();
    else if (!state && dialog.open) dialog.close();
  }, [state]);

  if (!state) return null;

  const parent = state.mode === "create" ? state.parent : null;
  const level =
    state.mode === "edit" ? state.node.level : parent ? parent.level + 1 : 1;
  const parentCode = parent ? parent.code : null;
  const codeChanged =
    state.mode === "edit" && code.trim().toUpperCase() !== state.node.code;
  const missing = !code.trim() || !name.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (missing || busy) return;
    onSubmit({ code: code.trim(), name: name.trim() });
  }

  const title =
    state.mode === "edit"
      ? uiText("Edit Code {{v0}}", { v0: level })
      : uiText("Tambah Code {{v0}}", { v0: level });

  return (
    <dialog
      ref={dialogRef}
      className="dm-admin-modal dm-line-detail-modal um-modal ab-dialog"
      aria-labelledby={`${codeId}-title`}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <form className="um-form" onSubmit={submit} noValidate>
        <header className="um-head">
          <div className="ab-dialog-head-main">
            <span className={`ab-level-tag is-l${level}`}>
              {uiText("Code {{v0}}", { v0: level })} ·{" "}
              {uiText(LEVEL_ROLE[level])}
            </span>
            <h2
              id={`${codeId}-title`}
              className="um-title"
              tabIndex={-1}
              autoFocus
            >
              {title}
            </h2>
            {parent ? (
              <p className="ab-dialog-parent">
                <span>{uiText("Induk")}:</span>
                <span className={`ab-code-chip is-l${parent.level}`}>
                  {parent.code}
                </span>
                <strong>{parent.name}</strong>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="um-close"
            onClick={onClose}
            disabled={busy}
            aria-label={uiText("Tutup")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="um-body">
          {error ? (
            <p className="um-error" role="alert">
              {uiText(error)}
            </p>
          ) : null}

          <div className="um-field">
            <label className="um-label" htmlFor={codeId}>
              {uiText("Kode")}{" "}
              <span className="um-req" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id={codeId}
              className="um-input is-mono"
              value={code}
              maxLength={24}
              placeholder={
                parentCode
                  ? level === 2
                    ? `${parentCode}01`
                    : `${parentCode}-01`
                  : "P"
              }
              autoComplete="off"
              spellCheck={false}
              aria-invalid={touched && !code.trim() ? true : undefined}
              aria-describedby={`${codeId}-hint`}
              onChange={(event) => setCode(event.target.value)}
            />
            <p id={`${codeId}-hint`} className="ab-field-hint">
              {parentCode
                ? uiText(
                    "Harus diawali {{v0}} dan lebih panjang, misalnya {{v0}}-01.",
                    { v0: parentCode }
                  )
                : state.mode === "edit"
                ? uiText("Huruf besar kecil disamakan menjadi huruf besar.")
                : uiText("Kode satu huruf, misalnya P.")}
            </p>
            {touched && !code.trim() ? (
              <p className="ab-field-error" role="alert">
                {uiText("Kode wajib diisi.")}
              </p>
            ) : null}
            {state.mode === "edit" &&
            codeChanged &&
            state.descendantCount > 0 ? (
              <p className="ab-field-hint">
                {uiText("{{v0}} sub-kode ikut berganti awalan.", {
                  v0: state.descendantCount,
                })}
              </p>
            ) : null}
          </div>

          <div className="um-field">
            <label className="um-label" htmlFor={nameId}>
              {uiText("Nama")}{" "}
              <span className="um-req" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id={nameId}
              className="um-input"
              value={name}
              maxLength={200}
              placeholder={uiText("Contoh: Planning Losses")}
              autoComplete="off"
              aria-invalid={touched && !name.trim() ? true : undefined}
              onChange={(event) => setName(event.target.value)}
            />
            {touched && !name.trim() ? (
              <p className="ab-field-error" role="alert">
                {uiText("Nama wajib diisi.")}
              </p>
            ) : null}
          </div>
        </div>

        <footer className="um-foot">
          <button
            type="button"
            className="um-btn is-ghost"
            disabled={busy}
            onClick={onClose}
          >
            {uiText("Batal")}
          </button>
          <button type="submit" className="um-btn is-primary" disabled={busy}>
            {busy ? uiText("Menyimpan...") : uiText("Simpan")}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
