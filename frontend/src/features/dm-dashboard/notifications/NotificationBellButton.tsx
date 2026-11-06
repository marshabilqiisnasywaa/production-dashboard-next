"use client";
import { useUiText } from "@/locales/useUiText";


import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ClipboardCheck, Settings, TriangleAlert, Users } from "lucide-react";
import { IconBell } from "@/components/ui/icons";
import { GlassToastContainer } from "./GlassToastContainer";
import { NotificationSettingsModal } from "./NotificationSettingsModal";
import type { DmAppNotification } from "./types";
import { useDmNotifications } from "./useDmNotifications";
import "./notifications.css";

interface NotificationBellButtonProps {
  lineId?: number | null;
  dept?: string | null;
  role?: string | null;
  lineName?: string | null;
  lines?: Array<{ id: number; name: string }>;
  extraNotifications?: DmAppNotification[];
}

export function NotificationBellButton({
  lineId,
  dept,
  role,
  lineName,
  lines,
  extraNotifications,
}: NotificationBellButtonProps) {
  const { text: uiText } = useUiText();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const {
    settings,
    notifications,
    activeToasts,
    dismissToast,
    unreadCount,
    soundEnabled,
    saveSettings,
    dismissNotification,
    markAllAsRead,
    toggleSound,
    triggerTestNotification,
  } = useDmNotifications({ lineId, dept, role, lineName, extraNotifications });

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const hasUrgent = notifications.some((n) => n.severity === "urgent");
  const hasWarning = notifications.some((n) => n.severity === "warning");
  const badgeClass = hasUrgent
    ? "dm-notif-badge--late"
    : hasWarning
    ? "dm-notif-badge--reminder"
    : "dm-notif-badge--info";

  return (
    <div className="dm-notif-wrap" ref={wrapRef}>
      {/* Bell Button */}
      <button
        type="button"
        className={`dm-notif-trigger${isOpen ? " is-active" : ""}`}
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen && unreadCount > 0) {
            markAllAsRead();
          }
        }}
        aria-label={uiText("Notifikasi Pengingat")}
        title={uiText("Notifikasi Pengingat Papercard & Meeting")}
      >
        <IconBell size={18} />
        {notifications.length > 0 && (
          <span className={`dm-notif-badge ${badgeClass}`}>
            {notifications.length}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="dm-notif-popover">
          {/* Popover Header */}
          <div className="dm-notif-head">
            <div className="dm-notif-head-title">
              <span>{uiText("Pengingat & Notifikasi")}</span>
              {notifications.length > 0 && (
                <span className="dm-notif-head-pill">{notifications.length}{uiText(" Aktif")}</span>
              )}
            </div>
            <div className="dm-notif-head-actions">
              {role === "admin" && (
                <button
                  type="button"
                  className="dm-notif-btn-icon"
                  onClick={() => {
                    setIsOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  title={uiText("Pengaturan waktu pengingat (Admin)")}
                >
                  <Settings size={14} strokeWidth={1.8} />
                </button>
              )}
            </div>
          </div>

          {/* Popover List */}
          <div className="dm-notif-list">
            {notifications.length === 0 ? (
              <div className="dm-notif-empty">
                <div className="dm-notif-empty-title">{uiText("Tidak Ada Notifikasi")}</div>
                <div className="dm-notif-empty-desc">{uiText("Notifikasi baru akan muncul di sini.")}</div>
              </div>
            ) : (
              notifications.map((item) => {
                const isLate = item.severity === "urgent";
                const isReminder = item.severity === "warning";
                const itemClass = isLate
                  ? "dm-notif-item--late"
                  : isReminder
                  ? "dm-notif-item--reminder"
                  : "dm-notif-item--info";

                return (
                  <div key={item.id} className={`dm-notif-item ${itemClass}`}>
                    <div className="dm-notif-item-top">
                      <div className="dm-notif-item-tags">
                        <span className="dm-notif-status-badge">
                          {isLate ? uiText("TELAT") : isReminder ? uiText("PENGINGAT") : uiText("INFO")}
                        </span>
                        <span
                          className="dm-notif-type-label"
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          {item.type === "meeting" ? (
                            <>
                              <Users size={12} strokeWidth={1.8} />
                              <span>{uiText("Meeting")}</span>
                            </>
                          ) : item.type === "escalation" ? (
                            <>
                              <TriangleAlert size={12} strokeWidth={1.8} />
                              <span>{uiText("Eskalasi")}</span>
                            </>
                          ) : (
                            <>
                              <ClipboardCheck size={12} strokeWidth={1.8} />
                              <span>{uiText("Papercard")}</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="dm-notif-item-meta">
                        {item.timeLabel && <span className="dm-notif-time">{uiText(item.timeLabel)}</span>}
                        <button
                          type="button"
                          className="dm-notif-dismiss"
                          onClick={() => dismissNotification(item.id)}
                          title={uiText("Tutup pengingat ini")}
                          aria-label={uiText("Tutup pengingat")}
                        >
                          &times;
                        </button>
                      </div>
                    </div>

                    <h4 className="dm-notif-title">{uiText(item.title)}</h4>
                    <p className="dm-notif-msg">{uiText(item.message)}</p>

                    {item.actionLabel && item.actionUrl && (
                      <div className="dm-notif-action-row">
                        <Link
                          href={item.actionUrl}
                          className="dm-notif-action-btn"
                          onClick={() => setIsOpen(false)}
                        >
                          <span>{uiText(item.actionLabel)}</span>
                          <span>&rarr;</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer (Admin Only) */}
          {role === "admin" && (
            <div className="dm-notif-foot">
              <button
                type="button"
                className="dm-notif-foot-btn"
                onClick={() => {
                  setIsOpen(false);
                  setIsSettingsOpen(true);
                }}
              >
                <Settings size={14} strokeWidth={1.8} />
                <span>{uiText("Atur Pengingat")}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settings Modal */}
      <NotificationSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={settings}
        onSave={saveSettings}
        role={role}
        lineId={lineId}
        lineName={lineName}
        lines={lines}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onTestNotification={triggerTestNotification}
      />

      {/* Floating Glassmorphic Notification Toast */}
      <GlassToastContainer
        toasts={activeToasts}
        onDismissToast={dismissToast}
      />
    </div>
  );
}
