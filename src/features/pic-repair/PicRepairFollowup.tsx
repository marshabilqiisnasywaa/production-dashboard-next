"use client";
import { useEffect, useMemo, useState } from "react";
import { TODAY_ISO, getDueStatus, useRepairPic, type DueTone, type PicRecordPatch, type PicRepairRecord, type PicRepairStatus } from "@/features/pic-repair/RepairPicContext";
import PicAttachmentPreview from "@/features/pic-repair/PicAttachmentPreview";
import CustomSelect from "@/components/shell/CustomSelect";
import PageHeader from "@/components/shell/PageHeader";
import { AlertCircle, CheckCheck, ListTodo, Timer } from "lucide-react";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const activeOptions: PicRepairStatus[] = ["Open", "In Progress"];

const dueBadgeClass: Record<DueTone, string> = {
  overdue: "border border-red-300 bg-red-50/50 text-red-600 font-medium",
  warn: "border border-amber-300 bg-amber-50/50 text-amber-700 font-medium",
  safe: "border border-gray-200 bg-gray-50 text-gray-600 font-normal",
};

function formatDueDate(iso: string) {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]} ${monthNames[Number(parts[1]) - 1] ?? parts[1]} ${parts[0]}`;
}

export type FollowupBoardProps = {
  records: PicRepairRecord[];
  updateRecord: (id: string, patch: PicRecordPatch) => void;
  sourceLabel?: string;
};

function UpdateStatusModal({ record, updateRecord, onClose }: { record: PicRepairRecord; updateRecord: (id: string, patch: PicRecordPatch) => void; onClose: () => void }) {
  const [status, setStatus] = useState<PicRepairStatus>(record.status);
  const [evidence, setEvidence] = useState(record.evidence);

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateRecord(record.id, { status, evidence: evidence || record.evidence });
    onClose();
  };

  return (
    <div className="repair-modal-backdrop" onMouseDown={onClose}>
      <form className="repair-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={save}>
        <div className="repair-dialog-head">
              <div><h2>Update Status</h2><p>{record.problem}</p></div>
              <button type="button" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="repair-form">
          <label>Handling Status<CustomSelect value={status} options={["Open", "In Progress", "Resolved"]} onChange={(next) => setStatus(next as PicRepairStatus)} /></label>
          <p className="pic-form-hint">Issues marked Resolved automatically leave this task list.</p>
          <label className="repair-dropzone"><strong>Upload Photo Evidence</strong><span>{evidence || "JPG/PNG up to 10 MB"}</span><input type="file" accept="image/*" onChange={(event) => setEvidence(event.target.files?.[0]?.name ?? evidence)} /></label>
        </div>
        <div className="repair-dialog-actions">
              <button type="button" className="repair-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="repair-primary">Save Update</button>
        </div>
      </form>
    </div>
  );
}

export function FollowupBoard({ records, updateRecord, sourceLabel = "Abnormality Log" }: FollowupBoardProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [preview, setPreview] = useState<PicRepairRecord | null>(null);
  const [editing, setEditing] = useState<PicRepairRecord | null>(null);
  const [toast, setToast] = useState(false);

  const activeRecords = useMemo(() => records.filter((item) => item.status !== "Resolved"), [records]);

  const summary = useMemo(() => ([
    { label: "Active Issues", value: String(activeRecords.length), helper: "Require follow-up", tone: "active", icon: ListTodo, iconBox: "text-blue-700 bg-blue-100/60 border border-blue-200/50 backdrop-blur-sm" },
    { label: "Open", value: String(activeRecords.filter((item) => item.status === "Open").length), helper: "Not yet handled", tone: "open", icon: AlertCircle, iconBox: "text-red-600 bg-red-100/60 border border-red-200/50 backdrop-blur-sm" },
    { label: "In Progress", value: String(activeRecords.filter((item) => item.status === "In Progress").length), helper: "Being handled", tone: "progress", icon: Timer, iconBox: "text-amber-600 bg-amber-100/60 border border-amber-200/50 backdrop-blur-sm" },
    { label: "Resolved", value: String(records.filter((item) => item.status === "Resolved").length), helper: "Closed", tone: "resolved", icon: CheckCheck, iconBox: "text-emerald-600 bg-emerald-100/60 border border-emerald-200/50 backdrop-blur-sm" },
  ]), [activeRecords, records]);

  const metricCardClass: Record<string, string> = {
    active: "bg-gradient-to-br! from-blue-50/80 via-indigo-50/30 to-white border border-blue-200/60! rounded-xl! shadow-sm",
    open: "bg-gradient-to-br! from-red-50/80 via-red-50/20 to-white border border-red-200/60! rounded-xl! shadow-sm",
    progress: "bg-gradient-to-br! from-amber-50/80 via-amber-50/20 to-white border border-amber-200/60! rounded-xl! shadow-sm",
    resolved: "bg-gradient-to-br! from-emerald-50/80 via-emerald-50/20 to-white border border-emerald-200/60! rounded-xl! shadow-sm",
  };

  const metricValueClass: Record<string, string> = {
    active: "text-blue-700 font-bold!",
    open: "text-red-600 font-bold!",
    progress: "text-amber-600 font-bold!",
    resolved: "text-emerald-600 font-bold!",
  };

  const filtered = useMemo(() => activeRecords.filter((item) => {
    const searchTerm = query.trim().toLowerCase();
    const matchesQuery = !searchTerm || [item.problem, item.countermeasure, item.area, item.factor].join(" ").toLowerCase().includes(searchTerm);
    return matchesQuery && (statusFilter === "All" || item.status === statusFilter);
  }), [activeRecords, query, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize, records.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);

  const closeEditing = () => {
    if (editing) {
      setEditing(null);
      setToast(true);
      window.setTimeout(() => setToast(false), 2600);
    }
  };

  return (
    <div className="pic-page">
      <PageHeader
        eyebrow="MORNING MEETING"
        title="Follow-up"
        subtitle={`Follow-up tasks from ${sourceLabel} issues that are still Open or In Progress. Today ${formatDueDate(TODAY_ISO)}.`}
        actions={<CustomSelect value={statusFilter} options={[{ value: "All", label: "All Active Statuses" }, ...activeOptions]} onChange={setStatusFilter} ariaLabel="Status filter" />}
      />

      <section className="qc-kpi-grid abnormality-kpis pic-kpis">
        {summary.map((item) => (
          <article key={item.label} className={`sq-kpi ${metricCardClass[item.tone]}`}>
            <div className="sq-kpi-head flex justify-between items-start"><span>{item.label}</span><div className={`p-2.5 rounded-xl ${item.iconBox}`}><item.icon className="w-5 h-5" /></div></div>
            <strong className={metricValueClass[item.tone]}>{item.value}</strong>
            <p>{item.helper}</p>
          </article>
        ))}
      </section>

      <section className="sq-panel">
        <div className="sq-panel-head">
          <div>
            <h2>My Tasks</h2>
            <p>Resolved issues automatically leave this list.</p>
          </div>
        </div>

        <div className="abnormality-filter-row">
          <label className="abnormality-search">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search problems, solutions..." />
          </label>
          <button type="button" className="qc-secondary-button abnormality-reset" onClick={() => { setQuery(""); setStatusFilter("All"); setPage(1); }}>Reset</button>
        </div>

        {filtered.length === 0 ? (
          <div className="abnormality-empty">All issues are resolved. No active tasks.</div>
        ) : (
          <>
            <div className="repair-table-scroll">
              <table className="repair-data-table abnormality-table pic-table pic-table-slim">
                <colgroup>
                  <col style={{ minWidth: "260px" }} />
                  <col style={{ minWidth: "240px" }} />
                  <col style={{ width: "150px" }} />
                  <col style={{ width: "96px" }} />
                  <col style={{ width: "130px" }} />
                  <col style={{ width: "150px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Problem Description</th>
                    <th>Solution Plan</th>
                    <th>Due Date</th>
                    <th>Photo Evidence</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((item) => {
                    const due = getDueStatus(item.dueDate);
                    return (
                      <tr key={item.id}>
                        <td><p className="pic-clamp">{item.problem}</p></td>
                        <td><p className="pic-clamp">{item.countermeasure}</p></td>
                        <td>
                          <div className="text-xs text-gray-500">{formatDueDate(item.dueDate)}</div>
                          <span className={`mt-1 inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${dueBadgeClass[due.tone]}`}>{due.label}</span>
                        </td>
                        <td>
                          <button type="button" className="attachment-thumb" aria-label={`View evidence for ${item.problem}`} onClick={() => setPreview(item)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m5 18 5-5 3 3 3-3 3 3" /></svg>
                          </button>
                        </td>
                        <td><span className={`status-chip ${item.status === "Open" ? "status-open" : "status-progress"}`}>{item.status}</span></td>
                        <td><button type="button" className="repair-primary pic-update" onClick={() => setEditing(item)}>Update Status</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="pic-pagination">
              <span>Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filtered.length)} of {filtered.length} data</span>
              <div className="pic-pagination-controls">
                <CustomSelect value={String(pageSize)} options={[{ value: "5", label: "5 / page" }, { value: "10", label: "10 / page" }]} onChange={(next) => setPageSize(Number(next))} ariaLabel="Rows per page" />
                <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</button>
                <b>{safePage} / {totalPages}</b>
                <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </section>

      <PicAttachmentPreview record={preview} onClose={() => setPreview(null)} />
      {editing && <UpdateStatusModal record={editing} updateRecord={updateRecord} onClose={closeEditing} />}
      {toast && <div className="repair-toast"><span>✓</span>Status updated</div>}
    </div>
  );
}

export default function PicRepairFollowup() {
  const { records, updateRecord } = useRepairPic();
  return <FollowupBoard records={records} updateRecord={updateRecord} />;
}
