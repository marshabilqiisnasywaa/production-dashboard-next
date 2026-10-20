
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
}

export function ProblemTable({ rows }: Props) {
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
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="dml-empty">
                Tidak ada masalah yang sesuai dengan filter.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const view = STATUS_VIEW[r.status];

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
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
