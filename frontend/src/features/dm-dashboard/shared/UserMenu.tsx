"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useUiText } from "@/locales/useUiText";
import { IconLogout } from "@/components/ui/icons";
import { getActorToken, leaveImpersonation } from "../api";
import "./headerActions.css";

function IconUserSwitch({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5 1.6 0 3 .4 4.1 1.2" />
      <path d="M21 17h-6M17.5 14l-3 3 3 3" />
    </svg>
  );
}

interface Props {
  name: string;
  role: string;
  onLogout: () => void;
}

export function UserMenu({ name, role, onLogout }: Props) {
  const { text: uiText } = useUiText();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    setImpersonating(getActorToken() !== null);
  }, []);

  function returnToActor() {
    if (leaveImpersonation()) window.location.href = "/dm-dashboard/admin";
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="dml-account" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="dml-account__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${uiText("Menu akun")}: ${name}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="dml-account__avatar" aria-hidden="true">{initial}</span>
        <span className="dml-account__text">
          <strong>{name}</strong>
          <span>{role}</span>
        </span>
        <svg className="dml-account__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="dml-account__menu" id={menuId} role="menu" aria-label={uiText("Menu akun")}>
          {impersonating ? (
            <button
              type="button"
              role="menuitem"
              className="dml-account__item"
              autoFocus
              onClick={returnToActor}
            >
              <IconUserSwitch size={16} />
              <span>{uiText("Kembali ke superadmin")}</span>
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="dml-account__item dml-account__item--danger"
            autoFocus={!impersonating}
            onClick={onLogout}
          >
            <IconLogout size={16} />
            <span>{uiText("Keluar")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
