"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Download,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { accountApi, fiveWhyDocumentsApi } from "../api";
import type { DmMe, FiveWhyDocument, FiveWhyDocumentLine } from "../api";
import { DateRangePicker } from "../scorecard/ScorecardFilters";
import { jakartaToday } from "../scorecard/useScorecardData";
import CategoryCombobox, {
  findCategoryMatch,
  normalizeCategoryMatch,
  type CategoryOption,
} from "./CategoryCombobox";
import { useUiText } from "@/locales/useUiText";
const CATEGORIES: Record<string, string> = {
  analysis: "Analisis 5Why & PDCA",
  evidence: "Bukti pendukung",
  standard: "SOP / WI",
  other: "Lainnya",
};
const BUILT_IN_CATEGORIES = Object.keys(CATEGORIES);

function getCategoryOptions(
  savedCategories: string[],
  pendingCategories: string[],
  selectedCategory: string,
  text: (value: string) => string
): CategoryOption[] {
  const builtIn = Object.entries(CATEGORIES).map(([value, label]) => ({
    value,
    label: text(label),
    matchValues: [value, label, text(label)],
  }));
  const options = builtIn.filter((option) => option.value !== "other");

  for (const value of [
    ...[...savedCategories].sort((a, b) => a.localeCompare(b)),
    ...pendingCategories,
    selectedCategory,
  ]) {
    const key = normalizeCategoryMatch(value);
    if (!key) continue;
    const duplicate = [...builtIn, ...options].some((option) =>
      [option.value, option.label, ...(option.matchValues ?? [])].some(
        (alias) => normalizeCategoryMatch(alias) === key
      )
    );
    if (!duplicate) options.push({ value, label: value, matchValues: [value] });
  }

  return [...options, builtIn.find((option) => option.value === "other")!];
}

