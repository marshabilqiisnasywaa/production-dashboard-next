"use client";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { MoreHorizontal, Search, X } from "lucide-react";
import { IconClock } from "@/components/ui/icons";
import {
  FIVE_WHY_ANALYSIS_LABELS,
  analysisStatusTone,
  findRootCause,
  isMajorProblem,
} from "./fiveWhyData";
import type {
  FiveWhyAnalysisStatus,
  FiveWhyRecord,
} from "./fiveWhyData";

type HistoryDrawerProps = {
  open: boolean;
  records: FiveWhyRecord[];
  activeId: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSelect: (record: FiveWhyRecord) => void;
  onDuplicate: (record: FiveWhyRecord) => void;
  onDelete: (record: FiveWhyRecord) => void;
};

type StatusFilter = "all" | FiveWhyAnalysisStatus;

type SortMode = "recent" | "oldest" | "title";

const STATUS_FILTERS: readonly { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "draft", label: FIVE_WHY_ANALYSIS_LABELS.draft },
  { value: "in_analysis", label: FIVE_WHY_ANALYSIS_LABELS.in_analysis },
  {
    value: "waiting_approval",
    label: FIVE_WHY_ANALYSIS_LABELS.waiting_approval,
  },
  { value: "done", label: FIVE_WHY_ANALYSIS_LABELS.done },
];

