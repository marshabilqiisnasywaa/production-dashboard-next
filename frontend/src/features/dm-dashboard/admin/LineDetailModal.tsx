"use client";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { DmLineStatus, DmMember } from "../dmData";

export interface LineTableItem {
  id: string;
  workshopLabel: string;
  lineLabel: string;
  lineLabelZh: string;
  lineCode: string;
  lineName: string;
  model: string;
  status: DmLineStatus;
  slogan: string;
  values: string[];
  teamPhotoUrl: string | null;
  members?: readonly DmMember[];
  mpv?: DmMember | null;
}

interface LineDetailModalProps {
  open: boolean;
  line: LineTableItem | null;
  isActiveOnDashboard: boolean;
  onSave: (updatedLine: LineTableItem, setAsActive: boolean) => void;
  onClose: () => void;
}

export default function LineDetailModal({
  open,
  line,
  isActiveOnDashboard,
  onSave,
  onClose,
}: LineDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [formData, setFormData] = useState<LineTableItem>({
    id: "",
    workshopLabel: "",
    lineLabel: "",
    lineLabelZh: "",
    lineCode: "",
    lineName: "",
    model: "",
    status: "running",
    slogan: "",
    values: [],
    teamPhotoUrl: null,
  });

  const [setAsActive, setSetAsActive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"general" | "culture" | "media">("general");

  useEffect(() => {
    if (line) {
      setFormData({
        ...line,
        values: [...line.values],
      });
      setSetAsActive(isActiveOnDashboard);
    }
  }, [line, isActiveOnDashboard]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open || !line) return null;

  function handleChange<K extends keyof LineTableItem>(key: K, value: LineTableItem[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      handleChange("teamPhotoUrl", result);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(formData, setAsActive);
  }

  return (
    <dialog
      ref={dialogRef}
      className="dm-admin-modal dm-line-detail-modal"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dm-line-modal-shell">
        {/* Top Accent Gradient Line */}
        <div className="dm-modal-top-accent" />

        {/* Modal Header */}
        <div className="dm-line-modal-head">
          <div className="dm-line-modal-head-left">
            <div className="dm-line-modal-avatar-badge" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                <path d="M17 18h1" />
                <path d="M12 18h1" />
                <path d="M7 18h1" />
              </svg>
            </div>
            <div>
              <div className="dm-line-modal-meta-row">
                <span className="dm-line-badge-cat">KONFIGURASI LINI</span>
                <span className="dm-line-code-chip">{formData.lineCode || "LINI BARU"}</span>
                {isActiveOnDashboard && (
                  <span className="dm-badge-pill-live">
                    <span className="dm-live-dot" />
                    Sedang Ditampilkan
                  </span>
                )}
              </div>
              <h2 className="dm-line-modal-heading">
                {formData.lineName ? `${formData.lineName} — ${formData.workshopLabel || "Workshop"}` : "Detail & Pengaturan Lini"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            className="dm-modal-close-icon-btn"
            onClick={onClose}
            aria-label="Tutup modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Segmented Subnav Navigation */}
        <div className="dm-modal-tabs-track">
          <button
            type="button"
            className={`dm-modal-tab-btn ${activeTab === "general" ? "is-active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            <span>1. Info Lini &amp; Workshop</span>
          </button>

          <button
            type="button"
            className={`dm-modal-tab-btn ${activeTab === "culture" ? "is-active" : ""}`}
            onClick={() => setActiveTab("culture")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>2. Kultur &amp; Slogan</span>
          </button>

          <button
            type="button"
            className={`dm-modal-tab-btn ${activeTab === "media" ? "is-active" : ""}`}
            onClick={() => setActiveTab("media")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <span>3. Foto Tim Bersama</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="dm-line-modal-body">
          {/* TAB 1: IDENTITAS LINI & WORKSHOP */}
          {activeTab === "general" && (
            <div className="dm-modal-sec-container">
              <div className="dm-modal-info-card">
                <div className="dm-modal-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <span>
                  Informasi ini mendefinisikan kode mesin, penamaan rail samping kiri/kanan dashboard, dan status kerja lini.
                </span>
              </div>

              <div className="dm-modal-form-grid">
                <div className="dm-form-group">
                  <label htmlFor="modal-field-lineCode" className="dm-form-label">
                    Kode Lini Produksi <span className="dm-required-mark">*</span>
                  </label>
                  <input
                    id="modal-field-lineCode"
                    type="text"
                    required
                    className="dm-form-input font-mono"
                    value={formData.lineCode}
                    onChange={(e) => handleChange("lineCode", e.target.value)}
                    placeholder="Contoh: TAC20601"
                  />
                  <span className="dm-form-subtext">ID unik lini produksi di manufaktur OPPO</span>
                </div>

                <div className="dm-form-group">
                  <label htmlFor="modal-field-lineName" className="dm-form-label">
                    Nama Tim / Nama Lini <span className="dm-required-mark">*</span>
                  </label>
                  <input
                    id="modal-field-lineName"
                    type="text"
                    required
                    className="dm-form-input"
                    value={formData.lineName}
                    onChange={(e) => handleChange("lineName", e.target.value)}
                    placeholder="Contoh: EXCELLENCE"
                  />
                  <span className="dm-form-subtext">Nama panggil tim lini kerja</span>
                </div>

                <div className="dm-form-group">
                  <label htmlFor="modal-field-workshopLabel" className="dm-form-label">
                    Label Workshop (Side Rail Kanan) <span className="dm-required-mark">*</span>
                  </label>
                  <input
                    id="modal-field-workshopLabel"
                    type="text"
                    required
                    className="dm-form-input"
                    value={formData.workshopLabel}
                    onChange={(e) => handleChange("workshopLabel", e.target.value)}
                    placeholder="Contoh: DM TRIANGLE WORKSHOP 5"
                  />
                  <span className="dm-form-subtext">Banner vertikal di rail kanan dashboard</span>
                </div>

                <div className="dm-form-group">
                  <label htmlFor="modal-field-model" className="dm-form-label">
                    Model Ponsel <span className="dm-required-mark">*</span>
                  </label>
                  <input
                    id="modal-field-model"
                    type="text"
                    required
                    className="dm-form-input"
                    value={formData.model}
                    onChange={(e) => handleChange("model", e.target.value)}
                    placeholder="Contoh: LATTE-M"
                  />
                  <span className="dm-form-subtext">Kode tipe smartphone yang dirakit saat ini</span>
                </div>

                <div className="dm-form-group">
                  <label htmlFor="modal-field-lineLabel" className="dm-form-label">
                    Label Lini Inggris (Side Rail Kiri)
                  </label>
                  <input
                    id="modal-field-lineLabel"
                    type="text"
                    className="dm-form-input"
                    value={formData.lineLabel}
                    onChange={(e) => handleChange("lineLabel", e.target.value)}
                    placeholder="Contoh: DM TRIANGLE LINE"
                  />
                  <span className="dm-form-subtext">Teks bahasa Inggris vertikal</span>
                </div>

                <div className="dm-form-group">
                  <label htmlFor="modal-field-lineLabelZh" className="dm-form-label">
                    Label Mandarin (Side Rail Kiri)
                  </label>
                  <input
                    id="modal-field-lineLabelZh"
                    type="text"
                    className="dm-form-input"
                    value={formData.lineLabelZh}
                    onChange={(e) => handleChange("lineLabelZh", e.target.value)}
                    placeholder="Contoh: DM 三角线"
                  />
                  <span className="dm-form-subtext">Karakter Hanzi untuk tampilan bilingual</span>
                </div>

                <div className="dm-form-group is-fullwidth">
                  <label htmlFor="modal-field-status" className="dm-form-label">
                    Status Operasional Lini <span className="dm-required-mark">*</span>
                  </label>
                  <div className="dm-status-select-wrap">
                    <select
                      id="modal-field-status"
                      className="dm-form-select"
                      value={formData.status}
                      onChange={(e) => handleChange("status", e.target.value as DmLineStatus)}
                    >
                      <option value="running">🟢 RUNNING — Lini Beroperasi Penuh &amp; Normal</option>
                      <option value="idle">🟡 IDLE — Standby / Pergantian Model / Menunggu Material</option>
                      <option value="stopped">🔴 STOPPED — Lini Berhenti / Maintenance / Kerusakan</option>
                    </select>
                  </div>
                  <span className="dm-form-subtext">Mempengaruhi warna badge status di dashboard utama</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KULTUR & CORE VALUES */}
          {activeTab === "culture" && (
            <div className="dm-modal-sec-container">
              <div className="dm-modal-info-card">
                <div className="dm-modal-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <span>
                  Slogan tim membakar semangat kerja operator, sedangkan Core Values mencerminkan budaya Benfen OPPO.
                </span>
              </div>

              <div className="dm-form-group">
                <label htmlFor="modal-field-slogan" className="dm-form-label">
                  Slogan Tim Lini
                </label>
                <div className="dm-input-with-icon">
                  <span className="dm-input-lead-icon" aria-hidden="true">
                    💬
                  </span>
                  <input
                    id="modal-field-slogan"
                    type="text"
                    className="dm-form-input with-lead"
                    value={formData.slogan}
                    onChange={(e) => handleChange("slogan", e.target.value)}
                    placeholder="Contoh: SATU TIM SATU TUJUAN"
                  />
                </div>
                <span className="dm-form-subtext">Ditampilkan pada header kartu tim di dashboard</span>
              </div>

              <div className="dm-form-group" style={{ marginTop: "0.85rem" }}>
                <label htmlFor="modal-field-values" className="dm-form-label">
                  Nilai-Nilai Inti (Core Values, pisahkan dengan koma)
                </label>
                <input
                  id="modal-field-values"
                  type="text"
                  className="dm-form-input"
                  value={formData.values.join(", ")}
                  onChange={(e) =>
                    handleChange(
                      "values",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="Benfen, Orientasi Pengguna, Mengejar Keunggulan, Keterbukaan"
                />
                <span className="dm-form-subtext">
                  Pisahkan kata dengan tanda koma ( , ) untuk membuat pill tag otomatis
                </span>

                {formData.values.length > 0 && (
                  <div className="dm-tags-cloud-box">
                    <span className="dm-tags-cloud-label">Preview Core Values:</span>
                    <div className="dm-tags-cloud-items">
                      {formData.values.map((val, idx) => (
                        <span key={idx} className="dm-cloud-tag-pill">
                          <span className="dm-tag-dot" />
                          {val}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FOTO TIM */}
          {activeTab === "media" && (
            <div className="dm-modal-sec-container">
              <div className="dm-modal-info-card">
                <div className="dm-modal-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
                <span>
                  Unggah berkas foto beresolusi tinggi atau masukkan URL gambar tim bersama. Direkomendasikan rasio memanjang / landscape.
                </span>
              </div>

              <div className="dm-form-group">
                <label htmlFor="modal-field-teamPhoto" className="dm-form-label">
                  URL / Berkas Foto Tim
                </label>
                <div className="dm-upload-input-group">
                  <input
                    id="modal-field-teamPhoto"
                    type="text"
                    className="dm-form-input"
                    value={formData.teamPhotoUrl ?? ""}
                    onChange={(e) => handleChange("teamPhotoUrl", e.target.value || null)}
                    placeholder="URL gambar (misal /assets/dm/team-photo.png)"
                  />
                  <label className="dm-file-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Pilih File
                    <input
                      type="file"
                      accept="image/*"
                      className="dm-hidden-file-input"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>

              {/* Photo Frame Container */}
              <div className="dm-photo-preview-card">
                {formData.teamPhotoUrl ? (
                  <div className="dm-photo-loaded-wrap">
                    <div className="dm-photo-overlay-tag">Preview Foto Tim Lini</div>
                    <img
                      src={formData.teamPhotoUrl}
                      alt="Preview foto tim"
                      className="dm-photo-preview-image"
                    />
                    <div className="dm-photo-action-bar">
                      <span className="dm-photo-status-text">✓ Gambar berhasil dimuat</span>
                      <button
                        type="button"
                        className="dm-photo-btn-delete"
                        onClick={() => handleChange("teamPhotoUrl", null)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Hapus Foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="dm-photo-placeholder-box">
                    <div className="dm-photo-placeholder-icon">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                    <div className="dm-placeholder-title">Belum ada foto tim yang dipilih</div>
                    <div className="dm-placeholder-desc">
                      Gunakan tombol "Pilih File" di atas atau tempel tautan URL gambar.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE DASHBOARD TOGGLE CARD */}
          <div className="dm-active-toggle-card">
            <label className="dm-toggle-switch-label">
              <input
                type="checkbox"
                className="dm-toggle-real-input"
                checked={setAsActive}
                onChange={(e) => setSetAsActive(e.target.checked)}
              />
              <span className="dm-toggle-switch-slider" />
              <div className="dm-toggle-texts">
                <div className="dm-toggle-title">
                  Jadikan Sebagai Lini Aktif di DM Dashboard
                  {setAsActive && <span className="dm-toggle-status-badge">Aktif</span>}
                </div>
                <div className="dm-toggle-desc">
                  Data lini ini akan langsung menjadi display utama di layar dashboard lini produksi.
                </div>
              </div>
            </label>
          </div>

          {/* Modal Footer Bar */}
          <div className="dm-modal-footer-bar">
            <div className="dm-footer-info-slot">
              <span className="dm-footer-id-label">Line ID:</span>
              <code className="dm-footer-id-code">{formData.id}</code>
            </div>

            <div className="dm-footer-btn-slot">
              <button
                type="button"
                className="dm-btn-modal-cancel"
                onClick={onClose}
              >
                Batal
              </button>
              <button
                type="submit"
                className="dm-btn-modal-submit"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Simpan Perubahan
              </button>
            </div>
          </div>
        </form>
      </div>
    </dialog>
  );
}
