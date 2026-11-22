"use client";
import { Fragment, useEffect, useRef } from "react";

export type ActionMenuItem = {
  key: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
  separatorBefore?: boolean;
};

type ActionMenuProps = {
  anchor: DOMRect;
  items: ActionMenuItem[];
  onClose: () => void;
};

export default function ActionMenu({ anchor, items, onClose }: ActionMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  const enabledButtons = () =>
    Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);

  useEffect(() => {
    enabledButtons()[0]?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const list = enabledButtons();
      if (list.length === 0) return;
      const index = list.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "ArrowDown" ? (index + 1) % list.length : (index - 1 + list.length) % list.length;
      list[next]?.focus();
    };
    const onDown = (event: MouseEvent) => {
      const target = event.target as Element;
      if (ref.current?.contains(target) || target.closest("[data-mmu-menu-trigger]")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const openUp = anchor.bottom + 150 > window.innerHeight;
  const style = {
    right: Math.max(8, window.innerWidth - anchor.right),
    ...(openUp ? { bottom: window.innerHeight - anchor.top + 6 } : { top: anchor.bottom + 6 }),
  };

  return (
    <div ref={ref} className="mmu-menu" role="menu" style={style}>
      {items.map((item) => (
        <Fragment key={item.key}>
          {item.separatorBefore && <hr />}
          <button
            type="button"
            role="menuitem"
            className={item.danger ? "is-danger" : undefined}
            disabled={item.disabled}
            title={item.hint}
            onClick={() => {
              item.onSelect();
              onClose();
            }}
          >
            {item.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
