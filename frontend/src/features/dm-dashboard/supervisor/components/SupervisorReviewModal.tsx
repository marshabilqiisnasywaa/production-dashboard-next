"use client";

import { useMemo } from "react";
import { IconCheck, IconCheckCircle, IconClose } from "@/components/ui/icons";
import type { DmSupervisorSubordinate } from "../../api";
import { ITEM_CATEGORY_MAP, PRESET_TITLES } from "../types";

interface SupervisorReviewModalProps {
  reviewTarget: DmSupervisorSubordinate | null;
  feedbackNote: string;
  setFeedbackNote: (val: string) => void;
  isSubmittingApproval: boolean;
  onClose: () => void;
  onApprove: (target: DmSupervisorSubordinate, status: "approved" | "rejected") => void;
}

export function SupervisorReviewModal({
  reviewTarget,
  feedbackNote,
  setFeedbackNote,
  isSubmittingApproval,
  onClose,
  onApprove,
}: SupervisorReviewModalProps) {
  const groupedCategories = useMemo(() => {
    if (!reviewTarget?.submission?.answers) return [];

    type Entry = { answer: any; originalIndex: number };
    type Pos = { key: string; number: number | null; title: string; entries: Entry[] };
    type Subject = { title: string; positions: Pos[] };
    const cats = new Map<string, { subjects: Subject[]; entries: Entry[] }>();

    reviewTarget.submission.answers.forEach((raw: any, idx: number) => {
      const ans = { ...raw };
      if (String(ans.itemId ?? "").includes("#")) {
        const sep = typeof ans.title === "string" ? ans.title.indexOf(": ") : -1;
        if (!ans.ruleText) ans.ruleText = sep >= 0 ? ans.title.slice(sep + 2) : ans.title;
        if (!ans.itemTitle && sep >= 0) ans.itemTitle = ans.title.slice(0, sep);
      }
      const catName = ans.categoryName || ans.category || ITEM_CATEGORY_MAP[ans.itemId] || "Pemeriksaan Umum";
      if (!cats.has(catName)) cats.set(catName, { subjects: [], entries: [] });
      const cat = cats.get(catName)!;
      const entry: Entry = { answer: ans, originalIndex: idx };
      cat.entries.push(entry);

      const subjectTitle = ans.groupTitle || "";
      let subject = cat.subjects.find((sj) => sj.title === subjectTitle);
      if (!subject) {
        subject = { title: subjectTitle, positions: [] };
        cat.subjects.push(subject);
      }
      const posKey = String(ans.itemId ?? idx).split("#")[0];
      let pos = subject.positions.find((ps) => ps.key === posKey);
      if (!pos) {
        pos = {
          key: posKey,
          number: ans.number ?? null,
          title: ans.itemTitle || ans.title || PRESET_TITLES[ans.itemId] || `Poin Cek ${ans.itemId}`,
          entries: [],
        };
        subject.positions.push(pos);
      }
      pos.entries.push(entry);
    });

    return Array.from(cats.entries()).map(([categoryName, { subjects, entries }]) => ({
      categoryName,
      subjects,
      total: entries.length,
      hasNg: entries.some((e) => e.answer.status === "NG"),
      okCount: entries.filter((e) => e.answer.status === "OK").length,
    }));
  }, [reviewTarget]);

  if (!reviewTarget) return null;

  const isApproved = reviewTarget.submission?.approvalStatus === "approved";
  const okAnswers = reviewTarget.submission?.answers?.filter((a: any) => a.status === "OK") || [];
  const ngAnswers = reviewTarget.submission?.answers?.filter((a: any) => a.status === "NG") || [];

  const renderStatus = (answer: any) => {
    const isNG = answer.status === "NG";
    const isText = answer.textValue && !isNG;
    return (
      <span
        className={`spv-status-badge ${isNG ? "spv-status-badge--ng" : isText ? "spv-status-badge--info" : "spv-status-badge--approved"}`}
      >
        {isNG ? "NG" : isText ? `Nilai: ${answer.textValue}` : "OK"}
      </span>
    );
  };

  const renderNg = (answer: any) =>
    answer.status === "NG" && (
      <div className="spv-modal-ng-box">
        <div>
          <strong>Penyebab:</strong> {answer.cause || "Tidak ada keterangan penyebab."}
        </div>
        {answer.solution && (
          <div>
            <strong>Tindakan Perbaikan:</strong> {answer.solution}
          </div>
        )}
      </div>
    );

  return (
    <div
      className="spv-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Tinjauan Papercard"
    >
      <div
        className="spv-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Modal Header */}
        <div className="spv-modal-header">
          <div className="spv-modal-header-top">
            <div className="spv-modal-chips-row">
              <span className={`spv-chip spv-chip--dept-${reviewTarget.dept.toLowerCase()}`}>
                {reviewTarget.dept}
              </span>
                {/* <span className="spv-chip spv-chip--neutral">
                  {reviewTarget.role === "leader" ? "Leader" : "Operator"}
                </span> */}
              {reviewTarget.lineName && (
                <span className="spv-chip spv-chip--line">{reviewTarget.lineName}</span>
              )}
              {reviewTarget.submission?.shift && (
                <span className="spv-chip spv-chip--neutral">{reviewTarget.submission.shift}</span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="spv-modal-close"
              title="Tutup dialog"
            >
              <IconClose size={16} />
            </button>
          </div>

          <div className="spv-modal-header-main">
            <h3 className="spv-modal-title">
              {reviewTarget.name} <span className="spv-modal-nik">· NIK: {reviewTarget.employeeNo}</span>
            </h3>
            <div className="spv-modal-meta-line">
              <span>{reviewTarget.position}</span>
              <span className="spv-dot-sep">•</span>
              <span>
                Submit:{" "}
                {reviewTarget.submission?.submittedAt
                  ? `${new Date(reviewTarget.submission.submittedAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} WIB`
                  : "Belum submit"}
              </span>
              <span className="spv-dot-sep">•</span>
              <span className="spv-mini-badge spv-mini-badge--ok">{okAnswers.length} OK</span>
              {ngAnswers.length > 0 ? (
                <span className="spv-mini-badge spv-mini-badge--ng">{ngAnswers.length} NG</span>
              ) : (
                <span className="spv-mini-badge spv-mini-badge--clean">Nol Temuan</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="spv-modal-body">
          {/* Checklist Answers from Database */}
          {reviewTarget.submission ? (
            <div className="spv-modal-section">

              <div className="spv-modal-categories-wrap">
                {groupedCategories.map((group) => (
                  <div key={group.categoryName} className="spv-modal-cat-group">
                    <div className="spv-modal-cat-header">
                      <div className="spv-modal-cat-left">
                        <h5 className="spv-modal-cat-name">{group.categoryName}</h5>
                      </div>
                      <span
                        className={`spv-modal-cat-badge ${
                          group.hasNg ? "spv-modal-cat-badge--ng" : "spv-modal-cat-badge--ok"
                        }`}
                      >
                        {group.hasNg ? "Ada Temuan (NG)" : `${group.okCount}/${group.total} OK`}
                      </span>
                    </div>

                    {group.subjects.map((subject, si) => (
                      <div key={`${subject.title}-${si}`} className="spv-modal-subject">
                        {subject.title && <div className="spv-modal-subject-title">{subject.title}</div>}

                        {subject.positions.map((pos) => {
                          const perRule = pos.entries.some((e) => e.answer.ruleText);
                          if (!perRule) {
                            const { answer } = pos.entries[0];
                            const isNG = answer.status === "NG";
                            return (
                              <div key={pos.key} className={`spv-modal-pos${isNG ? " is-ng" : ""}`}>
                                <div className="spv-modal-pos-head">
                                  <span className="spv-modal-pos-title">
                                    {pos.number != null && <span className="spv-modal-answer-num">{pos.number}.</span>} {pos.title}
                                  </span>
                                  {renderStatus(answer)}
                                </div>
                                {Array.isArray(answer.rules) && answer.rules.length > 0 && (
                                  <ol className="spv-modal-rules spv-modal-rules--plain">
                                    {answer.rules.map((line: string, ri: number) => (
                                      <li key={ri} className="spv-modal-rule">
                                        <span className="spv-modal-rule-text">{line}</span>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                                {renderNg(answer)}
                              </div>
                            );
                          }

                          const ngInPos = pos.entries.filter((e) => e.answer.status === "NG").length;
                          return (
                            <div key={pos.key} className={`spv-modal-pos${ngInPos ? " is-ng" : ""}`}>
                              <div className="spv-modal-pos-head">
                                <span className="spv-modal-pos-title">
                                  {pos.number != null && <span className="spv-modal-answer-num">{pos.number}.</span>} {pos.title}
                                </span>
                                <span className="spv-modal-pos-count">
                                  {ngInPos ? `${ngInPos} NG dari ${pos.entries.length}` : `${pos.entries.length} aturan OK`}
                                </span>
                              </div>
                              <ol className="spv-modal-rules">
                                {pos.entries.map(({ answer, originalIndex }) => (
                                  <li
                                    key={answer.itemId || originalIndex}
                                    className={`spv-modal-rule${answer.status === "NG" ? " is-ng" : ""}`}
                                  >
                                    <div className="spv-modal-rule-main">
                                      <span className="spv-modal-rule-text">{answer.ruleText}</span>
                                      {renderStatus(answer)}
                                    </div>
                                    {renderNg(answer)}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="spv-empty-box">
              Karyawan ini belum mengirimkan papercard checklist untuk hari ini.
            </div>
          )}

          {/* Abnormal Notes if any */}
          {reviewTarget.submission?.abnormalNotes && (
            <div className="spv-modal-alert-box">
              <strong>Catatan Eskalasi Lapangan:</strong> {reviewTarget.submission.abnormalNotes}
            </div>
          )}

          {/* Status if already approved */}
          {isApproved && (
            <div className="spv-modal-approved-banner">
              <IconCheckCircle size={16} />
              <span>
                Papercard ini telah disetujui
                {reviewTarget.submission?.approvedByName ? ` oleh ${reviewTarget.submission.approvedByName}` : ""}.
              </span>
            </div>
          )}

          {/* Supervisor Notes Input */}
          {reviewTarget.submission && (
            <div className="spv-modal-feedback-field">
              <label htmlFor="supervisor-feedback-input" className="spv-modal-feedback-label">
                Instruksi / Catatan Supervisor:
              </label>
              <textarea
                id="supervisor-feedback-input"
                rows={2}
                placeholder="Tuliskan arahan perbaikan jika meminta revisi, atau catatan persetujuan..."
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                className="spv-modal-textarea"
              />
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="spv-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="spv-btn spv-btn--secondary"
          >
            Tutup
          </button>

          {reviewTarget.submission && (
            <>
              <button
                type="button"
                disabled={isSubmittingApproval}
                onClick={() => onApprove(reviewTarget, "rejected")}
                className="spv-btn spv-btn--danger"
              >
                ✕ Minta Revisi
              </button>

              <button
                type="button"
                disabled={isSubmittingApproval}
                onClick={() => onApprove(reviewTarget, "approved")}
                className="spv-btn spv-btn--primary"
              >
                <IconCheck size={14} />
                <span>Setujui Papercard</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SupervisorReviewModal;
