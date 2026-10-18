"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "../leader/dmSoft.css";
import "./supervisor.css";
import { IconAlert, IconCheckCircle, IconClose } from "@/components/ui/icons";
import { papercardApi, setToken } from "../api";
import type { DmSupervisorLine, DmSupervisorOverview, DmSupervisorSubordinate } from "../api";
import type { ActiveTab, ToastMessage, ViewMode } from "./types";
import {
  SupervisorApprovalsTab,
  SupervisorBottombar,
  SupervisorHeaderBar,
  SupervisorLinesTab,
  SupervisorNavbar,
  SupervisorProfileTab,
  SupervisorReviewModal,
  SupervisorSidebar,
} from "./components";

export default function SupervisorDashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("approvals");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [overviewData, setOverviewData] = useState<DmSupervisorOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<DmSupervisorSubordinate | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Filters for checklist view
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
    } catch {
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

  // Real lines containing direct supervised members from database
  const dbLines: DmSupervisorLine[] = overviewData?.lines || [];

  // Supervised team members
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

  // Summary counts for quick headers
  const totalCount = allListItems.length;
  const pendingApprovalsCount = allListItems.filter((i) => i.submission?.approvalStatus === "pending").length;
  const approvedCount = allListItems.filter((i) => i.submission?.approvalStatus === "approved").length;
  const abnormalCount = allListItems.filter((i) => i.submission?.hasNg).length;

  // Approve a single submission
  const handleApproveSubmission = async (target: DmSupervisorSubordinate, newStatus: "approved" | "rejected") => {
    if (!target.submission?.id) {
      showToast("Karyawan ini belum mengirimkan berkas papercard untuk diverifikasi.", "info");
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
      showToast(`Seluruh papercard di ${line.lineName} sudah disetujui.`, "info");
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
      showToast(`Seluruh papercard di ${line.lineName} berhasil disetujui!`, "success");
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
      {/* 1. Desktop Left Sidebar (> 1024px) */}
      <SupervisorSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentSupervisor={currentSupervisor}
        pendingApprovalsCount={pendingApprovalsCount}
        onLogout={handleLogout}
      />

      {/* 2. Mobile & Tablet Topbar (<= 1024px) */}
      <SupervisorNavbar
        currentSupervisor={currentSupervisor}
        onLogout={handleLogout}
      />

      {/* 3. Mobile & Tablet Bottom Bar (<= 1024px) */}
      <SupervisorBottombar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* 4. Main Workspace Content */}
      <main className="spv-main-content">
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          {/* Toast / Notification Banner */}
          {toastMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "6px",
                marginBottom: "12px",
                fontSize: "12.5px",
                fontWeight: 600,
                background: toastMessage.type === "error" ? "#fff1f2" : "#ecfdf5",
                color: toastMessage.type === "error" ? "#be123c" : "#047857",
                border: `1px solid ${toastMessage.type === "error" ? "#fecdd3" : "#a7f3d0"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {toastMessage.type === "error" ? <IconAlert size={15} /> : <IconCheckCircle size={15} />}
                <span>{toastMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                style={{ background: "transparent", border: 0, cursor: "pointer", color: "inherit", padding: "2px" }}
              >
                <IconClose size={14} />
              </button>
            </div>
          )}

          {/* Compact Header Bar with Inline Quick Stats */}
          <SupervisorHeaderBar
            activeTab={activeTab}
            currentSupervisor={currentSupervisor}
            isLoading={isLoading}
            onRefresh={loadOverview}
            pendingApprovalsCount={pendingApprovalsCount}
            abnormalCount={abnormalCount}
            approvedCount={approvedCount}
            totalCount={totalCount}
          />

          {/* TAB: APPROVALS (Persetujuan Checklist) */}
          {activeTab === "approvals" && (
            <SupervisorApprovalsTab
              viewMode={viewMode}
              setViewMode={setViewMode}
              dbLines={dbLines}
              allListItems={allListItems}
              filteredListItems={filteredListItems}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedLineFilter={selectedLineFilter}
              setSelectedLineFilter={setSelectedLineFilter}
              selectedDeptFilter={selectedDeptFilter}
              setSelectedDeptFilter={setSelectedDeptFilter}
              selectedStatusFilter={selectedStatusFilter}
              setSelectedStatusFilter={setSelectedStatusFilter}
              isSubmittingApproval={isSubmittingApproval}
              onBatchApproveLine={handleBatchApproveLine}
              onSelectReview={(member) => {
                setReviewTarget(member);
                setFeedbackNote(member.submission?.supervisorNotes || "");
              }}
            />
          )}

          {/* TAB: MONITORING LINI */}
          {activeTab === "lines" && (
            <SupervisorLinesTab
              dbLines={dbLines}
              onViewInApprovals={() => {
                setActiveTab("approvals");
                setViewMode("grouped");
              }}
            />
          )}

          {/* TAB: LOG SUPERVISOR */}
          {activeTab === "log" && (
            <SupervisorProfileTab
              currentSupervisor={currentSupervisor}
              subordinatesCount={totalCount}
              onLogout={handleLogout}
            />
          )}
        </div>
      </main>

      {/* 5. Detail Inspection Modal */}
      <SupervisorReviewModal
        reviewTarget={reviewTarget}
        feedbackNote={feedbackNote}
        setFeedbackNote={setFeedbackNote}
        isSubmittingApproval={isSubmittingApproval}
        onClose={() => setReviewTarget(null)}
        onApprove={handleApproveSubmission}
      />
    </div>
  );
}
