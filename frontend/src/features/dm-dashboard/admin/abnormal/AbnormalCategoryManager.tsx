"use client";
import { useUiText } from "@/locales/useUiText";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { abnormalCategoryApi } from "../../api";
import type { DmAbnormalCategory } from "../../api";
import AbnormalCategoryDialog from "./AbnormalCategoryDialog";
import { suggestNextCode } from "./nextCode";
import type { CategoryDialogState } from "./AbnormalCategoryDialog";
import AbnormalImportModal from "./AbnormalImportModal";
import "./abnormal.css";

type Notice = { type: "ok" | "error"; text: string };

type TreeNode = DmAbnormalCategory & { children: TreeNode[] };

const SEARCH_LIMIT = 200;

const LEVEL_ROLE: Record<number, string> = {
  1: "Kategori utama",
  2: "Sub-kategori",
  3: "Rincian kode",
};

function byCode(a: { code: string }, b: { code: string }) {
  return a.code.localeCompare(b.code, "en", { numeric: true });
}

function buildTree(items: DmAbnormalCategory[]) {
  const nodes = new Map<number, TreeNode>(
    items.map((item) => [item.id, { ...item, children: [] }])
  );
  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    const parent =
      node.parentId === null ? undefined : nodes.get(node.parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (list: TreeNode[]) => {
    list.sort(byCode);
    list.forEach((node) => sort(node.children));
  };
  sort(roots);
  return { nodes, roots };
}

function countDescendants(node: TreeNode): number {
  return node.children.reduce(
    (sum, child) => sum + 1 + countDescendants(child),
    0
  );
}

function countLevel3(node: TreeNode): number {
  if (node.level === 2) return node.children.length;
  return node.children.reduce((sum, child) => sum + countLevel3(child), 0);
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={open ? "is-open" : undefined}
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function PlusSmallIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export default function AbnormalCategoryManager() {
  const { text: uiText, locale } = useUiText();
  const [items, setItems] = useState<DmAbnormalCategory[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [rootFilter, setRootFilter] = useState<number | "all">("all");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<CategoryDialogState | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const didInitExpand = useRef(false);

  const flash = useCallback((type: Notice["type"], text: string) => {
    setNotice({ type, text });
    if (type === "ok") setTimeout(() => setNotice(null), 4000);
  }, []);

  const reload = useCallback(async () => {
    try {
      setItems(await abnormalCategoryApi.list());
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Gagal memuat kode abnormal."
      );
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const tree = useMemo(() => buildTree(items ?? []), [items]);

  useEffect(() => {
    if (didInitExpand.current || tree.roots.length === 0) return;
    didInitExpand.current = true;
    const firstActive =
      tree.roots.find((root) => root.isActive) ?? tree.roots[0];
    if (firstActive) {
      setExpanded(new Set([firstActive.id]));
    }
  }, [tree.roots]);

  useEffect(() => {
    if (rootFilter !== "all" && !tree.nodes.has(rootFilter)) {
      setRootFilter("all");
    }
  }, [rootFilter, tree.nodes]);

  const selected =
    selectedId === null ? null : tree.nodes.get(selectedId) ?? null;

  const pathOf = useCallback(
    (node: TreeNode) => {
      const path: TreeNode[] = [node];
      let current = node;
      while (current.parentId !== null) {
        const parent = tree.nodes.get(current.parentId);
        if (!parent) break;
        path.unshift(parent);
        current = parent;
      }
      return path;
    },
    [tree]
  );

  const rootOf = useCallback(
    (node: TreeNode) => pathOf(node)[0] ?? node,
    [pathOf]
  );

  const stats = useMemo(() => {
    const list = items ?? [];
    return {
      level1: list.filter((item) => item.level === 1).length,
      level2: list.filter((item) => item.level === 2).length,
      level3: list.filter((item) => item.level === 3).length,
      inactive: list.filter((item) => !item.isActive).length,
    };
  }, [items]);

  const sharedBranches = useMemo(
    () => tree.roots.filter((node) => node.level !== 1),
    [tree.roots]
  );

  const filteredRoots = useMemo(
    () =>
      rootFilter === "all"
        ? tree.roots
        : tree.roots.filter((node) => node.id === rootFilter),
    [tree.roots, rootFilter]
  );

  const needle = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!needle) return [];
    return [...tree.nodes.values()]
      .filter((node) => {
        if (rootFilter !== "all" && rootOf(node).id !== rootFilter)
          return false;
        return (
          node.code.toLowerCase().includes(needle) ||
          node.name.toLowerCase().includes(needle)
        );
      })
      .sort(byCode);
  }, [needle, tree, rootFilter, rootOf]);

  function select(node: TreeNode) {
    setSelectedId(node.id);
    setExpanded((current) => {
      const next = new Set(current);
      pathOf(node)
        .slice(0, -1)
        .forEach((ancestor) => next.add(ancestor.id));
      if (node.level < 3 && node.children.length > 0) {
        next.add(node.id);
      }
      return next;
    });
  }

  function chooseRootFilter(nextFilter: number | "all") {
    setRootFilter(nextFilter);
    if (nextFilter !== "all") {
      setExpanded((current) => new Set(current).add(nextFilter));
      const rootNode = tree.nodes.get(nextFilter);
      if (rootNode && (!selected || rootOf(selected).id !== nextFilter)) {
        setSelectedId(rootNode.id);
      }
    }
  }

  function toggle(node: TreeNode) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  }

  function expandAll() {
    const scopeIds =
      rootFilter === "all"
        ? [...tree.nodes.values()]
        : [...tree.nodes.values()].filter(
            (node) => rootOf(node).id === rootFilter
          );
    setExpanded((current) => {
      const next = new Set(current);
      scopeIds
        .filter((node) => node.children.length > 0)
        .forEach((node) => next.add(node.id));
      return next;
    });
  }

  function collapseAll() {
    if (rootFilter === "all") {
      setExpanded(new Set());
      return;
    }
    setExpanded((current) => {
      const next = new Set(current);
      for (const node of tree.nodes.values()) {
        if (rootOf(node).id === rootFilter) next.delete(node.id);
      }
      return next;
    });
  }

  function openCreateDialog(parent: DmAbnormalCategory | null) {
    setDialogError(null);
    setDialog({
      mode: "create",
      parent,
      suggestedCode: suggestNextCode(parent, items ?? []),
    });
  }

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      flash("error", err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  async function saveDialog(values: { code: string; name: string }) {
    if (!dialog) return;
    setBusy(true);
    setDialogError(null);
    try {
      let saved: DmAbnormalCategory;
      if (dialog.mode === "create") {
        saved = await abnormalCategoryApi.create({
          ...values,
          parentId: dialog.parent ? dialog.parent.id : null,
        });
      } else {
        const changes: { code?: string; name?: string } = {};
        if (values.code.toUpperCase() !== dialog.node.code)
          changes.code = values.code;
        if (values.name !== dialog.node.name) changes.name = values.name;
        saved = await abnormalCategoryApi.update(dialog.node.id, changes);
      }
      await reload();
      setSelectedId(saved.id);
      if (saved.parentId !== null) {
        setExpanded((current) =>
          new Set(current).add(saved.parentId as number)
        );
      }
      setDialog(null);
      flash("ok", uiText("{{v0}} disimpan.", { v0: saved.code }));
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  function remove(node: TreeNode) {
    const message = uiText("Hapus {{v0}} {{v1}}? Ini tidak bisa dibatalkan.", {
      v0: node.code,
      v1: node.name,
    });
    if (!window.confirm(message)) return;
    void run(async () => {
      await abnormalCategoryApi.remove(node.id);
      await reload();
      setSelectedId(node.parentId);
      flash("ok", uiText("{{v0}} dihapus.", { v0: node.code }));
    }, "Gagal menghapus.");
  }

  function formatUpdated(value: string) {
    return new Date(value).toLocaleString(locale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderLevel3Leaf(leaf: TreeNode, shared = false) {
    const isSelected = selectedId === leaf.id;
    return (
      <li key={leaf.id} className="ab-leaf-item">
        <button
          type="button"
          className={`ab-leaf-btn${isSelected ? " is-selected" : ""}${
            leaf.isActive ? "" : " is-off"
          }${shared ? " is-shared" : ""}`}
          aria-current={isSelected ? "true" : undefined}
          onClick={() => select(leaf)}
        >
          <span className="ab-code-chip is-l3">{leaf.code}</span>
          <span className="ab-name">{leaf.name}</span>
          {shared ? (
            <span className="ab-flag is-shared">
              {uiText("Dipakai semua kategori")}
            </span>
          ) : null}
          {!leaf.isActive ? (
            <span className="ab-flag">{uiText("Nonaktif")}</span>
          ) : null}
        </button>
      </li>
    );
  }

  function renderSharedBranch(branch: TreeNode) {
    const isSelected = selectedId === branch.id;
    return (
      <li key={`shared-${branch.id}`} className="ab-branch-item">
        <div
          className={`ab-branch-row is-shared${isSelected ? " is-selected" : ""}${
            branch.isActive ? "" : " is-off"
          }`}
        >
          <span className="ab-toggle-gap" aria-hidden="true" />
          <button
            type="button"
            className="ab-pick"
            aria-current={isSelected ? "true" : undefined}
            onClick={() => select(branch)}
          >
            <span className="ab-code-chip is-l2">{branch.code}</span>
            <span className="ab-name">{branch.name}</span>
            <span className="ab-meta-group">
              <span className="ab-flag is-shared">
                {uiText("Dipakai semua kategori")}
              </span>
            </span>
          </button>
        </div>
      </li>
    );
  }

  function renderLevel2Branch(branch: TreeNode) {
    const isShared = branch.parentId === null;
    const ownLeaves = branch.children;
    const sharedLeaves = isShared
      ? []
      : sharedBranches.flatMap((shared) => shared.children);
    const visibleLeaves = [...ownLeaves, ...sharedLeaves];
    const open = expanded.has(branch.id) && visibleLeaves.length > 0;
    const isSelected = selectedId === branch.id;
    const listId = `ab-children-${branch.id}`;

    return (
      <li key={branch.id} className="ab-branch-item">
        <div
          className={`ab-branch-row${isSelected ? " is-selected" : ""}${
            branch.isActive ? "" : " is-off"
          }`}
        >
          {visibleLeaves.length > 0 ? (
            <button
              type="button"
              className="ab-toggle"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              aria-label={
                open
                  ? uiText("Tutup {{v0}}", { v0: branch.code })
                  : uiText("Buka {{v0}}", { v0: branch.code })
              }
              onClick={() => toggle(branch)}
            >
              <ChevronIcon open={open} />
            </button>
          ) : (
            <span className="ab-toggle-gap" aria-hidden="true" />
          )}

          <button
            type="button"
            className="ab-pick"
            aria-current={isSelected ? "true" : undefined}
            onClick={() => select(branch)}
          >
            <span className="ab-code-chip is-l2">{branch.code}</span>
            <span className="ab-name">{branch.name}</span>
            <span className="ab-meta-group">
              <span className="ab-count">
                {uiText("{{v0}} rincian", { v0: visibleLeaves.length })}
              </span>
              {!branch.isActive ? (
                <span className="ab-flag">{uiText("Nonaktif")}</span>
              ) : null}
            </span>
          </button>

          {branch.isActive ? (
            <button
              type="button"
              className="ab-quick-add"
              title={uiText("Tambah Code 3 di bawah {{v0}}", {
                v0: branch.code,
              })}
              aria-label={uiText("Tambah Code 3 di bawah {{v0}}", {
                v0: branch.code,
              })}
              onClick={() => openCreateDialog(branch)}
            >
              <PlusSmallIcon />
              <span>{uiText("Code 3")}</span>
            </button>
          ) : null}
        </div>

        {open ? (
          <ul id={listId} className="ab-leaf-list">
            {ownLeaves.map((leaf) => renderLevel3Leaf(leaf))}
            {sharedLeaves.map((leaf) => (
              <Fragment key={`shared-${leaf.id}`}>
                {renderLevel3Leaf(leaf, true)}
              </Fragment>
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  function renderLevel1Group(root: TreeNode) {
    const visibleBranches = root.children;
    const sharedRows = sharedBranches;
    const open =
      expanded.has(root.id) && visibleBranches.length + sharedRows.length > 0;
    const isSelected = selectedId === root.id;
    const listId = `ab-children-${root.id}`;
    const totalLeafs = countLevel3(root);

    return (
      <li
        key={root.id}
        className={`ab-group-card${open ? " is-open" : ""}${
          isSelected ? " is-selected" : ""
        }${root.isActive ? "" : " is-off"}`}
      >
        <div className="ab-group-head">
          {visibleBranches.length + sharedRows.length > 0 ? (
            <button
              type="button"
              className="ab-toggle is-root"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              aria-label={
                open
                  ? uiText("Tutup {{v0}}", { v0: root.code })
                  : uiText("Buka {{v0}}", { v0: root.code })
              }
              onClick={() => toggle(root)}
            >
              <ChevronIcon open={open} />
            </button>
          ) : (
            <span className="ab-toggle-gap" aria-hidden="true" />
          )}

          <button
            type="button"
            className="ab-group-pick"
            aria-current={isSelected ? "true" : undefined}
            onClick={() => select(root)}
          >
            <span className="ab-code-chip is-l1 is-large">{root.code}</span>
            <span className="ab-group-text">
              <span className="ab-group-title-row">
                <span className="ab-group-name">{root.name}</span>
                {!root.isActive ? (
                  <span className="ab-flag">{uiText("Nonaktif")}</span>
                ) : null}
              </span>
              <span className="ab-group-sub">
                <span>{uiText("Code 1 · Kategori utama")}</span>
                <span className="ab-dot-sep" aria-hidden="true">
                  ·
                </span>
                <span>
                  {uiText("{{v0}} sub-kategori", {
                    v0: visibleBranches.length,
                  })}
                </span>
                <span className="ab-dot-sep" aria-hidden="true">
                  ·
                </span>
                <span>{uiText("{{v0}} rincian", { v0: totalLeafs })}</span>
              </span>
            </span>
          </button>

          {root.isActive ? (
            <button
              type="button"
              className="ab-quick-add is-root"
              title={uiText("Tambah Code 2 di bawah {{v0}}", { v0: root.code })}
              aria-label={uiText("Tambah Code 2 di bawah {{v0}}", {
                v0: root.code,
              })}
              onClick={() => openCreateDialog(root)}
            >
              <PlusSmallIcon />
              <span>{uiText("Code 2")}</span>
            </button>
          ) : null}
        </div>

        {open ? (
          <ul id={listId} className="ab-branch-list">
            {visibleBranches.map((branch) => renderLevel2Branch(branch))}
            {sharedRows.map((shared) => renderSharedBranch(shared))}
          </ul>
        ) : null}
      </li>
    );
  }

  const empty = items !== null && items.length === 0;

  return (
    <div className="ab">
      {notice ? (
        <div
          className={`ab-notice is-${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          <span>{uiText(notice.text)}</span>
          <button
            type="button"
            className="ab-notice-close"
            aria-label={uiText("Tutup notifikasi")}
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      <section
        className="ab-toolbar-card"
        aria-label={uiText("Kontrol kategori abnormal")}
      >
        <div className="ab-toolbar-top">
          {items !== null && !empty ? (
            <div
              className="ab-tier-strip"
              aria-label={uiText("Ringkasan jumlah kode")}
            >
              <div className="ab-tier-pill is-l1">
                <span className="ab-tier-badge">Code 1</span>
                <span className="ab-tier-label">
                  {uiText("Kategori utama")}
                </span>
                <strong className="ab-tier-num">{stats.level1}</strong>
              </div>
              <span className="ab-tier-arrow" aria-hidden="true">
                ›
              </span>
              <div className="ab-tier-pill is-l2">
                <span className="ab-tier-badge">Code 2</span>
                <span className="ab-tier-label">{uiText("Sub-kategori")}</span>
                <strong className="ab-tier-num">{stats.level2}</strong>
              </div>
              <span className="ab-tier-arrow" aria-hidden="true">
                ›
              </span>
              <div className="ab-tier-pill is-l3">
                <span className="ab-tier-badge">Code 3</span>
                <span className="ab-tier-label">{uiText("Rincian kode")}</span>
                <strong className="ab-tier-num">{stats.level3}</strong>
              </div>
              {stats.inactive > 0 ? (
                <div className="ab-tier-pill is-muted">
                  <strong className="ab-tier-num">{stats.inactive}</strong>
                  <span className="ab-tier-label">{uiText("nonaktif")}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="ab-sub">
              {uiText(
                "Susun kategori abnormal dari kelompok utama (Code 1), sub-kategori area/proses (Code 2), hingga rincian penyebab (Code 3)."
              )}
            </p>
          )}

          <div className="ab-actions">
            <button
              type="button"
              className="ab-btn"
              disabled={items === null}
              onClick={() => setImportOpen(true)}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>{uiText("Import Excel")}</span>
            </button>
            <button
              type="button"
              className="ab-btn ab-btn--primary"
              disabled={items === null}
              onClick={() => openCreateDialog(null)}
            >
              <PlusSmallIcon />
              <span>{uiText("Tambah Code 1")}</span>
            </button>
          </div>
        </div>

        {items !== null && !empty ? (
          <>
            <div className="ab-tools">
              <div className="ab-search-wrap">
                <label className="ab-search-label" htmlFor="ab-search-input">
                  {uiText("Cari kode atau nama")}
                </label>
                <div className="ab-search-box">
                  <svg
                    className="ab-search-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="20" y1="20" x2="16.2" y2="16.2" />
                  </svg>
                  <input
                    id="ab-search-input"
                    type="search"
                    value={query}
                    placeholder={uiText("Contoh: P01 atau Ramp Up")}
                    autoComplete="off"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query ? (
                    <button
                      type="button"
                      className="ab-search-clear"
                      aria-label={uiText("Bersihkan pencarian")}
                      onClick={() => setQuery("")}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="ab-tools-right">
                <div className="ab-filter">
                  <select
                    id="ab-root-filter"
                    className="ab-select"
                    value={rootFilter === "all" ? "all" : String(rootFilter)}
                    onChange={(event) =>
                      chooseRootFilter(
                        event.target.value === "all"
                          ? "all"
                          : Number(event.target.value)
                      )
                    }
                  >
                    <option value="all">{uiText("Semua Kategori")}</option>
                    {tree.roots
                      .filter((root) => root.level === 1)
                      .map((root) => (
                      <option key={root.id} value={root.id}>
                        {root.code} · {root.name}
                      </option>
                    ))}
                  </select>
                </div>

                {!needle ? (
                  <div
                    className="ab-expand"
                    role="group"
                    aria-label={uiText("Kontrol lipatan pohon")}
                  >
                    <button
                      type="button"
                      className="ab-btn ab-btn--soft"
                      onClick={expandAll}
                    >
                      {uiText("Buka semua")}
                    </button>
                    <button
                      type="button"
                      className="ab-btn ab-btn--soft"
                      onClick={collapseAll}
                    >
                      {uiText("Tutup semua")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </section>

      {items === null && !loadError ? (
        <div className="ab-state" role="status">
          <p className="ab-state-title">{uiText("Memuat kode abnormal...")}</p>
          <p>
            {uiText("Menyiapkan struktur kategori Code 1, Code 2, dan Code 3.")}
          </p>
        </div>
      ) : null}

      {loadError ? (
        <div className="ab-state ab-state--error" role="alert">
          <p className="ab-state-title">
            {uiText("Data kategori belum dapat dimuat")}
          </p>
          <p>{uiText(loadError)}</p>
          <button
            type="button"
            className="ab-btn"
            onClick={() => void reload()}
          >
            {uiText("Coba lagi")}
          </button>
        </div>
      ) : null}

      {empty ? (
        <div className="ab-state">
          <p className="ab-state-title">{uiText("Belum ada kode abnormal.")}</p>
          <p>
            {uiText(
              "Import file Excel berisi kolom Code 1, Code 2, dan Code 3, atau tambah Code 1 secara manual."
            )}
          </p>
          <div className="ab-actions">
            <button
              type="button"
              className="ab-btn ab-btn--primary"
              onClick={() => setImportOpen(true)}
            >
              {uiText("Import Excel")}
            </button>
            <button
              type="button"
              className="ab-btn"
              onClick={() => openCreateDialog(null)}
            >
              {uiText("Tambah Code 1")}
            </button>
          </div>
        </div>
      ) : null}

      {items !== null && !empty ? (
        <div className={`ab-split${selected ? " has-selection" : ""}`}>
          <section
            className="ab-catalog"
            aria-label={uiText("Daftar kode abnormal")}
          >
            {needle ? (
              results.length === 0 ? (
                <div className="ab-empty-box">
                  <p className="ab-state-title">
                    {uiText("Tidak ada kode yang cocok dengan pencarian ini.")}
                  </p>
                  <p className="ab-empty-sub">
                    {rootFilter !== "all"
                      ? uiText(
                          "Pencarian sedang dibatasi pada satu kategori utama. Hapus filter kategori atau ubah kata kunci."
                        )
                      : uiText("Periksa ejaan kode atau ubah kata kunci.")}
                  </p>
                  <div className="ab-actions">
                    <button
                      type="button"
                      className="ab-btn ab-btn--soft"
                      onClick={() => {
                        setQuery("");
                        setRootFilter("all");
                      }}
                    >
                      {uiText("Reset pencarian & filter")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ab-results-card">
                  <div className="ab-found-bar" role="status">
                    <span>
                      {results.length > SEARCH_LIMIT
                        ? uiText(
                            "{{v0}} cocok, menampilkan {{v1}} pertama. Persempit pencarian.",
                            {
                              v0: results.length,
                              v1: SEARCH_LIMIT,
                            }
                          )
                        : uiText("{{v0}} cocok", { v0: results.length })}
                    </span>
                    {rootFilter !== "all" ? (
                      <button
                        type="button"
                        className="ab-link"
                        onClick={() => setRootFilter("all")}
                      >
                        {uiText("Cari di semua kategori")}
                      </button>
                    ) : null}
                  </div>
                  <ul className="ab-results">
                    {results.slice(0, SEARCH_LIMIT).map((node) => {
                      const trail = pathOf(node).slice(0, -1);
                      return (
                        <li key={node.id}>
                          <button
                            type="button"
                            className={`ab-result${
                              selectedId === node.id ? " is-selected" : ""
                            }${node.isActive ? "" : " is-off"}`}
                            aria-current={
                              selectedId === node.id ? "true" : undefined
                            }
                            onClick={() => select(node)}
                          >
                            <span className="ab-result-main">
                              <span
                                className={`ab-code-chip is-l${node.level}`}
                              >
                                {node.code}
                              </span>
                              <span className="ab-name">{node.name}</span>
                              <span
                                className={`ab-level-tag is-l${node.level}`}
                              >
                                {uiText("Code {{v0}}", { v0: node.level })} ·{" "}
                                {uiText(LEVEL_ROLE[node.level])}
                              </span>
                              {!node.isActive ? (
                                <span className="ab-flag">
                                  {uiText("Nonaktif")}
                                </span>
                              ) : null}
                            </span>
                            {trail.length > 0 ? (
                              <span className="ab-trail">
                                {trail
                                  .map((step) => `${step.code} ${step.name}`)
                                  .join(" › ")}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )
            ) : (
              <ul className="ab-group-list">
                {filteredRoots
                  .filter((node) => node.level === 1)
                  .map((node) => renderLevel1Group(node))}
                {filteredRoots
                  .filter((node) => node.level !== 1)
                  .map((node) => (
                    <li key={node.id} className="ab-group-card is-open">
                      <p className="ab-group-note">
                        {uiText("Dipakai semua kategori")}
                      </p>
                      <ul className="ab-branch-list">
                        {renderLevel2Branch(node)}
                      </ul>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <aside className="ab-detail" aria-label={uiText("Detail kode")}>
            {selected ? (
              <>
                <div className="ab-detail-top">
                  <div className="ab-detail-badges">
                    <span className={`ab-level-tag is-l${selected.level}`}>
                      {uiText("Code {{v0}}", { v0: selected.level })} ·{" "}
                      {uiText(LEVEL_ROLE[selected.level])}
                    </span>
                    <span
                      className={`ab-status-pill ${
                        selected.isActive ? "is-on" : "is-off"
                      }`}
                    >
                      <span className="ab-status-dot" aria-hidden="true" />
                      {selected.isActive ? uiText("Aktif") : uiText("Nonaktif")}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="ab-link ab-close"
                    onClick={() => setSelectedId(null)}
                  >
                    {uiText("Tutup detail")}
                  </button>
                </div>

                <div className="ab-detail-head">
                  <h4 className="ab-detail-title">
                    <span
                      className={`ab-code-chip is-l${selected.level} is-large`}
                    >
                      {selected.code}
                    </span>
                    <span>{selected.name}</span>
                  </h4>
                </div>

                <nav className="ab-path-box" aria-label={uiText("Jalur kode")}>
                  <div className="ab-section-label">
                    {uiText("Jalur kategori")}
                  </div>
                  <ol className="ab-path">
                    {pathOf(selected).map((step) => {
                      const isCurrent = step.id === selected.id;
                      return (
                        <li key={step.id}>
                          <button
                            type="button"
                            className={`ab-path-step is-l${step.level}`}
                            aria-current={isCurrent ? "location" : undefined}
                            onClick={() => select(step)}
                          >
                            <span className="ab-path-lvl">C{step.level}</span>
                            <span className="ab-path-code">{step.code}</span>
                            <span className="ab-path-name">{step.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </nav>

                <dl className="ab-facts">
                  <div className="ab-fact-tile">
                    <dt>{uiText("Level")}</dt>
                    <dd>
                      {uiText("Code {{v0}}", { v0: selected.level })} (
                      {uiText(LEVEL_ROLE[selected.level])})
                    </dd>
                  </div>
                  <div className="ab-fact-tile">
                    <dt>{uiText("Sub-kode")}</dt>
                    <dd>
                      {selected.level === 3
                        ? uiText("Level terdalam")
                        : uiText("{{v0}} sub-kode langsung", {
                            v0: selected.childCount,
                          })}
                    </dd>
                  </div>
                  <div className="ab-fact-tile is-wide">
                    <dt>{uiText("Diperbarui")}</dt>
                    <dd>{formatUpdated(selected.updatedAt)}</dd>
                  </div>
                </dl>

                {selected.level < 3 ? (
                  <div className="ab-children">
                    <div className="ab-children-head">
                      <h5>
                        {uiText("Sub-kode langsung")} (
                        {selected.children.length})
                      </h5>
                      {selected.isActive ? (
                        <button
                          type="button"
                          className="ab-link"
                          disabled={busy}
                          onClick={() => openCreateDialog(selected)}
                        >
                          +{" "}
                          {uiText("Tambah Code {{v0}}", {
                            v0: selected.level + 1,
                          })}
                        </button>
                      ) : null}
                    </div>
                    {selected.children.length > 0 ? (
                      <ul className="ab-children-list">
                        {selected.children.map((child) => (
                          <li key={child.id}>
                            <button
                              type="button"
                              className={`ab-child${
                                child.isActive ? "" : " is-off"
                              }`}
                              onClick={() => select(child)}
                            >
                              <span
                                className={`ab-code-chip is-l${child.level}`}
                              >
                                {child.code}
                              </span>
                              <span className="ab-name">{child.name}</span>
                              {child.childCount > 0 ? (
                                <span className="ab-count">
                                  {uiText("{{v0}} sub", {
                                    v0: child.childCount,
                                  })}
                                </span>
                              ) : null}
                              {!child.isActive ? (
                                <span className="ab-flag">
                                  {uiText("Nonaktif")}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="ab-children-empty">
                        {uiText("Belum ada sub-kode di bawah kategori ini.")}
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="ab-detail-actions">
                  <button
                    type="button"
                    className="ab-btn ab-btn--primary"
                    disabled={busy}
                    onClick={() => {
                      setDialogError(null);
                      setDialog({
                        mode: "edit",
                        node: selected,
                        descendantCount: countDescendants(selected),
                      });
                    }}
                  >
                    {uiText("Edit")}
                  </button>
                  {selected.level < 3 ? (
                    <button
                      type="button"
                      className="ab-btn"
                      disabled={busy || !selected.isActive}
                      onClick={() => openCreateDialog(selected)}
                    >
                      {uiText("Tambah Code {{v0}}", { v0: selected.level + 1 })}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ab-btn ab-btn--danger"
                    disabled={busy || selected.childCount > 0}
                    onClick={() => remove(selected)}
                  >
                    {uiText("Hapus")}
                  </button>
                </div>

                {selected.childCount > 0 ? (
                  <p className="ab-field-hint">
                    {uiText("Hapus aktif setelah semua sub-kodenya dihapus.")}
                  </p>
                ) : null}
                {selected.level === 3 ? (
                  <p className="ab-field-hint">
                    {uiText("Code 3 adalah level terdalam.")}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="ab-guide">
                <h4 className="ab-guide-title">{uiText("Panduan Kategori")}</h4>
                <p className="ab-guide-text">
                  {uiText(
                    "Pilih sebuah kode di daftar untuk melihat jalurnya, sub-kode, dan aksinya."
                  )}
                </p>
                <ul className="ab-guide-levels">
                  <li>
                    <span className="ab-code-chip is-l1">Code 1</span>
                    <div>
                      <strong>{uiText("Kategori utama")}</strong>
                      <span>
                        {uiText(
                          "Kelompok besar abnormal, misalnya H (Human), M (Machine), P (Planning)."
                        )}
                      </span>
                    </div>
                  </li>
                  <li>
                    <span className="ab-code-chip is-l2">Code 2</span>
                    <div>
                      <strong>{uiText("Sub-kategori")}</strong>
                      <span>
                        {uiText(
                          "Area mesin, stasiun, atau jenis proses di bawah Code 1."
                        )}
                      </span>
                    </div>
                  </li>
                  <li>
                    <span className="ab-code-chip is-l3">Code 3</span>
                    <div>
                      <strong>{uiText("Rincian kode")}</strong>
                      <span>
                        {uiText(
                          "Penyebab spesifik yang dipilih operator atau leader saat input abnormal."
                        )}
                      </span>
                    </div>
                  </li>
                </ul>
              </div>
            )}
          </aside>
        </div>
      ) : null}

      <AbnormalCategoryDialog
        state={dialog}
        busy={busy}
        error={dialogError}
        onSubmit={(values) => void saveDialog(values)}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
      />
      <AbnormalImportModal
        open={importOpen}
        onImported={reload}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}
