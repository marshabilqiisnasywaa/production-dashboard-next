"use client";
import { useUiText } from "@/locales/useUiText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import type { ItemErrors, MeetingMember, SummaryItem, SummaryPic } from "../types";
import { IconPlus, IconTrash } from "./MeetingIcons";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { summaryLines, summaryPics } from "../utils";

const PROBLEM_CATEGORIES = [
  { value: "P-Planning Losses", label: "P-Planning Losses" },
  { value: "H-Human Losses (MP)", label: "H-Human Losses (MP)" },
  { value: "T-Time Losses (Overtime)", label: "T-Time Losses (Overtime)" },
  { value: "R-ResuIt Losses (Output)", label: "R-ResuIt Losses (Output)" },
  { value: "Q-Quality Losses", label: "Q-Quality Losses" },
  { value: "M--Machine Losses", label: "M--Machine Losses" },
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
  const { text: uiText } = useUiText();
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
          : uiText("Pilih kategori masalah")}
      </button>

      {open && (
        <div
          id={`${id}-options`}
          role="group"
          aria-label={uiText("Kategori masalah")}
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
              <span>{uiText(category.label)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function LineSelect({ id, lines, value, invalid, onChange, onAddCustom }: {
  id: string;
  lines: string[];
  value: string[];
  invalid: boolean;
  onChange: (value: string[]) => void;
  onAddCustom: (line: string) => void;
}) {
  const { text: uiText } = useUiText();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const allRef = useRef<HTMLInputElement>(null);
  const options = Array.from(new Set(lines)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const selectedCount = options.filter((line) => value.includes(line)).length;
  const allSelected = options.length > 0 && selectedCount === options.length;
  const filtered = options.filter((line) => line.toLowerCase().includes(query.trim().toLowerCase()));
  const customLabel = query.trim();
  const canAddCustom = customLabel.length > 0 && customLabel.length <= 32 && !options.some((line) => line.toLowerCase() === customLabel.toLowerCase());

  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = selectedCount > 0 && !allSelected;
  }, [open, selectedCount, allSelected]);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  return (
    <div ref={rootRef} className="dml-mt-line-select" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); buttonRef.current?.focus(); }
    }}>
      <button ref={buttonRef} id={id} type="button" className="ui-select ui-select--block dml-mt-line-select__trigger" aria-expanded={open} aria-controls={`${id}-options`} aria-invalid={invalid} onClick={() => { setOpen(!open); setQuery(""); }}>
        <span>{allSelected ? uiText("Semua line ({{v0}})", { v0: options.length }) : value.length > 2 ? uiText("{{v0}} line dipilih", { v0: value.length }) : value.length ? value.join(", ") : uiText("Pilih line")}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && <div id={`${id}-options`} className="dml-mt-line-select__menu" role="group" aria-label={uiText("Line")}>
        <div className="dml-mt-line-select__search">
          <Search size={14} aria-hidden="true" />
          <input type="search" aria-label={uiText("Cari atau tambah line")} placeholder={uiText("Cari atau tambah line")} maxLength={32} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); if (canAddCustom) { onAddCustom(customLabel); setQuery(""); } }
          }} />
        </div>
        <label className="dml-mt-line-select__all">
          <input ref={allRef} type="checkbox" checked={allSelected} disabled={options.length === 0} onChange={(event) => onChange(event.target.checked ? options : [])} />
          <strong>{uiText("Semua line")}</strong><span>{options.length}</span>
        </label>
        <div className="dml-mt-line-select__options">
          {filtered.map((line) => <label key={line}>
            <input type="checkbox" checked={value.includes(line)} onChange={(event) => onChange(event.target.checked ? [...value, line] : value.filter((selected) => selected !== line))} />
            <span>{line}</span>
          </label>)}
          {filtered.length === 0 && <p>{uiText("Line tidak ditemukan.")}</p>}
        </div>
        {canAddCustom && <button type="button" className="dml-mt-line-select__add" onClick={() => { onAddCustom(customLabel); setQuery(""); }}>
          <IconPlus size={14} /><span>{uiText("Tambah “{{v0}}”", { v0: customLabel })}</span>
        </button>}
        <div className="dml-mt-line-select__footer"><span>{uiText("{{v0}} line dipilih", { v0: selectedCount })}</span><button type="button" onClick={() => { setOpen(false); buttonRef.current?.focus(); }}>{uiText("Selesai")}</button></div>
      </div>}
    </div>
  );
}

