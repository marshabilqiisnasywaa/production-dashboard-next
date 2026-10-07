"use client";
import { useMemo, useState } from "react";
import { useRepairPic, type PicRepairRecord, type PicRepairStatus } from "@/features/pic-repair/RepairPicContext";
import PicAttachmentPreview, { AttachmentButton } from "@/features/pic-repair/PicAttachmentPreview";

const statusOptions: PicRepairStatus[] = ["Open", "In Progress", "Resolved"];

function statusClass(status: PicRepairStatus) {
  if (status === "Open") return "issue-status open";
  if (status === "In Progress") return "issue-status on-progress";
  return "issue-status done";
}

function nextStatus(status: PicRepairStatus): PicRepairStatus {
  if (status === "Open") return "In Progress";
  if (status === "In Progress") return "Resolved";
  return "Open";
}

export default function PicRepairFollowup() {
  const { records, updateStatus } = useRepairPic();
  const [filter, setFilter] = useState("All");
  const [preview, setPreview] = useState<PicRepairRecord | null>(null);

  const visible = useMemo(() => records.filter((item) => filter === "All" || item.status === filter), [records, filter]);

  return (
    <div>
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MORNING MEETING • PIC AREA</div>
          <div className="repair-title-row">
            <h1>Action Plan</h1>
            <span className="pic-chip"><span>RP</span>Repair - Preassembly</span>
          </div>
          <p>Tracking status penanganan problem area Repair.</p>
        </div>
        <div className="repair-actions">
          <button className="repair-outline" type="button">07 Oct 2026</button>
          <select className="repair-outline" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter status">
            <option>All</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
          </select>
        </div>
      </div>

      <article className="repair-panel wide">
        <div className="repair-card-head">
          <div>
            <h2>Status Penanganan Problem</h2>
            <p>Detail countermeasure, PIC, due date, dan update status</p>
          </div>
        </div>
        <div className="repair-table-scroll">
          <table className="repair-data-table">
            <thead>
              <tr><th>ID</th><th>Problem</th><th>Countermeasure</th><th>PIC</th><th>Due Date</th><th>Status</th><th>Attachment</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.id}</strong><small>{item.area} • {item.date}</small></td>
                  <td><strong>{item.problem}</strong><small>{item.reason}</small></td>
                  <td>{item.countermeasure}</td>
                  <td>{item.pic}</td>
                  <td>{item.dueDate}</td>
                  <td><span className={statusClass(item.status)}>{item.status}</span></td>
                  <td><AttachmentButton record={item} onPreview={setPreview} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <select
                        className="repair-outline"
                        value={item.status}
                        onChange={(event) => updateStatus(item.id, event.target.value as PicRepairStatus)}
                        aria-label={`Update status ${item.id}`}
                      >
                        {statusOptions.map((option) => <option key={option}>{option}</option>)}
                      </select>
                      <button className="repair-primary" type="button" onClick={() => updateStatus(item.id, nextStatus(item.status))}>Update</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <PicAttachmentPreview record={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
