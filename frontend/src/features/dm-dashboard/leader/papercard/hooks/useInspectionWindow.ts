"use client";

import { useState } from "react";
import { useNow } from "../../hooks/useNow";
import type { WindowState } from "../types";
import { getWindowState, msUntil } from "../utils";

interface Options {
  start: string; // "HH:mm"
  end: string;
  /** Dev only: pretend the window is in this state */
  simulate?: Exclude<WindowState, "loading"> | null;
}

export interface WindowInfo {
  state: WindowState;
  remainingMs: number;
  now: Date | null;
}

const DEMO_REMAINING_MS = (17 * 60 + 44) * 1000;

/** Tells whether the Leader's inspection window (FR-3.6) is before / open / closed, with a live countdown. */
export function useInspectionWindow({ start, end, simulate = null }: Options): WindowInfo {
  const now = useNow(1000);
  const [mountedAt] = useState(() => Date.now()); // only read on the client, after `now` exists

  if (!now) return { state: "loading", remainingMs: 0, now: null };

  if (simulate) {
    const remaining = simulate === "open" ? Math.max(0, DEMO_REMAINING_MS - (now.getTime() - mountedAt)) : 0;
    return { state: simulate, remainingMs: remaining, now };
  }

  const state = getWindowState(now, start, end);
  return { state, remainingMs: state === "open" ? msUntil(now, end) : 0, now };
}
