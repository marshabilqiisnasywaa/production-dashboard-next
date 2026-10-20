"use client";
import { useState } from "react";
import type { DragEvent } from "react";
import { IconClose } from "@/components/ui/icons";
import {
  ACTION_STATUS_OPTIONS,
  ACTION_TYPE_OPTIONS,
  PDCA_STAGE_BY_STATUS,
  RECURRENCE_OPTIONS,
  createFiveWhyId,
  readImageAsDataUrl,
} from "./fiveWhyData";
import type {
  ActionRow,
  ActionStatus,
  ActionType,
  PdcaStage,
  RecurrenceStatus,
} from "./fiveWhyData";

type ActionPlanProps = {
  actions: ActionRow[];
  canEdit: boolean;
  onChange: (next: ActionRow[]) => void;
  onSave: () => void;
  onNotify: (message: string) => void;
};

const PDCA_STAGES: readonly PdcaStage[] = ["Plan", "Do", "Check", "Act"];

const STATUS_BY_STAGE: Record<PdcaStage, ActionStatus> = {
  Plan: "Rencana",
  Do: "Selesai",
  Check: "Monitoring",
  Act: "Standar",
};

function createEmptyAction(): ActionRow {
  return {
    id: createFiveWhyId("action"),
    rootCause: "",
    solution: "",
    actionType: "Short term",
    pic: "",
    department: "",
    deadline: "",
    status: "Rencana",
    recurrence: "Belum dipantau",
    remark: "",
    beforePhotoUrl: null,
    afterPhotoUrl: null,
  };
}

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

function PhotoSlot({
  label,
  value,
  canEdit,
  onChange,
  onNotify,
  ariaLabel,
}: {
  label: string;
  value: string | null;
  canEdit: boolean;
  onChange: (value: string | null) => void;
  onNotify: (message: string) => void;
  ariaLabel: string;
}) {
  async function handleFile(file: File | null) {
    if (!file) return;
    try {
      const url = await readImageAsDataUrl(file);
      onChange(url);
    } catch {
      onNotify("Foto tidak bisa dibaca.");
    }
  }

  return (
    <div className="dm-5w-photo-slot">
      <span className="dm-5w-photo-slot-label">{label}</span>
      {value ? (
        <img src={value} alt={`${label} ${ariaLabel}`} />
      ) : (
        <span className="dm-5w-photo-slot-empty">Kosong</span>
      )}
      <label className="dm-5w-photo-upload dm-5w-photo-upload-sm">
        <input
          type="file"
          accept="image/*"
          className="dm-5w-sr-only"
          disabled={!canEdit}
          aria-label={`Unggah foto ${label} ${ariaLabel}`}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            event.target.value = "";
            void handleFile(file);
          }}
        />
        <span>{value ? "Ganti" : "Unggah"}</span>
      </label>
    </div>
  );
}

