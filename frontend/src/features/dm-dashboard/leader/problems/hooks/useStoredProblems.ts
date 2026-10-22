"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { makeSampleProblems, SHOW_SAMPLE_DATA } from "../sampleData";
import { readMeetingProblems, readStatusMap } from "../storage";
import type { StatusEntry, StoredProblem } from "../types";

interface StoredProblemsState {
  stored: StoredProblem[] | null;
  statusMap: Record<string, StatusEntry>;
  setStatusMap: Dispatch<SetStateAction<Record<string, StatusEntry>>>;
}

export function useStoredProblems(): StoredProblemsState {
  const [stored, setStored] = useState<StoredProblem[] | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, StatusEntry>>({});

  useEffect(() => {
    const real = readMeetingProblems();
    setStored(SHOW_SAMPLE_DATA ? [...real, ...makeSampleProblems(new Date())] : real);
    setStatusMap(readStatusMap());
  }, []);

  return { stored, statusMap, setStatusMap };
}
