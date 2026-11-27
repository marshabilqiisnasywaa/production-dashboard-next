"use client";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import "./ai-float.css";

import type {
  RootCauseRuleStatus,
  RootCauseSuggestion as Suggestion,
  RootCauseVerdict,
} from "../api";

export type SuggestionStatus = "idle" | "loading" | "error";

export type SuggestionPlacement = "next" | "last";

type WhySuggestionBoxProps = {
  suggestion: Suggestion;
  stale: boolean;
  placement: SuggestionPlacement;
  canDraft: boolean;
  onApply: (level: number) => void;
  onUseDraft: (text: string) => void;
  onDismiss: () => void;
};

const VERDICT_LABEL: Record<RootCauseVerdict, string> = {
  final: "Sudah akar",
  dig_deeper: "Masih bisa digali",
  insufficient: "Data belum cukup",
};

const VERDICT_TONE: Record<RootCauseVerdict, string> = {
  final: "is-success",
  dig_deeper: "is-warning",
  insufficient: "is-neutral",
};

const RULE_LABEL: Record<RootCauseRuleStatus, string> = {
  met: "Terpenuhi",
  not_met: "Belum terpenuhi",
  unknown: "Belum bisa dinilai",
};

const CONFIDENCE_LABEL = {
  high: "Keyakinan tinggi",
  medium: "Keyakinan sedang",
  low: "Keyakinan rendah",
} as const;

