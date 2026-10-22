/** Demo rows so the page is not empty before real meetings exist. Set to false to hide them. */
import type { DmSupervisorLine } from "../../api";
import { localDate } from "../meeting/utils";
import type { StoredProblem } from "./types";

export const SHOW_SAMPLE_DATA = true;
export const ESCALATION_SAMPLE_PREFIX = "esc-sample-";

const dayOffset = (now: Date, days: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return localDate(d);
};

export function makeSampleProblems(now: Date): StoredProblem[] {
  return [
    {
      id: "sample-1",
      date: dayOffset(now, -2),
      sessionId: "during-1",
      line: "TAC20601",
      problem: "Tekanan mesin molding tidak stabil",
      picId: "",
      picName: "Rizky Pratama",
      due: `${dayOffset(now, -1)}T12:00`, // already past -> escalated
      sample: true,
    },
    {
      id: "sample-2",
      date: dayOffset(now, -1),
      sessionId: "during-2",
      line: "TAC20602",
      problem: "Label material tidak terbaca",
      picId: "",
      picName: "Siti Rahma",
      due: `${dayOffset(now, 1)}T14:00`,
      sample: true,
    },
    {
      id: "sample-3",
      date: dayOffset(now, -3),
      sessionId: "post",
      line: "TAC20603",
      problem: "Cycle time melebihi standar",
      picId: "",
      picName: "Dimas Saputra",
      due: `${dayOffset(now, -1)}T10:00`,
      sample: true,
      defaultSolved: true,
    },
  ];
}

const pad = (n: number) => String(n).padStart(2, "0");

const localDateTime = (d: Date) =>
  `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const FALLBACK_LINES = ["TAC20601", "TAC20602"];

interface EscalationDraft {
  offsetMin: number;
  dayOffset: number;
  sessionId: string;
  picName: string;
  problem: string;
  solved?: boolean;
}

const ESCALATION_DRAFTS: EscalationDraft[] = [
  {
    offsetMin: -25,
    dayOffset: 0,
    sessionId: "during-1",
    picName: "Rizky Pratama",
    problem: "PC upgrade gagal karena nomor COM melebihi batas",
  },
  {
    offsetMin: -120,
    dayOffset: 0,
    sessionId: "during-2",
    picName: "Budi Santoso",
    problem: "Tekanan mesin molding tidak stabil",
  },
  {
    offsetMin: -420,
    dayOffset: 0,
    sessionId: "during-1",
    picName: "Siti Rahma",
    problem: "Conveyor berhenti mendadak di pos 4",
  },
  {
    offsetMin: -1680,
    dayOffset: -1,
    sessionId: "during-2",
    picName: "Dewi Lestari",
    problem: "Suhu solder station di luar spesifikasi",
  },
  {
    offsetMin: -4320,
    dayOffset: -3,
    sessionId: "during-1",
    picName: "Fajar Nugroho",
    problem: "Label barcode tidak terbaca scanner",
  },
  {
    offsetMin: 180,
    dayOffset: 0,
    sessionId: "during-2",
    picName: "Rizky Pratama",
    problem: "Jig fixture aus melebihi batas toleransi",
  },
  {
    offsetMin: -300,
    dayOffset: 0,
    sessionId: "during-1",
    picName: "Budi Santoso",
    problem: "Kipas ion ESD tidak berfungsi",
    solved: true,
  },
  {
    offsetMin: -2880,
    dayOffset: -2,
    sessionId: "during-2",
    picName: "Siti Rahma",
    problem: "Material lot pertama terlambat datang",
    solved: true,
  },
];

/** Demo problems for the Supervisor escalation page, still relative to `now` on every load. */
export function makeEscalationSamples(
  now: Date,
  lines: DmSupervisorLine[],
): StoredProblem[] {
  const lineCodes = lines.length > 0 ? lines.map((line) => line.lineCode) : FALLBACK_LINES;

  return ESCALATION_DRAFTS.map((draft, index) => ({
    id: `${ESCALATION_SAMPLE_PREFIX}${index + 1}`,
    date: localDate(new Date(now.getTime() + draft.dayOffset * 86_400_000)),
    sessionId: draft.sessionId,
    line: lineCodes[index % lineCodes.length],
    problem: draft.problem,
    picId: "",
    picName: draft.picName,
    due: localDateTime(new Date(now.getTime() + draft.offsetMin * 60_000)),
    sample: true,
    defaultSolved: draft.solved,
  }));
}
