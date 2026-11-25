import { useCallback, useEffect, useState } from "react";

export type MechanismStage = {
  key: string;
  title: string;
  level: string;
  coordination: string;
  time: string;
  participants: string[];
  objective: string[];
  photo: string;
};

export type MechanismTimes = Record<string, string>;

export const MECHANISM_STAGES: MechanismStage[] = [
  {
    key: "line-briefing",
    title: "Line Morning Briefing & Production Change Paper-card inspection",
    level: "Line Level",
    coordination: "Leader Coordination",
    time: "07:45 – 08:30",
    participants: ["Team Leader & Operator"],
    objective: [
      "Production team leaders organize team for production line personnel every shift.",
      "Summarize the previous day's issues, explain the focus of control points.",
      "Pre-processing inspection 4M-1E",
    ],
    photo: "/images/dm-mechanism/line-briefing.jpg",
  },
  {
    key: "dm-triangle-standup",
    title: "DM Triangle Stand-up Meeting",
    level: "Workshop Level",
    coordination: "Department Coordination",
    time: "10:00 & 15:00",
    participants: ["DM Triangle Team", "(Leader, PE, ME, Quality)"],
    objective: [
      "Review change inspection finding issue that submitted in MO production change & G-EAM machine fault.",
      "Review SQDIP achievement.",
      "Review problem input on paper-card.",
    ],
    photo: "/images/dm-mechanism/dm-triangle-standup.jpg",
  },
  {
    key: "process-confirmation",
    title: "Process Confirmation & Validation",
    level: "Workshop Level",
    coordination: "Department Coordination",
    time: "Execution process",
    participants: ["DM Triangle Team"],
    objective: [
      "Follow-up item report (standing issues & responsible)",
      "4M1E abnormalities.",
      "Conclusion & Arrangement of next tasks & responsibilities.",
    ],
    photo: "/images/dm-mechanism/process-confirmation.jpg",
  },
  {
    key: "after-occurring",
    title: "After Occurring Follow-up",
    level: "Workshop Level",
    coordination: "Department Coordination",
    time: "16:00",
    participants: ["Leader line lead DM Triangle Team"],
    objective: ["Problem record & tracking", "Problem solving report", "PDCA monitoring"],
    photo: "/images/dm-mechanism/after-occurring.jpg",
  },
  {
    key: "workshop-review",
    title: "Workshop Review",
    level: "Workshop Level",
    coordination: "Department Coordination",
    time: "Evaluation",
    participants: ["DM Triangle Team"],
    objective: [
      "Evaluate Top problem losses, Stability rate,",
      "Effectiveness problem solving & improvement.",
      "Quick Response rate, handling rate, close rate review.",
    ],
    photo: "/images/dm-mechanism/workshop-review.jpg",
  },
  {
    key: "morning-meeting",
    title: "Morning Meeting",
    level: "Factory Level",
    coordination: "HOD Coordination",
    time: "08:30 – 09:30",
    participants: ["All HOD each department"],
    objective: [
      "SQDIP review & report,",
      "Important point announcement,",
      "Big problem review,",
      "Pre-meeting questions response,",
      "Project overview,",
    ],
    photo: "/images/dm-mechanism/morning-meeting.jpg",
  },
];

export const MAX_TIME_LENGTH = 40;

const STORAGE_KEY = "dm-mechanism-times";
const CHANGE_EVENT = "dm-mechanism-times-change";

function readOverrides(): MechanismTimes {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const result: MechanismTimes = {};
    for (const stage of MECHANISM_STAGES) {
      const value = (parsed as Record<string, unknown>)[stage.key];
      if (typeof value === "string" && value.trim()) {
        result[stage.key] = value.trim().slice(0, MAX_TIME_LENGTH);
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function saveMechanismTimes(times: MechanismTimes): boolean {
  const overrides: MechanismTimes = {};
  for (const stage of MECHANISM_STAGES) {
    const value = (times[stage.key] ?? "").trim().slice(0, MAX_TIME_LENGTH);
    if (value && value !== stage.time) overrides[stage.key] = value;
  }
  try {
    if (Object.keys(overrides).length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function useMechanismTimes() {
  const [overrides, setOverrides] = useState<MechanismTimes>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setOverrides(readOverrides());
    sync();
    setReady(true);
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const timeFor = useCallback(
    (stage: MechanismStage) => overrides[stage.key] ?? stage.time,
    [overrides]
  );

  return { timeFor, ready };
}