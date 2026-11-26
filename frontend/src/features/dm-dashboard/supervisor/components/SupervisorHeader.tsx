"use client";
import { useUiText } from "@/locales/useUiText";


import { departmentLabel } from "../../departments";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
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

function supervisorHeading(
  pathname: string,
  dept?: string
): { title: string; desc: string } {
  if (pathname.startsWith(SUPERVISOR_ROUTES.approvals)) {
    return { title: "Persetujuan Checklist", desc: "Tinjau & setujui papercard harian lini." };
  }
  if (pathname.startsWith(SUPERVISOR_ROUTES.lines)) {
    return { title: "Monitoring Lini", desc: "Pantau status inspeksi & aktivitas tiap lini." };
  }
  if (pathname.startsWith(SUPERVISOR_ROUTES.workshopMeeting)) {
    return { title: "Workshop Meeting", desc: "Presensi & catatan rapat tingkat workshop." };
  }
  if (pathname.startsWith(SUPERVISOR_ROUTES.escalations)) {
    return { title: "Eskalasi", desc: "Masalah melewati due date yang perlu tindak lanjut." };
  }
  if (pathname.startsWith(SUPERVISOR_ROUTES.fiveWhy)) {
    return { title: "5Why & PDCA", desc: "Analisis akar masalah & tindakan perbaikan." };
  }
  if (pathname.startsWith(SUPERVISOR_ROUTES.myProblems)) {
    return { title: "Masalah Saya", desc: "Daftar masalah yang ditugaskan kepada Anda." };
  }
  if (pathname.startsWith(SUPERVISOR_ROUTES.history)) {
    return { title: "Riwayat Checklist", desc: "Arsip papercard & persetujuan harian." };
  }
  const deptName = dept ? departmentLabel(dept) : null;
  return {
    title: "Dashboard Supervisor",
    desc: deptName ? `Ringkasan persetujuan & lini · ${deptName}` : "Ringkasan persetujuan, eskalasi & lini.",
  };
}

export function SupervisorHeader() {
  const { text: uiText, locale: uiLocale } = useUiText();
  const pathname = usePathname();
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
  const heading = supervisorHeading(pathname, currentSupervisor.dept);

  return (
    <header className="dml-header">
      <div className="dml-header__start">
        <SidebarToggle />
        <div className="dml-header__heading">
          <h1 className="dml-header__title">{uiText(heading.title)}</h1>
          <p className="dml-header__desc">{uiText(heading.desc)}</p>
        </div>
      </div>
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
