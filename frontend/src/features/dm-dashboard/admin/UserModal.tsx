"use client";
import { useUiText } from "@/locales/useUiText";

import { departmentLabel } from "../departments";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { dmDepartments, dmEmployeeRoles, uploadPhoto } from "../api";
import type { DmEmployee, DmEmployeeInput, DmEmployeeRole } from "../api";
import "./UserModal.css";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

type FormState = {
  name: string;
  employeeId: string;
  role: DmEmployeeRole;
  dept: string;
  position: string;
  supervisorId: string;
  workPhone: string;
  photoUrl: string;
};

interface UserModalProps {
  open: boolean;
  user: DmEmployee | null;
  supervisors: DmEmployee[];
  onSave: (input: DmEmployeeInput) => Promise<void>;
  onResetPassword: (user: DmEmployee) => Promise<void>;
  onClose: () => void;
}

function toState(user: DmEmployee | null): FormState {
  return {
    name: user?.name ?? "",
    employeeId: user?.employeeId ?? "",
    role: user?.role ?? "member",
    dept: user?.dept ?? "",
    position: user?.position ?? "",
    supervisorId: user?.supervisorId ? String(user.supervisorId) : "",
    workPhone: user?.workPhone ?? "",
    photoUrl: user?.photoUrl ?? "",
  };
}

function blankToNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default function UserModal({ open, user, supervisors, onSave, onResetPassword, onClose }: UserModalProps) {
  const { text: uiText } = useUiText();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormState>(toState(user));
  const [snapshot, setSnapshot] = useState(JSON.stringify(toState(user)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const initial = toState(user);
    setForm(initial);
    setSnapshot(JSON.stringify(initial));
    setBusy(false);
    setError(null);
    bodyRef.current?.scrollTo({ top: 0 });
  }, [open, user?.id]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  const dirty = JSON.stringify(form) !== snapshot;
  const supervisorChoices = supervisors.filter((item) => item.id !== user?.id);
  const legacySupervisor = user && user.supervisor && !user.supervisorId ? user.supervisor : null;
  const deptOptions = form.dept && !dmDepartments.includes(form.dept) ? [...dmDepartments, form.dept] : dmDepartments;

  function change<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function requestClose() {
    if (busy) return;
    if (dirty && !window.confirm(uiText("Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?"))) return;
    onClose();
  }

  async function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Foto lebih dari 10 MB.");
      return;
    }
    try {
      change("photoUrl", await uploadPhoto(file));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Foto gagal diunggah.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.employeeId.trim()) {
      setError("Nama dan NIK wajib diisi.");
      bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    let supervisorId: number | null | undefined;
    if (form.role === "supervisor") supervisorId = user?.supervisorId ? null : undefined;
    else if (legacySupervisor && form.supervisorId === "") supervisorId = undefined;
    else supervisorId = form.supervisorId ? Number(form.supervisorId) : null;
    setBusy(true);
    setError(null);
    try {
      await onSave({
        employeeId: form.employeeId.trim(),
        name: form.name.trim(),
        role: form.role,
        dept: blankToNull(form.dept),
        position: blankToNull(form.position),
        supervisorId,
        workPhone: blankToNull(form.workPhone),
        photoUrl: blankToNull(form.photoUrl),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
      setBusy(false);
    }
  }

  async function reset() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await onResetPassword(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mereset password.");
    } finally {
      setBusy(false);
    }
  }

  const passwordNote = user
    ? user.mustChangePassword
      ? "Masih memakai password awal. Mengubah NIK ikut mengubah password awalnya."
      : "Password sudah diganti oleh pemiliknya."
    : "Password awal sama dengan NIK dan wajib diganti saat login pertama.";

  return (
    <dialog
      ref={dialogRef}
      className="dm-admin-modal dm-line-detail-modal um-modal"
      aria-labelledby="user-modal-heading"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <form className="um-form" onSubmit={submit} noValidate>
        <header className="um-head">
          <div>
            <h2 id="user-modal-heading" className="um-title" tabIndex={-1} autoFocus>
              {user ? uiText("Ubah pengguna") : uiText("Pengguna baru")}
            </h2>
            {user ? <p className="um-sub">{user.employeeId}{user.isActive ? "" : uiText(" · Nonaktif")}</p> : null}
          </div>
          <button type="button" className="um-close" onClick={requestClose} aria-label={uiText("Tutup")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="um-body" ref={bodyRef}>
          {error ? <p className="um-error" role="alert">{uiText(error)}</p> : null}

          <div className="um-grid">
            <div className="um-field">
              <label htmlFor="um-name" className="um-label">{uiText("Nama ")}<span className="um-req">*</span></label>
              <input
                id="um-name"
                type="text"
                className="um-input"
                value={form.name}
                onChange={(event) => change("name", event.target.value)}
                placeholder={uiText("Nama lengkap")}
              />
            </div>
            <div className="um-field">
              <label htmlFor="um-nik" className="um-label">{uiText("NIK ")}<span className="um-req">*</span></label>
              <input
                id="um-nik"
                type="text"
                className="um-input is-mono"
                value={form.employeeId}
                onChange={(event) => change("employeeId", event.target.value)}
                placeholder={uiText("Nomor induk")}
                autoComplete="off"
              />
            </div>

            <fieldset className="um-field is-wide um-fieldset">
              <legend className="um-label">{uiText("Role")}</legend>
              <div className="um-seg">
                {dmEmployeeRoles.map((item) => (
                  <label key={item.value} className="um-seg-item">
                    <input
                      type="radio"
                      name="um-role"
                      value={item.value}
                      checked={form.role === item.value}
                      onChange={() => change("role", item.value)}
                    />
                    <span>{uiText(item.label)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="um-field">
              <label htmlFor="um-dept" className="um-label">{uiText("Departemen")}</label>
              <select id="um-dept" className="um-input" value={form.dept} onChange={(event) => change("dept", event.target.value)}>
                <option value="">{uiText("Belum dipilih")}</option>
                {uiText(deptOptions.map((item) => (
                  <option key={item} value={item}>{uiText(departmentLabel(item))}</option>
                )))}
              </select>
            </div>
            <div className="um-field">
              <label htmlFor="um-position" className="um-label">{uiText("Position")}</label>
              <input
                id="um-position"
                type="text"
                className="um-input"
                value={form.position}
                onChange={(event) => change("position", event.target.value)}
                placeholder={uiText("Contoh: PE Technician")}
              />
            </div>

            {form.role === "supervisor" ? null : (
              <div className="um-field">
                <label htmlFor="um-sup" className="um-label">{uiText("Supervisor ")}<span className="um-hint">{uiText("opsional")}</span>
                </label>
                <select
                  id="um-sup"
                  className="um-input"
                  value={form.supervisorId}
                  disabled={supervisorChoices.length === 0}
                  onChange={(event) => change("supervisorId", event.target.value)}
                >
                  <option value="">{supervisorChoices.length === 0 ? uiText("Belum ada supervisor") : uiText("Tanpa supervisor")}</option>
                  {supervisorChoices.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.employeeId})</option>
                  ))}
                </select>
                {supervisorChoices.length === 0 ? (
                  <span className="um-hint">{uiText("Daftarkan akun supervisor dulu supaya bisa dipilih.")}</span>
                ) : legacySupervisor ? (
                  <span className="um-hint">{uiText("Tertulis sebelumnya: ")}{legacySupervisor}{uiText(". Pilih supervisor untuk menggantinya.")}</span>
                ) : null}
              </div>
            )}
            <div className="um-field">
              <label htmlFor="um-phone" className="um-label">{uiText("Work phone")}</label>
              <input
                id="um-phone"
                type="text"
                inputMode="tel"
                className="um-input"
                value={form.workPhone}
                onChange={(event) => change("workPhone", event.target.value)}
                placeholder={uiText("Nomor kontak")}
              />
            </div>

            <div className="um-field is-wide um-photo">
              {form.photoUrl ? (
                <img src={form.photoUrl} alt={form.name ? uiText("Foto {{v0}}", { v0: form.name }) : uiText("Pratinjau foto")} className="um-avatar" />
              ) : (
                <span className="um-avatar is-initials" aria-hidden="true">{initials(form.name)}</span>
              )}
              <div className="um-photo-text">
                <span className="um-label">{uiText("Foto profil")}</span>
                <span className="um-photo-actions">
                  <label className="um-link um-file">
                    {form.photoUrl ? uiText("Ganti foto") : uiText("Pilih foto")}
                    <input type="file" accept="image/*" className="um-file-input" onChange={pickPhoto} />
                  </label>
                  {form.photoUrl ? (
                    <button type="button" className="um-link is-danger" onClick={() => change("photoUrl", "")}>{uiText("Hapus")}</button>
                  ) : (
                    <span className="um-hint">{uiText("maks. 1 MB")}</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="um-note">
            <p>{passwordNote}</p>
            {user ? (
              <button type="button" className="um-link" disabled={busy} onClick={reset}>{uiText("Reset password")}</button>
            ) : null}
          </div>
        </div>

        <footer className="um-foot">
          <button type="button" className="um-btn is-ghost" disabled={busy} onClick={requestClose}>{uiText("Batal")}</button>
          <button type="submit" className="um-btn is-primary" disabled={busy}>
            {busy ? uiText("Menyimpan...") : user ? uiText("Simpan") : uiText("Tambah")}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
