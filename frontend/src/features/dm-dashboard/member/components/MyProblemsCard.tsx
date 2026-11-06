"use client";
import { useUiText } from "@/locales/useUiText";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";
import { formatDue } from "../../leader/meeting/utils";
import type { ProblemRow, ProblemStatus } from "../../leader/problems/types";
import { formatOverdue } from "../../leader/problems/utils";
import { MEMBER_ROUTES } from "../routes";
import { ProblemLoadError } from "../../leader/problems/components/ProblemLoadError";

const STATUS: Record<ProblemStatus, { tone: ChipTone; label: string }> = {
  unsolved: { tone: "wait", label: "Unsolved" },
  escalated: { tone: "ng", label: "Eskalasi SPV" },
  solved: { tone: "ok", label: "Solved" },
};

const MAX = 4;

/** The member's open follow-ups from DM meetings (most urgent first). Full list is on "Masalah Saya". */
export function MyProblemsCard({ rows, ready, error, onRetry }: { rows: ProblemRow[]; ready: boolean; error: string | null; onRetry: () => void }) {
  const { text: uiText, locale: uiLocale } = useUiText();
  const shown = rows.slice(0, MAX);

  return (
    <Card
      flush
      title={uiText("Masalah untuk saya")}
      subtitle={uiText("Tindak lanjut dari DM meeting yang menjadi tanggung jawab Anda.")}
      actions={
        <Link href={MEMBER_ROUTES.problems} className="dmm-link">{uiText("Lihat semua →")}</Link>
      }
    >
      {error ? <ProblemLoadError error={error} onRetry={onRetry} /> : !ready ? (
        <div className="dml-empty">{uiText("Memuat…")}</div>
      ) : shown.length === 0 ? (
        <div className="dml-empty">{uiText("Tidak ada masalah yang ditugaskan kepada Anda.")}</div>
      ) : (
        <ul className="dmm-list">
          {uiText(shown.map((r) => {
            const s = STATUS[r.status];
            return (
              <li key={r.id}>
                <div className="dmm-list__main">
                  <p className="dmm-list__title">{r.problem}</p>
                  <p className="dmm-list__meta">
                    {r.line}{uiText(" · due ")}{formatDue(r.due, uiLocale)}
                    {r.status === "escalated" && <span className="dmm-list__late">{uiText(" · terlambat ")}{formatOverdue(r.overdueMs, uiLocale)}</span>}
                  </p>
                </div>
                <StatusChip tone={s.tone}>{uiText(s.label)}</StatusChip>
              </li>
            );
          }))}
        </ul>
      )}
    </Card>
  );
}
