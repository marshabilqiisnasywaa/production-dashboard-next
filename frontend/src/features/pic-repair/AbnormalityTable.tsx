import type { ReactNode } from "react";import { AttachmentButton } from "@/features/pic-repair/PicAttachmentPreview";
import type { PicRepairRecord, PicRepairStatus } from "@/features/pic-repair/RepairPicContext";
import StatusBadge from "@/components/ui/StatusBadge";

export type AbnormalityTableProps = {
  rows: PicRepairRecord[];
  showPic?: boolean;
  showDueDate?: boolean;
  renderStatus?: (row: PicRepairRecord) => ReactNode;
  actions?: (row: PicRepairRecord) => ReactNode;
  rowClassName?: (row: PicRepairRecord) => string;
  onPreview: (row: PicRepairRecord) => void;
};

function formatDueDate(iso: string): string {
  const tanggal = new Date(`${iso}T00:00:00`);
  if (!iso || Number.isNaN(tanggal.getTime())) return "-";
  return tanggal.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function catatanDueDate(iso: string): string {
  const target = Date.parse(iso);
  if (!iso || Number.isNaN(target)) return "Not set";
  const diff = Math.round((target - Date.parse(new Date().toISOString().slice(0, 10))) / 86400000);
  if (diff < 0) return `Overdue ${Math.abs(diff)} days`;
  if (diff === 0) return "Today";
  return `${diff} days left`;
}

export function isOverdue(iso: string): boolean {
  const target = Date.parse(iso);
  if (!iso || Number.isNaN(target)) return false;
  return target < Date.parse(new Date().toISOString().slice(0, 10));
}

export function badgeStatusTengah(status: PicRepairStatus, overdue: boolean) {
  return <StatusBadge status={status} overdue={overdue} />;
}

export default function AbnormalityTable({ rows, showPic, showDueDate, renderStatus, actions, rowClassName, onPreview }: AbnormalityTableProps) {
  return <div className="repair-table-scroll"><table className="repair-data-table abnormality-table pic-table pic-table-slim"><colgroup><col style={{ width: "120px" }} /><col style={{ width: "120px" }} /><col style={{ width: "130px" }} /><col style={{ minWidth: "260px" }} /><col style={{ minWidth: "240px" }} /><col style={{ minWidth: "200px" }} /><col style={{ width: "96px" }} />{showPic && <col style={{ width: "170px" }} />}{showDueDate && <col style={{ width: "150px" }} />}<col style={{ width: "130px" }} />{actions && <col style={{ minWidth: "240px" }} />}</colgroup><thead><tr><th>Date Found</th><th>Area / Line</th><th>5M1E Factor</th><th>Problem Description</th><th>Root Cause</th><th>Effect</th><th>Photo Evidence</th>{showPic && <th>PIC</th>}{showDueDate && <th>Due Date</th>}<th>Status</th>{actions && <th>Aksi</th>}</tr></thead><tbody>{rows.map((item) => <tr key={item.id} className={rowClassName ? rowClassName(item) : undefined}><td>{item.date}</td><td>{item.area}</td><td><span className="pic-factor">{item.factor}</span></td><td><p className="pic-clamp">{item.problem}</p></td><td><p className="pic-clamp">{item.reason}</p></td><td><p className="pic-clamp">{item.impact}</p></td><td><AttachmentButton record={item} onPreview={onPreview} /></td>{showPic && <td>{item.pic}</td>}{showDueDate && <td><div><strong>{formatDueDate(item.dueDate)}</strong></div><span className="kpi-unit">{catatanDueDate(item.dueDate)}</span></td>}<td>{renderStatus ? renderStatus(item) : <StatusBadge status={item.status} variant="chip" />}</td>{actions && <td>{actions(item)}</td>}</tr>)}</tbody></table></div>;
}
