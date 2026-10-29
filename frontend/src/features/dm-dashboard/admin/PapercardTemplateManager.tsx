"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DmEmployee, DmLine, DmWorkshop } from "../api";
import { adminApi, papercardApi } from "../api";
import type { DmMember } from "../dmData";
import type { DepartmentKey } from "../leader/types";
import "./PapercardTemplateManager.css";
import TemplateTreeEditor from "./TemplateTreeEditor";
import {
  type ChecklistCategory,
  countItems,
  normalizeCategories,
  serializeCategories,
} from "./templateModel";
import { ChevronDown, Clock, Layers, Users } from "lucide-react";
import { FactoryIcon } from "./AdminIcons";

interface PapercardTemplateManagerProps {
  workshops: DmWorkshop[];
  lines: DmLine[];
}

export interface DepartmentTemplate {
  dept: DepartmentKey;
  name: string;
  version: string;
  windowStart: string;
  windowEnd: string;
  okRule: string;
  ngRule: string;
  categories: ChecklistCategory[];
}

const EMPTY_TEMPLATE: DepartmentTemplate = {
  dept: "PROD",
  name: "Papercard Departemen",
  version: "v1.0",
  windowStart: "08:00",
  windowEnd: "09:00",
  okRule: "OK jika seluruh pos normal.",
  ngRule: "NG jika terdapat kelainan pos.",
  categories: [],
};

const DEPARTMENTS: { key: DepartmentKey; label: string }[] = [
  { key: "PROD", label: "PROD" },
  { key: "ME", label: "ME" },
  { key: "PE", label: "PE" },
  { key: "QC", label: "QC" },
];

