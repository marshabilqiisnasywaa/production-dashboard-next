"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, ClipboardCheck, Users } from "lucide-react";
import type { DmNotificationSetting, DmNotificationSettingInput } from "../api";
import "./notifications.css";

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: DmNotificationSetting;
  onSave: (newSettings: DmNotificationSettingInput, targetLineId?: number) => Promise<void>;
  role?: string | null;
  lineId?: number | null;
  lineName?: string | null;
  lines?: Array<{ id: number; name: string }>;
  soundEnabled: boolean;
  onToggleSound: (val: boolean) => void;
  onTestNotification: () => void;
}

const PRESET_MINUTES = [5, 10, 15, 30];

export function NotificationSettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSave,
  role,
  lineId,
  lineName,
  lines,
  soundEnabled,
  onToggleSound,
  onTestNotification,
}: NotificationSettingsModalProps) {
  const [papercardMinutes, setPapercardMinutes] = useState<number>(15);
  const [papercardEnabled, setPapercardEnabled] = useState<boolean>(true);
  const [meetingMinutes, setMeetingMinutes] = useState<number>(15);
  const [meetingEnabled, setMeetingEnabled] = useState<boolean>(true);
  const [customPapercard, setCustomPapercard] = useState<boolean>(false);
  const [customMeeting, setCustomMeeting] = useState<boolean>(false);
  const [targetLineId, setTargetLineId] = useState<number>(0); // 0 = Semua Lini
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  const isAdmin = role === "admin";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const pm = currentSettings.papercardReminderMinutes || 15;
      const mm = currentSettings.meetingReminderMinutes || 15;
      setPapercardMinutes(pm);
      setPapercardEnabled(currentSettings.papercardEnabled ?? true);
      setMeetingMinutes(mm);
      setMeetingEnabled(currentSettings.meetingEnabled ?? true);
      setCustomPapercard(!PRESET_MINUTES.includes(pm));
      setCustomMeeting(!PRESET_MINUTES.includes(mm));
      // Admin defaults to 0 (Semua Lini) unless a specific lineId was specified
      setTargetLineId(isAdmin ? 0 : lineId || 1);
      setSaveSuccess(false);
    }
  }, [isOpen, currentSettings, isAdmin, lineId]);

  if (!isOpen || !mounted) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(
        {
          papercardReminderMinutes: Math.max(1, Number(papercardMinutes) || 15),
          papercardEnabled,
          meetingReminderMinutes: Math.max(1, Number(meetingMinutes) || 15),
          meetingEnabled,
        },
        targetLineId
      );
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 550);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const selectedLineObj = lines?.find((l) => l.id === targetLineId);
  const activeLabel =
    targetLineId === 0
      ? "Semua Lini"
      : selectedLineObj?.name || lineName || `Lini ${targetLineId}`;

  return createPortal(
    <div className="dm-notif-modal-backdrop" onClick={onClose}>
      <div
        className="dm-liquid-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="dm-liquid-modal-head">
          <div className="dm-liquid-modal-title">
            <span>Pengaturan Pengingat</span>
            <span className={`dm-liquid-modal-line${targetLineId === 0 ? " is-all" : ""}`}>
              {activeLabel}
            </span>
          </div>
          <button
            type="button"
            className="dm-liquid-modal-close"
            onClick={onClose}
            aria-label="Tutup"
          >
            &times;
          </button>
        </div>

        {/* Modal Body - Simple, Padat, Zero Waste */}
        <div className="dm-liquid-modal-body">
          {/* Admin Target Scope Selector - Default to 'Semua Lini' */}
          {isAdmin && lines && lines.length > 0 && (
            <div className="dm-liquid-scope-bar">
              <span className="dm-liquid-scope-label">Terapkan Ke:</span>
              <select
                className="dm-liquid-scope-select"
                value={targetLineId}
                onChange={(e) => setTargetLineId(Number(e.target.value))}
              >
                <option value={0}>Semua Lini (Default)</option>
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section 1: Papercard Reminder */}
          <div className="dm-liquid-setting-block">
            <div className="dm-liquid-setting-row">
              <span className="dm-liquid-setting-name">
                <span className="dm-setting-icon">
                  <ClipboardCheck size={16} strokeWidth={1.8} />
                </span>
                <span>Pengingat Papercard</span>
              </span>
              <label className="dm-liquid-switch" title="Aktif / Nonaktif">
                <input
                  type="checkbox"
                  checked={papercardEnabled}
                  onChange={(e) => setPapercardEnabled(e.target.checked)}
                  disabled={!isAdmin}
                />
                <span className="dm-liquid-slider" />
              </label>
            </div>

            {papercardEnabled && (
              <div className="dm-liquid-segmented-wrap">
                <span className="dm-liquid-subtext">Beri notifikasi sebelum window buka:</span>
                <div className="dm-liquid-segmented">
                  {PRESET_MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={!isAdmin}
                      className={`dm-liquid-seg-btn${!customPapercard && papercardMinutes === m ? " is-active" : ""}`}
                      onClick={() => {
                        setPapercardMinutes(m);
                        setCustomPapercard(false);
                      }}
                    >
                      {m}m
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={!isAdmin}
                    className={`dm-liquid-seg-btn${customPapercard ? " is-active" : ""}`}
                    onClick={() => setCustomPapercard(true)}
                  >
                    Kustom
                  </button>
                </div>

                {customPapercard && (
                  <div className="dm-liquid-custom-box">
                    <input
                      type="number"
                      min={1}
                      max={180}
                      disabled={!isAdmin}
                      value={papercardMinutes}
                      onChange={(e) => setPapercardMinutes(Math.max(1, Number(e.target.value)))}
                      className="dm-liquid-custom-input"
                    />
                    <span>menit sebelum jadwal</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="dm-liquid-divider" />

          {/* Section 2: Meeting Reminder */}
          <div className="dm-liquid-setting-block">
            <div className="dm-liquid-setting-row">
              <span className="dm-liquid-setting-name">
                <span className="dm-setting-icon">
                  <Users size={16} strokeWidth={1.8} />
                </span>
                <span>Pengingat Meeting</span>
              </span>
              <label className="dm-liquid-switch" title="Aktif / Nonaktif">
                <input
                  type="checkbox"
                  checked={meetingEnabled}
                  onChange={(e) => setMeetingEnabled(e.target.checked)}
                  disabled={!isAdmin}
                />
                <span className="dm-liquid-slider" />
              </label>
            </div>

            {meetingEnabled && (
              <div className="dm-liquid-segmented-wrap">
                <span className="dm-liquid-subtext">Beri notifikasi sebelum meeting:</span>
                <div className="dm-liquid-segmented">
                  {PRESET_MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={!isAdmin}
                      className={`dm-liquid-seg-btn${!customMeeting && meetingMinutes === m ? " is-active" : ""}`}
                      onClick={() => {
                        setMeetingMinutes(m);
                        setCustomMeeting(false);
                      }}
                    >
                      {m}m
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={!isAdmin}
                    className={`dm-liquid-seg-btn${customMeeting ? " is-active" : ""}`}
                    onClick={() => setCustomMeeting(true)}
                  >
                    Kustom
                  </button>
                </div>

                {customMeeting && (
                  <div className="dm-liquid-custom-box">
                    <input
                      type="number"
                      min={1}
                      max={180}
                      disabled={!isAdmin}
                      value={meetingMinutes}
                      onChange={(e) => setMeetingMinutes(Math.max(1, Number(e.target.value)))}
                      className="dm-liquid-custom-input"
                    />
                    <span>menit sebelum jadwal</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="dm-liquid-divider" />

          {/* Section 3: Audio & Test */}
          <div className="dm-liquid-setting-block">
            <div className="dm-liquid-setting-row">
              <span className="dm-liquid-setting-name">
                <span className="dm-setting-icon">
                  <Bell size={16} strokeWidth={1.8} />
                </span>
                <span>Suara Notifikasi</span>
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={onTestNotification}
                  className="dm-liquid-btn-test"
                  title="Putar suara dan uji coba notifikasi"
                >
                  Tes Notif
                </button>
                <label className="dm-liquid-switch">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => onToggleSound(e.target.checked)}
                  />
                  <span className="dm-liquid-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="dm-liquid-modal-foot">
          <div className="dm-liquid-modal-status">
            {saveSuccess ? (
              <span
                style={{
                  color: "#16a34a",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Check size={13} strokeWidth={1.8} />
                <span>
                  {targetLineId === 0
                    ? "Tersimpan ke semua lini"
                    : `Tersimpan untuk ${activeLabel}`}
                </span>
              </span>
            ) : !isAdmin ? (
              <span>Pengaturan hanya dapat diubah oleh Admin</span>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <button type="button" className="dm-liquid-btn-ghost" onClick={onClose}>
              {isAdmin ? "Batal" : "Tutup"}
            </button>
            {isAdmin && (
              <button
                type="button"
                className="dm-liquid-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Menyimpan..." : targetLineId === 0 ? "Simpan Semua" : "Simpan"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
