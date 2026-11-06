"use client";
import { useUiText } from "@/locales/useUiText";


import { departmentLabel } from "../../departments";
import { useMemo } from "react";
import LanguageMenu from "@/components/ui/LanguageMenu";
import { SidebarToggle } from "@/components/ui/SidebarProvider";
import { setToken } from "../../api";
import { formatOverdue } from "../../leader/problems/utils";
import { NotificationBellButton } from "../../notifications/NotificationBellButton";
import type { DmAppNotification } from "../../notifications/types";
import { UserMenu } from "../../shared/UserMenu";
import { useSupervisor } from "../SupervisorProvider";
import { SUPERVISOR_ROUTES } from "../routes";

const pad = (n: number) => String(n).padStart(2, "0");

function parseTime(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function SupervisorHeader() {
  const { text: uiText, locale: uiLocale } = useUiText();
  const { currentSupervisor, escalatedRows, allListItems } = useSupervisor();

  const headerNotifications = useMemo<DmAppNotification[]>(() => {
    const escalationNotifications: DmAppNotification[] = escalatedRows.map((row) => ({
      id: `escalation_${row.id}`,
      type: "escalation",
      severity: "urgent",
      title: "Masalah melewati due date",
      message: `${row.problem} · ${row.line} · PIC ${row.picName} · terlambat ${formatOverdue(row.overdueMs, uiLocale)}`,
      timeLabel: `Terlambat ${formatOverdue(row.overdueMs, uiLocale)}`,
      actionLabel: "Lihat Eskalasi",
      actionUrl: SUPERVISOR_ROUTES.escalations,
      createdAt: new Date(row.due).getTime(),
    }));

    const approvalNotifications = allListItems.flatMap<DmAppNotification>((item) => {
      const submission = item.submission;
      if (!submission || submission.approvalStatus !== "pending" || !submission.submittedAt) {
        return [];
      }

      const submittedAt = parseTime(submission.submittedAt);
      if (!submittedAt) return [];

      const timeLabel = `${pad(submittedAt.getHours())}:${pad(submittedAt.getMinutes())}`;
      const lineLabel = item.lineName || "Lini";
      const wasRevised = Boolean(submission.supervisorNotes?.trim() || submission.approvedAt);

      return [
        {
          id: `approval_${submission.id}_${submission.submittedAt}`,
          type: "papercard",
          severity: submission.hasNg ? "warning" : "info",
          title: wasRevised
            ? `Papercard ${departmentLabel(item.dept)} dikirim ulang setelah revisi`
            : `Papercard ${departmentLabel(item.dept)} menunggu persetujuan`,
          message: `${item.name} (${lineLabel}) sudah submit papercard pukul ${timeLabel}.${
            submission.hasNg ? " Ada temuan NG." : ""
          }`,
          timeLabel,
          actionLabel: "Tinjau Papercard",
          actionUrl: `${SUPERVISOR_ROUTES.approvals}?tinjau=${submission.id}`,
          submissionId: submission.id,
          createdAt: submittedAt.getTime(),
        },
      ];
    });

    return [...approvalNotifications, ...escalationNotifications].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  }, [allListItems, escalatedRows]);

  const handleLogout = () => {
    setToken(null);
    window.location.href = "/dm-dashboard/masuk";
  };

  const displayName = currentSupervisor.name || "Supervisor";

  return (
    <header className="dml-header">
      <SidebarToggle />
      <div className="dml-header__right">
        <LanguageMenu />
        <NotificationBellButton
          role="supervisor"
          dept={currentSupervisor.dept}
          lineId={0}
          lineName="Semua Lini"
          extraNotifications={headerNotifications}
        />
        <UserMenu name={displayName} role={uiText("Supervisor")} onLogout={handleLogout} />
      </div>
    </header>
  );
}

export default SupervisorHeader;
