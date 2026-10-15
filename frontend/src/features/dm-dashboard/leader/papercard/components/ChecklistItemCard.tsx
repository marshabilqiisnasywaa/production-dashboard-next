"use client";

import { useId, useState } from "react";
import type { Answer, AnswerStatus, ChecklistItem, RuleTemplate } from "../types";

interface Props {
  item: ChecklistItem;
  rule: RuleTemplate;
  answer: Answer;
  readOnly?: boolean;
  onChange: (patch: Partial<Answer>) => void;
}

const OPTIONS: AnswerStatus[] = ["OK", "NG"];

/**
 * THE checklist item template: title, "Lihat aturan", optional pos name input,
 * OK / NG buttons, and the required Penyebab + Solusi when NG.
 */
export function ChecklistItemCard({ item, rule, answer, readOnly = false, onChange }: Props) {
  const [showRule, setShowRule] = useState(false);
  const [touched, setTouched] = useState({ cause: false, solution: false });
  const uid = useId();
  const titleId = `${uid}-title`;
  const ruleId = `${uid}-rule`;

  const causeInvalid = touched.cause && answer.cause.trim() === "";
  const solutionInvalid = touched.solution && answer.solution.trim() === "";

  return (
    <li className={answer.status ? "dml-item is-answered" : "dml-item"}>
      <span className="dml-item__num" aria-hidden="true">
        {item.number}
      </span>

      <div className="dml-item__body">
        <p id={titleId} className="dml-item__title">
          {item.title}
        </p>

        <button
          type="button"
          className="dml-item__rule-toggle"
          aria-expanded={showRule}
          aria-controls={ruleId}
          onClick={() => setShowRule((v) => !v)}
        >
          {showRule ? "Sembunyikan aturan" : "Lihat aturan"}
        </button>

        {showRule && (
          <div id={ruleId} className="dml-rule">
            {item.rule ? (
              <p>{item.rule}</p>
            ) : (
              <>
                <p>
                  <strong>OK:</strong> {rule.ok}
                </p>
                <p>
                  <strong>NG:</strong> {rule.ng}
                </p>
              </>
            )}
          </div>
        )}

        {item.askPosName && (
          <input
            className="ui-input ui-input--block"
            type="text"
            placeholder="Nama pos/proses yang diperiksa"
            aria-label={`Nama pos/proses untuk item ${item.number}`}
            value={answer.posName}
            disabled={readOnly}
            onChange={(e) => onChange({ posName: e.target.value })}
          />
        )}

        <div className="dml-answer" role="radiogroup" aria-labelledby={titleId}>
          {OPTIONS.map((opt) => {
            const selected = answer.status === opt;
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={readOnly}
                className={`dml-answer__btn dml-answer__btn--${opt.toLowerCase()}${selected ? " is-selected" : ""}`}
                onClick={() => onChange({ status: opt })}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {answer.status === "NG" && (
          <div className="dml-ng">
            <div className="dml-ng__field">
              <label className="dml-ng__label" htmlFor={`${uid}-cause`}>
                Penyebab (wajib)
              </label>
              <textarea
                id={`${uid}-cause`}
                className="ui-textarea"
                rows={2}
                placeholder="Jelaskan penyebab secara spesifik"
                value={answer.cause}
                disabled={readOnly}
                aria-invalid={causeInvalid}
                onChange={(e) => onChange({ cause: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, cause: true }))}
              />
              {causeInvalid && <span className="dml-ng__error">Penyebab wajib diisi</span>}
            </div>
            <div className="dml-ng__field">
              <label className="dml-ng__label" htmlFor={`${uid}-solution`}>
                Solusi (wajib)
              </label>
              <textarea
                id={`${uid}-solution`}
                className="ui-textarea"
                rows={2}
                placeholder="Tindakan perbaikan yang dilakukan"
                value={answer.solution}
                disabled={readOnly}
                aria-invalid={solutionInvalid}
                onChange={(e) => onChange({ solution: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, solution: true }))}
              />
              {solutionInvalid && <span className="dml-ng__error">Solusi wajib diisi</span>}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
