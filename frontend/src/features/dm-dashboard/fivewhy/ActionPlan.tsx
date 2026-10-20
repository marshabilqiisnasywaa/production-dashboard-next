"use client";
import { useState } from "react";
import type { DragEvent } from "react";
import { IconClose } from "@/components/ui/icons";
import {
  PDCA_STAGE_BY_STATUS,
  PDCA_STAGES,
  RECURRENCE_LABELS,
  RECURRENCE_OPTIONS,
  SOLUTION_STATUS_LABELS,
  SOLUTION_STATUS_OPTIONS,
  SOLUTION_TYPE_LABELS,
  SOLUTION_TYPE_OPTIONS,
  createEmptySolution,
  readImageAsDataUrl,
} from "./fiveWhyData";
import type {
  PdcaStage,
  RecurrenceStatus,
  Solution,
  SolutionStatus,
  SolutionType,
  WhyNode,
} from "./fiveWhyData";

type ActionPlanProps = {
  solutions: Solution[];
  rootCause: WhyNode | null;
  canEdit: boolean;
  onChange: (next: Solution[]) => void;
  onSave: () => void;
  onNotify: (message: string) => void;
  onGoToWhy: () => void;
  onShowRootCause: () => void;
};

type PhotoFieldProps = {
  label: string;
  photos: string[];
  canEdit: boolean;
  ariaLabel: string;
  onAdd: (photos: string[]) => void;
  onRemove: (index: number) => void;
  onPreview: (url: string) => void;
  onNotify: (message: string) => void;
};

const STATUS_BY_STAGE: Record<PdcaStage, SolutionStatus> = {
  Plan: "rencana",
  Do: "dikerjakan",
  Check: "dipantau",
  Act: "standar",
};

function stageClass(stage: PdcaStage) {
  return `is-${stage.toLowerCase()}`;
}

function formatDeadline(value: string) {
  if (!value) return "Tanpa deadline";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function PhotoField({
  label,
  photos,
  canEdit,
  ariaLabel,
  onAdd,
  onRemove,
  onPreview,
  onNotify,
}: PhotoFieldProps) {
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      const urls = await Promise.all(
        Array.from(files).map((file) => readImageAsDataUrl(file))
      );
      onAdd(urls);
    } catch {
      onNotify("Foto tidak bisa dibaca.");
    }
  }

  return (
    <div className="dm-5w-photo-field">
      <span className="dm-5w-photo-field-label">{label}</span>
      <div className="dm-5w-evidence-photos">
        {photos.map((photo, index) => (
          <div className="dm-5w-evidence-thumb" key={`${label}-photo-${index}`}>
            <button
              type="button"
              className="dm-5w-evidence-thumb-open"
              onClick={() => onPreview(photo)}
              aria-label={`Lihat foto ${label} lebih besar`}
            >
              <img src={photo} alt="" />
            </button>
            <button
              type="button"
              className="dm-5w-evidence-thumb-remove"
              onClick={() => onRemove(index)}
              disabled={!canEdit}
              aria-label={`Hapus foto ${label}`}
            >
              <IconClose size={9} />
            </button>
          </div>
        ))}
        <label className="dm-5w-evidence-upload">
          <input
            type="file"
            multiple
            accept="image/*"
            className="dm-5w-sr-only"
            disabled={!canEdit}
            aria-label={`Unggah foto ${label} ${ariaLabel}`}
            onChange={(event) => {
              const files = event.target.files;
              event.target.value = "";
              void handleFiles(files);
            }}
          />
          <span>Unggah foto</span>
        </label>
      </div>
    </div>
  );
}

