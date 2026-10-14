"use client";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { DmMemberInput } from "../api";
import type { DmMember } from "../dmData";

const MAX_PHOTO_BYTES = 1024 * 1024;

interface MemberEditorProps {
  idPrefix: string;
  title: string;
  member?: DmMember;
  showSortOrder?: boolean;
  defaultSortOrder?: number;
  saveLabel: string;
  onSave: (input: DmMemberInput) => Promise<void>;
  onRelease?: () => Promise<void>;
  releaseLabel?: string;
}

function blankToNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export default function MemberEditor({
  idPrefix,
  title,
  member,
  showSortOrder = true,
  defaultSortOrder = 0,
  saveLabel,
  onSave,
  onRelease,
  releaseLabel = "Lepas dari Tim",
}: MemberEditorProps) {
  const [name, setName] = useState(member?.name ?? "");
  const [employeeId, setEmployeeId] = useState(member?.employeeId ?? "");
  const [dept, setDept] = useState(member?.dept ?? "");
  const [position, setPosition] = useState(member?.position ?? "");
  const [supervisor, setSupervisor] = useState(member?.supervisor ?? "");
  const [workPhone, setWorkPhone] = useState(member?.workPhone ?? "");
  const [photoUrl, setPhotoUrl] = useState(member?.photoUrl ?? "");
  const [sortOrder, setSortOrder] = useState(String(member?.sortOrder ?? defaultSortOrder));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Foto lebih dari 1 MB. Kecilkan ukurannya dulu.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(String(reader.result));
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !employeeId.trim()) {
      setError("Nama dan NIK wajib diisi.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave({
        employeeId: employeeId.trim(),
        name: name.trim(),
        dept: blankToNull(dept),
        supervisor: blankToNull(supervisor),
        workPhone: blankToNull(workPhone),
        photoUrl: blankToNull(photoUrl),
        position: blankToNull(position),
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function release() {
    if (!onRelease) return;
    setBusy(true);
    setError(null);
    try {
      await onRelease();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal melepas anggota.");
      setBusy(false);
    }
  }

  const field = (id: string, label: string, value: string, set: (v: string) => void, placeholder: string, required = false) => (
    <div className="dm-admin-field">
      <label htmlFor={`${idPrefix}-${id}`}>
        {label}
        {required ? <span className="dm-required-mark"> *</span> : null}
      </label>
      <input
        id={`${idPrefix}-${id}`}
        type="text"
        className="dm-admin-input"
        value={value}
        onChange={(event) => set(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <form className="dm-admin-member-card" onSubmit={submit} noValidate>
      <div className="dm-admin-member-head">
        <span className="dm-admin-member-role">{title}</span>
        {showSortOrder ? (
          <span className="dm-admin-member-idx">
            <label htmlFor={`${idPrefix}-sort`}>Urutan </label>
            <input
              id={`${idPrefix}-sort`}
              type="number"
              className="dm-admin-input dm-admin-sort-input"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </span>
        ) : null}
      </div>
      <div className="dm-admin-member-body">
        {field("name", "Name", name, setName, "Nama lengkap anggota", true)}
        {field("nik", "Work No", employeeId, setEmployeeId, "Nomor induk karyawan", true)}
        {field("dept", "Departemen", dept, setDept, "Departemen anggota")}
        {field("pos", "Position", position, setPosition, "Jabatan di tim")}
        {field("sup", "Supervisor", supervisor, setSupervisor, "Nama atasan")}
        {field("phone", "Work Phone", workPhone, setWorkPhone, "Nomor kontak kerja")}
        <div className="dm-admin-field">
          <label htmlFor={`${idPrefix}-photo`}>Foto Profil</label>
          <div className="dm-admin-upload-wrap">
            <input
              id={`${idPrefix}-photo`}
              type="text"
              className="dm-admin-input"
              value={photoUrl.startsWith("data:") ? "" : photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              placeholder={photoUrl.startsWith("data:") ? "Foto dari berkas terpilih" : "URL foto anggota"}
            />
            <label className="dm-admin-file-label">
              Unggah
              <input type="file" accept="image/*" className="dm-admin-file-input" onChange={pickPhoto} />
            </label>
          </div>
        </div>
        {photoUrl ? (
          <div className="dm-admin-avatar-preview">
            <img src={photoUrl} alt={name ? `Foto ${name}` : "Pratinjau foto"} className="dm-admin-avatar-img" />
            <button type="button" className="dm-admin-btn is-secondary" onClick={() => setPhotoUrl("")}>
              Hapus Foto
            </button>
          </div>
        ) : null}
        {error ? <p className="dm-admin-inline-error" role="alert">{error}</p> : null}
        <div className="dm-admin-member-actions">
          <button type="submit" className="dm-admin-btn is-primary" disabled={busy}>
            {busy ? "Menyimpan..." : saveLabel}
          </button>
          {onRelease ? (
            <button type="button" className="dm-admin-btn is-danger-outline" disabled={busy} onClick={release}>
              {releaseLabel}
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
