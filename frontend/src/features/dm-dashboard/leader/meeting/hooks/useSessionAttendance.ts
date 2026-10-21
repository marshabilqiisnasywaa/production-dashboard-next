"use client";

import { useEffect } from "react";
import { meetingApi } from "../../../api";
import type { GuestRecord, MeetingMember } from "../types";

const POLL_MS = 4000;

interface Options {
  sessionDbId: number | null;
  active: boolean;
  members: MeetingMember[];
  onMember: (memberId: string, at: string) => void;
  onGuest: (guest: GuestRecord) => void;
}

/** Pulls the session's attendance from the server so scans made elsewhere show up here too. */
export function useSessionAttendance({ sessionDbId, active, members, onMember, onGuest }: Options) {
  useEffect(() => {
    if (!active || sessionDbId === null) return;
    const id = sessionDbId;
    let alive = true;

    async function pull() {
      try {
        const session = await meetingApi.getSession(id);
        if (!alive) return;
        for (const a of session.attendances) {
          if (a.status !== "present" || !a.employeeNo) continue;
          const member = members.find((m) => m.employeeNo === a.employeeNo);
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
        }
      } catch {
        // the next tick tries again
      }
    }

    pull();
    const timer = setInterval(pull, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [active, sessionDbId, members, onMember, onGuest]);
}
