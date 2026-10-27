"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SupervisorApprovalsTab, SupervisorPageHeader } from "../components";
import { useSupervisor } from "../SupervisorProvider";
import type { DmSupervisorSubordinate } from "../../api";

function ApprovalsDeepLinkHandler() {
  const { overviewData, dbLines, allListItems, isLoading, openReview, showToast } =
    useSupervisor();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledTinjauRef = useRef<string | null>(null);

  const clearTinjauParam = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("tinjau");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const requestedId = searchParams?.get("tinjau");
    if (!requestedId) {
      handledTinjauRef.current = null;
      return;
    }
    if (isLoading || !overviewData) return;
    if (handledTinjauRef.current === requestedId) return;
    handledTinjauRef.current = requestedId;

    const submissionId = Number(requestedId);
    const targetMember =
      allListItems.find((member) => member.submission?.id === submissionId) ??
      dbLines
        .flatMap((line) => line.members)
        .find((member) => member.submission?.id === submissionId);
    const targetLine =
      dbLines.find((line) =>
        line.members.some((member) => member.submission?.id === submissionId),
      ) ?? dbLines.find((line) => line.lineId === targetMember?.lineId);
    const target = targetMember
      ? {
          ...targetMember,
          lineId: targetMember.lineId ?? targetLine?.lineId,
          lineName: targetMember.lineName ?? targetLine?.lineName,
        }
      : null;

    if (!target || target.submission?.approvalStatus !== "pending") {
      showToast("Papercard ini sudah ditinjau", "info");
      clearTinjauParam();
      return;
    }

    openReview(target);
    clearTinjauParam();

    window.setTimeout(() => {
      const card = document.querySelector<HTMLElement>(
        `[data-submission-id="${submissionId}"]`,
      );
      const lineGroup = card?.closest<HTMLElement>(".spv-line-group");
      if (!lineGroup) return;
      document
        .querySelectorAll<HTMLElement>(".spv-line-group.is-highlight")
        .forEach((element) => element.classList.remove("is-highlight"));
      lineGroup.scrollIntoView({ behavior: "smooth", block: "center" });
      lineGroup.classList.add("is-highlight");
      window.setTimeout(() => lineGroup.classList.remove("is-highlight"), 2200);
    }, 80);
  }, [
    searchParams,
    isLoading,
    overviewData,
    dbLines,
    allListItems,
    openReview,
    clearTinjauParam,
    showToast,
  ]);

  return null;
}

export default function SupervisorApprovalsPage() {
  const {
    currentSupervisor,
    dbLines,
    allListItems,
    pendingApprovalsCount,
    approvedCount,
    abnormalCount,
    isLoading,
    refresh,
    isSubmittingApproval,
    handleBatchApproveLine,
    openReview,
  } = useSupervisor();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLineFilter, setSelectedLineFilter] = useState("ALL");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");

  const totalCount = allListItems.length;
  const meta = `Dept ${currentSupervisor.dept} · ${dbLines.length} lini · ${totalCount} anggota tim`;

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedLineFilter !== "ALL" ||
    selectedDeptFilter !== "ALL" ||
    selectedStatusFilter !== "ALL";

  const matchesFilters = useCallback(
    (member: DmSupervisorSubordinate) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        member.name.toLowerCase().includes(query) ||
        member.employeeNo.toLowerCase().includes(query);
      const matchesLine =
        selectedLineFilter === "ALL" ||
        (member.lineId !== undefined && String(member.lineId) === selectedLineFilter);
      const matchesDept =
        selectedDeptFilter === "ALL" || member.dept === selectedDeptFilter;

      let matchesStatus = true;
      if (selectedStatusFilter === "PENDING") {
        matchesStatus = member.submission?.approvalStatus === "pending";
      } else if (selectedStatusFilter === "APPROVED") {
        matchesStatus = member.submission?.approvalStatus === "approved";
      } else if (selectedStatusFilter === "REVISION") {
        matchesStatus = member.submission?.approvalStatus === "rejected";
      } else if (selectedStatusFilter === "NG") {
        matchesStatus = Boolean(member.submission?.hasNg);
      } else if (selectedStatusFilter === "NOT_SUBMITTED") {
        matchesStatus = !member.submission;
      }

      return matchesSearch && matchesLine && matchesDept && matchesStatus;
    },
    [searchQuery, selectedDeptFilter, selectedLineFilter, selectedStatusFilter],
  );

  const filteredLines = useMemo(
    () =>
      dbLines
        .filter(
          (line) =>
            selectedLineFilter === "ALL" || String(line.lineId) === selectedLineFilter,
        )
        .map((line) => ({
          ...line,
          members: line.members.filter((member) =>
            matchesFilters({ ...member, lineId: line.lineId }),
          ),
        }))
        .filter((line) => line.members.length > 0 || !hasActiveFilters),
    [dbLines, hasActiveFilters, matchesFilters, selectedLineFilter],
  );

  const filteredMemberCount = filteredLines.reduce(
    (total, line) => total + line.members.length,
    0,
  );

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedLineFilter("ALL");
    setSelectedDeptFilter("ALL");
    setSelectedStatusFilter("ALL");
  }, []);

  return (
    <div className="dms-container">
      <Suspense fallback={null}>
        <ApprovalsDeepLinkHandler />
      </Suspense>
      <div className="dml-page-head">
        <SupervisorPageHeader
          title="Persetujuan Checklist"
          userName={currentSupervisor.name}
          meta={meta}
        />
        <div className="spv-page-toolbar">
          <div className="spv-inline-stats">
            {pendingApprovalsCount > 0 ? (
              <span
                className="spv-stat-pill spv-stat-pill--warning"
                title="Papercard menunggu verifikasi"
              >
                ⚡ <strong>{pendingApprovalsCount}</strong> Menunggu
              </span>
            ) : (
              <span className="spv-stat-pill spv-stat-pill--success">✓ Semua Tuntas</span>
            )}

            {abnormalCount > 0 && (
              <span className="spv-stat-pill spv-stat-pill--danger" title="Ada temuan abnormal (NG)">
                ⚠️ <strong>{abnormalCount}</strong> NG
              </span>
            )}

            <span className="spv-stat-pill spv-stat-pill--info" title="Jumlah disetujui">
              ✓ <strong>{approvedCount}</strong> Disetujui
            </span>

            <span className="spv-stat-pill spv-stat-pill--neutral" title="Total tim terdaftar">
              <strong>{totalCount}</strong> Anggota Tim
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            disabled={isLoading}
            className="spv-btn spv-btn--secondary spv-btn--sm"
            title="Muat ulang data terbaru dari database"
          >
            {isLoading ? "Memuat..." : "↻ Segarkan"}
          </button>
        </div>
      </div>

      <SupervisorApprovalsTab
        dbLines={dbLines}
        filteredLines={filteredLines}
        hasActiveFilters={hasActiveFilters}
        totalMemberCount={totalCount}
        onResetFilters={resetFilters}
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
        onSelectReview={openReview}
      />
    </div>
  );
}