export default function ActionPlan({
  actions,
  canEdit,
  onChange,
  onSave,
  onNotify,
}: ActionPlanProps) {
  const [view, setView] = useState<"table" | "board">("table");
  const [showErrors, setShowErrors] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PdcaStage | null>(null);

  function updateAction(id: string, patch: Partial<ActionRow>) {
    onChange(
      actions.map((action) =>
        action.id === id ? { ...action, ...patch } : action
      )
    );
  }

  function addAction() {
    onChange([...actions, createEmptyAction()]);
    setShowErrors(false);
  }

  function removeAction(id: string) {
    onChange(actions.filter((action) => action.id !== id));
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
    updateAction(id, { status: STATUS_BY_STAGE[stage] });
  }

  function handleSave() {
    setShowErrors(true);
    const missing = actions.some(
      (action) => !action.pic.trim() || !action.department.trim()
    );
    if (missing) {
      setView("table");
      onNotify("Lengkapi PIC dan Departemen sebelum menyimpan PDCA.");
      return;
    }
    onSave();
  }

  return (
    <div className="dm-5w-card">
      <div className="dm-5w-action-head">
        <div>
          <h2 className="dm-5w-card-title">Solusi &amp; Pencegahan Terulang</h2>
          <p className="dm-5w-card-sub">
            Kelola tindak lanjut, PIC, dan status PDCA.
          </p>
        </div>
        <div className="dm-5w-view-toggle" role="group" aria-label="Pilih tampilan">
          <button
            type="button"
            className={`dm-5w-view-btn ${view === "table" ? "is-active" : ""}`}
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
          >
            Tabel
          </button>
          <button
            type="button"
            className={`dm-5w-view-btn ${view === "board" ? "is-active" : ""}`}
            aria-pressed={view === "board"}
            onClick={() => setView("board")}
          >
            Board
          </button>
        </div>
      </div>

      {view === "table" ? (
        <div className="dm-5w-table-wrap">
          <table className="dm-5w-table dm-5w-action-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Root Cause</th>
                <th>Solusi</th>
                <th>Tipe Aksi</th>
                <th>PIC</th>
                <th>Departemen</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Apakah terulang?</th>
                <th>Monitoring &amp; Remark</th>
                <th>PDCA</th>
                <th>
                  <span className="dm-5w-sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action, index) => {
                const picInvalid = showErrors && !action.pic.trim();
                const departmentInvalid =
                  showErrors && !action.department.trim();
                return (
                  <tr key={action.id}>
                    <td>{index + 1}</td>
                    <td>
                      <input
                        className="dm-5w-input is-wide"
                        value={action.rootCause}
                        onChange={(event) =>
                          updateAction(action.id, {
                            rootCause: event.target.value,
                          })
                        }
                        disabled={!canEdit}
                        aria-label={`Root cause baris ${index + 1}`}
                      />
                    </td>
                    <td>
                      <input
                        className="dm-5w-input is-wide"
                        value={action.solution}
                        onChange={(event) =>
                          updateAction(action.id, {
                            solution: event.target.value,
                          })
                        }
                        disabled={!canEdit}
                        aria-label={`Solusi baris ${index + 1}`}
                      />
                    </td>
                    <td>
                      <select
                        className="dm-5w-select"
                        value={action.actionType}
                        onChange={(event) =>
                          updateAction(action.id, {
                            actionType: event.target.value as ActionType,
                          })
                        }
                        disabled={!canEdit}
                        aria-label={`Tipe aksi baris ${index + 1}`}
                      >
                        {ACTION_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className={`dm-5w-input ${
                          picInvalid ? "is-invalid" : ""
                        }`}
                        value={action.pic}
                        onChange={(event) =>
                          updateAction(action.id, { pic: event.target.value })
                        }
                        disabled={!canEdit}
                        aria-label={`PIC baris ${index + 1}`}
                        aria-invalid={picInvalid}
                        aria-describedby={
                          picInvalid ? `dm-5w-pic-error-${action.id}` : undefined
                        }
                      />
                      {picInvalid ? (
                        <span
                          className="dm-5w-field-error"
                          id={`dm-5w-pic-error-${action.id}`}
                        >
                          Wajib diisi
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <input
                        className={`dm-5w-input ${
                          departmentInvalid ? "is-invalid" : ""
                        }`}
                        value={action.department}
                        onChange={(event) =>
                          updateAction(action.id, {
                            department: event.target.value,
                          })
                        }
                        disabled={!canEdit}
                        aria-label={`Departemen baris ${index + 1}`}
                        aria-invalid={departmentInvalid}
                        aria-describedby={
                          departmentInvalid
                            ? `dm-5w-dept-error-${action.id}`
                            : undefined
                        }
                      />
                      {departmentInvalid ? (
                        <span
                          className="dm-5w-field-error"
                          id={`dm-5w-dept-error-${action.id}`}
                        >
                          Wajib diisi
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <input
                        type="date"
                        className="dm-5w-input"
                        value={action.deadline}
                        onChange={(event) =>
                          updateAction(action.id, {
                            deadline: event.target.value,
                          })
                        }
                        disabled={!canEdit}
                        aria-label={`Deadline baris ${index + 1}`}
                      />
                    </td>
                    <td>
                      <select
                        className="dm-5w-select"
                        value={action.status}
                        onChange={(event) =>
                          updateAction(action.id, {
                            status: event.target.value as ActionStatus,
                          })
                        }
                        disabled={!canEdit}
                        aria-label={`Status baris ${index + 1}`}
                      >
                        {ACTION_STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="dm-5w-select"
                        value={action.recurrence}
                        onChange={(event) =>
                          updateAction(action.id, {
                            recurrence: event.target.value as RecurrenceStatus,
                          })
                        }
                        disabled={!canEdit}
                        aria-label={`Apakah terulang baris ${index + 1}`}
                      >
                        {RECURRENCE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <textarea
                        className="dm-5w-textarea"
                        rows={2}
                        value={action.remark}
                        onChange={(event) =>
                          updateAction(action.id, {
                            remark: event.target.value,
                          })
                        }
                        disabled={!canEdit}
                        aria-label={`Monitoring dan remark baris ${index + 1}`}
                      />
                      <div className="dm-5w-photo-slots">
                        <PhotoSlot
                          label="Before"
                          value={action.beforePhotoUrl}
                          canEdit={canEdit}
                          onChange={(value) =>
                            updateAction(action.id, { beforePhotoUrl: value })
                          }
                          onNotify={onNotify}
                          ariaLabel={`baris ${index + 1}`}
                        />
                        <PhotoSlot
                          label="After"
                          value={action.afterPhotoUrl}
                          canEdit={canEdit}
                          onChange={(value) =>
                            updateAction(action.id, { afterPhotoUrl: value })
                          }
                          onNotify={onNotify}
                          ariaLabel={`baris ${index + 1}`}
                        />
                      </div>
                    </td>
                    <td>
                      <span
                        className={`dm-5w-pdca-badge ${stageClass(
                          PDCA_STAGE_BY_STATUS[action.status]
                        )}`}
                      >
                        {PDCA_STAGE_BY_STATUS[action.status]}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="dm-5w-icon-btn"
                        onClick={() => removeAction(action.id)}
                        disabled={!canEdit}
                        aria-label={`Hapus aksi baris ${index + 1}`}
                      >
                        <IconClose size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {actions.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <p className="dm-5w-hint">Belum ada baris aksi.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dm-5w-board">
          {PDCA_STAGES.map((stage) => {
            const items = actions.filter(
              (action) => PDCA_STAGE_BY_STATUS[action.status] === stage
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
                  <span className={`dm-5w-pdca-badge ${stageClass(stage)}`}>
                    {stage}
                  </span>
                  <span className="dm-5w-board-count">{items.length}</span>
                </header>
                <div className="dm-5w-board-list">
                  {items.map((action) => (
                    <article
                      key={action.id}
                      className={`dm-5w-board-card ${
                        draggingId === action.id ? "is-dragging" : ""
                      } ${canEdit ? "" : "is-static"}`}
                      draggable={canEdit}
                      onDragStart={(event) =>
                        handleDragStart(event, action.id)
                      }
                      onDragEnd={handleDragEnd}
                      tabIndex={0}
                      aria-label={`${action.solution || "Aksi"} untuk ${
                        action.pic || "PIC belum diisi"
                      }`}
                    >
                      <p className="dm-5w-board-solution">
                        {action.solution || "Solusi belum diisi"}
                      </p>
                      <div className="dm-5w-board-meta">
                        <span>{action.pic || "PIC belum diisi"}</span>
                        <span>{formatDeadline(action.deadline)}</span>
                      </div>
                      <div className="dm-5w-board-foot">
                        <span
                          className={`dm-5w-pdca-badge ${stageClass(
                            PDCA_STAGE_BY_STATUS[action.status]
                          )}`}
                        >
                          {PDCA_STAGE_BY_STATUS[action.status]}
                        </span>
                        {canEdit ? (
                          <select
                            className="dm-5w-board-move"
                            value={stage}
                            onChange={(event) =>
                              updateAction(action.id, {
                                status:
                                  STATUS_BY_STAGE[
                                    event.target.value as PdcaStage
                                  ],
                              })
                            }
                            aria-label={`Pindahkan ${
                              action.solution || "aksi"
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
                    <p className="dm-5w-board-empty">Belum ada aksi</p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="dm-5w-actions-footer">
        <span className="dm-5w-actions-footer-note">
          {actions.length} baris aksi
        </span>
        <div className="dm-5w-actions-footer-actions">
          {canEdit ? (
            <button
              type="button"
              className="dm-5w-btn dm-5w-btn-secondary dm-5w-btn-sm"
              onClick={addAction}
            >
              + Tambah aksi
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
    </div>
  );
}
