"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import type { DmWorkshop } from "../api";
import { FactoryIcon, PlusIcon } from "./AdminIcons";

interface WorkshopManagerProps {
  workshops: DmWorkshop[];
  onAddDm: (workshop: DmWorkshop) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: number, name: string) => Promise<void>;
  onDelete: (workshop: DmWorkshop) => Promise<void>;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

export default function WorkshopManager({ workshops, onCreate, onRename, onDelete, onAddDm }: WorkshopManagerProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  function openAdd() {
    setAdding(true);
    setEditingId(null);
    setError(null);
  }

  function closeAdd() {
    setAdding(false);
    setNewName("");
    setError(null);
  }

  function submitNew(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) {
      setError("Nama workshop wajib diisi.");
      return;
    }
    run(async () => {
      await onCreate(name);
      setAdding(false);
      setNewName("");
    });
  }

  function submitRename(event: FormEvent, id: number) {
    event.preventDefault();
    const name = editName.trim();
    if (!name) {
      setError("Nama workshop wajib diisi.");
      return;
    }
    run(async () => {
      await onRename(id, name);
      setEditingId(null);
    });
  }

  return (
    <section className="dm-panel dm-ws" aria-labelledby="ws-manager-title">
      <div className="dm-panel-head">
        <div>
          <div className="dm-panel-titlebar">
            <h3 id="ws-manager-title" className="dm-panel-title">Workshop</h3>
            <span className="dm-pill">{workshops.length} Terdaftar</span>
          </div>
          <p className="dm-panel-sub">Buat workshop, tambahkan DM, lalu buat lini dan atur timnya.</p>
        </div>
        {!adding ? (
          <button type="button" className="dm-admin-btn is-primary dm-btn-add" onClick={openAdd}>
            <PlusIcon size={14} />
            Tambah Workshop
          </button>
        ) : null}
      </div>

      <ul className="dm-ws-grid">
        {workshops.map((workshop) => (
          <li key={workshop.id} className="dm-ws-card">
            {editingId === workshop.id ? (
              <form className="dm-ws-edit" onSubmit={(event) => submitRename(event, workshop.id)}>
                <label className="dm-ws-edit-label" htmlFor={`ws-edit-${workshop.id}`}>Nama workshop</label>
                <input
                  id={`ws-edit-${workshop.id}`}
                  className="dm-admin-input dm-ws-input"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  autoFocus
                />
                <div className="dm-ws-actions">
                  <button type="button" className="dm-admin-btn is-primary" onClick={() => onAddDm(workshop)}>
                    <PlusIcon size={14} /> Tambah DM
                  </button>
                  <button type="submit" className="dm-admin-btn is-primary" disabled={busy}>Simpan</button>
                  <button type="button" className="dm-admin-btn is-tonal" onClick={() => setEditingId(null)}>
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="dm-ws-card-top">
                  <span className="dm-icon-tile">
                    <FactoryIcon size={18} />
                  </span>
                  <div className="dm-ws-card-text">
                    <span className="dm-ws-name">{workshop.name}</span>
                    {workshop.lineCount > 0 ? (
                      <span className="dm-pill is-ok">
                        <span className="dm-pill-dot" aria-hidden="true" />
                        {workshop.lineCount} Line
                      </span>
                    ) : (
                      <span className="dm-pill">Belum ada line</span>
                    )}
                  </div>
                </div>
                <div className="dm-ws-actions">
                  <button type="button" className="dm-admin-btn is-primary" onClick={() => onAddDm(workshop)}>
                    <PlusIcon size={14} /> Tambah DM
                  </button>
                  <button
                    type="button"
                    className="dm-admin-btn is-tonal"
                    aria-label={`Ubah nama ${workshop.name}`}
                    onClick={() => {
                      setEditingId(workshop.id);
                      setEditName(workshop.name);
                      setAdding(false);
                      setError(null);
                    }}
                  >
                    Ubah Nama
                  </button>
                  <button
                    type="button"
                    className="dm-admin-btn is-danger-soft"
                    aria-label={`Hapus ${workshop.name}`}
                    disabled={busy}
                    title={workshop.lineCount > 0 ? "Masih punya line. Hapus atau pindahkan linenya dulu." : undefined}
                    onClick={() => run(() => onDelete(workshop))}
                  >
                    Hapus
                  </button>
                </div>
              </>
            )}
          </li>
        ))}

        <li className="dm-ws-slot">
          {adding ? (
            <form className="dm-ws-tile is-form" onSubmit={submitNew}>
              <label className="dm-ws-edit-label" htmlFor="ws-new-name">Nama workshop baru</label>
              <input
                id="ws-new-name"
                className="dm-admin-input dm-ws-input"
                placeholder="Contoh: Workshop 7"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                autoFocus
              />
              <div className="dm-ws-actions">
                <button type="submit" className="dm-admin-btn is-primary" disabled={busy}>Simpan</button>
                <button type="button" className="dm-admin-btn is-tonal" onClick={closeAdd}>Batal</button>
              </div>
            </form>
          ) : (
            <button type="button" className="dm-ws-tile" onClick={openAdd}>
              <span className="dm-ws-tile-plus"><PlusIcon size={16} /></span>
              <span className="dm-ws-tile-title">Tambah Workshop</span>
              <span className="dm-ws-tile-caption">
                {workshops.length === 0 ? "Belum ada workshop. Buat yang pertama di sini." : "Buat workshop baru untuk line produksi"}
              </span>
            </button>
          )}
        </li>
      </ul>
      {error ? <p className="dm-admin-inline-error" role="alert">{error}</p> : null}
    </section>
  );
}
