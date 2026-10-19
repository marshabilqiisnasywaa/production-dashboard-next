"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import "./RowMenu.css";

export interface RowMenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

interface RowMenuProps {
  label: string;
  items: RowMenuItem[];
}

const MENU_GAP = 6;
const EDGE = 8;

export default function RowMenu({ label, items }: RowMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    setPos(null);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;
    const anchor = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    const left = Math.max(EDGE, Math.min(anchor.right - menu.width, window.innerWidth - menu.width - EDGE));
    const below = anchor.bottom + MENU_GAP;
    const top = below + menu.height > window.innerHeight - EDGE ? Math.max(EDGE, anchor.top - menu.height - MENU_GAP) : below;
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!pos) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [pos]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    }
    function onDismiss() {
      close(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onDismiss);
    window.addEventListener("scroll", onDismiss, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onDismiss);
      window.removeEventListener("scroll", onDismiss, true);
    };
  }, [open, close]);

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      nodes[(index + 1) % nodes.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      nodes[(index - 1 + nodes.length) % nodes.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      nodes[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      nodes[nodes.length - 1]?.focus();
    } else if (event.key === "Tab") {
      close(false);
    }
  }

  function select(item: RowMenuItem) {
    close(true);
    item.onSelect();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`rm-trigger${open ? " is-open" : ""}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.9" />
          <circle cx="12" cy="12" r="1.9" />
          <circle cx="12" cy="19" r="1.9" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={label}
              className="rm-menu"
              style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
              onKeyDown={onMenuKeyDown}
            >
              {items.map((item, index) => (
                <div key={item.key} role="none">
                  {item.danger && index > 0 ? <div className="rm-sep" role="separator" /> : null}
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className={`rm-item${item.danger ? " is-danger" : ""}`}
                    onClick={() => select(item)}
                  >
                    <span className="rm-icon" aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </button>
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
