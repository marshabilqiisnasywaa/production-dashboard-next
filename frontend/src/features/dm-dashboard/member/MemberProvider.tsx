"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { accountApi, type DmMe } from "../api";
import { profileFromMe, type MemberProfile } from "./memberProfile";

interface MemberContextValue {
  me: DmMe | null;
  profile: MemberProfile;
  loading: boolean;
}

const MemberContext = createContext<MemberContextValue | null>(null);

/** Loads the logged-in account ONCE and shares it with the header, sidebar and every member page. */
export function MemberProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<DmMe | null>(null);
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

  const profile = useMemo(() => profileFromMe(me), [me]);
  const value = useMemo(() => ({ me, profile, loading }), [me, profile, loading]);

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
}

export function useMember(): MemberContextValue {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error("useMember must be used inside <MemberProvider>");
  return ctx;
}
