"use client";
import { useEffect, useRef, useState } from "react";
import { Flag, Plus, Trash2, X } from "lucide-react";
import { IconClose } from "@/components/ui/icons";
import {
  EVIDENCE_LABEL_OPTIONS,
  createFiveWhyId,
  readImageAsDataUrl,
} from "./fiveWhyData";
import type { Evidence, WhyBranch, WhyNode } from "./fiveWhyData";

type WhyTreeProps = {
  whys: WhyNode[];
  problemLabel: string;
  canEdit: boolean;
  focusWhyId?: string | null;
  focusToken?: number;
  onChange: (next: WhyNode[]) => void;
  onSave: () => void;
  onNotify: (message: string) => void;
};

type EvidenceOwner = {
  nodeId: string;
  branchId?: string;
};

type EvidenceKind = "single" | "pair-ok-ng" | "pair-standar-aktual";

type EvidenceMenuProps = {
  canEdit: boolean;
  ariaLabel: string;
  onAdd: (kind: EvidenceKind) => void;
};

const PRESET_EVIDENCE_LABELS = EVIDENCE_LABEL_OPTIONS.filter(
  (label) => label !== "Lainnya..."
);

const EVIDENCE_PLACEHOLDERS: Record<string, string> = {
  OK: "Tulis kondisi yang normal atau sesuai, misalnya: nomor COM tersedia",
  NG: "Tulis kondisi yang tidak normal, misalnya: nomor COM tidak terdeteksi di file log",
  Standar:
    "Tulis nilai atau aturan yang seharusnya, misalnya: standar nomor COM port 0-256",
  Aktual:
    "Tulis nilai atau kondisi yang terjadi sekarang, misalnya: pada mesin NG sudah mencapai COM 300",
  Sebelum:
    "Tulis kondisi sebelum perbaikan, misalnya: cache COM hanya dibersihkan saat SMED",
  Sesudah:
    "Tulis kondisi setelah perbaikan, misalnya: setelah dibersihkan, PreCheck NG hilang",
  Catatan:
    "Tulis hal lain yang perlu dicatat, misalnya: PC ditukar dengan yang hasilnya OK, tetap NG",
};

const WHY_PLACEHOLDERS: Record<number, string> = {
  1: "Tulis sebabnya, misalnya: software update PC tidak bisa dipakai",
  2: "Tulis sebabnya, misalnya: banyak NG pada PreCheck (469 dari 510 unit)",
  3: "Tulis sebabnya, misalnya: nomor COM port tidak terdeteksi saat proses upgrade",
  4: "Tulis sebabnya, misalnya: nomor COM port melebihi batas",
  5: "Tulis sebabnya, misalnya: frekuensi pembersihan cache COM kurang",
};

function getEvidencePlaceholder(label: string): string {
  const normalized = label.trim().toLowerCase();
  const match = Object.entries(EVIDENCE_PLACEHOLDERS).find(
    ([key]) => key.toLowerCase() === normalized
  );
  return match ? match[1] : "Tulis temuan atau hasil pengecekan";
}

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

function evidenceLabelWidth(label: string) {
  const text = label.trim() || "Lainnya...";
  return `${Math.min(140, Math.max(30, text.length * 6.5 + 4))}px`;
}

function isFilledWhy(node: WhyNode) {
  return Boolean(
    node.statement.trim() ||
      node.evidence.length > 0 ||
      node.branches.length > 0 ||
      node.verification === "root"
  );
}

function initialVisibleLevel(nodes: WhyNode[]) {
  const ordered = [...nodes].sort((a, b) => a.level - b.level);
  const lastFilled = [...ordered].reverse().find(isFilledWhy);
  return Math.min(5, Math.max(1, (lastFilled?.level ?? 0) + 1));
}

function ownerKey(owner: EvidenceOwner) {
  return owner.branchId
    ? `branch:${owner.nodeId}:${owner.branchId}`
    : `node:${owner.nodeId}`;
}

function evidenceKey(owner: EvidenceOwner, evidenceId: string) {
  return `${ownerKey(owner)}:${evidenceId}`;
}

function resizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function EvidenceMenu({ canEdit, ariaLabel, onAdd }: EvidenceMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function choose(kind: EvidenceKind) {
    onAdd(kind);
    setOpen(false);
  }

  return (
    <div className="dm-5w-evidence-menu" ref={containerRef}>
      <button
        type="button"
        className="dm-5w-evidence-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={!canEdit}
        onClick={() => setOpen((current) => !current)}
      >
        <Plus size={13} aria-hidden="true" />
        <span>Bukti</span>
      </button>
      {open ? (
        <div
          className="dm-5w-evidence-menu-panel"
          role="menu"
          aria-label={ariaLabel}
        >
          <button
            type="button"
            role="menuitem"
            className="dm-5w-evidence-menu-item"
            onClick={() => choose("single")}
          >
            Foto atau catatan
          </button>
          <button
            type="button"
            role="menuitem"
            className="dm-5w-evidence-menu-item"
            onClick={() => choose("pair-ok-ng")}
          >
            Pasangan OK / NG
          </button>
          <button
            type="button"
            role="menuitem"
            className="dm-5w-evidence-menu-item"
            onClick={() => choose("pair-standar-aktual")}
          >
            Pasangan Standar / Aktual
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function WhyTree({
  whys,
  problemLabel,
  canEdit,
  focusWhyId = null,
  focusToken = 0,
  onChange,
  onSave,
  onNotify,
}: WhyTreeProps) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [customLabelFor, setCustomLabelFor] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [openEvidenceKeys, setOpenEvidenceKeys] = useState<string[]>([]);
  const [visibleLevel, setVisibleLevel] = useState(() =>
    initialVisibleLevel(whys)
  );
  const recordKeyRef = useRef(whys[0]?.id ?? "");

  const ordered = [...whys].sort((a, b) => a.level - b.level);

  useEffect(() => {
    const recordKey = whys[0]?.id ?? "";
    if (recordKeyRef.current === recordKey) return;
    recordKeyRef.current = recordKey;
    setVisibleLevel(initialVisibleLevel(whys));
    setOpenEvidenceKeys([]);
    setActiveNodeId(null);
    setHighlightId(null);
    setCustomLabelFor(null);
  }, [whys]);

  useEffect(() => {
    const lastVisible = ordered.find((node) => node.level === visibleLevel);
    if (lastVisible && isFilledWhy(lastVisible) && visibleLevel < 5) {
      setVisibleLevel(visibleLevel + 1);
    }
  }, [ordered, visibleLevel]);

  useEffect(() => {
    if (!focusWhyId) return;
    const targetNode = whys.find((node) => node.id === focusWhyId);
    if (targetNode) {
      setVisibleLevel((current) => Math.max(current, targetNode.level));
    }
    setActiveNodeId(focusWhyId);
    setHighlightId(focusWhyId);
    const target = document.getElementById(`dm-5w-node-${focusWhyId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setHighlightId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [focusWhyId, focusToken]);

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

  function isEvidenceOpen(owner: EvidenceOwner, evidenceId: string) {
    return openEvidenceKeys.includes(evidenceKey(owner, evidenceId));
  }

  function openManyEvidence(owner: EvidenceOwner, evidenceIds: string[]) {
    setOpenEvidenceKeys((current) => {
      const next = [...current];
      evidenceIds.forEach((evidenceId) => {
        const key = evidenceKey(owner, evidenceId);
        if (!next.includes(key)) next.push(key);
      });
      return next;
    });
  }

  function closeEvidence(owner: EvidenceOwner, evidenceId: string) {
    const key = evidenceKey(owner, evidenceId);
    setOpenEvidenceKeys((current) => current.filter((item) => item !== key));
  }

  function addEvidence(owner: EvidenceOwner, label: string) {
    const entry = makeEvidence(label);
    setEvidence(owner, [...evidenceFor(owner), entry]);
    openManyEvidence(owner, [entry.id]);
    return entry.id;
  }

  function addEvidencePair(owner: EvidenceOwner, first: string, second: string) {
    const entries = [makeEvidence(first), makeEvidence(second)];
    setEvidence(owner, [...evidenceFor(owner), ...entries]);
    openManyEvidence(
      owner,
      entries.map((entry) => entry.id)
    );
  }

  function handleAddEvidence(owner: EvidenceOwner, kind: EvidenceKind) {
    if (kind === "single") {
      addEvidence(owner, "Catatan");
      return;
    }
    if (kind === "pair-ok-ng") {
      addEvidencePair(owner, "OK", "NG");
      return;
    }
    addEvidencePair(owner, "Standar", "Aktual");
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
    closeEvidence(owner, evidenceId);
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
                  verification: "not_root",
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
    const prefix = `${ownerKey({ nodeId, branchId })}:`;
    setOpenEvidenceKeys((current) =>
      current.filter((key) => !key.startsWith(prefix))
    );
  }

  function setRootCause(nodeId: string, active: boolean) {
    onChange(
      whys.map((item) => {
        if (item.id === nodeId) {
          return { ...item, verification: active ? "root" : "unverified" };
        }
        if (active && item.verification === "root") {
          return { ...item, verification: "unverified" };
        }
        return item;
      })
    );
  }

  const filled = whys.filter((why) => why.statement.trim()).length;
  const rootCount = whys.filter((why) => why.verification === "root").length;
  const rejectedCount = whys.reduce(
    (total, why) => total + why.branches.length,
    0
  );
  const deepestFilled = [...ordered]
    .reverse()
    .find((why) => why.statement.trim());
  const chainRows = deepestFilled
    ? ordered
        .filter((why) => why.level <= deepestFilled.level)
        .sort((a, b) => b.level - a.level)
        .map((why) => ({
          level: why.level,
          text: why.statement.trim(),
          isRoot: why.verification === "root",
        }))
    : [];
  const displayedWhys = ordered.filter(
    (node) => node.level <= visibleLevel || isFilledWhy(node)
  );
  const hasHiddenWhy = displayedWhys.length < ordered.length;

  function questionFor(node: WhyNode) {
    if (node.level === 1) {
      const target = problemLabel.trim() || "masalah ini";
      return `Kenapa ${target}?`;
    }
    const previous = ordered.find((item) => item.level === node.level - 1);
    const subject = previous?.statement.trim() || "hal ini";
    return `Kenapa ${subject}?`;
  }

  function renderEvidenceStrip(
    owner: EvidenceOwner,
    evidence: Evidence[],
    positionLabel: string
  ) {
    if (evidence.length === 0) return null;
    if (evidence.some((entry) => isEvidenceOpen(owner, entry.id))) return null;
    const labels = evidence
      .map((entry) => entry.label.trim() || "Lainnya...")
      .join(", ");
    return (
      <button
        type="button"
        className="dm-5w-evidence-summary"
        aria-label={`Buka bukti ${positionLabel}`}
        onClick={() =>
          openManyEvidence(
            owner,
            evidence.map((entry) => entry.id)
          )
        }
      >
        {evidenceCountLabel(evidence.length)}: {labels}
      </button>
    );
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
          <span
            className={`dm-5w-evidence-label ${evidenceTone(evidence.label)}`}
          >
            <span className="dm-5w-evidence-dot" aria-hidden="true" />
            {isCustomLabel ? (
              <input
                className="dm-5w-evidence-label-input"
                value={evidence.label}
                style={{ width: evidenceLabelWidth(evidence.label) }}
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
                className="dm-5w-evidence-chip"
                value={evidence.label || "Lainnya..."}
                style={{
                  width: evidenceLabelWidth(evidence.label || "Lainnya..."),
                }}
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
          </span>
          <button
            type="button"
            className="dm-5w-evidence-remove"
            onClick={() => removeEvidence(owner, evidence.id)}
            disabled={!canEdit}
            aria-label={`Hapus blok bukti ${positionLabel}`}
          >
            <IconClose size={14} />
          </button>
        </header>

        <textarea
          className="dm-5w-textarea dm-5w-evidence-text"
          rows={2}
          ref={(element) => {
            if (element) resizeTextarea(element);
          }}
          value={evidence.text}
          placeholder={getEvidencePlaceholder(evidence.label)}
          onChange={(event) => {
            resizeTextarea(event.currentTarget);
            updateEvidence(owner, evidence.id, { text: event.target.value });
          }}
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
        {displayedWhys.map((node, index) => {
          const rootActive = node.verification === "root";
          const openNodeEvidence = node.evidence.filter((entry) =>
            isEvidenceOpen({ nodeId: node.id }, entry.id)
          );
          return (
            <div className="dm-5w-why-row" key={node.id}>
              {index > 0 ? (
                <div className="dm-5w-why-arrow" aria-hidden="true" />
              ) : null}
              <div className="dm-5w-why-node-wrap">
                <article
                  id={`dm-5w-node-${node.id}`}
                  className={`dm-5w-why-node ${
                    activeNodeId === node.id ? "is-active" : ""
                  } ${highlightId === node.id ? "is-highlight" : ""} ${
                    rootActive ? "is-root-cause" : ""
                  }`}
                  onFocus={() => setActiveNodeId(node.id)}
                  onClick={() => setActiveNodeId(node.id)}
                >
                  <header className="dm-5w-why-head">
                    <div className="dm-5w-why-head-left">
                      <span className="dm-5w-why-badge">
                        Why {node.level}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`dm-5w-root-toggle ${
                        rootActive ? "is-on" : ""
                      }`}
                      aria-pressed={rootActive}
                      onClick={() => setRootCause(node.id, !rootActive)}
                      disabled={!canEdit}
                    >
                      <Flag size={12} aria-hidden="true" />
                      <span>Root Cause</span>
                    </button>
                  </header>

                  <label className="dm-5w-field dm-5w-why-question">
                    <span className="dm-5w-label">{questionFor(node)}</span>
                    <textarea
                      className="dm-5w-textarea"
                      rows={2}
                      ref={(element) => {
                        if (element) resizeTextarea(element);
                      }}
                      value={node.statement}
                      placeholder={WHY_PLACEHOLDERS[node.level] ?? "Tulis sebabnya"}
                      onChange={(event) => {
                        resizeTextarea(event.currentTarget);
                        updateNode(node.id, { statement: event.target.value });
                      }}
                      disabled={!canEdit}
                      aria-label={`Pernyataan Why ${node.level}`}
                    />
                  </label>

                  <div className="dm-5w-why-actions">
                    <EvidenceMenu
                      canEdit={canEdit}
                      ariaLabel={`Tambah bukti Why ${node.level}`}
                      onAdd={(kind) =>
                        handleAddEvidence({ nodeId: node.id }, kind)
                      }
                    />
                    {renderEvidenceStrip(
                      { nodeId: node.id },
                      node.evidence,
                      `Why ${node.level}`
                    )}
                    <button
                      type="button"
                      className="dm-5w-add-field dm-5w-why-actions-end"
                      onClick={() => addBranch(node.id)}
                      disabled={!canEdit}
                    >
                      Hipotesis lain
                    </button>
                  </div>

                  {openNodeEvidence.length > 0 ? (
                    <div className="dm-5w-evidence-grid">
                      {node.evidence.map((entry, evidenceIndex) =>
                        isEvidenceOpen({ nodeId: node.id }, entry.id)
                          ? renderEvidence(
                              { nodeId: node.id },
                              entry,
                              `Why ${node.level} bukti ${evidenceIndex + 1}`
                            )
                          : null
                      )}
                    </div>
                  ) : null}
                </article>

                {node.branches.length > 0 ? (
                  <div
                    className="dm-5w-branches"
                    aria-label={`Hipotesis Why ${node.level}`}
                  >
                    {node.branches.map((branch) => {
                      const owner = {
                        nodeId: node.id,
                        branchId: branch.id,
                      };
                      const openBranchEvidence = branch.evidence.filter(
                        (entry) => isEvidenceOpen(owner, entry.id)
                      );
                      return (
                        <div className="dm-5w-branch-row" key={branch.id}>
                          <div className="dm-5w-branch-line">
                            <span
                              className="dm-5w-branch-reject"
                              role="img"
                              title="Hipotesis ditolak"
                              aria-label="Hipotesis ditolak"
                            >
                              <X size={11} aria-hidden="true" />
                            </span>
                            <textarea
                              className="dm-5w-branch-input"
                              rows={1}
                              value={branch.statement}
                              placeholder="Tulis dugaan lain yang sudah dicek, misalnya: port USB PC sudah rusak"
                              ref={(element) => {
                                if (element) resizeTextarea(element);
                              }}
                              onChange={(event) => {
                                resizeTextarea(event.currentTarget);
                                updateBranch(node.id, branch.id, {
                                  statement: event.target.value,
                                });
                              }}
                              disabled={!canEdit}
                              aria-label={`Pernyataan dugaan Why ${node.level}`}
                            />
                            <EvidenceMenu
                              canEdit={canEdit}
                              ariaLabel={`Tambah bukti dugaan Why ${node.level}`}
                              onAdd={(kind) => handleAddEvidence(owner, kind)}
                            />
                            <button
                              type="button"
                              className="dm-5w-branch-remove"
                              onClick={() => removeBranch(node.id, branch.id)}
                              disabled={!canEdit}
                              aria-label={`Hapus hipotesis Why ${node.level}`}
                            >
                              <Trash2 size={13} aria-hidden="true" />
                            </button>
                          </div>

                          {branch.evidence.length > 0 &&
                          openBranchEvidence.length === 0 ? (
                            <div className="dm-5w-branch-evidence">
                              {renderEvidenceStrip(
                                owner,
                                branch.evidence,
                                `dugaan Why ${node.level}`
                              )}
                            </div>
                          ) : null}

                          {openBranchEvidence.length > 0 ? (
                            <div className="dm-5w-evidence-grid">
                              {branch.evidence.map(
                                (entry, evidenceIndex) =>
                                  isEvidenceOpen(owner, entry.id)
                                    ? renderEvidence(
                                        owner,
                                        entry,
                                        `dugaan Why ${node.level} bukti ${
                                          evidenceIndex + 1
                                        }`
                                      )
                                    : null
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {hasHiddenWhy ? (
          <button
            type="button"
            className="dm-5w-reveal"
            onClick={() =>
              setVisibleLevel((current) => Math.min(5, current + 1))
            }
          >
            <Plus size={13} aria-hidden="true" />
            <span>Lanjutkan: Kenapa lagi?</span>
          </button>
        ) : null}
      </div>

      <aside className="dm-5w-why-rail" aria-label="Ringkasan rantai sebab">
        <div className="dm-5w-card dm-5w-why-summary">
          <h2 className="dm-5w-card-title">Ringkasan rantai sebab</h2>
          {chainRows.length > 0 ? (
            <div className="dm-5w-chain-list">
              {chainRows.map((row, index) => (
                <div className="dm-5w-chain-row" key={`chain-${row.level}`}>
                  {index > 0 ? (
                    <span className="dm-5w-chain-arrow" aria-hidden="true">
                      ↑
                    </span>
                  ) : null}
                  <p
                    className={`dm-5w-chain-line ${
                      row.text ? "" : "is-empty"
                    } ${row.isRoot ? "is-root-cause" : ""}`}
                  >
                    <strong>{index === 0 ? "Karena" : "maka"}</strong>{" "}
                    {row.text || `(Why ${row.level} belum diisi)`}
                  </p>
                </div>
              ))}
              <div className="dm-5w-chain-row">
                <span className="dm-5w-chain-arrow" aria-hidden="true">
                  ↑
                </span>
                <p className="dm-5w-chain-line">
                  <strong>sehingga terjadi</strong>{" "}
                  {problemLabel.trim() || "(judul abnormal belum diisi)"}
                </p>
              </div>
            </div>
          ) : (
            <p className="dm-5w-chain-text">
              Rantai sebab akan muncul setelah Why diisi.
            </p>
          )}
          {rootCount === 0 ? (
            <p className="dm-5w-chain-warn">
              Tandai satu Why sebagai Root Cause
            </p>
          ) : null}
          <div className="dm-5w-progress">
            <div className="dm-5w-progress-item">
              <span className="dm-5w-progress-label">Why terisi</span>
              <span className="dm-5w-progress-value">{filled}/5</span>
            </div>
            <div
              className={`dm-5w-progress-item ${
                rootCount > 0 ? "is-root-cause" : ""
              }`}
            >
              <span className="dm-5w-progress-label">Root Cause</span>
              <span className="dm-5w-progress-value">{rootCount}</span>
            </div>
            <div className="dm-5w-progress-item">
              <span className="dm-5w-progress-label">Hipotesis ditolak</span>
              <span className="dm-5w-progress-value">{rejectedCount}</span>
            </div>
          </div>
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
