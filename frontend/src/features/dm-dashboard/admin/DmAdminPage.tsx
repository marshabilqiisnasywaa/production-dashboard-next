"use client";
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { DM_STORAGE_KEY, defaultDmBoard, dmWorkshopPresets } from "../dmData";
import type { DmBoard, DmLineStatus, DmMember } from "../dmData";
import AttendanceRecap from "../meeting/AttendanceRecap";
import DmAdminSidebar from "./DmAdminSidebar";
import type { DmAdminTabKey } from "./DmAdminSidebar";
import LineDetailModal from "./LineDetailModal";
import type { LineTableItem } from "./LineDetailModal";
import "./AdminPanel.css";

type TabKey = DmAdminTabKey;

const defaultLinesList: LineTableItem[] = dmWorkshopPresets.map((preset) => ({
  id: preset.id,
  workshopLabel: preset.board.workshopLabel,
  lineLabel: preset.board.lineLabel,
  lineLabelZh: preset.board.lineLabelZh,
  lineCode: preset.board.lineCode,
  lineName: preset.board.lineName,
  model: preset.board.model,
  status: preset.board.status,
  slogan: preset.board.slogan,
  values: [...preset.board.values],
  teamPhotoUrl: preset.board.teamPhotoUrl,
  members: preset.board.members,
  mpv: preset.board.mpv,
}));

