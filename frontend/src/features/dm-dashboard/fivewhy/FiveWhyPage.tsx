"use client";
import { useEffect, useRef, useState } from "react";
import { ClipboardList, MoreHorizontal } from "lucide-react";
import { IconCheck, IconClock } from "@/components/ui/icons";
import { accountApi } from "../api";
import type { DmMe } from "../api";
import {
  CURRENT_USER,
  FIVE_WHY_ANALYSIS_LABELS,
  FIVE_WHY_STORAGE_KEY,
  analysisStatusTone,
  createEmptySummary,
  createEmptyWhyNodes,
  createFiveWhyId,
  findRootCause,
  getTabStatus,
  hasStandardSolution,
  isMajorProblem,
  nextFiveWhyNumber,
  normalizeFiveWhyStore,
  toDateTimeValue,
} from "./fiveWhyData";
import type {
  FiveWhyAnalysisStatus,
  FiveWhyRecord,
  FiveWhyStore,
  FiveWhyTabKey,
  TabStatus,
  WhyNode,
} from "./fiveWhyData";
import ProblemSummary from "./ProblemSummary";
import WhyTree from "./WhyTree";
import ActionPlan from "./ActionPlan";
import HistoryDrawer from "./HistoryDrawer";
import "./FiveWhy.css";

const TABS: readonly { key: FiveWhyTabKey; label: string }[] = [
  { key: 1, label: "Ringkasan Masalah" },
  { key: 2, label: "Analisis 5Why" },
  { key: 3, label: "Solusi & PDCA" },
];

function readSavedStore(): FiveWhyStore | null {
  try {
    const raw = window.localStorage.getItem(FIVE_WHY_STORAGE_KEY);
    if (!raw) return null;
    return normalizeFiveWhyStore(JSON.parse(raw));
  } catch {
    return null;
  }
}

function byNewest(a: FiveWhyRecord, b: FiveWhyRecord) {
  const byCreated = b.createdAt.localeCompare(a.createdAt);
  return byCreated !== 0 ? byCreated : b.nomor.localeCompare(a.nomor);
}

