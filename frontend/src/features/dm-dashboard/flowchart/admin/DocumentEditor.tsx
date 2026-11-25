"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, LayoutTemplate, Plus, Trash2, Upload } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import { flowchartApi } from "../../api";
import type { Flowchart, FlowchartContact, FlowchartPhase, FlowchartStatus } from "../types";
import { FLOWCHART_PHASES } from "../types";
import { emptyBoard, fromBoard } from "../board/boardModel";
import DocumentView from "../DocumentView";

const FlowchartCanvas = dynamic(() => import("../board/FlowchartCanvas"), { ssr: false });

export default function DocumentEditor({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { text: uiText } = useUiText();
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [scope, setScope] = useState("");
  const [phase, setPhase] = useState<FlowchartPhase>("during");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [version, setVersion] = useState("");
  const [owner, setOwner] = useState("");
  const [approver, setApprover] = useState("");
  const [status, setStatus] = useState<FlowchartStatus>("published");
  const [requirements, setRequirements] = useState<string[]>([""]);
  const [contacts, setContacts] = useState<FlowchartContact[]>([{ role: "", name: "", phone: "" }]);
  const [kind, setKind] = useState<"image" | "board" | null>(null);
  const [board, setBoard] = useState(emptyBoard());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const canvasRef = useRef<{ getBoard: () => typeof board }>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyDocs, setCopyDocs] = useState<Flowchart[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(id);
  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("../../api").then((module) => module.adminApi.employees()),
    ]).then(([rows]) => {
      if (!cancelled) setEmployees(rows.map((row) => ({ id: row.id, name: row.name })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (id === null) {
      setLoaded(true);
      setDirty(false);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    flowchartApi.getAdmin(id)
      .then((doc) => {
        if (cancelled) return;
        setTitle(doc.title); setPurpose(doc.purpose ?? ""); setScope(doc.scope ?? "");
        setPhase(doc.phase); setEffectiveDate(doc.effectiveDate ?? ""); setVersion(doc.version ?? ""); setOwner(doc.owner ?? ""); setApprover(doc.approver ?? "");
        setStatus(doc.status); setRequirements(doc.requirements?.length ? doc.requirements : [""]); setContacts(doc.contacts?.length ? doc.contacts : [{ role: "", name: "", phone: "" }]);
        setKind(doc.kind); setImageUrl(doc.imageUrl); setBoard(doc.board ?? emptyBoard()); setLoaded(true); setDirty(false);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : uiText("Dokumen gagal dimuat.")))
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const markDirty = useCallback(() => { setDirty(true); setSaved(false); }, []);

  const openCopy = async () => {
    setCopyOpen(true);
    try {
      const list = await flowchartApi.listAll();
      setCopyDocs(await Promise.all(list.filter((item) => item.id !== id).map((item) => flowchartApi.getAdmin(item.id))));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : uiText("Dokumen lain gagal dimuat."));
    }
  };

  const copyContacts = (doc: Flowchart) => {
    setContacts(doc.contacts.map((item) => ({ role: item.role ?? "", name: item.name ?? "", phone: item.phone ?? "" })));
    setCopyOpen(false);
    markDirty();
  };

  const close = () => {
    if (dirty && !window.confirm(uiText("Perubahan belum disimpan. Tutup editor?"))) return;
    onClose();
  };

  const validate = () => {
    if (!title.trim()) return uiText("Judul dokumen wajib diisi.");
    if (!kind) return uiText("Pilih gambar atau board flowchart.");
    if (kind === "image" && id === null && !imageFile) return uiText("Pilih file gambar flowchart.");
    if (requirements.some((item) => item.length > 1000)) return uiText("Setiap persyaratan maksimal 1000 karakter.");
    if (contacts.length > 30) return uiText("Kontak maksimal 30 item.");
    return null;
  };

  const save = useCallback(async () => {
    const validation = validate();
    if (validation) { setError(validation); return; }
    setSaving(true); setSaved(false); setError(null);
    const boardValue = kind === "board" ? (canvasRef.current?.getBoard() ?? board) : undefined;
    const input = {
      title: title.trim(), kind: kind!, board: boardValue,
      phase, purpose: purpose.trim(), scope: scope.trim(),
      effectiveDate: effectiveDate || null, version: version.trim(), owner: owner.trim(), approver: approver.trim(),
      status, requirements: requirements.filter((item) => item.trim()).map((item) => item.trim()),
      contacts: contacts.filter((item) => item.role.trim() || item.name.trim() || item.phone.trim()).map((item) => ({ role: item.role.trim(), name: item.name.trim(), phone: item.phone.trim() })),
    };
    try {
      let doc: Flowchart;
      if (currentId === null) {
        doc = await flowchartApi.create(input);
        setCurrentId(doc.id);
        if (kind === "board") await flowchartApi.update(doc.id, { board: boardValue });
        if (kind === "image" && imageFile) await flowchartApi.uploadImage(doc.id, imageFile);
      } else {
        doc = await flowchartApi.update(currentId, input);
      }
      setDirty(false); setSaved(true); setStatus(doc.status);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : uiText("Dokumen gagal disimpan."));
    } finally { setSaving(false); }
  }, [currentId, title, kind, board, phase, purpose, scope, effectiveDate, version, owner, approver, status, requirements, contacts, imageFile]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  if (!loaded) return <div className="dm-admin-state-block" role="status">{uiText("Memuat dokumen...")}</div>;

  const previewDoc: Flowchart = {
    id: currentId ?? 0, title: title || uiText("Dokumen tanpa judul") as string, kind: kind ?? "board",
    imageUrl: imageUrl, sortOrder: 0,     updatedAt: new Date().toISOString(), phase, purpose, scope,    effectiveDate: effectiveDate || null, version, owner, approver, status, board, requirements: requirements.filter((item) => item.trim()),
    contacts: contacts.filter((item) => item.role.trim() || item.name.trim() || item.phone.trim()),
  };

  return (
    <div className="dmfc-document-editor">
      <div className="dmfc-document-editor__bar">
        <button type="button" className="dm-admin-btn is-secondary" onClick={close}><ArrowLeft size={16} />{uiText("Kembali")}</button>
        <div className="dmfc-document-editor__status" role="status">{saving ? uiText("Menyimpan...") : saved ? uiText("Tersimpan") : dirty ? uiText("Belum disimpan") : uiText("Tidak ada perubahan")}</div>
        <div className="dmfc-document-editor__actions">
          {kind === null && <><button type="button" className="dm-admin-btn is-secondary" onClick={() => { setKind("board"); markDirty(); }}><LayoutTemplate size={15} />{uiText("Buat board")}</button><label className="dm-admin-btn is-secondary dmfc-top-upload"><Upload size={15} />{uiText("Upload gambar")}<input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setKind("image"); setImageFile(file); markDirty(); } }} /></label></>}
          <button type="button" className="dm-admin-btn is-secondary" onClick={() => setPreview(true)}>{uiText("Pratinjau")}</button>
          <label className="dmfc-status-switch"><span>{uiText(status === "draft" ? "Draft" : "Terbit")}</span><input type="checkbox" checked={status === "published"} onChange={(event) => { setStatus(event.target.checked ? "published" : "draft"); markDirty(); }} /><i /></label>
          <button type="button" className="dm-admin-btn is-primary" disabled={saving} onClick={() => void save()}>{saving ? uiText("Menyimpan...") : uiText("Simpan")}</button>
        </div>
      </div>

      {error && <p className="dmfc-manager-error" role="alert">{error}</p>}

      <div className="dmfc-document-editor__grid">
        <section className="dmfc-document-card"><h2>{uiText("Informasi dokumen")}</h2>
          <div className="dmfc-document-fields"><label><span>{uiText("Fase*")}</span><select value={phase} onChange={(event) => { setPhase(event.target.value as FlowchartPhase); markDirty(); }}>{FLOWCHART_PHASES.map((item) => <option key={item.value} value={item.value}>{uiText(item.label)}</option>)}</select></label>
          <label><span>{uiText("Judul*")}</span><input value={title} onChange={(event) => { setTitle(event.target.value); markDirty(); }} placeholder={uiText("Judul flowchart")} /></label>
          <label><span>{uiText("Tujuan")}</span><textarea value={purpose} onChange={(event) => { setPurpose(event.target.value); markDirty(); }} rows={4} /></label>
          <label><span>{uiText("Ruang lingkup")}</span><textarea value={scope} onChange={(event) => { setScope(event.target.value); markDirty(); }} rows={4} /></label></div>
        </section>

        <section className="dmfc-document-card"><h2>{uiText("Identitas dokumen")}</h2><div className="dmfc-document-fields dmfc-document-fields--two">
          <label><span>{uiText("Tanggal efektif")}</span><input type="date" value={effectiveDate} onChange={(event) => { setEffectiveDate(event.target.value); markDirty(); }} /></label>
          <label><span>{uiText("Versi")}</span><input value={version} onChange={(event) => { setVersion(event.target.value); markDirty(); }} /></label>
          <label><span>{uiText("Penanggung jawab")}</span><select value={owner} onChange={(event) => { setOwner(event.target.value); markDirty(); }}><option value="">{uiText("Pilih pengguna")}</option>{employees.map((employee) => <option key={employee.id} value={employee.name}>{employee.name}</option>)}</select></label>
          <label><span>{uiText("Penyetuju")}</span><select value={approver} onChange={(event) => { setApprover(event.target.value); markDirty(); }}><option value="">{uiText("Pilih pengguna")}</option>{employees.map((employee) => <option key={employee.id} value={employee.name}>{employee.name}</option>)}</select></label>
        </div></section>

        <section className="dmfc-document-card"><div className="dmfc-document-card__head"><h2>{uiText("Persyaratan proses")}</h2><button type="button" className="dm-admin-btn is-secondary" onClick={() => { setRequirements((items) => [...items, ""]); markDirty(); }}><Plus size={15} />{uiText("Tambah")}</button></div>
          <div className="dmfc-requirement-editor">{requirements.map((item, index) => <div key={index}><span>{index + 1}</span><textarea value={item} onChange={(event) => { setRequirements((items) => items.map((value, i) => i === index ? event.target.value : value)); markDirty(); }} rows={2} /><button type="button" aria-label={uiText("Hapus")} onClick={() => { setRequirements((items) => items.filter((_, i) => i !== index)); markDirty(); }}><Trash2 size={15} /></button></div>)}</div>
        </section>

        <section className="dmfc-document-card"><div className="dmfc-document-card__head"><h2>{uiText("Kontak")}</h2><div className="dmfc-document-card__actions"><button type="button" className="dm-admin-btn is-secondary" onClick={() => void openCopy()}>{uiText("Salin dari dokumen lain")}</button><button type="button" className="dm-admin-btn is-secondary" onClick={() => { setContacts((items) => [...items, { role: "", name: "", phone: "" }]); markDirty(); }}><Plus size={15} />{uiText("Tambah")}</button></div></div>
          <div className="dmfc-contact-editor">{contacts.map((item, index) => <div key={index}><input value={item.role} placeholder={uiText("Peran")} onChange={(event) => { setContacts((items) => items.map((value, i) => i === index ? { ...value, role: event.target.value } : value)); markDirty(); }} /><input value={item.name} placeholder={uiText("Nama")} onChange={(event) => { setContacts((items) => items.map((value, i) => i === index ? { ...value, name: event.target.value } : value)); markDirty(); }} /><input value={item.phone} placeholder={uiText("Telepon")} onChange={(event) => { setContacts((items) => items.map((value, i) => i === index ? { ...value, phone: event.target.value } : value)); markDirty(); }} /><button type="button" aria-label={uiText("Hapus")} onClick={() => { setContacts((items) => items.filter((_, i) => i !== index)); markDirty(); }}><Trash2 size={15} /></button></div>)}</div>
        </section>

        <section className="dmfc-document-card dmfc-document-card--flowchart"><h2>{uiText("Flowchart")}</h2>{kind === null && <p>{uiText("Pilih Buat board atau Upload gambar di bagian atas.")}</p>}{kind === "board" && <div className="dmfc-inline-board"><FlowchartCanvas ref={canvasRef} initial={board} onDirty={markDirty} /><div className="dmfc-inline-board-actions"><button type="button" className="dm-admin-btn is-secondary" onClick={save}>{saving ? uiText("Menyimpan...") : uiText("Simpan flowchart")}</button></div></div>}{kind === "image" && <p>{uiText(imageFile?.name || "Gambar flowchart")}</p>}</section>
      </div>

      {copyOpen && <div className="dmfc-copy-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCopyOpen(false); }}><div className="dmfc-copy-modal" role="dialog" aria-modal="true"><h2>{uiText("Salin kontak dari dokumen lain")}</h2><div>{copyDocs.map((doc) => <button type="button" key={doc.id} onClick={() => copyContacts(doc)}>{doc.title}</button>)}</div><button type="button" className="dm-admin-btn is-secondary" onClick={() => setCopyOpen(false)}>{uiText("Batal")}</button></div></div>}

      {preview && <div className="dmfc-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(false); }}><div className="dmfc-preview-modal" role="dialog" aria-modal="true"><div className="dmfc-preview-head"><h2>{uiText("Pratinjau")}</h2><button type="button" className="dm-admin-btn is-secondary" onClick={() => setPreview(false)}>{uiText("Tutup")}</button></div><DocumentView doc={previewDoc} /></div></div>}
    </div>
  );
}

