"use client";
import type { SharedAbnormality } from "@/features/abnormality/abnormalityStore";
import { badgeStatusTengah, isOverdue } from "@/features/pic-repair/AbnormalityTable";

type FollowupTableProps = {
  rows: SharedAbnormality[];
  onRemind: (row: SharedAbnormality) => void;
};

function formatTanggal(iso: string): string {
  const tanggal = new Date(`${iso}T00:00:00`);
  if (!iso || Number.isNaN(tanggal.getTime())) return "-";
  return tanggal.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function sisaHari(iso: string): string {
  const target = Date.parse(iso);
  if (!iso || Number.isNaN(target)) return "Not set";
  const diff = Math.round((target - Date.parse(new Date().toISOString().slice(0, 10))) / 86400000);
  if (diff < 0) return `Overdue ${Math.abs(diff)} days`;
  if (diff === 0) return "Today";
  return `${diff} days left`;
}

function formatDiingatkan(iso?: string): string {
  if (!iso) return "—";
  const waktu = new Date(iso);
  if (Number.isNaN(waktu.getTime())) return "—";
  return waktu.toLocaleString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Tabel Follow-up untuk Host dan HOD: fokus pada solusi, penanggung jawab, due date, dan pengingat. */
export default function FollowupTable({ rows, onRemind }: FollowupTableProps) {
  return (
    <div className="repair-table-scroll">
      <table className="repair-data-table abnormality-table pic-table pic-table-slim">
        <colgroup>
          <col style={{ minWidth: "260px" }} />
          <col style={{ minWidth: "240px" }} />
          <col style={{ width: "150px" }} />
          <col style={{ width: "160px" }} />
          <col style={{ width: "130px" }} />
          <col style={{ width: "150px" }} />
          <col style={{ minWidth: "150px" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Problem Description</th>
            <th>Solution Plan</th>
            <th>PIC</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Last Reminded</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const overdue = isOverdue(item.dueDate) && item.status !== "Resolved";
            return (
              <tr key={item.id}>
                <td><p className="pic-clamp">{item.masalah}</p></td>
                <td><p className="pic-clamp">{item.solusi}</p></td>
                <td>{item.pic}</td>
                <td>
                  <div><strong>{formatTanggal(item.dueDate)}</strong></div>
                  <span className="kpi-unit">{sisaHari(item.dueDate)}</span>
                </td>
                <td>{badgeStatusTengah(item.status, isOverdue(item.dueDate))}</td>
                <td><span className="kpi-unit">{formatDiingatkan(item.diingatkanPada)}</span></td>
                <td>
                  <button
                    type="button"
                    className={overdue ? "px-3 py-1.5 rounded-md border border-green-600 bg-white dark:bg-slate-900 text-green-700 font-medium text-xs whitespace-nowrap shrink-0 hover:bg-green-50" : "repair-primary whitespace-nowrap shrink-0"}
                    onClick={() => onRemind(item)}
                  >
                    {item.diingatkanPada ? "Follow-up Lagi" : "Follow-up"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
