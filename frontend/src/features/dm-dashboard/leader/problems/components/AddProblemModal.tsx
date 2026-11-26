"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import { Field } from "@/components/ui/Field";
import { InlineSpinner } from "@/components/ui/LoadingState";
import { meetingApi } from "@/features/dm-dashboard/api";
import { CategoryPathSelect, useCategoryOptions } from "../../../categoryPath";
import { LineSelect, PicSelect } from "../../meeting/components/SummaryForm";
import type { ItemErrors, MeetingMember, SummaryItem, SummaryPic } from "../../meeting/types";
import type { ProblemRow } from "../types";
import {
  initialsOf,
  makeEmptyItem,
  summaryLines,
  summaryPics,
  validateItem,
} from "../../meeting/utils";
import "@/components/ui/ui.css";
import "../../meeting/meeting.css";
import "./add-problem-modal.css";

type Props = {
  open: boolean;
  editingProblem?: ProblemRow | null;
  onClose: () => void;
  onCreated: () => void;
};

function currentLocalDateTime(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return "";
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (match) return `${match[1]}T${match[2]}`;
  const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}T00:00`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function itemFromProblem(row: ProblemRow): SummaryItem {
  const lines = row.lineCodes?.length
    ? row.lineCodes
    : row.line && row.line !== "-"
      ? row.line.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  const pics: SummaryPic[] = row.pics?.length
    ? row.pics.map((pic) =>
        pic.employeeId != null
          ? { id: String(pic.employeeId), name: pic.name, manual: false }
          : { id: `custom:${pic.name}`, name: pic.name, manual: true }
      )
    : row.picName && row.picName !== "-"
      ? row.picName
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({ id: `custom:${name}`, name, manual: true }))
      : [];

  return {
    id: row.id,
    problem: row.problem || "",
    problemCategories: row.problemCategories ?? [],
    categoryCodes: (row.categoryCodes ?? []).filter(Boolean),
    occurredAt: toDateTimeLocalValue(row.occurredAt) || (row.date ? `${row.date}T08:00` : currentLocalDateTime()),
    respondedAt: toDateTimeLocalValue(row.respondedAt),
    lines,
    line: lines[0] ?? "",
    pics,
    picId: pics[0]?.id ?? "",
    picName: pics[0]?.name,
    customPic: pics[0]?.manual ?? false,
    customPics: pics.filter((p) => p.manual).map((p) => p.name),
    due: toDateTimeLocalValue(row.due),
  };
}

export function AddProblemModal({ open, editingProblem = null, onClose, onCreated }: Props) {
  const isEditing = Boolean(editingProblem);
  const { text: uiText } = useUiText();
  const titleId = useId();
  const [item, setItem] = useState<SummaryItem>(() => ({
    ...makeEmptyItem(),
    occurredAt: currentLocalDateTime(),
  }));
  const [errors, setErrors] = useState<ItemErrors>({});
  const [lines, setLines] = useState<string[]>([]);
  const [members, setMembers] = useState<MeetingMember[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    options: categories,
    failed: categoryError,
    reload: loadCategories,
  } = useCategoryOptions();

  // Reset form & fetch line/PIC options whenever modal opens
  useEffect(() => {
    if (!open) return;
    setItem(
      editingProblem
        ? itemFromProblem(editingProblem)
        : {
            ...makeEmptyItem(),
            occurredAt: currentLocalDateTime(),
          }
    );
    setErrors({});
    setSubmitError(null);

    let cancelled = false;
    setLoadingOptions(true);
    setOptionsError(null);
    meetingApi
      .summaryOptions()
      .then((res) => {
        if (cancelled) return;
        setLines(res.lines ?? []);
        setMembers(
          (res.users ?? []).map((user) => ({
            id: String(user.id),
            name: user.name,
            initials: initialsOf(user.name),
            roleLabel: "",
            employeeNo: user.employeeNo,
          }))
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOptionsError(
          err instanceof Error
            ? err.message
            : "Gagal memuat pilihan line dan PIC."
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, editingProblem]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, onClose]);

  if (!open || typeof document === "undefined") return null;

  function patchItem(patch: Partial<SummaryItem>) {
    setItem((prev) => ({ ...prev, ...patch }));
  }

  const availableLines = Array.from(
    new Set([...lines, ...summaryLines(item), ...(item.customLines ?? [])])
  );
  const customPicNames = Array.from(
    new Set([
      ...(item.customPics ?? []),
      ...summaryPics(item)
        .filter((pic) => pic.manual)
        .map((pic) => pic.name),
    ])
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validation = validateItem(item);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const selectedLines = summaryLines(item);
    const customLineCodes = selectedLines.filter((code) => !lines.includes(code));
    const selectedPics = summaryPics(item);
    const primaryPic = selectedPics[0];
    const primaryMember = primaryPic && !primaryPic.manual
      ? members.find((m) => m.id === primaryPic.id)
      : undefined;

    setSubmitting(true);
    setSubmitError(null);
    const payload = {
      problem: item.problem.trim(),
      categoryCodes: (item.categoryCodes ?? []).filter(Boolean),
      occurredAt: item.occurredAt || null,
      respondedAt: item.respondedAt || null,
      lineCodes: selectedLines,
      customLineCodes,
      lineCode: selectedLines[0] ?? null,
      customLine: selectedLines[0] ? !lines.includes(selectedLines[0]) : false,
      pics: selectedPics.map((pic) => {
        const member = !pic.manual
          ? members.find((m) => m.id === pic.id)
          : undefined;
        return {
          name: pic.name || member?.name || "",
          employeeNo: member?.employeeNo ?? null,
          manual: Boolean(pic.manual),
        };
      }),
      picName: primaryPic?.name || primaryMember?.name || "",
      picId:
        primaryPic && !primaryPic.manual && /^\d+$/.test(primaryPic.id)
          ? Number(primaryPic.id)
          : null,
      picEmployeeNo: primaryMember?.employeeNo ?? null,
      dueDate: item.due || null,
    };
    try {
      if (editingProblem) {
        await meetingApi.updateProblem(Number(editingProblem.id), payload);
      } else {
        await meetingApi.createProblem(payload);
      }
      onCreated();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal menyimpan masalah."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="dml-pb-add-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        className="dm-theme dml-pb-add-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="dml-pb-add-dialog__head">
          <div>
            <h2 id={titleId}>
              {isEditing ? uiText("Edit Masalah") : uiText("Tambah Masalah Baru")}
            </h2>
          </div>
          <button
            type="button"
            className="dml-pb-add-dialog__close"
            aria-label={uiText("Tutup")}
            disabled={submitting}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="dml-pb-add-dialog__body">
            {optionsError && (
              <p className="dml-pb-add-dialog__error" role="alert">
                {uiText(optionsError)}
              </p>
            )}
            {submitError && (
              <p className="dml-pb-add-dialog__error" role="alert">
                {uiText(submitError)}
              </p>
            )}

            <Field label={uiText("Masalah / Kendala")} htmlFor="add-pb-desc">
              <textarea
                id="add-pb-desc"
                className="ui-textarea"
                rows={3}
                placeholder={uiText(
                  "Contoh: Suhu solder station #4 berfluktuasi di atas batas SOP"
                )}
                value={item.problem}
                aria-invalid={Boolean(errors.problem)}
                onChange={(e) => patchItem({ problem: e.target.value })}
              />
              {errors.problem && (
                <span className="dml-mt-error">{uiText(errors.problem)}</span>
              )}
            </Field>

            <div
              className="dml-mt-item__group"
              role="group"
              aria-label={uiText("Kategori Masalah")}
            >
              <span className="dml-mt-item__group-title">
                {uiText("Kategori Masalah")}
              </span>
              {categoryError ? (
                <p className="dml-mt-error" role="alert">
                  {uiText("Kategori masalah gagal dimuat.")}{" "}
                  <button
                    type="button"
                    className="dml-mt-item__retry"
                    onClick={loadCategories}
                  >
                    {uiText("Coba lagi")}
                  </button>
                </p>
              ) : null}
              <CategoryPathSelect
                id="add-pb-categories"
                value={item.categoryCodes ?? []}
                options={categories}
                invalid={Boolean(errors.category)}
                className="dml-mt-item__cats"
                selectClassName="ui-select ui-select--block"
                renderField={(label, htmlFor, control) => (
                  <Field label={label} htmlFor={htmlFor}>
                    {control}
                  </Field>
                )}
                onChange={(categoryCodes) => patchItem({ categoryCodes })}
              />
              {errors.category && (
                <span className="dml-mt-error">{uiText(errors.category)}</span>
              )}
            </div>

            <div className="dml-mt-item__row">
              <Field label={uiText("Jam terjadi")} htmlFor="add-pb-occurred">
                <input
                  id="add-pb-occurred"
                  type="datetime-local"
                  className="ui-input ui-input--block"
                  value={item.occurredAt ?? ""}
                  aria-invalid={Boolean(errors.occurredAt)}
                  aria-required="true"
                  onChange={(e) => patchItem({ occurredAt: e.target.value })}
                />
                {errors.occurredAt && (
                  <span className="dml-mt-error">
                    {uiText(errors.occurredAt)}
                  </span>
                )}
              </Field>
              <Field
                label={uiText("Waktu respon (opsional)")}
                htmlFor="add-pb-responded"
              >
                <input
                  id="add-pb-responded"
                  type="datetime-local"
                  className="ui-input ui-input--block"
                  value={item.respondedAt ?? ""}
                  min={item.occurredAt || undefined}
                  aria-invalid={Boolean(errors.respondedAt)}
                  onChange={(e) => patchItem({ respondedAt: e.target.value })}
                />
                {errors.respondedAt && (
                  <span className="dml-mt-error">
                    {uiText(errors.respondedAt)}
                  </span>
                )}
              </Field>
            </div>

            <div className="dml-mt-item__row">
              <Field label={uiText("Line")} htmlFor="add-pb-line">
                <LineSelect
                  id="add-pb-line"
                  lines={availableLines}
                  value={summaryLines(item)}
                  invalid={Boolean(errors.line)}
                  onChange={(selected) =>
                    patchItem({
                      lines: selected,
                      line: selected[0] ?? "",
                      customLines: Array.from(
                        new Set([
                          ...(item.customLines ?? []),
                          ...selected.filter((line) => !lines.includes(line)),
                        ])
                      ),
                    })
                  }
                  onAddCustom={(line) => {
                    const selected = Array.from(
                      new Set([...summaryLines(item), line])
                    );
                    patchItem({
                      lines: selected,
                      line: selected[0] ?? "",
                      customLines: Array.from(
                        new Set([...(item.customLines ?? []), line])
                      ),
                    });
                  }}
                />
                {errors.line && (
                  <span className="dml-mt-error">{uiText(errors.line)}</span>
                )}
              </Field>

              <Field
                label={uiText("PIC (Penanggung Jawab)")}
                htmlFor="add-pb-pic"
              >
                <PicSelect
                  id="add-pb-pic"
                  members={members}
                  customNames={customPicNames}
                  value={summaryPics(item)}
                  invalid={Boolean(errors.picId)}
                  onChange={(pics) =>
                    patchItem({
                      pics,
                      picId: pics[0]?.id ?? "",
                      picName: pics[0]?.name,
                      customPic: pics[0]?.manual ?? false,
                      customPics: Array.from(
                        new Set([
                          ...(item.customPics ?? []),
                          ...pics
                            .filter((pic) => pic.manual)
                            .map((pic) => pic.name),
                        ])
                      ),
                    })
                  }
                />
                {errors.picId && (
                  <span className="dml-mt-error">{uiText(errors.picId)}</span>
                )}
              </Field>

              <Field
                label={uiText("Due Date / Target Waktu")}
                htmlFor="add-pb-due"
              >
                <input
                  id="add-pb-due"
                  type="datetime-local"
                  className="ui-input ui-input--block"
                  value={item.due}
                  aria-invalid={Boolean(errors.due)}
                  onChange={(e) => patchItem({ due: e.target.value })}
                />
                {errors.due && (
                  <span className="dml-mt-error">{uiText(errors.due)}</span>
                )}
              </Field>
            </div>
          </div>

          <footer className="dml-pb-add-dialog__foot">
            <button
              type="button"
              className="dml-pb-add-dialog__cancel"
              disabled={submitting}
              onClick={onClose}
            >
              {uiText("Batal")}
            </button>
            <button
              type="submit"
              className="dml-pb-add-dialog__submit"
              disabled={submitting || loadingOptions}
            >
              {submitting ? (
                <>
                  <InlineSpinner size={15} />
                  <span>{uiText("Menyimpan…")}</span>
                </>
              ) : isEditing ? (
                uiText("Simpan Perubahan")
              ) : (
                uiText("Simpan")
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  );
}
