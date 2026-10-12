import type { ReactNode } from "react";import { AttachmentButton } from "@/features/pic-repair/PicAttachmentPreview";
import type { PicRepairRecord, PicRepairStatus } from "@/features/pic-repair/RepairPicContext";

export type AbnormalityTableProps = {
  rows: PicRepairRecord[];
  showPic?: boolean;
  showDueDate?: boolean;
  renderStatus?: (row: PicRepairRecord) => ReactNode;
  actions?: (row: PicRepairRecord) => ReactNode;
  rowClassName?: (row: PicRepairRecord) => string;
  onPreview: (row: PicRepairRecord) => void;
};

const statusChipClass: Record<PicRepairStatus, string> = {
  Open: "status-open",
  "In Progress": "status-progress",
  Resolved: "status-closed-loop",
};

function formatDueDate(iso: string): string {
  const tanggal = new Date(`${iso}T00:00:00`);
  if (!iso || Number.isNaN(tanggal.getTime())) return "-";
  return tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function catatanDueDate(iso: string): string {
  const target = Date.parse(iso);
  if (!iso || Number.isNaN(target)) return "Belum ditentukan";
  const diff = Math.round((target - Date.parse(new Date().toISOString().slice(0, 10))) / 86400000);
  if (diff < 0) return `Terlambat ${Math.abs(diff)} hari`;
  if (diff === 0) return "Hari ini";
  return `H-${diff}`;
}

export function isOverdue(iso: string): boolean {
  const target = Date.parse(iso);
  if (!iso || Number.isNaN(target)) return false;
  return target < Date.parse(new Date().toISOString().slice(0, 10));
}

export function badgeStatusTengah(status: PicRepairStatus, overdue: boolean) {
  const label = overdue && status !== "Resolved" ? "Overdue" : status;
  const warna = label === "Overdue" ? "bg-red-600 text-white" : label === "Open" ? "bg-red-100 text-red-700" : label === "In Progress" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800";
  return <div className="text-center"><span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${warna}`}>{label}</span></div>;
}

export default function AbnormalityTable({ rows, showPic, showDueDate, renderStatus, actions, rowClassName, onPreview }: AbnormalityTableProps) {
  return <div className="repair-table-scroll"><table className="repair-data-table abnormality-table pic-table pic-table-slim"><colgroup><col style={{ width: "120px" }} /><col style={{ width: "120px" }} /><col style={{ width: "130px" }} /><col style={{ minWidth: "260px" }} /><col style={{ minWidth: "240px" }} /><col style={{ minWidth: "200px" }} /><col style={{ width: "96px" }} />{showPic && <col style={{ width: "170px" }} />}{showDueDate && <col style={{ width: "150px" }} />}<col style={{ width: "130px" }} />{actions && <col style={{ minWidth: "240px" }} />}</colgroup><thead><tr><th>Tanggal Temuan</th><th>Area Lini</th><th>Faktor 5M1E</th><th>Deskripsi Masalah</th><th>Akar Penyebab</th><th>Efek Masalah</th><th>Foto Bukti</th>{showPic && <th>Nama PIC</th>}{showDueDate && <th>Due Date</th>}<th>Status</th>{actions && <th>Aksi</th>}</tr></thead><tbody>{rows.map((item) => <tr key={item.id} className={rowClassName ? rowClassName(item) : undefined}><td>{item.date}</td><td>{item.area}</td><td><span className="pic-factor">{item.factor}</span></td><td><p className="pic-clamp">{item.problem}</p></td><td><p className="pic-clamp">{item.reason}</p></td><td><p className="pic-clamp">{item.impact}</p></td><td><AttachmentButton record={item} onPreview={onPreview} /></td>{showPic && <td>{item.pic}</td>}{showDueDate && <td><div><strong>{formatDueDate(item.dueDate)}</strong></div><span className="kpi-unit">{catatanDueDate(item.dueDate)}</span></td>}<td>{renderStatus ? renderStatus(item) : <span className={`status-chip ${statusChipClass[item.status]}`}>{item.status}</span>}</td>{actions && <td>{actions(item)}</td>}</tr>)}</tbody></table></div>;
}
