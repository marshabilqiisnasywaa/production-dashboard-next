/**
 * The Leader's timeline model, trimmed for a member:
 * no team papercard chips, no "Buka ruang sesi" (only the Leader runs meetings),
 * and the Pre-Management action points to the MEMBER's papercard page.
 */
import type { TimelineModel, TimelineSession } from "../leader/timelineTypes";
import { MEMBER_ROUTES } from "./routes";

function forMember(s: TimelineSession): TimelineSession {
  const base: TimelineSession = {
    id: s.id,
    order: s.order,
    name: s.name,
    time: s.time,
    status: s.status,
    statusLabel: s.statusLabel,
    completed: s.completed,
    summary: s.summary,
  };
  if (s.id === "pre") {
    return {
      ...base,
      summary: s.summary?.replace(/Leader/g, "Anda"),
      cta: s.cta ? { label: s.cta.label, href: MEMBER_ROUTES.papercard } : undefined,
    };
  }
  return base;
}

export function toMemberTimeline(model: TimelineModel): TimelineModel {
  return { ...model, sessions: model.sessions.map(forMember) };
}
