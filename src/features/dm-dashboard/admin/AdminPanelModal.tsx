"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { defaultDmBoard, dmWorkshopPresets } from "../dmData";
import type { DmBoard, DmLineStatus, DmMember } from "../dmData";
import "./AdminPanel.css";

type TabKey = "workshop" | "team" | "mpv";

export default function AdminPanelModal({
  open,
  board,
  onSave,
  onReset,
  onClose,
}: {
  open: boolean;
  board: DmBoard;
  onSave: (updated: DmBoard) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [activeTab, setActiveTab] = useState<TabKey>("workshop");
  const [formData, setFormData] = useState<DmBoard>(board);
  const [selectedPreset, setSelectedPreset] = useState<string>("ws-5");
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    setFormData(board);
  }, [board, open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handlePresetChange(presetId: string) {
    setSelectedPreset(presetId);
    const found = dmWorkshopPresets.find((p) => p.id === presetId);
    if (found) {
      setFormData(found.board);
    }
  }

  function handleFieldChange<K extends keyof DmBoard>(field: K, value: DmBoard[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleMemberChange(index: number, field: keyof DmMember, value: string) {
    setFormData((prev) => {
      const nextMembers = [...prev.members];
      nextMembers[index] = {
        ...nextMembers[index],
        [field]: value || null,
      };
      return { ...prev, members: nextMembers };
    });
  }

  function handleMpvChange(field: keyof DmMember, value: string) {
    setFormData((prev) => {
      const nextMpv = {
        ...(prev.mpv ?? { name: null, employeeId: null, position: null }),
        [field]: value || null,
      };
      return { ...prev, mpv: nextMpv };
    });
  }

  function handleFileUpload(
    e: ChangeEvent<HTMLInputElement>,
    target: "teamPhoto" | "mpv" | number
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (target === "teamPhoto") {
        handleFieldChange("teamPhotoUrl", result);
      } else if (target === "mpv") {
        handleMpvChange("photoUrl", result);
      } else if (typeof target === "number") {
        handleMemberChange(target, "photoUrl", result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    onSave(formData);
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 600);
  }

  function handleResetAll() {
    if (window.confirm("Kembalikan seluruh data ke default Workshop 5?")) {
      setFormData(defaultDmBoard);
      onReset();
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="dm-admin-modal"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open ? (
        <div className="dm-admin-container">
          {/* Header */}
          <div className="dm-admin-head">
            <div className="dm-admin-title-group">
              <span className="dm-admin-badge">CONTROL PANEL</span>
              <h2 className="dm-admin-title" id={titleId}>
                Pengaturan DM Dashboard
              </h2>
            </div>
            <button
              type="button"
              className="dm-admin-close-btn"
              onClick={onClose}
              aria-label="Tutup panel"
            >
              &times;
            </button>
          </div>

          {/* Quick Preset Selector */}
          <div className="dm-admin-preset-bar">
            <label htmlFor="preset-select" className="dm-admin-preset-label">
              Pilih Template Workshop:
            </label>
            <select
              id="preset-select"
              className="dm-admin-select"
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
            >
              {dmWorkshopPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tab Navigation */}
          <nav className="dm-admin-tabs" aria-label="Tab Pengaturan">
            <button
              type="button"
              className={`dm-admin-tab ${activeTab === "workshop" ? "is-active" : ""}`}
              onClick={() => setActiveTab("workshop")}
            >
              Lini &amp; Workshop
            </button>
            <button
              type="button"
              className={`dm-admin-tab ${activeTab === "team" ? "is-active" : ""}`}
              onClick={() => setActiveTab("team")}
            >
              Triangle Team (4 Anggota)
            </button>
            <button
              type="button"
              className={`dm-admin-tab ${activeTab === "mpv" ? "is-active" : ""}`}
              onClick={() => setActiveTab("mpv")}
            >
              MPV of The Month
            </button>
          </nav>

          {/* Body Content */}
          <div className="dm-admin-body">
            {/* Tab 1: Workshop & Line */}
            {activeTab === "workshop" ? (
              <div className="dm-admin-section">
                <h3 className="dm-admin-sec-title">Informasi Lini Produksi &amp; Workshop</h3>
                <div className="dm-admin-grid">
                  <div className="dm-admin-field">
                    <label htmlFor="field-workshopLabel">Label Workshop (Side Rail Kanan)</label>
                    <input
                      id="field-workshopLabel"
                      type="text"
                      className="dm-admin-input"
                      value={formData.workshopLabel}
                      onChange={(e) => handleFieldChange("workshopLabel", e.target.value)}
                      placeholder="Contoh: DM TRIANGLE WORKSHOP 5"
                    />
                  </div>

                  <div className="dm-admin-field">
                    <label htmlFor="field-lineCode">Kode Lini (Line Code)</label>
                    <input
                      id="field-lineCode"
                      type="text"
                      className="dm-admin-input"
                      value={formData.lineCode}
                      onChange={(e) => handleFieldChange("lineCode", e.target.value)}
                      placeholder="Contoh: TAC20601"
                    />
                  </div>

                  <div className="dm-admin-field">
                    <label htmlFor="field-lineName">Nama Lini (Line Name)</label>
                    <input
                      id="field-lineName"
                      type="text"
                      className="dm-admin-input"
                      value={formData.lineName}
                      onChange={(e) => handleFieldChange("lineName", e.target.value)}
                      placeholder="Contoh: EXCELLENCE"
                    />
                  </div>

                  <div className="dm-admin-field">
                    <label htmlFor="field-model">Model Produk</label>
                    <input
                      id="field-model"
                      type="text"
                      className="dm-admin-input"
                      value={formData.model}
                      onChange={(e) => handleFieldChange("model", e.target.value)}
                      placeholder="Contoh: LATTE-M"
                    />
                  </div>

                  <div className="dm-admin-field">
                    <label htmlFor="field-status">Status Lini Saat Ini</label>
                    <select
                      id="field-status"
                      className="dm-admin-select"
                      value={formData.status}
                      onChange={(e) => handleFieldChange("status", e.target.value as DmLineStatus)}
                    >
                      <option value="running">RUNNING (Beroperasi)</option>
                      <option value="idle">STANDBY (Siaga)</option>
                      <option value="stopped">STOPPED (Berhenti)</option>
                    </select>
                  </div>

                  <div className="dm-admin-field">
                    <label htmlFor="field-slogan">Slogan Tim Lini</label>
                    <input
                      id="field-slogan"
                      type="text"
                      className="dm-admin-input"
                      value={formData.slogan}
                      onChange={(e) => handleFieldChange("slogan", e.target.value)}
                      placeholder="Contoh: SATU TIM SATU TUJUAN"
                    />
                  </div>

                  <div className="dm-admin-field">
                    <label htmlFor="field-lineLabel">Label Lini Inggris (Side Rail Kiri)</label>
                    <input
                      id="field-lineLabel"
                      type="text"
                      className="dm-admin-input"
                      value={formData.lineLabel}
                      onChange={(e) => handleFieldChange("lineLabel", e.target.value)}
                      placeholder="Contoh: DM TRIANGLE LINE"
                    />
                  </div>

                  <div className="dm-admin-field">
                    <label htmlFor="field-lineLabelZh">Label Lini Mandarin (Side Rail Kiri)</label>
                    <input
                      id="field-lineLabelZh"
                      type="text"
                      className="dm-admin-input"
                      value={formData.lineLabelZh}
                      onChange={(e) => handleFieldChange("lineLabelZh", e.target.value)}
                      placeholder="Contoh: DM 三角线"
                    />
                  </div>
                </div>

                <div className="dm-admin-field-full">
                  <label htmlFor="field-teamPhotoUrl">Foto Tim Produksi Panoramic (URL atau Unggah)</label>
                  <div className="dm-admin-upload-row">
                    <input
                      id="field-teamPhotoUrl"
                      type="text"
                      className="dm-admin-input"
                      value={formData.teamPhotoUrl ?? ""}
                      onChange={(e) => handleFieldChange("teamPhotoUrl", e.target.value)}
                      placeholder="URL foto tim (misal /assets/dm/team-photo.png)"
                    />
                    <label className="dm-admin-file-label">
                      Pilih Berkas Foto
                      <input
                        type="file"
                        accept="image/*"
                        className="dm-admin-file-input"
                        onChange={(e) => handleFileUpload(e, "teamPhoto")}
                      />
                    </label>
                  </div>
                  {formData.teamPhotoUrl ? (
                    <div className="dm-admin-preview-box">
                      <img
                        src={formData.teamPhotoUrl}
                        alt="Preview foto tim"
                        className="dm-admin-preview-img"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="dm-admin-field-full">
                  <label htmlFor="field-values">Nilai Perusahaan (Pisahkan dengan koma)</label>
                  <input
                    id="field-values"
                    type="text"
                    className="dm-admin-input"
                    value={formData.values.join(", ")}
                    onChange={(e) =>
                      handleFieldChange(
                        "values",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    placeholder="Benfen, Orientasi Pengguna, Mengejar Keunggulan, Keterbukaan"
                  />
                </div>
              </div>
            ) : null}

            {/* Tab 2: Triangle Team (4 Members) */}
            {activeTab === "team" ? (
              <div className="dm-admin-section">
                <h3 className="dm-admin-sec-title">DM Triangle Team (4 Anggota Lini)</h3>
                <div className="dm-admin-team-list">
                  {formData.members.map((member, idx) => (
                    <div key={idx} className="dm-admin-member-card">
                      <div className="dm-admin-member-head">
                        <span className="dm-admin-member-idx">Anggota #{idx + 1}</span>
                        <span className="dm-admin-member-badge">
                          {member.position ?? "Posisi belum diisi"}
                        </span>
                      </div>
                      <div className="dm-admin-member-grid">
                        <div className="dm-admin-field">
                          <label htmlFor={`member-${idx}-name`}>Nama Lengkap</label>
                          <input
                            id={`member-${idx}-name`}
                            type="text"
                            className="dm-admin-input"
                            value={member.name ?? ""}
                            onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                            placeholder="Contoh: ALIF MAULANA"
                          />
                        </div>

                        <div className="dm-admin-field">
                          <label htmlFor={`member-${idx}-employeeId`}>Work No / ID Karyawan</label>
                          <input
                            id={`member-${idx}-employeeId`}
                            type="text"
                            className="dm-admin-input"
                            value={member.employeeId ?? ""}
                            onChange={(e) => handleMemberChange(idx, "employeeId", e.target.value)}
                            placeholder="Contoh: I000126"
                          />
                        </div>

                        <div className="dm-admin-field">
                          <label htmlFor={`member-${idx}-dept`}>Departemen</label>
                          <input
                            id={`member-${idx}-dept`}
                            type="text"
                            className="dm-admin-input"
                            value={member.dept ?? ""}
                            onChange={(e) => handleMemberChange(idx, "dept", e.target.value)}
                            placeholder="Contoh: Produksi / Quality"
                          />
                        </div>

                        <div className="dm-admin-field">
                          <label htmlFor={`member-${idx}-pos`}>Posisi / Jabatan</label>
                          <input
                            id={`member-${idx}-pos`}
                            type="text"
                            className="dm-admin-input"
                            value={member.position ?? ""}
                            onChange={(e) => handleMemberChange(idx, "position", e.target.value)}
                            placeholder="Contoh: Leader / PE Technician"
                          />
                        </div>

                        <div className="dm-admin-field">
                          <label htmlFor={`member-${idx}-spv`}>Supervisor (Direct SPV)</label>
                          <input
                            id={`member-${idx}-spv`}
                            type="text"
                            className="dm-admin-input"
                            value={member.supervisor ?? ""}
                            onChange={(e) => handleMemberChange(idx, "supervisor", e.target.value)}
                            placeholder="Contoh: Mochamad Noor Arief"
                          />
                        </div>

                        <div className="dm-admin-field">
                          <label htmlFor={`member-${idx}-phone`}>Work Phone / Telepon</label>
                          <input
                            id={`member-${idx}-phone`}
                            type="text"
                            className="dm-admin-input"
                            value={member.workPhone ?? ""}
                            onChange={(e) => handleMemberChange(idx, "workPhone", e.target.value)}
                            placeholder="Contoh: 081905143940"
                          />
                        </div>
                      </div>

                      <div className="dm-admin-photo-row">
                        <div className="dm-admin-photo-input">
                          <label htmlFor={`member-${idx}-photo`}>URL Foto Profil / Unggah</label>
                          <div className="dm-admin-upload-row">
                            <input
                              id={`member-${idx}-photo`}
                              type="text"
                              className="dm-admin-input"
                              value={member.photoUrl ?? ""}
                              onChange={(e) => handleMemberChange(idx, "photoUrl", e.target.value)}
                              placeholder="/assets/dm/alif-maulana.png"
                            />
                            <label className="dm-admin-file-label">
                              Unggah Foto
                              <input
                                type="file"
                                accept="image/*"
                                className="dm-admin-file-input"
                                onChange={(e) => handleFileUpload(e, idx)}
                              />
                            </label>
                          </div>
                        </div>
                        {member.photoUrl ? (
                          <div className="dm-admin-avatar-preview">
                            <img
                              src={member.photoUrl}
                              alt={member.name ?? "Preview"}
                              className="dm-admin-avatar-img"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Tab 3: MPV of The Month */}
            {activeTab === "mpv" ? (
              <div className="dm-admin-section">
                <h3 className="dm-admin-sec-title">MPV of The Month (Karyawan Berprestasi)</h3>
                <div className="dm-admin-member-card">
                  <div className="dm-admin-member-grid">
                    <div className="dm-admin-field">
                      <label htmlFor="mpv-name">Nama Lengkap MPV</label>
                      <input
                        id="mpv-name"
                        type="text"
                        className="dm-admin-input"
                        value={formData.mpv?.name ?? ""}
                        onChange={(e) => handleMpvChange("name", e.target.value)}
                        placeholder="Contoh: RISVI ZULVIYANTI"
                      />
                    </div>

                    <div className="dm-admin-field">
                      <label htmlFor="mpv-employeeId">Work No / ID Karyawan</label>
                      <input
                        id="mpv-employeeId"
                        type="text"
                        className="dm-admin-input"
                        value={formData.mpv?.employeeId ?? ""}
                        onChange={(e) => handleMpvChange("employeeId", e.target.value)}
                        placeholder="Contoh: TYU34928"
                      />
                    </div>

                    <div className="dm-admin-field">
                      <label htmlFor="mpv-dept">Departemen</label>
                      <input
                        id="mpv-dept"
                        type="text"
                        className="dm-admin-input"
                        value={formData.mpv?.dept ?? ""}
                        onChange={(e) => handleMpvChange("dept", e.target.value)}
                        placeholder="Contoh: Produksi"
                      />
                    </div>

                    <div className="dm-admin-field">
                      <label htmlFor="mpv-pos">Posisi / Pekerjaan</label>
                      <input
                        id="mpv-pos"
                        type="text"
                        className="dm-admin-input"
                        value={formData.mpv?.position ?? ""}
                        onChange={(e) => handleMpvChange("position", e.target.value)}
                        placeholder="Contoh: Pengecekan Top Cover"
                      />
                    </div>
                  </div>

                  <div className="dm-admin-photo-row">
                    <div className="dm-admin-photo-input">
                      <label htmlFor="mpv-photo">URL Foto Profil MPV / Unggah</label>
                      <div className="dm-admin-upload-row">
                        <input
                          id="mpv-photo"
                          type="text"
                          className="dm-admin-input"
                          value={formData.mpv?.photoUrl ?? ""}
                          onChange={(e) => handleMpvChange("photoUrl", e.target.value)}
                          placeholder="/assets/dm/risvi-zulviyanti.png"
                        />
                        <label className="dm-admin-file-label">
                          Unggah Foto
                          <input
                            type="file"
                            accept="image/*"
                            className="dm-admin-file-input"
                            onChange={(e) => handleFileUpload(e, "mpv")}
                          />
                        </label>
                      </div>
                    </div>
                    {formData.mpv?.photoUrl ? (
                      <div className="dm-admin-avatar-preview">
                        <img
                          src={formData.mpv.photoUrl}
                          alt={formData.mpv?.name ?? "Preview MPV"}
                          className="dm-admin-avatar-img"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer Actions */}
          <div className="dm-admin-foot">
            <div className="dm-admin-foot-left">
              <button
                type="button"
                className="dm-admin-btn is-danger-outline"
                onClick={handleResetAll}
              >
                Reset ke Default
              </button>
            </div>
            <div className="dm-admin-foot-right">
              <button type="button" className="dm-admin-btn is-secondary" onClick={onClose}>
                Batal
              </button>
              <button type="button" className="dm-admin-btn is-primary" onClick={handleSave}>
                {saveToast ? "Tersimpan!" : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