function PicSelect({ id, members, customNames, value, invalid, onChange }: {
  id: string;
  members: MeetingMember[];
  customNames: string[];
  value: SummaryPic[];
  invalid: boolean;
  onChange: (pics: SummaryPic[]) => void;
}) {
  const { text: uiText } = useUiText();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const label = value.length > 2 ? uiText("{{v0}} PIC dipilih", { v0: value.length }) : value.map((pic) => pic.name || members.find((member) => member.id === pic.id)?.name || pic.id).join(", ");
  const search = query.trim().toLowerCase();
  const filtered = members.filter((member) => `${member.name} ${member.employeeNo ?? ""}`.toLowerCase().includes(search));
  const manualNames = Array.from(new Set(customNames)).sort((a, b) => a.localeCompare(b));
  const filteredManual = manualNames.filter((entry) => entry.toLowerCase().includes(search));
  const canAdd = Boolean(search) && !members.some((member) => member.name.trim().toLowerCase() === search) && !manualNames.some((entry) => entry.toLowerCase() === search);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function pick(picId: string, picName: string, custom: boolean) {
    onChange(value.some((pic) => pic.id === picId) ? value.filter((pic) => pic.id !== picId) : [...value, { id: picId, name: picName, manual: custom }]);
    if (custom) setQuery("");
  }

  return (
    <div ref={rootRef} className="dml-mt-line-select" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); buttonRef.current?.focus(); }
    }}>
      <button ref={buttonRef} id={id} type="button" className="ui-select ui-select--block dml-mt-line-select__trigger" aria-expanded={open} aria-controls={`${id}-options`} aria-invalid={invalid} onClick={() => { setOpen(!open); setQuery(""); }}>
        <span>{label || uiText("Pilih PIC")}</span><ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && <div id={`${id}-options`} className="dml-mt-line-select__menu" role="group" aria-label={uiText("PIC (Penanggung Jawab)")}>
        <div className="dml-mt-line-select__search">
          <Search size={14} aria-hidden="true" />
          <input type="search" aria-label={uiText("Cari atau tambah PIC")} placeholder={uiText("Cari atau tambah PIC")} maxLength={120} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); if (canAdd) pick(`custom:${query.trim()}`, query.trim(), true); }
          }} />
        </div>
        <div className="dml-mt-line-select__options">
          {filtered.map((member) => <label key={member.id} className="dml-mt-pic-option">
            <input type="checkbox" checked={value.some((pic) => pic.id === member.id)} onChange={() => pick(member.id, member.name, false)} />
            <span>{member.name}</span><small>{member.employeeNo ?? member.roleLabel}</small>
          </label>)}
          {filteredManual.map((entry) => <label key={`custom:${entry}`} className="dml-mt-pic-option">
            <input type="checkbox" checked={value.some((pic) => pic.id === `custom:${entry}`)} onChange={() => pick(`custom:${entry}`, entry, true)} />
            <span>{entry}</span><small>{uiText("PIC manual")}</small>
          </label>)}
          {filtered.length === 0 && filteredManual.length === 0 && <p>{uiText("PIC tidak ditemukan.")}</p>}
        </div>
        {canAdd && <button type="button" className="dml-mt-line-select__add" onClick={() => pick(`custom:${query.trim()}`, query.trim(), true)}><IconPlus size={14} /><span>{uiText("Tambah “{{v0}}”", { v0: query.trim() })}</span></button>}
        <div className="dml-mt-line-select__footer"><span>{uiText("{{v0}} PIC dipilih", { v0: value.length })}</span><button type="button" onClick={() => { setOpen(false); buttonRef.current?.focus(); }}>{uiText("Selesai")}</button></div>
      </div>}
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
  const { text: uiText } = useUiText();
  const availableLines = Array.from(new Set([...lines, ...items.flatMap((item) => item.customLines ?? [])]));
  const customPicNames = items.flatMap((item) => item.customPics ?? []);
  return (
    <Card
      className="dml-mt-summary"
      title={uiText("Input Summary & Action Item")}
      subtitle={uiText("Catat poin kendala, penanggung jawab (PIC), dan batas waktu tindak lanjut dari sesi meeting ini. Hanya diisi oleh Leader.")}
    >
      <div className="dml-mt-items">
        {items.map((item, index) => {
          const err = showErrors ? errors[item.id] ?? {} : {};
          return (
            <fieldset key={item.id} className="dml-mt-item">
              <legend className="dml-mt-item__legend">{uiText("Poin Masalah #")}{index + 1}
              </legend>
              {items.length > 1 && (
                <button
                  type="button"
                  className="dml-mt-item__remove"
                  aria-label={uiText("Hapus poin masalah {{v0}}", { v0: index + 1 })}
                  onClick={() => onRemove(item.id)}
                >
                  <IconTrash size={16} />
                </button>
              )}

              {/* <div className="dml-mt-item__top"> */}

              <Field label={uiText("Masalah / Kendala")} htmlFor={`p-${item.id}`}>
                <textarea
                  id={`p-${item.id}`}
                  className="ui-textarea"
                  rows={2}
                  placeholder={uiText("Contoh: Suhu solder station #4 berfluktuasi di atas batas SOP")}
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
                  label={uiText("Kategori Masalah")}
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

                <Field label={uiText("Line")} htmlFor={`l-${item.id}`}>
                  <LineSelect
                    id={`l-${item.id}`}
                    lines={availableLines}
                    value={summaryLines(item)}
                    invalid={Boolean(err.line)}
                    onChange={(selected) => onChange(item.id, {
                      lines: selected,
                      line: selected[0] ?? "",
                      customLines: Array.from(new Set([...(item.customLines ?? []), ...selected.filter((line) => !lines.includes(line))])),
                    })}
                    onAddCustom={(line) => {
                      const selected = Array.from(new Set([...summaryLines(item), line]));
                      onChange(item.id, { lines: selected, line: selected[0] ?? "", customLines: Array.from(new Set([...(item.customLines ?? []), line])) });
                    }}
                  />
                  {err.line && <span className="dml-mt-error">{err.line}</span>}
                </Field>
                <Field label={uiText("PIC (Penanggung Jawab)")} htmlFor={`c-${item.id}`}>
                  <PicSelect
                    id={`c-${item.id}`}
                    members={members}
                    customNames={customPicNames}
                    value={summaryPics(item)}
                    invalid={Boolean(err.picId)}
                    onChange={(pics) => onChange(item.id, {
                      pics,
                      picId: pics[0]?.id ?? "",
                      picName: pics[0]?.name,
                      customPic: pics[0]?.manual ?? false,
                      customPics: Array.from(new Set([...(item.customPics ?? []), ...pics.filter((pic) => pic.manual).map((pic) => pic.name)])),
                    })}
                  />
                  {err.picId && (
                    <span className="dml-mt-error">{err.picId}</span>
                  )}
                </Field>

                <Field label={uiText("Due Date / Target Waktu")} htmlFor={`d-${item.id}`}>
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
        <IconPlus size={16} />{uiText(" Tambah Poin Masalah Lain")}</button>
    </Card>
  );
}
