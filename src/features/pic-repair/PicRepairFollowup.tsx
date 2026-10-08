"use client";
import { useEffect, useMemo, useState } from "react";
import { PIC_NAME, TODAY_ISO, getDueStatus, useRepairPic, type PicRepairRecord, type PicRepairStatus } from "@/features/pic-repair/RepairPicContext";
import PicAttachmentPreview from "@/features/pic-repair/PicAttachmentPreview";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Oct", "Nov", "Dec"];
const activeOptions: PicRepairStatus[] = ["Open", "In Progress"];

function formatDueDate(iso: string) {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]} ${monthNames[Number(parts[1]) - 1] ?? parts[1]} ${parts[0]}`;
}

function UpdateStatusModal({ record, onClose }: { record: PicRepairRecord; onClose: () => void }) {
  const { updateRecord } = useRepairPic();
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
          <button type="button" aria-label="Tutup" onClick={onClose}>✕</button>
        </div>
        <div className="repair-form">
          <label>Status Penanganan<select value={status} onChange={(event) => setStatus(event.target.value as PicRepairStatus)}>
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
          </select></label>
          <p className="pic-form-hint">Isu yang ditandai Resolved otomatis hilang dari daftar tugas.</p>
          <label className="repair-dropzone"><strong>Upload Foto Bukti</strong><span>{evidence || "Dummy upload • JPG/PNG maksimal 10 MB"}</span><input type="file" accept="image/*" onChange={(event) => setEvidence(event.target.files?.[0]?.name ?? evidence)} /></label>
        </div>
        <div className="repair-dialog-actions">
          <button type="button" className="repair-outline" onClick={onClose}>Batal</button>
          <button type="submit" className="repair-primary">Simpan Update</button>
        </div>
      </form>
    </div>
  );
}

export default function PicRepairFollowup() {
  const { records } = useRepairPic();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [preview, setPreview] = useState<PicRepairRecord | null>(null);
  const [editing, setEditing] = useState<PicRepairRecord | null>(null);
  const [toast, setToast] = useState(false);

  const activeRecords = useMemo(() => records.filter((item) => item.status !== "Resolved"), [records]);

  const summary = useMemo(() => ([
    { label: "Isu Aktif", value: String(activeRecords.length), helper: "Perlu ditangani" },
    { label: "Open", value: String(activeRecords.filter((item) => item.status === "Open").length), helper: "Belum ditangani" },
    { label: "In Progress", value: String(activeRecords.filter((item) => item.status === "In Progress").length), helper: "Sedang dikerjakan" },
    { label: "Selesai", value: String(records.filter((item) => item.status === "Resolved").length), helper: "Sudah closed" },
  ]), [activeRecords, records]);

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
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MORNING MEETING • PIC AREA</div>
          <div className="repair-title-row">
            <h1>Action Plan</h1>
            <span className="pic-chip"><span>YU</span>PIC: {PIC_NAME} • Pre-Assembly</span>
          </div>
          <p>Tugas follow-up dari isu Abnormality Log yang masih Open atau In Progress. Hari ini {formatDueDate(TODAY_ISO)}.</p>
        </div>
        <div className="repair-actions">
          <select className="repair-outline" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter status">
            <option value="All">Semua Status Aktif</option>
            {activeOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <section className="qc-kpi-grid abnormality-kpis pic-kpis">
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
            <h2>Tugas Saya</h2>
            <p>Isu selesai otomatis hilang dari daftar ini.</p>
          </div>
        </div>

        <div className="abnormality-filter-row">
          <label className="abnormality-search">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari masalah, solusi..." />
          </label>
          <button type="button" className="qc-secondary-button abnormality-reset" onClick={() => { setQuery(""); setStatusFilter("All"); setPage(1); }}>Reset</button>
        </div>

        {filtered.length === 0 ? (
          <div className="abnormality-empty">Semua isu sudah selesai. Tidak ada tugas aktif.</div>
        ) : (
          <>
            <div className="repair-table-scroll">
              <table className="repair-data-table abnormality-table pic-table pic-table-slim">
                <colgroup>
                  <col style={{ minWidth: "300px" }} />
                  <col style={{ width: "150px" }} />
                  <col style={{ width: "96px" }} />
                  <col style={{ width: "130px" }} />
                  <col style={{ width: "150px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Masalah &amp; Rencana Solusi</th>
                    <th>Tenggat Waktu</th>
                    <th>Foto Bukti</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((item) => {
                    const due = getDueStatus(item.dueDate);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="abnormality-title-wrap">
                            <strong>{item.problem}</strong>
                            <small>{item.countermeasure}</small>
                          </div>
                        </td>
                        <td>
                          <span className="pic-date">{formatDueDate(item.dueDate)}</span>
                          <span className={`pic-due ${due.tone}`}>{due.label}</span>
                        </td>
                        <td>
                          <button type="button" className="attachment-thumb" aria-label={`Lihat bukti ${item.problem}`} onClick={() => setPreview(item)}>
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
              <span>Menampilkan {startIndex + 1}-{Math.min(startIndex + pageSize, filtered.length)} dari {filtered.length} data</span>
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

      <PicAttachmentPreview record={preview} onClose={() => setPreview(null)} />
      {editing && <UpdateStatusModal record={editing} onClose={closeEditing} />}
      {toast && <div className="repair-toast"><span>✓</span>Status berhasil diperbarui</div>}
    </div>
  );
}