function formatUpdated(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day}, ${time}`;
}

function sortRecords(
  records: readonly FiveWhyRecord[],
  mode: SortMode
): FiveWhyRecord[] {
  return [...records].sort((a, b) => {
    if (mode === "title") {
      const aTitle = a.abnormal.label.trim().toLowerCase();
      const bTitle = b.abnormal.label.trim().toLowerCase();
      if (!aTitle && bTitle) return 1;
      if (aTitle && !bTitle) return -1;
      const byTitle = aTitle.localeCompare(bTitle, "id");
      return byTitle !== 0 ? byTitle : a.nomor.localeCompare(b.nomor);
    }
    const byUpdated = a.updatedAt.localeCompare(b.updatedAt);
    if (byUpdated !== 0) {
      return mode === "oldest" ? byUpdated : -byUpdated;
    }
    return mode === "oldest"
      ? a.nomor.localeCompare(b.nomor)
      : b.nomor.localeCompare(a.nomor);
  });
}

export default function HistoryDrawer({
  open,
  records,
  activeId,
  triggerRef,
  onClose,
  onSelect,
  onDuplicate,
  onDelete,
}: HistoryDrawerProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [menuId, setMenuId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const onCloseRef = useRef(onClose);
  const menuOpenRef = useRef(false);

  onCloseRef.current = onClose;
  menuOpenRef.current = menuId !== null;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setStatusFilter("all");
    setSortMode("recent");
    setMenuId(null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    function handleKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (menuOpenRef.current) return;
      onCloseRef.current();
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [open, triggerRef]);

  useEffect(() => {
    if (!menuId) return;
    function handlePointer(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-history-menu]")) return;
      setMenuId(null);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuId(null);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuId]);

  if (!open) return null;

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = records.filter((record) => {
    if (statusFilter !== "all" && record.analysisStatus !== statusFilter) {
      return false;
    }
    if (!normalizedQuery) return true;
    const rootCause = findRootCause(record);
    const haystack = [
      record.nomor,
      record.abnormal.label,
      record.abnormal.pengusul,
      rootCause?.statement ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
  const sorted = sortRecords(filtered, sortMode);

  return (
    <div
      className="dm-5w-history-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="dm-5w-history"
        id="dm-5w-history-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dm-5w-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dm-5w-history-head">
          <h2 className="dm-5w-history-title" id="dm-5w-history-title">
            Riwayat analisis
            <span className="dm-5w-history-count">{records.length}</span>
          </h2>
          <button
            type="button"
            className="dm-5w-history-close"
            onClick={onClose}
            aria-label="Tutup riwayat"
          >
            <X size={18} />
          </button>
        </header>

        <div className="dm-5w-history-tools">
          <div className="dm-5w-history-search">
            <Search size={16} />
            <input
              ref={searchRef}
              className="dm-5w-input"
              value={query}
              placeholder="Cari nomor, judul, pengusul, atau Root Cause"
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Cari riwayat analisis"
            />
          </div>

          <div
            className="dm-5w-history-filters"
            role="group"
            aria-label="Filter status"
          >
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`dm-5w-history-filter ${
                  statusFilter === filter.value ? "is-active" : ""
                }`}
                aria-pressed={statusFilter === filter.value}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <label className="dm-5w-history-sort">
            <span className="dm-5w-label">Urutkan</span>
            <select
              className="dm-5w-select"
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.target.value as SortMode)
              }
              aria-label="Urutkan riwayat"
            >
              <option value="recent">Terbaru diubah</option>
              <option value="oldest">Terlama</option>
              <option value="title">Judul A–Z</option>
            </select>
          </label>
        </div>

        <div className="dm-5w-history-list">
          {records.length === 0 ? (
            <div className="dm-5w-history-empty">
              <span className="dm-5w-empty-icon" aria-hidden="true">
                <IconClock size={20} />
              </span>
              <p>Belum ada riwayat analisis</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="dm-5w-history-empty">
              <p>Tidak ada analisis yang cocok</p>
            </div>
          ) : (
            sorted.map((record) => {
              const recordId = record.abnormal.id;
              const isActive = recordId === activeId;
              const rootCause = findRootCause(record);
              const menuOpen = menuId === recordId;
              return (
                <article
                  key={recordId}
                  className={`dm-5w-history-card ${
                    isActive ? "is-active" : ""
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Buka analisis ${record.nomor}`}
                  onClick={() => onSelect(record)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onSelect(record);
                  }}
                >
                  <header className="dm-5w-history-card-head">
                    <div className="dm-5w-history-card-head-left">
                      <span className="dm-5w-history-number">
                        {record.nomor}
                      </span>
                      <span
                        className={`dm-5w-history-status ${analysisStatusTone(
                          record.analysisStatus
                        )}`}
                      >
                        {FIVE_WHY_ANALYSIS_LABELS[record.analysisStatus]}
                      </span>
                      {isActive ? (
                        <span className="dm-5w-history-active-label">
                          Sedang dibuka
                        </span>
                      ) : null}
                    </div>
                    <div className="dm-5w-menu" data-history-menu>
                      <button
                        type="button"
                        className="dm-5w-menu-trigger"
                        aria-label={`Aksi untuk ${record.nomor}`}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuId(menuOpen ? null : recordId);
                        }}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      {menuOpen ? (
                        <div
                          className="dm-5w-menu-panel"
                          role="menu"
                          data-history-menu-panel
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="dm-5w-menu-item"
                            onClick={() => {
                              setMenuId(null);
                              onSelect(record);
                            }}
                          >
                            Buka
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="dm-5w-menu-item"
                            onClick={() => {
                              setMenuId(null);
                              onDuplicate(record);
                            }}
                          >
                            Duplikat
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="dm-5w-menu-item is-danger"
                            onClick={() => {
                              setMenuId(null);
                              onDelete(record);
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </header>

                  <h3 className="dm-5w-history-card-title">
                    {record.abnormal.label.trim() || "Tanpa judul"}
                  </h3>
                  <p className="dm-5w-history-meta">
                    Line {record.abnormal.line.trim() || "-"} · Pengusul{" "}
                    {record.abnormal.pengusul.trim() || "-"}
                  </p>

                  <div className="dm-5w-history-foot">
                    <span className="dm-5w-history-root">
                      {rootCause?.statement.trim()
                        ? `Root Cause: ${rootCause.statement.trim()}`
                        : "Belum ada Root Cause"}
                    </span>
                    <span className="dm-5w-history-foot-right">
                      {isMajorProblem(record) ? (
                        <span className="dm-5w-history-major">
                          Major problem
                        </span>
                      ) : null}
                      <span className="dm-5w-history-updated">
                        Diubah {formatUpdated(record.updatedAt)}
                      </span>
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
