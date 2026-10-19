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
        <strong>Papercard terkirim pukul {formatTimeHm(submission.submittedAt)} ke Supervisor</strong>
        <p>Hasil checklist diteruskan ke Supervisor untuk ditinjau &amp; disetujui. Jawaban di bawah bersifat read-only.</p>
      </div>
      <StatusChip tone={late ? "ng" : "ok"}>{late ? "NG (Telat)" : "On-time"}</StatusChip>
    </div>
  );
}