export default function PapercardTemplateManager({
  workshops,
  lines,
}: PapercardTemplateManagerProps) {
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>(
    workshops[0] ? String(workshops[0].id) : "1"
  );
  const [selectedLineCode, setSelectedLineCode] = useState<string>(
    lines[0] ? lines[0].code : "TAC20601"
  );
  const [selectedDept, setSelectedDept] = useState<DepartmentKey>("PROD");

  // Template state loaded strictly from Backend PostgreSQL keyed by `${lineId}_${dept}`
  const [templates, setTemplates] = useState<
    Record<string, DepartmentTemplate>
  >({});
  const [loadingTemplate, setLoadingTemplate] = useState<boolean>(true);

  // Departments on the current line that have non-empty templates
  const [lineTemplateDepts, setLineTemplateDepts] = useState<Set<string>>(
    new Set(["PROD"])
  );

  // Save notice
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Dropdown menu state
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedTargetLineIds, setSelectedTargetLineIds] = useState<
    number[]
  >([]);
  const [bulkApplying, setBulkApplying] = useState(false);

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceLineId, setCopySourceLineId] = useState<string>("");
  const [copyLoading, setCopyLoading] = useState(false);

  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showWorkersModal, setShowWorkersModal] = useState(false);

  // Line members & worker assignment
  const [lineMembers, setLineMembers] = useState<DmMember[]>([]);
  const [allEmployees, setAllEmployees] = useState<DmEmployee[]>([]);
  const [assigningEmpId, setAssigningEmpId] = useState<string>("");
  const [assignBusy, setAssignBusy] = useState(false);

  // Filter lines by selected workshop
  const availableLines = useMemo(() => {
    const wsId = Number(selectedWorkshopId);
    const filtered = lines.filter((l) => l.workshopId === wsId);
    return filtered.length > 0 ? filtered : lines;
  }, [lines, selectedWorkshopId]);

  const currentLine = useMemo(() => {
    return lines.find((l) => l.code === selectedLineCode) ?? lines[0];
  }, [lines, selectedLineCode]);

  // Load team members of current line from backend
  const loadLineMembers = useCallback(() => {
    if (!currentLine) return;
    adminApi
      .members(currentLine.id)
      .then((m) => setLineMembers(m))
      .catch(() => setLineMembers([]));
  }, [currentLine]);

  useEffect(() => {
    loadLineMembers();
  }, [loadLineMembers]);

  // Load all employees once for worker assignment choices
  useEffect(() => {
    adminApi
      .employees()
      .then((emps) => setAllEmployees(emps))
      .catch(() => {});
  }, []);

  // Fetch which departments have templates for the current line
  useEffect(() => {
    if (!currentLine) return;
    papercardApi
      .listTemplates({ lineId: currentLine.id })
      .then((res) => {
        if (res) {
          const depts = new Set(
            res
              .filter(
                (t) =>
                  t.templateData?.categories &&
                  t.templateData.categories.length > 0
              )
              .map((t) => t.department)
          );
          setLineTemplateDepts(depts);
        }
      })
      .catch(() => {});
  }, [currentLine]);

  // Fetch saved template strictly from PostgreSQL Database
  useEffect(() => {
    if (!currentLine) return;
    let cancelled = false;
    setLoadingTemplate(true);
    const lineKey = `${currentLine.id}_${selectedDept}`;

    papercardApi
      .listTemplates({
        lineId: currentLine.id,
        department: selectedDept,
      })
      .then((res) => {
        if (cancelled) return;
        if (res && res.length > 0) {
          const matched = res[0];
          setTemplates((prev) => ({
            ...prev,
            [lineKey]: {
              dept: selectedDept,
              name: matched.name,
              version: matched.version,
              windowStart: matched.windowStart,
              windowEnd: matched.windowEnd,
              okRule: matched.templateData?.okRule ?? "",
              ngRule: matched.templateData?.ngRule ?? "",
              categories: normalizeCategories(
                matched.templateData?.categories
              ),
            },
          }));
        } else {
          // If not created yet in PostgreSQL, set empty template
          setTemplates((prev) => ({
            ...prev,
            [lineKey]: {
              ...EMPTY_TEMPLATE,
              dept: selectedDept,
              name: `Papercard Departemen ${selectedDept}`,
              categories: [],
            },
          }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingTemplate(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentLine, selectedDept]);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    if (!showTemplateMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        templateMenuRef.current &&
        !templateMenuRef.current.contains(e.target as Node)
      ) {
        setShowTemplateMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showTemplateMenu]);

  // Active template memo
  const activeTemplate = useMemo<DepartmentTemplate>(() => {
    const lineKey = currentLine ? `${currentLine.id}_${selectedDept}` : "";
    return (
      templates[lineKey] || {
        ...EMPTY_TEMPLATE,
        dept: selectedDept,
        name: `Papercard Departemen ${selectedDept}`,
        categories: [],
      }
    );
  }, [templates, currentLine, selectedDept]);

  // Assigned members for current department
  const assignedMembers = useMemo(() => {
    return lineMembers.filter((m) => {
      if (selectedDept === "PROD") {
        return (
          m.dept?.toUpperCase() === "PROD" || (m as any).role === "leader"
        );
      }
      return m.dept?.toUpperCase() === selectedDept;
    });
  }, [lineMembers, selectedDept]);

  // Candidate employees for assignment
  const candidateEmployees = useMemo(() => {
    const existingEmpNos = new Set(lineMembers.map((m) => m.employeeId));
    return allEmployees.filter((e) => !existingEmpNos.has(e.employeeId));
  }, [allEmployees, lineMembers]);

  // Current line & department composite key
  const currentKey = currentLine ? `${currentLine.id}_${selectedDept}` : "";

  // Update inspection window and rules
  const handleUpdateTemplateMeta = (patch: Partial<DepartmentTemplate>) => {
    if (!currentKey) return;
    setTemplates((prev) => {
      const current = prev[currentKey] || activeTemplate;
      return {
        ...prev,
        [currentKey]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  // Reusable helper to persist template strictly to PostgreSQL and update UI
  const persistTemplate = async (
    templateToSave: DepartmentTemplate,
    customSuccessMsg?: string
  ): Promise<boolean> => {
    if (!currentLine) return false;
    setSaving(true);
    try {
      await papercardApi.saveTemplate({
        workshopId: currentLine.workshopId || Number(selectedWorkshopId),
        lineId: currentLine.id,
        department: selectedDept,
        name: templateToSave.name,
        version: templateToSave.version,
        windowStart: templateToSave.windowStart,
        windowEnd: templateToSave.windowEnd,
        templateData: {
          categories: serializeCategories(templateToSave.categories),
          okRule: templateToSave.okRule,
          ngRule: templateToSave.ngRule,
        },
      });

      // Update line template depts indicator
      if (templateToSave.categories.length > 0) {
        setLineTemplateDepts((prev) => new Set([...prev, selectedDept]));
      }

      if (customSuccessMsg) {
        setSavedNotice({
          type: "success",
          message: customSuccessMsg,
        });
      }
      return true;
    } catch (err) {
      setSavedNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal menyimpan perubahan template.",
      });
      return false;
    } finally {
      setSaving(false);
      setTimeout(() => setSavedNotice(null), 3500);
    }
  };

  const handleTreeChange = async (
    nextCategories: ChecklistCategory[],
    message: string
  ) => {
    if (!currentKey || !currentLine) return;
    const current = templates[currentKey] || activeTemplate;
    const updatedTemplate: DepartmentTemplate = {
      ...current,
      categories: nextCategories,
    };
    setTemplates((prev) => ({ ...prev, [currentKey]: updatedTemplate }));
    await persistTemplate(
      updatedTemplate,
      `${message} Tersimpan ke database.`
    );
  };

  // Save single line template to PostgreSQL database
  const handleSaveToDatabase = async () => {
    if (!currentLine) return;
    await persistTemplate(
      activeTemplate,
      `Template ${selectedDept} berhasil disimpan untuk lini ${currentLine.name}.`
    );
  };

  // Open Bulk Apply Modal
  const handleOpenBulkModal = () => {
    setSelectedTargetLineIds(lines.map((l) => l.id));
    setShowBulkModal(true);
  };

  // Execute Bulk Apply
  const handleExecuteBulkApply = async () => {
    if (selectedTargetLineIds.length === 0) return;
    setBulkApplying(true);
    try {
      await papercardApi.bulkApplyTemplates({
        targetLineIds: selectedTargetLineIds,
        department: selectedDept,
        name: activeTemplate.name,
        version: activeTemplate.version,
        windowStart: activeTemplate.windowStart,
        windowEnd: activeTemplate.windowEnd,
        templateData: {
          categories: serializeCategories(activeTemplate.categories),
          okRule: activeTemplate.okRule,
          ngRule: activeTemplate.ngRule,
        },
      });
      setSavedNotice({
        type: "success",
        message: `Template berhasil diterapkan ke ${selectedTargetLineIds.length} lini produksi.`,
      });
      setShowBulkModal(false);
    } catch (err) {
      setSavedNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal menerapkan template masal.",
      });
    } finally {
      setBulkApplying(false);
      setTimeout(() => setSavedNotice(null), 5000);
    }
  };

  // Execute Copy from another line
  const handleExecuteCopy = async () => {
    if (!copySourceLineId) return;
    const srcLineId = Number(copySourceLineId);
    setCopyLoading(true);
    try {
      const res = await papercardApi.listTemplates({
        lineId: srcLineId,
        department: selectedDept,
      });

      if (res && res.length > 0 && res[0].templateData?.categories) {
        const src = res[0];
        const newCategories = normalizeCategories(
          src.templateData.categories
        );
        const updatedTemplate: DepartmentTemplate = {
          dept: selectedDept,
          name: src.name,
          version: src.version,
          windowStart: src.windowStart,
          windowEnd: src.windowEnd,
          okRule: src.templateData.okRule ?? activeTemplate.okRule,
          ngRule: src.templateData.ngRule ?? activeTemplate.ngRule,
          categories: newCategories,
        };

        setTemplates((prev) => ({
          ...prev,
          [currentKey]: updatedTemplate,
        }));

        const srcLine = lines.find((l) => l.id === srcLineId);
        setSavedNotice({
          type: "success",
          message: `Pertanyaan disalin dari ${
            srcLine?.name ?? "Lini Lain"
          }. Klik Simpan untuk memperbarui database lini ini.`,
        });
        setShowCopyModal(false);
      } else {
        setSavedNotice({
          type: "error",
          message:
            "Lini sumber belum memiliki checklist template pada departemen ini.",
        });
      }
    } catch (err) {
      setSavedNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal menyalin template lini sumber.",
      });
    } finally {
      setCopyLoading(false);
      setTimeout(() => setSavedNotice(null), 4000);
    }
  };

  // Assign worker to current line and department
  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningEmpId || !currentLine) return;
    const emp = allEmployees.find((item) => item.id === Number(assigningEmpId));
    if (!emp) return;

    setAssignBusy(true);
    try {
      await adminApi.addMember(currentLine.id, {
        employeePk: emp.id,
        sortOrder:
          selectedDept === "PROD" && emp.role === "leader"
            ? 1
            : lineMembers.length + 1,
        targetDept: selectedDept,
      });
      setSavedNotice({
        type: "success",
        message: `${emp.name} berhasil ditugaskan mengisi Papercard ${selectedDept}.`,
      });
      setAssigningEmpId("");
      loadLineMembers();
    } catch (err) {
      setSavedNotice({
        type: "error",
        message:
          err instanceof Error ? err.message : "Gagal menugaskan anggota.",
      });
    } finally {
      setAssignBusy(false);
      setTimeout(() => setSavedNotice(null), 4000);
    }
  };

  // Release assigned worker
  const handleReleaseMember = async (
    memberId: number,
    memberName: string
  ) => {
    if (
      !window.confirm(
        `Lepas penugasan ${memberName} dari lini ${currentLine?.name}?`
      )
    )
      return;
    try {
      await adminApi.releaseMember(memberId);
      setSavedNotice({
        type: "success",
        message: `Penugasan ${memberName} berhasil dilepas.`,
      });
      loadLineMembers();
    } catch (err) {
      setSavedNotice({
        type: "error",
        message:
          err instanceof Error ? err.message : "Gagal melepas anggota.",
      });
    } finally {
      setTimeout(() => setSavedNotice(null), 3000);
    }
  };

  return (
    <div className="ptm-root">
      {/* 1. Header Toolbar (Compact, Clean & Calm - Refined) */}
      <div className="ptm-topbar">
        <div className="ptm-selectors">
          {/* Workshop Selector */}
          <div className="ptm-select-box">
            <span className="ptm-field-label">WORKSHOP</span>
            <div className="ptm-select-wrapper">
              <FactoryIcon size={14} />
              <select
                value={selectedWorkshopId}
                onChange={(e) => {
                  setSelectedWorkshopId(e.target.value);
                  const wsLines = lines.filter(
                    (l) => l.workshopId === Number(e.target.value)
                  );
                  if (wsLines[0]) setSelectedLineCode(wsLines[0].code);
                }}
                className="ptm-select-native"
              >
                {workshops.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="ptm-select-chevron" />
            </div>
          </div>

          {/* Line Selector */}
          <div className="ptm-select-box">
            <span className="ptm-field-label">LINE</span>
            <div className="ptm-select-wrapper">
              <Layers size={14} />
              <select
                value={selectedLineCode}
                onChange={(e) => setSelectedLineCode(e.target.value)}
                className="ptm-select-native"
              >
                {availableLines.map((l) => (
                  <option key={l.id} value={l.code}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="ptm-select-chevron" />
            </div>
          </div>


          <div className="ptm-select-box">
            <span className="ptm-field-label">Department</span>
          <div className="ptm-dept-group" role="tablist">
            
            {DEPARTMENTS.map((d) => {
              const isSelected = selectedDept === d.key;
              const hasTmpl =
                lineTemplateDepts.has(d.key) ||
                (templates[`${currentLine?.id}_${d.key}`]?.categories
                  ?.length ?? 0) > 0;

              return (
                <button
                  key={d.key}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`ptm-dept-pill ${
                    isSelected ? "is-selected" : ""
                  }`}
                  onClick={() => setSelectedDept(d.key)}
                >
                  <span
                    className={`ptm-dept-dot ${
                      hasTmpl ? "is-filled" : "is-empty"
                    }`}
                  >
                    {hasTmpl ? "●" : "○"}
                  </span>
                  <span>{d.label}</span>
                </button>
              );
            })}
          </div>
          </div>


          {/* Department Pills */}

        </div>

        {/* Top Right Actions */}
        <div className="ptm-top-actions">
          {/* Status Indicator Badge */}
          {/* <div
            className={`ptm-status-badge ${
              saving ? "is-saving" : "is-unsaved"
            }`}
          >
            <span className="ptm-status-dot">●</span>
            <span>{saving ? "Menyimpan..." : "Belum disimpan"}</span>
          </div> */}

          {/* Template Actions Dropdown */}
          <div className="ptm-menu-wrap" ref={templateMenuRef}>
            <button
              type="button"
              className="ptm-btn ptm-btn-dropdown"
              onClick={() => setShowTemplateMenu((prev) => !prev)}
            >
              <span>Template</span>
              <ChevronDown size={14} />
            </button>

            {showTemplateMenu && (
              <div className="ptm-dropdown-menu">
                <button
                  type="button"
                  className="ptm-dropdown-item"
                  onClick={() => {
                    setShowTemplateMenu(false);
                    setCopySourceLineId("");
                    setShowCopyModal(true);
                  }}
                >
                  Salin dari Lini Lain
                </button>
                <button
                  type="button"
                  className="ptm-dropdown-item"
                  onClick={() => {
                    setShowTemplateMenu(false);
                    handleOpenBulkModal();
                  }}
                >
                  Terapkan Masal ke Lini Lain
                </button>
                <div className="ptm-dropdown-divider" />
                <button
                  type="button"
                  className="ptm-dropdown-item"
                  onClick={() => {
                    setShowTemplateMenu(false);
                    setShowTimeModal(true);
                  }}
                >
                  <Clock size={13} style={{ marginRight: 6 }} />
                  Window Pengerjaan (Shift 1)
                </button>
                <button
                  type="button"
                  className="ptm-dropdown-item"
                  onClick={() => {
                    setShowTemplateMenu(false);
                    setShowWorkersModal(true);
                  }}
                >
                  <Users size={13} style={{ marginRight: 6 }} />
                  Petugas Pengisi ({assignedMembers.length} Orang)
                </button>
              </div>
            )}
          </div>

          {/* Primary Save Button */}
          <button
            type="button"
            className="ptm-btn ptm-btn-primary"
            onClick={handleSaveToDatabase}
            disabled={saving || loadingTemplate}
          >
            {saving ? "Menyimpan..." : "Simpan Template"}
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {savedNotice && (
        <div className={`ptm-notice is-${savedNotice.type}`}>
          <span>{savedNotice.message}</span>
          <button
            type="button"
            onClick={() => setSavedNotice(null)}
            className="ptm-notice-close"
            aria-label="Tutup notifikasi"
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. Main Two-Column Layout (Left Category Nav + Right Category Editor) */}
      <TemplateTreeEditor
        categories={activeTemplate.categories}
        saving={saving}
        onChange={handleTreeChange}
      />

      {/* ======================================================================
          MODALS
         ====================================================================== */}

      {/* MODAL 1: Bulk Apply to Other Lines */}
      {showBulkModal && (
        <div
          className="ptm-modal-backdrop"
          onClick={() => setShowBulkModal(false)}
        >
          <div
            className="ptm-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ptm-modal-head">
              <h3 className="ptm-modal-title">
                Terapkan Template ke Lini Lain
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="ptm-modal-close"
              >
                &times;
              </button>
            </div>

            <p className="ptm-modal-desc">
              Pilih lini target. Template <strong>{selectedDept}</strong>{" "}
              yang sedang dibuka akan disalin dan disimpan langsung ke
              database seluruh lini terpilih.
            </p>

            <div className="ptm-modal-subheader">
              <span className="ptm-modal-count-label">
                LINI TARGET ({selectedTargetLineIds.length} Dipilih):
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedTargetLineIds.length === lines.length) {
                    setSelectedTargetLineIds([]);
                  } else {
                    setSelectedTargetLineIds(lines.map((l) => l.id));
                  }
                }}
                className="ptm-modal-toggle-all"
              >
                {selectedTargetLineIds.length === lines.length
                  ? "Hapus Semua"
                  : "Pilih Semua"}
              </button>
            </div>

            <div className="ptm-modal-list">
              {lines.map((l) => {
                const checked = selectedTargetLineIds.includes(l.id);
                return (
                  <label
                    key={l.id}
                    className={`ptm-modal-item ${
                      checked ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTargetLineIds((prev) => [
                            ...prev,
                            l.id,
                          ]);
                        } else {
                          setSelectedTargetLineIds((prev) =>
                            prev.filter((id) => id !== l.id)
                          );
                        }
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong
                        style={{ display: "block", fontSize: "0.82rem" }}
                      >
                        {l.name} ({l.code})
                      </strong>
                      <span
                        style={{ fontSize: "0.72rem", color: "#64748b" }}
                      >
                        {l.workshopName}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="ptm-modal-foot">
              <button
                type="button"
                className="ptm-btn ptm-btn-ghost"
                onClick={() => setShowBulkModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="ptm-btn ptm-btn-primary"
                disabled={
                  bulkApplying || selectedTargetLineIds.length === 0
                }
                onClick={handleExecuteBulkApply}
              >
                {bulkApplying
                  ? "Menerapkan..."
                  : `Terapkan ke ${selectedTargetLineIds.length} Lini`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Copy Template From Another Line */}
      {showCopyModal && (
        <div
          className="ptm-modal-backdrop"
          onClick={() => setShowCopyModal(false)}
        >
          <div
            className="ptm-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ptm-modal-head">
              <h3 className="ptm-modal-title">Salin dari Lini Lain</h3>
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="ptm-modal-close"
              >
                &times;
              </button>
            </div>

            <p className="ptm-modal-desc">
              Pilih lini sumber. Pertanyaan departemen{" "}
              <strong>{selectedDept}</strong> akan ditarik ke editor lini{" "}
              <strong>{currentLine?.name}</strong>. Anda dapat mengedit dan
              menyimpannya.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                PILIH LINI SUMBER:
              </label>
              <select
                value={copySourceLineId}
                onChange={(e) => setCopySourceLineId(e.target.value)}
                className="ptm-select-compact"
                style={{ width: "100%" }}
              >
                <option value="">-- Pilih Lini Sumber --</option>
                {lines
                  .filter((l) => l.id !== currentLine?.id)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code}) - {l.workshopName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="ptm-modal-foot">
              <button
                type="button"
                className="ptm-btn ptm-btn-ghost"
                onClick={() => setShowCopyModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="ptm-btn ptm-btn-primary"
                disabled={copyLoading || !copySourceLineId}
                onClick={handleExecuteCopy}
              >
                {copyLoading ? "Menyalin..." : "Salin Pertanyaan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Window Pengerjaan & Standar Kriteria */}
      {showTimeModal && (
        <div
          className="ptm-modal-backdrop"
          onClick={() => setShowTimeModal(false)}
        >
          <div
            className="ptm-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ptm-modal-head">
              <h3 className="ptm-modal-title">
                Pengaturan Waktu & Standar (Shift 1)
              </h3>
              <button
                type="button"
                onClick={() => setShowTimeModal(false)}
                className="ptm-modal-close"
              >
                &times;
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                marginTop: "10px",
              }}
            >
              <div className="ptm-form-group">
                <label className="ptm-input-label">
                  Window Pengerjaan (Shift 1)
                </label>
                <div className="ptm-time-row">
                  <input
                    type="text"
                    value={activeTemplate.windowStart}
                    onChange={(e) =>
                      handleUpdateTemplateMeta({
                        windowStart: e.target.value,
                      })
                    }
                    className="ptm-input ptm-time-input"
                    placeholder="08:00"
                  />
                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                    s/d
                  </span>
                  <input
                    type="text"
                    value={activeTemplate.windowEnd}
                    onChange={(e) =>
                      handleUpdateTemplateMeta({
                        windowEnd: e.target.value,
                      })
                    }
                    className="ptm-input ptm-time-input"
                    placeholder="09:00"
                  />
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    WIB
                  </span>
                </div>
              </div>

              <div className="ptm-form-group">
                <label className="ptm-input-label">
                  Kriteria Penilaian OK
                </label>
                <input
                  type="text"
                  value={activeTemplate.okRule}
                  onChange={(e) =>
                    handleUpdateTemplateMeta({ okRule: e.target.value })
                  }
                  className="ptm-input"
                  placeholder="Contoh: OK jika seluruh pos normal."
                />
              </div>

              <div className="ptm-form-group">
                <label className="ptm-input-label">
                  Kriteria Penilaian NG
                </label>
                <input
                  type="text"
                  value={activeTemplate.ngRule}
                  onChange={(e) =>
                    handleUpdateTemplateMeta({ ngRule: e.target.value })
                  }
                  className="ptm-input"
                  placeholder="Contoh: NG jika terdapat kelainan pos."
                />
              </div>
            </div>

            <div className="ptm-modal-foot">
              <button
                type="button"
                className="ptm-btn ptm-btn-ghost"
                onClick={() => setShowTimeModal(false)}
              >
                Tutup
              </button>
              <button
                type="button"
                className="ptm-btn ptm-btn-primary"
                onClick={async () => {
                  await handleSaveToDatabase();
                  setShowTimeModal(false);
                }}
              >
                Simpan ke Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Petugas Pengisi Papercard */}
      {showWorkersModal && (
        <div
          className="ptm-modal-backdrop"
          onClick={() => setShowWorkersModal(false)}
        >
          <div
            className="ptm-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ptm-modal-head">
              <h3 className="ptm-modal-title">
                Petugas Pengisi Papercard ({selectedDept})
              </h3>
              <button
                type="button"
                onClick={() => setShowWorkersModal(false)}
                className="ptm-modal-close"
              >
                &times;
              </button>
            </div>

            <p className="ptm-modal-desc">
              Daftar anggota yang ditugaskan mengisi form papercard{" "}
              <strong>{selectedDept}</strong> pada lini{" "}
              <strong>{currentLine?.name}</strong>.
            </p>

            <div style={{ marginTop: "10px" }}>
              {assignedMembers.length === 0 ? (
                <div className="ptm-empty-worker-note">
                  Belum ada personil pengisi {selectedDept} di lini ini.
                </div>
              ) : (
                <div className="ptm-worker-chips">
                  {assignedMembers.map((m) => (
                    <div
                      key={m.id ?? m.employeeId}
                      className="ptm-worker-chip"
                    >
                      <div className="ptm-worker-info">
                        <span className="ptm-worker-name">{m.name}</span>
                        <span className="ptm-worker-sub">
                          NIK: {m.employeeId}{" "}
                          {((m as any).role === "leader" ||
                            selectedDept === "PROD") &&
                            "· Leader"}
                        </span>
                      </div>
                      {m.id && (
                        <button
                          type="button"
                          className="ptm-btn-remove-worker"
                          onClick={() =>
                            handleReleaseMember(
                              m.id!,
                              m.name ?? "Anggota"
                            )
                          }
                          title="Lepas dari lini ini"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Assign Form */}
              <form
                onSubmit={handleAssignMember}
                className="ptm-assign-row"
                style={{ marginTop: "12px" }}
              >
                <select
                  value={assigningEmpId}
                  onChange={(e) => setAssigningEmpId(e.target.value)}
                  className="ptm-input"
                  style={{ fontSize: "0.82rem" }}
                >
                  <option value="">+ Tugaskan Karyawan...</option>
                  {candidateEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.dept ?? "-"})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!assigningEmpId || assignBusy}
                  className="ptm-btn ptm-btn-primary"
                  style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                >
                  Tugaskan
                </button>
              </form>
            </div>

            <div className="ptm-modal-foot">
              <button
                type="button"
                className="ptm-btn ptm-btn-primary"
                onClick={() => setShowWorkersModal(false)}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
