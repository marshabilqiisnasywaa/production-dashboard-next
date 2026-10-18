"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../leader/dmSoft.css";
import "./supervisor.css";
import {
  IconAlert,
  IconCheck,
  IconCheckCircle,
  IconClipboardCheck,
  IconClock,
  IconClose,
  IconDashboard,
  IconEye,
  IconGrid,
  IconList,
  IconLogout,
  IconPulse,
  IconSearch,
  IconShield,
  IconUsers,
} from "@/components/ui/icons";
import { accountApi, papercardApi, setToken } from "../api";
import type { DmSupervisorLine, DmSupervisorOverview, DmSupervisorSubordinate } from "../api";

// Item Title presets dictionary for clean labeling
const PRESET_TITLES: Record<string, string> = {
  // PROD
  "prd-1": "Ada penandaan pada pos pergerakan operator",
  "prd-2": "Operator telah melalui training JI (Job Instruction)",
  "prd-3": "Catat jumlah operator pengganti / absen hari ini",
  "prd-4": "Kipas ion dan gelang statis ESD terpasang sesuai aturan",
  "prd-5": "Operator bekerja sesuai SOP dan memahami instruksi pos kritis",
  "prd-6": "Seluruh mesin utama menyala dan siap produksi",
  "prd-7": "Conveyor berjalan lancar tanpa getaran abnormal",
  "prd-8": "Sensor stopper dan interlock safety mesin berfungsi normal",
  "prd-9": "Material lot pertama lengkap di rak buffer pos kerja",
  "prd-10": "Label identitas lot & barcode part sesuai Work Order",
  "prd-11": "Kebersihan 5S meja kerja dan lantai area perakitan",
  // ME
  "me-1": "Tekanan kompresor angin utama stabil (0.55 - 0.65 MPa)",
  "me-2": "Suhu solder station stabil pada 350±10°C",
  "me-3": "Obeng elektrik terkalibrasi torsinya sesuai spesifikasi",
  "me-4": "Sistem pendingin (chiller/AC) ruang produksi normal",
  "me-5": "Sensor interlock & tombol emergency stop berfungsi normal",
  // PE
  "pe-1": "WI (Work Instruction) revisi terbaru terpasang di seluruh pos",
  "pe-2": "Parameter mesin dispensing & curing sesuai lembar kendali",
  "pe-3": "Jig & fixture terkalibrasi dan tidak aus",
  "pe-4": "Verifikasi profil suhu oven reflow batch pertama",
  // QC
  "qc-1": "Lembar pemeriksaan IPQC shift berjalan tersedia",
  "qc-2": "Alat ukur (caliper, micrometer) dalam masa kalibrasi",
  "qc-3": "Sampel visual Golden Sample tersedia di pos inspeksi",
  "qc-4": "First Article Inspection (FAI) disetujui untuk mulai running",
};

type ActiveTab = "overview" | "approvals" | "lines" | "profile";
type ViewMode = "grouped" | "list";

