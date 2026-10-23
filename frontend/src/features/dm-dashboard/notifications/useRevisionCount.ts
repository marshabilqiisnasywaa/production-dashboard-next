"use client";

import { useEffect, useState } from "react";
import { papercardApi } from "../api";
import { PAPERCARD_CHANGED_EVENT, revisionSubmissionsFor } from "./revisions";

interface RevisionCountParams {
  lineId?: number | null;
  dept?: string | null;
  role?: string | null;
}

export function useRevisionCount({ lineId, dept, role }: RevisionCountParams): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!lineId || lineId <= 0 || !dept || (role !== "leader" && role !== "member")) {
      setCount(0);
      return;
    }

    const targetLineId = lineId;
    const targetDept = dept;
    const targetRole = role;
    let cancelled = false;

    const load = () => {
      const today = new Date().toISOString().slice(0, 10);
      papercardApi
        .listSubmissions({ lineId: targetLineId, date: today })
        .then((submissions) => {
          if (cancelled) return;
          setCount(revisionSubmissionsFor(submissions, targetDept, targetRole).length);
        })
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, 45_000);
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") load();
    };

    document.addEventListener("visibilitychange", refreshOnVisible);
    window.addEventListener("focus", load);
    window.addEventListener(PAPERCARD_CHANGED_EVENT, load);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshOnVisible);
      window.removeEventListener("focus", load);
      window.removeEventListener(PAPERCARD_CHANGED_EVENT, load);
    };
  }, [lineId, dept, role]);

  return count;
}
