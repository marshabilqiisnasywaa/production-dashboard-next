"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  accountApi,
  papercardApi,
  type DmMe,
  type DmSupervisorLine,
  type DmSupervisorOverview,
  type DmSupervisorSubordinate,
} from "../api";
import type { ProblemRow } from "../leader/problems/types";
import { useEscalations } from "./hooks/useEscalations";
import type { SupervisorInfo, ToastMessage } from "./types";

interface SupervisorContextValue {
  me: DmMe | null;
  loadingAccount: boolean;
  overviewData: DmSupervisorOverview | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  currentSupervisor: SupervisorInfo;
  dbLines: DmSupervisorLine[];
  allListItems: DmSupervisorSubordinate[];
  escalatedRows: ProblemRow[];
  allProblemRows: ProblemRow[];
  escalatedCount: number;
  escalationsError: string | null;
  escalationsReady: boolean;
  refreshEscalations: () => Promise<void>;
  totalCount: number;
  submittedCount: number;
  pendingApprovalsCount: number;
  approvedCount: number;
  abnormalCount: number;
  toastMessage: ToastMessage | null;
  showToast: (text: string, type?: ToastMessage["type"]) => void;
  dismissToast: () => void;
  reviewTarget: DmSupervisorSubordinate | null;
  feedbackNote: string;
  setFeedbackNote: (value: string) => void;
  isSubmittingApproval: boolean;
  openReview: (target: DmSupervisorSubordinate) => void;
  closeReview: () => void;
  handleApproveSubmission: (
    target: DmSupervisorSubordinate,
    newStatus: "approved" | "rejected",
  ) => Promise<void>;
  handleBatchApproveLine: (line: DmSupervisorLine) => Promise<void>;
}

const SupervisorContext = createContext<SupervisorContextValue | null>(null);