export default function SupervisorDashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("approvals");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [overviewData, setOverviewData] = useState<DmSupervisorOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<DmSupervisorSubordinate | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Filters for Per-List view
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>("ALL");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load 100% real database overview
  const loadOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await papercardApi.supervisorOverview(todayStr);
      setOverviewData(data);
    } catch (err: any) {
      showToast("Gagal memuat data supervisor dari database", "error");
    } finally {
      setIsLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleLogout = () => {
    setToken(null);
    window.location.href = "/dm-dashboard/masuk";
  };

  // Real lines containing direct subordinates from database
  const dbLines: DmSupervisorLine[] = overviewData?.lines || [];

  // Exclusively direct subordinates tied to this supervisor in PostgreSQL
  const allListItems = useMemo<DmSupervisorSubordinate[]>(() => {
    return overviewData?.mySubordinates || [];
  }, [overviewData]);

  // Filtered items
  const filteredListItems = useMemo(() => {
    return allListItems.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.name.toLowerCase().includes(q) ||
          item.employeeNo.toLowerCase().includes(q) ||
          item.dept.toLowerCase().includes(q) ||
          (item.lineName && item.lineName.toLowerCase().includes(q));
        if (!matches) return false;
      }
      // Line filter
      if (selectedLineFilter !== "ALL") {
        if (String(item.lineId) !== selectedLineFilter) return false;
      }
      // Dept filter
      if (selectedDeptFilter !== "ALL") {
        if (item.dept.toUpperCase() !== selectedDeptFilter.toUpperCase()) return false;
      }
      // Status filter
      if (selectedStatusFilter !== "ALL") {
        const approval = item.submission?.approvalStatus;
        const hasSubmitted = Boolean(item.submission);

        if (selectedStatusFilter === "NOT_SUBMITTED" && hasSubmitted) return false;
        if (selectedStatusFilter === "PENDING" && approval !== "pending") return false;
        if (selectedStatusFilter === "APPROVED" && approval !== "approved") return false;
        if (selectedStatusFilter === "REVISION" && approval !== "rejected") return false;
        if (selectedStatusFilter === "NG" && !item.submission?.hasNg) return false;
      }
      return true;
    });
  }, [allListItems, searchQuery, selectedLineFilter, selectedDeptFilter, selectedStatusFilter]);

  // KPI Metrics (Calculated exclusively from real database records)
  const totalSubordinatesCount = allListItems.length;
  const submissionsCount = allListItems.filter((i) => Boolean(i.submission)).length;
  const pendingApprovalsCount = allListItems.filter((i) => i.submission?.approvalStatus === "pending").length;
  const approvedCount = allListItems.filter((i) => i.submission?.approvalStatus === "approved").length;
  const abnormalCount = allListItems.filter((i) => i.submission?.hasNg).length;

  // Approve a single submission
  const handleApproveSubmission = async (target: DmSupervisorSubordinate, newStatus: "approved" | "rejected") => {
    if (!target.submission?.id) {
      showToast("Bawahan ini belum mengirimkan berkas papercard untuk disetujui.", "info");
      return;
    }

    setIsSubmittingApproval(true);
    try {
      await papercardApi.approve(target.submission.id, {
        approvalStatus: newStatus,
        supervisorNotes: feedbackNote || (newStatus === "approved" ? "Disetujui oleh Supervisor." : "Perlu perbaikan segera."),
      });
      await loadOverview();

      showToast(
        newStatus === "approved"
          ? `Papercard ${target.name} (${target.dept}) berhasil disetujui!`
          : `Permintaan revisi berhasil dikirim ke ${target.name}.`,
        "success"
      );
      setReviewTarget(null);
      setFeedbackNote("");
    } catch (err: any) {
      showToast(`Gagal memproses persetujuan: ${err?.message || "Kesalahan jaringan"}`, "error");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Batch approve an entire line
  const handleBatchApproveLine = async (line: DmSupervisorLine) => {
    const pendingSubs = line.members
      .map((m) => m.submission)
      .filter((sub): sub is NonNullable<typeof sub> => Boolean(sub && sub.approvalStatus !== "approved"));

    if (pendingSubs.length === 0) {
      showToast(`Tidak ada papercard yang menunggu persetujuan di ${line.lineName}.`, "info");
      return;
    }

    setIsSubmittingApproval(true);
    try {
      for (const sub of pendingSubs) {
        await papercardApi.approve(sub.id, {
          approvalStatus: "approved",
          supervisorNotes: "Disetujui serentak oleh Supervisor.",
        });
      }
      await loadOverview();
      showToast(`Seluruh papercard di ${line.lineName} berhasil disetujui di database!`, "success");
    } catch {
      showToast("Terjadi kesalahan saat memproses persetujuan massal.", "error");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const currentSupervisor = overviewData?.supervisor || {
    name: "Supervisor PROD",
    employeeNo: "S223433",
    dept: "PROD",
  };

  return (
    <div className="spv-shell">
      {/* ====================================================================
          1. Desktop Left Sidebar (> 1024px)
          ==================================================================== */}
      <aside className="spv-sidebar" aria-label="Sidebar Supervisor">
        <div className="spv-sidebar__header">
          <div className="spv-sidebar__brand">
            <span className="spv-sidebar__logo">
              <IconShield size={20} />
            </span>
            <div className="spv-sidebar__brand-text">
              <strong>DM Digital</strong>
              <span>Supervisor Portal</span>
            </div>
          </div>

          <div className="spv-sidebar__user">
            <div className="spv-sidebar__user-avatar">
              {currentSupervisor.name ? currentSupervisor.name.slice(0, 2).toUpperCase() : "SP"}
            </div>
            <div className="spv-sidebar__user-info">
              <span className="spv-sidebar__user-name" title={currentSupervisor.name}>
                {currentSupervisor.name}
              </span>
              <span className="spv-sidebar__user-role">
                NIK: {currentSupervisor.employeeNo} · {currentSupervisor.dept}
              </span>
            </div>
          </div>
        </div>

        <nav className="spv-sidebar__nav">
          <span className="spv-sidebar__section-label">Menu Pengawasan</span>

          <button
            type="button"
            className={`spv-sidebar__nav-item ${activeTab === "approvals" ? "is-active" : ""}`}
            onClick={() => setActiveTab("approvals")}
          >
            <div className="spv-sidebar__nav-left">
              <IconClipboardCheck size={18} />
              <span>Persetujuan Checklist</span>
            </div>
            {pendingApprovalsCount > 0 && (
              <span className="spv-sidebar__nav-badge">{pendingApprovalsCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`spv-sidebar__nav-item ${activeTab === "overview" ? "is-active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <div className="spv-sidebar__nav-left">
              <IconDashboard size={18} />
              <span>Ringkasan &amp; KPI</span>
            </div>
          </button>

          <button
            type="button"
            className={`spv-sidebar__nav-item ${activeTab === "lines" ? "is-active" : ""}`}
            onClick={() => setActiveTab("lines")}
          >
            <div className="spv-sidebar__nav-left">
              <IconPulse size={18} />
              <span>Monitoring Lini</span>
            </div>
          </button>

          <button
            type="button"
            className={`spv-sidebar__nav-item ${activeTab === "profile" ? "is-active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <div className="spv-sidebar__nav-left">
              <IconUsers size={18} />
              <span>Profil Supervisor</span>
            </div>
          </button>

          <div style={{ height: "16px" }} />
          <span className="spv-sidebar__section-label">Akses Lintas Peran</span>

          <Link href="/dm-dashboard/leader" className="spv-sidebar__link-btn">
            <span>👑 Portal Leader Produksi</span>
          </Link>
          <Link href="/dm-dashboard/member" className="spv-sidebar__link-btn">
            <span>👷 Portal Anggota Tim</span>
          </Link>
          <Link href="/dm-dashboard/admin" className="spv-sidebar__link-btn">
            <span>⚙️ Pengaturan Admin</span>
          </Link>
        </nav>

        <div className="spv-sidebar__footer">
          <button type="button" onClick={handleLogout} className="spv-sidebar__logout-btn">
            <IconLogout size={16} />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* ====================================================================
          2. Mobile & Tablet Topbar (<= 1024px)
          ==================================================================== */}
      <header className="spv-topbar">
        <div className="spv-topbar__brand">
          <span className="spv-topbar__logo">
            <IconShield size={18} />
          </span>
          <div>
            <div className="spv-topbar__title">Supervisor Hub</div>
            <div className="spv-topbar__subtitle">
              {currentSupervisor.name} ({currentSupervisor.employeeNo})
            </div>
          </div>
        </div>

        <div className="spv-topbar__right">
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #fecdd3",
              background: "#fff1f2",
              color: "#e11d48",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
            }}
          >
            <IconLogout size={14} />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* ====================================================================
          3. Mobile & Tablet Bottom Bar (<= 1024px)
          ==================================================================== */}
      <nav className="spv-bottombar" aria-label="Navigasi Bawah Supervisor">
        <button
          type="button"
          className={`spv-bottombar__item ${activeTab === "approvals" ? "is-active" : ""}`}
          onClick={() => setActiveTab("approvals")}
        >
          <IconClipboardCheck size={20} />
          <span>Persetujuan</span>
          {pendingApprovalsCount > 0 && (
            <span className="spv-bottombar__badge">{pendingApprovalsCount}</span>
          )}
        </button>

        <button
          type="button"
          className={`spv-bottombar__item ${activeTab === "overview" ? "is-active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <IconDashboard size={20} />
          <span>Ringkasan</span>
        </button>

        <button
          type="button"
          className={`spv-bottombar__item ${activeTab === "lines" ? "is-active" : ""}`}
          onClick={() => setActiveTab("lines")}
        >
          <IconPulse size={20} />
          <span>Lini</span>
        </button>

        <button
          type="button"
          className={`spv-bottombar__item ${activeTab === "profile" ? "is-active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <IconUsers size={20} />
          <span>Akun</span>
        </button>
      </nav>

      {/* ====================================================================
          4. Main Workspace Content
          ==================================================================== */}
      <main className="spv-main-content">
        <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
          {/* Toast / Notification Banner */}
          {toastMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                padding: "10px 16px",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "13px",
                fontWeight: 600,
                background: toastMessage.type === "error" ? "#fff1f2" : "#ecfdf5",
                color: toastMessage.type === "error" ? "#be123c" : "#047857",
                border: `1px solid ${toastMessage.type === "error" ? "#fecdd3" : "#a7f3d0"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {toastMessage.type === "error" ? <IconAlert size={16} /> : <IconCheckCircle size={16} />}
                <span>{toastMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                style={{ background: "transparent", border: 0, cursor: "pointer", color: "inherit" }}
              >
                <IconClose size={16} />
              </button>
            </div>
          )}

          {/* Quick Header Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span className="dms-pill dms-pill--supervisor">Peran: Supervisor Approver</span>
                <span className="dms-pill dms-pill--shift">Departemen {currentSupervisor.dept}</span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  📅 {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#0f172a", letterSpacing: "-0.01em" }}>
                {activeTab === "approvals" && "Persetujuan Checklist Papercard Bawahan"}
                {activeTab === "overview" && "Dashboard & Ringkasan Pengawasan Supervisor"}
                {activeTab === "lines" && "Status Kesiapan & Verifikasi Lini Produksi"}
                {activeTab === "profile" && "Informasi Akun Supervisor"}
              </h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={loadOverview}
                className="dms-btn-compact dms-btn-compact--secondary"
                title="Muat ulang data terbaru dari database"
              >
                ↻ Segarkan Data DB
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div className="dms-card" style={{ padding: "14px 16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Bawahan Terikat Langsung
              </span>
              <strong style={{ display: "block", fontSize: "20px", color: "#0f172a", marginTop: "2px" }}>
                {totalSubordinatesCount} Pegawai
              </strong>
              <span style={{ fontSize: "11.5px", color: "#0f766e" }}>
                Terikat langsung ke akun {currentSupervisor.name}
              </span>
            </div>

            <div className="dms-card" style={{ padding: "14px 16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Submisi Masuk
              </span>
              <strong style={{ display: "block", fontSize: "20px", color: "#0f172a", marginTop: "2px" }}>
                {submissionsCount} / {totalSubordinatesCount}
              </strong>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                {totalSubordinatesCount - submissionsCount} belum mengirim checklist
              </span>
            </div>

            <div className="dms-card" style={{ padding: "14px 16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Menunggu Persetujuan
              </span>
              <strong
                style={{
                  display: "block",
                  fontSize: "20px",
                  color: pendingApprovalsCount > 0 ? "#d97706" : "#059669",
                  marginTop: "2px",
                }}
              >
                {pendingApprovalsCount} Berkas
              </strong>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                {approvedCount} sudah disetujui
              </span>
            </div>

            <div className="dms-card" style={{ padding: "14px 16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Temuan Abnormal (NG)
              </span>
              <strong
                style={{
                  display: "block",
                  fontSize: "20px",
                  color: abnormalCount > 0 ? "#e11d48" : "#64748b",
                  marginTop: "2px",
                }}
              >
                {abnormalCount} Temuan
              </strong>
              <span style={{ fontSize: "11.5px", color: abnormalCount > 0 ? "#e11d48" : "#64748b" }}>
                {abnormalCount > 0 ? "Periksa tindakan pencegahan" : "Kondisi operasional normal"}
              </span>
            </div>
          </div>

          {/* ================================================================
              TAB: APPROVALS (Persetujuan Checklist)
              ================================================================ */}
          {activeTab === "approvals" && (
            <div>
              {/* Controls bar: View mode switch & Scope filter */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  padding: "12px 16px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  marginBottom: "16px",
                }}
              >
                {/* View Mode Toggle: Kelompok Lini vs Per-List */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Tampilan:</span>
                    <div className="spv-view-switch">
                      <button
                        type="button"
                        className={`spv-view-switch__btn ${viewMode === "grouped" ? "is-active" : ""}`}
                        onClick={() => setViewMode("grouped")}
                        title="Kelompokkan berdasarkan lini kerja bawahan langsung"
                      >
                        <IconGrid size={15} />
                        <span>Kelompok Lini</span>
                      </button>
                      <button
                        type="button"
                        className={`spv-view-switch__btn ${viewMode === "list" ? "is-active" : ""}`}
                        onClick={() => setViewMode("list")}
                        title="Tampilan daftar per-item bawahan langsung"
                      >
                        <IconList size={15} />
                        <span>Per-List (Daftar Detail)</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                  {viewMode === "grouped"
                    ? `${dbLines.length} Lini Bawahan Langsung`
                    : `${filteredListItems.length} dari ${allListItems.length} Bawahan Langsung`}
                </div>
              </div>

              {/* ------------------------------------------------------------
                  MODE A: KELOMPOK LINI (Grouped by Line - Real Database)
                  ------------------------------------------------------------ */}
              {viewMode === "grouped" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {dbLines.length === 0 ? (
                    <div className="dms-card" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                      Belum ada data lini di database.
                    </div>
                  ) : (
                    dbLines.map((line) => {
                      const subs = line.members.map((m) => m.submission).filter(Boolean);
                      const hasAbnormal = subs.some((s) => s?.hasNg);
                      const allApproved =
                        line.members.length > 0 &&
                        line.members.every((m) => m.submission && m.submission.approvalStatus === "approved");

                      return (
                        <div
                          key={line.lineId}
                          className="dms-card"
                          style={{
                            borderColor: hasAbnormal ? "#fecdd3" : allApproved ? "#bbf7d0" : "#e2e8f0",
                            boxShadow: hasAbnormal ? "0 2px 10px rgba(225, 29, 72, 0.04)" : undefined,
                          }}
                        >
                          {/* Line Header */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "12px",
                              marginBottom: "14px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "10px",
                                  background: hasAbnormal ? "#fff1f2" : allApproved ? "#ecfdf5" : "#f1f5f9",
                                  color: hasAbnormal ? "#be123c" : allApproved ? "#047857" : "#0f172a",
                                  display: "grid",
                                  placeItems: "center",
                                  fontWeight: 700,
                                  fontSize: "14px",
                                }}
                              >
                                {line.lineCode ? line.lineCode.slice(-3) : `L${line.lineId}`}
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                                    {line.lineName} ({line.lineCode})
                                  </h3>
                                  <span className="dms-pill dms-pill--shift">{line.shift}</span>
                                </div>
                                <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                                  Leader: <strong>{line.leader?.name || "Belum Ditentukan"}</strong> (
                                  {line.leader?.employeeNo || "-"}) · {line.workshopName}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {allApproved ? (
                                <span className="dms-status-badge dms-status-badge--approved">
                                  <IconCheckCircle size={13} />
                                  Semua Disetujui
                                </span>
                              ) : hasAbnormal ? (
                                <span className="dms-status-badge dms-status-badge--ng">
                                  <IconAlert size={13} />
                                  Ada Temuan NG
                                </span>
                              ) : (
                                <span className="dms-status-badge dms-status-badge--waiting">
                                  Menunggu Lengkap
                                </span>
                              )}

                              {!allApproved && (
                                <button
                                  type="button"
                                  disabled={isSubmittingApproval}
                                  onClick={() => handleBatchApproveLine(line)}
                                  className="dms-btn-compact dms-btn-compact--primary"
                                  style={{ fontSize: "12px", padding: "6px 12px" }}
                                >
                                  ✓ Setujui Semua di Lini Ini
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Subordinate members assigned to this line */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                              gap: "10px",
                            }}
                          >
                            {line.members.map((member) => {
                              const sub = member.submission;
                              const isSubmitted = Boolean(sub);
                              const isApproved = sub?.approvalStatus === "approved";
                              const isRevision = sub?.approvalStatus === "rejected";
                              const isNG = Boolean(sub?.hasNg);
                              const isWaiting = isSubmitted && sub?.approvalStatus === "pending";

                              return (
                                <div
                                  key={member.id}
                                  onClick={() => {
                                    setReviewTarget({
                                      ...member,
                                      lineId: line.lineId,
                                      lineName: line.lineName,
                                    });
                                    setFeedbackNote(member.submission?.supervisorNotes || "");
                                  }}
                                  style={{
                                    padding: "10px 12px",
                                    background: isApproved ? "#f0fdf4" : isNG ? "#fff1f2" : "#fcfcfd",
                                    border: `1px solid ${
                                      isApproved ? "#bbf7d0" : isNG ? "#fecdd3" : isRevision ? "#fed7aa" : "#e2e8f0"
                                    }`,
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                  }}
                                  title="Klik untuk membuka rincian checklist & persetujuan"
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      marginBottom: "4px",
                                    }}
                                  >
                                    <span className={`dms-dept-badge dms-dept-badge--${member.dept}`}>
                                      {member.role === "leader" ? "👑 LEADER" : member.dept}
                                    </span>
                                    {isApproved ? (
                                      <span style={{ fontSize: "10.5px", color: "#047857", fontWeight: 700 }}>
                                        ✓ Disetujui
                                      </span>
                                    ) : isRevision ? (
                                      <span style={{ fontSize: "10.5px", color: "#c2410c", fontWeight: 700 }}>
                                        Perlu Revisi
                                      </span>
                                    ) : isNG ? (
                                      <span style={{ fontSize: "10.5px", color: "#be123c", fontWeight: 700 }}>
                                        ! Temuan NG
                                      </span>
                                    ) : isWaiting ? (
                                      <span style={{ fontSize: "10.5px", color: "#b45309", fontWeight: 700 }}>
                                        Menunggu Review
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>Belum Submit</span>
                                    )}
                                  </div>

                                  <strong
                                    style={{
                                      display: "block",
                                      fontSize: "13px",
                                      color: "#0f172a",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {member.name}
                                  </strong>
                                  <span style={{ display: "block", fontSize: "11px", color: "#64748b" }}>
                                    NIK: {member.employeeNo} · {member.position}
                                  </span>

                                  {member.isMySubordinate && (
                                    <span
                                      style={{
                                        display: "inline-block",
                                        marginTop: "4px",
                                        fontSize: "10px",
                                        color: "#0f766e",
                                        fontWeight: 600,
                                      }}
                                    >
                                      ✓ Terikat ke Anda
                                    </span>
                                  )}

                                  {sub?.submittedAt && (
                                    <span
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        fontSize: "10.5px",
                                        color: "#64748b",
                                        marginTop: "4px",
                                      }}
                                    >
                                      <IconClock size={11} />
                                      {new Date(sub.submittedAt).toLocaleTimeString("id-ID", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}{" "}
                                      WIB
                                    </span>
                                  )}

                                  {isNG && sub?.abnormalNotes && (
                                    <div
                                      style={{
                                        marginTop: "6px",
                                        fontSize: "11px",
                                        color: "#be123c",
                                        lineHeight: 1.25,
                                        background: "rgba(255,255,255,0.7)",
                                        padding: "4px 6px",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      ⚠️ {sub.abnormalNotes}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------
                  MODE B: PER-LIST (Daftar Detail Per-Bawahan)
                  ------------------------------------------------------------ */}
              {viewMode === "list" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Filter & Search Toolbar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 14px",
                    }}
                  >
                    {/* Search */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        flex: "1 1 200px",
                      }}
                    >
                      <IconSearch size={15} style={{ color: "#94a3b8" }} />
                      <input
                        type="text"
                        placeholder="Cari nama bawahan atau NIK..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          border: 0,
                          background: "transparent",
                          fontSize: "12.5px",
                          width: "100%",
                          outline: "none",
                        }}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          style={{ border: 0, background: "transparent", cursor: "pointer", color: "#94a3b8" }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filter Lini */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Lini:</span>
                      <select
                        value={selectedLineFilter}
                        onChange={(e) => setSelectedLineFilter(e.target.value)}
                        style={{
                          fontSize: "12px",
                          padding: "5px 8px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                        }}
                      >
                        <option value="ALL">Semua Lini</option>
                        {dbLines.map((l) => (
                          <option key={l.lineId} value={String(l.lineId)}>
                            {l.lineName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Dept */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Dept:</span>
                      <select
                        value={selectedDeptFilter}
                        onChange={(e) => setSelectedDeptFilter(e.target.value)}
                        style={{
                          fontSize: "12px",
                          padding: "5px 8px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                        }}
                      >
                        <option value="ALL">Semua Dept</option>
                        <option value="PROD">PROD</option>
                        <option value="ME">ME</option>
                        <option value="PE">PE</option>
                        <option value="QC">QC</option>
                      </select>
                    </div>

                    {/* Filter Status */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Status:</span>
                      <select
                        value={selectedStatusFilter}
                        onChange={(e) => setSelectedStatusFilter(e.target.value)}
                        style={{
                          fontSize: "12px",
                          padding: "5px 8px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                        }}
                      >
                        <option value="ALL">Semua Status</option>
                        <option value="PENDING">Menunggu Persetujuan</option>
                        <option value="APPROVED">Sudah Disetujui</option>
                        <option value="REVISION">Perlu Revisi</option>
                        <option value="NG">Ada Temuan NG</option>
                        <option value="NOT_SUBMITTED">Belum Submit</option>
                      </select>
                    </div>
                  </div>

                  {/* List Cards */}
                  <div className="spv-list-container">
                    {filteredListItems.length === 0 ? (
                      <div
                        style={{
                          padding: "32px 20px",
                          textAlign: "center",
                          background: "#ffffff",
                          borderRadius: "10px",
                          border: "1px dashed #cbd5e1",
                          color: "#64748b",
                        }}
                      >
                        <p style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600 }}>
                          Tidak ada bawahan yang sesuai dengan filter pencarian.
                        </p>
                        <span style={{ fontSize: "12.5px" }}>
                          Coba sesuaikan kata kunci atau ganti opsi lingkup di atas.
                        </span>
                      </div>
                    ) : (
                      filteredListItems.map((item, idx) => {
                        const sub = item.submission;
                        const isSubmitted = Boolean(sub);
                        const isApproved = sub?.approvalStatus === "approved";
                        const isRevision = sub?.approvalStatus === "rejected";
                        const isNG = Boolean(sub?.hasNg);
                        const isWaiting = isSubmitted && sub?.approvalStatus === "pending";

                        const okCount = sub?.answers?.filter((a: any) => a.status === "OK").length || 0;
                        const ngCount = sub?.answers?.filter((a: any) => a.status === "NG").length || 0;

                        return (
                          <div
                            key={`${item.id}-${idx}`}
                            className={`spv-list-card ${
                              isApproved ? "is-approved" : isNG ? "has-ng" : isWaiting ? "is-waiting" : ""
                            }`}
                          >
                            {/* Pegawai & Role */}
                            <div className="spv-list-info">
                              <div className="spv-list-emp">
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>
                                    {item.name}
                                  </strong>
                                  <span className={`dms-dept-badge dms-dept-badge--${item.dept}`}>
                                    {item.role === "leader" ? "👑 LEADER" : item.dept}
                                  </span>
                                </div>
                                <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                                  NIK: <strong>{item.employeeNo}</strong> · {item.position}
                                </span>
                              </div>

                              {/* Lini & Waktu */}
                              <div className="spv-list-meta">
                                <div>
                                  <strong style={{ color: "#0f172a" }}>{item.lineName || "Line 1"}</strong>
                                </div>
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <IconClock size={12} />
                                  {sub?.submittedAt
                                    ? `${new Date(sub.submittedAt).toLocaleTimeString("id-ID", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })} WIB`
                                    : "Belum Submit"}
                                </span>
                              </div>

                              {/* Checklist Summary */}
                              <div className="spv-list-checklist-summary">
                                {isSubmitted ? (
                                  <div style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ color: "#15803d", fontWeight: 700 }}>{okCount} OK</span>
                                    {ngCount > 0 && (
                                      <span style={{ color: "#b91c1c", fontWeight: 700 }}>· {ngCount} NG</span>
                                    )}
                                    <span style={{ color: "#94a3b8" }}>({sub?.answers?.length || 0} Item)</span>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                                    Menunggu pengisian hari ini
                                  </span>
                                )}
                                {isNG && sub?.abnormalNotes && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: "#be123c",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      maxWidth: "240px",
                                    }}
                                    title={sub.abnormalNotes}
                                  >
                                    ⚠️ {sub.abnormalNotes}
                                  </span>
                                )}
                              </div>

                              {/* Approval Status Badge */}
                              <div>
                                {isApproved ? (
                                  <span className="dms-status-badge dms-status-badge--approved">
                                    <IconCheckCircle size={12} /> Disetujui
                                  </span>
                                ) : isRevision ? (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      padding: "3px 8px",
                                      borderRadius: "6px",
                                      background: "#ffedd5",
                                      color: "#c2410c",
                                      fontWeight: 700,
                                    }}
                                  >
                                    Minta Revisi
                                  </span>
                                ) : isNG ? (
                                  <span className="dms-status-badge dms-status-badge--ng">
                                    <IconAlert size={12} /> Ada Temuan NG
                                  </span>
                                ) : isWaiting ? (
                                  <span className="dms-status-badge dms-status-badge--waiting">
                                    Menunggu Review
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Belum Submit</span>
                                )}
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="spv-list-actions">
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewTarget(item);
                                  setFeedbackNote(item.submission?.supervisorNotes || "");
                                }}
                                className="dms-btn-compact dms-btn-compact--primary"
                                style={{ fontSize: "12px" }}
                              >
                                <IconEye size={13} />
                                <span>{isSubmitted ? "Tinjau & Setujui" : "Lihat Profil"}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB: OVERVIEW & RINGKASAN
              ================================================================ */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="dms-card" style={{ padding: "18px 20px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 8px", color: "#0f172a" }}>
                  Ringkasan Pengawasan &amp; Kepatuhan Checklist
                </h2>
                <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                  Seluruh data di dashboard ini terhubung langsung ke database PostgreSQL, mencerminkan relasi
                  bawah bawahan langsung yang terikat dengan akun supervisor Anda.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Bawahan Terikat Langsung:</span>
                    <strong style={{ display: "block", fontSize: "18px", color: "#0f172a", marginTop: "2px" }}>
                      {overviewData?.mySubordinates.length || 0} Karyawan
                    </strong>
                  </div>
                  <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Lini yang Diawasi:</span>
                    <strong style={{ display: "block", fontSize: "18px", color: "#0f172a", marginTop: "2px" }}>
                      {dbLines.length} Lini Perakitan
                    </strong>
                  </div>
                  <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Status Database:</span>
                    <strong style={{ display: "block", fontSize: "18px", color: "#059669", marginTop: "2px" }}>
                      ✓ Terhubung PostgreSQL
                    </strong>
                  </div>
                </div>
              </div>

              {pendingApprovalsCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "10px",
                  }}
                >
                  <div>
                    <strong style={{ color: "#1e40af", fontSize: "13.5px" }}>
                      Ada {pendingApprovalsCount} berkas menunggu persetujuan Anda.
                    </strong>
                    <span style={{ display: "block", fontSize: "12px", color: "#3b82f6", marginTop: "2px" }}>
                      Buka tab Persetujuan Checklist untuk memeriksa rincian jawaban masing-masing lini.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("approvals")}
                    className="dms-btn-compact dms-btn-compact--primary"
                    style={{ background: "#2563eb", borderColor: "#2563eb" }}
                  >
                    Buka Persetujuan →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB: MONITORING LINI
              ================================================================ */}
          {activeTab === "lines" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="dms-card" style={{ padding: "18px 20px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>
                  Daftar Lini Perakitan di Database
                </h2>
                <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>
                  Pengawasan lini produksi dan verifikasi kehadiran tim.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {dbLines.map((line) => {
                    const subs = line.members.map((m) => m.submission).filter(Boolean);
                    const allApproved =
                      line.members.length > 0 &&
                      line.members.every((m) => m.submission && m.submission.approvalStatus === "approved");
                    const hasAbnormal = subs.some((s) => s?.hasNg);

                    return (
                      <div
                        key={line.lineId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          background: "#ffffff",
                          border: `1px solid ${hasAbnormal ? "#fecdd3" : allApproved ? "#bbf7d0" : "#e2e8f0"}`,
                          borderRadius: "8px",
                          flexWrap: "wrap",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                            {line.lineName} ({line.lineCode})
                          </strong>
                          <span style={{ display: "block", fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                            Leader: {line.leader?.name || "-"} ({line.leader?.employeeNo || "-"}) · {line.shift} · {line.workshopName}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {allApproved ? (
                            <span className="dms-status-badge dms-status-badge--approved">
                              ✓ Terverifikasi Penuh
                            </span>
                          ) : hasAbnormal ? (
                            <span className="dms-status-badge dms-status-badge--ng">
                              ! Ada Abnormalitas
                            </span>
                          ) : (
                            <span className="dms-status-badge dms-status-badge--waiting">
                              Menunggu Lengkap
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("approvals");
                              setViewMode("grouped");
                            }}
                            className="dms-btn-compact dms-btn-compact--secondary"
                            style={{ fontSize: "12px" }}
                          >
                            Lihat di Persetujuan →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB: PROFIL SUPERVISOR
              ================================================================ */}
          {activeTab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="dms-card" style={{ padding: "20px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 14px", color: "#0f172a" }}>
                  Profil Pengawas / Supervisor
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>Nama Lengkap</span>
                    <strong style={{ display: "block", fontSize: "14px", color: "#0f172a", marginTop: "2px" }}>
                      {currentSupervisor.name}
                    </strong>
                  </div>
                  <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>Nomor Induk Karyawan (NIK)</span>
                    <strong style={{ display: "block", fontSize: "14px", color: "#0f172a", marginTop: "2px" }}>
                      {currentSupervisor.employeeNo}
                    </strong>
                  </div>
                  <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>Peran Otoritas</span>
                    <strong style={{ display: "block", fontSize: "14px", color: "#047857", marginTop: "2px" }}>
                      Supervisor Approver ({currentSupervisor.dept})
                    </strong>
                  </div>
                  <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>Bawahan Terikat di Database</span>
                    <strong style={{ display: "block", fontSize: "14px", color: "#0f172a", marginTop: "2px" }}>
                      {overviewData?.mySubordinates.length || 0} Orang
                    </strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={handleLogout} className="spv-sidebar__logout-btn" style={{ width: "auto" }}>
                    <IconLogout size={16} />
                    <span>Keluar dari Akun Supervisor</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ====================================================================
          5. Detail Inspection Modal (Real Checklist Answers & Approval)
          ==================================================================== */}
      {reviewTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: "16px",
          }}
          onClick={() => setReviewTarget(null)}
        >
          <div
            className="dms-card"
            style={{
              width: "100%",
              maxWidth: "680px",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: "22px 24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                paddingBottom: "12px",
                borderBottom: "1px solid #e2e8f0",
                marginBottom: "14px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className={`dms-dept-badge dms-dept-badge--${reviewTarget.dept}`}>
                    {reviewTarget.role === "leader" ? "👑 LEADER PROD" : `DEPT ${reviewTarget.dept}`}
                  </span>
                  {reviewTarget.lineName && (
                    <span className="dms-pill dms-pill--shift">{reviewTarget.lineName}</span>
                  )}
                  {reviewTarget.isMySubordinate && (
                    <span style={{ fontSize: "11px", color: "#0f766e", fontWeight: 700 }}>
                      ✓ Bawahan Terikat Anda
                    </span>
                  )}
                </div>
                <h3 style={{ margin: "2px 0 2px", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                  Tinjauan Papercard — {reviewTarget.name}
                </h3>
                <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                  NIK: <strong>{reviewTarget.employeeNo}</strong> · Posisi: <strong>{reviewTarget.position}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                style={{
                  background: "transparent",
                  border: 0,
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Submitter & Timestamp Info */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                padding: "10px 12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                marginBottom: "14px",
                fontSize: "12px",
              }}
            >
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Nama Karyawan:</span>
                <strong style={{ color: "#0f172a" }}>
                  {reviewTarget.name} ({reviewTarget.employeeNo})
                </strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Waktu Pengiriman:</span>
                <strong style={{ color: "#0f172a" }}>
                  {reviewTarget.submission?.submittedAt
                    ? `${new Date(reviewTarget.submission.submittedAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} WIB`
                    : "Belum mengirimkan checklist hari ini"}
                </strong>
              </div>
            </div>

            {/* Checklist Answers from Database */}
            {reviewTarget.submission ? (
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                    Rincian Jawaban Checklist ({reviewTarget.submission.answers?.length || 0} Item):
                  </h4>
                  <div style={{ fontSize: "12px", display: "flex", gap: "6px" }}>
                    <span style={{ color: "#047857", fontWeight: 700 }}>
                      {reviewTarget.submission.answers?.filter((a: any) => a.status === "OK").length || 0} OK
                    </span>
                    <span style={{ color: "#be123c", fontWeight: 700 }}>
                      {reviewTarget.submission.answers?.filter((a: any) => a.status === "NG").length || 0} NG
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {reviewTarget.submission.answers?.map((answer: any, aIdx: number) => {
                    const isNG = answer.status === "NG";
                    const isText = answer.textValue && !isNG;

                    return (
                      <div
                        key={answer.itemId || aIdx}
                        style={{
                          padding: "8px 12px",
                          background: isNG ? "#fff1f2" : "#fcfcfd",
                          border: `1px solid ${isNG ? "#fecdd3" : "#f1f5f9"}`,
                          borderRadius: "7px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                          <span style={{ fontSize: "12.5px", color: "#0f172a", fontWeight: 600 }}>
                            #{aIdx + 1}. {PRESET_TITLES[answer.itemId] || `Poin Cek ${answer.itemId}`}
                          </span>

                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: "4px",
                              background: isNG ? "#fee2e2" : isText ? "#e0f2fe" : "#dcfce7",
                              color: isNG ? "#b91c1c" : isText ? "#0369a1" : "#15803d",
                              flexShrink: 0,
                            }}
                          >
                            {isNG ? "NG (Abnormal)" : isText ? `Nilai: ${answer.textValue}` : "OK"}
                          </span>
                        </div>

                        {/* If NG, show Cause & Solution entered by subordinate */}
                        {isNG && (
                          <div
                            style={{
                              marginTop: "6px",
                              fontSize: "11.5px",
                              color: "#9f1239",
                              background: "rgba(255, 255, 255, 0.75)",
                              padding: "6px 8px",
                              borderRadius: "5px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "3px",
                            }}
                          >
                            <div>
                              <strong>Penyebab:</strong> {answer.cause || "Tidak ada rincian penyebab."}
                            </div>
                            {answer.solution && (
                              <div>
                                <strong>Tindakan Perbaikan:</strong> {answer.solution}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px dashed #cbd5e1",
                  color: "#64748b",
                  marginBottom: "16px",
                  fontSize: "13px",
                }}
              >
                Karyawan ini belum mengirimkan papercard checklist untuk hari ini.
              </div>
            )}

            {/* Abnormal Notes if any */}
            {reviewTarget.submission?.abnormalNotes && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  borderRadius: "7px",
                  marginBottom: "14px",
                  fontSize: "12px",
                  color: "#9f1239",
                }}
              >
                <strong>Catatan Eskalasi Bawahan:</strong> {reviewTarget.submission.abnormalNotes}
              </div>
            )}

            {/* Supervisor Notes Input */}
            {reviewTarget.submission && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "5px",
                  }}
                >
                  Instruksi / Catatan Supervisor:
                </label>
                <textarea
                  rows={2}
                  placeholder="Tuliskan arahan tindak lanjut atau catatan alasan jika meminta revisi..."
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "7px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12.5px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
            )}

            {/* Status if already approved */}
            {reviewTarget.submission?.approvalStatus === "approved" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#047857",
                  fontSize: "12px",
                  fontWeight: 600,
                  marginBottom: "14px",
                }}
              >
                <IconCheckCircle size={15} />
                <span>
                  Papercard ini telah disetujui
                  {reviewTarget.submission.approvedByName ? ` oleh ${reviewTarget.submission.approvedByName}` : ""}.
                </span>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="dms-btn-compact dms-btn-compact--secondary"
              >
                Tutup
              </button>

              {reviewTarget.submission && (
                <>
                  <button
                    type="button"
                    disabled={isSubmittingApproval}
                    onClick={() => handleApproveSubmission(reviewTarget, "rejected")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "6px 12px",
                      borderRadius: "7px",
                      border: "1px solid #fecdd3",
                      background: "#fff1f2",
                      color: "#e11d48",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ✕ Minta Revisi
                  </button>

                  <button
                    type="button"
                    disabled={isSubmittingApproval}
                    onClick={() => handleApproveSubmission(reviewTarget, "approved")}
                    className="dms-btn-compact dms-btn-compact--primary"
                  >
                    <IconCheck size={14} />
                    <span>✓ Setujui Papercard</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
