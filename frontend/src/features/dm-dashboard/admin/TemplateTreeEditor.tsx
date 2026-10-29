"use client";

import { useEffect, useRef, useState } from "react";
import {
  type AnswerType,
  type ChecklistCategory,
  type ChecklistGroup,
  type ChecklistItem,
  countItems,
  newId,
  renumber,
} from "./templateModel";
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import "./TemplateTreeEditor.css";

interface TemplateTreeEditorProps {
  categories: ChecklistCategory[];
  saving: boolean;
  onChange: (next: ChecklistCategory[], message: string) => void;
}

interface ItemDraft {
  title: string;
  answerType: AnswerType;
  answerMode: "item" | "per_rule";
  ruleInfo: string;
}

function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

function getRules(item: ChecklistItem): string[] {
  return item.rule ? item.rule.split("\n").filter(Boolean) : [];
}

function withRules(item: ChecklistItem, rules: string[]): ChecklistItem {
  return { ...item, rule: rules.length ? rules.join("\n") : undefined };
}

function ActionMenu({
  label,
  index,
  total,
  onEdit,
  onMove,
  onDelete,
  orientation = "horizontal",
}: {
  label: string;
  index: number;
  total: number;
  onEdit?: () => void;
  onMove?: (dir: -1 | 1) => void;
  onDelete?: () => void;
  orientation?: "horizontal" | "vertical";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div className="tte-menu-wrap" ref={ref}>
      <button
        type="button"
        className="tte-menu-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={`Aksi untuk ${label}`}
        title="Menu aksi"
      >
        {orientation === "vertical" ? (
          <MoreVertical size={15} />
        ) : (
          <MoreHorizontal size={15} />
        )}
      </button>

      {open && (
        <div className="tte-menu-dropdown">
          {onEdit && (
            <button
              type="button"
              className="tte-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit();
              }}
            >
              <Pencil size={13} />
              <span>Ubah Nama</span>
            </button>
          )}
          {onMove && (
            <>
              <button
                type="button"
                className="tte-menu-item"
                disabled={index === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onMove(-1);
                }}
              >
                <span>↑ Pindah ke Atas</span>
              </button>
              <button
                type="button"
                className="tte-menu-item"
                disabled={index === total - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onMove(1);
                }}
              >
                <span>↓ Pindah ke Bawah</span>
              </button>
            </>
          )}
          {onDelete && (
            <button
              type="button"
              className="tte-menu-item is-danger"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete();
              }}
            >
              <Trash2 size={13} />
              <span>Hapus</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NameForm({
  initial = "",
  placeholder,
  saveLabel = "Simpan",
  onSave,
  onCancel,
}: {
  initial?: string;
  placeholder: string;
  saveLabel?: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <form
      className="tte-name-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSave(value.trim());
      }}
    >
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        className="tte-inline-input"
      />
      <div className="tte-name-form-btns">
        <button
          type="submit"
          className="tte-btn tte-btn--primary"
          disabled={!value.trim()}
        >
          {saveLabel}
        </button>
        <button
          type="button"
          className="tte-btn tte-btn--cancel"
          onClick={onCancel}
        >
          Batal
        </button>
      </div>
    </form>
  );
}

