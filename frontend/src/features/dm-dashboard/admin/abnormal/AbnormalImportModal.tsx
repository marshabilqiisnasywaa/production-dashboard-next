"use client";
import { useUiText } from "@/locales/useUiText";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { abnormalCategoryApi } from "../../api";
import type {
  DmAbnormalImportInput,
  DmAbnormalImportPreview,
  DmAbnormalImportResult,
} from "../../api";
import { downloadCategoryTemplate, readCategoryColumns } from "./abnormalImport";
import "../UserModal.css";
import "../UserImportModal.css";
import "./abnormal.css";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

const ACTION_LABEL = {
  baru: "Baru",
  diperbarui: "Diperbarui",
  tetap: "Tidak berubah",
  error: "Error",
} as const;

interface AbnormalImportModalProps {
  open: boolean;
  onImported: () => Promise<void>;
  onClose: () => void;
}

export default function AbnormalImportModal({
  open,
  onImported,
  onClose,
}: AbnormalImportModalProps) {
  const { text: uiText } = useUiText();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [input, setInput] = useState<DmAbnormalImportInput | null>(null);
  const [preview, setPreview] = useState<DmAbnormalImportPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deactivateMissing, setDeactivateMissing] = useState(false);
  const [result, setResult] = useState<DmAbnormalImportResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setInput(null);
    setPreview(null);
    setFileName("");
    setError(null);
    setBusy(false);
    setDeactivateMissing(false);
    setResult(null);
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  function requestClose() {
    if (busy) return;
    if (
      preview &&
      !result &&
      !window.confirm(uiText("Pratinjau import akan dibuang. Tutup?"))
    )
      return;
    onClose();
  }

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      setError("Pakai file .xlsx. Format .xls atau .csv belum didukung.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("File lebih dari 2 MB.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const columns = await readCategoryColumns(file);
      const checked = await abnormalCategoryApi.previewImport(columns);
      setInput(columns);
      setPreview(checked);
      setFileName(file.name);
      setDeactivateMissing(false);
    } catch (err) {
      setInput(null);
      setPreview(null);
      setError(err instanceof Error ? err.message : "File tidak bisa dibaca.");
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (!input || !preview || preview.errors > 0) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await abnormalCategoryApi.runImport({
        ...input,
        deactivateMissing,
      });
      setResult(saved);
      await onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  function resetFile() {
    setInput(null);
    setPreview(null);
    setFileName("");
    setError(null);
  }

  const items = preview
    ? [...preview.items].sort(
        (a, b) =>
          Number(b.action === "error") - Number(a.action === "error") ||
          a.level - b.level ||
          a.position - b.position
      )
    : [];
  const changes = preview ? preview.created + preview.updated : 0;
  const nothingToSave =
    preview !== null && changes === 0 && !(deactivateMissing && preview.missing.length > 0);

  return (
    <dialog
      ref={dialogRef}
      className="dm-admin-modal dm-line-detail-modal um-modal ui-modal"
      aria-labelledby="abnormal-import-heading"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="um-form">
        <header className="um-head">
          <div>
            <h2
              id="abnormal-import-heading"
              className="um-title"
              tabIndex={-1}
              autoFocus
            >{uiText("Import Kategori Abnormal")}</h2>
            {preview && !result ? <p className="um-sub">{fileName}</p> : null}
          </div>
          <button
            type="button"
            className="um-close"
            onClick={requestClose}
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

          {result ? (
            <>
              <p className="ui-stats" role="status">
                <span className="ui-stat is-ok">
                  <strong>{result.created}</strong>{uiText(" kode baru")}</span>
                <span className="ui-stat">
                  <strong>{result.updated}</strong>{uiText(" diperbarui")}</span>
                <span className="ui-stat">
                  <strong>{result.unchanged}</strong>{uiText(" tidak berubah")}</span>
                {result.deactivated > 0 ? (
                  <span className="ui-stat">
                    <strong>{result.deactivated}</strong>{uiText(" dinonaktifkan")}</span>
                ) : null}
              </p>
            </>
          ) : preview ? (
            <>
              <p className="ui-stats" role="status">
                <span className="ui-stat is-ok">
                  <strong>{preview.created}</strong>{uiText(" baru")}</span>
                <span className="ui-stat">
                  <strong>{preview.updated}</strong>{uiText(" diperbarui")}</span>
                <span className="ui-stat">
                  <strong>{preview.unchanged}</strong>{uiText(" tidak berubah")}</span>
                {preview.errors > 0 ? (
                  <span className="ui-stat is-bad">
                    <strong>{preview.errors}</strong>{uiText(" error")}</span>
                ) : null}
              </p>

              {preview.errors > 0 ? (
                <p className="um-error" role="alert">
                  {uiText("Perbaiki baris yang error di file Excel, lalu pilih file lagi. Tidak ada yang disimpan selama masih ada error.")}
                </p>
              ) : null}

              {preview.missing.length > 0 ? (
                <label className="ab-check">
                  <input
                    type="checkbox"
                    checked={deactivateMissing}
                    disabled={busy}
                    onChange={(event) => setDeactivateMissing(event.target.checked)}
                  />
                  <span>
                    {uiText("Nonaktifkan {{v0}} kode yang ada di sistem tapi tidak ada di file", {
                      v0: preview.missing.length,
                    })}
                    <span className="ab-check-hint">
                      {preview.missing.slice(0, 8).join(", ")}
                      {preview.missing.length > 8 ? ", ..." : ""}
                    </span>
                  </span>
                </label>
              ) : null}

              <div
                className="ui-wrap"
                tabIndex={0}
                role="region"
                aria-label={uiText("Pratinjau isi file")}
              >
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>{uiText("Level")}</th>
                      <th>{uiText("Kode")}</th>
                      <th>{uiText("Nama")}</th>
                      <th>{uiText("Induk")}</th>
                      <th>{uiText("Status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={`${item.level}-${item.position}`}>
                        <td className="ui-num">{item.level}</td>
                        <td className="ui-mono">{item.code || "-"}</td>
                        <td>{item.name}</td>
                        <td className="ui-mono">{item.parentCode ?? "-"}</td>
                        <td>
                          <span
                            className={`ui-tag${
                              item.action === "baru"
                                ? " is-ok"
                                : item.action === "error"
                                ? " is-bad"
                                : " ab-tag-plain"
                            }`}
                          >
                            {uiText(ACTION_LABEL[item.action])}
                          </span>
                          {item.message ? (
                            <span className="ui-why">
                              {uiText("Code {{v0}}, baris {{v1}}: ", { v0: item.level, v1: item.position })}
                              {uiText(item.message)}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <ol className="ui-steps">
                <li>
                  <span className="ui-step-title">{uiText("Siapkan file")}</span>
                  <span className="ui-step-text">{uiText("Tiga kolom berjudul Code 1, Code 2, dan Code 3. Tiap sel berbentuk KODE-Nama.")}</span>
                  <button
                    type="button"
                    className="um-btn ui-btn-outline"
                    onClick={() =>
                      downloadCategoryTemplate().catch(() =>
                        setError("Template gagal dibuat.")
                      )
                    }
                  >{uiText("Unduh template")}</button>
                </li>
                <li>
                  <span className="ui-step-title">{uiText("Unggah file Excel")}</span>
                  <span className="ui-step-text">{uiText("Format .xlsx, sheet pertama, maks. 2 MB. Isi diperiksa dulu sebelum disimpan.")}</span>
                  <label className="um-btn is-primary ui-pick">
                    {busy ? uiText("Memeriksa...") : uiText("Pilih file Excel")}
                    <input
                      type="file"
                      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="um-file-input"
                      disabled={busy}
                      onChange={pickFile}
                    />
                  </label>
                </li>
              </ol>
              <details className="ui-rules">
                <summary>{uiText("Aturan isi file")}</summary>
                <dl>
                  <dt>{uiText("Code 1")}</dt>
                  <dd>{uiText("Kode satu huruf, misalnya P-Planning Losses.")}</dd>
                  <dt>{uiText("Code 2")}</dt>
                  <dd>{uiText("Diawali kode Code 1 induknya, misalnya P01-Ramp Up Losses.")}</dd>
                  <dt>{uiText("Code 3")}</dt>
                  <dd>{uiText("Diawali kode Code 2 induknya, misalnya P01-01-New Operator.")}</dd>
                  <dt>{uiText("Hubungan")}</dt>
                  <dd>{uiText("Induk dibaca dari kode, bukan dari posisi baris. Kode yang sudah ada diperbarui namanya, kode baru ditambahkan.")}</dd>
                </dl>
              </details>
            </>
          )}
        </div>

        <footer className="um-foot">
          {result ? (
            <button type="button" className="um-btn is-primary" onClick={onClose}>
              {uiText("Selesai")}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="um-btn is-ghost"
                disabled={busy}
                onClick={requestClose}
              >{uiText("Batal")}</button>
              {preview ? (
                <>
                  <button
                    type="button"
                    className="um-btn is-ghost"
                    disabled={busy}
                    onClick={resetFile}
                  >{uiText("Pilih file lain")}</button>
                  <button
                    type="button"
                    className="um-btn is-primary"
                    disabled={busy || preview.errors > 0 || nothingToSave}
                    onClick={run}
                  >
                    {busy
                      ? uiText("Menyimpan...")
                      : nothingToSave
                      ? uiText("Tidak ada perubahan")
                      : uiText("Simpan {{v0}} perubahan", {
                          v0: changes + (deactivateMissing ? preview.missing.length : 0),
                        })}
                  </button>
                </>
              ) : null}
            </>
          )}
        </footer>
      </div>
    </dialog>
  );
}
