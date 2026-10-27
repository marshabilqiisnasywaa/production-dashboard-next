import type { DmMeetingSession, DmPapercardSubmission, DmPapercardTemplate } from "../api";
import { LEADER_ROUTES } from "./routes";
import type { RoleKey } from "./types";
import type { TimelineModel, TimelineRole, TimelineSession } from "./timelineTypes";

interface Input {
  now: Date;
  today: string;
  leaderSubmission: DmPapercardSubmission | null;
  leaderTemplate: DmPapercardTemplate | null;
  submissions: DmPapercardSubmission[];
  sessions: DmMeetingSession[];
}

const ROLES: { dept: string; key: RoleKey; label: string }[] = [
  { dept: "PROD", key: "leader", label: "Leader" },
  { dept: "ME", key: "me", label: "ME" },
  { dept: "PE", key: "pe", label: "PE" },
  { dept: "QC", key: "ipqc", label: "IPQC" },
];

function scheduleTime(date: string, time?: string): number {
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) return Number.NaN;
  return new Date(`${date}T${time}+07:00`).getTime();
}

function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${minutes} menit`;
  return rest === 0 ? `${hours} jam` : `${hours}j ${rest}m`;
}

export function buildTimeline({ now, today, leaderSubmission, leaderTemplate, submissions, sessions }: Input): TimelineModel {
  const nowMs = now.getTime();
  const startById = new Map<string, number>();
  const roles: TimelineRole[] = ROLES.map((role) => ({
    key: role.key, label: role.label,
    submitted: submissions.some((submission) => submission.department === role.dept),
  }));
  const papercard = { roles, submittedCount: roles.filter((role) => role.submitted).length };
  const start = scheduleTime(today, leaderTemplate?.windowStart);
  const end = scheduleTime(today, leaderTemplate?.windowEnd);
  const validWindow = Number.isFinite(start) && Number.isFinite(end) && end >= start;
  const preBase = {
    id: "pre", order: 1, name: "Pre-Management",
    time: validWindow ? `${leaderTemplate!.windowStart} - ${leaderTemplate!.windowEnd}` : "Jadwal belum tersedia",
    papercard,
  };
  const papercardCta = { label: "Isi Papercard", href: LEADER_ROUTES.papercard };
  let pre: TimelineSession;
  if (!validWindow) {
    pre = {
      ...preBase, status: "upcoming", statusLabel: "Jadwal belum tersedia",
      completed: Boolean(leaderSubmission),
      summary: leaderSubmission
        ? "Papercard sudah dikirim. Ketepatan waktu belum dapat dinilai."
        : "Template papercard Leader belum memiliki rentang waktu valid.",
    };
  } else if (leaderSubmission) {
    const sentAt = new Date(leaderSubmission.submittedAt).getTime();
    if (!Number.isFinite(sentAt)) {
      pre = {
        ...preBase, status: "done", statusLabel: "Terkirim", completed: true,
        summary: "Waktu kirim tidak valid. Ketepatan waktu belum dapat dinilai.",
      };
    } else {
      const late = sentAt > end;
      const sentText = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      }).format(new Date(sentAt));
      pre = {
        ...preBase, status: late ? "overdue" : "done",
        statusLabel: late ? "Terlambat" : "Selesai", completed: true,
        summary: `Papercard Leader dikirim pukul ${sentText} WIB${late ? ", melewati batas waktu." : "."}`,
      };
    }
  } else if (nowMs < start) {
    startById.set("pre", start);
    pre = { ...preBase, status: "upcoming", statusLabel: "Belum mulai" };
  } else if (nowMs <= end) {
    pre = { ...preBase, status: "live", statusLabel: "Berlangsung", cta: papercardCta };
  } else {
    pre = {
      ...preBase, status: "overdue", statusLabel: "Terlambat",
      summary: "Batas waktu sudah lewat. Papercard Leader belum dikirim.",
      cta: { ...papercardCta, label: "Isi sekarang" },
    };
  }

  const meetings: TimelineSession[] = [...sessions]
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
    .map((session, index) => {
      const id = `session-${session.id}`;
      startById.set(id, scheduleTime(session.date, session.scheduledTime));
      const base = {
        id, order: index + 2, name: session.label || `Sesi ${session.sessionNumber}`,
        time: session.scheduledTime,
      };
      const cta = { label: "Buka ruang sesi", href: LEADER_ROUTES.meeting };
      if (session.status === "completed") {
        return { ...base, status: "done", statusLabel: "Selesai", completed: true, summary: "Sesi sudah dilaksanakan" };
      }
      if (session.status === "in_progress") {
        return { ...base, status: "live", statusLabel: "Berlangsung", cta };
      }
      return { ...base, status: "upcoming", statusLabel: "Belum mulai", cta };
    });

  const built = [pre, ...meetings];
  const live = built.find((session) => session.status === "live");
  const overdue = built.find((session) => session.status === "overdue" && !session.completed);
  const upcoming = built.find((session) =>
    session.status === "upcoming" && !session.completed && Number.isFinite(startById.get(session.id)),
  );
  const focus = live ?? overdue ?? upcoming ?? null;
  const remainingMs = upcoming ? (startById.get(upcoming.id) ?? nowMs) - nowMs : 0;
  const nextHint = !live && upcoming
    ? remainingMs > 0
      ? `Berikutnya: ${upcoming.name} · dalam ${formatDuration(remainingMs)}`
      : `${upcoming.name} belum dimulai`
    : null;
  return {
    sessions: built, focusId: focus?.id ?? null,
    doneCount: built.filter((session) => session.completed).length, nextHint,
  };
}
