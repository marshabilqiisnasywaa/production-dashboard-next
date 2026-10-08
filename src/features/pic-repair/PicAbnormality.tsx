"use client";
import { useEffect, useMemo, useState } from "react";
import { PIC_NAME, useRepairPic, type PicRepairInput, type PicRepairRecord, type PicRepairStatus } from "@/features/pic-repair/RepairPicContext";
import AbnormalityTable from "@/features/pic-repair/AbnormalityTable";
import PicAttachmentPreview from "@/features/pic-repair/PicAttachmentPreview";

const areaOptions = ["Pre Assembly", "Rework", "Warranty"];
const factorOptions = ["Machine", "Man", "Material", "Method", "Media", "Env"];
const statusOptions: PicRepairStatus[] = ["Open", "In Progress", "Resolved"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Oct", "Nov", "Dec"];

const emptyForm = {
  date: "2026-10-07",
  area: "Pre Assembly",
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

export default function PicAbnormality() {  const { records, addRecord } = useRepairPic();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [areaFilter, setAreaFilter] = useState("All");
  const [factorFilter, setFactorFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState<PicRepairRecord | null>(null);

  const summary = useMemo(() => ([
    { label: "Total Abnormality", value: String(records.length), helper: "Total kasus tercatat", tone: "kpi-total" },
    { label: "Open", value: String(records.filter((item) => item.status === "Open").length), helper: "Membutuhkan penanganan", tone: "kpi-open" },
    { label: "In Progress", value: String(records.filter((item) => item.status === "In Progress").length), helper: "Dalam proses tindakan", tone: "kpi-progress" },
    { label: "Resolved / Closed", value: String(records.filter((item) => item.status === "Resolved").length), helper: "Selesai dieksekusi", tone: "kpi-resolved" },
  ]), [records]);

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
      pic: PIC_NAME,
      dueDate: form.dueDate,
      status: form.status,
      evidence: form.evidence || "evidence.jpg",
    };
    addRecord(input);
    setForm(emptyForm);
    setModalOpen(false);
    setPage(1);
  };

  return (
    <div className="abnormality-page pic-page">
      <header className="qc-page-header">
        <div>
          <div className="qc-kicker">ABNORMALITY • PIC AREA</div>
          <h1>Abnormality Log</h1>
          <p>Seluruh temuan di bawah kontrol {PIC_NAME}. Tangani kasus Open sesuai prioritas.</p>
        </div>
        <div className="qc-toolbar">
          <div className="qc-live">
            <span className="live-dot" />
            <span>PIC: {PIC_NAME}</span>
          </div>
          <button className="qc-secondary-button" type="button">07 Oct 2026</button>
        </div>
      </header>

      <section className="qc-kpi-grid abnormality-kpis pic-kpis">
        {summary.map((item) => (
          <article key={item.label} className={`qc-kpi-card abnormality-kpi-card ${item.tone}`}>
            <span className="kpi-label">{item.label}</span>
            <strong>{item.value}</strong>
            <span className="kpi-unit">{item.helper}</span>
          </article>
        ))}
      </section>

      <article className="abnormality-panel">
        <div className="abnormality-panel-head">
          <div>
            <h2>Daftar Temuan Abnormality</h2>
            <p>Klik ikon kamera untuk melihat foto bukti temuan.</p>
          </div>
          <button type="button" className="qc-primary-button" onClick={() => setModalOpen(true)}>+ Tambah Temuan</button>
        </div>

        <div className="abnormality-filter-row">
          <label className="abnormality-search">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari masalah, penyebab..." />
          </label>
          <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} aria-label="Filter area">
            <option value="All">Semua Area</option>
            {areaOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={factorFilter} onChange={(event) => setFactorFilter(event.target.value)} aria-label="Filter faktor">
            <option value="All">Semua Faktor 5M1E</option>
            {factorOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter status">
            <option value="All">Semua Status</option>
            {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" className="qc-secondary-button abnormality-reset" onClick={resetFilters}>Reset</button>
        </div>

        {filteredRows.length === 0 ? (
          <div className="abnormality-empty">Tidak ada temuan yang cocok dengan filter.</div>
        ) : (
          <>
            <AbnormalityTable rows={pageRows} onPreview={setPreview} />
            <div className="pic-pagination">
              <span>Menampilkan {startIndex + 1}-{Math.min(startIndex + pageSize, filteredRows.length)} dari {filteredRows.length} data</span>
              <div className="pic-pagination-controls">
                <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} aria-label="Baris per halaman">
                  <option value={5}>5 / halaman</option>
                  <option value={10}>10 / halaman</option>
                </select>
                <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Sebelumnya</button>
                <b>{safePage} / {totalPages}</b>
                <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Berikutnya</button>
              </div>
            </div>
          </>
        )}
      </article>

      {modalOpen && (
        <div className="repair-modal-backdrop" onMouseDown={() => setModalOpen(false)}>
          <form className="repair-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
            <div className="repair-dialog-head">
              <div><h2>Tambah Temuan</h2><p>Temuan baru otomatis tercatat atas nama {PIC_NAME}.</p></div>
              <button type="button" aria-label="Tutup" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="repair-form">
              <div className="form-grid">
                <label>Tanggal Temuan<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label>
                <label>Area Lini<select value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })}>{areaOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              <label>Faktor Problem (5M1E)<select value={form.factor} onChange={(event) => setForm({ ...form, factor: event.target.value })}>{factorOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Deskripsi Masalah<textarea rows={3} value={form.problem} onChange={(event) => setForm({ ...form, problem: event.target.value })} placeholder="Deskripsi masalah yang ditemukan" required /></label>
              <label className="repair-dropzone"><strong>Upload Foto Bukti</strong><span>Dummy upload • JPG/PNG maksimal 10 MB</span><input type="file" accept="image/*" onChange={(event) => setForm({ ...form, evidence: event.target.files?.[0]?.name ?? "evidence.jpg" })} /></label>
              <label>Akar Penyebab<textarea rows={2} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Akar penyebab" /></label>
              <label>Efek Masalah (Impact)<textarea rows={2} value={form.impact} onChange={(event) => setForm({ ...form, impact: event.target.value })} placeholder="Dampak operasional, contoh: Line Stop 10 Min" /></label>
              <label>Rencana Solusi<textarea rows={2} value={form.countermeasure} onChange={(event) => setForm({ ...form, countermeasure: event.target.value })} placeholder="Rencana solusi untuk Action Plan" /></label>
              <div className="form-grid">
                <label>Tenggat Waktu<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
                <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as PicRepairStatus })}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
            </div>
            <div className="repair-dialog-actions">
              <button type="button" className="repair-outline" onClick={() => setModalOpen(false)}>Batal</button>
              <button type="submit" className="repair-primary">Simpan Temuan</button>
            </div>
          </form>
        </div>
      )}

      <PicAttachmentPreview record={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
