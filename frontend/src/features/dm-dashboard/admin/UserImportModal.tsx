"use client";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { DmEmployee, DmEmployeeInput } from "../api";
import { buildRows, downloadTemplate, readWorkbook } from "./UserImport";
import type { ImportRow } from "./UserImport";
import "./UserModal.css";
import "./UserImportModal.css";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

type Outcome = {
  line: number;
  nik: string;
  name: string;
  error: string | null;
};

interface UserImportModalProps {
  open: boolean;
  existing: DmEmployee[];
  create: (input: DmEmployeeInput) => Promise<DmEmployee>;
  onImported: () => Promise<void>;
  onClose: () => void;
}

export default function UserImportModal({
  open,
  existing,
  create,
  onImported,
  onClose,
}: UserImportModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows(null);
    setFileName("");
    setError(null);
    setBusy(false);
    setOutcomes(null);
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  const validCount = rows
    ? rows.filter((row) => row.errors.length === 0).length
    : 0;
  const badCount = rows ? rows.length - validCount : 0;

  function requestClose() {
    if (busy) return;
    if (
      rows &&
      !outcomes &&
      !window.confirm("Pratinjau import akan dibuang. Tutup?")
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
    let table: unknown[][];
    try {
      table = await readWorkbook(file);
    } catch {
      setRows(null);
      setError("File tidak bisa dibaca. Pastikan formatnya .xlsx yang valid.");
      return;
    }
    try {
      setRows(buildRows(table, existing));
      setFileName(file.name);
      setError(null);
    } catch (err) {
      setRows(null);
      setError(err instanceof Error ? err.message : "File tidak bisa dibaca.");
    }
  }

  async function run() {
    if (!rows) return;
    const valid = rows.filter((row) => row.errors.length === 0);
    const ordered = [
      ...valid.filter((row) => row.input.role === "supervisor"),
      ...valid.filter((row) => row.input.role !== "supervisor"),
    ];
    const ids = new Map(existing.map((user) => [user.employeeId, user.id]));
    const result: Outcome[] = rows
      .filter((row) => row.errors.length > 0)
      .map((row) => ({
        line: row.line,
        nik: row.input.employeeId,
        name: row.input.name,
        error: row.errors.join(" "),
      }));

    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: ordered.length });
    for (const row of ordered) {
      let failure: string | null = null;
      try {
        let supervisorId: number | null = null;
        if (row.supervisorNik) {
          const found = ids.get(row.supervisorNik);
          if (found === undefined)
            throw new Error(`Supervisor ${row.supervisorNik} gagal dibuat.`);
          supervisorId = found;
        }
        const saved = await create({ ...row.input, supervisorId });
        ids.set(saved.employeeId, saved.id);
      } catch (err) {
        failure = err instanceof Error ? err.message : "Gagal menyimpan.";
      }
      result.push({
        line: row.line,
        nik: row.input.employeeId,
        name: row.input.name,
        error: failure,
      });
      setProgress((current) => ({ ...current, done: current.done + 1 }));
    }
    result.sort((a, b) => a.line - b.line);
    setOutcomes(result);
    setBusy(false);
    if (result.some((item) => !item.error)) await onImported();
  }

  const savedCount = outcomes
    ? outcomes.filter((item) => !item.error).length
    : 0;
  const failed = outcomes ? outcomes.filter((item) => item.error) : [];

  return (
    <dialog
      ref={dialogRef}
      className="dm-admin-modal dm-line-detail-modal um-modal ui-modal"
      aria-labelledby="user-import-heading"
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
              id="user-import-heading"
              className="um-title"
              tabIndex={-1}
              autoFocus
            >
              Import User
            </h2>
            {rows && !outcomes ? <p className="um-sub">{fileName}</p> : null}
          </div>
          <button
            type="button"
            className="um-close"
            onClick={requestClose}
            aria-label="Tutup"
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
              {error}
            </p>
          ) : null}

          {outcomes ? (
            <>
              <p className="ui-stats" role="status">
                <span className="ui-stat is-ok">
                  <strong>{savedCount}</strong> User tersimpan
                </span>
                {failed.length > 0 ? (
                  <span className="ui-stat is-bad">
                    <strong>{failed.length}</strong> gagal atau dilewati
                  </span>
                ) : null}
              </p>
              {failed.length > 0 ? (
                <div
                  className="ui-wrap"
                  tabIndex={0}
                  role="region"
                  aria-label="Baris yang gagal"
                >
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th>Baris</th>
                        <th>NIK</th>
                        <th>Nama</th>
                        <th>Alasan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failed.map((item) => (
                        <tr key={item.line}>
                          <td className="ui-num">{item.line}</td>
                          <td className="ui-mono">{item.nik || "-"}</td>
                          <td>{item.name || "-"}</td>
                          <td>
                            <span className="ui-why">{item.error}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <div className="um-note">
                <p>
                  Password awal tiap User sama dengan NIK-nya dan wajib diganti
                  saat login pertama.
                </p>
              </div>
            </>
          ) : rows ? (
            <>
              <p className="ui-stats" role="status">
                <span className="ui-stat is-ok">
                  <strong>{validCount}</strong> siap diimpor
                </span>
                {badCount > 0 ? (
                  <span className="ui-stat is-bad">
                    <strong>{badCount}</strong> akan dilewati
                  </span>
                ) : null}
              </p>
              <div
                className="ui-wrap"
                tabIndex={0}
                role="region"
                aria-label="Pratinjau isi file"
              >
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Baris</th>
                      <th>NIK</th>
                      <th>Nama</th>
                      <th>Role</th>
                      <th>Dept</th>
                      <th>Supervisor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.line}>
                        <td className="ui-num">{row.line}</td>
                        <td className="ui-mono">
                          {row.input.employeeId || "-"}
                        </td>
                        <td>{row.input.name || "-"}</td>
                        <td>{row.input.role}</td>
                        <td>{row.input.dept ?? "-"}</td>
                        <td className="ui-mono">{row.supervisorNik ?? "-"}</td>
                        <td>
                          {row.errors.length > 0 ? (
                            <>
                              <span className="ui-tag is-bad">Dilewati</span>
                              <span className="ui-why">
                                {row.errors.join(" ")}
                              </span>
                            </>
                          ) : (
                            <span className="ui-tag is-ok">Siap</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {busy ? (
                <div className="ui-progress" role="status">
                  <progress
                    value={progress.done}
                    max={progress.total}
                    aria-label="Progres penyimpanan"
                  />
                  <span>
                    Menyimpan {progress.done} dari {progress.total}
                  </span>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <ol className="ui-steps">
                <li>
                  <span className="ui-step-title">Siapkan file</span>
                  <span className="ui-step-text">
                    Pakai template supaya nama kolomnya pas.
                  </span>
                  <button
                    type="button"
                    className="um-btn ui-btn-outline"
                    onClick={() =>
                      downloadTemplate().catch(() =>
                        setError("Template gagal dibuat.")
                      )
                    }
                  >
                    Unduh template
                  </button>
                </li>
                <li>
                  <span className="ui-step-title">Unggah file Excel</span>
                  <span className="ui-step-text">
                    Format .xlsx, sheet pertama, maks. 2 MB dan 500 baris.
                  </span>
                  <label className="um-btn is-primary ui-pick">
                    Pilih file Excel
                    <input
                      type="file"
                      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="um-file-input"
                      onChange={pickFile}
                    />
                  </label>
                </li>
              </ol>
              <p className="um-hint">
                Format kolom NIK sebagai Text supaya angka 0 di depan tidak
                hilang.
              </p>
              <details className="ui-rules">
                <summary>Aturan kolom</summary>
                <dl>
                  <dt>nik, nama</dt>
                  <dd>Wajib diisi.</dd>
                  <dt>role</dt>
                  <dd>
                    member, leader, atau supervisor. Kosong dianggap member.
                  </dd>
                  <dt>departemen</dt>
                  <dd>ME, PE, PROD, atau QC.</dd>
                  <dt>supervisor_nik</dt>
                  <dd>
                    NIK supervisor yang sudah ada, atau yang ada di file ini.
                  </dd>
                  <dt>position, work_phone</dt>
                  <dd>Opsional.</dd>
                </dl>
              </details>
            </>
          )}
        </div>

        <footer className="um-foot">
          {outcomes ? (
            <button
              type="button"
              className="um-btn is-primary"
              onClick={onClose}
            >
              Selesai
            </button>
          ) : (
            <>
              <button
                type="button"
                className="um-btn is-ghost"
                disabled={busy}
                onClick={requestClose}
              >
                Batal
              </button>
              {rows ? (
                <button
                  type="button"
                  className="um-btn is-primary"
                  disabled={busy || validCount === 0}
                  onClick={run}
                >
                  {busy ? "Menyimpan..." : `Impor ${validCount} User`}
                </button>
              ) : null}
            </>
          )}
        </footer>
      </div>
    </dialog>
  );
}
