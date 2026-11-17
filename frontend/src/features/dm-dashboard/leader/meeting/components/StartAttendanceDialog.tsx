"use client";

import { useEffect, useId, useRef } from "react";
import { useUiText } from "@/locales/useUiText";
import { Button } from "@/components/ui/Button";
import { IconFaceScan } from "./MeetingIcons";

type MeetingScope = "line" | "dm";

interface Props {
  open: boolean;
  scope: MeetingScope;
  sessionText: string;
  dateText: string;
  lineText: string;
  groupName: string | null;
  groupLines: string[];
  preparing: boolean;
  error: string | null;
  onScopeChange: (scope: MeetingScope) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function StartAttendanceDialog({
  open,
  scope,
  sessionText,
  dateText,
  lineText,
  groupName,
  groupLines,
  preparing,
  error,
  onScopeChange,
  onCancel,
  onConfirm,
}: Props) {
  const { text: uiText } = useUiText();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dml-mt-dialog dml-mt-start-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!preparing) onCancel();
      }}
    >
      <div className="dml-mt-start-dialog__header">
        <span className="dml-mt-start-dialog__header-icon">
          <IconFaceScan size={20} />
        </span>
        <h2 id={titleId}>{uiText("Konfirmasi Mulai Presensi")}</h2>
      </div>
      <button
        type="button"
        className="dml-mt-start-dialog__close"
        aria-label={uiText("Tutup dialog")}
        disabled={preparing}
        onClick={onCancel}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      <p className="dml-mt-start-dialog__intro">
        {uiText("Periksa sesi dan peserta sebelum membuka presensi. Cakupan peserta tidak dapat diubah setelah dikonfirmasi.")}
      </p>

      <dl className="dml-mt-start-dialog__meta">
        <div>
          <dt>{uiText("Sesi")}</dt>
          <dd>{sessionText}</dd>
        </div>
        <div>
          <dt>{uiText("Tanggal")}</dt>
          <dd>{dateText}</dd>
        </div>
        <div>
          <dt>{uiText("Line pembuka")}</dt>
          <dd>{lineText}</dd>
        </div>
      </dl>

      <fieldset className="dml-mt-start-dialog__scopes">
        <legend>{uiText("Pilih Peserta:")}</legend>
        <label
          className={
            "dml-mt-start-dialog__option" +
            (scope === "line" ? " is-selected" : "")
          }
        >
          <input
            type="radio"
            name="meeting-scope"
            value="line"
            checked={scope === "line"}
            disabled={preparing}
            onChange={() => onScopeChange("line")}
          />
          <span>
            <strong>{uiText("Line Saya {{v0}}", { v0: lineText })}</strong>
            <small>
              {uiText("Hanya anggota line yang dapat melakukan presensi. Peserta dari line lain tidak dapat melakukan presensi.")}
            </small>
          </span>
        </label>

        {groupName && (
          <label
            className={
              "dml-mt-start-dialog__option" +
              (scope === "dm" ? " is-selected" : "")
            }
          >
            <input
              type="radio"
              name="meeting-scope"
              value="dm"
              checked={scope === "dm"}
              disabled={preparing}
              onChange={() => onScopeChange("dm")}
            />
            <span>
              <strong>{uiText("Gabungan {{v0}}", { v0: groupName })}</strong>
              <small>
                {uiText("Hanya anggota terdaftar dari seluruh line dalam grup ini dapat melakukan presensi.")}
              </small>
              {groupLines.length > 0 && (
                <span className="dml-mt-start-dialog__lines">
                  {uiText("Line yang termasuk")}: {groupLines.join(", ")}
                </span>
              )}
            </span>
          </label>
        )}
      </fieldset>

      {error && <p className="dml-mt-start-dialog__error" role="alert">{uiText(error)}</p>}

      <div className="dml-mt-dialog__actions">
        <Button
          variant="outline"
          size="lg"
          disabled={preparing}
          onClick={onCancel}
        >
          {uiText("Kembali")}
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={preparing}
          onClick={onConfirm}
        >
          {preparing
            ? uiText("Memulai presensi...")
            : uiText("Konfirmasi & Mulai Presensi")}
        </Button>
      </div>
    </dialog>
  );
}
