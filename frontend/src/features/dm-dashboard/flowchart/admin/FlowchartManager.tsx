"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Eye, FileText, LayoutTemplate, Pencil, Plus, Search, Trash2, Upload, Workflow } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import { flowchartApi } from "../../api";
import type { FlowchartListItem } from "../types";
import { flowchartImageSrc } from "../types";
import { emptyBoard } from "../board/boardModel";
import FlowchartEditor from "./FlowchartEditor";
import RowMenu from "../../admin/RowMenu";
import { addManualProcedure, listManualProcedures, removeManualProcedure, type ManualProcedure } from "../manualProcedures";
import "../flowchart.css";

export default function FlowchartManager() {
  const { text: uiText, locale } = useUiText();
  const [items, setItems] = useState<FlowchartListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editorId, setEditorId] = useState<number | null>(null);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [boardTitle, setBoardTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [managerTab, setManagerTab] = useState<"flowchart" | "manual">("flowchart");
  const [manualItems, setManualItems] = useState<ManualProcedure[]>([]);
  const [manualTitle, setManualTitle] = useState("");
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualUploading, setManualUploading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addMenuOpen) return;
    const closeMenu = (event: PointerEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) setAddMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [addMenuOpen]);

  useEffect(() => {
    void listManualProcedures()
      .then(setManualItems)
      .catch((cause) => setManualError(cause instanceof Error ? cause.message : uiText("Dokumen manual gagal dimuat.")));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    flowchartApi.list()
      .then((data) => {
        if (!cancelled) setItems([...data].sort((a, b) => a.sortOrder - b.sortOrder));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : uiText("Terjadi kesalahan."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [retry]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await flowchartApi.list();
      setItems([...data].sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : uiText("Terjadi kesalahan."));
    } finally {
      setLoading(false);
    }
  };

  const selectFile = (selected: File | null) => {
    setFormError(null);
    setFile(null);
    if (!selected) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(selected.type)) {
      setFormError(uiText("File harus berupa gambar PNG, JPG, atau WEBP."));
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setFormError(uiText("Ukuran gambar maksimal 10 MB."));
      return;
    }
    setFile(selected);
  };

  const upload = async () => {
    const cleanTitle = title.trim();
    setFormError(null);
    setActionError(null);
    if (!cleanTitle) {
      setFormError(uiText("Judul flowchart wajib diisi."));
      return;
    }
    if (!file) {
      setFormError(uiText("Pilih gambar flowchart terlebih dahulu."));
      return;
    }
    setUploading(true);
    try {
      const created = await flowchartApi.create({ title: cleanTitle, kind: "image" });
      await flowchartApi.uploadImage(created.id, file);
      setTitle("");
      setFile(null);
      setUploadModalOpen(false);
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : uiText("Gagal mengunggah flowchart."));
    } finally {
      setUploading(false);
    }
  };

  const rename = async (item: FlowchartListItem) => {
    const cleanTitle = editingTitle.trim();
    setActionError(null);
    if (!cleanTitle) {
      setActionError(uiText("Judul flowchart wajib diisi."));
      return;
    }
    setSavingId(item.id);
    try {
      await flowchartApi.update(item.id, { title: cleanTitle });
      setEditingId(null);
      setEditingTitle("");
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : uiText("Gagal menyimpan judul flowchart."));
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (item: FlowchartListItem) => {
    setActionError(null);
    if (!window.confirm(uiText("Hapus flowchart {{v0}}?", { v0: item.title }))) return;
    setSavingId(item.id);
    try {
      await flowchartApi.remove(item.id);
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : uiText("Gagal menghapus flowchart."));
    } finally {
      setSavingId(null);
    }
  };

  const createBoard = async () => {
    const cleanTitle = boardTitle.trim();
    if (!cleanTitle) {
      setActionError(uiText("Judul flowchart board wajib diisi."));
      return;
    }
    setActionError(null);
    setSavingId(-1);
    try {
      const created = await flowchartApi.create({ title: cleanTitle, kind: "board", board: emptyBoard() });
      await reload();
      setBoardModalOpen(false);
      setBoardTitle("");
      setEditorId(created.id);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : uiText("Gagal membuat board flowchart."));
    } finally {
      setSavingId(null);
    }
  };

  const selectManualFile = (selected: File | null) => {
    setManualError(null);
    setManualFile(null);
    if (!selected) return;
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      setManualError(uiText("File Prosedur Manual harus berupa PDF."));
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      setManualError(uiText("Ukuran file Prosedur Manual maksimal 20 MB."));
      return;
    }
    setManualFile(selected);
  };

  const uploadManual = async () => {
    const cleanTitle = manualTitle.trim();
    setManualError(null);
    if (!cleanTitle) {
      setManualError(uiText("Judul Prosedur Manual wajib diisi."));
      return;
    }
    if (!manualFile) {
      setManualError(uiText("Pilih file Prosedur Manual terlebih dahulu."));
      return;
    }
    setManualUploading(true);
    try {
      await addManualProcedure(cleanTitle, manualFile);
      setManualTitle("");
      setManualFile(null);
      setManualItems(await listManualProcedures());
    } catch (cause) {
      setManualError(cause instanceof Error ? cause.message : uiText("Prosedur Manual gagal diunggah."));
    } finally {
      setManualUploading(false);
    }
  };

  const removeManual = async (item: ManualProcedure) => {
    if (!window.confirm(uiText("Hapus Prosedur Manual {{v0}}?", { v0: item.title }))) return;
    try {
      await removeManualProcedure(item.id);
      setManualItems(await listManualProcedures());
    } catch (cause) {
      setManualError(cause instanceof Error ? cause.message : uiText("Prosedur Manual gagal dihapus."));
    }
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.title.toLowerCase().includes(query));
  }, [items, searchQuery]);

  const formatUpdated = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  };

  if (editorId !== null) {
    return (
      <FlowchartEditor
        id={editorId}
        onClose={async () => { setEditorId(null); await reload(); }}
      />
    );
  }

  return (
    <div className="dmfc-manager">
      <div className="dm-subtabs dmfc-manager-tabs" role="tablist" aria-label={uiText("Konten flowchart")}>
        <button type="button" role="tab" aria-selected={managerTab === "flowchart"} className={`dm-subtab${managerTab === "flowchart" ? " is-active" : ""}`} onClick={() => setManagerTab("flowchart")}>{uiText("Flowchart")}</button>
        <button type="button" role="tab" aria-selected={managerTab === "manual"} className={`dm-subtab${managerTab === "manual" ? " is-active" : ""}`} onClick={() => setManagerTab("manual")}>{uiText("Prosedur Manual")}</button>
      </div>

      {managerTab === "manual" ? (
        <div className="dmfc-manager-manual">
          <form className="dmfc-manager-upload" onSubmit={(event) => { event.preventDefault(); void uploadManual(); }}>
            <div className="dmfc-manager-upload__fields">
              <label>
                <span>{uiText("Judul Prosedur Manual")}</span>
                <input type="text" value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder={uiText("Masukkan judul")} disabled={manualUploading} />
              </label>
              <label>
                <span>{uiText("File PDF")}</span>
                <input type="file" accept="application/pdf,.pdf" onChange={(event) => selectManualFile(event.target.files?.[0] ?? null)} disabled={manualUploading} />
              </label>
            </div>
            {manualError && <p className="dmfc-manager-error" role="alert">{manualError}</p>}
            <button type="submit" className="dm-admin-btn is-primary" disabled={manualUploading}><Upload size={16} /><span>{manualUploading ? uiText("Mengunggah...") : uiText("Upload Prosedur Manual")}</span></button>
          </form>

          {manualItems.length === 0 ? (
            <div className="dm-admin-state-block"><h3>{uiText("Belum ada Prosedur Manual")}</h3><p>{uiText("Unggah file PDF pertama untuk ditampilkan.")}</p></div>
          ) : (
            <div className="dm-admin-table-wrap">
              <table className="dm-admin-table dmfc-manager-table">
                <thead><tr><th>{uiText("Dokumen")}</th><th>{uiText("Diperbarui")}</th><th>{uiText("Aksi")}</th></tr></thead>
                <tbody>{manualItems.map((item) => (
                  <tr key={item.id}>
                    <td><span className="dmfc-manual-name"><FileText size={18} />{item.title}</span></td>
                    <td>{formatUpdated(item.updatedAt)}</td>
                    <td><div className="dmfc-manager-actions"><button type="button" className="dm-admin-btn is-danger-outline" onClick={() => void removeManual(item)}><Trash2 size={15} /><span>{uiText("Hapus")}</span></button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
      <>
      <section className="dmfc-manager-list" aria-labelledby="dmfc-list-title">
        <h2 id="dmfc-list-title" className="dmfc-manager-list__title">{uiText("Daftar Flowchart")}</h2>
        <div className="dmfc-list-toolbar">
          <label className="dmfc-list-search"><Search size={17} /><span className="dmfc-sr-only">{uiText("Cari flowchart")}</span><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={uiText("Cari flowchart...")} /></label>
          <div className="dmfc-add-menu-wrap" ref={addMenuRef}>
            <button type="button" className="dm-admin-btn is-primary dmfc-add-button" aria-haspopup="menu" aria-expanded={addMenuOpen} onClick={() => setAddMenuOpen((open) => !open)}><Plus size={16} /><span>{uiText("Tambah")}</span><ChevronDown size={15} /></button>
            {addMenuOpen && (
              <div className="dmfc-add-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); setFormError(null); setUploadModalOpen(true); }}><Upload size={16} /><span>{uiText("Upload Gambar")}</span></button>
                <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); setActionError(null); setBoardModalOpen(true); }}><Workflow size={16} /><span>{uiText("Buat Board")}</span></button>
              </div>
            )}
          </div>
        </div>
      </section>
      <form className="dmfc-manager-upload" hidden onSubmit={(event) => { event.preventDefault(); void upload(); }}>
        <div className="dmfc-manager-upload__fields">
          <label>
            <span>{uiText("Judul flowchart")}</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={uiText("Masukkan judul")}
              disabled={uploading}
            />
          </label>
          <label>
            <span>{uiText("File gambar")}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
              disabled={uploading}
            />
          </label>
        </div>
        {formError && <p className="dmfc-manager-error" role="alert">{formError}</p>}
        {actionError && <p className="dmfc-manager-error" role="alert">{actionError}</p>}
        <button type="submit" className="dm-admin-btn is-primary" disabled={uploading}>
          <Upload size={16} />
          <span>{uploading ? uiText("Mengunggah...") : uiText("Upload gambar")}</span>
        </button>
      </form>

      {uploadModalOpen && (
        <div className="dmfc-board-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setUploadModalOpen(false);
        }}>
          <div className="dmfc-board-modal" role="dialog" aria-modal="true" aria-labelledby="dmfc-upload-modal-title">
            <h2 id="dmfc-upload-modal-title">{uiText("Upload Gambar Flowchart")}</h2>
            <form className="dmfc-manager-upload dmfc-manager-upload--modal" onSubmit={(event) => { event.preventDefault(); void upload(); }}>
              <div className="dmfc-manager-upload__fields">
                <label><span>{uiText("Judul flowchart")}</span><input type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={uiText("Masukkan judul")} disabled={uploading} /></label>
                <label><span>{uiText("File gambar")}</span><input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} disabled={uploading} /></label>
              </div>
              {formError && <p className="dmfc-manager-error" role="alert">{formError}</p>}
              {actionError && <p className="dmfc-manager-error" role="alert">{actionError}</p>}
              <div className="dmfc-board-modal__actions"><button type="button" className="dm-admin-btn is-secondary" onClick={() => setUploadModalOpen(false)}>{uiText("Batal")}</button><button type="submit" className="dm-admin-btn is-primary" disabled={uploading}><Upload size={16} /><span>{uploading ? uiText("Mengunggah...") : uiText("Upload")}</span></button></div>
            </form>
          </div>
        </div>
      )}

      {boardModalOpen && (
        <div className="dmfc-board-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setBoardModalOpen(false);
        }}>
          <div className="dmfc-board-modal" role="dialog" aria-modal="true" aria-labelledby="dmfc-board-modal-title">
            <h2 id="dmfc-board-modal-title">{uiText("Buat flowchart board")}</h2>
            <label>
              <span>{uiText("Judul flowchart board")}</span>
              <input
                type="text"
                value={boardTitle}
                onChange={(event) => setBoardTitle(event.target.value)}
                placeholder={uiText("Masukkan judul")}
                autoFocus
              />
            </label>
            {actionError && <p className="dmfc-manager-error" role="alert">{actionError}</p>}
            <div className="dmfc-board-modal__actions">
              <button type="button" className="dm-admin-btn is-secondary" onClick={() => setBoardModalOpen(false)}>{uiText("Batal")}</button>
              <button type="button" className="dm-admin-btn is-primary" disabled={savingId === -1} onClick={() => void createBoard()}>{savingId === -1 ? uiText("Membuat...") : uiText("Buat board")}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="dm-admin-state-block" role="status">{uiText("Memuat flowchart...")}</div>
      ) : error ? (
        <div className="dm-admin-state-block" role="alert">
          <h3>{uiText("Data belum bisa dimuat")}</h3>
          <p>{error}</p>
          <button type="button" className="dm-admin-btn is-primary" onClick={() => setRetry((value) => value + 1)}>
            {uiText("Coba lagi")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="dm-admin-state-block">
          <h3>{uiText("Belum ada flowchart")}</h3>
          <p>{uiText("Tambahkan flowchart pertama untuk ditampilkan.")}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="dm-admin-state-block">
          <h3>{uiText("Flowchart tidak ditemukan")}</h3>
          <p>{uiText("Coba kata kunci pencarian lain.")}</p>
        </div>
      ) : (
        <div className="dm-admin-table-wrap dmfc-manager-table-wrap">
          <table className="dm-admin-table dmfc-manager-table">
            <thead>
              <tr>
                <th>{uiText("Pratinjau")}</th>
                <th>{uiText("Judul")}</th>
                <th>{uiText("Jenis")}</th>
                <th>{uiText("Diperbarui")}</th>
                <th>{uiText("Aksi")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const src = flowchartImageSrc(item.imageUrl);
                const editing = editingId === item.id;
                return (
                  <tr key={item.id}>
                    <td>
                      {src ? (
                        <img className="dmfc-manager-preview" src={src} alt={item.title} />
                      ) : (
                        <span className="dmfc-manager-preview-empty">-</span>
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <input
                          className="dmfc-manager-title-input"
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          disabled={savingId === item.id}
                        />
                      ) : (
                        item.title
                      )}
                    </td>
                    <td>{item.kind === "image" ? uiText("Gambar") : uiText("Board")}</td>
                    <td>{formatUpdated(item.updatedAt)}</td>
                    <td>
                      {editing ? (
                        <div className="dmfc-manager-actions">
                          <button
                            type="button"
                            className="dm-admin-btn is-primary"
                            disabled={savingId === item.id}
                            onClick={() => void rename(item)}
                          >
                            {savingId === item.id ? uiText("Menyimpan...") : uiText("Simpan")}
                          </button>
                          <button
                            type="button"
                            className="dm-admin-btn is-secondary"
                            disabled={savingId === item.id}
                            onClick={() => { setEditingId(null); setEditingTitle(""); }}
                          >
                            {uiText("Batal")}
                          </button>
                        </div>
                      ) : (
                        <RowMenu
                          label={uiText("Aksi flowchart")}
                          items={[
                            {
                              key: "view",
                              label: "Lihat",
                              icon: <Eye size={15} />,
                              onSelect: () => {
                                if (item.kind === "image" && src) window.open(src, "_blank", "noopener,noreferrer");
                                else window.open("/dm-dashboard", "_blank", "noopener,noreferrer");
                              },
                            },
                            {
                              key: "edit",
                              label: item.kind === "board" ? "Edit" : "Ubah",
                              icon: <Pencil size={15} />,
                              onSelect: () => {
                                if (item.kind === "board") {
                                  setEditorId(item.id);
                                } else {
                                  setEditingId(item.id);
                                  setEditingTitle(item.title);
                                }
                              },
                            },
                            {
                              key: "delete",
                              label: "Hapus",
                              icon: <Trash2 size={15} />,
                              danger: true,
                              onSelect: () => void remove(item),
                            },
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}
    </div>
  );
}
