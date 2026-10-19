"use client";

import { useState } from "react";
import {
  type AnswerType,
  type ChecklistCategory,
  type ChecklistGroup,
  type ChecklistItem,
  countItems,
  newId,
  renumber,
} from "./templateModel";
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

function NameForm({
  initial = "",
  placeholder,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial?: string;
  placeholder: string;
  saveLabel: string;
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
      />
      <button type="submit" className="tte-btn tte-btn--primary" disabled={!value.trim()}>
        {saveLabel}
      </button>
      <button type="button" className="tte-btn" onClick={onCancel}>
        Selesai
      </button>
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
  const set = (patch: Partial<ItemDraft>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <form
      className="tte-item-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.title.trim()) onSave({ ...draft, title: draft.title.trim() });
      }}
    >
      <label className="tte-field">
        <span>Nama pos / item yang diperiksa</span>
        <input
          autoFocus
          value={draft.title}
          placeholder="Contoh: Pengecekan pos penting"
          onChange={(e) => set({ title: e.target.value })}
        />
      </label>
      <label className="tte-field">
        <span>Jenis jawaban</span>
        <select value={draft.answerType} onChange={(e) => set({ answerType: e.target.value as AnswerType })}>
          <option value="ok_ng">OK / NG</option>
          <option value="text">Isian teks</option>
        </select>
      </label>
      {draft.answerType === "ok_ng" && (
        <label className="tte-field tte-field--wide">
          <span>Cara menjawab</span>
          <select value={draft.answerMode} onChange={(e) => set({ answerMode: e.target.value as "item" | "per_rule" })}>
            <option value="per_rule">OK / NG untuk setiap aturan pengecekan</option>
            <option value="item">Satu OK / NG untuk seluruh pos / item</option>
          </select>
        </label>
      )}
      <label className="tte-field tte-field--wide">
        <span>Catatan bantuan (opsional)</span>
        <input value={draft.ruleInfo} onChange={(e) => set({ ruleInfo: e.target.value })} />
      </label>
      <div className="tte-form-actions">
        <button type="submit" className="tte-btn tte-btn--primary" disabled={!draft.title.trim()}>
          {saveLabel}
        </button>
        <button type="button" className="tte-btn" onClick={onCancel}>
          Batal
        </button>
      </div>
    </form>
  );
}