export default function WhySuggestionBox({
  suggestion,
  stale,
  placement,
  canDraft,
  onApply,
  onUseDraft,
  onDismiss,
}: WhySuggestionBoxProps) {
  const { text: uiText } = useUiText();
  const assessment = suggestion.markedAssessment;
  const isLast = placement === "last";
  const canApply =
    isLast &&
    suggestion.verdict === "final" &&
    suggestion.suggestedLevel !== null;

  if (typeof document === "undefined") return null;

  // Dirender lewat portal ke <body> supaya melayang di pojok kanan bawah
  // dan tidak terjebak di dalam card yang punya backdrop-filter.
  // Wrapper dm-5w-root dibutuhkan agar variabel warna --dm-5w-* tetap ada.
  return createPortal(
    <div className="dm-5w-root dm-5w-ai-float">
      <div
        className="dm-5w-suggest dm-5w-suggest-inline dm-5w-ai-card"
        role="region"
        aria-label={uiText("Saran Root Cause")}
      >
        <div className="dm-5w-ai-head">
          <span className="dm-5w-ai-avatar" aria-hidden="true" />
          <span className="dm-5w-ai-title">{uiText("Saran AI")}</span>
          <button
            type="button"
            className="dm-5w-ai-close"
            onClick={onDismiss}
            aria-label={uiText("Tutup")}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="dm-5w-ai-scroll">
          <div className="dm-5w-suggest-verdict">
            <span className={`dm-5w-chip ${VERDICT_TONE[suggestion.verdict]}`}>
              {uiText(VERDICT_LABEL[suggestion.verdict])}
            </span>
            {isLast && suggestion.suggestedLevel !== null ? (
              <span className="dm-5w-suggest-meta">
                {uiText("Why {{v0}}", { v0: suggestion.suggestedLevel })}
                {" · "}
                {uiText(CONFIDENCE_LABEL[suggestion.confidence])}
              </span>
            ) : null}
          </div>

          {stale ? (
            <p className="dm-5w-chain-warn" role="note">
              {uiText(
                "Isian berubah sejak saran dibuat. Minta ulang untuk saran terbaru."
              )}
            </p>
          ) : null}

          {suggestion.summary ? (
            <p className="dm-5w-suggest-summary">{suggestion.summary}</p>
          ) : null}

          {isLast && suggestion.verdict === "final" && suggestion.rootReason ? (
            <p className="dm-5w-suggest-summary">
              <strong>{uiText("Alasan")}:</strong> {suggestion.rootReason}
            </p>
          ) : null}

          {assessment ? (
            <p className="dm-5w-suggest-assessment">
              <strong>
                {uiText("Pilihan Anda (Why {{v0}})", {
                  v0: assessment.markedLevel,
                })}
                :
              </strong>{" "}
              {assessment.stance === "agree"
                ? uiText("Setuju")
                : assessment.stance === "not_enough"
                  ? uiText("Belum cukup")
                  : uiText("Lebih tepat Why {{v0}}", { v0: assessment.level })}
              {assessment.reason ? `. ${assessment.reason}` : ""}
            </p>
          ) : null}

          {suggestion.nextQuestion ? (
            <div className="dm-5w-suggest-next">
              <span className="dm-5w-label">{uiText("Tanya lagi")}</span>
              <p>{suggestion.nextQuestion}</p>
              {!canDraft && suggestion.verdict === "dig_deeper" ? (
                <p className="dm-5w-suggest-note">
                  {uiText("Batas Why 5 sudah tercapai.")}
                </p>
              ) : null}
            </div>
          ) : null}

          {suggestion.candidates.length > 0 ? (
            <div className="dm-5w-suggest-candidates">
              <span className="dm-5w-label">
                {uiText("Dugaan isi (belum terbukti, cek dulu)")}
              </span>
              <ul>
                {suggestion.candidates.map((item, index) => (
                  <li key={`${index}-${item.text}`}>
                    <span className="dm-5w-suggest-cand-text">{item.text}</span>
                    {item.check ? (
                      <span className="dm-5w-suggest-cand-check">
                        {uiText("Cara membuktikan")}: {item.check}
                      </span>
                    ) : null}
                    {canDraft ? (
                      <button
                        type="button"
                        className="dm-5w-add-field dm-5w-suggest-ask"
                        onClick={() => onUseDraft(item.text)}
                      >
                        {uiText("Pakai sebagai draf")}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {suggestion.missing.length > 0 ? (
            <div className="dm-5w-suggest-missing">
              <span className="dm-5w-label">{uiText("Masih kurang")}</span>
              <ul>
                {suggestion.missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {suggestion.rules.length > 0 ? (
            <details className="dm-5w-suggest-details">
              <summary>{uiText("Dasar pertimbangan")}</summary>
              <ul className="dm-5w-suggest-rules">
                {suggestion.rules.map((rule) => (
                  <li key={rule.id}>
                    <span className="dm-5w-suggest-rule-head">
                      <strong>{`${rule.id} ${rule.title}`}</strong>
                      <span
                        className={`dm-5w-suggest-status is-${rule.status}`}
                      >
                        {uiText(RULE_LABEL[rule.status])}
                      </span>
                    </span>
                    {rule.note ? <span>{rule.note}</span> : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {isLast && suggestion.otherWhys.length > 0 ? (
            <details className="dm-5w-suggest-details">
              <summary>{uiText("Kenapa bukan Why lain")}</summary>
              <ul className="dm-5w-suggest-rules">
                {suggestion.otherWhys.map((item) => (
                  <li key={item.level}>
                    <strong>{uiText("Why {{v0}}", { v0: item.level })}</strong>
                    <span>{item.reason}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <div className="dm-5w-suggest-actions">
            {canApply && suggestion.suggestedLevel !== null ? (
              <button
                type="button"
                className="dm-5w-btn dm-5w-btn-primary dm-5w-btn-sm"
                onClick={() => onApply(suggestion.suggestedLevel as number)}
              >
                {uiText("Terapkan ke Why {{v0}}", {
                  v0: suggestion.suggestedLevel,
                })}
              </button>
            ) : null}
            <button
              type="button"
              className="dm-5w-btn dm-5w-btn-secondary dm-5w-btn-sm"
              onClick={onDismiss}
            >
              {uiText("Abaikan")}
            </button>
          </div>
          <p className="dm-5w-suggest-note">
            {uiText("Saran AI bisa keliru. Cek bukti sebelum menerapkan.")}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}