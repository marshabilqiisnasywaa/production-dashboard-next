"use client";
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { DM_STORAGE_KEY, defaultDmBoard, dmWorkshopPresets } from "../dmData";
import type { DmBoard, DmLineStatus, DmMember } from "../dmData";
import AttendanceRecap from "../meeting/AttendanceRecap";
import DmAdminSidebar from "./DmAdminSidebar";
import type { DmAdminTabKey } from "./DmAdminSidebar";
import "./AdminPanel.css";

type TabKey = DmAdminTabKey;

export default function DmAdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("workshop");
  const [formData, setFormData] = useState<DmBoard>(defaultDmBoard);
  const [selectedPreset, setSelectedPreset] = useState<string>("ws-5");
  const [saveToast, setSaveToast] = useState(false);
  const [alertBanner, setAlertBanner] = useState<{
    type: "success" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DM_STORAGE_KEY);
      if (saved) {
        setFormData(JSON.parse(saved));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  function handlePresetChange(presetId: string) {
    setSelectedPreset(presetId);
    const found = dmWorkshopPresets.find((p) => p.id === presetId);
    if (found) {
      setFormData(found.board);
      setAlertBanner({
        type: "info",
        message: `Template "${found.name}" berhasil diterapkan ke form. Klik "Simpan Perubahan" untuk mengaktifkan di dashboard.`,
      });
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
    try {
      localStorage.setItem(DM_STORAGE_KEY, JSON.stringify(formData));
    } catch {
      // Ignore localStorage errors
    }
    setSaveToast(true);
    setAlertBanner({
      type: "success",
      message: "Perubahan berhasil disimpan! Data DM Dashboard telah diperbarui secara langsung.",
    });
    setTimeout(() => {
      setSaveToast(false);
    }, 2500);
  }

  function handleResetAll() {
    if (window.confirm("Kembalikan seluruh data ke konfigurasi bawaan Workshop 5?")) {
      setFormData(defaultDmBoard);
      try {
        localStorage.removeItem(DM_STORAGE_KEY);
      } catch {
        // Ignore localStorage errors
      }
      setAlertBanner({
        type: "info",
        message: "Data DM Dashboard berhasil dikembalikan ke default Workshop 5.",
      });
    }
  }

  const tabLabels: Record<TabKey, { crumb: string; title: string }> = {
    workshop: { crumb: "Lini & Workshop", title: "Pengaturan Lini Produksi & Workshop" },
    team: { crumb: "Triangle Team", title: "Pengaturan Triangle Team (4 Anggota Lini)" },
    mpv: { crumb: "MPV of The Month", title: "Most Productive Value (MPV) Operator Teladan" },
    attendance: { crumb: "Rekap Presensi", title: "Rekapitulasi Presensi & Riwayat Meeting per Tanggal" },
    presets: { crumb: "Template Workshop", title: "Koleksi Template Workshop Manufaktur" },
  };

  return (
    <div className="dm-admin-layout">
      {/* Sidebar Nav (Komponen Terpisah) */}
      <DmAdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        lineCode={formData.lineCode}
        model={formData.model}
      />

      {/* Main Container */}
      <div className="dm-admin-main-wrap">
        {/* Topbar */}
        <header className="dm-admin-topbar-nav">
          <div className="dm-admin-topbar-left">
            <span className="dm-admin-topbar-crumb">
              DM Admin &bull; {tabLabels[activeTab].crumb}
            </span>
            <h2 className="dm-admin-topbar-title">{tabLabels[activeTab].title}</h2>
          </div>

          <div className="dm-admin-topbar-actions">
            {/* Quick Template Selector */}
            <div className="dm-admin-preset-wrap">
              <label htmlFor="topbar-preset">Template:</label>
              <select
                id="topbar-preset"
                className="dm-admin-preset-select"
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

            <button
              type="button"
              className="dm-admin-btn is-danger-outline"
              onClick={handleResetAll}
            >
              Reset Default
            </button>

            <button
              type="button"
              className="dm-admin-btn is-primary"
              onClick={handleSave}
            >
              {saveToast ? "Tersimpan!" : "Simpan Perubahan"}
            </button>
          </div>
        </header>

        {/* Content Pane */}
        <main className="dm-admin-content-pane">
          {alertBanner && (
            <div className={`dm-admin-alert-banner is-${alertBanner.type}`} role="status">
              <span>{alertBanner.message}</span>
              <button
                type="button"
                onClick={() => setAlertBanner(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "inherit", fontWeight: "bold" }}
                aria-label="Tutup notifikasi"
              >
                &times;
              </button>
            </div>
          )}

          <div className="dm-admin-panel-card">
            {/* Tab 1: Workshop & Line Info */}
            {activeTab === "workshop" && (
              <div className="dm-admin-section">
                <div className="dm-admin-sec-head">
                  <h3 className="dm-admin-sec-title">Informasi Dasar Lini &amp; Workshop</h3>
                  <span className="dm-admin-sec-sub">
                    Konfigurasi teks side rail, model smartphone, kode mesin, dan kultur tim
                  </span>
                </div>

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
                    <label htmlFor="field-lineLabel">Label Lini (Side Rail Kiri)</label>
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
                    <label htmlFor="field-lineLabelZh">Label Mandarin (Side Rail Kiri)</label>
                    <input
                      id="field-lineLabelZh"
                      type="text"
                      className="dm-admin-input"
                      value={formData.lineLabelZh}
                      onChange={(e) => handleFieldChange("lineLabelZh", e.target.value)}
                      placeholder="Contoh: DM 三角线"
                    />
                  </div>

                  <div className="dm-admin-field">
                    <label htmlFor="field-lineCode">Kode Lini Produksi</label>
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
                    <label htmlFor="field-lineName">Nama Tim / Nama Lini</label>
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
                    <label htmlFor="field-model">Model Ponsel</label>
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
                    <label htmlFor="field-status">Status Operasional Lini</label>
                    <select
                      id="field-status"
                      className="dm-admin-select"
                      value={formData.status}
                      onChange={(e) =>
                        handleFieldChange("status", e.target.value as DmLineStatus)
                      }
                    >
                      <option value="running">RUNNING (Operasi Berjalan Normal)</option>
                      <option value="idle">IDLE (Standby / Menunggu Material)</option>
                      <option value="stopped">STOPPED (Berhenti / Maintenance)</option>
                    </select>
                  </div>

                  <div className="dm-admin-field">
                    <label htmlFor="field-slogan">Slogan Tim</label>
                    <input
                      id="field-slogan"
                      type="text"
                      className="dm-admin-input"
                      value={formData.slogan}
                      onChange={(e) => handleFieldChange("slogan", e.target.value)}
                      placeholder="Contoh: SATU TIM SATU TUJUAN"
                    />
                  </div>

                  <div className="dm-admin-field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="field-values">
                      Nilai-Nilai Inti OPPO (Core Values, pisahkan dengan koma)
                    </label>
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
                      placeholder="Contoh: Benfen, Orientasi Pengguna, Mengejar Keunggulan, Keterbukaan"
                    />
                  </div>

                  <div className="dm-admin-field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="field-teamPhoto">Foto Tim Bersama (Panoramik)</label>
                    <div className="dm-admin-upload-wrap">
                      <input
                        id="field-teamPhoto"
                        type="text"
                        className="dm-admin-input"
                        value={formData.teamPhotoUrl ?? ""}
                        onChange={(e) => handleFieldChange("teamPhotoUrl", e.target.value || null)}
                        placeholder="URL gambar atau unggah file foto tim"
                      />
                      <label className="dm-admin-file-label">
                        Unggah Foto
                        <input
                          type="file"
                          accept="image/*"
                          className="dm-admin-file-input"
                          onChange={(e) => handleFileUpload(e, "teamPhoto")}
                        />
                      </label>
                    </div>
                    {formData.teamPhotoUrl ? (
                      <div className="dm-admin-photo-preview">
                        <img
                          src={formData.teamPhotoUrl}
                          alt="Preview foto tim"
                          className="dm-admin-preview-img"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Triangle Team */}
            {activeTab === "team" && (
              <div className="dm-admin-section">
                <div className="dm-admin-sec-head">
                  <h3 className="dm-admin-sec-title">
                    Anggota Triangle Team (4 Pilar Lini Produksi)
                  </h3>
                  <span className="dm-admin-sec-sub">
                    Pimpinan Lini Produksi, Teknisi PE, Teknisi QE, dan Teknisi IE
                  </span>
                </div>

                <div className="dm-admin-member-grid">
                  {formData.members.map((member, idx) => {
                    const roleTag =
                      idx === 0
                        ? "LEADER PRODUKSI"
                        : idx === 1
                        ? "PE TECHNICIAN"
                        : idx === 2
                        ? "QE TECHNICIAN"
                        : "IE TECHNICIAN";
                    return (
                      <div key={idx} className="dm-admin-member-card">
                        <div className="dm-admin-member-head">
                          <span className="dm-admin-member-role">{roleTag}</span>
                          <span className="dm-admin-member-idx">Slot #{idx + 1}</span>
                        </div>

                        <div className="dm-admin-member-body">
                          <div className="dm-admin-field">
                            <label htmlFor={`member-name-${idx}`}>Nama</label>
                            <input
                              id={`member-name-${idx}`}
                              type="text"
                              className="dm-admin-input"
                              value={member.name ?? ""}
                              onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                              placeholder="Nama lengkap anggota"
                            />
                          </div>

                          <div className="dm-admin-field">
                            <label htmlFor={`member-id-${idx}`}>NIK</label>
                            <input
                              id={`member-id-${idx}`}
                              type="text"
                              className="dm-admin-input"
                              value={member.employeeId ?? ""}
                              onChange={(e) =>
                                handleMemberChange(idx, "employeeId", e.target.value)
                              }
                              placeholder="Contoh: I000126"
                            />
                          </div>

                          <div className="dm-admin-field">
                            <label htmlFor={`member-dept-${idx}`}>Departemen</label>
                            <input
                              id={`member-dept-${idx}`}
                              type="text"
                              className="dm-admin-input"
                              value={member.dept ?? ""}
                              onChange={(e) => handleMemberChange(idx, "dept", e.target.value)}
                              placeholder="Contoh: Produksi / Product Engineering"
                            />
                          </div>

                          <div className="dm-admin-field">
                            <label htmlFor={`member-pos-${idx}`}>Jabatan</label>
                            <input
                              id={`member-pos-${idx}`}
                              type="text"
                              className="dm-admin-input"
                              value={member.position ?? ""}
                              onChange={(e) =>
                                handleMemberChange(idx, "position", e.target.value)
                              }
                              placeholder="Contoh: Leader / PE Technician"
                            />
                          </div>

                          <div className="dm-admin-field">
                            <label htmlFor={`member-sup-${idx}`}>Atasan Langsung</label>
                            <input
                              id={`member-sup-${idx}`}
                              type="text"
                              className="dm-admin-input"
                              value={member.supervisor ?? ""}
                              onChange={(e) =>
                                handleMemberChange(idx, "supervisor", e.target.value)
                              }
                              placeholder="Nama atasan"
                            />
                          </div>

                          <div className="dm-admin-field">
                            <label htmlFor={`member-phone-${idx}`}>No. Telepon / Extension</label>
                            <input
                              id={`member-phone-${idx}`}
                              type="text"
                              className="dm-admin-input"
                              value={member.workPhone ?? ""}
                              onChange={(e) =>
                                handleMemberChange(idx, "workPhone", e.target.value)
                              }
                              placeholder="Contoh: 0819..."
                            />
                          </div>

                          <div className="dm-admin-field">
                            <label htmlFor={`member-photo-${idx}`}>Foto Profil</label>
                            <div className="dm-admin-upload-wrap">
                              <input
                                id={`member-photo-${idx}`}
                                type="text"
                                className="dm-admin-input"
                                value={member.photoUrl ?? ""}
                                onChange={(e) =>
                                  handleMemberChange(idx, "photoUrl", e.target.value)
                                }
                                placeholder="URL foto anggota"
                              />
                              <label className="dm-admin-file-label">
                                Unggah
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
                                alt={member.name ?? "Preview foto"}
                                className="dm-admin-avatar-img"
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: MPV of The Month */}
            {activeTab === "mpv" && (
              <div className="dm-admin-section">
                <div className="dm-admin-sec-head">
                  <h3 className="dm-admin-sec-title">
                    Most Productive Value (MPV) of The Month
                  </h3>
                  <span className="dm-admin-sec-sub">
                    Penghargaan operator teladan yang ditampilkan pada kartu utama dashboard
                  </span>
                </div>

                <div className="dm-admin-grid">
                  <div className="dm-admin-field">
                    <label htmlFor="mpv-name">Nama Lengkap MPV</label>
                    <input
                      id="mpv-name"
                      type="text"
                      className="dm-admin-input"
                      value={formData.mpv?.name ?? ""}
                      onChange={(e) => handleMpvChange("name", e.target.value)}
                      placeholder="Nama operator teladan"
                    />
                  </div>

                  <div className="dm-admin-field">
                    <label htmlFor="mpv-id">NIK / Employee ID</label>
                    <input
                      id="mpv-id"
                      type="text"
                      className="dm-admin-input"
                      value={formData.mpv?.employeeId ?? ""}
                      onChange={(e) => handleMpvChange("employeeId", e.target.value)}
                      placeholder="Contoh: 10006277"
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
                      placeholder="Contoh: Produksi Line A"
                    />
                  </div>

                  <div className="dm-admin-field">
                    <label htmlFor="mpv-pos">Jabatan / Posisi</label>
                    <input
                      id="mpv-pos"
                      type="text"
                      className="dm-admin-input"
                      value={formData.mpv?.position ?? ""}
                      onChange={(e) => handleMpvChange("position", e.target.value)}
                      placeholder="Contoh: Operator Assembling"
                    />
                  </div>

                  <div className="dm-admin-field">
                    <label htmlFor="mpv-sup">Atasan Langsung</label>
                    <input
                      id="mpv-sup"
                      type="text"
                      className="dm-admin-input"
                      value={formData.mpv?.supervisor ?? ""}
                      onChange={(e) => handleMpvChange("supervisor", e.target.value)}
                      placeholder="Nama atasan / leader"
                    />
                  </div>

                  <div className="dm-admin-field">
                    <label htmlFor="mpv-phone">No. Telepon / Extension</label>
                    <input
                      id="mpv-phone"
                      type="text"
                      className="dm-admin-input"
                      value={formData.mpv?.workPhone ?? ""}
                      onChange={(e) => handleMpvChange("workPhone", e.target.value)}
                      placeholder="Nomor kontak"
                    />
                  </div>

                  <div className="dm-admin-field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="mpv-photo">Foto Profil MPV</label>
                    <div className="dm-admin-upload-wrap">
                      <input
                        id="mpv-photo"
                        type="text"
                        className="dm-admin-input"
                        value={formData.mpv?.photoUrl ?? ""}
                        onChange={(e) => handleMpvChange("photoUrl", e.target.value)}
                        placeholder="Path atau URL gambar MPV"
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
            )}

            {/* Tab 4: Rekap Presensi */}
            {activeTab === "attendance" && (
              <div className="dm-admin-section">
                <div className="dm-admin-sec-head" style={{ marginBottom: "1.2rem" }}>
                  <h3 className="dm-admin-sec-title">
                    Rekapitulasi Presensi
                  </h3>
                  <span className="dm-admin-sec-sub">
                    Pantau kehadiran tim.
                  </span>
                </div>
                <AttendanceRecap />
              </div>
            )}

            {/* Tab 5: Template Presets */}
            {activeTab === "presets" && (
              <div className="dm-admin-section">
                <div className="dm-admin-sec-head">
                  <h3 className="dm-admin-sec-title">Pilih Template Workshop Manufaktur</h3>
                  <span className="dm-admin-sec-sub">
                    Gunakan konfigurasi siap pakai untuk lini pabrik OPPO
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
                  {dmWorkshopPresets.map((preset) => (
                    <div
                      key={preset.id}
                      style={{
                        padding: "0.85rem 1rem",
                        border: selectedPreset === preset.id ? "1px solid #286b46" : "1px solid #dbe7df",
                        borderRadius: "8px",
                        background: selectedPreset === preset.id ? "#f3f8f5" : "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1a2c22" }}>
                          {preset.name}
                        </span>
                        {selectedPreset === preset.id && (
                          <span style={{ fontSize: "0.68rem", background: "#286b46", color: "#ffffff", padding: "0.15rem 0.45rem", borderRadius: "4px", fontWeight: 600 }}>
                            Aktif
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#486657" }}>
                        <strong>Kode:</strong> {preset.board.lineCode} &bull; <strong>Model:</strong> {preset.board.model}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "#748f82" }}>
                        {preset.board.workshopLabel}
                      </div>
                      <div style={{ marginTop: "auto", paddingTop: "0.4rem" }}>
                        <button
                          type="button"
                          className="dm-admin-btn is-secondary"
                          style={{ width: "100%", justifyContent: "center", height: "30px", fontSize: "0.76rem" }}
                          onClick={() => handlePresetChange(preset.id)}
                        >
                          Terapkan Template Ini
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
