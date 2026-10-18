"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DmEmployee, DmLine, DmWorkshop } from "../api";
import { adminApi, papercardApi } from "../api";
import type { DmMember } from "../dmData";
import type { DepartmentKey } from "../leader/types";
import "./PapercardTemplateManager.css";

interface PapercardTemplateManagerProps {
  workshops: DmWorkshop[];
  lines: DmLine[];
}

export type AnswerType = "ok_ng" | "text";

export interface ChecklistItem {
  id: string;
  number: number;
  title: string;
  answerType: AnswerType;
  ruleInfo?: string;
  requireNoteIfNg?: boolean;
  requirePhotoIfNg?: boolean;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  items: ChecklistItem[];
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
  windowStart: "07:30",
  windowEnd: "08:15",
  okRule: "OK jika seluruh item normal sesuai standar SOP.",
  ngRule: "NG jika ada deviasi atau abnormalitas. Wajib isi alasan perbaikan.",
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
  const [templates, setTemplates] = useState<Record<string, DepartmentTemplate>>({});
  const [loadingTemplate, setLoadingTemplate] = useState<boolean>(true);

  // Filter category in question list
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");

  // Add question form state
  const [newItemText, setNewItemText] = useState("");
  const [newItemType, setNewItemType] = useState<AnswerType>("ok_ng");
  const [newItemRuleInfo, setNewItemRuleInfo] = useState("");
  const [targetCatId, setTargetCatId] = useState<string>("");

