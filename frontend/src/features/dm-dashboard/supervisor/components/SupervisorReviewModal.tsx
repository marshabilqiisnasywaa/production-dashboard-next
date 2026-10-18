"use client";

import { IconCheck, IconCheckCircle, IconClose } from "@/components/ui/icons";
import type { DmSupervisorSubordinate } from "../../api";
import { PRESET_TITLES } from "../types";

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
  if (!reviewTarget) return null;

  const isApproved = reviewTarget.submission?.approvalStatus === "approved";
  const okAnswers = reviewTarget.submission?.answers?.filter((a: any) => a.status === "OK") || [];
  const ngAnswers = reviewTarget.submission?.answers?.filter((a: any) => a.status === "NG") || [];

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
        {/* Modal Header */}
        <div className="spv-modal-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <span className={`spv-chip spv-chip--dept-${reviewTarget.dept.toLowerCase()}`}>
                {reviewTarget.dept}
              </span>
              <span className="spv-chip spv-chip--neutral">
                {reviewTarget.role === "leader" ? "Leader" : "Operator"}
              </span>
              {reviewTarget.lineName && (
                <span className="spv-chip spv-chip--line">{reviewTarget.lineName}</span>
              )}
            </div>
            <h3 className="spv-modal-title">
              Tinjauan Papercard — {reviewTarget.name}
            </h3>
            <span className="spv-modal-subtitle">
              NIK: <strong>{reviewTarget.employeeNo}</strong> · Posisi: <strong>{reviewTarget.position}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="spv-modal-close"
            title="Tutup dialog"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="spv-modal-body">
          {/* Submitter & Timestamp Info Strip */}
          <div className="spv-modal-summary-box">
            <div className="spv-modal-summary-item">
              <span className="spv-modal-summary-label">Nama Karyawan</span>
              <strong className="spv-modal-summary-value">{reviewTarget.name} ({reviewTarget.employeeNo})</strong>
            </div>
            <div className="spv-modal-summary-item">
              <span className="spv-modal-summary-label">Waktu Pengiriman</span>
              <strong className="spv-modal-summary-value">
                {reviewTarget.submission?.submittedAt
                  ? `${new Date(reviewTarget.submission.submittedAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} WIB`
                  : "Belum submit hari ini"}
              </strong>
            </div>
            <div className="spv-modal-summary-item">
              <span className="spv-modal-summary-label">Hasil Verifikasi</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                <span className="spv-mini-badge spv-mini-badge--ok">{okAnswers.length} OK</span>
                {ngAnswers.length > 0 ? (
                  <span className="spv-mini-badge spv-mini-badge--ng">{ngAnswers.length} NG</span>
                ) : (
                  <span className="spv-mini-badge spv-mini-badge--clean">Nol Temuan</span>
                )}
              </div>
            </div>
          </div>

          {/* Checklist Answers from Database */}
          {reviewTarget.submission ? (
            <div className="spv-modal-section">
              <div className="spv-modal-section-header">
                <h4 className="spv-modal-section-title">
                  Rincian Jawaban Checklist ({reviewTarget.submission.answers?.length || 0} Poin)
                </h4>
              </div>

              <div className="spv-modal-answers-list">
                {reviewTarget.submission.answers?.map((answer: any, aIdx: number) => {
                  const isNG = answer.status === "NG";
                  const isText = answer.textValue && !isNG;

                  return (
                    <div
                      key={answer.itemId || aIdx}
                      className={`spv-modal-answer-item ${isNG ? "is-ng" : ""}`}
                    >
                      <div className="spv-modal-answer-main">
                        <span className="spv-modal-answer-title">
                          <span className="spv-modal-answer-num">#{aIdx + 1}</span>{" "}
                          {PRESET_TITLES[answer.itemId] || `Poin Cek ${answer.itemId}`}
                        </span>

                        <span
                          className={`spv-status-badge ${
                            isNG
                              ? "spv-status-badge--ng"
                              : isText
                              ? "spv-status-badge--info"
                              : "spv-status-badge--approved"
                          }`}
                        >
                          {isNG ? "NG (Abnormal)" : isText ? `Nilai: ${answer.textValue}` : "OK"}
                        </span>
                      </div>

                      {/* If NG, show Cause & Solution entered by employee */}
                      {isNG && (
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
                      )}
                    </div>
                  );
                })}
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
                <span>✓ Setujui Papercard</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SupervisorReviewModal;
