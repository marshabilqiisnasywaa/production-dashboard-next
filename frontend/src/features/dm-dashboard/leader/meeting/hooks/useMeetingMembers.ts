"use client";

import { useEffect, useState } from "react";
import { accountApi, publicApi } from "../../../api";
import { FALLBACK_MEMBERS } from "../mockData";
import type { MeetingMember } from "../types";
import { initialsOf } from "../utils";

const DEPT_LABEL: Record<string, string> = { PROD: "Produksi", ME: "ME", PE: "PE", QC: "IPQC" };

/** Members of the Leader's DM team. Falls back to mock members if the API is unavailable. */
export function useMeetingMembers(): MeetingMember[] {
  const [members, setMembers] = useState<MeetingMember[]>(FALLBACK_MEMBERS);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const me = await accountApi.me();
        if (!alive || !me?.line?.slug) return;
        const board = await publicApi.board(me.line.slug);
        if (!alive || !board?.members?.length) return;

        const lineCode = me.line.code;
        const mapped: MeetingMember[] = board.members.map((bm) => {
          const name = bm.name || "Anggota Tim";
          return {
            id: String(bm.id),
            name,
            initials: initialsOf(name),
            roleLabel: DEPT_LABEL[String(bm.dept ?? "")] ?? (bm.position || "Anggota"),
            employeeNo: bm.employeeId ?? undefined,
            dept: bm.dept ?? undefined,
            position: bm.position ?? undefined,
            lineCode,
            photoUrl: bm.photoUrl ?? null,
          };
        });

        // the Leader runs the meeting and must be on the list even if the board omits them
        const leaderName = me.name || "";
        const meName = leaderName.toLowerCase();
        if (meName && !mapped.some((m) => m.name.toLowerCase() === meName)) {
          mapped.unshift({ id: "leader", name: leaderName, initials: initialsOf(leaderName), roleLabel: "Leader Line",
            employeeNo: me.username,
            dept: me.dept ?? undefined,
            position: me.position ?? undefined,
            lineCode,
            photoUrl: me.photoUrl ?? null,
          });
        }
        setMembers(mapped);
      } catch {
        // keep fallback
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return members;
}
