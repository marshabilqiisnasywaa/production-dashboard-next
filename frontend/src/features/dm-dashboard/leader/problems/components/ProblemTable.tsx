"use client";
import { useUiText } from "@/locales/useUiText";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";
import { formatDue } from "../../meeting/utils";
import type { ProblemRow, ProblemStatus } from "../types";
import { formatMeetingDate, formatOverdue } from "../utils";

const STATUS_VIEW: Record<ProblemStatus, { tone: ChipTone; label: string }> = {
  unsolved: { tone: "wait", label: "Unsolved" },
  escalated: { tone: "ng", label: "Eskalasi SPV" },
  solved: { tone: "ok", label: "Solved" },
};

interface Props {
  rows: ProblemRow[];
  emptyMessage?: string;
  onToggleSolved?: (id: string, currentlySolved: boolean) => void;
  onSaveSolution?: (id: string, solution: string) => Promise<void>;
  onSaveDueDate?: (id: string, dueDate: string) => Promise<void>;
}

type ConfirmState = { id: string; action: "complete" | "reopen" } | null;

function formatSolvedAt(value: string | null, locale = "id-ID"): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
  const time = date
    .toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
    .replace(/\./g, ":");

  return `${day}, ${time}`;
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";

  // Supports ISO dates and ISO timestamps without shifting the calendar date.
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function ProblemTable({
  rows,
  emptyMessage = "Tidak ada masalah yang sesuai dengan filter.",
  onToggleSolved,
  onSaveSolution,
  onSaveDueDate,
}: Props) {
  const { text: uiText, locale: uiLocale } = useUiText();
  const [assignmentDetails, setAssignmentDetails] = useState<{ kind: "line" | "pic"; problem: string; entries: { name: string; manual?: boolean }[] } | null>(null);
  const assignmentDialogRef = useRef<HTMLDialogElement>(null);
  const assignmentTitleId = useId();

  useEffect(() => {
    const dialog = assignmentDialogRef.current;
    if (!dialog) return;
    if (assignmentDetails && !dialog.open) dialog.showModal();
    if (!assignmentDetails && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [assignmentDetails]);
  const [confirming, setConfirming] = useState<ConfirmState>(null);
  const confirmRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!confirming) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirming(null);
    };
    const handlePointer = (event: PointerEvent) => {
      if (
        confirmRef.current &&
        !confirmRef.current.contains(event.target as Node)
      ) {
        setConfirming(null);
      }
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("pointerdown", handlePointer);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("pointerdown", handlePointer);
    };
  }, [confirming]);

  const renderConfirm = (row: ProblemRow, action: "complete" | "reopen") => {
    const reopen = action === "reopen";

    return (
      <div ref={confirmRef} className="dml-pb-act-confirm">
        <span className="dml-pb-act-question">
          {reopen
            ? uiText("Yakin buka kembali?")
            : uiText("Yakin sudah selesai?")}
        </span>
        <span className="dml-pb-act-row">
          <button
            type="button"
            className="dml-pb-act-yes"
            aria-label={uiText(
              `${reopen ? "Ya, buka kembali" : "Ya, tandai selesai"}: ${
                row.problem || "-"
              }`
            )}
            onClick={() => {
              onToggleSolved?.(row.id, reopen);
              setConfirming(null);
            }}
          >
            {uiText("Ya")}
          </button>
          <button
            type="button"
            className="dml-pb-act-cancel"
            aria-label={uiText("Batal {{v0}}: {{v1}}", {
              v0: reopen ? "buka kembali" : "tandai selesai",
              v1: row.problem || "-",
            })}
            onClick={() => setConfirming(null)}
          >
            {uiText("Batal")}
          </button>
        </span>
      </div>
    );
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [solutionDraft, setSolutionDraft] = useState("");
  const [savingSolution, setSavingSolution] = useState(false);
  const [solutionError, setSolutionError] = useState<string | null>(null);

  function startSolutionEdit(row: ProblemRow) {
    setEditingId(row.id);
    setSolutionDraft(row.solution ?? "");
    setSolutionError(null);
  }

  function cancelSolutionEdit() {
    setEditingId(null);
    setSolutionDraft("");
    setSolutionError(null);
  }

  async function handleSaveSolution() {
    if (!editingId || !onSaveSolution || savingSolution) return;

    setSavingSolution(true);
    setSolutionError(null);

    try {
      await onSaveSolution(editingId, solutionDraft.trim());
      cancelSolutionEdit();
    } catch (error) {
      setSolutionError(
        error instanceof Error
          ? error.message
          : "Solusi gagal disimpan. Coba lagi."
      );
    } finally {
      setSavingSolution(false);
    }
  }

  const [editingDueId, setEditingDueId] = useState<string | null>(null);
  const [dueDateDraft, setDueDateDraft] = useState("");
  const [savingDueDate, setSavingDueDate] = useState(false);
  const [dueDateError, setDueDateError] = useState<string | null>(null);

  function startDueDateEdit(row: ProblemRow) {
    setEditingDueId(row.id);
    setDueDateDraft(toDateInputValue(row.due));
    setDueDateError(null);
  }

  function cancelDueDateEdit() {
    setEditingDueId(null);
    setDueDateDraft("");
    setDueDateError(null);
  }

  async function handleSaveDueDate() {
    if (!editingDueId || !onSaveDueDate || !dueDateDraft || savingDueDate) {
      return;
    }

    setSavingDueDate(true);
    setDueDateError(null);

    try {
      await onSaveDueDate(editingDueId, dueDateDraft);
      cancelDueDateEdit();
    } catch (error) {
      setDueDateError(
        error instanceof Error
          ? error.message
          : "Due date gagal disimpan. Coba lagi."
      );
    } finally {
      setSavingDueDate(false);
    }
  }

  return (
    <div className="dml-table-wrap dml-pb-table-wrap">
      <table className="dml-table dml-pb-table dml-pb-table--tracking">
        <thead>
          <tr>
            <th>{uiText("Tanggal")}</th>
            <th>{uiText("Sesi")}</th>
            <th>{uiText("Line")}</th>
            <th>{uiText("Kategori")}</th>
            <th>{uiText("Masalah")}</th>
            <th>{uiText("Solusi")}</th>
            <th>{uiText("PIC")}</th>
            <th>{uiText("Due date")}</th>
            <th>{uiText("Status")}</th>
            {onToggleSolved && (
              <th className="dml-pb-act-col">{uiText("Aksi")}</th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={onToggleSolved ? 10 : 9} className="dml-empty">
                {uiText(emptyMessage)}
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const view = STATUS_VIEW[r.status];
              const isSolved = r.status === "solved";
              const isConfirming = confirming?.id === r.id;
              const lineEntries = (r.lineCodes?.length ? r.lineCodes : r.line && r.line !== "-" ? r.line.split(",").map((line) => line.trim()).filter(Boolean) : []).map((name) => ({ name }));
              const picEntries = r.pics?.length ? r.pics.map((pic) => ({ name: pic.name, manual: pic.employeeId == null })) : r.picName && r.picName !== "-" ? [{ name: r.picName }] : [];

              return (
                <tr
                  key={r.id}
                  className={
                    r.status === "escalated" ? "is-escalated" : undefined
                  }
                >
                  <td title={uiText(r.date)}>
                    {formatMeetingDate(r.date, uiLocale)}
                  </td>

                  <td title={uiText(r.sessionLabel)}>
                    <span className="dml-pb-truncate">
                      {uiText(r.sessionLabel)}
                    </span>
                  </td>

                  <td>
                    {lineEntries.length > 1 ? <button type="button" className="dml-pb-assignment-count" aria-haspopup="dialog" aria-label={uiText("Lihat semua line")} onClick={() => setAssignmentDetails({ kind: "line", problem: r.problem, entries: lineEntries })}>
                      {uiText("{{v0}} line", { v0: lineEntries.length })}<ChevronRight size={13} aria-hidden="true" />
                    </button> : <span className="dml-pb-truncate" title={lineEntries[0]?.name}>{lineEntries[0]?.name || "-"}</span>}
                  </td>

                  <td style={{ whiteSpace: "normal" }}>
                    {r.problemCategories?.length
                      ? r.problemCategories.join(", ")
                      : "-"}
                  </td>

                  <td className="dml-pb-problem" title={r.problem}>
                    <span className="dml-pb-truncate">
                      {r.problem || "-"}
                      {r.sample && (
                        <span className="dml-pb-sample">
                          {uiText(" (contoh)")}
                        </span>
                      )}
                    </span>
                  </td>

                  <td style={{ whiteSpace: "normal" }}>
                    {editingId === r.id ? (
                      <div style={{ minWidth: 220 }}>
                        <textarea
                          autoFocus
                          className="ui-textarea"
                          rows={3}
                          aria-label={uiText("Solusi untuk {{v0}}", {
                            v0: r.problem,
                          })}
                          placeholder={uiText(
                            "Tulis solusi atau tindakan perbaikan"
                          )}
                          value={solutionDraft}
                          disabled={savingSolution}
                          onChange={(event) => {
                            setSolutionDraft(event.target.value);
                            setSolutionError(null);
                          }}
                        />

                        {solutionError && <p role="alert">{solutionError}</p>}
                      </div>
                    ) : (
                      <span
                        style={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {r.solution || "-"}
                      </span>
                    )}
                  </td>

                  <td>
                    {picEntries.length > 1 ? <button type="button" className="dml-pb-assignment-count" aria-haspopup="dialog" aria-label={uiText("Lihat semua PIC")} onClick={() => setAssignmentDetails({ kind: "pic", problem: r.problem, entries: picEntries })}>
                      {uiText("{{v0}} PIC", { v0: picEntries.length })}<ChevronRight size={13} aria-hidden="true" />
                    </button> : <span className="dml-pb-truncate" title={picEntries[0]?.name}>{picEntries[0]?.name || "-"}</span>}
                  </td>

                  <td>
                    {/* {editingDueId === r.id ? (
    <div className="dml-pb-due-editor">
      <input
        autoFocus
        type="date"
        className="dml-pb-due-input"
        aria-label={uiText("Due date untuk {{v0}}", { v0: r.problem })}
        value={dueDateDraft}
        disabled={savingDueDate}
        onChange={(event) => {
          setDueDateDraft(event.target.value);
          setDueDateError(null);
        }}
      />

      {dueDateError && (
        <p className="dml-pb-due-error" role="alert">
          {dueDateError}
        </p>
      )}

      {!onSaveDueDate && (
        <p className="dml-pb-due-hint">{uiText("Penyimpanan belum tersedia melalui API saat ini.")}</p>
      )}

      <div className="dml-pb-due-actions">
        <button
          type="button"
          className="dml-pb-due-save"
          disabled={
            !onSaveDueDate ||
            !dueDateDraft ||
            dueDateDraft === toDateInputValue(r.due) ||
            savingDueDate
          }
          onClick={handleSaveDueDate}
        >
          {savingDueDate ? uiText("Menyimpan...") : uiText("Simpan")}
        </button>

        <button
          type="button"
          className="dml-pb-due-cancel"
          disabled={savingDueDate}
          onClick={cancelDueDateEdit}
        >{uiText("Batal")}</button>
      </div>
    </div>
  ) : ( */}
                    <div className="dml-pb-due">
                      <span>{uiText(formatDue(r.due, uiLocale))}</span>

                      {r.status === "escalated" && (
                        <span
                          className="dml-pb-overdue"
                          title={uiText("Terlambat {{v0}}", {
                            v0: formatOverdue(r.overdueMs, uiLocale),
                          })}
                        >
                          {formatOverdue(r.overdueMs, uiLocale)}
                        </span>
                      )}

                      {/* <button
                        type="button"
                        className="dml-pb-due-edit"
                        aria-label={uiText("Edit due date untuk {{v0}}", {
                          v0: r.problem,
                        })}
                        title={uiText("Edit due date")}
                        disabled={editingDueId !== null}
                        onClick={() => startDueDateEdit(r)}
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          width="14"
                          height="14"
                          fill="none"
                        >
                          <path
                            d="m12.5 4.5 3 3M3.5 16.5l3.6-.8L16 6.8a2.12 2.12 0 0 0-3-3L4.1 12.7l-.6 3.8Z"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button> */}
                    </div>
                  </td>

                  <td>
                    <StatusChip tone={view.tone}>
                      {uiText(view.label)}
                    </StatusChip>
                  </td>

                  {onToggleSolved && (
                    <td>
                      {r.canEdit === false ? <span title={uiText("Hanya PIC yang dapat menindaklanjuti masalah ini.")}>—</span> : <>
                      {onSaveSolution && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          {editingId === r.id ? (
                            <>
                              <button
                                type="button"
                                className="dml-pb-act-btn"
                                disabled={
                                  savingSolution ||
                                  solutionDraft.trim() ===
                                    (r.solution ?? "").trim()
                                }
                                onClick={handleSaveSolution}
                              >
                                {savingSolution
                                  ? uiText("Menyimpan...")
                                  : uiText("Simpan solusi")}
                              </button>

                              <button
                                type="button"
                                className="dml-pb-act-cancel"
                                disabled={savingSolution}
                                onClick={cancelSolutionEdit}
                              >
                                {uiText("Batal")}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="dml-pb-act-btn"
                              disabled={editingId !== null}
                              onClick={() => startSolutionEdit(r)}
                            >
                              {r.solution?.trim()
                                ? uiText("Edit solusi")
                                : uiText("Tambah solusi")}
                            </button>
                          )}
                        </div>
                      )}
                      {isSolved ? (
                        <div className="dml-pb-act">
                          <span className="dml-pb-act-done">
                            {uiText("✓ Selesai")}
                          </span>
                          {formatSolvedAt(r.solvedAt, uiLocale) && (
                            <span className="dml-pb-act-time">
                              {formatSolvedAt(r.solvedAt, uiLocale)}
                            </span>
                          )}
                          {isConfirming && confirming.action === "reopen" ? (
                            renderConfirm(r, "reopen")
                          ) : (
                            <button
                              type="button"
                              className="dml-pb-act-reopen"
                              aria-label={uiText("Buka kembali: {{v0}}", {
                                v0: r.problem || "-",
                              })}
                              onClick={() =>
                                setConfirming({ id: r.id, action: "reopen" })
                              }
                            >
                              {uiText("Buka kembali")}
                            </button>
                          )}
                        </div>
                      ) : isConfirming && confirming.action === "complete" ? (
                        renderConfirm(r, "complete")
                      ) : (
                        <button
                          type="button"
                          className="dml-pb-act-btn"
                          aria-label={uiText("Tandai selesai: {{v0}}", {
                            v0: r.problem || "-",
                          })}
                          onClick={() =>
                            setConfirming({ id: r.id, action: "complete" })
                          }
                        >
                          {uiText("Tandai selesai")}
                        </button>
                      )}
                      </>}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <dialog ref={assignmentDialogRef} className="dml-pb-assignment-dialog" aria-labelledby={assignmentTitleId} onCancel={(event) => { event.preventDefault(); setAssignmentDetails(null); }}>
        {assignmentDetails && <>
          <div className="dml-pb-assignment-dialog__head">
            <h2 id={assignmentTitleId}>{assignmentDetails.kind === "line" ? uiText("Line terkait") : uiText("PIC terkait")} <span>{assignmentDetails.entries.length}</span></h2>
            <button type="button" autoFocus aria-label={uiText("Tutup")} onClick={() => setAssignmentDetails(null)}><X size={18} aria-hidden="true" /></button>
          </div>
          <p className="dml-pb-assignment-dialog__problem">{assignmentDetails.problem}</p>
          <ul>
            {assignmentDetails.entries.map((entry, index) => <li key={index}>
              <span className="dml-pb-assignment-dialog__number">{index + 1}</span><strong>{entry.name}</strong>
              {entry.manual && <small>{uiText("PIC manual")}</small>}
            </li>)}
          </ul>
        </>}
      </dialog>
    </div>
  );
}
