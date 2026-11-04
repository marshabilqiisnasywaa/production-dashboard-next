"use client";
import { useUiText } from "@/locales/useUiText";


import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ClipboardCheck, TriangleAlert, Users } from "lucide-react";
import type { ActiveGlassToast } from "./types";
import "./notifications.css";

interface GlassToastContainerProps {
  toasts: ActiveGlassToast[];
  onDismissToast: (id: string) => void;
}

export function GlassToastContainer({ toasts, onDismissToast }: GlassToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="dm-liquid-toast-portal" aria-live="assertive">
      {toasts.map((toast) => (
        <LiquidToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismissToast(toast.id)}
        />
      ))}
    </div>
  );
}

interface LiquidToastItemProps {
  toast: ActiveGlassToast;
  onDismiss: () => void;
}

function LiquidToastItem({ toast, onDismiss }: LiquidToastItemProps) {
  const { text: uiText } = useUiText();
  const [isPaused, setIsPaused] = useState(false);
  const { notification, isExiting, durationMs } = toast;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPaused) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }
    timeoutRef.current = setTimeout(() => {
      onDismiss();
    }, durationMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPaused, durationMs, onDismiss]);

  const typeLabel =
    notification.type === "meeting" ? (
      <>
        <Users size={12} strokeWidth={1.8} />
        <span>{uiText("Meeting")}</span>
      </>
    ) : notification.type === "escalation" ? (
      <>
        <TriangleAlert size={12} strokeWidth={1.8} />
        <span>{uiText("Eskalasi")}</span>
      </>
    ) : (
      <>
        <ClipboardCheck size={12} strokeWidth={1.8} />
        <span>{uiText("Papercard")}</span>
      </>
    );
  const isLate = notification.severity === "urgent"; // Telat -> Soft Merah
  const isReminder = notification.severity === "warning"; // Pengingat -> Soft Kuning

  const statusClass = isLate
    ? "dm-liquid-toast--late"
    : isReminder
    ? "dm-liquid-toast--reminder"
    : "dm-liquid-toast--info";

  return (
    <div
      className={`dm-liquid-toast ${statusClass}${isExiting ? " is-exiting" : ""}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
    >
      {/* Top Meta Bar */}
      <div className="dm-toast-topbar">
        <div className="dm-toast-meta-left">
          <span className="dm-toast-dot" />
          <span className="dm-toast-status-badge">
            {isLate ? uiText("TELAT") : isReminder ? uiText("PENGINGAT") : uiText("INFO")}
          </span>
          <span
            className="dm-toast-category"
            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            {uiText(typeLabel)}
          </span>
        </div>

        <div className="dm-toast-meta-right">
          {notification.timeLabel && (
            <span className="dm-toast-time-badge">{uiText(notification.timeLabel)}</span>
          )}
          <button
            type="button"
            className="dm-toast-close-btn"
            onClick={onDismiss}
            aria-label={uiText("Tutup notifikasi")}
            title={uiText("Tutup")}
          >
            &times;
          </button>
        </div>
      </div>

      {/* Main Body - Full text display, simple and padat */}
      <div className="dm-toast-body">
        <h4 className="dm-toast-title">{uiText(notification.title)}</h4>
        <p className="dm-toast-message">{uiText(notification.message)}</p>
      </div>

      {/* Action Footer if available */}
      {notification.actionLabel && notification.actionUrl && (
        <div className="dm-toast-action-bar">
          <Link
            href={notification.actionUrl}
            className="dm-toast-cta"
            onClick={onDismiss}
          >
            <span>{uiText(notification.actionLabel)}</span>
            <span className="dm-toast-cta-arrow">&rarr;</span>
          </Link>
        </div>
      )}

      {/* Sleek countdown line */}
      <div
        className={`dm-toast-progress-bar${isPaused ? " is-paused" : ""}`}
        style={{ animationDuration: `${durationMs}ms` }}
      />
    </div>
  );
}
