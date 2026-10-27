"use client";

import { useEffect, useMemo, useState } from "react";
import { IconLogout } from "@/components/ui/icons";
import { setToken } from "../../api";
import { formatOverdue } from "../../leader/problems/utils";
import { NotificationBellButton } from "../../notifications/NotificationBellButton";
import type { DmAppNotification } from "../../notifications/types";
import { useSupervisor } from "../SupervisorProvider";
import { SUPERVISOR_ROUTES } from "../routes";

const pad = (n: number) => String(n).padStart(2, "0");

function parseTime(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function SupervisorHeader() {
  const [now, setNow] = useState<Date | null>(null);
  const { currentSupervisor, escalatedRows, allListItems } = useSupervisor();

  const headerNotifications = useMemo<DmAppNotification[]>(() => {
    const escalationNotifications: DmAppNotification[] = escalatedRows.map((row) => ({
      id: `escalation_${row.id}`,
      type: "escalation",
      severity: "urgent",
      title: "Masalah melewati due date",
      message: `${row.problem} · ${row.line} · PIC ${row.picName} · terlambat ${formatOverdue(row.overdueMs)}`,
      timeLabel: `Terlambat ${formatOverdue(row.overdueMs)}`,
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
            ? `Papercard ${item.dept} dikirim ulang setelah revisi`
            : `Papercard ${item.dept} menunggu persetujuan`,
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

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    setToken(null);
    window.location.href = "/dm-dashboard/masuk";
  };

  const time = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : "--:--";
  const date = now
    ? now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const displayName = currentSupervisor.name || "Supervisor";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="dml-header">
      <div className="dml-header__time">
        <div>
          <strong>{time}</strong>
          <span>{date}</span>
        </div>
      </div>

      <div className="dml-header__right">
        <NotificationBellButton
          role="supervisor"
          dept={currentSupervisor.dept}
          lineId={0}
          lineName="Semua Lini"
          extraNotifications={headerNotifications}
        />
        <div className="dml-user dml-user--supervisor">
          <span className="dml-avatar">{initials}</span>
          <div className="dml-user__text">
            <strong>{displayName}</strong>
            <span className="dml-user__role">Supervisor</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="Keluar dari akun Supervisor"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 11px",
            borderRadius: "7px",
            border: "1px solid #fecdd3",
            background: "#fff1f2",
            color: "#e11d48",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            marginLeft: "6px",
            transition: "all 0.15s ease",
          }}
        >
          <IconLogout size={14} />
          <span>Keluar</span>
        </button>
      </div>
    </header>
  );
}

export default SupervisorHeader;
