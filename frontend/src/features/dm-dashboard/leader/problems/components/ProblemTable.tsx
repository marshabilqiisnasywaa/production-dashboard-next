import { Button } from "@/components/ui/Button";
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
  onToggle: (id: string, currentlySolved: boolean) => void;
}

export function ProblemTable({ rows, onToggle }: Props) {
  return (
    <div className="dml-table-wrap">
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
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="dml-empty">
                Tidak ada masalah di sini.
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const view = STATUS_VIEW[r.status];
            const solved = r.status === "solved";
            return (
              <tr key={r.id} className={r.status === "escalated" ? "is-escalated" : undefined}>
                <td className="is-strong">{formatMeetingDate(r.date)}</td>
                <td>{r.sessionLabel}</td>
                <td>{r.line}</td>
                <td className="dml-pb-problem">
                  {r.problem}
                  {r.sample && <span className="dml-pb-sample"> (contoh)</span>}
                </td>
                <td>{r.picName}</td>
                <td>
                  <div>{formatDue(r.due)}</div>
                  {r.status === "escalated" && <div className="dml-pb-overdue">Terlambat {formatOverdue(r.overdueMs)}</div>}
                </td>
                <td>
                  <StatusChip tone={view.tone}>{view.label}</StatusChip>
                </td>
                <td>
                  <Button variant={solved ? "ghost" : "outline"} onClick={() => onToggle(r.id, solved)}>
                    {solved ? "Buka lagi" : "Tandai selesai"}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