export default function DmAdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("workshop");
  const [formData, setFormData] = useState<DmBoard>(defaultDmBoard);
  const [selectedPreset, setSelectedPreset] = useState<string>("ws-5");
  const [saveToast, setSaveToast] = useState(false);
  const [alertBanner, setAlertBanner] = useState<{
    type: "success" | "info";
    message: string;
  } | null>(null);

  // Table & Modal state for Lini & Workshop
  const [linesList, setLinesList] = useState<LineTableItem[]>(defaultLinesList);
  const [activeLineId, setActiveLineId] = useState<string>("ws-5");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DmLineStatus>("all");
  const [selectedLineForModal, setSelectedLineForModal] = useState<LineTableItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    try {
      const savedLines = localStorage.getItem("dm_dashboard_lines_list");
      let currentLines = defaultLinesList;
      if (savedLines) {
        currentLines = JSON.parse(savedLines);
      }

      const saved = localStorage.getItem(DM_STORAGE_KEY);
      if (saved) {
        const parsedBoard: DmBoard = JSON.parse(saved);
        setFormData(parsedBoard);

        // Sync parsedBoard into matching line or prepend
        const matchIdx = currentLines.findIndex((l) => l.lineCode === parsedBoard.lineCode);
        if (matchIdx !== -1) {
          currentLines[matchIdx] = {
            ...currentLines[matchIdx],
            workshopLabel: parsedBoard.workshopLabel,
            lineLabel: parsedBoard.lineLabel,
            lineLabelZh: parsedBoard.lineLabelZh,
            model: parsedBoard.model,
            status: parsedBoard.status,
            lineName: parsedBoard.lineName,
            slogan: parsedBoard.slogan,
            values: [...parsedBoard.values],
            teamPhotoUrl: parsedBoard.teamPhotoUrl,
            members: parsedBoard.members,
            mpv: parsedBoard.mpv,
          };
          setActiveLineId(currentLines[matchIdx].id);
        } else {
          const customLine: LineTableItem = {
            id: `line-${parsedBoard.lineCode}`,
            workshopLabel: parsedBoard.workshopLabel,
            lineLabel: parsedBoard.lineLabel,
            lineLabelZh: parsedBoard.lineLabelZh,
            lineCode: parsedBoard.lineCode,
            lineName: parsedBoard.lineName,
            model: parsedBoard.model,
            status: parsedBoard.status,
            slogan: parsedBoard.slogan,
            values: [...parsedBoard.values],
            teamPhotoUrl: parsedBoard.teamPhotoUrl,
            members: parsedBoard.members,
            mpv: parsedBoard.mpv,
          };
          currentLines = [customLine, ...currentLines];
          setActiveLineId(customLine.id);
        }
      }
      setLinesList(currentLines);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  function handlePresetChange(presetId: string) {
    setSelectedPreset(presetId);
    const found = dmWorkshopPresets.find((p) => p.id === presetId);
    if (found) {
      setFormData(found.board);
      setActiveLineId(presetId);
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

  // Open modal for a line
  function handleOpenDetail(line: LineTableItem) {
    setSelectedLineForModal(line);
    setIsDetailModalOpen(true);
  }

  // Add new line button handler
  function handleAddNewLine() {
    const randomCode = `TAC20${Math.floor(100 + Math.random() * 899)}`;
    const newLine: LineTableItem = {
      id: `ws-new-${Date.now()}`,
      workshopLabel: `DM TRIANGLE WORKSHOP ${linesList.length + 1}`,
      lineLabel: "DM TRIANGLE LINE",
      lineLabelZh: "DM 三角线",
      lineCode: randomCode,
      lineName: "QUALITY LINE",
      model: "OPPO-PRO",
      status: "running",
      slogan: "BERSAMA MERAIH PRESTASI",
      values: ["Benfen", "Orientasi Pengguna", "Mengejar Keunggulan", "Keterbukaan"],
      teamPhotoUrl: "/assets/dm/team-photo.png",
      members: defaultDmBoard.members,
      mpv: defaultDmBoard.mpv,
    };
    setSelectedLineForModal(newLine);
    setIsDetailModalOpen(true);
  }

  // Activate a line directly from table
  function handleActivateLine(line: LineTableItem) {
    setActiveLineId(line.id);
    const nextBoard: DmBoard = {
      lineCode: line.lineCode,
      lineName: line.lineName,
      workshopLabel: line.workshopLabel,
      lineLabel: line.lineLabel,
      lineLabelZh: line.lineLabelZh,
      model: line.model,
      status: line.status,
      slogan: line.slogan,
      values: line.values,
      teamPhotoUrl: line.teamPhotoUrl,
      members: line.members ?? formData.members,
      mpv: line.mpv !== undefined ? line.mpv : formData.mpv,
    };
    setFormData(nextBoard);
    try {
      localStorage.setItem(DM_STORAGE_KEY, JSON.stringify(nextBoard));
    } catch {
      // Ignore
    }
    setAlertBanner({
      type: "success",
      message: `Lini ${line.lineCode} (${line.lineName}) sekarang aktif di DM Dashboard.`,
    });
  }

  // Save changes from Line Detail Modal
  function handleSaveLineModal(updatedLine: LineTableItem, setAsActive: boolean) {
    const existingIndex = linesList.findIndex((l) => l.id === updatedLine.id);
    let nextLines: LineTableItem[];
    if (existingIndex !== -1) {
      nextLines = [...linesList];
      nextLines[existingIndex] = updatedLine;
    } else {
      nextLines = [updatedLine, ...linesList];
    }
    setLinesList(nextLines);

    try {
      localStorage.setItem("dm_dashboard_lines_list", JSON.stringify(nextLines));
    } catch {
      // Ignore
    }

    if (setAsActive || updatedLine.id === activeLineId || updatedLine.lineCode === formData.lineCode) {
      setActiveLineId(updatedLine.id);
      const nextBoard: DmBoard = {
        lineCode: updatedLine.lineCode,
        lineName: updatedLine.lineName,
        workshopLabel: updatedLine.workshopLabel,
        lineLabel: updatedLine.lineLabel,
        lineLabelZh: updatedLine.lineLabelZh,
        model: updatedLine.model,
        status: updatedLine.status,
        slogan: updatedLine.slogan,
        values: updatedLine.values,
        teamPhotoUrl: updatedLine.teamPhotoUrl,
        members: updatedLine.members ?? formData.members,
        mpv: updatedLine.mpv !== undefined ? updatedLine.mpv : formData.mpv,
      };
      setFormData(nextBoard);
      try {
        localStorage.setItem(DM_STORAGE_KEY, JSON.stringify(nextBoard));
      } catch {
        // Ignore
      }
      setAlertBanner({
        type: "success",
        message: `Perubahan input Lini ${updatedLine.lineCode} (${updatedLine.lineName}) berhasil disimpan & langsung aktif di DM Dashboard!`,
      });
    } else {
      setAlertBanner({
        type: "success",
        message: `Detail Lini ${updatedLine.lineCode} (${updatedLine.lineName}) berhasil diperbarui dalam tabel!`,
      });
    }

    setIsDetailModalOpen(false);
  }

  function handleSave() {
    try {
      localStorage.setItem(DM_STORAGE_KEY, JSON.stringify(formData));
      localStorage.setItem("dm_dashboard_lines_list", JSON.stringify(linesList));
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
      setLinesList(defaultLinesList);
      setActiveLineId("ws-5");
      try {
        localStorage.removeItem(DM_STORAGE_KEY);
        localStorage.removeItem("dm_dashboard_lines_list");
      } catch {
        // Ignore localStorage errors
      }
      setAlertBanner({
        type: "info",
        message: "Data DM Dashboard berhasil dikembalikan ke default Workshop 5.",
      });
    }
  }

  const filteredLines = linesList.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.lineCode.toLowerCase().includes(q) ||
      item.lineName.toLowerCase().includes(q) ||
      item.workshopLabel.toLowerCase().includes(q) ||
      item.model.toLowerCase().includes(q) ||
      item.slogan.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            {/* Tab 1: Workshop & Line Table */}
            {activeTab === "workshop" && (
              <div className="dm-admin-section">
                <div className="dm-admin-sec-head">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.6rem" }}>
                    <div>
                      <h3 className="dm-admin-sec-title">Daftar Lini Produksi &amp; Workshop</h3>
                      <span className="dm-admin-sec-sub">
                        Ringkasan input lini &amp; workshop. Klik salah satu baris tabel untuk membuka modal detail dan mengubah data.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="dm-admin-btn is-primary"
                      onClick={handleAddNewLine}
                      style={{ gap: "0.4rem" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Tambah Lini Baru
                    </button>
                  </div>
                </div>

                {/* Toolbar: Search, Filter, Count */}
                <div className="dm-table-toolbar">
                  <div className="dm-table-toolbar-left">
                    <div className="dm-table-search-box">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="dm-table-search-icon" aria-hidden="true">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="search"
                        className="dm-table-search-input"
                        placeholder="Cari kode lini, nama tim, workshop, model..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <select
                      className="dm-table-filter-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as "all" | DmLineStatus)}
                    >
                      <option value="all">Semua Status Operasional</option>
                      <option value="running">RUNNING (Beroperasi Normal)</option>
                      <option value="idle">IDLE (Standby / Menunggu)</option>
                      <option value="stopped">STOPPED (Berhenti / Maintenance)</option>
                    </select>
                  </div>

                  <div className="dm-table-count-badge">
                    Menampilkan <strong>{filteredLines.length}</strong> dari <strong>{linesList.length}</strong> lini
                  </div>
                </div>

                {/* Table Data Lini & Workshop */}
                <div className="dm-admin-table-wrap">
                  <table className="dm-admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: "48px", textAlign: "center" }}>No</th>
                        <th style={{ width: "115px" }}>Kode Lini</th>
                        <th style={{ minWidth: "130px" }}>Nama Lini</th>
                        <th style={{ minWidth: "170px" }}>Workshop</th>
                        <th style={{ width: "110px" }}>Model</th>
                        <th style={{ width: "125px" }}>Status</th>
                        <th style={{ minWidth: "160px" }}>Slogan Tim</th>
                        <th style={{ width: "110px", textAlign: "center" }}>Dashboard</th>
                        <th style={{ width: "130px", textAlign: "center" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLines.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="dm-table-empty">
                            Tidak ditemukan data lini yang cocok dengan kriteria pencarian "{searchQuery}".
                          </td>
                        </tr>
                      ) : (
                        filteredLines.map((line, idx) => {
                          const isActive =
                            line.id === activeLineId || line.lineCode === formData.lineCode;
                          return (
                            <tr
                              key={line.id}
                              className={isActive ? "is-active-row" : ""}
                              onClick={() => handleOpenDetail(line)}
                              title="Klik untuk membuka modal detail input lini"
                            >
                              <td style={{ textAlign: "center", color: "#6a8877", fontWeight: 600 }}>
                                {idx + 1}
                              </td>
                              <td>
                                <span className="dm-col-code">{line.lineCode}</span>
                              </td>
                              <td>
                                <span className="dm-col-name">{line.lineName}</span>
                              </td>
                              <td>
                                <span className="dm-col-ws">{line.workshopLabel}</span>
                              </td>
                              <td>
                                <span className="dm-col-model">{line.model}</span>
                              </td>
                              <td>
                                <span className={`dm-status-badge is-${line.status}`}>
                                  <span className="dm-status-dot" />
                                  {line.status.toUpperCase()}
                                </span>
                              </td>
                              <td>
                                <span className="dm-col-slogan" title={line.slogan}>
                                  {line.slogan || "-"}
                                </span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                {isActive ? (
                                  <span className="dm-badge-pill-live">
                                    <span className="dm-live-dot" />
                                    Aktif
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="dm-table-btn-use"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleActivateLine(line);
                                    }}
                                    title="Tampilkan lini ini di DM Dashboard"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                                      <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                    Gunakan
                                  </button>
                                )}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <button
                                  type="button"
                                  className="dm-table-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDetail(line);
                                  }}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                  </svg>
                                  Detail / Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <div className="dm-table-footer-summary">
                    <span>
                      Lini Aktif Saat Ini: <strong>{formData.lineCode}</strong> &bull; {formData.lineName} ({formData.model})
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#6b8678" }}>
                      💡 Tip: Klik salah satu baris tabel untuk melihat dan mengubah inputan lini dalam modal.
                    </span>
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

      {/* Modal Detail & Input Lini & Workshop */}
      <LineDetailModal
        open={isDetailModalOpen}
        line={selectedLineForModal}
        isActiveOnDashboard={
          Boolean(
            selectedLineForModal &&
              (selectedLineForModal.id === activeLineId ||
                selectedLineForModal.lineCode === formData.lineCode)
          )
        }
        onSave={handleSaveLineModal}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedLineForModal(null);
        }}
      />
    </div>
  );
}

