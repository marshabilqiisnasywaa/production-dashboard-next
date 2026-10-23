"use client";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import CustomSelect from "@/components/shell/CustomSelect";
import type { DmWorkshop } from "../api";
import { createGroup, updateGroup } from "./dmGroupsStore";
import type { DmGroup } from "./dmGroupsStore";
import "./DmGroupDialog.css";

type DmGroupDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  group: DmGroup | null;
  workshops: DmWorkshop[];
  initialWorkshopId: number | null;
  workshopLocked?: boolean;
  onClose: () => void;
  onSaved: (group: DmGroup) => void;
};

export default function DmGroupDialog({
  open,
  mode,
  group,
  workshops,
  initialWorkshopId,
  workshopLocked = false,
  onClose,
  onSaved,
}: DmGroupDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [workshopId, setWorkshopId] = useState<number | null>(initialWorkshopId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setWorkshopId(mode === "edit" && group ? group.workshopId : initialWorkshopId);
    setName(group?.name ?? "");
    setDescription(group?.description ?? "");
    setError(null);
    setSaving(false);
  }, [open, mode, group?.id, initialWorkshopId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    const timer = window.setTimeout(() => nameRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timer);
      if (dialog.open) dialog.close();
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  const workshopReadOnly = workshopLocked || mode === "edit";
  const title = mode === "edit" ? "Ubah DM Meeting" : "Tambah DM Meeting";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) {
      setError("Nama DM wajib diisi.");
      return;
    }
    if (workshopId === null) {
      setError("Pilih workshop dulu.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const saved =
        mode === "edit" && group
          ? await updateGroup(group.id, { name: nextName, description })
          : await createGroup({ workshopId, name: nextName, description });
      setSaving(false);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "DM gagal disimpan.");
      setSaving(false);
    }
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="dm-dialog"
      aria-labelledby="dm-group-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="dm-dialog-card">
        <header className="dm-dialog-head">
          <h2 id="dm-group-dialog-title" className="dm-dialog-title">{title}</h2>
          <button type="button" className="dm-dialog-close" onClick={onClose} aria-label="Tutup">
            <X size={18} strokeWidth={1.8} />
          </button>
        </header>

        <form className="dm-dialog-form" onSubmit={save}>
          <div className="dm-dialog-field">
            <span className="dm-dialog-label">Workshop</span>
            {workshopReadOnly ? (
              <fieldset className="dm-dialog-locked-select" disabled aria-label="Workshop">
                <CustomSelect
                  value={workshopId === null ? "" : String(workshopId)}
                  options={workshops.map((workshop) => ({ value: String(workshop.id), label: workshop.name }))}
                  ariaLabel="Workshop"
                />
              </fieldset>
            ) : (
              <div className="dm-dialog-select">
                <CustomSelect
                  value={workshopId === null ? "" : String(workshopId)}
                  options={workshops.map((workshop) => ({ value: String(workshop.id), label: workshop.name }))}
                  onChange={(value) => setWorkshopId(value ? Number(value) : null)}
                  ariaLabel="Workshop"
                />
              </div>
            )}
          </div>

          <div className="dm-dialog-field">
            <label htmlFor="dm-group-name" className="dm-dialog-label">Nama DM</label>
            <input
              ref={nameRef}
              id="dm-group-name"
              type="text"
              className="dm-dialog-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: DM 5"
            />
          </div>

          {error ? <p className="dm-dialog-error" role="alert">{error}</p> : null}

          <footer className="dm-dialog-foot">
            <button type="button" className="dm-dialog-btn is-outline" onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className="dm-dialog-btn is-primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </footer>
        </form>
      </div>
    </dialog>,
    document.body
  );
}
