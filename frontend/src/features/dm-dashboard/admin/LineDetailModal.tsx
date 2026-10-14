"use client";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { DmLine, DmLineInput, DmWorkshop } from "../api";
import type { DmLineStatus } from "../dmData";
import TeamManager from "./TeamManager";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

type TabKey = "general" | "culture" | "media" | "team";

interface LineDetailModalProps {
  open: boolean;
  line: DmLine | null;
  initialTab: TabKey;
  workshops: DmWorkshop[];
  defaultWorkshopId: number | null;
  call: <T>(fn: () => Promise<T>) => Promise<T>;
  onTeamChanged: () => Promise<void>;
  onSave: (data: DmLineInput) => Promise<void>;
  onDelete: (line: DmLine) => Promise<void>;
  onClose: () => void;
}

type FormState = {
  workshopId: number | null;
  code: string;
  name: string;
  model: string;
  status: DmLineStatus;
  lineLabel: string;
  lineLabelZh: string;
  slug: string;
  slogan: string;
  values: string;
  teamPhotoUrl: string;
};

const statusOptions: { value: DmLineStatus; label: string }[] = [
  { value: "running", label: "RUNNING: lini beroperasi normal" },
  { value: "idle", label: "IDLE: standby, ganti model, atau menunggu material" },
  { value: "stopped", label: "STOPPED: lini berhenti, maintenance, atau rusak" },
];

function blank(defaultWorkshopId: number | null): FormState {
  return {
    workshopId: defaultWorkshopId,
    code: "",
    name: "",
    model: "",
    status: "running",
    lineLabel: "DM TRIANGLE LINE",
    lineLabelZh: "",
    slug: "",
    slogan: "",
    values: "",
    teamPhotoUrl: "",
  };
}

