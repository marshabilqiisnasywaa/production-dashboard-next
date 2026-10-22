"use client";

import { useEffect } from "react";
import { meetingApi } from "../../../api";
import type { AbsenceNote, AbsenceReason, GuestRecord, MeetingMember } from "../types";

const POLL_MS = 4000;

interface Options {
  sessionDbId: number | null;
  active: boolean;
  once?: boolean;
  restoreAbsent?: boolean;
  members: MeetingMember[];
  onMember: (memberId: string, at: string) => void;
  onGuest: (guest: GuestRecord) => void;
  onAbsent: (memberId: string, absence: AbsenceNote) => void;
}

/** Pulls the session's attendance from the server so scans and notes made elsewhere show up here too. */
export function useSessionAttendance({
  sessionDbId,
  active,
  once = false,
  restoreAbsent = false,
  members,
  onMember,
  onGuest,
  onAbsent,
}: Options) {
  useEffect(() => {
    if (!active || sessionDbId === null) return;
    const id = sessionDbId;
    let alive = true;

    async function pull() {
      try {
        const session = await meetingApi.getSession(id);
        if (!alive) return;
        for (const a of session.attendances) {
          if (!a.employeeNo) continue;
          const member = members.find((m) => m.employeeNo === a.employeeNo);
          if (a.status === "present") {
            if (member) {
              onMember(member.id, a.attendedAt);
            } else {
              onGuest({
                employeeNo: a.employeeNo,
                name: a.employeeName ?? "-",
                line: a.employeeLine ?? null,
                dept: a.department ?? null,
                position: a.position ?? null,
                at: a.attendedAt,
              });
            }
          } else if (restoreAbsent && member) {
            onAbsent(member.id, {
              reason: (a.absenceReason ?? "none") as AbsenceReason,
              note: a.absenceNote ?? "",
            });
          }
        }
      } catch {
        // the next tick tries again
      }
    }

    pull();
    const timer = once ? null : setInterval(pull, POLL_MS);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [active, once, restoreAbsent, sessionDbId, members, onMember, onGuest, onAbsent]);
}
