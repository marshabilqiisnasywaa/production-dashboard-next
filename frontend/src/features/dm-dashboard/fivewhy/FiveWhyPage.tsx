"use client";
import { useUiText } from "@/locales/useUiText";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { IconCheck } from "@/components/ui/icons";
import { ApiError, fiveWhyAnalysesApi } from "../api";
import type { FiveWhyAnalysisDetail } from "../api";
import {
  FIVE_WHY_ANALYSIS_LABELS,
  analysisStatusTone,
  findRootCause,
  getTabStatus,
  isMajorProblem,
} from "./fiveWhyData";
import type {
  Evidence,
  FiveWhyAnalysisStatus,
  FiveWhyRecord,
  FiveWhyTabKey,
  ProblemSummaryFields,
  TabStatus,
  WhyNode,
} from "./fiveWhyData";
import { prepareImage } from "./photos";
import ProblemSummary from "./ProblemSummary";
import WhyTree from "./WhyTree";
import ActionPlan from "./ActionPlan";
import FiveWhyReport from "./FiveWhyReport";
import "./FiveWhy.css";

const TABS: readonly { key: FiveWhyTabKey; label: string }[] = [
  { key: 1, label: "Ringkasan Masalah" },
  { key: 2, label: "Analisis 5Why" },
  { key: 3, label: "Solusi & PDCA" },
];

function stepClass(status: TabStatus) {
  if (status === "selesai") return "is-done";
  if (status === "sebagian") return "is-partial";
  return "";
}

function emptyWhys(analysisId: string): WhyNode[] {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `${analysisId}-why-${index + 1}`,
    level: index + 1,
    statement: "",
    verification: "unverified" as const,
    evidence: [],
    branches: [],
  }));
}

