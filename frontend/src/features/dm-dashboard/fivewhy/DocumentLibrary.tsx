"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { accountApi, fiveWhyDocumentsApi } from "../api";
import type { DmMe, FiveWhyDocument, FiveWhyDocumentLine } from "../api";
import { useUiText } from "@/locales/useUiText";
const CATEGORIES: Record<FiveWhyDocument["category"], string> = {
  analysis: "Analisis 5Why & PDCA",
  evidence: "Bukti pendukung",
  standard: "SOP / WI",
  other: "Lainnya",
};

type Props = {
  headerActions?: ReactNode;
  onBusyChange?: (busy: boolean) => void;
  onDraftChange?: (dirty: boolean) => void;
};

export default function DocumentLibrary({ onBusyChange, onDraftChange, headerActions }: Props = {}) {
  const { text: uiText, locale } = useUiText();
  const [user, setUser] = useState<DmMe | null>(null);
  const [documents, setDocuments] = useState<FiveWhyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [lineId, setLineId] = useState(0);
  const [picId, setPicId] = useState(0);
  const [lines, setLines] = useState<FiveWhyDocumentLine[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<FiveWhyDocument["category"]>("analysis");
  const [source, setSource] = useState<"file" | "simo">("file");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);  const modal = useRef<HTMLDialogElement>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const working = useRef(false);
  const selectedLine = lines.find((line) => line.id === lineId);
  const selectedPic = selectedLine?.pics.find((pic) => pic.id === picId);
  const canEdit = user?.role === "leader" || user?.role === "member";
  const dirty = Boolean(title.trim() || url.trim() || file);

  useEffect(() => { onDraftChange?.(dirty); }, [dirty, onDraftChange]);

  useEffect(() => {
    const dialog = modal.current;
    if (!dialog) return;
    if (modalOpen && !dialog.open) {
      dialog.showModal();
      titleInput.current?.focus();
    } else if (!modalOpen && dialog.open) {
      dialog.close();
      uploadButton.current?.focus();
    }
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [modalOpen]);

  useEffect(() => {
    if (!dirty && !busy) return;
    function beforeUnload(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, busy]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    Promise.all([accountApi.me(), fiveWhyDocumentsApi.list()])
      .then(async ([me, items]) => {
        const options = me.role === "leader" || me.role === "member" ? await fiveWhyDocumentsApi.options() : [];
        if (!active) return;
        setUser(me);
        setDocuments(items);
        setLines(options);
        const defaultLine = options.find((line) => line.id === me.line?.id) ?? options[0];
        setLineId((current) => options.some((line) => line.id === current) ? current : defaultLine?.id ?? 0);
        setPicId((current) => current || (me.role === "member" ? defaultLine?.pics[0]?.id ?? 0 : 0));
      })
      .catch((reason: unknown) => { if (active) setLoadError(reason instanceof Error ? reason.message : "Dokumen gagal dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  function setWorking(value: boolean) {
    working.current = value;
    setBusy(value);
    onBusyChange?.(value);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working.current || !canEdit || !lineId || !selectedPic || !title.trim()) return;
    setError("");
    setNotice("");
    if (source === "file" && (!file || !file.name.toLowerCase().endsWith(".xlsx") || file.size > 20 * 1024 * 1024)) {
      setError("Pilih file Excel .xlsx maksimal 20 MB.");
      return;
    }
    setWorking(true);
    try {
      const saved = source === "simo"
        ? await fiveWhyDocumentsApi.addLink({ lineId, picId, title: title.trim(), category, url: url.trim() })
        : await fiveWhyDocumentsApi.upload(lineId, picId, title.trim(), category, file!);
      setDocuments((items) => [saved, ...items]);
      setTitle(""); setUrl(""); setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setNotice("Dokumen disimpan.");
      setModalOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Dokumen gagal disimpan.");
    } finally { setWorking(false); }
  }

  async function remove(document: FiveWhyDocument) {
    if (!canEdit || working.current || !window.confirm(uiText("Hapus dokumen ini?"))) return;
    setWorking(true); setError(""); setNotice("");
    try {
      await fiveWhyDocumentsApi.remove(document.id);
      setDocuments((items) => items.filter((item) => item.id !== document.id));
      setNotice("Dokumen dihapus.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Dokumen gagal dihapus.");
    } finally { setWorking(false); }
  }

  async function download(document: FiveWhyDocument) {
    if (working.current) return;
    setWorking(true); setError("");
    try {
      const blob = await fiveWhyDocumentsApi.download(document.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = objectUrl; anchor.download = document.fileName ?? "5Why.xlsx";
      window.document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "File gagal diunduh.");
    } finally { setWorking(false); }
  }

  const query = search.trim().toLowerCase();
  const visible = documents.filter((document) => (filter === "all" || document.category === filter) && `${document.title} ${document.lineCode} ${document.picName ?? ""} ${document.fileName ?? ""}`.toLowerCase().includes(query));

  return (
    <div className="dm-5w-page">
      <header className="dm-5w-page-head"><div><h1 className="dm-5w-page-title">{uiText("Dokumen 5Why & PDCA")}</h1><p className="dm-5w-page-sub">{uiText("Tempat sementara untuk menyimpan Excel atau link SIMO. Terpisah dari form analisis 5Why.")}</p></div><div className="dm-5w-page-head-actions">{headerActions}</div></header>
      {loadError ? <div className="dm-5w-document-error" role="alert">{uiText(loadError)} <button type="button" className="dm-5w-btn dm-5w-btn-secondary" disabled={loading || busy} onClick={() => setReload((value) => value + 1)}>{uiText("Coba lagi")}</button></div> : null}
      {error && !modalOpen ? <div className="dm-5w-document-error" role="alert">{uiText(error)}</div> : null}
      {notice || busy ? <p role="status">{uiText(busy ? "Memproses..." : notice)}</p> : null}
      {loading ? <p role="status">{uiText("Memuat dokumen...")}</p> : !loadError ? <>
        {canEdit ? <dialog ref={modal} className="dm-5w-root dm-5w-upload-modal" aria-labelledby="dm-5w-upload-title" aria-describedby="dm-5w-upload-description" onCancel={(event) => { event.preventDefault(); if (!working.current) setModalOpen(false); }}>
          <div className="dm-5w-upload-modal-head"><h2 className="dm-5w-card-title" id="dm-5w-upload-title">{uiText("Tambah dokumen")}</h2><button type="button" className="dm-5w-btn dm-5w-btn-secondary" disabled={busy} onClick={() => setModalOpen(false)} aria-label={uiText("Tutup")}><span aria-hidden="true">×</span></button></div>
          {error ? <div className="dm-5w-document-error" role="alert">{uiText(error)}</div> : null}
          <form className="dm-5w-document-form" onSubmit={(event) => void submit(event)}>
          <fieldset disabled={busy || !lines.length}>
            <legend className="dm-5w-sr-only">{uiText("Tambah dokumen")}</legend>
            <div className="dm-5w-document-fields">
              <label className="dm-5w-field"><span className="dm-5w-label">{uiText("Line")}</span><select required className="dm-5w-select" value={lineId || ""} onChange={(event) => { const id = Number(event.target.value); setLineId(id); setPicId(user?.role === "member" ? lines.find((line) => line.id === id)?.pics[0]?.id ?? 0 : 0); }}><option value="">{uiText("Pilih line")}</option>{lines.map((line) => <option key={line.id} value={line.id}>{line.code}</option>)}</select></label>
              <label className="dm-5w-field"><span className="dm-5w-label">{uiText("PIC")}</span><select required className="dm-5w-select" value={picId || ""} onChange={(event) => setPicId(Number(event.target.value))}><option value="">{uiText("Pilih PIC")}</option>{selectedLine?.pics.map((pic) => <option key={pic.id} value={pic.id}>{pic.name} ({pic.employeeNo})</option>)}</select></label>
              <label className="dm-5w-field"><span className="dm-5w-label">{uiText("Judul dokumen")}</span><input ref={titleInput} required className="dm-5w-input" maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label className="dm-5w-field"><span className="dm-5w-label">{uiText("Kategori dokumen")}</span><select className="dm-5w-select" value={category} onChange={(event) => setCategory(event.target.value as FiveWhyDocument["category"])}>{Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{uiText(label)}</option>)}</select></label>
              <label className="dm-5w-field"><span className="dm-5w-label">{uiText("Sumber dokumen")}</span><select className="dm-5w-select" value={source} onChange={(event) => setSource(event.target.value as "file" | "simo")}><option value="file">{uiText("Upload Excel")}</option><option value="simo">{uiText("Link SIMO")}</option></select></label>
              {source === "file" ? <label className="dm-5w-field"><span className="dm-5w-label">{uiText("File Excel (.xlsx, maksimal 20 MB)")}</span><input ref={fileInput} type="file" required accept=".xlsx" onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); if (selected && !title.trim()) setTitle(selected.name.replace(/\.xlsx$/i, "").slice(0, 200)); }} /></label> : <label className="dm-5w-field"><span className="dm-5w-label">{uiText("URL SIMO")}</span><input className="dm-5w-input" type="url" required maxLength={2000} placeholder="https://mtp.myoas.com/..." value={url} onChange={(event) => setUrl(event.target.value)} /></label>}
            </div>
            {selectedPic ? <p>{uiText("Leader")}: {selectedLine?.leaders.join(", ") || uiText("Belum diatur")} · {uiText("Supervisor")}: {selectedPic.supervisorName || uiText("Belum diatur")}</p> : null}
            <p id="dm-5w-upload-description">{uiText("Dokumen disimpan sendiri, tanpa membuat atau mengisi analisis 5Why di web.")}</p>
            <div className="dm-5w-upload-modal-footer"><button type="button" className="dm-5w-btn dm-5w-btn-secondary" onClick={() => setModalOpen(false)}>{uiText("Batal")}</button><button type="submit" className="dm-5w-btn dm-5w-btn-primary" disabled={!lineId || !selectedPic || !title.trim()}>{uiText(busy ? "Memproses..." : "Simpan dokumen")}</button></div>
          </fieldset>
          {!lines.length ? <p role="alert">{uiText("Belum ada penugasan line aktif. Hubungi admin sebelum menambahkan dokumen.")}</p> : null}
        </form></dialog> : null}
        <section className="dm-5w-card dm-5w-documents" aria-labelledby="dm-5w-library-title">
          <div className="dm-5w-document-library-head"><h2 className="dm-5w-card-title" id="dm-5w-library-title">{uiText("Daftar dokumen")}</h2>{canEdit ? <button ref={uploadButton} type="button" className="dm-5w-btn dm-5w-btn-primary" disabled={busy} aria-haspopup="dialog" onClick={() => { setError(""); setModalOpen(true); }}>{uiText("Tambah dokumen")}</button> : null}</div>
          <div className="dm-5w-document-fields dm-5w-library-filters">
            <label className="dm-5w-field"><span className="dm-5w-label">{uiText("Cari dokumen")}</span><input className="dm-5w-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <label className="dm-5w-field"><span className="dm-5w-label">{uiText("Kategori dokumen")}</span><select className="dm-5w-select" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">{uiText("Semua")}</option>{Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{uiText(label)}</option>)}</select></label>
          </div>
          {!visible.length ? <p>{uiText(documents.length ? "Tidak ada dokumen yang cocok." : "Belum ada dokumen pendukung.")}</p> : <ul className="dm-5w-document-list">{visible.map((document) => <li key={document.id}>
            <div className="dm-5w-document-info"><strong>{document.title}</strong><span>{document.lineCode} · {uiText("PIC")}: {document.picName ?? uiText("PIC belum ditentukan")} · {uiText(CATEGORIES[document.category])} · {new Date(document.createdAt).toLocaleDateString(locale)}</span><span>{document.source === "simo" ? "SIMO" : document.fileName}{document.size ? ` · ${(document.size / 1024 / 1024).toFixed(1)} MB` : ""}</span></div>
            <div className="dm-5w-document-actions">{document.source === "simo" && document.url ? <a className="dm-5w-btn dm-5w-btn-secondary" href={document.url} target="_blank" rel="noopener noreferrer">{uiText("Buka di SIMO")}</a> : <button type="button" className="dm-5w-btn dm-5w-btn-secondary" disabled={busy} onClick={() => void download(document)}>{uiText("Unduh Excel")}</button>}{canEdit ? <button type="button" className="dm-5w-btn dm-5w-btn-secondary" disabled={busy} onClick={() => void remove(document)} aria-label={`${uiText("Hapus dokumen")}: ${document.title}`}>{uiText("Hapus")}</button> : null}</div>
          </li>)}</ul>}
        </section>
      </> : null}    </div>
  );
}