function RowActions({
  index,
  total,
  label,
  onMove,
  onEdit,
  onDelete,
}: {
  index: number;
  total: number;
  label: string;
  onMove: (dir: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="tte-actions">
      <button type="button" className="tte-icon" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Naikkan ${label}`}>
        ▲
      </button>
      <button type="button" className="tte-icon" disabled={index === total - 1} onClick={() => onMove(1)} aria-label={`Turunkan ${label}`}>
        ▼
      </button>
      <button type="button" className="tte-btn" onClick={onEdit}>
        Ubah
      </button>
      <button type="button" className="tte-btn tte-btn--danger" onClick={onDelete}>
        Hapus
      </button>
    </div>
  );
}

export default function TemplateTreeEditor({ categories, saving, onChange }: TemplateTreeEditorProps) {
  const [mode, setMode] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const commit = (next: ChecklistCategory[], message: string, nextMode: string | null = null) => {
    setMode(nextMode);
    onChange(renumber(next), message);
  };

  const mapCat = (id: string, fn: (c: ChecklistCategory) => ChecklistCategory) =>
    categories.map((c) => (c.id === id ? fn(c) : c));
  const mapGroup = (catId: string, groupId: string, fn: (g: ChecklistGroup) => ChecklistGroup) =>
    mapCat(catId, (c) => ({ ...c, groups: c.groups.map((g) => (g.id === groupId ? fn(g) : g)) }));
  const mapItem = (catId: string, groupId: string, itemId: string, fn: (it: ChecklistItem) => ChecklistItem) =>
    mapGroup(catId, groupId, (g) => ({ ...g, items: g.items.map((it) => (it.id === itemId ? fn(it) : it)) }));

  const groupCount = categories.reduce((a, c) => a + c.groups.length, 0);
  const itemCount = countItems(categories);
  const ruleCount = categories.reduce(
    (a, c) => a + c.groups.reduce((b, g) => b + g.items.reduce((d, it) => d + getRules(it).length, 0), 0),
    0
  );
  const currentStep =
    categories.length === 0 ? 1 : groupCount === 0 ? 2 : itemCount === 0 ? 3 : ruleCount === 0 ? 4 : 0;
  const hint =
    currentStep === 1
      ? "Mulai dari kategori besar, misalnya Manusia, Mesin, atau Material."
      : currentStep === 2
      ? "Tambahkan subjek penilaian di dalam kategori, misalnya 1. Pergerakan Operator."
      : currentStep === 3
      ? "Tambahkan nama pos atau item yang diperiksa di dalam subjek."
      : currentStep === 4
      ? "Tambahkan aturan pengecekan di bawah nama pos atau item."
      : "Semua bagian bisa diubah, dihapus, atau diurutkan ulang. Perubahan langsung tersimpan.";

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const steps = [
    { n: 1, label: "Kategori", count: categories.length },
    { n: 2, label: "Subjek penilaian", count: groupCount },
    { n: 3, label: "Nama pos / item", count: itemCount },
    { n: 4, label: "Aturan pengecekan", count: ruleCount },
  ];

  return (
    <div className="tte">
      <ol className="tte-steps">
        {steps.map((s) => (
          <li key={s.n} className={s.n === currentStep ? "is-current" : s.count > 0 ? "is-done" : ""}>
            <span className="tte-steps__num">{s.n}</span>
            <span>{s.label}</span>
            <em>{s.count}</em>
          </li>
        ))}
      </ol>
      <p className="tte-hint">{hint}</p>

      {categories.map((cat, ci) => {
        const isCollapsed = collapsed.has(cat.id);
        const catTotal = cat.groups.reduce((a, g) => a + g.items.length, 0);
        return (
          <section key={cat.id} className="tte-cat">
            <header className="tte-cat__head">
              <button
                type="button"
                className="tte-toggle"
                onClick={() => toggle(cat.id)}
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? `Buka ${cat.name}` : `Tutup ${cat.name}`}
              >
                {isCollapsed ? "▸" : "▾"}
              </button>
              {mode === `editCat:${cat.id}` ? (
                <NameForm
                  initial={cat.name}
                  placeholder="Nama kategori"
                  saveLabel="Simpan"
                  onCancel={() => setMode(null)}
                  onSave={(name) => commit(mapCat(cat.id, (c) => ({ ...c, name })), `Kategori diubah menjadi "${name}".`)}
                />
              ) : (
                <>
                  <h3 className="tte-cat__title">
                    {cat.name}
                    <span className="tte-count">{catTotal} pos / item</span>
                  </h3>
                  <RowActions
                    index={ci}
                    total={categories.length}
                    label={`kategori ${cat.name}`}
                    onMove={(dir) => commit(move(categories, ci, dir), "Urutan kategori diperbarui.")}
                    onEdit={() => setMode(`editCat:${cat.id}`)}
                    onDelete={() => {
                      const msg = catTotal
                        ? `Hapus kategori "${cat.name}" beserta ${catTotal} pos / item di dalamnya?`
                        : `Hapus kategori "${cat.name}"?`;
                      if (window.confirm(`${msg}\nPerubahan langsung tersimpan.`))
                        commit(categories.filter((c) => c.id !== cat.id), `Kategori "${cat.name}" dihapus.`);
                    }}
                  />
                </>
              )}
            </header>

            {!isCollapsed && (
              <div className="tte-cat__body">
                {cat.groups.length === 0 && mode !== `addGrp:${cat.id}` && (
                  <p className="tte-empty">Belum ada subjek penilaian di kategori ini.</p>
                )}

                {cat.groups.map((grp, gi) => (
                  <div key={grp.id} className="tte-grp">
                    <div className="tte-grp__head">
                      {mode === `editGrp:${grp.id}` ? (
                        <NameForm
                          initial={grp.title}
                          placeholder="Nama subjek penilaian"
                          saveLabel="Simpan"
                          onCancel={() => setMode(null)}
                          onSave={(title) =>
                            commit(mapGroup(cat.id, grp.id, (g) => ({ ...g, title })), `Subjek diubah menjadi "${title}".`)
                          }
                        />
                      ) : (
                        <>
                          <h4 className="tte-grp__title">{grp.title || "Tanpa subjek"}</h4>
                          <RowActions
                            index={gi}
                            total={cat.groups.length}
                            label={`subjek ${grp.title || "tanpa nama"}`}
                            onMove={(dir) =>
                              commit(mapCat(cat.id, (c) => ({ ...c, groups: move(c.groups, gi, dir) })), "Urutan subjek diperbarui.")
                            }
                            onEdit={() => setMode(`editGrp:${grp.id}`)}
                            onDelete={() => {
                              const msg = grp.items.length
                                ? `Hapus subjek "${grp.title || "Tanpa subjek"}" beserta ${grp.items.length} pos / item?`
                                : `Hapus subjek "${grp.title || "Tanpa subjek"}"?`;
                              if (window.confirm(`${msg}\nPerubahan langsung tersimpan.`))
                                commit(
                                  mapCat(cat.id, (c) => ({ ...c, groups: c.groups.filter((g) => g.id !== grp.id) })),
                                  "Subjek dihapus."
                                );
                            }}
                          />
                        </>
                      )}
                    </div>

                    {grp.items.length === 0 && mode !== `addItem:${grp.id}` && (
                      <p className="tte-empty">Belum ada nama pos / item di subjek ini.</p>
                    )}

                    <ol className="tte-items">
                      {grp.items.map((item, ii) => {
                        if (mode === `editItem:${item.id}`) {
                          return (
                            <li key={item.id} className="tte-item tte-item--editing">
                              <ItemForm
                                initial={item}
                                saveLabel="Simpan perubahan"
                                onCancel={() => setMode(null)}
                                onSave={(d) =>
                                  commit(
                                    mapItem(cat.id, grp.id, item.id, (it) => ({
                                      ...it,
                                      title: d.title,
                                      answerType: d.answerType,
                                      answerMode: d.answerType === "ok_ng" && d.answerMode === "item" ? "item" : undefined,
                                      ruleInfo: d.ruleInfo.trim() || undefined,
                                    })),
                                    "Pos / item diperbarui."
                                  )
                                }
                              />
                            </li>
                          );
                        }

                        const rules = getRules(item);
                        const saveRules = (next: string[], message: string, nextMode: string | null = null) =>
                          commit(mapItem(cat.id, grp.id, item.id, (it) => withRules(it, next)), message, nextMode);

                        return (
                          <li key={item.id} className="tte-item">
                            <span className="tte-item__num">{item.number}</span>
                            <div className="tte-item__main">
                              <div className="tte-item__row">
                                <div className="tte-item__title">
                                  {item.title}
                                  <span className={`tte-pill ${item.answerType === "text" ? "is-text" : ""}`}>
                                    {item.answerType === "text"
                                      ? "Teks"
                                      : item.answerMode === "item"
                                      ? "OK / NG satu jawaban"
                                      : rules.length > 0
                                      ? `OK / NG per aturan (${rules.length})`
                                      : "OK / NG"}
                                  </span>
                                  {item.answerMode !== "item" && item.answerType !== "text" && rules.length === 0 && (
                                    <span className="tte-note">Belum ada aturan. Tambahkan aturan agar tiap aturan bisa dijawab OK / NG.</span>
                                  )}
                                </div>
                                <RowActions
                                  index={ii}
                                  total={grp.items.length}
                                  label={`pos ${item.number}`}
                                  onMove={(dir) =>
                                    commit(
                                      mapGroup(cat.id, grp.id, (g) => ({ ...g, items: move(g.items, ii, dir) })),
                                      "Urutan pos / item diperbarui."
                                    )
                                  }
                                  onEdit={() => setMode(`editItem:${item.id}`)}
                                  onDelete={() => {
                                    if (window.confirm(`Hapus pos / item "${item.title}" beserta aturannya?\nPerubahan langsung tersimpan.`))
                                      commit(
                                        mapGroup(cat.id, grp.id, (g) => ({ ...g, items: g.items.filter((it) => it.id !== item.id) })),
                                        "Pos / item dihapus."
                                      );
                                  }}
                                />
                              </div>
                              {item.ruleInfo && <div className="tte-note">{item.ruleInfo}</div>}

                              <ol className="tte-rules">
                                {rules.map((line, ri) => (
                                  <li key={ri} className="tte-rule">
                                    {mode === `editRule:${item.id}:${ri}` ? (
                                      <NameForm
                                        initial={line}
                                        placeholder="Aturan pengecekan"
                                        saveLabel="Simpan"
                                        onCancel={() => setMode(null)}
                                        onSave={(text) => saveRules(rules.map((r, i) => (i === ri ? text : r)), "Aturan diperbarui.")}
                                      />
                                    ) : (
                                      <>
                                        <span className="tte-rule__text">{line}</span>
                                        <RowActions
                                          index={ri}
                                          total={rules.length}
                                          label={`aturan ${ri + 1}`}
                                          onMove={(dir) => saveRules(move(rules, ri, dir), "Urutan aturan diperbarui.")}
                                          onEdit={() => setMode(`editRule:${item.id}:${ri}`)}
                                          onDelete={() => {
                                            if (window.confirm(`Hapus aturan ini?\n${line}`))
                                              saveRules(rules.filter((_, i) => i !== ri), "Aturan dihapus.");
                                          }}
                                        />
                                      </>
                                    )}
                                  </li>
                                ))}
                              </ol>

                              {mode === `addRule:${item.id}` ? (
                                <div className="tte-add-panel">
                                  <NameForm
                                    placeholder="Contoh: Ada penandaan pada pos pergerakan operator"
                                    saveLabel="Tambah aturan"
                                    onCancel={() => setMode(null)}
                                    onSave={(text) => saveRules([...rules, text], "Aturan ditambahkan.", `addRule:${item.id}`)}
                                  />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="tte-add tte-add--rule"
                                  disabled={saving}
                                  onClick={() => setMode(`addRule:${item.id}`)}
                                >
                                  + Tambah aturan pengecekan
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>

                    {mode === `addItem:${grp.id}` ? (
                      <div className="tte-add-panel">
                        <ItemForm
                          saveLabel="Tambah pos / item"
                          onCancel={() => setMode(null)}
                          onSave={(d) => {
                            const id = newId("q");
                            commit(
                              mapGroup(cat.id, grp.id, (g) => ({
                                ...g,
                                items: [
                                  ...g.items,
                                  {
                                    id,
                                    number: 0,
                                    title: d.title,
                                    answerType: d.answerType,
                                    answerMode: d.answerType === "ok_ng" && d.answerMode === "item" ? "item" : undefined,
                                    ruleInfo: d.ruleInfo.trim() || undefined,
                                    requireNoteIfNg: d.answerType === "ok_ng",
                                    requirePhotoIfNg: false,
                                  },
                                ],
                              })),
                              "Pos / item baru ditambahkan.",
                              `addRule:${id}`
                            );
                          }}
                        />
                      </div>
                    ) : (
                      <button type="button" className="tte-add" disabled={saving} onClick={() => setMode(`addItem:${grp.id}`)}>
                        + Tambah nama pos / item
                      </button>
                    )}
                  </div>
                ))}

                {mode === `addGrp:${cat.id}` ? (
                  <div className="tte-add-panel">
                    <NameForm
                      placeholder="Contoh: 1. Pergerakan Operator"
                      saveLabel="Tambah subjek"
                      onCancel={() => setMode(null)}
                      onSave={(title) => {
                        const id = newId("grp");
                        commit(
                          mapCat(cat.id, (c) => ({ ...c, groups: [...c.groups, { id, title, items: [] }] })),
                          `Subjek "${title}" ditambahkan.`,
                          `addItem:${id}`
                        );
                      }}
                    />
                  </div>
                ) : (
                  <button type="button" className="tte-add tte-add--grp" disabled={saving} onClick={() => setMode(`addGrp:${cat.id}`)}>
                    + Tambah subjek penilaian
                  </button>
                )}
              </div>
            )}
          </section>
        );
      })}

      {mode === "addCat" ? (
        <div className="tte-add-panel">
          <NameForm
            placeholder="Contoh: Manusia"
            saveLabel="Tambah kategori"
            onCancel={() => setMode(null)}
            onSave={(name) => {
              const id = newId("cat");
              commit([...categories, { id, name, groups: [] }], `Kategori "${name}" ditambahkan.`, `addGrp:${id}`);
            }}
          />
        </div>
      ) : (
        <button type="button" className="tte-add tte-add--cat" disabled={saving} onClick={() => setMode("addCat")}>
          + Tambah kategori
        </button>
      )}
    </div>
  );
}
