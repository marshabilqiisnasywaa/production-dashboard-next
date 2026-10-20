import type { RoleKey } from "./types";

export type TimelineStatus = "done" | "live" | "upcoming" | "overdue";

export interface TimelineRole {
  key: RoleKey;
  label: string;
  submitted: boolean;
}

export interface TimelineSession {
  id: string;
  order: number;
  name: string;
  time: string; // display text, e.g. "07:45–08:00" or "10:00"
  status: TimelineStatus;
  statusLabel: string;
  /** One-line result, only shown when the session is done */
  summary?: string;
  /** Pre-Management only: who has already sent today's papercard */
  papercard?: { roles: TimelineRole[]; submittedCount: number };
  /** Meeting sessions only. null = not available yet (hidden in the UI) */
  attendance?: { present: number; total: number } | null;
  cta?: { label: string; href: string };
}

export interface TimelineModel {
  sessions: TimelineSession[];
  /** The one session that is expanded (the one the Leader should care about right now) */
  focusId: string | null;
  doneCount: number;
  /** e.g. "Berikutnya: During-Management 1 · dalam 1j 12m" */
  nextHint: string | null;
}