function ItemForm({
  initial,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial?: ChecklistItem;
  saveLabel: string;
  onSave: (draft: ItemDraft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ItemDraft>({
    title: initial?.title ?? "",
    answerType: initial?.answerType ?? "ok_ng",
    answerMode: initial?.answerMode ?? "per_rule",
    ruleInfo: initial?.ruleInfo ?? "",
  });
  const set = (patch: Partial<ItemDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  return (
    <form
      className="tte-item-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.title.trim()) onSave({ ...draft, title: draft.title.trim() });
      }}
    >
      <div className="tte-form-grid">
        <label className="tte-field tte-field--full">
          <span>Nama pos / item yang diperiksa</span>
          <input
            autoFocus
            value={draft.title}
            placeholder="Contoh: Pengecekan pos penting"
            onChange={(e) => set({ title: e.target.value })}
            className="tte-input"
          />
        </label>
        <label className="tte-field">
          <span>Jenis jawaban</span>
          <select
            value={draft.answerType}
            onChange={(e) =>
              set({ answerType: e.target.value as AnswerType })
            }
            className="tte-select"
          >
            <option value="ok_ng">OK / NG</option>
            <option value="text">Isian teks</option>
          </select>
        </label>
        {draft.answerType === "ok_ng" && (
          <label className="tte-field">
            <span>Cara menjawab</span>
            <select
              value={draft.answerMode}
              onChange={(e) =>
                set({
                  answerMode: e.target.value as "item" | "per_rule",
                })
              }
              className="tte-select"
            >
              <option value="per_rule">
                OK / NG untuk setiap aturan pengecekan
              </option>
              <option value="item">
                Satu OK / NG untuk seluruh pos / item
              </option>
            </select>
          </label>
        )}
        <label className="tte-field tte-field--full">
          <span>Catatan bantuan (opsional)</span>
          <input
            value={draft.ruleInfo}
            placeholder="Catatan petunjuk bagi operator"
            onChange={(e) => set({ ruleInfo: e.target.value })}
            className="tte-input"
          />
        </label>
      </div>
      <div className="tte-form-actions">
        <button
          type="submit"
          className="tte-btn tte-btn--primary"
          disabled={!draft.title.trim()}
        >
          {saveLabel}
        </button>
        <button
          type="button"
          className="tte-btn tte-btn--cancel"
          onClick={onCancel}
        >
          Batal
        </button>
      </div>
    </form>
  );
}

export default function TemplateTreeEditor({
  categories,
  saving,
  onChange,
}: TemplateTreeEditorProps) {
  const [activeCatId, setActiveCatId] = useState<string>(
    categories[0]?.id ?? ""
  );
  const [mode, setMode] = useState<string | null>(null);
  const [collapsedSubjects, setCollapsedSubjects] = useState<Set<string>>(
    new Set()
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Keep active category in sync if categories change or delete
  useEffect(() => {
    if (categories.length === 0) {
      setActiveCatId("");
    } else if (!categories.some((c) => c.id === activeCatId)) {
      setActiveCatId(categories[0]?.id ?? "");
    }
  }, [categories, activeCatId]);

  const activeCategory =
    categories.find((c) => c.id === activeCatId) ?? categories[0] ?? null;

  const commit = (
    next: ChecklistCategory[],
    message: string,
    nextMode: string | null = null
  ) => {
    setMode(nextMode);
    onChange(renumber(next), message);
  };

  const mapCat = (
    id: string,
    fn: (c: ChecklistCategory) => ChecklistCategory
  ) => categories.map((c) => (c.id === id ? fn(c) : c));

  const mapGroup = (
    catId: string,
    groupId: string,
    fn: (g: ChecklistGroup) => ChecklistGroup
  ) =>
    mapCat(catId, (c) => ({
      ...c,
      groups: c.groups.map((g) => (g.id === groupId ? fn(g) : g)),
    }));

  const mapItem = (
    catId: string,
    groupId: string,
    itemId: string,
    fn: (it: ChecklistItem) => ChecklistItem
  ) =>
    mapGroup(catId, groupId, (g) => ({
      ...g,
      items: g.items.map((it) => (it.id === itemId ? fn(it) : it)),
    }));

  const toggleSubject = (id: string) => {
    setCollapsedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleItemRules = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Mark all items in active category as OK/NG
  const handleMarkAllOkNg = () => {
    if (!activeCategory) return;
    const updated = mapCat(activeCategory.id, (c) => ({
      ...c,
      groups: c.groups.map((g) => ({
        ...g,
        items: g.items.map((it) => ({
          ...it,
          answerType: "ok_ng" as AnswerType,
        })),
      })),
    }));
    commit(
      updated,
      `Semua pos pada kategori "${activeCategory.name}" diset ke OK/NG.`
    );
  };

  const activeCatIndex = categories.findIndex((c) => c.id === activeCatId);
  const activeCatTotal = activeCategory
    ? activeCategory.groups.reduce((a, g) => a + g.items.length, 0)
    : 0;

  return (
    <div className="tte-layout">
      {/* LEFT COLUMN: Category Navigation (Member-style) */}
      <aside className="tte-cat-nav" aria-label="Navigasi Kategori Checklist">
        <ul className="tte-cat-list">
          {categories.map((cat, ci) => {
            const isSelected = cat.id === activeCatId;
            const catItemCount = cat.groups.reduce(
              (a, g) => a + g.items.length,
              0
            );

            if (mode === `editCat:${cat.id}`) {
              return (
                <li key={cat.id} className="tte-cat-item-edit">
                  <NameForm
                    initial={cat.name}
                    placeholder="Nama kategori"
                    saveLabel="Simpan"
                    onCancel={() => setMode(null)}
                    onSave={(name) => {
                      commit(
                        mapCat(cat.id, (c) => ({ ...c, name })),
                        `Kategori diubah menjadi "${name}".`
                      );
                    }}
                  />
                </li>
              );
            }

            return (
              <li key={cat.id}>
                <div
                  className={`tte-cat-item ${isSelected ? "is-selected" : ""}`}
                  onClick={() => {
                    setActiveCatId(cat.id);
                    setMode(null);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setActiveCatId(cat.id);
                    }
                  }}
                >
                  <span className="tte-cat-num">{ci + 1}</span>
                  <span className="tte-cat-name" title={cat.name}>
                    {cat.name}
                  </span>
                  <span className="tte-cat-count">{catItemCount}</span>

                  <ActionMenu
                    label={`kategori ${cat.name}`}
                    index={ci}
                    total={categories.length}
                    orientation="vertical"
                    onEdit={() => setMode(`editCat:${cat.id}`)}
                    onMove={(dir) => {
                      const next = move(categories, ci, dir);
                      commit(next, "Urutan kategori diperbarui.");
                    }}
                    onDelete={() => {
                      const msg = catItemCount
                        ? `Hapus kategori "${cat.name}" beserta ${catItemCount} pos / item di dalamnya?`
                        : `Hapus kategori "${cat.name}"?`;
                      if (
                        window.confirm(
                          `${msg}\nPerubahan langsung tersimpan.`
                        )
                      ) {
                        const next = categories.filter((c) => c.id !== cat.id);
                        commit(next, `Kategori "${cat.name}" dihapus.`);
                        if (activeCatId === cat.id && next[0]) {
                          setActiveCatId(next[0].id);
                        }
                      }
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {mode === "addCat" ? (
          <div className="tte-add-cat-form">
            <NameForm
              placeholder="Contoh: Manusia"
              saveLabel="Tambah"
              onCancel={() => setMode(null)}
              onSave={(name) => {
                const id = newId("cat");
                const next = [...categories, { id, name, groups: [] }];
                commit(next, `Kategori "${name}" ditambahkan.`);
                setActiveCatId(id);
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            className="tte-add-cat-btn"
            disabled={saving}
            onClick={() => setMode("addCat")}
          >
            <Plus size={14} />
            <span>Tambah kategori</span>
          </button>
        )}
      </aside>

      {/* RIGHT COLUMN: Selected Category Detail & Checklist Editor */}
      <section className="tte-cat-panel" aria-label="Editor Checklist Kategori">
        {!activeCategory ? (
          <div className="tte-empty-panel">
            <p className="tte-empty-title">Belum ada kategori checklist</p>
            <p className="tte-empty-sub">
              Klik <strong>+ Tambah kategori</strong> di kolom kiri untuk
              membuat kategori pertama (misalnya Manusia, Mesin, atau Material).
            </p>
          </div>
        ) : (
          <>
            {/* 1. Category Header */}
            <div className="tte-panel-header">
              <div className="tte-panel-header-left">
                {mode === `editCatHeader:${activeCategory.id}` ? (
                  <NameForm
                    initial={activeCategory.name}
                    placeholder="Nama kategori"
                    saveLabel="Simpan"
                    onCancel={() => setMode(null)}
                    onSave={(name) => {
                      commit(
                        mapCat(activeCategory.id, (c) => ({ ...c, name })),
                        `Kategori diubah menjadi "${name}".`
                      );
                    }}
                  />
                ) : (
                  <div className="tte-panel-title-row">
                    <h2 className="tte-panel-title">{activeCategory.name}</h2>
                    <button
                      type="button"
                      className="tte-icon-btn"
                      onClick={() =>
                        setMode(`editCatHeader:${activeCategory.id}`)
                      }
                      title="Ubah nama kategori"
                      aria-label="Ubah nama kategori"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
                <span className="tte-panel-sub">
                  {activeCatTotal} pos / item
                </span>
              </div>

              <div className="tte-panel-header-right">
                {/* <button
                  type="button"
                  className="tte-btn-all-ok"
                  onClick={handleMarkAllOkNg}
                  title="Terapkan jenis jawaban OK / NG ke seluruh pos di kategori ini"
                >
                  <Check size={14} />
                  <span>Semua OK</span>
                </button> */}

                <ActionMenu
                  label={`kategori ${activeCategory.name}`}
                  index={activeCatIndex}
                  total={categories.length}
                  orientation="horizontal"
                  onEdit={() =>
                    setMode(`editCatHeader:${activeCategory.id}`)
                  }
                  onMove={(dir) => {
                    const next = move(categories, activeCatIndex, dir);
                    commit(next, "Urutan kategori diperbarui.");
                  }}
                  onDelete={() => {
                    const msg = activeCatTotal
                      ? `Hapus kategori "${activeCategory.name}" beserta ${activeCatTotal} pos / item di dalamnya?`
                      : `Hapus kategori "${activeCategory.name}"?`;
                    if (
                      window.confirm(`${msg}\nPerubahan langsung tersimpan.`)
                    ) {
                      const next = categories.filter(
                        (c) => c.id !== activeCategory.id
                      );
                      commit(
                        next,
                        `Kategori "${activeCategory.name}" dihapus.`
                      );
                      if (next[0]) setActiveCatId(next[0].id);
                    }
                  }}
                />
              </div>
            </div>

            {/* 2. Subjects List */}
            {activeCategory.groups.length === 0 &&
              mode !== `addGrp:${activeCategory.id}` && (
                <div className="tte-empty-subjects">
                  <p>Belum ada subjek penilaian di kategori ini.</p>
                </div>
              )}

            <div className="tte-subjects-list">
              {activeCategory.groups.map((grp, gi) => {
                const isSubjectCollapsed = collapsedSubjects.has(grp.id);

                return (
                  <div key={grp.id} className="tte-subject-card">
                    {/* Subject Header */}
                    <div className="tte-subject-head">
                      <div className="tte-subject-head-left">
                        <GripVertical
                          size={14}
                          className="tte-drag-handle"
                          aria-hidden="true"
                        />

                        {mode === `editGrp:${grp.id}` ? (
                          <NameForm
                            initial={grp.title}
                            placeholder="Nama subjek penilaian"
                            saveLabel="Simpan"
                            onCancel={() => setMode(null)}
                            onSave={(title) => {
                              commit(
                                mapGroup(activeCategory.id, grp.id, (g) => ({
                                  ...g,
                                  title,
                                })),
                                `Subjek diubah menjadi "${title}".`
                              );
                            }}
                          />
                        ) : (
                          <>
                            <h3 className="tte-subject-title">
                              {grp.title || "Tanpa subjek"}
                            </h3>
                            <button
                              type="button"
                              className="tte-icon-btn"
                              onClick={() => setMode(`editGrp:${grp.id}`)}
                              title="Ubah nama subjek"
                              aria-label="Ubah nama subjek"
                            >
                              <Pencil size={13} />
                            </button>
                            <span className="tte-subject-count">
                              {grp.items.length} pos
                            </span>
                          </>
                        )}
                      </div>

                      <div className="tte-subject-head-right">
                        <button
                          type="button"
                          className="tte-icon-btn tte-toggle-btn"
                          onClick={() => toggleSubject(grp.id)}
                          aria-expanded={!isSubjectCollapsed}
                          aria-label={
                            isSubjectCollapsed
                              ? `Buka subjek ${grp.title}`
                              : `Tutup subjek ${grp.title}`
                          }
                          title={
                            isSubjectCollapsed
                              ? "Tampilkan pos / item"
                              : "Sembunyikan pos / item"
                          }
                        >
                          {isSubjectCollapsed ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronUp size={16} />
                          )}
                        </button>

                        <ActionMenu
                          label={`subjek ${grp.title || "tanpa nama"}`}
                          index={gi}
                          total={activeCategory.groups.length}
                          orientation="horizontal"
                          onEdit={() => setMode(`editGrp:${grp.id}`)}
                          onMove={(dir) => {
                            commit(
                              mapCat(activeCategory.id, (c) => ({
                                ...c,
                                groups: move(c.groups, gi, dir),
                              })),
                              "Urutan subjek diperbarui."
                            );
                          }}
                          onDelete={() => {
                            const msg = grp.items.length
                              ? `Hapus subjek "${grp.title || "Tanpa subjek"}" beserta ${grp.items.length} pos / item?`
                              : `Hapus subjek "${grp.title || "Tanpa subjek"}"?`;
                            if (
                              window.confirm(
                                `${msg}\nPerubahan langsung tersimpan.`
                              )
                            ) {
                              commit(
                                mapCat(activeCategory.id, (c) => ({
                                  ...c,
                                  groups: c.groups.filter(
                                    (g) => g.id !== grp.id
                                  ),
                                })),
                                "Subjek dihapus."
                              );
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Subject Body: Items */}
                    {!isSubjectCollapsed && (
                      <div className="tte-subject-body">
                        {grp.items.length === 0 &&
                          mode !== `addItem:${grp.id}` && (
                            <p className="tte-empty-note">
                              Belum ada nama pos / item di subjek ini.
                            </p>
                          )}

                        <div className="tte-items-list">
                          {grp.items.map((item, ii) => {
                            if (mode === `editItem:${item.id}`) {
                              return (
                                <div
                                  key={item.id}
                                  className="tte-item-card is-editing"
                                >
                                  <ItemForm
                                    initial={item}
                                    saveLabel="Simpan perubahan"
                                    onCancel={() => setMode(null)}
                                    onSave={(d) => {
                                      commit(
                                        mapItem(
                                          activeCategory.id,
                                          grp.id,
                                          item.id,
                                          (it) => ({
                                            ...it,
                                            title: d.title,
                                            answerType: d.answerType,
                                            answerMode:
                                              d.answerType === "ok_ng" &&
                                              d.answerMode === "item"
                                                ? "item"
                                                : undefined,
                                            ruleInfo:
                                              d.ruleInfo.trim() || undefined,
                                          })
                                        ),
                                        "Pos / item diperbarui."
                                      );
                                    }}
                                  />
                                </div>
                              );
                            }

                            const rules = getRules(item);
                            // Default rules to expanded if any exists, unless toggled
                            const isRulesExpanded = expandedItems.has(
                              item.id
                            )
                              ? false
                              : true;

                            const saveRules = (
                              next: string[],
                              message: string,
                              nextMode: string | null = null
                            ) => {
                              commit(
                                mapItem(
                                  activeCategory.id,
                                  grp.id,
                                  item.id,
                                  (it) => withRules(it, next)
                                ),
                                message,
                                nextMode
                              );
                            };

                            const badgeLabel =
                              item.answerType === "text"
                                ? "Teks"
                                : item.answerMode === "item"
                                ? "OK / NG satu jawaban"
                                : rules.length > 0
                                ? `OK / NG - ${rules.length} aturan`
                                : "OK / NG";

                            return (
                              <div key={item.id} className="tte-item-card">
                                {/* Item Main Row */}
                                <div className="tte-item-main-row">
                                  <GripVertical
                                    size={13}
                                    className="tte-drag-handle"
                                    aria-hidden="true"
                                  />
                                  <span className="tte-item-num">
                                    {item.number}
                                  </span>

                                  <div className="tte-item-title-wrap">
                                    <span className="tte-item-title">
                                      {item.title}
                                    </span>
                                    <button
                                      type="button"
                                      className="tte-icon-btn"
                                      onClick={() =>
                                        setMode(`editItem:${item.id}`)
                                      }
                                      title="Ubah nama pos"
                                      aria-label="Ubah nama pos"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                  </div>

                                  <span
                                    className={`tte-badge-pill ${
                                      item.answerType === "text"
                                        ? "is-text"
                                        : ""
                                    }`}
                                  >
                                    {badgeLabel}
                                  </span>

                                  {rules.length > 0 && (
                                    <button
                                      type="button"
                                      className="tte-icon-btn tte-toggle-rules-btn"
                                      onClick={() =>
                                        toggleItemRules(item.id)
                                      }
                                      title={
                                        isRulesExpanded
                                          ? "Sembunyikan aturan pengecekan"
                                          : "Tampilkan aturan pengecekan"
                                      }
                                      aria-label={
                                        isRulesExpanded
                                          ? "Sembunyikan aturan pengecekan"
                                          : "Tampilkan aturan pengecekan"
                                      }
                                    >
                                      {isRulesExpanded ? (
                                        <ChevronUp size={14} />
                                      ) : (
                                        <ChevronDown size={14} />
                                      )}
                                    </button>
                                  )}

                                  <ActionMenu
                                    label={`pos ${item.number}`}
                                    index={ii}
                                    total={grp.items.length}
                                    orientation="horizontal"
                                    onEdit={() =>
                                      setMode(`editItem:${item.id}`)
                                    }
                                    onMove={(dir) => {
                                      commit(
                                        mapGroup(
                                          activeCategory.id,
                                          grp.id,
                                          (g) => ({
                                            ...g,
                                            items: move(
                                              g.items,
                                              ii,
                                              dir
                                            ),
                                          })
                                        ),
                                        "Urutan pos / item diperbarui."
                                      );
                                    }}
                                    onDelete={() => {
                                      if (
                                        window.confirm(
                                          `Hapus pos / item "${item.title}" beserta aturannya?\nPerubahan langsung tersimpan.`
                                        )
                                      ) {
                                        commit(
                                          mapGroup(
                                            activeCategory.id,
                                            grp.id,
                                            (g) => ({
                                              ...g,
                                              items: g.items.filter(
                                                (it) => it.id !== item.id
                                              ),
                                            })
                                          ),
                                          "Pos / item dihapus."
                                        );
                                      }
                                    }}
                                  />
                                </div>

                                {item.ruleInfo && (
                                  <div className="tte-item-subinfo">
                                    {item.ruleInfo}
                                  </div>
                                )}

                                {/* Checking Rules (Expanded) */}
                                {isRulesExpanded && (
                                  <div className="tte-rules-wrap">
                                    {rules.map((line, ri) => (
                                      <div
                                        key={ri}
                                        className="tte-rule-row"
                                      >
                                        <GripVertical
                                          size={12}
                                          className="tte-drag-handle"
                                          aria-hidden="true"
                                        />

                                        {mode ===
                                        `editRule:${item.id}:${ri}` ? (
                                          <NameForm
                                            initial={line}
                                            placeholder="Aturan pengecekan"
                                            saveLabel="Simpan"
                                            onCancel={() => setMode(null)}
                                            onSave={(text) => {
                                              saveRules(
                                                rules.map((r, i) =>
                                                  i === ri ? text : r
                                                ),
                                                "Aturan diperbarui."
                                              );
                                            }}
                                          />
                                        ) : (
                                          <>
                                            <span className="tte-rule-text">
                                              {ri + 1}. {line}
                                            </span>
                                            <ActionMenu
                                              label={`aturan ${ri + 1}`}
                                              index={ri}
                                              total={rules.length}
                                              orientation="horizontal"
                                              onEdit={() =>
                                                setMode(
                                                  `editRule:${item.id}:${ri}`
                                                )
                                              }
                                              onMove={(dir) => {
                                                saveRules(
                                                  move(rules, ri, dir),
                                                  "Urutan aturan diperbarui."
                                                );
                                              }}
                                              onDelete={() => {
                                                if (
                                                  window.confirm(
                                                    `Hapus aturan ini?\n${line}`
                                                  )
                                                ) {
                                                  saveRules(
                                                    rules.filter(
                                                      (_, i) => i !== ri
                                                    ),
                                                    "Aturan dihapus."
                                                  );
                                                }
                                              }}
                                            />
                                          </>
                                        )}
                                      </div>
                                    ))}

                                    {mode === `addRule:${item.id}` ? (
                                      <div className="tte-add-rule-form">
                                        <NameForm
                                          placeholder="Contoh: Ada penandaan pada pos pergerakan operator"
                                          saveLabel="Tambah aturan"
                                          onCancel={() => setMode(null)}
                                          onSave={(text) => {
                                            saveRules(
                                              [...rules, text],
                                              "Aturan ditambahkan.",
                                              `addRule:${item.id}`
                                            );
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        className="tte-add-rule-btn"
                                        disabled={saving}
                                        onClick={() =>
                                          setMode(`addRule:${item.id}`)
                                        }
                                      >
                                        <Plus size={12} />
                                        <span>Tambah aturan pengecekan</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {mode === `addItem:${grp.id}` ? (
                          <div className="tte-add-item-form">
                            <ItemForm
                              saveLabel="Tambah pos / item"
                              onCancel={() => setMode(null)}
                              onSave={(d) => {
                                const id = newId("q");
                                commit(
                                  mapGroup(
                                    activeCategory.id,
                                    grp.id,
                                    (g) => ({
                                      ...g,
                                      items: [
                                        ...g.items,
                                        {
                                          id,
                                          number: 0,
                                          title: d.title,
                                          answerType: d.answerType,
                                          answerMode:
                                            d.answerType === "ok_ng" &&
                                            d.answerMode === "item"
                                              ? "item"
                                              : undefined,
                                          ruleInfo:
                                            d.ruleInfo.trim() || undefined,
                                          requireNoteIfNg:
                                            d.answerType === "ok_ng",
                                          requirePhotoIfNg: false,
                                        },
                                      ],
                                    })
                                  ),
                                  "Pos / item baru ditambahkan.",
                                  `addRule:${id}`
                                );
                              }}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="tte-add-item-btn"
                            disabled={saving}
                            onClick={() => setMode(`addItem:${grp.id}`)}
                          >
                            <Plus size={13} />
                            <span>Tambah nama pos / item</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 3. Add Subject Button */}
            {mode === `addGrp:${activeCategory.id}` ? (
              <div className="tte-add-subject-form">
                <NameForm
                  placeholder="Contoh: 1. Pergerakan Operator"
                  saveLabel="Tambah subjek"
                  onCancel={() => setMode(null)}
                  onSave={(title) => {
                    const id = newId("grp");
                    commit(
                      mapCat(activeCategory.id, (c) => ({
                        ...c,
                        groups: [
                          ...c.groups,
                          { id, title, items: [] },
                        ],
                      })),
                      `Subjek "${title}" ditambahkan.`,
                      `addItem:${id}`
                    );
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                className="tte-add-subject-btn"
                disabled={saving}
                onClick={() => setMode(`addGrp:${activeCategory.id}`)}
              >
                <Plus size={14} />
                <span>Tambah subjek penilaian</span>
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
