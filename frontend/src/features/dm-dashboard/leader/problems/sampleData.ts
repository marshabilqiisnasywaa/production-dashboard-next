/** Demo rows so the page is not empty before real meetings exist. Set to false to hide them. */
import { localDate } from "../meeting/utils";
import type { StoredProblem } from "./types";

export const SHOW_SAMPLE_DATA = true;

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
