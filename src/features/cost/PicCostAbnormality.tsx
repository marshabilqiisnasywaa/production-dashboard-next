"use client";
import { useMemo, useState } from "react";

type CostAbnormalStatus = "Open" | "In Progress" | "Resolved";

type CostAbnormalRecord = {
  id: string;
  date: string;
  problem: string;
  area: string;
  impact: string;
  countermeasure: string;
  pic: string;
  dueDate: string;
  status: CostAbnormalStatus;
};

const seedRecords: CostAbnormalRecord[] = [
  { id: "CST-001", date: "06 Oct 2026", problem: "Overtime line packing melebihi budget", area: "Packing", impact: "Cost +0.06 point", countermeasure: "Reschedule shift dan tambah operator part-time", pic: "Cost PIC", dueDate: "2026-10-09", status: "Open" },
  { id: "CST-002", date: "05 Oct 2026", problem: "Scrap top cover naik 0.07 point", area: "Pre Assembly", impact: "Cost +0.07 point", countermeasure: "Perbaiki handling tray dan audit proses", pic: "Cost PIC", dueDate: "2026-10-08", status: "In Progress" },
  { id: "CST-003", date: "04 Oct 2026", problem: "Rework frame menumpuk di buffer", area: "Rework", impact: "Jam lembur +2 jam", countermeasure: "Tambah 1 line rework sementara", pic: "Cost PIC", dueDate: "2026-10-07", status: "Resolved" },
];

const statusOptions: CostAbnormalStatus[] = ["Open", "In Progress", "Resolved"];

export default function PicCostAbnormality() {
  const [records, setRecords] = useState<CostAbnormalRecord[]>(seedRecords);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [problem, setProblem] = useState("");
  const [area, setArea] = useState("Packing");
  const [countermeasure, setCountermeasure] = useState("");

  const filtered = useMemo(() => records.filter((item) => {
    const q = query.trim().toLowerCase();
    const matchQuery = !q || [item.problem, item.area, item.countermeasure].join(" ").toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || item.status === statusFilter;
    return matchQuery && matchStatus;
  }), [records, query, statusFilter]);

  const addRecord = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!problem.trim() || !countermeasure.trim()) return;
    const nextId = `CST-${String(records.length + 1).padStart(3, "0")}`;
    setRecords((current) => [{ id: nextId, date: "07 Oct 2026", problem: problem.trim(), area, impact: "-", countermeasure: countermeasure.trim(), pic: "Cost PIC", dueDate: "2026-10-10", status: "Open" }, ...current]);
    setProblem("");
    setCountermeasure("");
    setFormOpen(false);
  };

  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MORNING MEETING • PIC AREA • COST</div>
          <div className="repair-title-row">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Abnormality</h1>
          </div>
          <p>Temuan abnormality area Cost yang berdampak ke SLC dan OPE.</p>
        </div>
        <div className="repair-actions">
          <button className="repair-primary text-white font-bold" type="button" onClick={() => setFormOpen(true)}>+ Tambah Temuan</button>
        </div>
      </div>

      <div className="abnormality-filter-row">
        <label className="abnormality-search">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari masalah, area, solusi..." />
        </label>
        <select className="repair-outline" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter status">
          <option value="All">Semua Status</option>
          {statusOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>

      <article className="abnormality-panel">
        <div className="repair-table-scroll">
          <table className="repair-data-table abnormality-table pic-table pic-table-slim">
            <thead>
              <tr><th>Masalah</th><th>Area</th><th>Dampak</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="abnormality-title-wrap">
                      <strong>{item.problem}</strong>
                      <small>{item.countermeasure}</small>
                    </div>
                  </td>
                  <td>{item.area}</td>
                  <td>{item.impact}</td>
                  <td><span className={`status-chip ${item.status === "Open" ? "status-open" : item.status === "In Progress" ? "status-progress" : "status-done"}`}>{item.status}</span></td>
                  <td>
                    <select
                      className="repair-outline"
                      value={item.status}
                      onChange={(event) => setRecords((current) => current.map((row) => (row.id === item.id ? { ...row, status: event.target.value as CostAbnormalStatus } : row)))}
                      aria-label={`Update status ${item.id}`}
                    >
                      {statusOptions.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="abnormality-empty">Tidak ada temuan sesuai filter.</div>}
      </article>

      {formOpen && (
        <div className="repair-modal-backdrop" onMouseDown={() => setFormOpen(false)}>
          <form className="repair-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={addRecord}>
            <div className="repair-dialog-head">
              <div><h2>Tambah Temuan</h2><p>Catat abnormality baru area Cost.</p></div>
              <button type="button" aria-label="Tutup" onClick={() => setFormOpen(false)}>✕</button>
            </div>
            <div className="repair-form">
              <label>Masalah<input value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="Contoh: Overtime line packing" required /></label>
              <label>Area<select value={area} onChange={(event) => setArea(event.target.value)}><option>Packing</option><option>Pre Assembly</option><option>Rework</option><option>Instalasi</option></select></label>
              <label>Countermeasure<input value={countermeasure} onChange={(event) => setCountermeasure(event.target.value)} placeholder="Rencana penanggulangan" required /></label>
            </div>
            <div className="repair-dialog-actions">
              <button type="button" className="repair-outline" onClick={() => setFormOpen(false)}>Batal</button>
              <button type="submit" className="repair-primary">Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
