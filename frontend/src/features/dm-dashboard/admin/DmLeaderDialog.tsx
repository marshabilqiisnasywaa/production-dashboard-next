"use client";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import { adminApi, leaderAssignmentApi } from "../api";
import type { DmGroup, DmLeaderCandidate } from "../api";
import "./DmGroupDialog.css";
import "./DmLeaderDialog.css";

type Props = {
  group: DmGroup;
  call: <T>(fn: () => Promise<T>) => Promise<T>;
  onClose: () => void;
  onSaved: () => void;
};

export default function DmLeaderDialog({ group, call, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [candidates, setCandidates] = useState<DmLeaderCandidate[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReady(false);
    setError(null);
    void call(() => Promise.all([
      leaderAssignmentApi.candidates(group.id),
      leaderAssignmentApi.active(group.id),
      adminApi.employees(),
    ])).then(([choices, active, employees]) => {
      if (cancelled) return;
      const current = active.find((item) => item.kind === "dm_leader");
      setCandidates(choices);
      setCurrentId(current?.employee_id ?? null);
      setCurrentName(current ? employees.find((user) => user.id === current.employee_id)?.name ?? `Karyawan #${current.employee_id}` : null);
      setEmployeeId(current && choices.some((item) => item.employee_id === current.employee_id) ? String(current.employee_id) : "");
      setReady(true);
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Data leader gagal dimuat.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [group.id, call, retry]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!employeeId) return;
    setBusy(true);
    setError(null);
    try {
      await call(() => leaderAssignmentApi.setDmLeader(group.id, Number(employeeId)));
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Leader DM gagal disimpan.");
    } finally { setBusy(false); }
  }

  return (
    <dialog ref={dialog} className="dm-dialog" aria-labelledby="dm-leader-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="dm-dialog-card">
        <header className="dm-dialog-head">
          <h2 id="dm-leader-title" className="dm-dialog-title">Leader DM — {group.name}</h2>
          <button type="button" className="dm-dialog-close" aria-label="Tutup" disabled={busy} onClick={onClose}><X size={18} /></button>
        </header>
        <form className="dm-dialog-form" onSubmit={save}>
          {loading ? <p role="status">Memuat leader...</p> : ready ? <>
            <p className="dm-leader-note">Leader saat ini: <strong>{currentName ?? "Belum ditentukan"}</strong></p>
            <div className="dm-dialog-field">
              <label htmlFor="dm-leader-employee" className="dm-dialog-label">Nama leader DM</label>
              <select id="dm-leader-employee" className="dm-dialog-input" value={employeeId} disabled={busy} onChange={(event) => setEmployeeId(event.target.value)} required>
                <option value="">Pilih leader DM</option>
                {candidates.map((item) => <option key={item.employee_id} value={item.employee_id}>{item.name} — {item.lines.length ? item.lines.map((line) => line.line_code).join(", ") : item.employee_no}</option>)}
              </select>
            </div>
            {candidates.length === 0 ? <p className="dm-leader-note">Belum ada leader yang dapat dipilih. Tambahkan User ber-role Leader; jika line sudah memiliki anggota, masukkan leader ke tim line dalam DM ini.</p> : null}
          </> : null}
          {error ? <p className="dm-dialog-error" role="alert">{error}</p> : null}
          {!loading && !ready ? <button type="button" className="dm-dialog-btn is-outline" onClick={() => setRetry((value) => value + 1)}>Muat ulang</button> : null}
          <footer className="dm-dialog-foot">
            <button type="button" className="dm-dialog-btn is-outline" disabled={busy} onClick={onClose}>Batal</button>
            <button type="submit" className="dm-dialog-btn is-primary" disabled={!ready || busy || !employeeId || Number(employeeId) === currentId}>{busy ? "Menyimpan..." : "Simpan"}</button>
          </footer>
        </form>
      </div>
    </dialog>
  );
}
