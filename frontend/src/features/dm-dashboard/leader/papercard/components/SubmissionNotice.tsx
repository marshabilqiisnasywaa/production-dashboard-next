import { IconCheckCircle } from "@/components/ui/icons";
import { StatusChip } from "@/components/ui/StatusChip";
import type { Submission } from "../types";
import { formatTimeHm } from "../utils";

/** Shown after submit (FR-3.7): status + submit time. The form below becomes read-only. */
export function SubmissionNotice({ submission }: { submission: Submission }) {
  const late = submission.status === "LATE";
  return (
    <div className={late ? "dml-notice dml-notice--late" : "dml-notice"} role="status">
      <IconCheckCircle size={22} />
      <div>
        <strong>Papercard terkirim pukul {formatTimeHm(submission.submittedAt)}</strong>
        <p>Jawaban masih bisa dilihat di bawah, tetapi tidak dapat diubah lagi.</p>
      </div>
      <StatusChip tone={late ? "ng" : "ok"}>{late ? "NG (Telat)" : "On-time"}</StatusChip>
    </div>
  );
}
