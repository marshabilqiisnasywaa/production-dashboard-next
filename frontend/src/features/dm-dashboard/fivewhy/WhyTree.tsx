"use client";
import { useState } from "react";
import { IconCheck, IconClose } from "@/components/ui/icons";
import {
  BRANCH_VERIFICATION_LABELS,
  EVIDENCE_LABEL_OPTIONS,
  WHY_VERIFICATION_LABELS,
  createFiveWhyId,
  readImageAsDataUrl,
} from "./fiveWhyData";
import type {
  BranchVerification,
  Evidence,
  WhyBranch,
  WhyNode,
  WhyVerification,
} from "./fiveWhyData";

type WhyTreeProps = {
  whys: WhyNode[];
  problemLabel: string;
  canEdit: boolean;
  onChange: (next: WhyNode[]) => void;
  onSave: () => void;
  onNotify: (message: string) => void;
};

type EvidenceOwner = {
  nodeId: string;
  branchId?: string;
};

const MAIN_VERIFICATION_ORDER: readonly WhyVerification[] = [
  "unverified",
  "verified",
  "not_root",
  "root",
];

const BRANCH_VERIFICATION_ORDER: readonly BranchVerification[] = [
  "unverified",
  "verified",
  "not_root",
];

const PRESET_EVIDENCE_LABELS = EVIDENCE_LABEL_OPTIONS.filter(
  (label) => label !== "Lainnya..."
);

function evidenceTone(label: string) {
  if (label === "OK" || label === "Sesudah") return "is-ok";
  if (label === "NG") return "is-ng";
  if (label === "Standar") return "is-standar";
  if (label === "Aktual") return "is-aktual";
  if (label === "Sebelum") return "is-sebelum";
  if (label === "Catatan") return "is-catatan";
  return "is-lainnya";
}

function evidenceCountLabel(count: number) {
  return `${count} bukti`;
}

function photoCountLabel(count: number) {
  return `${count} foto`;
}