function fromLine(line: DmLine): FormState {
  return {
    workshopId: line.workshopId,
    code: line.code,
    name: line.name,
    model: line.model ?? "",
    status: line.status,
    lineLabel: line.lineLabel ?? "",
    lineLabelZh: line.lineLabelZh ?? "",
    slug: line.slug,
    slogan: line.slogan ?? "",
    values: line.values.join(", "),
    teamPhotoUrl: line.teamPhotoUrl ?? "",
  };
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export type { TabKey };

export default function LineDetailModal({
  open,
  line,
  initialTab,
  workshops,
  defaultWorkshopId,
  call,
  onTeamChanged,
  onSave,
  onDelete,
  onClose,
}: LineDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<FormState>(blank(defaultWorkshopId));
  const [tab, setTab] = useState<TabKey>("general");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(line ? fromLine(line) : blank(defaultWorkshopId ?? workshops[0]?.id ?? null));
    setTab(line ? initialTab : "general");
    setError(null);
    setBusy(false);
  }, [open, line?.id, initialTab]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  function change<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Foto tim lebih dari 2 MB. Kecilkan ukurannya dulu.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      change("teamPhotoUrl", String(reader.result));
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.workshopId === null) {
      setTab("general");
      setError("Pilih workshop dulu. Kalau daftarnya kosong, tambahkan workshop di halaman sebelumnya.");
      return;
    }
    if (!form.code.trim() || !form.name.trim()) {
      setTab("general");
      setError("Kode lini dan nama tim wajib diisi.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave({
        workshopId: form.workshopId,
        code: form.code.trim(),
        name: form.name.trim(),
        model: nullable(form.model),
        status: form.status,
        slogan: nullable(form.slogan),
        lineLabel: nullable(form.lineLabel),
        lineLabelZh: nullable(form.lineLabelZh),
        values: form.values.split(",").map((value) => value.trim()).filter(Boolean),
        teamPhotoUrl: nullable(form.teamPhotoUrl),
        slug: nullable(form.slug),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!line) return;
    if (!window.confirm(`Hapus lini ${line.code} beserta dashboard-nya? Link dashboard ini akan berhenti bekerja.`)) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete(line);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
      setBusy(false);
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "general", label: "1. Info Lini & Workshop" },
    { key: "culture", label: "2. Kultur & Slogan" },
    { key: "media", label: "3. Foto Tim Bersama" },
    ...(line ? [{ key: "team" as const, label: "4. Anggota Tim" }] : []),
  ];
  const values = form.values.split(",").map((value) => value.trim()).filter(Boolean);

  return (
    <dialog
      ref={dialogRef}
      className="dm-admin-modal dm-line-detail-modal"
      aria-labelledby="line-modal-heading"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dm-line-modal-shell">
        <div className="dm-line-modal-head">
          <div className="dm-line-modal-head-left">
            <div>
              <div className="dm-line-modal-meta-row">
                <span className="dm-line-badge-cat">{line ? "UBAH LINI" : "LINI BARU"}</span>
                <span className="dm-line-code-chip">{form.code || "Kode belum diisi"}</span>
              </div>
              <h2 id="line-modal-heading" className="dm-line-modal-heading">
                {form.name ? `${form.name}, ${workshops.find((w) => w.id === form.workshopId)?.name ?? "tanpa workshop"}` : "Detail dan pengaturan lini"}
              </h2>
            </div>
          </div>
          <button type="button" className="dm-modal-close-icon-btn" onClick={onClose} aria-label="Tutup">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="dm-modal-tabs-track" role="tablist" aria-label="Bagian formulir lini">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={`dm-modal-tab-btn ${tab === item.key ? "is-active" : ""}`}
              onClick={() => setTab(item.key)}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {tab === "team" && line ? (
          <div className="dm-line-modal-body">
            <TeamManager line={line} call={call} onChanged={onTeamChanged} />
            <div className="dm-modal-footer-bar">
              <div className="dm-footer-info-slot" />
              <div className="dm-footer-btn-slot">
                <button type="button" className="dm-btn-modal-submit" onClick={onClose}>Selesai</button>
              </div>
            </div>
          </div>
        ) : (
        <form onSubmit={submit} className="dm-line-modal-body" noValidate>
          {tab === "general" && (
            <div className="dm-modal-sec-container">
              <div className="dm-modal-form-grid">
                <div className="dm-form-group">
                  <label htmlFor="line-workshop" className="dm-form-label">
                    Workshop <span className="dm-required-mark">*</span>
                  </label>
                  <select
                    id="line-workshop"
                    className="dm-form-select"
                    value={form.workshopId ?? ""}
                    onChange={(event) => change("workshopId", event.target.value ? Number(event.target.value) : null)}
                  >
                    <option value="">Pilih workshop</option>
                    {workshops.map((workshop) => (
                      <option key={workshop.id} value={workshop.id}>{workshop.name}</option>
                    ))}
                  </select>
                  <span className="dm-form-subtext">Tampil di rail kanan dashboard sebagai DM TRIANGLE + nama workshop</span>
                </div>

                <div className="dm-form-group">
                  <label htmlFor="line-code" className="dm-form-label">
                    Kode Lini <span className="dm-required-mark">*</span>
                  </label>
                  <input
                    id="line-code"
                    type="text"
                    className="dm-form-input font-mono"
                    value={form.code}
                    onChange={(event) => change("code", event.target.value)}
                    placeholder="Contoh: TAC20601"
                  />
                  <span className="dm-form-subtext">Harus unik di seluruh lini</span>
                </div>

                <div className="dm-form-group">
                  <label htmlFor="line-name" className="dm-form-label">
                    Nama Tim / Nama Lini <span className="dm-required-mark">*</span>
                  </label>
                  <input
                    id="line-name"
                    type="text"
                    className="dm-form-input"
                    value={form.name}
                    onChange={(event) => change("name", event.target.value)}
                    placeholder="Contoh: EXCELLENCE"
                  />
                </div>

                <div className="dm-form-group">
                  <label htmlFor="line-model" className="dm-form-label">Model Ponsel</label>
                  <input
                    id="line-model"
                    type="text"
                    className="dm-form-input"
                    value={form.model}
                    onChange={(event) => change("model", event.target.value)}
                    placeholder="Contoh: LATTE-M"
                  />
                </div>

                <div className="dm-form-group">
                  <label htmlFor="line-label" className="dm-form-label">Label Lini Inggris (rail kiri)</label>
                  <input
                    id="line-label"
                    type="text"
                    className="dm-form-input"
                    value={form.lineLabel}
                    onChange={(event) => change("lineLabel", event.target.value)}
                    placeholder="Contoh: DM TRIANGLE LINE"
                  />
                </div>

                <div className="dm-form-group">
                  <label htmlFor="line-label-zh" className="dm-form-label">Label Mandarin (rail kiri)</label>
                  <input
                    id="line-label-zh"
                    type="text"
                    className="dm-form-input"
                    value={form.lineLabelZh}
                    onChange={(event) => change("lineLabelZh", event.target.value)}
                    placeholder="Contoh: DM 三角线"
                  />
                </div>

                <div className="dm-form-group">
                  <label htmlFor="line-status" className="dm-form-label">Status Operasional</label>
                  <select
                    id="line-status"
                    className="dm-form-select"
                    value={form.status}
                    onChange={(event) => change("status", event.target.value as DmLineStatus)}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="dm-form-group">
                  <label htmlFor="line-slug" className="dm-form-label">Alamat Link Dashboard</label>
                  <input
                    id="line-slug"
                    type="text"
                    className="dm-form-input font-mono"
                    value={form.slug}
                    onChange={(event) => change("slug", event.target.value)}
                    placeholder="Kosongkan agar dibuat otomatis"
                  />
                  <span className="dm-form-subtext">
                    {line
                      ? "Mengubah alamat ini membuat link lama berhenti bekerja di layar yang sudah terpasang."
                      : "Contoh hasil: workshop-5-tac20601"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === "culture" && (
            <div className="dm-modal-sec-container">
              <div className="dm-form-group">
                <label htmlFor="line-slogan" className="dm-form-label">Slogan Tim</label>
                <input
                  id="line-slogan"
                  type="text"
                  className="dm-form-input"
                  value={form.slogan}
                  onChange={(event) => change("slogan", event.target.value)}
                  placeholder="Contoh: SATU TIM SATU TUJUAN"
                />
              </div>

              <div className="dm-form-group" style={{ marginTop: "0.85rem" }}>
                <label htmlFor="line-values" className="dm-form-label">Nilai Inti (pisahkan dengan koma)</label>
                <input
                  id="line-values"
                  type="text"
                  className="dm-form-input"
                  value={form.values}
                  onChange={(event) => change("values", event.target.value)}
                  placeholder="Benfen, Orientasi Pengguna, Mengejar Keunggulan, Keterbukaan"
                />
                {values.length > 0 && (
                  <div className="dm-tags-cloud-box">
                    <span className="dm-tags-cloud-label">Pratinjau nilai inti:</span>
                    <div className="dm-tags-cloud-items">
                      {values.map((value) => (
                        <span key={value} className="dm-cloud-tag-pill">{value}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "media" && (
            <div className="dm-modal-sec-container">
              <div className="dm-form-group">
                <label htmlFor="line-photo" className="dm-form-label">URL atau Berkas Foto Tim</label>
                <div className="dm-upload-input-group">
                  <input
                    id="line-photo"
                    type="text"
                    className="dm-form-input"
                    value={form.teamPhotoUrl.startsWith("data:") ? "" : form.teamPhotoUrl}
                    onChange={(event) => change("teamPhotoUrl", event.target.value)}
                    placeholder={form.teamPhotoUrl.startsWith("data:") ? "Foto dari berkas terpilih" : "URL gambar, contoh /assets/dm/team-photo.png"}
                  />
                  <label className="dm-file-btn">
                    Pilih File
                    <input type="file" accept="image/*" className="dm-hidden-file-input" onChange={pickPhoto} />
                  </label>
                </div>
                <span className="dm-form-subtext">Rasio landscape paling pas. Maksimal 2 MB.</span>
              </div>

              <div className="dm-photo-preview-card">
                {form.teamPhotoUrl ? (
                  <div className="dm-photo-loaded-wrap">
                    <img src={form.teamPhotoUrl} alt="Pratinjau foto tim" className="dm-photo-preview-image" />
                    <div className="dm-photo-action-bar">
                      <button type="button" className="dm-photo-btn-delete" onClick={() => change("teamPhotoUrl", "")}>
                        Hapus Foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="dm-photo-placeholder-box">
                    <div className="dm-placeholder-title">Belum ada foto tim</div>
                    <div className="dm-placeholder-desc">
                      Pilih berkas atau tempel URL gambar. Tanpa foto, dashboard menampilkan keterangan bahwa foto belum diunggah.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {error ? <p className="dm-admin-inline-error" role="alert">{error}</p> : null}

          <div className="dm-modal-footer-bar">
            <div className="dm-footer-info-slot">
              {line ? (
                <button type="button" className="dm-admin-btn is-danger-outline" disabled={busy} onClick={remove}>
                  Hapus Lini
                </button>
              ) : null}
            </div>
            <div className="dm-footer-btn-slot">
              <button type="button" className="dm-btn-modal-cancel" onClick={onClose}>Batal</button>
              <button type="submit" className="dm-btn-modal-submit" disabled={busy}>
                {busy ? "Menyimpan..." : line ? "Simpan Perubahan" : "Buat Lini"}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </dialog>
  );
}
