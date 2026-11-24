"use client";
import { useEffect, useId, useRef, useState } from "react";

export type LineSelectOption = {
  value: string;
  label: string;
  title?: string;
  model?: string | null;
  owner?: string;
  tag?: string;
};

type Props = {
  id: string;
  value: string;
  options: LineSelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
};

export function LineSelect({ id, value, options, placeholder, onChange }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const items = options.filter((option) => option.value !== "");
  const selectedIndex = items.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  const openList = () => {
    setHighlight(Math.max(selectedIndex, 0));
    setOpen(true);
  };

  const pick = (index: number) => {
    const option = items[index];
    if (!option) return;
    setOpen(false);
    if (option.value !== value) onChange(option.value);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = items.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => Math.min(index + 1, last));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setHighlight(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setHighlight(last);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(highlight);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="dml-lsel" ref={rootRef}>
      <button
        id={id}
        type="button"
        role="combobox"
        className="dml-lsel__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${highlight}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        {selected ? (
          <span className="dml-lsel__value">
            <strong>{selected.title ?? selected.label}</strong>
            {selected.model ? <span className="dml-lsel__model">{selected.model}</span> : null}
            {selected.tag ? <span className="dml-lsel__tag">{selected.tag}</span> : null}
          </span>
        ) : (
          <span className="dml-lsel__placeholder">{placeholder}</span>
        )}
        <svg className="dml-lsel__chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="dml-lsel__list" id={listId} role="listbox" ref={listRef}>
          {items.map((option, index) => (
            <div
              key={option.value}
              id={`${listId}-${index}`}
              data-index={index}
              role="option"
              aria-selected={option.value === value}
              className={[
                "dml-lsel__option",
                index === highlight ? "is-active" : "",
                option.value === value ? "is-selected" : "",
              ].filter(Boolean).join(" ")}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => pick(index)}
            >
              <span className="dml-lsel__text">
                <span className="dml-lsel__line">
                  <strong>{option.title ?? option.label}</strong>
                  {option.model || option.owner ? (
                    <span className="dml-lsel__model">
                      {[option.model, option.owner].filter(Boolean).join(" - ")}
                    </span>
                  ) : null}
                  {option.tag ? <span className="dml-lsel__tag">{option.tag}</span> : null}
                </span>
              </span>
              {option.value === value && (
                <svg className="dml-lsel__check" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
