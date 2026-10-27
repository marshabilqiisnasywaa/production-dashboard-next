export type ProblemStatus = "unsolved" | "escalated" | "solved";
export type ProblemFilter = "all" | ProblemStatus;

/** A follow-up item as saved when a DM meeting ends (see meeting/hooks/useMeetingFlow.ts). */
export interface StoredProblem {
  id: string;
  date: string; // yyyy-mm-dd of the meeting
  sessionId: string;
  line: string;
  problem: string;
  picId: string;
  due: string; // "YYYY-MM-DDTHH:mm"
  /** Only for sample rows */
  picName?: string;
  sample?: boolean;
  defaultSolved?: boolean;
}

export interface StatusEntry {
  solved: boolean;
  at: string | null;
}

export interface ProblemRow {
  id: string;
  date: string;
  sessionLabel: string;
  line: string;
  problem: string;
  problemCategories?: string[];
  solution?: string | null;
  picName: string;
  due: string;
  status: ProblemStatus;
  /** How long past the due date (ms), 0 when not overdue */
  overdueMs: number;
  solvedAt: string | null;
  sample: boolean;
}