  // Category inline add
  const [newCatName, setNewCatName] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);

  // Save notice
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Line members & worker assignment
  const [lineMembers, setLineMembers] = useState<DmMember[]>([]);
  const [allEmployees, setAllEmployees] = useState<DmEmployee[]>([]);
  const [assigningEmpId, setAssigningEmpId] = useState<string>("");
  const [assignBusy, setAssignBusy] = useState(false);

  // Bulk Apply modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedTargetLineIds, setSelectedTargetLineIds] = useState<number[]>([]);
  const [bulkApplying, setBulkApplying] = useState(false);

  // Copy modal state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceLineId, setCopySourceLineId] = useState<string>("");
  const [copyLoading, setCopyLoading] = useState(false);

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

  // Load all employees in the system for worker assignment
  useEffect(() => {
    adminApi
      .employees()
      .then((emps) => setAllEmployees(emps))
      .catch(() => {});
  }, []);

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
              categories: matched.templateData?.categories ?? [],
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

  const activeTemplate = useMemo(() => {
    if (!currentLine) return EMPTY_TEMPLATE;
    const lineKey = `${currentLine.id}_${selectedDept}`;
    return (
      templates[lineKey] || {
        ...EMPTY_TEMPLATE,
        dept: selectedDept,
        name: `Papercard Departemen ${selectedDept}`,
        categories: [],
      }
    );
  }, [templates, currentLine, selectedDept]);

  // Keep target category in sync
  const effectiveCatId = targetCatId || (activeTemplate.categories[0]?.id ?? "");

  // Assigned members for current department
  const assignedMembers = useMemo(() => {
    return lineMembers.filter((m) => {
      if (selectedDept === "PROD") {
        return m.dept?.toUpperCase() === "PROD" || (m as any).role === "leader";
      }
      return m.dept?.toUpperCase() === selectedDept;
    });
  }, [lineMembers, selectedDept]);

  // Candidate employees for assignment
  const candidateEmployees = useMemo(() => {
    const existingEmpNos = new Set(lineMembers.map((m) => m.employeeId));
    return allEmployees.filter((e) => !existingEmpNos.has(e.employeeId));
  }, [allEmployees, lineMembers]);

  // Filtered categories and questions for display
  const displayedCategories = useMemo(() => {
    if (activeCategoryFilter === "all") {
      return activeTemplate.categories;
    }
    return activeTemplate.categories.filter((c) => c.id === activeCategoryFilter);
  }, [activeTemplate.categories, activeCategoryFilter]);

  const totalQuestionsCount = useMemo(() => {
    return activeTemplate.categories.reduce((acc, c) => acc + c.items.length, 0);
  }, [activeTemplate.categories]);

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
          categories: templateToSave.categories,
          okRule: templateToSave.okRule,
          ngRule: templateToSave.ngRule,
        },
      });

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
        message: err instanceof Error ? err.message : "Gagal menyimpan perubahan template.",
      });
      return false;
    } finally {
      setSaving(false);
      setTimeout(() => setSavedNotice(null), 3500);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !effectiveCatId || !currentKey || !currentLine) return;

    const current = templates[currentKey] || activeTemplate;
    const updatedCategories = current.categories.map((cat) => {
      if (cat.id !== effectiveCatId) return cat;
      const nextNum = cat.items.length + 1;
      const newItem: ChecklistItem = {
        id: `${selectedDept.toLowerCase()}-${Date.now()}`,
        number: nextNum,
        title: newItemText.trim(),
        answerType: newItemType,
        ruleInfo: newItemRuleInfo.trim() || undefined,
        requireNoteIfNg: newItemType === "ok_ng",
        requirePhotoIfNg: false,
      };
      return { ...cat, items: [...cat.items, newItem] };
    });

    const updatedTemplate: DepartmentTemplate = {
      ...current,
      categories: updatedCategories,
    };

    setTemplates((prev) => ({
      ...prev,
      [currentKey]: updatedTemplate,
    }));

    setNewItemText("");
    setNewItemRuleInfo("");
    setNewItemType("ok_ng");

    await persistTemplate(
      updatedTemplate,
      `Pertanyaan baru berhasil ditambahkan dan disimpan ke database.`
    );
  };

  const handleDeleteItem = async (catId: string, itemId: string) => {
    if (!currentKey || !currentLine) return;
    const current = templates[currentKey] || activeTemplate;
    const cat = current.categories.find((c) => c.id === catId);
    const itemToDelete = cat?.items.find((it) => it.id === itemId);
    const itemTitle = itemToDelete ? `"${itemToDelete.title}"` : "pertanyaan ini";

    if (!window.confirm(`Hapus ${itemTitle}?\nPerubahan akan langsung disimpan ke database.`)) {
      return;
    }

    const updatedCategories = current.categories.map((c) => {
      if (c.id !== catId) return c;
      const filtered = c.items.filter((item) => item.id !== itemId);
      const renumbered = filtered.map((item, idx) => ({ ...item, number: idx + 1 }));
      return { ...c, items: renumbered };
    });

    const updatedTemplate: DepartmentTemplate = {
      ...current,
      categories: updatedCategories,
    };

    setTemplates((prev) => ({
      ...prev,
      [currentKey]: updatedTemplate,
    }));

    await persistTemplate(
      updatedTemplate,
      `Pertanyaan berhasil dihapus dan disimpan ke database.`
    );
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !currentKey || !currentLine) return;

    const newCat: ChecklistCategory = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      items: [],
    };

    const current = templates[currentKey] || activeTemplate;
    const updatedCategories = [...current.categories, newCat];
    const updatedTemplate: DepartmentTemplate = {
      ...current,
      categories: updatedCategories,
    };

    setTemplates((prev) => ({
      ...prev,
      [currentKey]: updatedTemplate,
    }));

    setNewCatName("");
    setShowAddCat(false);
    setTargetCatId(newCat.id);
    setActiveCategoryFilter(newCat.id);

    await persistTemplate(
      updatedTemplate,
      `Kategori "${newCat.name}" berhasil dibuat dan disimpan ke database.`
    );
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!currentKey || !currentLine) return;
    const current = templates[currentKey] || activeTemplate;
    const targetCat = current.categories.find((c) => c.id === catId);
    if (!targetCat) return;

    const count = targetCat.items.length;
    const confirmMsg =
      count > 0
        ? `Hapus kategori "${targetCat.name}" beserta ${count} pertanyaan di dalamnya?\nPerubahan akan langsung disimpan ke database.`
        : `Hapus kategori "${targetCat.name}"?\nPerubahan akan langsung disimpan ke database.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    const updatedCategories = current.categories.filter((c) => c.id !== catId);
    const updatedTemplate: DepartmentTemplate = {
      ...current,
      categories: updatedCategories,
    };

    setTemplates((prev) => ({
      ...prev,
      [currentKey]: updatedTemplate,
    }));

    if (activeCategoryFilter === catId) {
      setActiveCategoryFilter("all");
    }
    if (targetCatId === catId) {
      setTargetCatId(updatedCategories[0]?.id ?? "");
    }

    await persistTemplate(
      updatedTemplate,
      `Kategori "${targetCat.name}" berhasil dihapus dan disimpan ke database.`
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
          categories: activeTemplate.categories,
          okRule: activeTemplate.okRule,
          ngRule: activeTemplate.ngRule,
        },
      });

      const count = selectedTargetLineIds.length;
      setSavedNotice({
        type: "success",
        message: `Template ${selectedDept} berhasil diterapkan ke ${count} lini sekaligus.`,
      });
      setShowBulkModal(false);
    } catch (err) {
      setSavedNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal menerapkan ke lini lain.",
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
        setTemplates((prev) => ({
          ...prev,
          [currentKey]: {
            dept: selectedDept,
            name: src.name,
            version: src.version,
            windowStart: src.windowStart,
            windowEnd: src.windowEnd,
            okRule: src.templateData.okRule ?? activeTemplate.okRule,
            ngRule: src.templateData.ngRule ?? activeTemplate.ngRule,
            categories: JSON.parse(JSON.stringify(src.templateData.categories)),
          },
        }));
        const srcLine = lines.find((l) => l.id === srcLineId);
        setSavedNotice({
          type: "success",
          message: `Pertanyaan disalin dari ${srcLine?.name ?? "Lini Lain"}. Klik Simpan untuk memperbarui database lini ini.`,
        });
      }
      setShowCopyModal(false);
    } catch (err) {
      setSavedNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal menyalin template.",
      });
    } finally {
      setCopyLoading(false);
      setTimeout(() => setSavedNotice(null), 4000);
    }
  };

  // Assign worker to line
  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLine || !assigningEmpId) return;
    const emp = allEmployees.find((e) => String(e.id) === assigningEmpId);
    if (!emp) return;

    setAssignBusy(true);
    try {
      await adminApi.addMember(currentLine.id, {
        employeePk: emp.id,
        sortOrder: selectedDept === "PROD" && emp.role === "leader" ? 1 : lineMembers.length + 1,
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
        message: err instanceof Error ? err.message : "Gagal menugaskan anggota.",
      });
    } finally {
      setAssignBusy(false);
      setTimeout(() => setSavedNotice(null), 4000);
    }
  };

  // Release assigned worker
  const handleReleaseMember = async (memberId: number, memberName: string) => {
    if (!window.confirm(`Lepas penugasan ${memberName} dari lini ${currentLine?.name}?`)) return;
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
        message: err instanceof Error ? err.message : "Gagal melepas anggota.",
      });
    } finally {
      setTimeout(() => setSavedNotice(null), 3000);
    }
  };

  // Reset template to factory preset
  const handleReset = async () => {
    if (!currentLine) return;
    if (window.confirm(`Kembalikan template ${selectedDept} lini ${currentLine.name} ke standar default pabrik?`)) {
      try {
        const res = await papercardApi.resetToFactory(currentLine.id, selectedDept);
        setTemplates((prev) => ({
          ...prev,
          [currentKey]: {
            dept: selectedDept,
            name: res.name,
            version: res.version,
            windowStart: res.windowStart,
            windowEnd: res.windowEnd,
            okRule: res.templateData?.okRule ?? "",
            ngRule: res.templateData?.ngRule ?? "",
            categories: res.templateData?.categories ?? [],
          },
        }));
        setSavedNotice({
          type: "success",
          message: `Template ${selectedDept} berhasil di-reset ke standar default.`,
        });
      } catch (err) {
        setSavedNotice({
          type: "error",
          message: err instanceof Error ? err.message : "Gagal me-reset template.",
        });
      } finally {
        setTimeout(() => setSavedNotice(null), 3500);
      }
    }
  };

  return (
    <div className="ptm-root">
      {/* 1. Header Toolbar (Compact, Clean & Calm) */}
      <div className="ptm-topbar">
        <div className="ptm-selectors">
          <div className="ptm-select-group">
            <span className="ptm-label-subtle">Workshop:</span>
            <select
              value={selectedWorkshopId}
              onChange={(e) => {
                setSelectedWorkshopId(e.target.value);
                const wsLines = lines.filter((l) => l.workshopId === Number(e.target.value));
                if (wsLines[0]) setSelectedLineCode(wsLines[0].code);
              }}
              className="ptm-select-compact"
            >
              {workshops.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="ptm-select-group">
            <span className="ptm-label-subtle">Lini:</span>
            <select
              value={selectedLineCode}
              onChange={(e) => {
                setSelectedLineCode(e.target.value);
                setActiveCategoryFilter("all");
                setTargetCatId("");
              }}
              className="ptm-select-compact"
            >
              {availableLines.map((l) => (
                <option key={l.id} value={l.code}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>

          {/* Department Tabs */}
          <div className="ptm-dept-tabs">
            {DEPARTMENTS.map((d) => (
              <button
                key={d.key}
                type="button"
                className={`ptm-dept-tab ${selectedDept === d.key ? "is-active" : ""}`}
                onClick={() => {
                  setSelectedDept(d.key);
                  setActiveCategoryFilter("all");
                  setTargetCatId("");
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="ptm-top-actions">
          <button
            type="button"
            className="ptm-btn ptm-btn-ghost"
            onClick={() => {
              setCopySourceLineId("");
              setShowCopyModal(true);
            }}
            title="Salin pertanyaan dari lini lain"
          >
            Salin Template
          </button>

          <button
            type="button"
            className="ptm-btn ptm-btn-secondary"
            onClick={handleOpenBulkModal}
            title="Terapkan template ini ke beberapa lini sekaligus"
          >
            Terapkan Masal
          </button>

          <button
            type="button"
            className="ptm-btn ptm-btn-ghost"
            onClick={handleReset}
            title="Reset ke standar awal"
          >
            Reset
          </button>

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
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: "bold" }}
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. Main Two-Column Layout */}
      <div className="ptm-layout">
        {/* Left Column: Aturan Window & Petugas Pengisi */}
        <aside className="ptm-sidebar">
          {/* Card: Window & Kriteria */}
          <div className="ptm-card">
            <h4 className="ptm-card-title">Pengaturan Waktu & Standar</h4>

            <div className="ptm-form-group">
              <label className="ptm-input-label">Window Pengerjaan (Shift 1)</label>
              <div className="ptm-time-row">
                <input
                  type="text"
                  value={activeTemplate.windowStart}
                  onChange={(e) => handleUpdateTemplateMeta({ windowStart: e.target.value })}
                  className="ptm-input ptm-time-input"
                  placeholder="07:30"
                />
                <span style={{ color: "#94a3b8", fontSize: "12px" }}>s/d</span>
                <input
                  type="text"
                  value={activeTemplate.windowEnd}
                  onChange={(e) => handleUpdateTemplateMeta({ windowEnd: e.target.value })}
                  className="ptm-input ptm-time-input"
                  placeholder="08:15"
                />
                <span style={{ fontSize: "11px", color: "#64748b" }}>WIB</span>
              </div>
            </div>

            <div className="ptm-form-group">
              <label className="ptm-input-label">Kriteria OK</label>
              <input
                type="text"
                value={activeTemplate.okRule}
                onChange={(e) => handleUpdateTemplateMeta({ okRule: e.target.value })}
                className="ptm-input"
                style={{ color: "#047857" }}
                placeholder="Standar normal..."
              />
            </div>

            <div className="ptm-form-group">
              <label className="ptm-input-label">Kriteria NG</label>
              <input
                type="text"
                value={activeTemplate.ngRule}
                onChange={(e) => handleUpdateTemplateMeta({ ngRule: e.target.value })}
                className="ptm-input"
                style={{ color: "#be123c" }}
                placeholder="Standar deviasi / abnormal..."
              />
            </div>
          </div>

          {/* Card: Petugas Pengisi */}
          <div className="ptm-card">
            <h4 className="ptm-card-title">
              <span>Petugas Pengisi</span>
              <span className={`ptm-badge-count ${assignedMembers.length > 0 ? "is-ok" : "is-empty"}`}>
                {assignedMembers.length} Orang
              </span>
            </h4>

            {assignedMembers.length === 0 ? (
              <div className="ptm-empty-worker-note">
                Belum ada personil pengisi {selectedDept} di lini ini.
              </div>
            ) : (
              <div className="ptm-worker-chips">
                {assignedMembers.map((m) => (
                  <div key={m.id ?? m.employeeId} className="ptm-worker-chip">
                    <div className="ptm-worker-info">
                      <span className="ptm-worker-name">{m.name}</span>
                      <span className="ptm-worker-sub">
                        NIK: {m.employeeId} {((m as any).role === "leader" || selectedDept === "PROD") && "· Leader"}
                      </span>
                    </div>
                    {m.id && (
                      <button
                        type="button"
                        className="ptm-btn-remove-worker"
                        onClick={() => handleReleaseMember(m.id!, m.name ?? "Anggota")}
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
            <form onSubmit={handleAssignMember} className="ptm-assign-row">
              <select
                value={assigningEmpId}
                onChange={(e) => setAssigningEmpId(e.target.value)}
                className="ptm-input"
                style={{ fontSize: "0.78rem" }}
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
                className="ptm-btn ptm-btn-secondary"
                style={{ padding: "4px 10px", fontSize: "0.76rem" }}
              >
                +
              </button>
            </form>
          </div>
        </aside>

        {/* Right Column: Questions & Checklist Categories */}
        <main className="ptm-main-pane">
          {/* Meta Bar */}
          <div className="ptm-meta-bar">
            <input
              type="text"
              value={activeTemplate.name}
              onChange={(e) => handleUpdateTemplateMeta({ name: e.target.value })}
              className="ptm-meta-title-input"
              title="Klik untuk mengubah nama template"
            />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="ptm-meta-badge">{activeTemplate.version}</span>
              <span className="ptm-meta-badge">{totalQuestionsCount} Butir Total</span>
            </div>
          </div>

          {/* Category Filter Pills & Add Category */}
          <div className="ptm-cat-pills">
            <button
              type="button"
              className={`ptm-cat-pill ${activeCategoryFilter === "all" ? "is-active" : ""}`}
              onClick={() => setActiveCategoryFilter("all")}
            >
              <span>Semua</span>
              <span className="ptm-cat-count">{totalQuestionsCount}</span>
            </button>

            {activeTemplate.categories.map((cat) => {
              const isActive = activeCategoryFilter === cat.id;
              return (
                <div
                  key={cat.id}
                  className={`ptm-cat-pill-wrapper ${isActive ? "is-active" : ""}`}
                >
                  <button
                    type="button"
                    className={`ptm-cat-pill ${isActive ? "is-active" : ""}`}
                    onClick={() => {
                      setActiveCategoryFilter(cat.id);
                      setTargetCatId(cat.id);
                    }}
                  >
                    <span>{cat.name}</span>
                    <span className="ptm-cat-count">{cat.items.length}</span>
                  </button>
                  <button
                    type="button"
                    className="ptm-cat-pill-del"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(cat.id);
                    }}
                    title={`Hapus kategori "${cat.name}"`}
                    aria-label={`Hapus kategori ${cat.name}`}
                  >
                    &times;
                  </button>
                </div>
              );
            })}

            {!showAddCat ? (
              <button
                type="button"
                className="ptm-btn-new-cat"
                onClick={() => setShowAddCat(true)}
              >
                + Kategori
              </button>
            ) : (
              <form onSubmit={handleAddCategory} className="ptm-new-cat-inline">
                <input
                  type="text"
                  placeholder="Nama Kategori..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="ptm-btn ptm-btn-primary" style={{ padding: "3px 8px", fontSize: "0.72rem" }}>
                  Simpan
                </button>
                <button
                  type="button"
                  className="ptm-btn ptm-btn-ghost"
                  onClick={() => setShowAddCat(false)}
                  style={{ padding: "3px 6px", fontSize: "0.72rem" }}
                >
                  Batal
                </button>
              </form>
            )}
          </div>

          {/* Questions List */}
          <div className="ptm-questions-list">
            {displayedCategories.length === 0 ? (
              <div className="ptm-empty-questions">
                Belum ada kategori pada template ini. Klik <strong>+ Kategori</strong> untuk membuat kategori baru.
              </div>
            ) : displayedCategories.every((c) => c.items.length === 0) ? (
              <div className="ptm-empty-questions">
                <p style={{ margin: "0 0 8px 0" }}>Belum ada butir pertanyaan pada kategori ini. Tambahkan melalui form di bawah.</p>
                {displayedCategories.length === 1 && (
                  <button
                    type="button"
                    className="ptm-btn ptm-btn-ghost"
                    style={{ color: "#dc2626", borderColor: "#fecaca", fontSize: "0.75rem", padding: "4px 10px" }}
                    onClick={() => handleDeleteCategory(displayedCategories[0].id)}
                  >
                    Hapus Kategori "{displayedCategories[0].name}"
                  </button>
                )}
              </div>
            ) : (
              displayedCategories.map((cat) => (
                <div key={cat.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div className="ptm-category-header">
                    <span className="ptm-category-header-title">
                      {cat.name.toUpperCase()} ({cat.items.length})
                    </span>
                    <button
                      type="button"
                      className="ptm-btn-del-cat-inline"
                      onClick={() => handleDeleteCategory(cat.id)}
                      title={`Hapus kategori "${cat.name}"`}
                    >
                      Hapus Kategori
                    </button>
                  </div>

                  {cat.items.length === 0 ? (
                    <div style={{ fontSize: "0.74rem", color: "#94a3b8", fontStyle: "italic", padding: "6px 8px" }}>
                      Kategori ini belum memiliki butir pertanyaan.
                    </div>
                  ) : (
                    cat.items.map((item) => (
                      <div key={item.id} className="ptm-q-item">
                        <div className="ptm-q-left">
                          <span className="ptm-q-num">#{item.number}</span>
                          {activeCategoryFilter === "all" && (
                            <span className="ptm-q-cat-tag">{cat.name}</span>
                          )}
                          <span className="ptm-q-title">{item.title}</span>

                          {/* Optional Info Tooltip */}
                          {item.ruleInfo && (
                            <div style={{ position: "relative", display: "inline-block" }}>
                              <button
                                type="button"
                                className="ptm-info-btn"
                                onClick={() => setActiveTooltip(activeTooltip === item.id ? null : item.id)}
                                onMouseEnter={() => setActiveTooltip(item.id)}
                                onMouseLeave={() => setActiveTooltip(null)}
                              >
                                i
                              </button>
                              {activeTooltip === item.id && (
                                <div className="ptm-info-tooltip">
                                  {item.ruleInfo}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="ptm-q-right">
                          <span className={`ptm-type-pill ${item.answerType === "ok_ng" ? "is-ok-ng" : "is-text"}`}>
                            {item.answerType === "ok_ng" ? "OK / NG" : "Teks"}
                          </span>
                          <button
                            type="button"
                            className="ptm-q-delete-btn"
                            onClick={() => handleDeleteItem(cat.id, item.id)}
                            title="Hapus pertanyaan"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))
            )}
          </div>

          {/* 3. Compact Add Question Row */}
          <form onSubmit={handleAddItem} className="ptm-add-row">
            <select
              value={effectiveCatId}
              onChange={(e) => setTargetCatId(e.target.value)}
              className="ptm-add-cat-select"
              title="Pilih kategori tujuan"
              disabled={activeTemplate.categories.length === 0}
            >
              {activeTemplate.categories.length === 0 ? (
                <option value="">Buat kategori dahulu</option>
              ) : (
                activeTemplate.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>

            <input
              type="text"
              placeholder={
                activeTemplate.categories.length === 0
                  ? "Tambahkan kategori terlebih dahulu di atas..."
                  : "Ketik butir pengecekan / pertanyaan..."
              }
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              className="ptm-add-text-input"
              disabled={activeTemplate.categories.length === 0}
            />

            <select
              value={newItemType}
              onChange={(e) => setNewItemType(e.target.value as AnswerType)}
              className="ptm-add-type-select"
              disabled={activeTemplate.categories.length === 0}
            >
              <option value="ok_ng">OK / NG</option>
              <option value="text">Teks</option>
            </select>

            <input
              type="text"
              placeholder="Catatan bantuan (opsional)..."
              value={newItemRuleInfo}
              onChange={(e) => setNewItemRuleInfo(e.target.value)}
              className="ptm-add-info-input"
              disabled={activeTemplate.categories.length === 0}
            />

            <button
              type="submit"
              disabled={!newItemText.trim() || !effectiveCatId || saving}
              className="ptm-btn-add-q"
            >
              {saving ? "Menyimpan..." : "+ Tambah"}
            </button>
          </form>
        </main>
      </div>

      {/* MODAL: Bulk Apply to Other Lines */}
      {showBulkModal && (
        <div className="ptm-modal-backdrop" onClick={() => setShowBulkModal(false)}>
          <div className="ptm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ptm-modal-head">
              <h3 className="ptm-modal-title">Terapkan Template ke Lini Lain</h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#64748b" }}
              >
                &times;
              </button>
            </div>

            <p className="ptm-modal-desc">
              Pilih lini target. Template <strong>{selectedDept}</strong> yang sedang dibuka akan disalin dan disimpan langsung ke database seluruh lini terpilih.
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
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
                style={{ background: "none", border: "none", color: "#008a4f", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
              >
                {selectedTargetLineIds.length === lines.length ? "Hapus Semua" : "Pilih Semua"}
              </button>
            </div>

            <div className="ptm-modal-list">
              {lines.map((l) => {
                const checked = selectedTargetLineIds.includes(l.id);
                return (
                  <label key={l.id} className={`ptm-modal-item ${checked ? "is-selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTargetLineIds((prev) => [...prev, l.id]);
                        } else {
                          setSelectedTargetLineIds((prev) => prev.filter((id) => id !== l.id));
                        }
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: "block", fontSize: "0.82rem" }}>
                        {l.name} ({l.code})
                      </strong>
                      <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
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
                disabled={bulkApplying || selectedTargetLineIds.length === 0}
                onClick={handleExecuteBulkApply}
              >
                {bulkApplying ? "Menerapkan..." : `Terapkan ke ${selectedTargetLineIds.length} Lini`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Copy Template From Another Line */}
      {showCopyModal && (
        <div className="ptm-modal-backdrop" onClick={() => setShowCopyModal(false)}>
          <div className="ptm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ptm-modal-head">
              <h3 className="ptm-modal-title">Salin dari Lini Lain</h3>
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#64748b" }}
              >
                &times;
              </button>
            </div>

            <p className="ptm-modal-desc">
              Pilih lini sumber. Pertanyaan departemen <strong>{selectedDept}</strong> akan ditarik ke editor lini <strong>{currentLine?.name}</strong>. Anda dapat mengedit dan menyimpannya.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
                PILIH LINI SUMBER:
              </label>
              <select
                value={copySourceLineId}
                onChange={(e) => setCopySourceLineId(e.target.value)}
                className="ptm-input"
              >
                <option value="">-- Pilih Lini Sumber --</option>
                {lines
                  .filter((l) => l.id !== currentLine?.id)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code}) — {l.workshopName}
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
                {copyLoading ? "Menyalin..." : "Salin ke Editor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
