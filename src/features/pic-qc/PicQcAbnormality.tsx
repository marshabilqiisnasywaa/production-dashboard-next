"use client";
import { useEffect, useMemo, useState } from "react";
import { QC_PIC_NAME, useQcPic } from "@/features/pic-qc/QcPicContext";
import type { PicRepairInput, PicRepairRecord, PicRepairStatus } from "@/features/pic-repair/RepairPicContext";
import AbnormalityTable from "@/features/pic-repair/AbnormalityTable";
import CustomSelect from "@/components/shell/CustomSelect";
import PicAttachmentPreview from "@/features/pic-repair/PicAttachmentPreview";
import PicPlanUpload, { type PlanUploadValue } from "@/features/pic-repair/PicPlanUpload";
import { AlertCircle, CheckCircle2, Clock, FileText } from "lucide-react";

const areaOptions = ["FQC", "OQC", "ODM"];
const factorOptions = ["Machine", "Man", "Material", "Method", "Media", "Env"];
const statusOptions: PicRepairStatus[] = ["Open", "In Progress", "Resolved"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const emptyForm = {
  date: "2026-10-07",
  area: "FQC",
  factor: "Machine",
  problem: "",
  reason: "",
  impact: "",
  countermeasure: "",
  dueDate: "2026-10-09",
  status: "Open" as PicRepairStatus,
  evidence: "",
};

function formatDisplayDate(iso: string) {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]} ${monthNames[Number(parts[1]) - 1] ?? parts[1]} ${parts[0]}`;
}

export default function PicQcAbnormality() {  const { records, addRecord } = useQcPic();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [areaFilter, setAreaFilter] = useState("All");
  const [factorFilter, setFactorFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [attachment, setAttachment] = useState<PlanUploadValue | null>(null);
  const [preview, setPreview] = useState<PicRepairRecord | null>(null);

  const summary = useMemo(() => ([
    { label: "Total Abnormality", value: String(records.length), helper: "Total recorded cases", tone: "total", icon: FileText, iconBox: "text-slate-900 bg-slate-100/60 border border-slate-200/50 backdrop-blur-sm" },
    { label: "Open", value: String(records.filter((item) => item.status === "Open").length), helper: "Requires attention", tone: "open", icon: AlertCircle, iconBox: "text-red-600 bg-red-100/60 border border-red-200/50 backdrop-blur-sm" },
    { label: "In Progress", value: String(records.filter((item) => item.status === "In Progress").length), helper: "Under action", tone: "progress", icon: Clock, iconBox: "text-amber-600 bg-amber-100/60 border border-amber-200/50 backdrop-blur-sm" },
    { label: "Resolved", value: String(records.filter((item) => item.status === "Resolved").length), helper: "Completed", tone: "resolved", icon: CheckCircle2, iconBox: "text-emerald-600 bg-emerald-100/60 border border-emerald-200/50 backdrop-blur-sm" },
  ]), [records]);

  const metricCardClass: Record<string, string> = {
    total: "bg-gradient-to-br! from-slate-50 via-white to-slate-50/50 border border-slate-200/70! rounded-xl! shadow-sm",
    open: "bg-gradient-to-br! from-red-50/80 via-red-50/20 to-white border border-red-200/60! rounded-xl! shadow-sm",
    progress: "bg-gradient-to-br! from-amber-50/80 via-amber-50/20 to-white border border-amber-200/60! rounded-xl! shadow-sm",
    resolved: "bg-gradient-to-br! from-emerald-50/80 via-emerald-50/20 to-white border border-emerald-200/60! rounded-xl! shadow-sm",
  };

  const metricValueClass: Record<string, string> = {
    total: "text-slate-900 font-bold!",
    open: "text-red-600 font-bold!",
    progress: "text-amber-600 font-bold!",
    resolved: "text-emerald-600 font-bold!",
  };

  const filteredRows = useMemo(() => records.filter((row) => {
    const searchTerm = query.trim().toLowerCase();
    const matchesQuery = !searchTerm || [row.problem, row.reason, row.impact, row.countermeasure, row.area, row.factor].join(" ").toLowerCase().includes(searchTerm);
    return matchesQuery && (statusFilter === "All" || row.status === statusFilter) && (areaFilter === "All" || row.area === areaFilter) && (factorFilter === "All" || row.factor === factorFilter);
  }), [areaFilter, factorFilter, query, records, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, areaFilter, factorFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("All");
    setAreaFilter("All");
    setFactorFilter("All");
    setPage(1);
  };

  const selectFile = (file: File) => {
    if (attachment?.url) URL.revokeObjectURL(attachment.url);
    setAttachment({ name: file.name, url: URL.createObjectURL(file) });
    setForm((current) => ({ ...current, evidence: file.name }));
  };

  const clearFile = () => {
    if (attachment?.url) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
    setForm((current) => ({ ...current, evidence: "" }));
  };

  const closeModal = () => {
    clearFile();
    setModalOpen(false);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.problem.trim()) return;
    const input: PicRepairInput = {
      date: formatDisplayDate(form.date),
      area: form.area as PicRepairInput["area"],
      sqcdip: "-",
      factor: form.factor,
      problem: form.problem.trim(),
      reason: form.reason.trim() || "-",
      impact: form.impact.trim() || "-",
      countermeasure: form.countermeasure.trim() || "-",
      pic: QC_PIC_NAME,
      dueDate: form.dueDate,
      status: form.status,
      evidence: form.evidence || "evidence.jpg",
    };
    addRecord(input);
    if (attachment?.url) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
    setForm(emptyForm);
    setModalOpen(false);
    setPage(1);
  };

  return (
    <div className="abnormality-page pic-page">
      <header className="qc-page-header">
        <div>
          <div className="qc-kicker">REPORTS</div>
          <h1 className="font-semibold text-emerald-950 dark:text-white">Abnormality Log</h1>
          <p>All recorded findings and issue tracking for QC area.</p>
        </div>
        <div className="qc-toolbar">
          <button className="qc-secondary-button" type="button">07 Oct 2026</button>
        </div>
      </header>

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
            <h2>Abnormality Findings</h2>
            <p>Click the camera icon to view photo evidence.</p>
          </div>
          <button type="button" className="repair-primary text-white font-bold" style={{ background: "linear-gradient(135deg,var(--accent-1),var(--accent-2))", color: "#fff" }} onClick={() => setModalOpen(true)}>+ Add Issue</button>
        </div>

        <div className="abnormality-filter-row">
          <label className="abnormality-search">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search problems, causes..." />
          </label>
          <CustomSelect value={areaFilter} options={[{ value: "All", label: "All Areas" }, ...areaOptions]} onChange={setAreaFilter} ariaLabel="Area filter" />
          <CustomSelect value={factorFilter} options={[{ value: "All", label: "All 5M1E Factors" }, ...factorOptions]} onChange={setFactorFilter} ariaLabel="Factor filter" />
          <CustomSelect value={statusFilter} options={[{ value: "All", label: "All Statuses" }, ...statusOptions]} onChange={setStatusFilter} ariaLabel="Status filter" />
          <button type="button" className="qc-secondary-button abnormality-reset" onClick={resetFilters}>Reset</button>
        </div>

        {filteredRows.length === 0 ? (
          <div className="abnormality-empty">No findings match the filters.</div>
        ) : (
          <>
            <AbnormalityTable rows={pageRows} onPreview={setPreview} />
            <div className="pic-pagination">
              <span>Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filteredRows.length)} of {filteredRows.length} data</span>
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

      {modalOpen && (
        <div className="repair-modal-backdrop" onMouseDown={closeModal}>
          <form className="repair-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
            <div className="repair-dialog-head">
              <div><h2>Add Issue</h2><p>New findings are automatically recorded under {QC_PIC_NAME}.</p></div>
              <button type="button" aria-label="Close" onClick={closeModal}>✕</button>
            </div>
            <div className="repair-form">
              <div className="form-grid">
                <label>Issue Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label>
                <label>Line Area<CustomSelect value={form.area} options={areaOptions} onChange={(next) => setForm({ ...form, area: next })} /></label>
              </div>
              <label>Problem Factor (5M1E)<CustomSelect value={form.factor} options={factorOptions} onChange={(next) => setForm({ ...form, factor: next })} /></label>
              <label>Problem Description<textarea rows={3} value={form.problem} onChange={(event) => setForm({ ...form, problem: event.target.value })} placeholder="Describe the problem found" required /></label>
              <PicPlanUpload values={attachment ? [attachment] : []} onSelect={(files) => { const file = files[0]; if (file) selectFile(file); }} onRemove={() => clearFile()} />
              <label>Root Cause<textarea rows={2} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Root cause" /></label>
              <label>Effect (Impact)<textarea rows={2} value={form.impact} onChange={(event) => setForm({ ...form, impact: event.target.value })} placeholder="Operational impact, e.g. Line Stop 10 Min" /></label>
              <label>Solution Plan<textarea rows={2} value={form.countermeasure} onChange={(event) => setForm({ ...form, countermeasure: event.target.value })} placeholder="Solution plan for Follow-up" /></label>
              <div className="form-grid">
                <label>Due Date<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
                <label>Status<CustomSelect value={form.status} options={statusOptions} onChange={(next) => setForm({ ...form, status: next as PicRepairStatus })} /></label>
              </div>
            </div>
            <div className="repair-dialog-actions">
              <button type="button" className="repair-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="repair-primary">Save Issue</button>
            </div>
          </form>
        </div>
      )}

      <PicAttachmentPreview record={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
