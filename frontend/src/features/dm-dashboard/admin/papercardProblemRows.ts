import type { DmPapercardSubmission } from "../api";

export type PapercardProblemRow = {
  id: string;
  submission: DmPapercardSubmission;
  category: string;
  problem: string;
  description: string;
  cause: string;
  solution: string;
  late: boolean;
};

export function papercardProblemRows(submissions: DmPapercardSubmission[]): PapercardProblemRow[] {
  return submissions.flatMap((submission) => {
    const rows: PapercardProblemRow[] = [];
    const lateNote = submission.abnormalNotes?.split("\n").find((line) => line.startsWith("Terlambat mengirim papercard."));
    const findingNotes = submission.abnormalNotes?.split("\n").filter((line) => !line.startsWith("Terlambat mengirim papercard.")).join("\n").trim();
    if (submission.status === "LATE" || lateNote) {
      rows.push({
        id: `${submission.id}-late`, submission, category: "Ketepatan waktu",
        problem: "NG telat", description: lateNote || "Papercard dikirim melewati batas waktu.", cause: "",
        solution: "", late: true,
      });
    }
    submission.answers.forEach((answer: unknown, index) => {
      if (!answer || typeof answer !== "object" || !("status" in answer) || answer.status !== "NG") return;
      const item = answer as Record<string, unknown>;
      const text = (key: string) => typeof item[key] === "string" ? item[key] as string : "";
      rows.push({
        id: `${submission.id}-${index}`, submission,
        category: text("categoryName") || "Pemeriksaan",
        problem: text("title") || text("itemTitle") || text("itemId") || "Temuan NG",
        description: findingNotes || "Ada temuan NG pada checklist inspeksi.",
        cause: text("cause"), solution: text("solution"), late: false,
      });
    });
    if (submission.status === "NG" && rows.length === 0) {
      rows.push({
        id: `${submission.id}-ng`, submission, category: "Pemeriksaan", problem: "NG",
        description: findingNotes || "Ada temuan NG pada papercard.",
        cause: "", solution: "", late: false,
      });
    }
    return rows;
  });
}