function toRecord(detail: FiveWhyAnalysisDetail): FiveWhyRecord {
  const base: Partial<FiveWhyAnalysisDetail["abnormal"]> = detail.abnormal ?? {};
  const summary: Partial<ProblemSummaryFields> = base.summary ?? {};
  return {
    nomor: detail.nomor,
    abnormal: {
      id: detail.id,
      label: base.label ?? "",
      line: base.line ?? "",
      pengusul: base.pengusul ?? "",
      jenis: base.jenis ?? "",
      sumberAbnormal: base.sumberAbnormal ?? [],
      sumberLainnya: base.sumberLainnya ?? "",
      tingkatPengaruh: base.tingkatPengaruh ?? [],
      pengaruhLainnya: base.pengaruhLainnya ?? "",
      summary: {
        when: summary.when ?? "",
        where: summary.where ?? "",
        what: summary.what ?? "",
        who: summary.who ?? "",
        how: summary.how ?? "",
        howMuch: summary.howMuch ?? "",
        downtime: summary.downtime ?? "",
        shortTermSolution: summary.shortTermSolution ?? "",
      },
    },
    analysisStatus: detail.status,
    whys: detail.whys.length > 0 ? detail.whys : emptyWhys(detail.id),
    solutions: detail.solutions,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

function referencedPhotos(record: FiveWhyRecord) {
  const found = new Set<string>();
  const collect = (entries: Evidence[]) =>
    entries.forEach((entry) => entry.photos.forEach((id) => found.add(id)));
  for (const why of record.whys) {
    collect(why.evidence);
    why.branches.forEach((branch) => collect(branch.evidence));
  }
  for (const solution of record.solutions) {
    solution.photosBefore.forEach((id) => found.add(id));
    solution.photosAfter.forEach((id) => found.add(id));
  }
  return found;
}

function withoutPhotos(record: FiveWhyRecord): FiveWhyRecord {
  const clean = (entries: Evidence[]) =>
    entries.map((entry) => ({ ...entry, photos: [] }));
  return {
    ...record,
    whys: record.whys.map((why) => ({
      ...why,
      evidence: clean(why.evidence),
      branches: why.branches.map((branch) => ({
        ...branch,
        evidence: clean(branch.evidence),
      })),
    })),
    solutions: record.solutions.map((solution) => ({
      ...solution,
      photosBefore: [],
      photosAfter: [],
    })),
  };
}

function failureMessage(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

type WhyFocus = {
  id: string | null;
  token: number;
};

type FiveWhyPageProps = {
  analysisId: string;
  onBack: () => void;
  onOpen: (analysisId: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  headerActions?: ReactNode;
  hideHeader?: boolean;
  focusTitle?: boolean;
};

export default function FiveWhyPage({
  analysisId,
  onBack,
  onOpen,
  onDirtyChange,
  headerActions,
  hideHeader,
  focusTitle,
}: FiveWhyPageProps) {
  const { text: uiText } = useUiText();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [record, setRecord] = useState<FiveWhyRecord | null>(null);
  const [revision, setRevision] = useState(0);
  const [canEdit, setCanEdit] = useState(false);
  const [lineId, setLineId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [activeTab, setActiveTab] = useState<FiveWhyTabKey>(1);
  const [mode, setMode] = useState<"view" | "edit">(focusTitle ? "edit" : "view");
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusTitleToken] = useState(focusTitle ? 1 : 0);
  const [whyFocus, setWhyFocus] = useState<WhyFocus>({ id: null, token: 0 });
  const [reloadToken, setReloadToken] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const lastTabRef = useRef<Map<string, FiveWhyTabKey>>(new Map());
  const recordRef = useRef<FiveWhyRecord | null>(null);
  const editCountRef = useRef(0);
  const uploadingRef = useRef(0);
  const serverPhotosRef = useRef<Set<string>>(new Set());

  recordRef.current = record;
  const recordId = record?.abnormal.id ?? "";
  const rootCause = findRootCause(record);
  const majorProblem = isMajorProblem(record);
  const working = saving || busy;

  function notify(message: string) {
    setToast(message);
  }

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  useEffect(() => {
    setMode(focusTitle ? "edit" : "view");
  }, [analysisId, focusTitle]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    fiveWhyAnalysesApi
      .get(analysisId)
      .then((detail) => {
        if (!active) return;
        const next = toRecord(detail);
        setRecord(next);
        setRevision(detail.revision);
        setCanEdit(detail.canEdit);
        setLineId(detail.lineId);
        setDirty(false);
        setConflict(false);
        editCountRef.current = 0;
        serverPhotosRef.current = referencedPhotos(next);
        setActiveTab(lastTabRef.current.get(detail.id) ?? 1);
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(failureMessage(reason, "Analisis gagal dimuat."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [analysisId, reloadToken]);

  useEffect(() => {
    if (!dirty && !working) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, working]);

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

  function confirmDiscard() {
    return (
      !dirty ||
      window.confirm(
        uiText("Perubahan yang belum disimpan akan dibuang. Lanjutkan?")
      )
    );
  }

  function updateRecord(patch: Partial<FiveWhyRecord>) {
    if (!recordRef.current || !canEdit) return;
    editCountRef.current += 1;
    setDirty(true);
    setRecord((current) =>
      current
        ? { ...current, ...patch, updatedAt: new Date().toISOString() }
        : current
    );
  }

  async function uploadPhotos(files: File[]) {
    const owner = recordId;
    if (!owner || !canEdit) return [];
    uploadingRef.current += files.length;
    notify("Mengunggah foto...");
    const ids: string[] = [];
    let firstError: unknown = null;
    for (const file of files) {
      try {
        const prepared = await prepareImage(file);
        const { id } = await fiveWhyAnalysesApi.uploadPhoto(owner, prepared);
        serverPhotosRef.current.add(id);
        ids.push(id);
      } catch (reason) {
        firstError = firstError ?? reason;
      } finally {
        uploadingRef.current -= 1;
      }
    }
    if (recordRef.current?.abnormal.id !== owner) return [];
    if (firstError && ids.length === 0) throw firstError;
    if (firstError) notify(failureMessage(firstError, "Sebagian foto gagal diunggah."));
    else notify("Foto terunggah. Tekan Simpan untuk menyimpan analisis.");
    return ids;
  }

  async function dropUnusedPhotos(savedRefs: Set<string>) {
    if (uploadingRef.current > 0) return;
    const current = recordRef.current ? referencedPhotos(recordRef.current) : new Set<string>();
    const stale = [...serverPhotosRef.current].filter(
      (id) => !savedRefs.has(id) && !current.has(id)
    );
    await Promise.allSettled(
      stale.map(async (id) => {
        await fiveWhyAnalysesApi.removePhoto(analysisId, id);
        serverPhotosRef.current.delete(id);
      })
    );
    savedRefs.forEach((id) => serverPhotosRef.current.add(id));
  }

  async function persist(message: string) {
    const source = recordRef.current;
    if (!source || !canEdit || working) return false;
    const editsAtStart = editCountRef.current;
    const savedRefs = referencedPhotos(source);
    setSaving(true);
    try {
      const saved = await fiveWhyAnalysesApi.save(source.abnormal.id, {
        revision,
        status: source.analysisStatus,
        abnormal: source.abnormal,
        whys: source.whys,
        solutions: source.solutions,
      });
      setRevision(saved.revision);
      setConflict(false);
      if (editCountRef.current === editsAtStart) setDirty(false);
      notify(message);
      void dropUnusedPhotos(savedRefs);
      return true;
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) setConflict(true);
      notify(failureMessage(reason, "Analisis gagal disimpan."));
      return false;
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    if (working || !confirmDiscard()) return;
    onBack();
  }

  function reloadCurrent() {
    if (
      !window.confirm(
        uiText("Muat ulang analisis? Perubahan yang belum disimpan akan dibuang.")
      )
    )
      return;
    setReloadToken((value) => value + 1);
  }

  function openTab(tab: FiveWhyTabKey) {
    setActiveTab(tab);
    if (recordId) lastTabRef.current.set(recordId, tab);
  }

  async function duplicateAnalysis() {
    const source = recordRef.current;
    setMenuOpen(false);
    if (!source || !canEdit || lineId === null || working || !confirmDiscard()) return;
    setBusy(true);
    try {
      const created = await fiveWhyAnalysesApi.create(lineId);
      const copy = withoutPhotos(source);
      try {
        const saved = await fiveWhyAnalysesApi.save(created.id, {
          revision: created.revision,
          status: "draft",
          abnormal: copy.abnormal,
          whys: copy.whys,
          solutions: copy.solutions,
        });
        lastTabRef.current.set(saved.id, activeTab);
        notify("Analisis diduplikat tanpa foto.");
        onOpen(saved.id);
      } catch (reason) {
        notify(failureMessage(reason, "Isi analisis gagal disalin."));
        onOpen(created.id);
      }
    } catch (reason) {
      notify(failureMessage(reason, "Analisis gagal diduplikat."));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAnalysis() {
    const target = recordRef.current;
    setMenuOpen(false);
    if (!target || !canEdit || working) return;
    if (
      !window.confirm(
        uiText("Hapus analisis {{v0}}? Analisis akan dihapus permanen.", { v0: target.nomor })
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await fiveWhyAnalysesApi.remove(target.abnormal.id);
      lastTabRef.current.delete(target.abnormal.id);
      setDirty(false);
      onBack();
    } catch (reason) {
      notify(failureMessage(reason, "Analisis gagal dihapus."));
    } finally {
      setBusy(false);
    }
  }

  function showRootCause(node: WhyNode) {
    openTab(2);
    setWhyFocus((current) => ({ id: node.id, token: current.token + 1 }));
  }

  const actionMenu = canEdit ? (
    <div className="dm-5w-menu" ref={menuRef}>
      <button
        type="button"
        className="dm-5w-menu-trigger"
        aria-label={uiText("Aksi analisis")}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        disabled={working}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MoreHorizontal size={16} />
      </button>
      {menuOpen ? (
        <div className="dm-5w-menu-panel" role="menu">
          {lineId !== null ? (
            <button
              type="button"
              role="menuitem"
              className="dm-5w-menu-item"
              onClick={() => void duplicateAnalysis()}
            >{uiText("Duplikat analisis (tanpa foto)")}</button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="dm-5w-menu-item is-danger"
            onClick={() => void deleteAnalysis()}
          >{uiText("Hapus analisis")}</button>
        </div>
      ) : null}
    </div>
  ) : null;

  const backButton = (
    <button
      type="button"
      className="dm-5w-btn dm-5w-btn-secondary dm-5w-btn-sm"
      disabled={working}
      onClick={goBack}
    >
      {uiText("Kembali ke daftar")}
    </button>
  );

  return (
    <div className="dm-5w-root">
      <div className="dm-5w-page">
        {hideHeader ? null : (
          <header className="dm-5w-page-head">
            <div className="dm-5w-page-head-main">
              <div>
                <h1 className="dm-5w-page-title">{uiText("5Why + PDCA")}</h1>
                <p className="dm-5w-page-sub">{uiText("Analisis akar masalah dan rencana tindak lanjutnya.")}</p>
              </div>
              {headerActions}
            </div>
          </header>
        )}

        {loading ? (
          <div className="dm-5w-empty dm-5w-card">{uiText("Memuat analisis...")}</div>
        ) : loadError || !record ? (
          <div className="dm-5w-empty dm-5w-card" role="alert">
            <p className="dm-5w-empty-title">{uiText(loadError || "Analisis gagal dimuat.")}</p>
            <div className="dm-5w-detail-head">
              {backButton}
              <button
                type="button"
                className="dm-5w-btn dm-5w-btn-secondary"
                onClick={() => setReloadToken((value) => value + 1)}
              >{uiText("Coba lagi")}</button>
            </div>
          </div>
        ) : mode === "view" ? (
          <>
            <div className="dm-5w-toolbar">
              {backButton}
              <div className="dm-5w-toolbar-actions">
                {dirty ? (
                  <>
                    <span className="dm-5w-chip is-warning" role="status">
                      {uiText("Belum disimpan")}
                    </span>
                    <button
                      type="button"
                      className="dm-5w-btn dm-5w-btn-secondary dm-5w-btn-sm"
                      disabled={working}
                      onClick={() => void persist("Analisis disimpan.")}
                    >{uiText("Simpan")}</button>
                  </>
                ) : null}
                {canEdit ? (
                  <button
                    type="button"
                    className="dm-5w-btn dm-5w-btn-primary dm-5w-btn-sm"
                    disabled={working}
                    onClick={() => setMode("edit")}
                  >{uiText("Edit")}</button>
                ) : null}
                {actionMenu}
              </div>
            </div>
            <FiveWhyReport record={record} canEdit={canEdit} />
          </>
        ) : (
          <>
            <section
              className="dm-5w-picker dm-5w-card"
              aria-labelledby="dm-5w-picker-title"
            >
              <div className="dm-5w-picker-head">
                <div className="dm-5w-detail-head">
                  {backButton}
                  <h2 className="dm-5w-card-title" id="dm-5w-picker-title">
                    {record.abnormal.label.trim() || uiText("Tanpa judul")}
                  </h2>
                </div>
                <div className="dm-5w-toolbar-actions">
                  <button
                    type="button"
                    className="dm-5w-btn dm-5w-btn-secondary dm-5w-btn-sm"
                    disabled={working}
                    onClick={() => setMode("view")}
                  >{uiText("Lihat hasil")}</button>
                  {actionMenu}
                </div>
              </div>

              <div className="dm-5w-picker-meta">
                <span className="dm-5w-chip is-neutral">{record.nomor}</span>
                <select
                  className={`dm-5w-chip dm-5w-chip-select ${analysisStatusTone(
                    record.analysisStatus
                  )}`}
                  value={record.analysisStatus}
                  onChange={(event) =>
                    updateRecord({
                      analysisStatus: event.target.value as FiveWhyAnalysisStatus,
                    })
                  }
                  disabled={!canEdit}
                  aria-label={uiText("Status analisis")}
                >
                  {(
                    Object.keys(
                      FIVE_WHY_ANALYSIS_LABELS
                    ) as FiveWhyAnalysisStatus[]
                  ).map((status) => (
                    <option key={status} value={status}>
                      {uiText(FIVE_WHY_ANALYSIS_LABELS[status])}
                    </option>
                  ))}
                </select>
                {majorProblem ? (
                  <span className="dm-5w-major">
                    <span className="dm-5w-chip is-danger">{uiText("Major problem")}</span>
                    <span className="dm-5w-major-note">{uiText("Terpicu oleh downtime ≥ 30 menit")}</span>
                  </span>
                ) : null}
                {canEdit ? (
                  <>
                    <span
                      className={`dm-5w-chip ${dirty ? "is-warning" : "is-success"}`}
                      role="status"
                    >
                      {uiText(saving ? "Menyimpan..." : dirty ? "Belum disimpan" : "Tersimpan")}
                    </span>
                    <button
                      type="button"
                      className="dm-5w-btn dm-5w-btn-primary dm-5w-btn-sm"
                      disabled={!dirty || working}
                      onClick={() => void persist("Analisis disimpan.")}
                    >{uiText("Simpan")}</button>
                    {conflict ? (
                      <button
                        type="button"
                        className="dm-5w-btn dm-5w-btn-secondary dm-5w-btn-sm"
                        disabled={working}
                        onClick={reloadCurrent}
                      >{uiText("Muat ulang")}</button>
                    ) : null}
                  </>
                ) : (
                  <span className="dm-5w-chip is-neutral">{uiText("Hanya lihat")}</span>
                )}
              </div>
            </section>

            <div
              className="dm-5w-stepper"
              role="tablist"
              aria-label={uiText("Langkah analisis 5Why dan PDCA")}
            >
              {uiText(TABS.map((tab) => {
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
                    <span className="dm-5w-step-label">{uiText(tab.label)}</span>
                  </button>
                );
              }))}
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
                  onSave={() => void persist("Analisis 5Why disimpan.")}
                  onNotify={notify}
                  onUploadPhotos={uploadPhotos}
                />
              ) : null}
              {activeTab === 3 ? (
                <ActionPlan
                  solutions={record.solutions}
                  rootCause={rootCause}
                  canEdit={canEdit}
                  onChange={(solutions) => updateRecord({ solutions })}
                  onSave={() => void persist("PDCA dan solusi disimpan.")}
                  onNotify={notify}
                  onGoToWhy={() => openTab(2)}
                  onShowRootCause={() => {
                    if (rootCause) showRootCause(rootCause);
                  }}
                  onUploadPhotos={uploadPhotos}
                />
              ) : null}
            </section>
          </>
        )}
      </div>

      {toast ? (
        <div className="dm-5w-toast" role="status" aria-live="polite">
          {uiText(toast)}
        </div>
      ) : null}
    </div>
  );
}
