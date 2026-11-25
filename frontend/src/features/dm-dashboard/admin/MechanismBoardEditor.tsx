"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import { assetUrl, uploadPhoto } from "../api";
import {
  MAX_PHOTOS,
  MAX_ROWS,
  MAX_STAGES,
  ROW_KIND_LABELS,
  boardsEqual,
  cloneBoard,
  newId,
  saveBoard,
  useMechanismBoard,
} from "../mechanism/mechanismBoard";
import type { BoardIconKey, BoardRow, BoardRowKind, MechanismBoard } from "../mechanism/mechanismBoard";
import { BOARD_ICONS, BOARD_ICON_LABELS } from "../mechanism/mechanismIcons";
import "../mechanism/mechanism.css";
import "./MechanismBoardEditor.css";

type Notice = { type: "ok" | "error"; text: string } | null;

const CELL_CLASS: Record<BoardRowKind, string> = {
  head: "dmm-cell--level",
  text: "",
  bold: "dmm-cell--time",
  list: "dmm-cell--objective",
};

const KIND_ORDER = Object.keys(ROW_KIND_LABELS) as BoardRowKind[];
const ICON_ORDER = Object.keys(BOARD_ICON_LABELS) as BoardIconKey[];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Foto lama yang tersimpan sebagai data URL di browser diunggah dulu agar jadi URL server. */
async function inlineToUrl(src: string): Promise<string> {
  if (!src.startsWith("data:")) return src;
  const blob = await (await fetch(src)).blob();
  return uploadPhoto(new File([blob], "foto.jpg", { type: blob.type || "image/jpeg" }));
}