export default function WhyTree({
  whys,
  problemLabel,
  canEdit,
  onChange,
  onSave,
  onNotify,
}: WhyTreeProps) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [customLabelFor, setCustomLabelFor] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function updateNode(id: string, patch: Partial<WhyNode>) {
    onChange(whys.map((node) => (node.id === id ? { ...node, ...patch } : node)));
  }

  function updateBranch(
    nodeId: string,
    branchId: string,
    patch: Partial<WhyBranch>
  ) {
    onChange(
      whys.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              branches: node.branches.map((branch) =>
                branch.id === branchId ? { ...branch, ...patch } : branch
              ),
            }
          : node
      )
    );
  }

  function evidenceFor(owner: EvidenceOwner) {
    const node = whys.find((item) => item.id === owner.nodeId);
    if (!node) return [];
    if (owner.branchId) {
      return (
        node.branches.find((branch) => branch.id === owner.branchId)
          ?.evidence ?? []
      );
    }
    return node.evidence;
  }

  function setEvidence(owner: EvidenceOwner, evidence: Evidence[]) {
    if (owner.branchId) {
      updateBranch(owner.nodeId, owner.branchId, { evidence });
      return;
    }
    updateNode(owner.nodeId, { evidence });
  }

  function makeEvidence(label: string): Evidence {
    return {
      id: createFiveWhyId("evidence"),
      label,
      text: "",
      photos: [],
    };
  }

  function addEvidence(owner: EvidenceOwner, label: string) {
    const entry = makeEvidence(label);
    setEvidence(owner, [...evidenceFor(owner), entry]);
    return entry.id;
  }

  function addEvidencePair(owner: EvidenceOwner, first: string, second: string) {
    setEvidence(owner, [
      ...evidenceFor(owner),
      makeEvidence(first),
      makeEvidence(second),
    ]);
  }

  function updateEvidence(
    owner: EvidenceOwner,
    evidenceId: string,
    patch: Partial<Evidence>
  ) {
    setEvidence(
      owner,
      evidenceFor(owner).map((entry) =>
        entry.id === evidenceId ? { ...entry, ...patch } : entry
      )
    );
  }

  function removeEvidence(owner: EvidenceOwner, evidenceId: string) {
    const entry = evidenceFor(owner).find((item) => item.id === evidenceId);
    if (!entry) return;
    const filled = Boolean(entry.text.trim() || entry.photos.length > 0);
    if (
      filled &&
      !window.confirm("Hapus blok bukti ini? Isian dan foto akan dibuang.")
    ) {
      return;
    }
    setEvidence(
      owner,
      evidenceFor(owner).filter((item) => item.id !== evidenceId)
    );
    setCustomLabelFor((current) => (current === evidenceId ? null : current));
  }

  function removePhoto(
    owner: EvidenceOwner,
    evidenceId: string,
    index: number
  ) {
    const entry = evidenceFor(owner).find((item) => item.id === evidenceId);
    if (!entry) return;
    updateEvidence(owner, evidenceId, {
      photos: entry.photos.filter((_, photoIndex) => photoIndex !== index),
    });
  }

  async function addPhotos(
    owner: EvidenceOwner,
    evidenceId: string,
    files: FileList | null
  ) {
    if (!files || files.length === 0) return;
    try {
      const photos = await Promise.all(
        Array.from(files).map((file) => readImageAsDataUrl(file))
      );
      const entry = evidenceFor(owner).find((item) => item.id === evidenceId);
      if (!entry) return;
      updateEvidence(owner, evidenceId, {
        photos: [...entry.photos, ...photos],
      });
    } catch {
      onNotify("Foto tidak bisa dibaca.");
    }
  }

  function handleAddEvidence(owner: EvidenceOwner, value: string) {
    if (!value) return;
    if (value === "Lainnya...") {
      const evidenceId = addEvidence(owner, "");
      setCustomLabelFor(evidenceId);
      return;
    }
    addEvidence(owner, value);
  }

  function handleEvidenceLabel(
    owner: EvidenceOwner,
    evidence: Evidence,
    value: string
  ) {
    if (value === "Lainnya...") {
      updateEvidence(owner, evidence.id, { label: "" });
      setCustomLabelFor(evidence.id);
      return;
    }
    updateEvidence(owner, evidence.id, { label: value });
  }

  function finishCustomLabel(owner: EvidenceOwner, evidence: Evidence) {
    updateEvidence(owner, evidence.id, {
      label: evidence.label.trim() || "Lainnya...",
    });
    setCustomLabelFor((current) => (current === evidence.id ? null : current));
  }

  function addBranch(nodeId: string) {
    onChange(
      whys.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              branches: [
                ...node.branches,
                {
                  id: createFiveWhyId("why-branch"),
                  statement: "",
                  verification: "unverified",
                  evidence: [],
                },
              ],
            }
          : node
      )
    );
  }

  function removeBranch(nodeId: string, branchId: string) {
    const node = whys.find((item) => item.id === nodeId);
    const branch = node?.branches.find((item) => item.id === branchId);
    if (!branch) return;
    const filled = Boolean(
      branch.statement.trim() ||
        branch.evidence.some(
          (entry) => entry.text.trim() || entry.photos.length > 0
        )
    );
    if (
      filled &&
      !window.confirm("Hapus hipotesis ini? Isian dan bukti akan dibuang.")
    ) {
      return;
    }
    onChange(
      whys.map((item) =>
        item.id === nodeId
          ? {
              ...item,
              branches: item.branches.filter(
                (entry) => entry.id !== branchId
              ),
            }
          : item
      )
    );
  }

  function setNodeVerification(nodeId: string, next: WhyVerification) {
    onChange(
      whys.map((item) => {
        if (item.id === nodeId) return { ...item, verification: next };
        if (next === "root" && item.verification === "root") {
          return { ...item, verification: "verified" };
        }
        return item;
      })
    );
  }

  function setBranchVerification(
    nodeId: string,
    branchId: string,
    next: BranchVerification
  ) {
    updateBranch(nodeId, branchId, { verification: next });
  }

  const ordered = [...whys].sort((a, b) => a.level - b.level);
  const statements = ordered
    .filter((why) => why.statement.trim())
    .map((why) => why.statement.trim());
  const chainText = statements.length
    ? `Karena ${statements.join(", maka ")}.`
    : "Rantai sebab akan muncul setelah Why diisi.";
  const filled = whys.filter((why) => why.statement.trim()).length;
  const rootCount = whys.filter((why) => why.verification === "root").length;
  const rejectedCount = whys.reduce(
    (total, why) =>
      total +
      why.branches.filter((branch) => branch.verification === "not_root")
        .length,
    0
  );

  function questionFor(node: WhyNode) {
    if (node.level === 1) {
      const target = problemLabel.trim() || "masalah ini";
      return `Kenapa ${target}?`;
    }
    const previous = ordered.find((item) => item.level === node.level - 1);
    const subject = previous?.statement.trim() || "hal ini";
    return `Kenapa ${subject}?`;
  }

  function evidenceStats(evidence: Evidence[]) {
    return {
      blocks: evidence.length,
      photos: evidence.reduce((total, entry) => total + entry.photos.length, 0),
    };
  }

  function renderEvidence(
    owner: EvidenceOwner,
    evidence: Evidence,
    positionLabel: string
  ) {
    const isCustomLabel = customLabelFor === evidence.id;
    const customOption =
      evidence.label && !EVIDENCE_LABEL_OPTIONS.includes(evidence.label)
        ? evidence.label
        : null;
    return (
      <article className="dm-5w-evidence-block" key={evidence.id}>
        <header className="dm-5w-evidence-head">
          {isCustomLabel ? (
            <input
              className="dm-5w-evidence-label-input"
              value={evidence.label}
              placeholder="Nama label"
              onChange={(event) =>
                updateEvidence(owner, evidence.id, {
                  label: event.target.value,
                })
              }
              onBlur={() => finishCustomLabel(owner, evidence)}
              disabled={!canEdit}
              autoFocus
              aria-label={`Nama label bukti ${positionLabel}`}
            />
          ) : (
            <select
              className={`dm-5w-evidence-chip ${evidenceTone(evidence.label)}`}
              value={evidence.label || "Lainnya..."}
              onChange={(event) =>
                handleEvidenceLabel(owner, evidence, event.target.value)
              }
              disabled={!canEdit}
              aria-label={`Label bukti ${positionLabel}`}
            >
              {customOption ? (
                <option value={customOption}>{customOption}</option>
              ) : null}
              {PRESET_EVIDENCE_LABELS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
              <option value="Lainnya...">Lainnya...</option>
            </select>
          )}
          <button
            type="button"
            className="dm-5w-evidence-remove"
            onClick={() => removeEvidence(owner, evidence.id)}
            disabled={!canEdit}
            aria-label={`Hapus blok bukti ${positionLabel}`}
          >
            <IconClose size={10} />
          </button>
        </header>

        <textarea
          className="dm-5w-textarea dm-5w-evidence-text"
          rows={2}
          value={evidence.text}
          placeholder="Tulis kondisi atau temuan"
          onChange={(event) =>
            updateEvidence(owner, evidence.id, { text: event.target.value })
          }
          disabled={!canEdit}
          aria-label={`Isi bukti ${positionLabel}`}
        />

        <div className="dm-5w-evidence-photos">
          {evidence.photos.map((photo, index) => (
            <div
              className="dm-5w-evidence-thumb"
              key={`${evidence.id}-photo-${index}`}
            >
              <button
                type="button"
                className="dm-5w-evidence-thumb-open"
                onClick={() => setPreviewUrl(photo)}
                aria-label="Lihat foto lebih besar"
              >
                <img src={photo} alt="" />
              </button>
              <button
                type="button"
                className="dm-5w-evidence-thumb-remove"
                onClick={() => removePhoto(owner, evidence.id, index)}
                disabled={!canEdit}
                aria-label="Hapus foto bukti"
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
              aria-label={`Unggah foto bukti ${positionLabel}`}
              onChange={(event) => {
                const files = event.target.files;
                event.target.value = "";
                void addPhotos(owner, evidence.id, files);
              }}
            />
            <span>Unggah foto</span>
          </label>
        </div>
      </article>
    );
  }

  return (
    <div className="dm-5w-why-layout">
      <div className="dm-5w-why-chain">
        {ordered.map((node, index) => {
          const nodeStats = evidenceStats(node.evidence);
          return (
            <div className="dm-5w-why-row" key={node.id}>
              {index > 0 ? (
                <div className="dm-5w-why-arrow" aria-hidden="true" />
              ) : null}
              <div className="dm-5w-why-node-wrap">
                <article
                  className={`dm-5w-why-node ${
                    activeNodeId === node.id ? "is-active" : ""
                  }`}
                  onFocus={() => setActiveNodeId(node.id)}
                  onClick={() => setActiveNodeId(node.id)}
                >
                  <header className="dm-5w-why-head">
                    <div className="dm-5w-why-head-left">
                      <span className="dm-5w-why-badge">
                        Why {node.level}
                      </span>
                      {nodeStats.blocks > 0 ? (
                        <span className="dm-5w-why-stat">
                          {evidenceCountLabel(nodeStats.blocks)}
                        </span>
                      ) : null}
                      {nodeStats.photos > 0 ? (
                        <span className="dm-5w-why-stat">
                          {photoCountLabel(nodeStats.photos)}
                        </span>
                      ) : null}
                    </div>
                    <select
                      className="dm-5w-select dm-5w-verify-select"
                      value={node.verification}
                      onChange={(event) =>
                        setNodeVerification(
                          node.id,
                          event.target.value as WhyVerification
                        )
                      }
                      disabled={!canEdit}
                      aria-label={`Status verifikasi Why ${node.level}`}
                    >
                      {MAIN_VERIFICATION_ORDER.map((status) => (
                        <option key={status} value={status}>
                          {WHY_VERIFICATION_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </header>

                  <label className="dm-5w-field dm-5w-why-question">
                    <span className="dm-5w-label">{questionFor(node)}</span>
                    <textarea
                      className="dm-5w-textarea"
                      rows={2}
                      value={node.statement}
                      placeholder="Tulis sebab pada tahap ini"
                      onChange={(event) =>
                        updateNode(node.id, { statement: event.target.value })
                      }
                      disabled={!canEdit}
                      aria-label={`Pernyataan Why ${node.level}`}
                    />
                  </label>

                  <div className="dm-5w-why-actions">
                    <select
                      className="dm-5w-add-field dm-5w-add-evidence-select"
                      value=""
                      onChange={(event) =>
                        handleAddEvidence(
                          { nodeId: node.id },
                          event.target.value
                        )
                      }
                      disabled={!canEdit}
                      aria-label={`Tambah bukti Why ${node.level}`}
                    >
                      <option value="">+ Tambah bukti</option>
                      {PRESET_EVIDENCE_LABELS.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                      <option value="Lainnya...">Lainnya...</option>
                    </select>
                    <button
                      type="button"
                      className="dm-5w-add-field"
                      onClick={() =>
                        addEvidencePair({ nodeId: node.id }, "OK", "NG")
                      }
                      disabled={!canEdit}
                    >
                      + Pasangan OK/NG
                    </button>
                    <button
                      type="button"
                      className="dm-5w-add-field"
                      onClick={() =>
                        addEvidencePair(
                          { nodeId: node.id },
                          "Standar",
                          "Aktual"
                        )
                      }
                      disabled={!canEdit}
                    >
                      + Pasangan Standar/Aktual
                    </button>
                    <button
                      type="button"
                      className="dm-5w-add-field dm-5w-why-actions-end"
                      onClick={() => addBranch(node.id)}
                      disabled={!canEdit}
                    >
                      + Cabang hipotesis
                    </button>
                  </div>

                  {node.evidence.length > 0 ? (
                    <div className="dm-5w-evidence-grid">
                      {node.evidence.map((entry, evidenceIndex) =>
                        renderEvidence(
                          { nodeId: node.id },
                          entry,
                          `Why ${node.level} bukti ${evidenceIndex + 1}`
                        )
                      )}
                    </div>
                  ) : null}
                </article>

                {node.branches.length > 0 ? (
                  <div
                    className="dm-5w-branches"
                    aria-label={`Cabang hipotesis Why ${node.level}`}
                  >
                    {node.branches.map((branch) => {
                      const branchStats = evidenceStats(branch.evidence);
                      const statusClass =
                        branch.verification === "not_root"
                          ? "is-not_root"
                          : branch.verification;
                      return (
                        <article
                          className={`dm-5w-branch-card ${
                            activeNodeId === branch.id ? "is-active" : ""
                          }`}
                          key={branch.id}
                          onFocus={() => setActiveNodeId(branch.id)}
                          onClick={() => setActiveNodeId(branch.id)}
                        >
                          <header className="dm-5w-branch-head">
                            <div className="dm-5w-branch-head-left">
                              {branch.verification !== "unverified" ? (
                                <span
                                  className={`dm-5w-branch-status-icon ${statusClass}`}
                                  aria-hidden="true"
                                >
                                  {branch.verification === "not_root" ? (
                                    <IconClose size={10} />
                                  ) : (
                                    <IconCheck size={10} />
                                  )}
                                </span>
                              ) : null}
                              <span className="dm-5w-branch-badge">
                                Hipotesis
                              </span>
                              {branchStats.blocks > 0 ? (
                                <span className="dm-5w-why-stat">
                                  {evidenceCountLabel(branchStats.blocks)}
                                </span>
                              ) : null}
                              {branchStats.photos > 0 ? (
                                <span className="dm-5w-why-stat">
                                  {photoCountLabel(branchStats.photos)}
                                </span>
                              ) : null}
                            </div>
                            <select
                              className={`dm-5w-select dm-5w-verify-select dm-5w-branch-status-chip ${statusClass}`}
                              value={branch.verification}
                              onChange={(event) =>
                                setBranchVerification(
                                  node.id,
                                  branch.id,
                                  event.target.value as BranchVerification
                                )
                              }
                              disabled={!canEdit}
                              aria-label={`Status verifikasi dugaan Why ${node.level}`}
                            >
                              {BRANCH_VERIFICATION_ORDER.map((status) => (
                                <option key={status} value={status}>
                                  {BRANCH_VERIFICATION_LABELS[status]}
                                </option>
                              ))}
                            </select>
                          </header>

                          <label className="dm-5w-field">
                            <span className="dm-5w-label">Dugaan</span>
                            <textarea
                              className="dm-5w-textarea"
                              rows={2}
                              value={branch.statement}
                              placeholder="Apa yang diduga menjadi penyebab"
                              onChange={(event) =>
                                updateBranch(node.id, branch.id, {
                                  statement: event.target.value,
                                })
                              }
                              disabled={!canEdit}
                              aria-label={`Pernyataan dugaan Why ${node.level}`}
                            />
                          </label>

                          <div className="dm-5w-why-actions">
                            <select
                              className="dm-5w-add-field dm-5w-add-evidence-select"
                              value=""
                              onChange={(event) =>
                                handleAddEvidence(
                                  { nodeId: node.id, branchId: branch.id },
                                  event.target.value
                                )
                              }
                              disabled={!canEdit}
                              aria-label={`Tambah bukti dugaan Why ${node.level}`}
                            >
                              <option value="">+ Tambah bukti</option>
                              {PRESET_EVIDENCE_LABELS.map((label) => (
                                <option key={label} value={label}>
                                  {label}
                                </option>
                              ))}
                              <option value="Lainnya...">Lainnya...</option>
                            </select>
                            <button
                              type="button"
                              className="dm-5w-add-field"
                              onClick={() =>
                                addEvidencePair(
                                  { nodeId: node.id, branchId: branch.id },
                                  "OK",
                                  "NG"
                                )
                              }
                              disabled={!canEdit}
                            >
                              + Pasangan OK/NG
                            </button>
                            <button
                              type="button"
                              className="dm-5w-add-field"
                              onClick={() =>
                                addEvidencePair(
                                  { nodeId: node.id, branchId: branch.id },
                                  "Standar",
                                  "Aktual"
                                )
                              }
                              disabled={!canEdit}
                            >
                              + Pasangan Standar/Aktual
                            </button>
                            <button
                              type="button"
                              className="dm-5w-add-field dm-5w-add-field-danger dm-5w-why-actions-end"
                              onClick={() => removeBranch(node.id, branch.id)}
                              disabled={!canEdit}
                            >
                              Hapus hipotesis
                            </button>
                          </div>

                          {branch.evidence.length > 0 ? (
                            <div className="dm-5w-evidence-grid">
                              {branch.evidence.map((entry, evidenceIndex) =>
                                renderEvidence(
                                  { nodeId: node.id, branchId: branch.id },
                                  entry,
                                  `dugaan Why ${node.level} bukti ${
                                    evidenceIndex + 1
                                  }`
                                )
                              )}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <aside className="dm-5w-why-rail" aria-label="Ringkasan rantai sebab">
        <div className="dm-5w-card dm-5w-why-summary">
          <h2 className="dm-5w-card-title">Ringkasan rantai sebab</h2>
          <p className="dm-5w-chain-text">{chainText}</p>
          <p className="dm-5w-progress">
            {filled}/5 Why terisi · {rootCount} Root Cause · {rejectedCount}{" "}
            hipotesis ditolak
          </p>
          {canEdit ? (
            <button
              type="button"
              className="dm-5w-btn dm-5w-btn-primary dm-5w-btn-block"
              onClick={onSave}
            >
              Simpan analisis
            </button>
          ) : null}
        </div>
      </aside>

      {previewUrl ? (
        <div
          className="dm-5w-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Foto bukti"
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
            alt="Foto bukti diperbesar"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
