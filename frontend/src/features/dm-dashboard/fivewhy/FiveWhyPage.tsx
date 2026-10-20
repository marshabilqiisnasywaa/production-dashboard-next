"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconCheck } from "@/components/ui/icons";
import { accountApi, meetingApi, type DmMe } from "../api";
import {
  FIVE_WHY_ANALYSIS_LABELS,
  FIVE_WHY_STORAGE_KEY,
  PDCA_STAGE_BY_STATUS,
  normalizeWhyTree,
} from "./fiveWhyData";
import type { FiveWhyRecord, FiveWhyStore } from "./fiveWhyData";
import {
  mergeMeetingRecords,
  recordsFromSessions,
} from "./fiveWhyMeeting";
import ProblemSummary from "./ProblemSummary";
import WhyTree from "./WhyTree";
import ActionPlan from "./ActionPlan";
import "./FiveWhy.css";

type FiveWhyTabKey = 1 | 2 | 3;

const TABS: readonly { key: FiveWhyTabKey; label: string }[] = [
  { key: 1, label: "Ringkasan Masalah" },
  { key: 2, label: "Analisis 5Why" },
  { key: 3, label: "Solusi & PDCA" },
];

function isFiveWhyRecord(value: unknown): value is FiveWhyRecord {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<FiveWhyRecord>;
  const abnormal = candidate.abnormal;
  if (typeof abnormal !== "object" || abnormal === null) return false;
  const abnormalCandidate = abnormal as { id?: unknown };
  return (
    typeof abnormalCandidate.id === "string" &&
    Array.isArray(candidate.whys) &&
    Array.isArray(candidate.actions)
  );
}

function parseStore(value: unknown): FiveWhyStore | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as {
    selectedAbnormalId?: unknown;
    records?: unknown;
  };
  if (
    typeof candidate.selectedAbnormalId !== "string" ||
    !Array.isArray(candidate.records)
  ) {
    return null;
  }
  const records = candidate.records.filter(isFiveWhyRecord).map((record) => ({
    abnormal: record.abnormal,
    analysisStatus: record.analysisStatus,
    whys: normalizeWhyTree(record.whys),
    actions: record.actions,
    updatedAt: record.updatedAt,
  }));
  if (records.length === 0) return null;
  return {
    selectedAbnormalId: candidate.selectedAbnormalId,
    records,
  };
}

function readSavedStore(): FiveWhyStore | null {
  try {
    const raw = window.localStorage.getItem(FIVE_WHY_STORAGE_KEY);
    if (!raw) return null;
    return parseStore(JSON.parse(raw));
  } catch {
    return null;
  }
}

function isSummaryComplete(record: FiveWhyRecord) {
  return Object.values(record.abnormal.summary).every(
    (value) => value.trim().length > 0
  );
}

function isWhyComplete(record: FiveWhyRecord) {
  return (
    record.whys.length === 5 &&
    record.whys.every((why) => why.statement.trim().length > 0) &&
    record.whys.filter((why) => why.verification === "root").length === 1
  );
}

function isPdcaComplete(record: FiveWhyRecord) {
  return (
    record.actions.length > 0 &&
    record.actions.every(
      (action) =>
        action.pic.trim().length > 0 && action.department.trim().length > 0
    ) &&
    record.actions.some(
      (action) => PDCA_STAGE_BY_STATUS[action.status] === "Act"
    )
  );
}

function analysisChipClass(status: FiveWhyRecord["analysisStatus"]) {
  if (status === "waiting_approval") return "is-warning";
  if (status === "done") return "is-success";
  if (status === "in_analysis") return "is-success";
  return "is-neutral";
}