export function SupervisorProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<DmMe | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [overviewData, setOverviewData] = useState<DmSupervisorOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<DmSupervisorSubordinate | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const showToast = useCallback(
    (text: string, type: "success" | "error" | "info" = "success") => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToastMessage({ text, type });
      toastTimer.current = setTimeout(() => setToastMessage(null), 3500);
    },
    [],
  );

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(null);
  }, []);

  useEffect(() => {
    let alive = true;
    accountApi
      .me()
      .then((account) => {
        if (!alive) return;
        if (account?.mustChangePassword) {
          window.location.href = "/dm-dashboard/akun";
          return;
        }
        setMe(account);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoadingAccount(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

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
  }, [showToast, todayStr]);

  const refreshQuietly = useCallback(async () => {
    try {
      const data = await papercardApi.supervisorOverview(todayStr);
      setOverviewData(data);
    } catch {}
  }, [todayStr]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshQuietly();
    }, 30_000);

    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") refreshQuietly();
    };

    window.addEventListener("focus", refreshQuietly);
    document.addEventListener("visibilitychange", refreshOnVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshQuietly);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [refreshQuietly]);

  const dbLines = useMemo<DmSupervisorLine[]>(() => {
    return overviewData?.lines || [];
  }, [overviewData]);

  const allListItems = useMemo<DmSupervisorSubordinate[]>(() => {
    return overviewData?.mySubordinates || [];
  }, [overviewData]);

  const {
    rows: escalatedRows,
    allRows: allProblemRows,
    count: escalatedCount,
    error: escalationsError,
    ready: escalationsReady,
    refresh: refreshEscalations,
  } = useEscalations(allListItems, dbLines);

  const totalCount = allListItems.length;
  const submittedCount = allListItems.filter((item) => Boolean(item.submission)).length;
  const pendingApprovalsCount = allListItems.filter(
    (item) => item.submission?.approvalStatus === "pending",
  ).length;
  const approvedCount = allListItems.filter(
    (item) => item.submission?.approvalStatus === "approved",
  ).length;
  const abnormalCount = allListItems.filter((item) => item.submission?.hasNg).length;

  const currentSupervisor = useMemo<SupervisorInfo>(() => {
    const supervisor = overviewData?.supervisor;
    return {
      name: supervisor?.name || me?.name || me?.username || "Supervisor",
      employeeNo: supervisor?.employeeNo || "-",
      dept: supervisor?.dept || me?.dept || "PROD",
    };
  }, [me, overviewData]);

  const handleApproveSubmission = useCallback(
    async (target: DmSupervisorSubordinate, newStatus: "approved" | "rejected") => {
      if (!target.submission?.id) {
        showToast("Karyawan ini belum mengirimkan berkas papercard untuk diverifikasi.", "info");
        return;
      }

      setIsSubmittingApproval(true);
      try {
        await papercardApi.approve(target.submission.id, {
          approvalStatus: newStatus,
          supervisorNotes:
            feedbackNote ||
            (newStatus === "approved"
              ? "Disetujui oleh Supervisor."
              : "Perlu perbaikan segera."),
        });
        await loadOverview();

        showToast(
          newStatus === "approved"
            ? `Papercard ${target.name} (${target.dept}) berhasil disetujui!`
            : `Permintaan revisi berhasil dikirim ke ${target.name}.`,
          "success",
        );
        setReviewTarget(null);
        setFeedbackNote("");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Kesalahan jaringan";
        showToast(`Gagal memproses persetujuan: ${message}`, "error");
      } finally {
        setIsSubmittingApproval(false);
      }
    },
    [feedbackNote, loadOverview, showToast],
  );

  const handleBatchApproveLine = useCallback(
    async (line: DmSupervisorLine) => {
      const pendingSubs = line.members
        .map((member) => member.submission)
        .filter(
          (submission): submission is NonNullable<typeof submission> =>
            Boolean(submission && submission.approvalStatus === "pending"),
        );

      if (pendingSubs.length === 0) return;

      setIsSubmittingApproval(true);
      try {
        for (const submission of pendingSubs) {
          await papercardApi.approve(submission.id, {
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
    },
    [loadOverview, showToast],
  );

  const openReview = useCallback((target: DmSupervisorSubordinate) => {
    setReviewTarget(target);
    setFeedbackNote(target.submission?.supervisorNotes || "");
  }, []);

  const closeReview = useCallback(() => {
    setReviewTarget(null);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([loadOverview(), refreshEscalations()]);
  }, [loadOverview, refreshEscalations]);

  const value = useMemo<SupervisorContextValue>(
    () => ({
      me,
      loadingAccount,
      overviewData,
      isLoading,
      refresh: refreshAll,
      currentSupervisor,
      dbLines,
      allListItems,
      escalatedRows,
      allProblemRows,
      escalatedCount,
      escalationsError,
      escalationsReady,
      refreshEscalations,
      totalCount,
      submittedCount,
      pendingApprovalsCount,
      approvedCount,
      abnormalCount,
      toastMessage,
      showToast,
      dismissToast,
      reviewTarget,
      feedbackNote,
      setFeedbackNote,
      isSubmittingApproval,
      openReview,
      closeReview,
      handleApproveSubmission,
      handleBatchApproveLine,
    }),
    [
      me,
      loadingAccount,
      overviewData,
      isLoading,
      loadOverview,
      currentSupervisor,
      dbLines,
      allListItems,
      escalatedRows,
      allProblemRows,
      escalatedCount,
      escalationsError,
      escalationsReady,
      refreshEscalations,
      totalCount,
      submittedCount,
      pendingApprovalsCount,
      approvedCount,
      abnormalCount,
      toastMessage,
      showToast,
      dismissToast,
      reviewTarget,
      feedbackNote,
      isSubmittingApproval,
      openReview,
      closeReview,
      handleApproveSubmission,
      handleBatchApproveLine,
    ],
  );

  return <SupervisorContext.Provider value={value}>{children}</SupervisorContext.Provider>;
}

export function useSupervisor(): SupervisorContextValue {
  const context = useContext(SupervisorContext);
  if (!context) throw new Error("useSupervisor must be used inside <SupervisorProvider>");
  return context;
}
