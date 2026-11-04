"use client";
import { useUiText } from "@/locales/useUiText";
import { IconCheckCircle } from "@/components/ui/icons";
import { StatusChip } from "@/components/ui/StatusChip";
import type { Submission } from "../types";
import { formatTimeHm } from "../utils";

/** Shown after submit (FR-3.7): status + submit time. The form below becomes read-only. */
export function SubmissionNotice({ submission }: { submission: Submission }) {
  const { text: uiText } = useUiText();
  const late = submission.status === "LATE";
  return (
    <div className={late ? "dml-notice dml-notice--late" : "dml-notice"} role="status">
      <IconCheckCircle size={22} />
      <div>
        <strong>{uiText("Papercard terkirim pukul ")}{formatTimeHm(submission.submittedAt)}{uiText(" ke Supervisor")}</strong>
        <p>{uiText("Hasil checklist diteruskan ke Supervisor untuk ditinjau & disetujui. Jawaban di bawah bersifat read-only.")}</p>
      </div>
      <StatusChip tone={late ? "ng" : "ok"}>{late ? uiText("NG (Telat)") : uiText("On-time")}</StatusChip>
    </div>
  );
}
