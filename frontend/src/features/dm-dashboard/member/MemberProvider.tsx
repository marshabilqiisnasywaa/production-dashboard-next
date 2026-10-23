"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { accountApi, type DmMe } from "../api";
import { profileFromMe, type MemberProfile } from "./memberProfile";

export interface MemberContextValue {
  me: DmMe | null;
  profile: MemberProfile;
  activeLine: DmMe["line"];
  setActiveLine: (line: NonNullable<DmMe["line"]>) => void;
  availableLines: NonNullable<DmMe["line"]>[];
  loading: boolean;
}

const MemberContext = createContext<MemberContextValue | null>(null);

/** Loads the logged-in account ONCE and shares it with the header, sidebar and every member page. */
export function MemberProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<DmMe | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    accountApi
      .me()
      .then((account) => {
        if (!alive) return;
        if (account?.mustChangePassword) {
          window.location.href = "/dm-dashboard/akun";
          return;
        }
        setMe(account);
        const savedLineId = typeof window !== "undefined" ? localStorage.getItem("dm_member_line_id") : null;
        if (savedLineId && account?.lines?.some((l) => l.id === Number(savedLineId))) {
          setSelectedLineId(Number(savedLineId));
        }
      })
      .catch(() => {
        // not logged in / API down: pages fall back to the demo profile
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const availableLines = useMemo(() => {
    if (me?.lines && me.lines.length > 0) return me.lines;
    return me?.line ? [me.line] : [];
  }, [me]);

  const activeLine = useMemo(() => {
    if (availableLines.length === 0) return null;
    if (selectedLineId !== null) {
      const found = availableLines.find((l) => l.id === selectedLineId);
      if (found) return found;
    }
    return availableLines[0];
  }, [availableLines, selectedLineId]);

  const setActiveLine = (line: NonNullable<DmMe["line"]>) => {
    setSelectedLineId(line.id);
    try {
      localStorage.setItem("dm_member_line_id", String(line.id));
    } catch {}
  };

  const profile = useMemo(() => profileFromMe(me, activeLine), [me, activeLine]);
  const value = useMemo(
    () => ({ me, profile, activeLine, setActiveLine, availableLines, loading }),
    [me, profile, activeLine, availableLines, loading]
  );

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
}

export function useMember(): MemberContextValue {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error("useMember must be used inside <MemberProvider>");
  return ctx;
}