function stepClass(status: TabStatus) {
  if (status === "selesai") return "is-done";
  if (status === "sebagian") return "is-partial";
  return "";
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function roleLabelFor(user: DmMe | null) {
  if (!user) return CURRENT_USER.role;
  if (user.role === "leader") return "Leader Line";
  if (user.role === "supervisor") return "Supervisor";
  if (user.dept) return `Anggota ${user.dept}`;
  return "Anggota Tim";
}

type WhyFocus = {
  id: string | null;
  token: number;
};

export default function FiveWhyPage() {
  const [store, setStore] = useState<FiveWhyStore>({
    selectedAbnormalId: "",
    records: [],
  });
  const [selectedAbnormalId, setSelectedAbnormalId] = useState("");
  const [activeTab, setActiveTab] = useState<FiveWhyTabKey>(1);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<DmMe | null>(null);
  const [lineCode, setLineCode] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [focusTitleToken, setFocusTitleToken] = useState(0);
  const [whyFocus, setWhyFocus] = useState<WhyFocus>({ id: null, token: 0 });
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const storageErrorRef = useRef(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastTabRef = useRef<Map<string, FiveWhyTabKey>>(new Map());

  const displayName =
    user?.name?.trim() || user?.username?.trim() || CURRENT_USER.name;
  const initials = initialsFor(displayName);
  const roleLabel = roleLabelFor(user);
  const canEdit = user?.role === "leader" || user?.role === "member";

  useEffect(() => {
    const saved = readSavedStore();
    if (saved) {
      setStore(saved);
      setSelectedAbnormalId(saved.selectedAbnormalId);
    }
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  useEffect(() => {
    accountApi
      .me()
      .then((me) => {
        setUser(me);
        setLineCode(me.line?.code ?? "");
      })
      .catch(() => setLineCode(""));
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (store.records.length === 0 && !dirtyRef.current) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          FIVE_WHY_STORAGE_KEY,
          JSON.stringify(store)
        );
        storageErrorRef.current = false;
      } catch {
        if (storageErrorRef.current) return;
        storageErrorRef.current = true;
        setToast(
          "Penyimpanan browser penuh. Hapus beberapa foto lalu coba lagi."
        );
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [store]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointer(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [menuOpen]);

  const analysisOptions = [...store.records].sort(byNewest);
  const record =
    analysisOptions.find((item) => item.abnormal.id === selectedAbnormalId) ??
    analysisOptions[0] ??
    null;
  const recordId = record?.abnormal.id ?? "";
  const rootCause = findRootCause(record);
  const canSubmitChecklist = hasStandardSolution(record);
  const majorProblem = isMajorProblem(record);

  function notify(message: string) {
    setToast(message);
  }

  function updateRecord(patch: Partial<FiveWhyRecord>) {
    if (!recordId) return;
    dirtyRef.current = true;
    setStore((current) => ({
      ...current,
      records: current.records.map((item) =>
        item.abnormal.id === recordId
          ? { ...item, ...patch, updatedAt: new Date().toISOString() }
          : item
      ),
    }));
  }

  function persist(message: string) {
    if (!canEdit || !recordId) return;
    const next: FiveWhyStore = {
      selectedAbnormalId: recordId,
      records: store.records.map((item) =>
        item.abnormal.id === recordId
          ? { ...item, updatedAt: new Date().toISOString() }
          : item
      ),
    };
    try {
      window.localStorage.setItem(FIVE_WHY_STORAGE_KEY, JSON.stringify(next));
      dirtyRef.current = false;
      setStore(next);
      notify(message);
    } catch {
      storageErrorRef.current = true;
      notify("Penyimpanan browser penuh. Hapus beberapa foto lalu coba lagi.");
    }
  }

  function handleAnalysisChange(id: string) {
    setSelectedAbnormalId(id);
    setStore((current) => ({ ...current, selectedAbnormalId: id }));
    setMenuOpen(false);
  }

  function handleHistorySelect(target: FiveWhyRecord) {
    const targetId = target.abnormal.id;
    setSelectedAbnormalId(targetId);
    setStore((current) => ({ ...current, selectedAbnormalId: targetId }));
    setActiveTab(lastTabRef.current.get(targetId) ?? 1);
    setHistoryOpen(false);
  }

  function openTab(tab: FiveWhyTabKey) {
    setActiveTab(tab);
    if (recordId) lastTabRef.current.set(recordId, tab);
  }

  function createAnalysis() {
    if (!canEdit) return;
    const now = new Date();
    const id = createFiveWhyId("analysis");
    const next: FiveWhyRecord = {
      nomor: nextFiveWhyNumber(
        store.records.map((item) => item.nomor),
        now
      ),
      abnormal: {
        id,
        label: "",
        line: lineCode,
        pengusul: displayName,
        jenis: "",
        sumberAbnormal: [],
        sumberLainnya: "",
        tingkatPengaruh: [],
        pengaruhLainnya: "",
        summary: {
          ...createEmptySummary(),
          when: toDateTimeValue(now),
          where: lineCode,
        },
      },
      analysisStatus: "draft",
      whys: createEmptyWhyNodes(id),
      solutions: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    dirtyRef.current = true;
    lastTabRef.current.set(id, 1);
    setStore((current) => ({
      selectedAbnormalId: id,
      records: [next, ...current.records],
    }));
    setSelectedAbnormalId(id);
    setMenuOpen(false);
    setActiveTab(1);
    setFocusTitleToken((token) => token + 1);
    notify("Analisis baru dibuat.");
  }

  function duplicateRecord(source: FiveWhyRecord) {
    if (!canEdit) return;
    const now = new Date();
    const id = createFiveWhyId("analysis");
    const copy = JSON.parse(JSON.stringify(source)) as FiveWhyRecord;
    const duplicate: FiveWhyRecord = {
      ...copy,
      nomor: nextFiveWhyNumber(
        store.records.map((item) => item.nomor),
        now
      ),
      abnormal: { ...copy.abnormal, id },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    dirtyRef.current = true;
    lastTabRef.current.set(id, activeTab);
    setStore((current) => ({
      selectedAbnormalId: id,
      records: [duplicate, ...current.records],
    }));
    setSelectedAbnormalId(id);
    notify("Analisis diduplikat.");
  }

  function duplicateAnalysis() {
    if (record) duplicateRecord(record);
    setMenuOpen(false);
  }

  function handleHistoryDuplicate(target: FiveWhyRecord) {
    duplicateRecord(target);
    setHistoryOpen(false);
  }

  function deleteRecord(source: FiveWhyRecord) {
    if (!canEdit) return;
    if (
      !window.confirm(
        `Hapus analisis ${source.nomor}? Analisis akan dihapus permanen.`
      )
    ) {
      return;
    }
    const remaining = store.records
      .filter((item) => item.abnormal.id !== source.abnormal.id)
      .sort(byNewest);
    const nextId = remaining.some(
      (item) => item.abnormal.id === selectedAbnormalId
    )
      ? selectedAbnormalId
      : remaining[0]?.abnormal.id ?? "";
    dirtyRef.current = true;
    lastTabRef.current.delete(source.abnormal.id);
    setStore({ selectedAbnormalId: nextId, records: remaining });
    setSelectedAbnormalId(nextId);
    notify("Analisis dihapus.");
  }

  function deleteAnalysis() {
    if (record) deleteRecord(record);
    setMenuOpen(false);
  }

  function showRootCause(node: WhyNode) {
    openTab(2);
    setWhyFocus((current) => ({ id: node.id, token: current.token + 1 }));
  }

  return (
    <div className="dm-5w-root">
      <div className="dm-5w-page">
        <header className="dm-5w-page-head">
          <div>
            <h1 className="dm-5w-page-title">5Why + PDCA</h1>
            <p className="dm-5w-page-sub">
              Analisis akar masalah dan rencana tindak lanjutnya.
            </p>
          </div>
          <div className="dm-5w-page-head-actions">
            <button
              type="button"
              ref={historyButtonRef}
              className="dm-5w-btn dm-5w-btn-secondary"
              aria-haspopup="dialog"
              aria-expanded={historyOpen}
              aria-controls="dm-5w-history-drawer"
              onClick={() => setHistoryOpen(true)}
            >
              <IconClock size={14} />
              Riwayat
            </button>
            <button
              type="button"
              className="dm-5w-btn dm-5w-btn-secondary"
              disabled={!canEdit || !canSubmitChecklist}
              title={
                canSubmitChecklist
                  ? "Ajukan perubahan checklist"
                  : "Aktif setelah minimal satu solusi berstatus Selesai & standar"
              }
              onClick={() => notify("Pengajuan perubahan checklist dikirim.")}
            >
              Ajukan perubahan checklist
            </button>
          </div>
        </header>

        {!hydrated ? (
          <div className="dm-5w-empty dm-5w-card">Memuat analisis...</div>
        ) : store.records.length === 0 ? (
          <div className="dm-5w-empty dm-5w-card">
            <span className="dm-5w-empty-icon" aria-hidden="true">
              <ClipboardList size={24} />
            </span>
            <p className="dm-5w-empty-title">Belum ada analisis</p>
            <button
              type="button"
              className="dm-5w-btn dm-5w-btn-primary"
              onClick={createAnalysis}
              disabled={!canEdit}
            >
              + Analisis baru
            </button>
          </div>
        ) : (
          <>
            <section
              className="dm-5w-picker dm-5w-card"
              aria-labelledby="dm-5w-picker-title"
            >
              <div className="dm-5w-picker-head">
                <h2 className="dm-5w-card-title" id="dm-5w-picker-title">
                  Analisis 5Why
                </h2>
                {record ? (
                  <div className="dm-5w-menu" ref={menuRef}>
                    <button
                      type="button"
                      className="dm-5w-menu-trigger"
                      aria-label="Aksi analisis"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      disabled={!canEdit}
                      onClick={() => setMenuOpen((open) => !open)}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {menuOpen ? (
                      <div className="dm-5w-menu-panel" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          className="dm-5w-menu-item"
                          onClick={duplicateAnalysis}
                        >
                          Duplikat analisis
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="dm-5w-menu-item is-danger"
                          onClick={deleteAnalysis}
                        >
                          Hapus analisis
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="dm-5w-picker-row">
                <div className="dm-5w-field dm-5w-picker-field">
                  <label
                    className="dm-5w-label"
                    htmlFor="dm-5w-analysis-select"
                  >
                    Pilih analisis
                  </label>
                  <select
                    id="dm-5w-analysis-select"
                    className="dm-5w-select"
                    value={recordId}
                    disabled={!hydrated}
                    onChange={(event) =>
                      handleAnalysisChange(event.target.value)
                    }
                  >
                    {analysisOptions.map((option) => (
                      <option key={option.abnormal.id} value={option.abnormal.id}>
                        {`${option.nomor} — ${
                          option.abnormal.label.trim() || "Tanpa judul"
                        }`}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="dm-5w-btn dm-5w-btn-primary"
                  onClick={createAnalysis}
                  disabled={!canEdit}
                >
                  + Analisis baru
                </button>
              </div>

              {record ? (
                <div className="dm-5w-picker-meta">
                  <span className="dm-5w-chip is-neutral">{record.nomor}</span>
                  <select
                    className={`dm-5w-chip dm-5w-chip-select ${analysisStatusTone(
                      record.analysisStatus
                    )}`}
                    value={record.analysisStatus}
                    onChange={(event) =>
                      updateRecord({
                        analysisStatus: event.target
                          .value as FiveWhyAnalysisStatus,
                      })
                    }
                    disabled={!canEdit}
                    aria-label="Status analisis"
                  >
                    {(
                      Object.keys(
                        FIVE_WHY_ANALYSIS_LABELS
                      ) as FiveWhyAnalysisStatus[]
                    ).map((status) => (
                      <option key={status} value={status}>
                        {FIVE_WHY_ANALYSIS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  {majorProblem ? (
                    <span className="dm-5w-major">
                      <span className="dm-5w-chip is-danger">
                        Major problem
                      </span>
                      <span className="dm-5w-major-note">
                        Terpicu oleh downtime ≥ 30 menit
                      </span>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </section>

            {record ? (
              <>
                <div
                  className="dm-5w-stepper"
                  role="tablist"
                  aria-label="Langkah analisis 5Why dan PDCA"
                >
                  {TABS.map((tab) => {
                    const status = getTabStatus(record, tab.key);
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        id={`dm-5w-tab-${tab.key}`}
                        aria-selected={activeTab === tab.key}
                        aria-controls="dm-5w-panel"
                        className={`dm-5w-step ${
                          activeTab === tab.key ? "is-active" : ""
                        }`}
                        onClick={() => openTab(tab.key)}
                      >
                        <span
                          className={`dm-5w-step-circle ${stepClass(status)}`}
                          aria-hidden="true"
                        >
                          {status === "selesai" ? (
                            <IconCheck size={12} />
                          ) : status === "sebagian" ? (
                            <span className="dm-5w-step-dot" />
                          ) : (
                            tab.key
                          )}
                        </span>
                        <span className="dm-5w-step-label">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <section
                  className="dm-5w-panel"
                  role="tabpanel"
                  id="dm-5w-panel"
                  aria-labelledby={`dm-5w-tab-${activeTab}`}
                >
                  {activeTab === 1 ? (
                    <ProblemSummary
                      abnormal={record.abnormal}
                      canEdit={canEdit}
                      focusTitleToken={focusTitleToken}
                      onChange={(abnormal) => updateRecord({ abnormal })}
                    />
                  ) : null}
                  {activeTab === 2 ? (
                    <WhyTree
                      whys={record.whys}
                      problemLabel={record.abnormal.label}
                      canEdit={canEdit}
                      focusWhyId={whyFocus.id}
                      focusToken={whyFocus.token}
                      onChange={(whys) => updateRecord({ whys })}
                      onSave={() => persist("Analisis 5Why disimpan.")}
                      onNotify={notify}
                    />
                  ) : null}
                  {activeTab === 3 ? (
                    <ActionPlan
                      solutions={record.solutions}
                      rootCause={rootCause}
                      canEdit={canEdit}
                      onChange={(solutions) => updateRecord({ solutions })}
                      onSave={() => persist("PDCA dan solusi disimpan.")}
                      onNotify={notify}
                      onGoToWhy={() => openTab(2)}
                      onShowRootCause={() => {
                        if (rootCause) showRootCause(rootCause);
                      }}
                    />
                  ) : null}
                </section>
              </>
            ) : (
              <div className="dm-5w-empty dm-5w-card">
                Pilih analisis untuk mulai.
              </div>
            )}
          </>
        )}
      </div>

      <HistoryDrawer
        open={historyOpen}
        records={store.records}
        activeId={recordId}
        triggerRef={historyButtonRef}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleHistorySelect}
        onDuplicate={handleHistoryDuplicate}
        onDelete={deleteRecord}
      />

      {toast ? (
        <div className="dm-5w-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