export default function ActionPlan({
  solutions,
  rootCause,
  canEdit,
  onChange,
  onSave,
  onNotify,
  onGoToWhy,
  onShowRootCause,
}: ActionPlanProps) {
  const [view, setView] = useState<"list" | "board">("list");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PdcaStage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function updateSolution(id: string, patch: Partial<Solution>) {
    onChange(
      solutions.map((solution) =>
        solution.id === id ? { ...solution, ...patch } : solution
      )
    );
  }

  function addSolution() {
    onChange([...solutions, createEmptySolution()]);
    setView("list");
  }

  function removeSolution(solution: Solution) {
    const filled = Boolean(
      solution.text.trim() || solution.pic.trim() || solution.dept.trim()
    );
    if (
      filled &&
      !window.confirm("Hapus solusi ini? Isian solusi akan dibuang.")
    ) {
      return;
    }
    onChange(solutions.filter((item) => item.id !== solution.id));
  }

  function handleDragStart(event: DragEvent<HTMLElement>, id: string) {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverStage(null);
  }

  function handleDrop(event: DragEvent<HTMLElement>, stage: PdcaStage) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggingId;
    setDragOverStage(null);
    setDraggingId(null);
    if (!id) return;
    updateSolution(id, { status: STATUS_BY_STAGE[stage] });
  }

  function isSolutionComplete(solution: Solution) {
    return Boolean(
      solution.text.trim() &&
        solution.pic.trim() &&
        solution.dept.trim() &&
        solution.deadline.trim()
    );
  }

  function handleSave() {
    if (!rootCause) {
      onNotify("Tandai Root Cause sebelum menyimpan PDCA.");
      return;
    }
    const incomplete = solutions.some(
      (solution) => !isSolutionComplete(solution)
    );
    if (incomplete) {
      setView("list");
      onNotify("Lengkapi Solusi, PIC, Departemen, dan Deadline.");
      return;
    }
    onSave();
  }

  return (
    <div className="dm-5w-action-plan">
      {rootCause ? (
        <section className="dm-5w-card dm-5w-root-cause-card">
          <header className="dm-5w-root-cause-head">
            <h2 className="dm-5w-card-title">Root Cause</h2>
            <span className="dm-5w-why-badge">Why {rootCause.level}</span>
          </header>
          <p className="dm-5w-root-cause-text">
            {rootCause.statement.trim() || "Pernyataan Why belum diisi."}
          </p>
          <button
            type="button"
            className="dm-5w-add-field"
            onClick={onShowRootCause}
          >
            Lihat di Analisis 5Why
          </button>
        </section>
      ) : (
        <section className="dm-5w-card dm-5w-root-cause-empty">
          <p>
            Belum ada Root Cause. Tandai satu Why sebagai Root Cause di tab
            Analisis 5Why
          </p>
          <button
            type="button"
            className="dm-5w-btn dm-5w-btn-secondary dm-5w-btn-sm"
            onClick={onGoToWhy}
          >
            Ke Analisis 5Why
          </button>
        </section>
      )}

      {rootCause ? (
        <section className="dm-5w-card">
          <div className="dm-5w-action-head">
            <div>
              <h2 className="dm-5w-card-title">
                Solusi &amp; Pencegahan Terulang
              </h2>
              <p className="dm-5w-card-sub">
                Susun rencana perbaikan dan pantau penerapannya.
              </p>
            </div>
            <div
              className="dm-5w-view-toggle"
              role="group"
              aria-label="Pilih tampilan solusi"
            >
              <button
                type="button"
                className={`dm-5w-view-btn ${
                  view === "list" ? "is-active" : ""
                }`}
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                Daftar
              </button>
              <button
                type="button"
                className={`dm-5w-view-btn ${
                  view === "board" ? "is-active" : ""
                }`}
                aria-pressed={view === "board"}
                onClick={() => setView("board")}
              >
                Board
              </button>
            </div>
          </div>

          {view === "list" ? (
            <div className="dm-5w-solution-list">
              {solutions.map((solution, index) => {
                const stage = PDCA_STAGE_BY_STATUS[solution.status];
                const textMissing = !solution.text.trim();
                const picMissing = !solution.pic.trim();
                const deptMissing = !solution.dept.trim();
                const deadlineMissing = !solution.deadline.trim();
                return (
                  <article className="dm-5w-solution-card" key={solution.id}>
                    <header className="dm-5w-solution-head">
                      <div className="dm-5w-solution-head-left">
                        <h3 className="dm-5w-solution-title">
                          Solusi {index + 1}
                        </h3>
                        <span
                          className={`dm-5w-pdca-badge ${stageClass(stage)}`}
                        >
                          {stage}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="dm-5w-icon-btn"
                        onClick={() => removeSolution(solution)}
                        disabled={!canEdit}
                        aria-label={`Hapus solusi ${index + 1}`}
                      >
                        <IconClose size={13} />
                      </button>
                    </header>

                    <div className="dm-5w-pdca-section">
                      <span className="dm-5w-pdca-tag" aria-hidden="true">
                        P
                      </span>
                      <div className="dm-5w-pdca-body">
                        <label className="dm-5w-field">
                          <span className="dm-5w-label">Solusi</span>
                          <textarea
                            className="dm-5w-textarea"
                            rows={2}
                            value={solution.text}
                            placeholder="Tulis solusi yang akan dijalankan"
                            onChange={(event) =>
                              updateSolution(solution.id, {
                                text: event.target.value,
                              })
                            }
                            disabled={!canEdit}
                            aria-label={`Solusi ${index + 1}`}
                          />
                          {textMissing ? (
                            <span className="dm-5w-field-error">
                              Wajib diisi
                            </span>
                          ) : null}
                        </label>

                        <div className="dm-5w-solution-grid">
                          <label className="dm-5w-field">
                            <span className="dm-5w-label">Tipe Aksi</span>
                            <select
                              className="dm-5w-select"
                              value={solution.type}
                              onChange={(event) =>
                                updateSolution(solution.id, {
                                  type: event.target.value as SolutionType,
                                })
                              }
                              disabled={!canEdit}
                              aria-label={`Tipe aksi solusi ${index + 1}`}
                            >
                              {SOLUTION_TYPE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {SOLUTION_TYPE_LABELS[option]}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="dm-5w-field">
                            <span className="dm-5w-label">PIC</span>
                            <input
                              className="dm-5w-input"
                              value={solution.pic}
                              placeholder="Nama penanggung jawab"
                              onChange={(event) =>
                                updateSolution(solution.id, {
                                  pic: event.target.value,
                                })
                              }
                              disabled={!canEdit}
                              aria-label={`PIC solusi ${index + 1}`}
                            />
                            {picMissing ? (
                              <span className="dm-5w-field-error">
                                Wajib diisi
                              </span>
                            ) : null}
                          </label>

                          <label className="dm-5w-field">
                            <span className="dm-5w-label">Departemen</span>
                            <input
                              className="dm-5w-input"
                              value={solution.dept}
                              placeholder="Departemen terkait"
                              onChange={(event) =>
                                updateSolution(solution.id, {
                                  dept: event.target.value,
                                })
                              }
                              disabled={!canEdit}
                              aria-label={`Departemen solusi ${index + 1}`}
                            />
                            {deptMissing ? (
                              <span className="dm-5w-field-error">
                                Wajib diisi
                              </span>
                            ) : null}
                          </label>

                          <label className="dm-5w-field">
                            <span className="dm-5w-label">Deadline</span>
                            <input
                              type="date"
                              className="dm-5w-input"
                              value={solution.deadline}
                              onChange={(event) =>
                                updateSolution(solution.id, {
                                  deadline: event.target.value,
                                })
                              }
                              disabled={!canEdit}
                              aria-label={`Deadline solusi ${index + 1}`}
                            />
                            {deadlineMissing ? (
                              <span className="dm-5w-field-error">
                                Wajib diisi
                              </span>
                            ) : null}
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="dm-5w-dc-grid">
                      <div className="dm-5w-pdca-section">
                        <span className="dm-5w-pdca-tag" aria-hidden="true">
                          D
                        </span>
                        <div className="dm-5w-pdca-body">
                          <label className="dm-5w-field">
                            <span className="dm-5w-label">Status</span>
                            <select
                              className="dm-5w-select"
                              value={solution.status}
                              onChange={(event) =>
                                updateSolution(solution.id, {
                                  status: event.target.value as SolutionStatus,
                                })
                              }
                              disabled={!canEdit}
                              aria-label={`Status solusi ${index + 1}`}
                            >
                              {SOLUTION_STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {SOLUTION_STATUS_LABELS[option]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>

                      <div className="dm-5w-pdca-section">
                        <span className="dm-5w-pdca-tag" aria-hidden="true">
                          C
                        </span>
                        <div className="dm-5w-pdca-body">
                          <label className="dm-5w-field">
                            <span className="dm-5w-label">
                              Apakah masalah terulang kembali?
                            </span>
                            <select
                              className="dm-5w-select"
                              value={solution.recurred}
                              onChange={(event) =>
                                updateSolution(solution.id, {
                                  recurred: event.target
                                    .value as RecurrenceStatus,
                                })
                              }
                              disabled={!canEdit}
                              aria-label={`Apakah masalah terulang untuk solusi ${
                                index + 1
                              }`}
                            >
                              {RECURRENCE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {RECURRENCE_LABELS[option]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="dm-5w-pdca-section">
                      <span className="dm-5w-pdca-tag" aria-hidden="true">
                        A
                      </span>
                      <div className="dm-5w-pdca-body">
                        <label className="dm-5w-field">
                          <span className="dm-5w-label">
                            Monitoring &amp; Remark
                          </span>
                          <textarea
                            className="dm-5w-textarea"
                            rows={2}
                            value={solution.remark}
                            placeholder="Catatan monitoring dan tindak lanjut"
                            onChange={(event) =>
                              updateSolution(solution.id, {
                                remark: event.target.value,
                              })
                            }
                            disabled={!canEdit}
                            aria-label={`Monitoring dan remark solusi ${
                              index + 1
                            }`}
                          />
                        </label>
                        <div className="dm-5w-photo-row">
                          <PhotoField
                            label="Before"
                            photos={solution.photosBefore}
                            canEdit={canEdit}
                            ariaLabel={`solusi ${index + 1}`}
                            onAdd={(photos) =>
                              updateSolution(solution.id, {
                                photosBefore: [
                                  ...solution.photosBefore,
                                  ...photos,
                                ],
                              })
                            }
                            onRemove={(photoIndex) =>
                              updateSolution(solution.id, {
                                photosBefore: solution.photosBefore.filter(
                                  (_, current) => current !== photoIndex
                                ),
                              })
                            }
                            onPreview={setPreviewUrl}
                            onNotify={onNotify}
                          />
                          <PhotoField
                            label="After"
                            photos={solution.photosAfter}
                            canEdit={canEdit}
                            ariaLabel={`solusi ${index + 1}`}
                            onAdd={(photos) =>
                              updateSolution(solution.id, {
                                photosAfter: [
                                  ...solution.photosAfter,
                                  ...photos,
                                ],
                              })
                            }
                            onRemove={(photoIndex) =>
                              updateSolution(solution.id, {
                                photosAfter: solution.photosAfter.filter(
                                  (_, current) => current !== photoIndex
                                ),
                              })
                            }
                            onPreview={setPreviewUrl}
                            onNotify={onNotify}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
              {solutions.length === 0 ? (
                <p className="dm-5w-hint">
                  Belum ada solusi. Tambahkan solusi untuk menindaklanjuti Root
                  Cause.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="dm-5w-board">
              {PDCA_STAGES.map((stage) => {
                const items = solutions.filter(
                  (solution) => PDCA_STAGE_BY_STATUS[solution.status] === stage
                );
                return (
                  <section
                    key={stage}
                    className={`dm-5w-board-col ${
                      dragOverStage === stage ? "is-dragover" : ""
                    }`}
                    aria-label={`Tahap ${stage}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverStage(stage);
                    }}
                    onDragLeave={() =>
                      setDragOverStage((current) =>
                        current === stage ? null : current
                      )
                    }
                    onDrop={(event) => handleDrop(event, stage)}
                  >
                    <header className="dm-5w-board-head">
                      <span
                        className={`dm-5w-pdca-badge ${stageClass(stage)}`}
                      >
                        {stage}
                      </span>
                      <span className="dm-5w-board-count">{items.length}</span>
                    </header>
                    <div className="dm-5w-board-list">
                      {items.map((solution) => (
                        <article
                          key={solution.id}
                          className={`dm-5w-board-card ${
                            draggingId === solution.id ? "is-dragging" : ""
                          } ${canEdit ? "" : "is-static"}`}
                          draggable={canEdit}
                          onDragStart={(event) =>
                            handleDragStart(event, solution.id)
                          }
                          onDragEnd={handleDragEnd}
                          tabIndex={0}
                          aria-label={`${solution.text || "Solusi"} untuk ${
                            solution.pic || "PIC belum diisi"
                          }`}
                        >
                          <p className="dm-5w-board-solution">
                            {solution.text || "Solusi belum diisi"}
                          </p>
                          <div className="dm-5w-board-meta">
                            <span>{solution.pic || "PIC belum diisi"}</span>
                            <span>{formatDeadline(solution.deadline)}</span>
                          </div>
                          <div className="dm-5w-board-foot">
                            <span className="dm-5w-board-type">
                              {SOLUTION_TYPE_LABELS[solution.type]}
                            </span>
                            {canEdit ? (
                              <select
                                className="dm-5w-board-move"
                                value={stage}
                                onChange={(event) =>
                                  updateSolution(solution.id, {
                                    status:
                                      STATUS_BY_STAGE[
                                        event.target.value as PdcaStage
                                      ],
                                  })
                                }
                                aria-label={`Pindahkan ${
                                  solution.text || "solusi"
                                } ke tahap`}
                              >
                                {PDCA_STAGES.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                        </article>
                      ))}
                      {items.length === 0 ? (
                        <p className="dm-5w-board-empty">Belum ada solusi</p>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <div className="dm-5w-actions-footer">
            <span className="dm-5w-actions-footer-note">
              {solutions.length} solusi
            </span>
            <div className="dm-5w-actions-footer-actions">
              {canEdit ? (
                <button
                  type="button"
                  className="dm-5w-btn dm-5w-btn-secondary dm-5w-btn-sm"
                  onClick={addSolution}
                >
                  + Tambah solusi
                </button>
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  className="dm-5w-btn dm-5w-btn-primary"
                  onClick={handleSave}
                >
                  Simpan PDCA
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {previewUrl ? (
        <div
          className="dm-5w-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Foto solusi"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            className="dm-5w-lightbox-close"
            onClick={() => setPreviewUrl(null)}
            aria-label="Tutup foto"
          >
            <IconClose size={16} />
          </button>
          <img
            src={previewUrl}
            alt="Foto solusi diperbesar"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