export default function MechanismBoardEditor() {
  const { text: uiText } = useUiText();
  const { board, ready, getDefault } = useMechanismBoard();
  const [draft, setDraft] = useState<MechanismBoard | null>(null);
  const [saved, setSaved] = useState<MechanismBoard | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<string | null>(null);

  // Muat sekali setelah data terbaca.
  useEffect(() => {
    if (!ready || draft) return;
    setDraft(cloneBoard(board));
    setSaved(cloneBoard(board));
  }, [ready, draft, board]);

  const dirty = useMemo(() => (draft && saved ? !boardsEqual(draft, saved) : false), [draft, saved]);

  if (!draft) return <p role="status">{uiText("Memuat template...")}</p>;

  const edit = (change: (current: MechanismBoard) => MechanismBoard) => {
    setDraft((current) => (current ? change(current) : current));
    setNotice(null);
  };

  /* ---- kolom (tahap) ---- */

  const setStageTitle = (stageId: string, title: string) =>
    edit((b) => ({ ...b, stages: b.stages.map((s) => (s.id === stageId ? { ...s, title } : s)) }));

  const setCell = (stageId: string, rowId: string, value: string) =>
    edit((b) => ({
      ...b,
      stages: b.stages.map((s) => (s.id === stageId ? { ...s, cells: { ...s.cells, [rowId]: value } } : s)),
    }));

  const addStage = () =>
    edit((b) => {
      if (b.stages.length >= MAX_STAGES) return b;
      const cells = Object.fromEntries(b.rows.map((row) => [row.id, ""]));
      return { ...b, stages: [...b.stages, { id: newId("stage"), title: "Tahap baru", cells, photos: [] }] };
    });

  const moveStage = (index: number, to: number) => edit((b) => ({ ...b, stages: move(b.stages, index, to) }));

  const removeStage = (stageId: string) => {
    if (draft.stages.length <= 1) return;
    if (!window.confirm(uiText("Hapus kolom ini beserta isinya?"))) return;
    edit((b) => ({ ...b, stages: b.stages.filter((s) => s.id !== stageId) }));
  };

  /* ---- baris ---- */

  const patchRow = (rowId: string, patch: Partial<BoardRow>) =>
    edit((b) => ({ ...b, rows: b.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) }));

  const addRow = () =>
    edit((b) => {
      if (b.rows.length >= MAX_ROWS) return b;
      const row: BoardRow = { id: newId("row"), label: "Baris baru", kind: "text", icon: "list" };
      return {
        rows: [...b.rows, row],
        stages: b.stages.map((s) => ({ ...s, cells: { ...s.cells, [row.id]: "" } })),
      };
    });

  const moveRow = (index: number, to: number) => edit((b) => ({ ...b, rows: move(b.rows, index, to) }));

  const removeRow = (rowId: string) => {
    if (draft.rows.length <= 1) return;
    if (!window.confirm(uiText("Hapus baris ini beserta isinya?"))) return;
    setOpenRow(null);
    edit((b) => ({
      rows: b.rows.filter((r) => r.id !== rowId),
      stages: b.stages.map((s) => {
        const cells = { ...s.cells };
        delete cells[rowId];
        return { ...s, cells };
      }),
    }));
  };

  /* ---- foto (langsung diunggah ke server, tampil di bawah judul tahap) ---- */

  const pickPhoto = (stageId: string) => {
    targetRef.current = stageId;
    fileRef.current?.click();
  };

  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const stageId = targetRef.current;
    event.target.value = "";
    if (files.length === 0 || !stageId) return;

    const room = MAX_PHOTOS - (draft.stages.find((s) => s.id === stageId)?.photos.length ?? 0);
    if (room <= 0) {
      setNotice({ type: "error", text: `Maksimal ${MAX_PHOTOS} foto per tahap.` });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      for (const file of files.slice(0, room)) {
        if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) throw new Error("Format harus PNG, JPG, atau WebP.");
        if (file.size > MAX_FILE_BYTES) throw new Error("Ukuran foto maksimal 10 MB.");
        const url = await uploadPhoto(file);
        edit((b) => ({
          ...b,
          stages: b.stages.map((s) => (s.id === stageId ? { ...s, photos: [...s.photos, url].slice(0, MAX_PHOTOS) } : s)),
        }));
      }
    } catch (cause) {
      setNotice({ type: "error", text: cause instanceof Error ? cause.message : "Foto gagal diunggah." });
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = (stageId: string, index: number) =>
    edit((b) => ({
      ...b,
      stages: b.stages.map((s) => (s.id === stageId ? { ...s, photos: s.photos.filter((_, i) => i !== index) } : s)),
    }));

  /* ---- simpan / reset ---- */

  const save = async () => {
    if (draft.stages.some((s) => !s.title.trim()) || draft.rows.some((r) => !r.label.trim())) {
      setNotice({ type: "error", text: "Judul kolom dan nama baris tidak boleh kosong." });
      return;
    }
    setBusy(true);
    try {
      const next: MechanismBoard = {
        rows: draft.rows.map((r) => ({ ...r, label: r.label.trim() })),
        stages: await Promise.all(
          draft.stages.map(async (s) => ({
            ...s,
            title: s.title.trim(),
            photos: await Promise.all(s.photos.map(inlineToUrl)),
          }))
        ),
      };
      const result = await saveBoard(next);
      if (result.where === "failed") {
        setNotice({ type: "error", text: `Gagal menyimpan. ${result.reason ?? ""}`.trim() });
        return;
      }
      setDraft(cloneBoard(next));
      setSaved(cloneBoard(next));
      setNotice(
        result.where === "server"
          ? { type: "ok", text: "Template tersimpan." }
          : { type: "error", text: `Hanya tersimpan di browser ini, orang lain belum melihatnya. Penyebab: ${result.reason ?? "server gagal"}` }
      );
    } catch (cause) {
      setNotice({ type: "error", text: cause instanceof Error ? cause.message : "Gagal menyimpan." });
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(uiText("Kembalikan template ke bawaan? Semua perubahan yang sudah disimpan akan hilang."))) return;
    setBusy(true);
    await saveBoard(null);
    const fresh = getDefault();
    setDraft(cloneBoard(fresh));
    setSaved(cloneBoard(fresh));
    setNotice({ type: "ok", text: "Template dikembalikan ke bawaan." });
    setBusy(false);
  };

  const vars = { "--dmm-stages": draft.stages.length, "--dmm-rows": draft.rows.length } as CSSProperties;

  return (
    <div className="dmm dmm--edit" style={vars}>
      <div className="dmm-edit-top">
        <p className="dmm-edit-hint">
          {uiText("Ubah isi langsung pada tabel. Satu baris teks menjadi satu paragraf di halaman. Foto diunggah di bawah judul tahap, dan akan muncul di tempat yang sama di halaman.")}
        </p>

        <div className="dmm-edit-bar">
          <button type="button" className="dm-admin-btn is-primary" disabled={busy} onClick={save}>
            {uiText(busy ? "Memproses..." : "Simpan")}
          </button>
          <button type="button" className="dm-admin-btn is-secondary" disabled={busy || draft.stages.length >= MAX_STAGES} onClick={addStage}>
            <Plus size={15} aria-hidden="true" /> {uiText("Tambah kolom")}
          </button>
          <button type="button" className="dm-admin-btn is-secondary" disabled={busy || draft.rows.length >= MAX_ROWS} onClick={addRow}>
            <Plus size={15} aria-hidden="true" /> {uiText("Tambah baris")}
          </button>
          <button type="button" className="dm-admin-btn is-danger-outline" disabled={busy} onClick={reset}>
            <RotateCcw size={15} aria-hidden="true" /> {uiText("Kembalikan ke bawaan")}
          </button>
          <Link href="/dm-dashboard/mekanisme" className="dm-admin-btn is-secondary">
            {uiText("Lihat halaman")}
          </Link>
          {dirty && <span className="dmm-edit-dirty">{uiText("Ada perubahan yang belum disimpan")}</span>}
          {notice && (
            <span role="status" className={`dmm-edit-notice is-${notice.type}`}>
              {uiText(notice.text)}
            </span>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="dmm-sr" tabIndex={-1} onChange={onFiles} />

      <div className="dmm-scroll">
        <div className="dmm-steps" role="group" aria-label={uiText("Judul tahap")}>
          <span className="dmm-steps__spacer" aria-hidden="true" />
          {draft.stages.map((stage, index) => (
            <div key={stage.id} className="dmm-step">
              <textarea
                className="dmm-step__input"
                rows={1}
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }
                }}
                value={stage.title}
                aria-label={`${uiText("Judul tahap")} ${index + 1}`}
                onChange={(event) => setStageTitle(stage.id, event.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Slot foto: tepat di bawah judul tahap, sama seperti halaman. */}
        <div className="dmm-photos">
          {draft.stages.map((stage, index) => (
            <div key={stage.id} className="dmm-photo-cell dmm-photo-cell--edit">
              <div className="dmm-stagebar">
                <button type="button" className="dmm-iconbtn" disabled={index === 0} aria-label={uiText("Geser kolom ke kiri")} title={uiText("Geser ke kiri")} onClick={() => moveStage(index, index - 1)}>
                  <ChevronLeft size={15} />
                </button>
                <button type="button" className="dmm-iconbtn" disabled={index === draft.stages.length - 1} aria-label={uiText("Geser kolom ke kanan")} title={uiText("Geser ke kanan")} onClick={() => moveStage(index, index + 1)}>
                  <ChevronRight size={15} />
                </button>
                <button type="button" className="dmm-iconbtn is-danger" disabled={draft.stages.length <= 1} aria-label={uiText("Hapus kolom")} title={uiText("Hapus kolom")} onClick={() => removeStage(stage.id)}>
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="dmm-thumbs">
                {stage.photos.map((src, i) => (
                  <div key={`${i}-${src.slice(-24)}`} className="dmm-thumbedit">
                    <img src={assetUrl(src)} alt={`${stage.title}, ${uiText("foto")} ${i + 1}`} />
                    <button type="button" className="dmm-thumbedit__remove" aria-label={uiText("Hapus foto")} title={uiText("Hapus foto")} onClick={() => removePhoto(stage.id, i)}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {stage.photos.length < MAX_PHOTOS && (
                  <button type="button" className="dmm-thumbadd" disabled={busy} onClick={() => pickPhoto(stage.id)}>
                    <ImagePlus size={18} aria-hidden="true" />
                    <span>{uiText(stage.photos.length ? "Tambah" : "Unggah foto")}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="dmm-board">
          <div className="dmm-labels">
            {draft.rows.map((row, index) => {
              const Icon = BOARD_ICONS[row.icon];
              const open = openRow === row.id;
              return (
                <div key={row.id} className={`dmm-label${open ? " is-open" : ""}`}>
                  <span className="dmm-label__icon"><Icon size={15} /></span>
                  <input
                    type="text"
                    className="dmm-label__input"
                    value={row.label}
                    maxLength={40}
                    aria-label={`${uiText("Nama baris")} ${index + 1}`}
                    onChange={(event) => patchRow(row.id, { label: event.target.value })}
                  />
                  <button
                    type="button"
                    className="dmm-iconbtn dmm-label__gear"
                    aria-expanded={open}
                    aria-label={uiText("Pengaturan baris")}
                    title={uiText("Pengaturan baris")}
                    onClick={() => setOpenRow(open ? null : row.id)}
                  >
                    <Settings2 size={14} />
                  </button>

                  {open && (
                    <div className="dmm-rowpanel">
                      <div className="dmm-rowpanel__line">
                        <select className="dmm-field" value={row.kind} aria-label={uiText("Jenis isi baris")} onChange={(event) => patchRow(row.id, { kind: event.target.value as BoardRowKind })}>
                          {KIND_ORDER.map((kind) => (
                            <option key={kind} value={kind}>{uiText(ROW_KIND_LABELS[kind])}</option>
                          ))}
                        </select>
                        <select className="dmm-field" value={row.icon} aria-label={uiText("Ikon baris")} onChange={(event) => patchRow(row.id, { icon: event.target.value as BoardIconKey })}>
                          {ICON_ORDER.map((icon) => (
                            <option key={icon} value={icon}>{uiText(BOARD_ICON_LABELS[icon])}</option>
                          ))}
                        </select>
                      </div>
                      <div className="dmm-rowpanel__line">
                        <button type="button" className="dmm-iconbtn" disabled={index === 0} aria-label={uiText("Naikkan baris")} title={uiText("Naikkan")} onClick={() => moveRow(index, index - 1)}>
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" className="dmm-iconbtn" disabled={index === draft.rows.length - 1} aria-label={uiText("Turunkan baris")} title={uiText("Turunkan")} onClick={() => moveRow(index, index + 1)}>
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" className="dmm-iconbtn is-danger" disabled={draft.rows.length <= 1} aria-label={uiText("Hapus baris")} title={uiText("Hapus baris")} onClick={() => removeRow(row.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {draft.stages.map((stage, stageIndex) => (
            <section key={stage.id} className="dmm-stage" aria-label={stage.title}>
              {draft.rows.map((row) => {
                const value = stage.cells[row.id] ?? "";
                const className = `dmm-cell ${CELL_CLASS[row.kind]}`.trim();
                return (
                  <div key={row.id} className={className}>
                    <textarea
                      className="dmm-cell__input"
                      rows={Math.max(2, value.split("\n").length)}
                      value={value}
                      aria-label={`${row.label}: ${stage.title || stageIndex + 1}`}
                      onChange={(event) => setCell(stage.id, row.id, event.target.value)}
                    />
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}