export default function FiveWhyPage() {
  const [store, setStore] = useState<FiveWhyStore>({
    selectedAbnormalId: "",
    records: [],
  });
  const [selectedAbnormalId, setSelectedAbnormalId] = useState("");
  const [activeTab, setActiveTab] = useState<FiveWhyTabKey>(2);
  const [currentUser, setCurrentUser] = useState<DmMe | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const dirtyRef = useRef(false);
  const hydratedRef = useRef(false);
  const storageErrorRef = useRef(false);
  const sourcesRef = useRef<FiveWhyRecord[]>([]);

  const loadMeetingData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const saved = readSavedStore();
    try {
      const me = await accountApi.me();
      setCurrentUser(me);
      const today = new Date().toISOString().slice(0, 10);
      const sessions = me.line
        ? await meetingApi.listSessions(me.line.id, today)
        : [];
      const sources = recordsFromSessions(sessions, me);
      sourcesRef.current = sources;
      const merged = mergeMeetingRecords(saved, sources);
      dirtyRef.current = false;
      setStore(merged);
      setSelectedAbnormalId(merged.selectedAbnormalId);
      hydratedRef.current = true;
    } catch (error) {
      const fallback = saved ?? {
        selectedAbnormalId: "",
        records: [],
      };
      sourcesRef.current = [];
      setStore(fallback);
      setSelectedAbnormalId(fallback.selectedAbnormalId);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Data meeting tidak bisa dimuat."
      );
      hydratedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeetingData();
  }, [loadMeetingData, reloadToken]);

  useEffect(() => {
    function loadSaved() {
      if (dirtyRef.current) return;
      const next = readSavedStore();
      if (!next) return;
      const merged = mergeMeetingRecords(next, sourcesRef.current);
      if (merged.records.length === 0) return;
      setStore(merged);
      setSelectedAbnormalId((current) =>
        merged.records.some((record) => record.abnormal.id === current)
          ? current
          : merged.selectedAbnormalId
      );
    }

    window.addEventListener("focus", loadSaved);
    window.addEventListener("storage", loadSaved);
    return () => {
      window.removeEventListener("focus", loadSaved);
      window.removeEventListener("storage", loadSaved);
    };
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

  const record =
    store.records.find((item) => item.abnormal.id === selectedAbnormalId) ??
    null;
  const canEdit =
    currentUser?.kind === "admin" || currentUser?.role === "leader";
  const stepDone: Record<FiveWhyTabKey, boolean> = {
    1: record ? isSummaryComplete(record) : false,
    2: record ? isWhyComplete(record) : false,
    3: record ? isPdcaComplete(record) : false,
  };
  const hasAct = record
    ? record.actions.some(
        (action) => PDCA_STAGE_BY_STATUS[action.status] === "Act"
      )
    : false;
  const abnormalOptions = store.records.map((item) => ({
    id: item.abnormal.id,
    label: item.abnormal.label,
  }));
  function notify(message: string) {
    setToast(message);
  }

  function updateRecord(patch: Partial<FiveWhyRecord>) {
    dirtyRef.current = true;
    setStore((current) => ({
      ...current,
      records: current.records.map((item) =>
        item.abnormal.id === selectedAbnormalId ? { ...item, ...patch } : item
      ),
    }));
  }

  function persist(message: string) {
    if (!canEdit || !record) return;
    const next: FiveWhyStore = {
      selectedAbnormalId,
      records: store.records.map((item) =>
        item.abnormal.id === selectedAbnormalId
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

  function handleAbnormalChange(id: string) {
    dirtyRef.current = true;
    setSelectedAbnormalId(id);
    setStore((current) => ({ ...current, selectedAbnormalId: id }));
    setActiveTab(2);
  }

  return (
    <div className="dm-5w-root">
      <div className="dm-5w-page">
            <header className="dm-5w-page-head">
              <div>
                <h1 className="dm-5w-page-title">5Why + PDCA</h1>
                <p className="dm-5w-page-sub">
                  Analisis akar masalah dari summary End Meeting dan rencana
                  tindak lanjutnya.
                </p>
              </div>
              <button
                type="button"
                className="dm-5w-btn dm-5w-btn-secondary"
                disabled={!canEdit || !hasAct}
                title={
                  hasAct
                    ? "Ajukan perubahan checklist"
                    : "Aktif setelah ada baris aksi bertahap Act"
                }
                onClick={() =>
                  notify("Pengajuan perubahan checklist dikirim.")
                }
              >
                Ajukan perubahan checklist
              </button>
            </header>

            <section
              className="dm-5w-picker dm-5w-card"
              aria-labelledby="dm-5w-picker-title"
            >
              <div className="dm-5w-field dm-5w-picker-field">
                <label
                  className="dm-5w-label"
                  htmlFor="dm-5w-abnormal-select"
                  id="dm-5w-picker-title"
                >
                  Pilih abnormal dari End Meeting hari ini
                </label>
                <select
                  id="dm-5w-abnormal-select"
                  className="dm-5w-select"
                  value={selectedAbnormalId}
                  disabled={loading}
                  onChange={(event) => handleAbnormalChange(event.target.value)}
                >
                  <option value="">Pilih abnormal</option>
                  {abnormalOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {record ? (
                <div className="dm-5w-picker-meta">
                  <span className="dm-5w-chip is-danger">Kendala meeting</span>
                  <span className="dm-5w-hint">
                    Diambil dari summary End Meeting hari ini
                  </span>
                  <span className="dm-5w-chip is-neutral">
                    {record.abnormal.sumber || "Summary meeting"}
                  </span>
                  <span
                    className={`dm-5w-chip ${analysisChipClass(
                      record.analysisStatus
                    )}`}
                  >
                    {FIVE_WHY_ANALYSIS_LABELS[record.analysisStatus]}
                  </span>
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
                  {TABS.map((tab) => (
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
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <span
                        className={`dm-5w-step-circle ${
                          stepDone[tab.key] ? "is-done" : ""
                        }`}
                        aria-hidden="true"
                      >
                        {stepDone[tab.key] ? (
                          <IconCheck size={12} />
                        ) : (
                          tab.key
                        )}
                      </span>
                      <span className="dm-5w-step-label">{tab.label}</span>
                    </button>
                  ))}
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
                      onChange={(abnormal) => updateRecord({ abnormal })}
                    />
                  ) : null}
                  {activeTab === 2 ? (
                    <WhyTree
                      whys={record.whys}
                      problemLabel={record.abnormal.label}
                      canEdit={canEdit}
                      onChange={(whys) => updateRecord({ whys })}
                      onSave={() => persist("Analisis 5Why disimpan.")}
                      onNotify={notify}
                    />
                  ) : null}
                  {activeTab === 3 ? (
                    <ActionPlan
                      actions={record.actions}
                      canEdit={canEdit}
                      onChange={(actions) => updateRecord({ actions })}
                      onSave={() => persist("PDCA dan solusi disimpan.")}
                      onNotify={notify}
                    />
                  ) : null}
                </section>
              </>
            ) : loading ? (
              <div className="dm-5w-empty dm-5w-card">
                Memuat summary End Meeting...
              </div>
            ) : loadError ? (
              <div className="dm-5w-empty dm-5w-card">
                <p>{loadError}</p>
                <button
                  type="button"
                  className="dm-5w-btn dm-5w-btn-secondary"
                  onClick={() => setReloadToken((value) => value + 1)}
                >
                  Muat ulang
                </button>
              </div>
            ) : store.records.length === 0 ? (
              <div className="dm-5w-empty dm-5w-card">
                Belum ada summary End Meeting hari ini. Selesaikan DM Meeting
                dan isi summary untuk mulai analisis.
              </div>
            ) : (
              <div className="dm-5w-empty dm-5w-card">
                Pilih abnormal untuk mulai analisis
              </div>
            )}
      </div>

      {toast ? (
        <div className="dm-5w-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