function localDateKey(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type Props = {
  headerActions?: ReactNode;
  hideHeader?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onDraftChange?: (dirty: boolean) => void;
};

export default function DocumentLibrary({
  onBusyChange,
  onDraftChange,
  headerActions,
  hideHeader,
}: Props = {}) {
  const { text: uiText, locale } = useUiText();
  const [user, setUser] = useState<DmMe | null>(null);
  const [documents, setDocuments] = useState<FiveWhyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [pendingCategories, setPendingCategories] = useState<string[]>([]);
  const [categoryCatalogLoaded, setCategoryCatalogLoaded] = useState(false);
  const [categoryLoadError, setCategoryLoadError] = useState("");
  const [categorySelectionValid, setCategorySelectionValid] = useState(true);
  const [lineId, setLineId] = useState(0);
  const [picId, setPicId] = useState(0);
  const [lines, setLines] = useState<FiveWhyDocumentLine[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState<"file" | "simo">("file");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [lineFilter, setLineFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const modal = useRef<HTMLDialogElement>(null);
  const [editingDocument, setEditingDocument] =
    useState<FiveWhyDocument | null>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const working = useRef(false);
  const selectedLine = lines.find((line) => line.id === lineId);
  const selectedPic = selectedLine?.pics.find((pic) => pic.id === picId);
  const canEdit = user?.role === "leader" || user?.role === "member";
  const categoryOptions = getCategoryOptions(
    customCategories,
    pendingCategories,
    category,
    uiText
  );
  const selectedCategory = category;
  const dirty = editingDocument
    ? title.trim() !== editingDocument.title ||
      selectedCategory !== editingDocument.category ||
      lineId !== editingDocument.lineId ||
      picId !== (editingDocument.picId ?? 0) ||
      (editingDocument.source === "simo"
        ? url.trim() !== (editingDocument.url ?? "")
        : Boolean(file))
    : Boolean(title.trim() || url.trim() || file);

  useEffect(() => {
    onDraftChange?.(dirty);
  }, [dirty, onDraftChange]);

  useEffect(() => {
    const dialog = modal.current;
    if (!dialog) return;
    if (modalOpen && !dialog.open) {
      dialog.showModal();
      titleInput.current?.focus();
    } else if (!modalOpen && dialog.open) {
      dialog.close();
      uploadButton.current?.focus();
    }
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!dirty && !busy) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, busy]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    Promise.all([accountApi.me(), fiveWhyDocumentsApi.list()])
      .then(async ([me, items]) => {
        const options =
          me.role === "leader" || me.role === "member"
            ? await fiveWhyDocumentsApi.options()
            : [];
        if (!active) return;
        setUser(me);
        setDocuments(items);
        setLines(options);
        const defaultLine =
          options.find((line) => line.id === me.line?.id) ?? options[0];
        setLineId((current) =>
          options.some((line) => line.id === current)
            ? current
            : defaultLine?.id ?? 0
        );
        setPicId(
          (current) =>
            current ||
            (me.role === "member" ? defaultLine?.pics[0]?.id ?? 0 : 0)
        );
      })
      .catch((reason: unknown) => {
        if (active)
          setLoadError(
            reason instanceof Error ? reason.message : "Dokumen gagal dimuat."
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  useEffect(() => {
    let active = true;
    setCategoryCatalogLoaded(false);
    setCategoryLoadError("");
    setCustomCategories([]);
    fiveWhyDocumentsApi
      .categories()
      .then((categories) => {
        if (
          !Array.isArray(categories) ||
          categories.some((value) => typeof value !== "string")
        ) {
          throw new Error("Respons kategori tidak valid.");
        }
        if (active) {
          setCustomCategories(categories);
          setCategoryCatalogLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          setCategoryLoadError("Kategori gagal dimuat.");
        }
      });
    return () => {
      active = false;
    };
  }, [reload]);

  async function refreshCategoryCatalog() {
    try {
      const categories = await fiveWhyDocumentsApi.categories();
      if (
        !Array.isArray(categories) ||
        categories.some((value) => typeof value !== "string")
      ) {
        throw new Error("Respons kategori tidak valid.");
      }
      setCustomCategories(categories);
      setCategoryCatalogLoaded(true);
      setCategoryLoadError("");
    } catch {
      setCategoryCatalogLoaded(false);
      setCategoryLoadError("Kategori gagal dimuat.");
    }
  }

  function setWorking(value: boolean) {
    working.current = value;
    setBusy(value);
    onBusyChange?.(value);
  }

  function closeModal() {
    if (
      pendingCategories.some(
        (value) =>
          normalizeCategoryMatch(value) === normalizeCategoryMatch(category)
      )
    ) {
      setCategory("");
    }
    setPendingCategories([]);
    setCategorySelectionValid(true);
    setModalOpen(false);
  }

  function createCategory(value: string) {
    setPendingCategories((current) =>
      current.some(
        (categoryValue) =>
          normalizeCategoryMatch(categoryValue) ===
          normalizeCategoryMatch(value)
      )
        ? current
        : [...current, value]
    );
    setCategory(value);
    setCategorySelectionValid(true);
  }

  function startAdd() {
    const defaultLine =
      lines.find((line) => line.id === user?.line?.id) ?? lines[0];
    setEditingDocument(null);
    setError("");
    setNotice("");
    setTitle("");
    setCategory("");
    setPendingCategories([]);
    setCategorySelectionValid(true);
    setSource("file");
    setUrl("");
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    setLineId(defaultLine?.id ?? 0);
    setPicId(user?.role === "member" ? defaultLine?.pics[0]?.id ?? 0 : 0);
    setModalOpen(true);
  }

  function startEdit(document: FiveWhyDocument) {
    const options = getCategoryOptions(
      customCategories,
      pendingCategories,
      document.category,
      uiText
    );
    setEditingDocument(document);
    setError("");
    setNotice("");
    setLineId(document.lineId);
    setPicId(document.picId ?? 0);
    setTitle(document.title);
    setCategory(
      findCategoryMatch(options, document.category)?.value ?? document.category
    );
    setPendingCategories([]);
    setCategorySelectionValid(true);
    setSource(document.source);
    setUrl(document.url ?? "");
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    setModalOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working.current || !canEdit || !lineId || !selectedPic || !title.trim())
      return;
    setError("");
    setNotice("");
    if (!selectedCategory || !categorySelectionValid) {
      setError("Pilih atau tambahkan kategori.");
      return;
    }
    const invalidFile =
      file &&
      (!file.name.toLowerCase().endsWith(".xlsx") ||
        file.size > 20 * 1024 * 1024);
    if (source === "file" && ((!editingDocument && !file) || invalidFile)) {
      setError("Pilih file Excel .xlsx maksimal 20 MB.");
      return;
    }
    setWorking(true);
    try {
      const saved = editingDocument
        ? await fiveWhyDocumentsApi.update(editingDocument.id, {
            lineId,
            picId,
            title: title.trim(),
            category: selectedCategory,
            source,
            url: source === "simo" ? url.trim() : undefined,
            file: file ?? undefined,
          })
        : source === "simo"
        ? await fiveWhyDocumentsApi.addLink({
            lineId,
            picId,
            title: title.trim(),
            category: selectedCategory,
            url: url.trim(),
          })
        : await fiveWhyDocumentsApi.upload(
            lineId,
            picId,
            title.trim(),
            selectedCategory,
            file!
          );
      setDocuments((items) =>
        editingDocument
          ? items.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...items]
      );
      setCustomCategories((items) =>
        items.some(
          (value) =>
            normalizeCategoryMatch(value) ===
            normalizeCategoryMatch(saved.category)
        )
          ? items
          : [...items, saved.category]
      );
      setCategory(saved.category);
      setPendingCategories([]);
      setCategorySelectionValid(true);
      void refreshCategoryCatalog();
      setTitle("");
      setUrl("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setEditingDocument(null);
      setNotice(editingDocument ? "Dokumen diperbarui." : "Dokumen disimpan.");
      setModalOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Dokumen gagal disimpan."
      );
    } finally {
      setWorking(false);
    }
  }

  async function remove(document: FiveWhyDocument) {
    if (
      !canEdit ||
      working.current ||
      !window.confirm(uiText("Hapus dokumen ini?"))
    )
      return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      await fiveWhyDocumentsApi.remove(document.id);
      setDocuments((items) => items.filter((item) => item.id !== document.id));
      void refreshCategoryCatalog();
      setNotice("Dokumen dihapus.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Dokumen gagal dihapus."
      );
    } finally {
      setWorking(false);
    }
  }

  async function download(document: FiveWhyDocument) {
    if (working.current) return;
    setWorking(true);
    setError("");
    try {
      const blob = await fiveWhyDocumentsApi.download(document.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = document.fileName ?? "5Why.xlsx";
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "File gagal diunduh."
      );
    } finally {
      setWorking(false);
    }
  }

  const query = search.trim().toLowerCase();
  const documentLines = Array.from(
    new Map(
      documents.map((document) => [
        document.lineId,
        document.lineCode || String(document.lineId),
      ] as const)
    ),
    ([id, code]) => ({ id, code })
  ).sort((a, b) => a.code.localeCompare(b.code, locale));
  const documentCategories = Array.from(
    new Set(documents.map((document) => document.category))
  ).sort((a, b) => {
    const aBuiltIn = BUILT_IN_CATEGORIES.indexOf(a);
    const bBuiltIn = BUILT_IN_CATEGORIES.indexOf(b);
    if (aBuiltIn !== -1 || bBuiltIn !== -1) {
      if (aBuiltIn === -1) return 1;
      if (bBuiltIn === -1) return -1;
      return aBuiltIn - bBuiltIn;
    }
    return a.localeCompare(b, locale);
  });
  const visible = documents.filter(
    (document) =>
      (filter === "all" || document.category === filter) &&
      (lineFilter === "all" || document.lineId === Number(lineFilter)) &&
      (!dateFrom || localDateKey(document.createdAt) >= dateFrom) &&
      (!dateTo || localDateKey(document.createdAt) <= dateTo) &&
      `${document.title} ${document.senderName ?? ""} ${document.lineCode} ${
        document.picName ?? ""
      } ${document.fileName ?? ""}`
        .toLowerCase()
        .includes(query)
  );

  return (
    <div className="dm-5w-page dm-5w-document-page">
      {hideHeader ? null : (
        <header className="dm-5w-page-head">
          <div className="dm-5w-page-head-main">
            <div>
              <h1 className="dm-5w-page-title">
                {uiText("Dokumen 5Why & PDCA")}
              </h1>
              <p className="dm-5w-page-sub">
                {uiText(
                  "Tempat sementara untuk menyimpan Excel. Terpisah dari form analisis 5Why."
                )}
              </p>
            </div>
            {headerActions}
          </div>
        </header>
      )}
      {loadError ? (
        <div className="dm-5w-document-error" role="alert">
          {uiText(loadError)}{" "}
          <button
            type="button"
            className="dm-5w-btn dm-5w-btn-secondary"
            disabled={loading || busy}
            onClick={() => setReload((value) => value + 1)}
          >
            {uiText("Coba lagi")}
          </button>
        </div>
      ) : null}
      {error && !modalOpen ? (
        <div className="dm-5w-document-error" role="alert">
          {uiText(error)}
        </div>
      ) : null}
      {notice || busy ? (
        <p role="status">{uiText(busy ? "Memproses..." : notice)}</p>
      ) : null}
      {loading ? (
        <p role="status">{uiText("Memuat dokumen...")}</p>
      ) : !loadError ? (
        <>
          {canEdit ? (
            <dialog
              ref={modal}
              className="dm-5w-root dm-5w-upload-modal"
              aria-labelledby="dm-5w-upload-title"
              aria-describedby="dm-5w-upload-description"
              onCancel={(event) => {
                event.preventDefault();
                if (!working.current) closeModal();
              }}
            >
              <div className="dm-5w-upload-modal-head">
                <h2 className="dm-5w-card-title" id="dm-5w-upload-title">
                  {uiText(editingDocument ? "Edit dokumen" : "Tambah dokumen")}
                </h2>
                <button
                  type="button"
                  className="dm-5w-btn dm-5w-btn-secondary"
                  disabled={busy}
                  onClick={closeModal}
                  aria-label={uiText("Tutup")}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              {error ? (
                <div className="dm-5w-document-error" role="alert">
                  {uiText(error)}
                </div>
              ) : null}
              <form
                className="dm-5w-document-form"
                onSubmit={(event) => void submit(event)}
              >
                <fieldset disabled={busy || !lines.length}>
                  <legend className="dm-5w-sr-only">
                    {uiText(
                      editingDocument ? "Edit dokumen" : "Tambah dokumen"
                    )}
                  </legend>
                  <div className="dm-5w-document-fields dm-5w-upload-fields">
                    <label className="dm-5w-field">
                      <span className="dm-5w-label">
                        {uiText("Judul dokumen")}
                      </span>
                      <input
                        ref={titleInput}
                        required
                        className="dm-5w-input"
                        maxLength={200}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                      />
                    </label>
                    <div className="dm-5w-category-field">
                      <span className="dm-5w-label" id="dm-5w-category-label">
                        {uiText("Kategori dokumen")}
                      </span>
                      <CategoryCombobox
                        value={category}
                        options={categoryOptions}
                        createEnabled={categoryCatalogLoaded}
                        onChange={setCategory}
                        onCreate={createCategory}
                        onValidityChange={setCategorySelectionValid}
                      />
                      {categoryLoadError ? (
                        <p className="dm-5w-category-error" role="alert">
                          {uiText("Kategori gagal dimuat.")}
                        </p>
                      ) : null}
                    </div>
                    <label className="dm-5w-field">
                      <span className="dm-5w-label">{uiText("Line")}</span>
                      <select
                        required
                        className="dm-5w-select"
                        value={lineId || ""}
                        onChange={(event) => {
                          const id = Number(event.target.value);
                          setLineId(id);
                          setPicId(
                            user?.role === "member"
                              ? lines.find((line) => line.id === id)?.pics[0]
                                  ?.id ?? 0
                              : 0
                          );
                        }}
                      >
                        <option value="">{uiText("Pilih line")}</option>
                        {lines.map((line) => (
                          <option key={line.id} value={line.id}>
                            {line.code}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="dm-5w-field">
                      <span className="dm-5w-label">{uiText("PIC")}</span>
                      <select
                        required
                        className="dm-5w-select"
                        value={picId || ""}
                        onChange={(event) =>
                          setPicId(Number(event.target.value))
                        }
                      >
                        <option value="">{uiText("Pilih PIC")}</option>
                        {selectedLine?.pics.map((pic) => (
                          <option key={pic.id} value={pic.id}>
                            {pic.name} ({pic.employeeNo})
                          </option>
                        ))}
                      </select>
                    </label>
                    <div
                      className="dm-5w-field dm-5w-field-full dm-5w-source-field"
                      role="radiogroup"
                      aria-labelledby="dm-5w-source-label"
                    >
                      <span className="dm-5w-label" id="dm-5w-source-label">
                        {uiText("Sumber dokumen")}
                      </span>
                      <div className="dm-5w-source-options">
                        <label className="dm-5w-source-option">
                          <input
                            type="radio"
                            name="document-source"
                            value="file"
                            required
                            checked={source === "file"}
                            disabled={Boolean(editingDocument)}
                            onChange={() => setSource("file")}
                          />
                          <span>{uiText("Upload Excel")}</span>
                        </label>
                        {/* <label className="dm-5w-source-option">
                          <input
                            type="radio"
                            name="document-source"
                            value="simo"
                            required
                            checked={source === "simo"}
                            disabled={Boolean(editingDocument)}
                            onChange={() => setSource("simo")}
                          />
                          <span>{uiText("Link SIMO")}</span>
                        </label> */}
                      </div>
                    </div>
                    {source === "file" ? (
                      <div className="dm-5w-field dm-5w-field-full">
                        <label
                          className="dm-5w-label"
                          htmlFor="dm-5w-file-input"
                        >
                          {uiText("File Excel (.xlsx, maksimal 20 MB)")}
                        </label>
                        <span className="dm-5w-file-picker">
                          <span className="dm-5w-file-picker-icon">
                            <Upload size={20} aria-hidden="true" />
                          </span>
                          <span className="dm-5w-file-picker-copy">
                            <strong>
                              {file?.name ??
                                editingDocument?.fileName ??
                                uiText("Belum ada file dipilih")}
                            </strong>
                          </span>
                          <span className="dm-5w-file-picker-action">
                            {uiText("Pilih file Excel")}
                          </span>
                          {file ? (
                            <button
                              type="button"
                              className="dm-5w-file-clear"
                              onClick={() => {
                                setFile(null);
                                if (fileInput.current)
                                  fileInput.current.value = "";
                              }}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                              <span>{uiText("Hapus file")}</span>
                            </button>
                          ) : null}
                          <input
                            id="dm-5w-file-input"
                            ref={fileInput}
                            className="dm-5w-file-input"
                            type="file"
                            required={!editingDocument}
                            accept=".xlsx"
                            onChange={(event) => {
                              const selected = event.target.files?.[0] ?? null;
                              setFile(selected);
                              if (selected && !title.trim())
                                setTitle(
                                  selected.name
                                    .replace(/\.xlsx$/i, "")
                                    .slice(0, 200)
                                );
                            }}
                          />
                        </span>
                      </div>
                    ) : (
                      <label className="dm-5w-field dm-5w-field-full">
                        <span className="dm-5w-label">
                          {uiText("URL SIMO")}
                        </span>
                        <input
                          className="dm-5w-input"
                          type="url"
                          required
                          maxLength={2000}
                          placeholder="https://mtp.myoas.com/..."
                          value={url}
                          onChange={(event) => setUrl(event.target.value)}
                        />
                      </label>
                    )}
                  </div>
                  {selectedPic ? (
                    <p>
                      {uiText("Leader")}:{" "}
                      {selectedLine?.leaders.join(", ") ||
                        uiText("Belum diatur")}{" "}
                      · {uiText("Supervisor")}:{" "}
                      {selectedPic.supervisorName || uiText("Belum diatur")}
                    </p>
                  ) : null}
                  <p id="dm-5w-upload-description">
                    {uiText(
                      "Dokumen disimpan sendiri, tanpa membuat atau mengisi analisis 5Why di web."
                    )}
                  </p>
                  <div className="dm-5w-upload-modal-footer">
                    <button
                      type="button"
                      className="dm-5w-btn dm-5w-btn-secondary"
                      onClick={closeModal}
                    >
                      {uiText("Batal")}
                    </button>
                    <button
                      type="submit"
                      className="dm-5w-btn dm-5w-btn-primary"
                      disabled={!lineId || !selectedPic || !title.trim()}
                    >
                      {uiText(
                        busy
                          ? "Memproses..."
                          : editingDocument
                          ? "Simpan perubahan"
                          : "Simpan dokumen"
                      )}
                    </button>
                  </div>
                </fieldset>
                {!lines.length ? (
                  <p role="alert">
                    {uiText(
                      "Belum ada penugasan line aktif. Hubungi admin sebelum menambahkan dokumen."
                    )}
                  </p>
                ) : null}
              </form>
            </dialog>
          ) : null}
          <section
            className="dm-5w-card dm-5w-documents"
            aria-labelledby="dm-5w-library-title"
          >
            <div className="dm-5w-document-library-head">
              <h2 className="dm-5w-card-title" id="dm-5w-library-title">
                {uiText("Daftar dokumen")}
              </h2>
              {canEdit ? (
                <button
                  ref={uploadButton}
                  type="button"
                  className="dm-5w-btn dm-5w-btn-primary"
                  disabled={busy}
                  aria-haspopup="dialog"
                  onClick={startAdd}
                >
                  <Plus size={16} aria-hidden="true" />
                  {uiText("Tambah dokumen")}
                </button>
              ) : null}
            </div>
            <div className="dm-5w-document-fields dm-5w-library-filters">
              <label className="dm-5w-field">
                <span className="dm-5w-label">{uiText("Cari dokumen")}</span>
                <input
                  className="dm-5w-input"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="dm-5w-field">
                <span className="dm-5w-label">
                  {uiText("Kategori dokumen")}
                </span>
                <select
                  className="dm-5w-select"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="all">{uiText("Semua")}</option>
                  {documentCategories.map((value) => (
                    <option key={value} value={value}>
                      {uiText(CATEGORIES[value] ?? value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dm-5w-field">
                <span className="dm-5w-label">{uiText("Line")}</span>
                <select
                  className="dm-5w-select"
                  value={lineFilter}
                  onChange={(event) => setLineFilter(event.target.value)}
                >
                  <option value="all">{uiText("Semua")}</option>
                  {documentLines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.code}
                    </option>
                  ))}
                </select>
              </label>
              <div className="dm-5w-field">
                <span className="dm-5w-label">{uiText("Rentang tanggal")}</span>
                <DateRangePicker
                  value={{ from: dateFrom, to: dateTo }}
                  onChange={(range) => {
                    setDateFrom(range.from);
                    setDateTo(range.to);
                  }}
                  maxDate={jakartaToday()}
                  emptyLabel="Semua tanggal"
                  clearable
                  className="dml-dashboard-date-picker dm-5w-document-date-range"
                  panelClassName="dml-dashboard-date-panel"
                />
              </div>
            </div>
            {!visible.length ? (
              <p>
                {uiText(
                  documents.length
                    ? "Tidak ada dokumen yang cocok."
                    : "Belum ada dokumen pendukung."
                )}
              </p>
            ) : (
              <div className="ut-wrap dm-5w-document-table-wrap">
                <table className="ut-table dm-5w-document-table">
                  <caption className="dm-5w-sr-only">
                    {uiText("Daftar dokumen")}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{uiText("Judul dokumen")}</th>
                      <th scope="col">{uiText("Pengirim")}</th>
                      <th scope="col">{uiText("PIC")}</th>
                      <th scope="col">{uiText("Line")}</th>
                      <th scope="col">{uiText("Tanggal kirim")}</th>
                      <th scope="col">{uiText("Aksi")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((document) => (
                      <tr key={document.id}>
                        <td>
                          <strong>{document.title}</strong>
                        </td>
                        <td>
                          {document.senderName ?? uiText("Tidak diketahui")}
                        </td>
                        <td>
                          {document.picName ?? uiText("Belum ditentukan")}
                        </td>
                        <td>{document.lineCode || "—"}</td>
                        <td>
                          <time dateTime={document.createdAt}>
                            {new Date(document.createdAt).toLocaleDateString(
                              locale
                            )}
                          </time>
                        </td>
                        {/* <td><span className={`dm-5w-document-type is-${document.source}`}>{uiText(document.source === "simo" ? "Link SIMO" : "Excel")}</span></td> */}
                        <td>
                          <div className="dm-5w-document-actions">
                            {document.source === "simo" ? (
                              document.url ? (
                                <a
                                  className="dm-5w-btn dm-5w-btn-secondary dm-5w-document-primary-action"
                                  href={document.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink size={14} aria-hidden="true" />
                                  {uiText("Buka di SIMO")}
                                </a>
                              ) : (
                                <span>—</span>
                              )
                            ) : (
                              <button
                                type="button"
                                className="dm-5w-btn dm-5w-btn-secondary dm-5w-document-primary-action"
                                disabled={busy}
                                onClick={() => void download(document)}
                              >
                                <Download size={14} aria-hidden="true" />
                                {uiText("Unduh Excel")}
                              </button>
                            )}
                            {canEdit ? (
                              <details className="dm-5w-menu dm-5w-document-menu">
                                <summary
                                  className="dm-5w-menu-trigger"
                                  aria-label={`${uiText("Aksi dokumen")}: ${
                                    document.title
                                  }`}
                                  aria-haspopup="menu"
                                  title={uiText("Aksi dokumen")}
                                >
                                  <MoreHorizontal
                                    size={18}
                                    aria-hidden="true"
                                  />
                                </summary>
                                <div
                                  className="dm-5w-menu-panel"
                                  role="menu"
                                  aria-label={`${uiText("Aksi dokumen")}: ${
                                    document.title
                                  }`}
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="dm-5w-menu-item"
                                    disabled={busy}
                                    onClick={(event) => {
                                      event.currentTarget
                                        .closest("details")
                                        ?.removeAttribute("open");
                                      startEdit(document);
                                    }}
                                  >
                                    <Pencil size={15} aria-hidden="true" />
                                    {uiText("Edit")}
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="dm-5w-menu-item is-danger"
                                    disabled={busy}
                                    onClick={(event) => {
                                      event.currentTarget
                                        .closest("details")
                                        ?.removeAttribute("open");
                                      void remove(document);
                                    }}
                                  >
                                    <Trash2 size={15} aria-hidden="true" />
                                    {uiText("Hapus")}
                                  </button>
                                </div>
                              </details>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}{" "}
    </div>
  );
}
