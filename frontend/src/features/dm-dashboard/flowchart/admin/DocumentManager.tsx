"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Eye, FileText, LayoutTemplate, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import { flowchartApi } from "../../api";
import type { FlowchartListItem, FlowchartPhase } from "../types";
import { FLOWCHART_PHASES } from "../types";
import { flowchartImageSrc } from "../types";
import DocumentEditor from "./DocumentEditor";
import DocumentView from "../DocumentView";
import { addManualProcedure, listManualProcedures, removeManualProcedure, type ManualProcedure } from "../manualProcedures";

export default function DocumentManager() {
  const { text: uiText } = useUiText();
  const [items, setItems] = useState<FlowchartListItem[]>([]);
  const [phase, setPhase] = useState<FlowchartPhase | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorId, setEditorId] = useState<number | null | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [managerTab, setManagerTab] = useState<"documents" | "manual">("documents");
  const [manualItems, setManualItems] = useState<ManualProcedure[]>([]);
  const [manualTitle, setManualTitle] = useState("");
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualUploading, setManualUploading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setItems(await flowchartApi.listAll()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : uiText("Dokumen gagal dimuat.")); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { void listManualProcedures().then(setManualItems).catch((cause) => setManualError(cause instanceof Error ? cause.message : uiText("Prosedur Manual gagal dimuat."))); }, []);
  useEffect(() => {
    if (!addOpen) return;
    const close = (event: PointerEvent) => { if (!addRef.current?.contains(event.target as Node)) setAddOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [addOpen]);

  const counts = useMemo(() => {
    const base: Record<FlowchartPhase, number> = { pre: 0, during: 0, post: 0 };
    items.forEach((item) => { base[item.phase] += 1; });
    return base;
  }, [items]);

  const filtered = useMemo(() => items.filter((item) =>
    (phase === "all" || item.phase === phase) &&
    item.title.toLowerCase().includes(search.trim().toLowerCase())
  ).sort((a, b) => {
    if (a.phase !== b.phase) return a.phase.localeCompare(b.phase);
    return a.sortOrder - b.sortOrder || a.id - b.id;
  }), [items, phase, search]);

  const move = async (item: FlowchartListItem, direction: -1 | 1) => {
    const inPhase = items.filter((row) => row.phase === item.phase).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const index = inPhase.findIndex((row) => row.id === item.id);
    const target = inPhase[index + direction];
    if (!target) return;
    await Promise.all([
      flowchartApi.update(item.id, { sortOrder: target.sortOrder }),
      flowchartApi.update(target.id, { sortOrder: item.sortOrder }),
    ]);
    await load();
  };

  const remove = async (item: FlowchartListItem) => {
    if (!window.confirm(uiText("Hapus dokumen {{v0}}?", { v0: item.title }))) return;
    await flowchartApi.remove(item.id);
    await load();
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
    setManualError(null);
    if (!manualTitle.trim()) { setManualError(uiText("Judul Prosedur Manual wajib diisi.")); return; }
    if (!manualFile) { setManualError(uiText("Pilih file Prosedur Manual terlebih dahulu.")); return; }
    setManualUploading(true);
    try {
      await addManualProcedure(manualTitle.trim(), manualFile);
      setManualTitle(""); setManualFile(null);
      setManualItems(await listManualProcedures());
    } catch (cause) { setManualError(cause instanceof Error ? cause.message : uiText("Prosedur Manual gagal diunggah.")); }
    finally { setManualUploading(false); }
  };

  const removeManual = async (item: ManualProcedure) => {
    if (!window.confirm(uiText("Hapus Prosedur Manual {{v0}}?", { v0: item.title }))) return;
    await removeManualProcedure(item.id);
    setManualItems(await listManualProcedures());
  };

  const upload = async () => {
    setUploadError(null);
    if (!title.trim()) { setUploadError(uiText("Judul dokumen wajib diisi.")); return; }
    if (!file) { setUploadError(uiText("Pilih file gambar.")); return; }
    setUploading(true);
    try {
      const doc = await flowchartApi.create({ title: title.trim(), kind: "image", status: "published", phase: "during" });
      await flowchartApi.uploadImage(doc.id, file);
      setUploadOpen(false); setTitle(""); setFile(null); await load();
    } catch (cause) { setUploadError(cause instanceof Error ? cause.message : uiText("Dokumen gagal diunggah.")); }
    finally { setUploading(false); }
  };

  if (editorId !== undefined) {
    return <DocumentEditor id={editorId} onClose={() => setEditorId(undefined)} />;
  }

  return (
    <div className="dmfc-document-manager">
      <div className="dm-subtabs dmfc-public-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={managerTab === "documents"} className={`dm-subtab${managerTab === "documents" ? " is-active" : ""}`} onClick={() => setManagerTab("documents")}>{uiText("Dokumen")}</button>
        <button type="button" role="tab" aria-selected={managerTab === "manual"} className={`dm-subtab${managerTab === "manual" ? " is-active" : ""}`} onClick={() => setManagerTab("manual")}>{uiText("Prosedur Manual")}</button>
      </div>

      {managerTab === "manual" ? (
        <div className="dmfc-manager-manual">
          <form className="dmfc-manager-upload" onSubmit={(event) => { event.preventDefault(); void uploadManual(); }}>
            <div className="dmfc-manager-upload__fields">
              <label><span>{uiText("Judul Prosedur Manual")}</span><input type="text" value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder={uiText("Masukkan judul")} disabled={manualUploading} /></label>
              <label><span>{uiText("File PDF")}</span><input type="file" accept="application/pdf,.pdf" onChange={(event) => selectManualFile(event.target.files?.[0] ?? null)} disabled={manualUploading} /></label>
            </div>
            {manualError && <p className="dmfc-manager-error" role="alert">{manualError}</p>}
            <button type="submit" className="dm-admin-btn is-primary" disabled={manualUploading}><Upload size={16} />{manualUploading ? uiText("Mengunggah...") : uiText("Upload Prosedur Manual")}</button>
          </form>
          {manualItems.length === 0 ? <div className="dm-admin-state-block"><h3>{uiText("Belum ada Prosedur Manual")}</h3><p>{uiText("Unggah file PDF pertama untuk ditampilkan.")}</p></div> : <div className="dm-admin-table-wrap"><table className="dm-admin-table dmfc-manager-table"><thead><tr><th>{uiText("Dokumen")}</th><th>{uiText("File")}</th><th>{uiText("Diperbarui")}</th><th>{uiText("Aksi")}</th></tr></thead><tbody>{manualItems.map((item) => <tr key={item.id}><td className="dmfc-manual-name"><FileText size={16} />{item.title}</td><td>{item.fileName}</td><td>{new Date(item.updatedAt).toLocaleDateString("id-ID")}</td><td><button type="button" className="dm-admin-btn is-danger" onClick={() => void removeManual(item)}><Trash2 size={15} />{uiText("Hapus")}</button></td></tr>)}</tbody></table></div>}
        </div>
      ) : (
      <>
      <div className="dmfc-document-tabs" role="tablist">
        <button type="button" className={phase === "all" ? "is-active" : ""} onClick={() => setPhase("all")}>{uiText("Semua")}<b>{items.length}</b></button>
        {FLOWCHART_PHASES.map((item) => <button type="button" key={item.value} className={phase === item.value ? "is-active" : ""} onClick={() => setPhase(item.value)}>{uiText(item.label)}<b>{counts[item.value]}</b></button>)}
      </div>

      <div className="dmfc-document-toolbar">
        <h2>{uiText("Daftar Dokumen")}</h2>
        <div className="dmfc-document-toolbar__right">
          <label className="dmfc-document-search"><Search size={17} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={uiText("Cari dokumen...")} /></label>
          <div className="dmfc-add-menu-wrap" ref={addRef}>
            <button type="button" className="dm-admin-btn is-primary dmfc-add-button" onClick={() => setAddOpen((open) => !open)}><Plus size={16} />{uiText("Tambah")}<ChevronDown size={15} /></button>
            {addOpen && <div className="dmfc-add-menu" role="menu"><button type="button" role="menuitem" onClick={() => { setAddOpen(false); setUploadOpen(true); }}><Upload size={16} />{uiText("Upload Gambar")}</button><button type="button" role="menuitem" onClick={() => { setAddOpen(false); setEditorId(null); }}><LayoutTemplate size={16} />{uiText("Buat Board")}</button></div>}
          </div>
        </div>
      </div>

      {loading ? <div className="dm-admin-state-block" role="status">{uiText("Memuat dokumen...")}</div> : error ? <div className="dm-admin-state-block" role="alert">{error}</div> : (
        <div className="dm-admin-table-wrap dmfc-document-table-wrap">
          <table className="dm-admin-table dmfc-document-table"><thead><tr><th>{uiText("Judul")}</th><th>{uiText("Fase")}</th><th>{uiText("Versi")}</th><th>{uiText("Status")}</th><th>{uiText("Diperbarui")}</th><th>{uiText("Aksi")}</th></tr></thead><tbody>{filtered.map((item) => (
            <tr key={item.id}><td className="dmfc-document-title"><strong>{item.title}</strong></td><td>{FLOWCHART_PHASES.find((phase) => phase.value === item.phase)?.label}</td><td>{item.version || "-"}</td><td><span className={`dmfc-status-chip is-${item.status}`}>{item.status === "published" ? uiText("Terbit") : uiText("Draft")}</span></td><td>{new Date(item.updatedAt).toLocaleDateString("id-ID")}</td><td><div className="dmfc-row-actions"><button type="button" className="dmfc-icon-action" title={uiText("Naik")} onClick={() => void move(item, -1)}><ChevronDown size={16} className="dmfc-rotate-up" /></button><button type="button" className="dmfc-icon-action" title={uiText("Turun")} onClick={() => void move(item, 1)}><ChevronDown size={16} /></button><button type="button" className="dmfc-icon-action" title={uiText("Lihat")} onClick={() => setPreview(item.id)}><Eye size={16} /></button><button type="button" className="dmfc-icon-action" title={uiText("Edit")} onClick={() => setEditorId(item.id)}><Pencil size={16} /></button><button type="button" className="dmfc-icon-action is-danger" title={uiText("Hapus")} onClick={() => void remove(item)}><Trash2 size={16} /></button></div></td></tr>
          ))}</tbody></table>
        </div>
      )}

      {uploadOpen && <div className="dmfc-board-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setUploadOpen(false); }}><div className="dmfc-board-modal" role="dialog" aria-modal="true"><h2>{uiText("Upload Gambar")}</h2><label className="dmfc-document-field"><span>{uiText("Judul*")}</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="dmfc-document-field"><span>{uiText("File gambar")}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>{uploadError && <p className="dmfc-manager-error" role="alert">{uploadError}</p>}<div className="dmfc-board-modal__actions"><button type="button" className="dm-admin-btn is-secondary" onClick={() => setUploadOpen(false)}>{uiText("Batal")}</button><button type="button" className="dm-admin-btn is-primary" disabled={uploading} onClick={() => void upload()}>{uploading ? uiText("Mengunggah...") : uiText("Upload")}</button></div></div></div>}
      {preview !== null && <PreviewModal id={preview} onClose={() => setPreview(null)} />}
      </>
      )}
    </div>
  );
}

function PreviewModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { text: uiText } = useUiText();
  const [doc, setDoc] = useState<Awaited<ReturnType<typeof flowchartApi.getAdmin>> | null>(null);
  useEffect(() => { void flowchartApi.getAdmin(id).then(setDoc); }, [id]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="dmfc-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="dmfc-preview-modal" role="dialog" aria-modal="true"><div className="dmfc-preview-head"><h2>{uiText("Pratinjau")}</h2><button type="button" className="dm-admin-btn is-secondary" onClick={onClose}>{uiText("Tutup")}</button></div>{doc ? <DocumentView doc={doc} /> : <p role="status">{uiText("Memuat pratinjau...")}</p>}</div></div>,
    document.body
  );
}
