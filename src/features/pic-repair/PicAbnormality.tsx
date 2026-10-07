"use client";
import { useMemo, useState } from "react";
import { AbnormalPageHeader, abnormalSqcdipClass } from "@/features/repair/RepairDashboard";
import { useRepairPic, type PicRepairInput, type PicRepairStatus } from "@/features/pic-repair/RepairPicContext";
import PicAttachmentPreview, { AttachmentButton } from "@/features/pic-repair/PicAttachmentPreview";
import type { PicRepairRecord } from "@/features/pic-repair/RepairPicContext";

const areaOptions = ["Pre Assembly", "Rework", "Warranty"];
const sqcdipOptions = ["Safety", "Quality", "Cost", "Delivery", "Inventory", "Productivity"];
const factorOptions = ["Man", "Machine", "Material", "Method", "Measurement", "Environment"];
const statusOptions: PicRepairStatus[] = ["Open", "In Progress", "Resolved"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Oct", "Nov", "Dec"];

const statusChipClass: Record<PicRepairStatus, string> = {
  Open: "status-open",
  "In Progress": "status-progress",
  Resolved: "status-closed-loop",
};

const emptyForm = {
  date: "2026-10-07",
  area: "Pre Assembly",
  sqcdip: "Quality",
  factor: "Machine",
  problem: "",
  reason: "",
  countermeasure: "",
  pic: "",
  dueDate: "2026-10-09",
  status: "Open" as PicRepairStatus,
  evidence: "",
};

function formatDisplayDate(iso: string) {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]} ${monthNames[Number(parts[1]) - 1] ?? parts[1]} ${parts[0]}`;
}

export default function PicAbnormality() {
  const { records, addRecord } = useRepairPic();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sqcdipFilter, setSqcdipFilter] = useState("All");
  const [factorFilter, setFactorFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState<PicRepairRecord | null>(null);

  const summary = useMemo(() => ([
    { label: "Total Abnormal", value: String(records.length), helper: "all cases" },
    { label: "Open", value: String(records.filter((item) => item.status === "Open").length), helper: "needs action" },
    { label: "In Progress", value: String(records.filter((item) => item.status === "In Progress").length), helper: "in review" },
    { label: "Resolved", value: String(records.filter((item) => item.status === "Resolved").length), helper: "resolved" },
  ]), [records]);

  const filteredRows = useMemo(() => records.filter((row) => {
    const searchTerm = query.trim().toLowerCase();
    const matchesQuery = !searchTerm || [row.id, row.problem, row.area, row.pic, row.sqcdip, row.factor].join(" ").toLowerCase().includes(searchTerm);
    return matchesQuery && (statusFilter === "All" || row.status === statusFilter) && (sqcdipFilter === "All" || row.sqcdip === sqcdipFilter) && (factorFilter === "All" || row.factor === factorFilter);
  }), [factorFilter, query, records, sqcdipFilter, statusFilter]);

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("All");
    setSqcdipFilter("All");
    setFactorFilter("All");
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.problem.trim() || !form.pic.trim()) return;
    const input: PicRepairInput = {
      date: formatDisplayDate(form.date),
      area: form.area as PicRepairInput["area"],
      sqcdip: form.sqcdip,
      factor: form.factor,
      problem: form.problem.trim(),
      reason: form.reason.trim() || "-",
      countermeasure: form.countermeasure.trim() || "-",
      pic: form.pic.trim(),
      dueDate: form.dueDate,
      status: form.status,
      evidence: form.evidence || "evidence.jpg",
    };
    addRecord(input);
    setForm(emptyForm);
    setModalOpen(false);
  };

  return (
    <div className="abnormality-page">
      <AbnormalPageHeader />

      <section className="qc-kpi-grid abnormality-kpis">
        {summary.map((item) => (
          <article key={item.label} className="qc-kpi-card abnormality-kpi-card">
            <span className="kpi-label">{item.label}</span>
            <strong>{item.value}</strong>
            <span className="kpi-unit">{item.helper}</span>
          </article>
        ))}
      </section>

      <article className="abnormality-panel">
        <div className="abnormality-panel-head">
          <div>
            <h2>Abnormal log</h2>
            <p>Master log histori seluruh temuan abnormality area Repair.</p>
          </div>
          <button type="button" className="qc-primary-button" onClick={() => setModalOpen(true)}>+ Add Abnormality</button>
        </div>

        <div className="abnormality-filter-row">
          <label className="abnormality-search">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search abnormal..." />
          </label>
          <select value={sqcdipFilter} onChange={(event) => setSqcdipFilter(event.target.value)}>
            <option value="All">All SQCDIP</option>
            {sqcdipOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={factorFilter} onChange={(event) => setFactorFilter(event.target.value)}>
            <option value="All">All 5M1E</option>
            {factorOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="All">All status</option>
            {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" className="qc-secondary-button abnormality-reset" onClick={resetFilters}>Reset</button>
        </div>

        {filteredRows.length === 0 ? (
          <div className="abnormality-empty">No abnormals match the selected filters.</div>
        ) : (
          <div className="repair-table-scroll">
            <table className="repair-data-table abnormality-table">
              <thead>
                <tr><th>ID</th><th>Date</th><th>Area</th><th>SQCDIP</th><th>5M1E</th><th>Problem</th><th>PIC</th><th>Status</th><th>Attachment</th></tr>
              </thead>
              <tbody>
                {filteredRows.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.id}</strong></td>
                    <td>{item.date}</td>
                    <td>{item.area}</td>
                    <td><span className={`abnormality-sq-badge ${abnormalSqcdipClass[item.sqcdip] ?? "sqcdip-quality"}`}>{item.sqcdip}</span></td>
                    <td>{item.factor}</td>
                    <td><div className="abnormality-title-wrap"><strong>{item.problem}</strong><small>{item.countermeasure}</small></div></td>
                    <td>{item.pic}</td>
                    <td><span className={`status-chip ${statusChipClass[item.status]}`}>{item.status}</span></td>
                    <td><AttachmentButton record={item} onPreview={setPreview} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {modalOpen && (
        <div className="repair-modal-backdrop" onMouseDown={() => setModalOpen(false)}>
          <form className="repair-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
            <div className="repair-dialog-head">
              <div><h2>Add Abnormality</h2><p>Buat laporan abnormality baru area Repair.</p></div>
              <button type="button" aria-label="Close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="repair-form">
              <div className="form-grid">
                <label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label>
                <label>Area<select value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })}>{areaOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              <div className="form-grid">
                <label>Category SQCDIP<select value={form.sqcdip} onChange={(event) => setForm({ ...form, sqcdip: event.target.value })}>{sqcdipOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Category 5M1E<select value={form.factor} onChange={(event) => setForm({ ...form, factor: event.target.value })}>{factorOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              <label>Problem Description<textarea rows={3} value={form.problem} onChange={(event) => setForm({ ...form, problem: event.target.value })} placeholder="Deskripsi problem" required /></label>
              <label className="repair-dropzone"><strong>Upload Foto Evidence</strong><span>Dummy upload • JPG/PNG maksimal 10 MB</span><input type="file" accept="image/*" onChange={(event) => setForm({ ...form, evidence: event.target.files?.[0]?.name ?? "evidence.jpg" })} /></label>
              <label>Reason / Cause<textarea rows={2} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Akar masalah" /></label>
              <label>Countermeasure<textarea rows={2} value={form.countermeasure} onChange={(event) => setForm({ ...form, countermeasure: event.target.value })} placeholder="Tindakan penanggulangan" /></label>
              <div className="form-grid">
                <label>PIC<input value={form.pic} onChange={(event) => setForm({ ...form, pic: event.target.value })} placeholder="Nama PIC" required /></label>
                <label>Due Date<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
              </div>
              <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as PicRepairStatus })}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <div className="repair-dialog-actions">
              <button type="button" className="repair-outline" onClick={() => setModalOpen(false)}>Batal</button>
              <button type="submit" className="repair-primary">Simpan Abnormality</button>
            </div>
          </form>
        </div>
      )}

      <PicAttachmentPreview record={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
