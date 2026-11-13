"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useUiText } from "@/locales/useUiText";

export type CategoryOption = {
  value: string;
  label: string;
  matchValues?: string[];
};

type Props = {
  value: string;
  options: CategoryOption[];
  createEnabled: boolean;
  onChange: (value: string) => void;
  onCreate: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
};

export function normalizeCategoryMatch(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*([/&])\s*/g, "$1")
    .toLowerCase();
}

export function normalizeCategoryName(value: string) {
  return value.trim().replace(/ {2,}/g, " ");
}

export function isValidNewCategory(value: string) {
  if (/[\u0000-\u001f\u007f-\u009f]/.test(value)) return false;
  const name = normalizeCategoryName(value);
  const length = Array.from(name).length;
  return length >= 2 && length <= 40 && /[\p{L}\p{N}]/u.test(name);
}

function categoryAliases(option: CategoryOption) {
  return [option.value, option.label, ...(option.matchValues ?? [])];
}

export function findCategoryMatch(options: CategoryOption[], value: string) {
  const key = normalizeCategoryMatch(value);
  if (!key) return undefined;
  return options.find((option) =>
    categoryAliases(option).some((alias) => normalizeCategoryMatch(alias) === key)
  );
}

export default function CategoryCombobox({
  value,
  options,
  createEnabled,
  onChange,
  onCreate,
  onValidityChange,
}: Props) {
  const { text: uiText } = useUiText();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const selectedLabel = selected?.label ?? value;
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const queryKey = normalizeCategoryMatch(query);
  const exactMatch = findCategoryMatch(options, query);
  const filteredOptions = customMode
    ? []
    : options.filter(
        (option) =>
          !queryKey ||
          categoryAliases(option).some((alias) =>
            normalizeCategoryMatch(alias).includes(queryKey)
          )
      );
  const canCreate =
    createEnabled &&
    isValidNewCategory(query) &&
    !exactMatch;
  const rows = [
    ...filteredOptions.map((option) => ({ kind: "option" as const, option })),
    ...(canCreate ? [{ kind: "create" as const, option: undefined }] : []),
  ];
  const [activeIndex, setActiveIndex] = useState(0);
  const selectionIsValid = Boolean(
    query.trim() && exactMatch && exactMatch.value === value
  );

  useEffect(() => {
    onValidityChange(selectionIsValid);
  }, [onValidityChange, selectionIsValid]);

  useEffect(() => {
    if (!open && !customMode) {
      setQuery(selectedLabel);
      setActiveIndex(0);
      onValidityChange(true);
    }
  }, [customMode, onValidityChange, open, selectedLabel]);

  useEffect(() => {
    setCustomMode(false);
  }, [value]);

  useEffect(() => {
    setActiveIndex(rows.length ? 0 : -1);
  }, [open, queryKey, rows.length]);

  function chooseOption(option: CategoryOption) {
    if (option.value === "other") {
      setCustomMode(true);
      setQuery("");
      onValidityChange(false);
      setOpen(false);
      inputRef.current?.focus();
      return;
    }
    setCustomMode(false);
    setQuery(option.label);
    onChange(option.value);
    onValidityChange(true);
    setOpen(false);
  }

  function chooseNewCategory() {
    if (!canCreate) return;
    const name = normalizeCategoryName(query);
    setCustomMode(false);
    onCreate(name);
    setQuery(name);
    onValidityChange(true);
    setOpen(false);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((index) => {
        if (!rows.length) return -1;
        const direction = event.key === "ArrowDown" ? 1 : -1;
        return (index + direction + rows.length) % rows.length;
      });
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const active = rows[activeIndex];
      if (active?.kind === "option") chooseOption(active.option);
      else if (active?.kind === "create") chooseNewCategory();
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <Popover.Root
      open={open && !(customMode && !rows.length)}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <Popover.Anchor asChild>
        <div
          className={`dm-5w-category-combobox-control${open ? " is-open" : ""}`}
        >
          <input
            ref={inputRef}
            className="dm-5w-input"
            role="combobox"
            aria-labelledby="dm-5w-category-label"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={
              open && rows[activeIndex]
                ? `${listId}-option-${activeIndex}`
                : undefined
            }
            aria-invalid={!selectionIsValid}
            required
            maxLength={40}
            placeholder={customMode ? uiText("Tulis kategori...") : undefined}
            value={query}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              setOpen(true);
              const match = findCategoryMatch(options, next);
              if (match) {
                setCustomMode(false);
                onChange(match.value);
                setQuery(match.label);
                onValidityChange(true);
              } else {
                onValidityChange(false);
              }
            }}
            onKeyDown={onInputKeyDown}
          />
          <button
            type="button"
            className="dm-5w-category-combobox-chevron"
            aria-label={uiText("Pilih kategori")}
            aria-expanded={open}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (open) setOpen(false);
              else {
                inputRef.current?.focus();
                setOpen(true);
              }
            }}
          >
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      </Popover.Anchor>
      <Popover.Content
        role="presentation"
        className="dm-5w-category-combobox-popover"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div
          id={listId}
          className="dm-5w-category-combobox-list"
          role="listbox"
          aria-label={uiText("Kategori dokumen")}
        >
          {rows.map((row, index) =>
            row.kind === "option" ? (
              <button
                key={`${row.option.value}-${index}`}
                id={`${listId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={row.option.value === value}
                className={`dm-5w-category-combobox-option${
                  index === activeIndex ? " is-active" : ""
                }${row.option.value === value ? " is-selected" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseOption(row.option)}
              >
                <span>{row.option.label}</span>
                {row.option.value === value ? (
                  <Check size={16} aria-hidden="true" />
                ) : null}
              </button>
            ) : (
              <button
                key={`create-${query}`}
                id={`${listId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={false}
                className={`dm-5w-category-combobox-option is-create${
                  index === activeIndex ? " is-active" : ""
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={chooseNewCategory}
              >
                <Plus size={16} aria-hidden="true" />
                <span>
                  {uiText("Tambah kategori {{v0}}", {
                    v0: normalizeCategoryName(query),
                  })}
                </span>
              </button>
            )
          )}
          {!rows.length ? (
            <div className="dm-5w-category-combobox-empty" role="status">
              {uiText("Tidak ada kategori yang cocok.")}
            </div>
          ) : null}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
