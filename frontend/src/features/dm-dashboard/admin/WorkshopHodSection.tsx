"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { adminApi } from "../api";
import type { DmWorkshop, DmWorkshopHod } from "../api";

const EMPTY_HOD: DmWorkshopHod = { name: "", position: "HOD Produksi", workPhone: null, photoUrl: null };

export default function WorkshopHodSection({ workshop, disabled }: {
  workshop: DmWorkshop;
  disabled?: boolean;
}) {
  const readerRef = useRef<FileReader | null>(null);
  const [saved, setSaved] = useState<DmWorkshopHod | null>(null);
  const [data, setData] = useState<DmWorkshopHod>(EMPTY_HOD);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const busy = saving || reading || Boolean(disabled);

  useEffect(() => () => { readerRef.current?.abort(); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    adminApi.workshopHod(workshop.id).then((hod) => {
      if (cancelled) return;
      setSaved(hod ?? null);
      setData(hod ?? EMPTY_HOD);
      setEditing(!hod);
    }).catch((cause: unknown) => {
      if (!cancelled) setLoadError(cause instanceof Error ? cause.message : "Data HOD belum bisa dimuat.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workshop.id, attempt]);

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError("Pilih foto JPEG, PNG, atau WebP maksimal 2 MB.");
      return;
    }
    setReading(true);
    const reader = new FileReader();
    readerRef.current = reader;
    reader.onload = () => {
      setData((prev) => ({ ...prev, photoUrl: String(reader.result) }));
      setReading(false);
    };
    reader.onerror = () => { setError("Foto tidak bisa dibaca."); setReading(false); };
    reader.readAsDataURL(file);
  }

  function cancelEdit() {
    setData(saved ?? EMPTY_HOD);
    setError(null);
    setEditing(!saved);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || loading || loadError) return;
    if (!data.name.trim() || !data.position.trim()) {
      setError("Nama dan jabatan HOD wajib diisi.");
      return;
    }
    const next: DmWorkshopHod = {
      ...data,
      name: data.name.trim(),
      position: data.position.trim(),
      workPhone: data.workPhone?.trim() || null,
    };
    setSaving(true);
    setError(null);
    try {
      await adminApi.saveWorkshopHod(workshop.id, next);
      setSaved(next);
      setData(next);
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
      {loading ? <span role="status">Memuat HOD...</span> : loadError ? (
        <div role="alert">
          <p>{loadError}</p>
          <button type="button" className="dm-admin-btn is-tonal" onClick={() => setAttempt((value) => value + 1)}>Coba lagi</button>
        </div>
      ) : editing ? (
        <form className="dm-ws-sup-form" onSubmit={save}>
          <label className="dm-ws-edit-label" htmlFor={fieldId("name")}>Nama HOD</label>
          <input id={fieldId("name")} className="dm-admin-input" value={data.name} maxLength={120} required disabled={busy} onChange={(event) => setData({ ...data, name: event.target.value })} />
          <label className="dm-ws-edit-label" htmlFor={fieldId("position")}>Jabatan</label>
          <input id={fieldId("position")} className="dm-admin-input" value={data.position} maxLength={120} required disabled={busy} onChange={(event) => setData({ ...data, position: event.target.value })} />
          <label className="dm-ws-edit-label" htmlFor={fieldId("phone")}>Nomor telepon</label>
          <input id={fieldId("phone")} type="tel" className="dm-admin-input" value={data.workPhone ?? ""} maxLength={32} disabled={busy} onChange={(event) => setData({ ...data, workPhone: event.target.value })} />
          <label className="dm-ws-edit-label" htmlFor={fieldId("photo")}>Foto (opsional)</label>
          <input id={fieldId("photo")} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={pickPhoto} aria-describedby={fieldId("photo-help")} />
          <small id={fieldId("photo-help")}>JPEG, PNG, atau WebP. Maksimal 2 MB.</small>
          {data.photoUrl && (
            <div className="dm-ws-sup-actions">
              <img className="dm-ws-hod-preview" src={data.photoUrl} alt="Pratinjau foto HOD" />
              <button type="button" className="dm-admin-btn is-tonal" disabled={busy} onClick={() => setData({ ...data, photoUrl: null })}>Hapus foto</button>
            </div>
          )}
          {error && <p className="dm-admin-inline-error" role="alert">{error}</p>}
          <div className="dm-ws-sup-actions">
            <button type="submit" className="dm-admin-btn is-primary" disabled={busy}>{saving ? "Menyimpan..." : reading ? "Membaca foto..." : "Simpan"}</button>
            {saved && <button type="button" className="dm-admin-btn is-tonal" disabled={busy} onClick={cancelEdit}>Batal</button>}
          </div>
        </form>
      ) : saved ? (
        <div className="dm-ws-sup-row">
          {saved.photoUrl && <img className="dm-ws-hod-preview" src={saved.photoUrl} alt={`Foto ${saved.name}`} />}
          <div className="dm-ws-sup-person">
            <span>{saved.name}</span>
            <small>{saved.position}{saved.workPhone ? ` · ${saved.workPhone}` : ""}</small>
          </div>
          <div className="dm-ws-sup-actions">
            <button type="button" className="dm-admin-btn is-tonal" aria-label={`Edit HOD ${saved.name}`} disabled={busy} onClick={() => setEditing(true)}>Edit</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
