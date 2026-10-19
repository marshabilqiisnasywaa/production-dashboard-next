"use client";

import { useId, useState } from "react";
import type { Answer, AnswerStatus, ChecklistItem, RuleTemplate } from "../types";
import { isPerRule, itemKeys, ruleLines } from "../utils";

interface Props {
  item: ChecklistItem;
  rule: RuleTemplate;
  getAnswer: (id: string) => Answer;
  readOnly?: boolean;
  onChange: (id: string, patch: Partial<Answer>) => void;
}

const OPTIONS: AnswerStatus[] = ["OK", "NG"];

function OkNgControls({
  answer,
  readOnly,
  labelId,
  onChange,
}: {
  answer: Answer;
  readOnly: boolean;
  labelId: string;
  onChange: (patch: Partial<Answer>) => void;
}) {
  const [touched, setTouched] = useState({ cause: false, solution: false });
  const uid = useId();
  const causeInvalid = touched.cause && answer.cause.trim() === "";
  const solutionInvalid = touched.solution && answer.solution.trim() === "";

  return (
    <>
      <div className="dml-answer" role="radiogroup" aria-labelledby={labelId}>
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
    </>
  );
}

/**
 * THE checklist item template: title, "Lihat aturan", optional pos name input,
 * OK / NG buttons, and the required Penyebab + Solusi when NG.
 * With answerMode "per_rule" every rule line gets its own OK / NG answer.
 */
export function ChecklistItemCard({ item, rule, getAnswer, readOnly = false, onChange }: Props) {
  const [showRule, setShowRule] = useState(false);
  const uid = useId();
  const titleId = `${uid}-title`;
  const ruleId = `${uid}-rule`;

  const perRule = isPerRule(item);
  const keys = itemKeys(item);
  const answered = keys.every((k) => getAnswer(k).status);
  const answer = getAnswer(item.id);

  return (
    <li className={answered ? "dml-item is-answered" : "dml-item"}>
      <span className="dml-item__num" aria-hidden="true">
        {item.number}
      </span>

      <div className="dml-item__body">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <p id={titleId} className="dml-item__title" style={{ margin: 0 }}>
            {item.title}
          </p>

          {!perRule && (item.ruleInfo || item.rule) && (
            <button
              type="button"
              onClick={() => setShowRule((v) => !v)}
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "#e0f2fe",
                color: "#0284c7",
                border: 0,
                fontSize: "11px",
                fontWeight: 700,
                display: "inline-grid",
                placeItems: "center",
                cursor: "pointer",
                padding: 0,
              }}
              title={item.ruleInfo || item.rule || "Lihat aturan"}
              aria-label="Lihat aturan"
            >
              i
            </button>
          )}
        </div>

        {perRule ? (
          <>
            {item.ruleInfo && (
              <p style={{ margin: "4px 0 0", color: "#0369a1", fontSize: "12.5px", fontWeight: 600 }}>{item.ruleInfo}</p>
            )}
            <ol className="dml-rule-list">
              {ruleLines(item).map((line, i) => {
                const key = `${item.id}#${i}`;
                const ruleLabelId = `${uid}-r${i}`;
                return (
                  <li key={key} className="dml-rule-row">
                    <p id={ruleLabelId} className="dml-rule-row__text">
                      {line}
                    </p>
                    <OkNgControls
                      answer={getAnswer(key)}
                      readOnly={readOnly}
                      labelId={ruleLabelId}
                      onChange={(patch) => onChange(key, patch)}
                    />
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <>
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
                {item.ruleInfo && (
                  <p style={{ marginBottom: "6px", color: "#0369a1", fontWeight: 600 }}>
                    ℹ️ {item.ruleInfo}
                  </p>
                )}
                {item.rule ? (
                  ruleLines(item).map((line, i) => <p key={i}>{line}</p>)
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
                onChange={(e) => onChange(item.id, { posName: e.target.value })}
              />
            )}

            {item.answerType === "text" ? (
              <div style={{ marginTop: "10px" }}>
                <input
                  type="text"
                  className="ui-input ui-input--block"
                  placeholder="Catat nilai hasil pengukuran / informasi..."
                  value={answer.textValue ?? ""}
                  disabled={readOnly}
                  onChange={(e) =>
                    onChange(item.id, {
                      textValue: e.target.value,
                      status: e.target.value.trim() ? "OK" : null,
                    })
                  }
                />
              </div>
            ) : (
              <OkNgControls
                answer={answer}
                readOnly={readOnly}
                labelId={titleId}
                onChange={(patch) => onChange(item.id, patch)}
              />
            )}
          </>
        )}
      </div>
    </li>
  );
}
