import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import type { ItemErrors, MeetingMember, SummaryItem } from "../types";
import { IconPlus, IconTrash } from "./MeetingIcons";
import { useEffect, useRef, useState } from "react";

const PROBLEM_CATEGORIES = [
  { value: "quality", label: "Kualitas" },
  { value: "delivery", label: "Pengiriman" },
  { value: "cost", label: "Biaya" },
  { value: "safety", label: "Keselamatan" },
  { value: "environment", label: "Lingkungan" },
  { value: "other", label: "Lainnya" },
];

function CategorySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", handleOutsideClick);
  }, [open]);

  const selectedLabels = value.map(
    (selected) =>
      PROBLEM_CATEGORIES.find((category) => category.value === selected)
        ?.label ?? selected
  );

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", minWidth: 0 }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className="ui-select ui-select--block"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        onClick={() => setOpen((previous) => !previous)}
        style={{
          textAlign: "left",
          cursor: "pointer",
          whiteSpace: "normal",
          height: "auto",
          minHeight: 40,
        }}
      >
        {selectedLabels.length
          ? selectedLabels.join(", ")
          : "Pilih kategori masalah"}
      </button>

      {open && (
        <div
          id={`${id}-options`}
          role="group"
          aria-label="Kategori masalah"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 20,
            maxHeight: 240,
            overflowY: "auto",
            padding: 8,
            border: "1px solid var(--dm-border, #cbd5e1)",
            borderRadius: 8,
            background: "var(--dm-card, Canvas)",
            color: "var(--dm-text, CanvasText)",
            boxShadow: "0 4px 12px rgb(0 0 0 / 12%)",
          }}
        >
          {PROBLEM_CATEGORIES.map((category) => (
            <label
              key={category.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 44,
                padding: "8px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={value.includes(category.value)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...value, category.value]
                      : value.filter((entry) => entry !== category.value)
                  )
                }
              />
              <span>{category.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  items: SummaryItem[];
  members: MeetingMember[];
  lines: string[];
  /** errors by item id; only shown once showErrors is true (after the Leader tries to end the meeting) */
  errors: Record<string, ItemErrors>;
  showErrors: boolean;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<SummaryItem>) => void;
  onRemove: (id: string) => void;
}

/** Replaces "Tracking Abnormal" while the meeting runs: line, problem, PIC and due date for each follow-up (BR-09). */
export function SummaryForm({
  items,
  members,
  lines,
  errors,
  showErrors,
  onAdd,
  onChange,
  onRemove,
}: Props) {
  return (
    <Card
      title="Input Summary & Action Item"
      subtitle="Catat poin kendala, penanggung jawab (PIC), dan batas waktu tindak lanjut dari sesi meeting ini. Hanya diisi oleh Leader."
    >
      <div className="dml-mt-items">
        {items.map((item, index) => {
          const err = showErrors ? errors[item.id] ?? {} : {};
          return (
            <fieldset key={item.id} className="dml-mt-item">
              <legend className="dml-mt-item__legend">
                Poin Masalah #{index + 1}
              </legend>
              {items.length > 1 && (
                <button
                  type="button"
                  className="dml-mt-item__remove"
                  aria-label={`Hapus poin masalah ${index + 1}`}
                  onClick={() => onRemove(item.id)}
                >
                  <IconTrash size={16} />
                </button>
              )}

              {/* <div className="dml-mt-item__top"> */}

              <Field label="Masalah / Kendala" htmlFor={`p-${item.id}`}>
                <textarea
                  id={`p-${item.id}`}
                  className="ui-textarea"
                  rows={2}
                  placeholder="Contoh: Suhu solder station #4 berfluktuasi di atas batas SOP"
                  value={item.problem}
                  aria-invalid={Boolean(err.problem)}
                  onChange={(e) =>
                    onChange(item.id, { problem: e.target.value })
                  }
                />
                {err.problem && (
                  <span className="dml-mt-error">{err.problem}</span>
                )}
              </Field>
              {/* </div> */}

              <div className="dml-mt-item__row">
                <Field
                  label="Kategori Masalah (opsional)"
                  htmlFor={`categories-${item.id}`}
                >
                  <CategorySelect
                    id={`categories-${item.id}`}
                    value={item.problemCategories ?? []}
                    onChange={(problemCategories) =>
                      onChange(item.id, { problemCategories })
                    }
                  />
                </Field>

                <Field label="Line" htmlFor={`l-${item.id}`}>
                  <select
                    id={`l-${item.id}`}
                    className="ui-select ui-select--block"
                    value={item.line ?? ""}
                    aria-invalid={Boolean(err.line)}
                    onChange={(e) =>
                      onChange(item.id, { line: e.target.value })
                    }
                  >
                    <option value="">Pilih line</option>
                    {lines.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  {err.line && <span className="dml-mt-error">{err.line}</span>}
                </Field>
                <Field label="PIC (Penanggung Jawab)" htmlFor={`c-${item.id}`}>
                  <select
                    id={`c-${item.id}`}
                    className="ui-select ui-select--block"
                    value={item.picId}
                    aria-invalid={Boolean(err.picId)}
                    onChange={(e) =>
                      onChange(item.id, { picId: e.target.value })
                    }
                  >
                    <option value="">Pilih PIC</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.employeeNo ?? m.roleLabel})
                      </option>
                    ))}
                  </select>
                  {err.picId && (
                    <span className="dml-mt-error">{err.picId}</span>
                  )}
                </Field>

                <Field label="Due Date / Target Waktu" htmlFor={`d-${item.id}`}>
                  <input
                    id={`d-${item.id}`}
                    type="datetime-local"
                    className="ui-input ui-input--block"
                    value={item.due}
                    aria-invalid={Boolean(err.due)}
                    onChange={(e) => onChange(item.id, { due: e.target.value })}
                  />
                  {err.due && <span className="dml-mt-error">{err.due}</span>}
                </Field>
              </div>
            </fieldset>
          );
        })}
      </div>

      <button type="button" className="dml-mt-add" onClick={onAdd}>
        <IconPlus size={16} /> Tambah Poin Masalah Lain
      </button>
    </Card>
  );
}
