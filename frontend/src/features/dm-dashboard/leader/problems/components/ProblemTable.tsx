"use client";

import { useEffect, useRef, useState } from "react";
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
}

type ConfirmState = { id: string; action: "complete" | "reopen" } | null;

function formatSolvedAt(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const time = date
    .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    .replace(/\./g, ":");

  return `${day}, ${time}`;
}

export function ProblemTable({
  rows,
  emptyMessage = "Tidak ada masalah yang sesuai dengan filter.",
  onToggleSolved,
}: Props) {
  const [confirming, setConfirming] = useState<ConfirmState>(null);
  const confirmRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!confirming) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirming(null);
    };
    const handlePointer = (event: PointerEvent) => {
      if (confirmRef.current && !confirmRef.current.contains(event.target as Node)) {
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
          {reopen ? "Yakin buka kembali?" : "Yakin sudah selesai?"}
        </span>
        <span className="dml-pb-act-row">
          <button
            type="button"
            className="dml-pb-act-yes"
            aria-label={`${reopen ? "Ya, buka kembali" : "Ya, tandai selesai"}: ${row.problem || "-"}`}
            onClick={() => {
              onToggleSolved?.(row.id, reopen);
              setConfirming(null);
            }}
          >
            Ya
          </button>
          <button
            type="button"
            className="dml-pb-act-cancel"
            aria-label={`Batal ${reopen ? "buka kembali" : "tandai selesai"}: ${row.problem || "-"}`}
            onClick={() => setConfirming(null)}
          >
            Batal
          </button>
        </span>
      </div>
    );
  };

  return (
    <div className="dml-table-wrap dml-pb-table-wrap">
      <table className="dml-table dml-pb-table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Sesi</th>
            <th>Line</th>
            <th>Masalah</th>
            <th>PIC</th>
            <th>Due date</th>
            <th>Status</th>
            {onToggleSolved && <th className="dml-pb-act-col">Aksi</th>}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={onToggleSolved ? 8 : 7} className="dml-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const view = STATUS_VIEW[r.status];
              const isSolved = r.status === "solved";
              const isConfirming = confirming?.id === r.id;

              return (
                <tr
                  key={r.id}
                  className={r.status === "escalated" ? "is-escalated" : undefined}
                >
                  <td title={r.date}>{formatMeetingDate(r.date)}</td>

                  <td title={r.sessionLabel}>
                    <span className="dml-pb-truncate">
                      {r.sessionLabel}
                    </span>
                  </td>

                  <td title={r.line}>{r.line || "-"}</td>

                  <td className="dml-pb-problem" title={r.problem}>
                    <span className="dml-pb-truncate">
                      {r.problem || "-"}
                      {r.sample && (
                        <span className="dml-pb-sample"> (contoh)</span>
                      )}
                    </span>
                  </td>

                  <td title={r.picName}>{r.picName || "-"}</td>

                  <td>
                    <div className="dml-pb-due">
                      <span>{formatDue(r.due)}</span>
                      {r.status === "escalated" && (
                        <span
                          className="dml-pb-overdue"
                          title={`Terlambat ${formatOverdue(r.overdueMs)}`}
                        >
                          {formatOverdue(r.overdueMs)}
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <StatusChip tone={view.tone}>{view.label}</StatusChip>
                  </td>

                  {onToggleSolved && (
                    <td>
                      {isSolved ? (
                        <div className="dml-pb-act">
                          <span className="dml-pb-act-done">✓ Selesai</span>
                          {formatSolvedAt(r.solvedAt) && (
                            <span className="dml-pb-act-time">
                              {formatSolvedAt(r.solvedAt)}
                            </span>
                          )}
                          {isConfirming && confirming.action === "reopen" ? (
                            renderConfirm(r, "reopen")
                          ) : (
                            <button
                              type="button"
                              className="dml-pb-act-reopen"
                              aria-label={`Buka kembali: ${r.problem || "-"}`}
                              onClick={() =>
                                setConfirming({ id: r.id, action: "reopen" })
                              }
                            >
                              Buka kembali
                            </button>
                          )}
                        </div>
                      ) : isConfirming && confirming.action === "complete" ? (
                        renderConfirm(r, "complete")
                      ) : (
                        <button
                          type="button"
                          className="dml-pb-act-btn"
                          aria-label={`Tandai selesai: ${r.problem || "-"}`}
                          onClick={() => setConfirming({ id: r.id, action: "complete" })}
                        >
                          Tandai selesai
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
