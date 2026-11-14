"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../api";
import type { DmEmployee, DmWorkshop, DmWorkshopHod } from "../api";

export default function WorkshopHodSection({ workshop, disabled }: {
  workshop: DmWorkshop;
  disabled?: boolean;
}) {
  const { text: uiText } = useUiText();
  const [saved, setSaved] = useState<DmWorkshopHod | null>(null);
  const [hodUsers, setHodUsers] = useState<DmEmployee[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const busy = saving || Boolean(disabled);
  const selectedUser = hodUsers.find((user) => String(user.id) === selectedId);


  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([adminApi.workshopHod(workshop.id), adminApi.employees()]).then(([hod, employees]) => {
      if (cancelled) return;
      setHodUsers(employees.filter((user) => user.role === "hod" && user.isActive));
      setSaved(hod ?? null);
      setSelectedId("");
      setError(null);
      setEditing(!hod);
    }).catch((cause: unknown) => {
      if (!cancelled) setLoadError(cause instanceof Error ? cause.message : "Data HOD belum bisa dimuat.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workshop.id, attempt]);

  function cancelEdit() {
    setSelectedId("");
    setError(null);
    setEditing(!saved);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || loading || loadError) return;
    if (!selectedUser) {
      setError("Pilih user HOD terlebih dahulu.");
      return;
    }
    const next: DmWorkshopHod = {
      employeeId: selectedUser.id,
      name: selectedUser.name.trim(),
      position: selectedUser.position?.trim() || "HOD",
      workPhone: selectedUser.workPhone?.trim() || null,
      photoUrl: selectedUser.photoUrl,
    };
    setSaving(true);
    setError(null);
    try {
      const result = await adminApi.saveWorkshopHod(workshop.id, next);
      setSaved(result);
      setSelectedId("");
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "HOD gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  const fieldId = (name: string) => `ws-${workshop.id}-hod-${name}`;

  return (
    <div className="dm-ws-supervisors dm-ws-hod">
      {loading ? <span role="status">{uiText("Memuat HOD...")}</span> : loadError ? (
        <div role="alert">
          <p>{loadError}</p>
          <button type="button" className="dm-admin-btn is-tonal" onClick={() => setAttempt((value) => value + 1)}>{uiText("Coba lagi")}</button>
        </div>
      ) : editing ? (
        <form className="dm-ws-sup-form" onSubmit={save}>
          <label className="dm-ws-edit-label" htmlFor={fieldId("user")}>{uiText("Nama HOD")}</label>
          <select id={fieldId("user")} className="dm-admin-input" value={selectedId} required disabled={busy || hodUsers.length === 0} aria-describedby={fieldId("help")} onChange={(event) => { setSelectedId(event.target.value); setError(null); }}>
            <option value="">{hodUsers.length === 0 ? uiText("Belum ada user HOD") : uiText("Pilih HOD")}</option>
            {hodUsers.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.employeeId}</option>)}
          </select>
          <small id={fieldId("help")}>{hodUsers.length === 0 ? uiText("Tambahkan user dengan role HOD di Kelola User terlebih dahulu.") : uiText("Nama, jabatan, nomor telepon, dan foto mengikuti profil user yang dipilih.")}</small>
          {saved && !selectedUser && <small>{uiText("HOD saat ini: {{v0}}", { v0: saved.name })}</small>}
          {selectedUser && (
            <div className="dm-ws-sup-row">
              {selectedUser.photoUrl && <img key={selectedUser.photoUrl} className="dm-ws-hod-preview" src={selectedUser.photoUrl} alt={uiText("Foto {{v0}}", { v0: selectedUser.name })} />}
              <div className="dm-ws-sup-person">
                <span>{selectedUser.name}</span>
                <small>{selectedUser.position || "HOD"}{selectedUser.workPhone ? ` · ${selectedUser.workPhone}` : ""}</small>
                {!selectedUser.photoUrl && <small>{uiText("User ini belum memiliki foto profil.")}</small>}
              </div>
            </div>
          )}
          {error && <p className="dm-admin-inline-error" role="alert">{uiText(error)}</p>}
          <div className="dm-ws-sup-actions">
            <button type="submit" className="dm-admin-btn is-primary" disabled={busy || !selectedUser}>{saving ? uiText("Menyimpan...") : uiText("Simpan")}</button>
            {saved && <button type="button" className="dm-admin-btn is-tonal" disabled={busy} onClick={cancelEdit}>{uiText("Batal")}</button>}
          </div>
        </form>
      ) : saved ? (
        <div className="dm-ws-sup-row">
          {saved.photoUrl && <img className="dm-ws-hod-preview" src={saved.photoUrl} alt={uiText("Foto {{v0}}", { v0: saved.name })} />}
          <div className="dm-ws-sup-person">
            <span>{saved.name}</span>
            <small>{saved.position}{saved.workPhone ? ` · ${saved.workPhone}` : ""}</small>
          </div>
          <div className="dm-ws-sup-actions">
            <button type="button" className="dm-admin-btn is-tonal" aria-label={uiText("Edit HOD {{v0}}", { v0: saved.name })} disabled={busy} onClick={() => setEditing(true)}>{uiText("Edit")}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
