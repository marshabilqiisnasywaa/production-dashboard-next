/**
 * Turns today's live data (papercard submissions + meeting sessions) into the
 * view-model used by <SessionTimeline />. All the "which session is current?"
 * rules live here, so the component stays purely visual.
 */
import type { DmMeetingSession, DmPapercardSubmission } from "../api";
import { msUntil } from "./papercard/utils";
import { LEADER_ROUTES } from "./routes";
import type { RoleKey } from "./types";
import type { TimelineModel, TimelineRole, TimelineSession } from "./timelineTypes";

interface ScheduleEntry {
  id: string;
  name: string;
  label: string;
  start: string; // HH:mm
}

const SCHEDULE: ScheduleEntry[] = [
  { id: "pre", name: "Pre-Management", label: "07:45–08:00", start: "07:45" },
  { id: "during-1", name: "During-Management 1", label: "10:00", start: "10:00" },
  { id: "during-2", name: "During-Management 2", label: "14:00", start: "14:00" },
  { id: "post", name: "Post-Management", label: "16:00", start: "16:00" },
];

/** Papercard can be sent until this time, after that it counts as NG (Telat) */
const PAPERCARD_DEADLINE = "09:00";

const ROLES: { dept: string; key: RoleKey; label: string }[] = [
  { dept: "PROD", key: "leader", label: "Leader" },
  { dept: "ME", key: "me", label: "ME" },
  { dept: "PE", key: "pe", label: "PE" },
  { dept: "QC", key: "ipqc", label: "IPQC" },
];

interface Input {
  now: Date;
  leaderSubmitted: boolean;
  submissions: DmPapercardSubmission[];
  /** Today's meeting sessions from the API, in order: During 1, During 2, Post */
  sessions: DmMeetingSession[];
}

function formatDuration(ms: number): string {
  const totalMin = Math.max(1, Math.round(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} menit`;
  return m === 0 ? `${h} jam` : `${h}j ${m}m`;
}

/**
 * TODO: fill in once we know where attendance lives in DmMeetingSession
 * (e.g. session.attendances.length). Returning null simply hides the line.
 */
function getAttendance(_session: DmMeetingSession | undefined): { present: number; total: number } | null {
  return null;
}

export function buildTimeline({ now, leaderSubmitted, submissions, sessions }: Input): TimelineModel {
  const built: TimelineSession[] = SCHEDULE.map((entry, index) => {
    const base = { id: entry.id, order: index + 1, name: entry.name, time: entry.label };

    /* ---------- Pre-Management: driven by the Leader's own papercard ---------- */
    if (entry.id === "pre") {
      const roles: TimelineRole[] = ROLES.map((r) => ({
        key: r.key,
        label: r.label,
        submitted: submissions.some((s) => String(s.department) === r.dept),
      }));
      const submittedCount = roles.filter((r) => r.submitted).length;
      const papercard = { roles, submittedCount };
      const cta = { label: "Isi Papercard", href: LEADER_ROUTES.papercard };

      if (leaderSubmitted) {
        return {
          ...base,
          status: "done",
          statusLabel: "Selesai",
          summary: `Papercard Leader terkirim · ${submittedCount}/${roles.length} role`,
          papercard,
        };
      }
      if (msUntil(now, entry.start) > 0) {
        return { ...base, status: "upcoming", statusLabel: "Belum mulai", papercard };
      }
      if (msUntil(now, PAPERCARD_DEADLINE) > 0) {
        return { ...base, status: "live", statusLabel: "Berlangsung", papercard, cta };
      }
      return { ...base, status: "overdue", statusLabel: "Belum diisi", papercard, cta: { ...cta, label: "Isi sekarang" } };
    }

    /* ---------- During / Post: driven by meeting sessions ---------- */
    // Sessions come from the API in order (During 1, During 2, Post)
    const session = sessions[index - 1];
    const completed = session?.status === "completed";
    const next = SCHEDULE[index + 1];
    const cta = { label: "Buka ruang sesi", href: LEADER_ROUTES.meeting };

    if (completed) {
      return { ...base, status: "done", statusLabel: "Selesai", summary: "Sesi sudah dilaksanakan" };
    }
    if (msUntil(now, entry.start) > 0) {
      return { ...base, status: "upcoming", statusLabel: "Belum mulai" };
    }
    // started but not completed: current slot until the next session begins, then it was missed
    const nextStarted = next ? msUntil(now, next.start) <= 0 : false;
    if (nextStarted) {
      return { ...base, status: "overdue", statusLabel: "Terlewat" };
    }
    return { ...base, status: "live", statusLabel: "Berlangsung", attendance: getAttendance(session), cta };
  });

  const live = built.find((s) => s.status === "live");
  const upcoming = built.find((s) => s.status === "upcoming");
  const overdue = built.find((s) => s.status === "overdue");
  const focus = live ?? upcoming ?? overdue ?? null;

  const nextHint =
    !live && upcoming
      ? `Berikutnya: ${upcoming.name} · dalam ${formatDuration(
          msUntil(now, SCHEDULE.find((s) => s.id === upcoming.id)!.start),
        )}`
      : null;

  return {
    sessions: built,
    focusId: focus?.id ?? null,
    doneCount: built.filter((s) => s.status === "done").length,
    nextHint,
  };
}
