
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { notificationApi, papercardApi, type DmMeetingSession } from "../api";
import "./ReminderModal.css";

type ReminderType = "papercard" | "meeting";

interface ReminderModalProps {
  lineId: number | null;
  department: string | null;
  sessions: DmMeetingSession[];
  papercardSubmitted: boolean;
  papercardHref: string;
  meetingHref: string;
  enabled?: boolean;
}

interface ReminderItem {
  id: string;
  type: ReminderType;
  title: string;
  description: string;
  startTime: string;
  endTime?: string;
  href: string;
  leadMinutes: number;
  enabled: boolean;
}

interface ReminderSettings {
  papercardReminderMinutes: number;
  papercardEnabled: boolean;
  meetingReminderMinutes: number;
  meetingEnabled: boolean;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  papercardReminderMinutes: 15,
  papercardEnabled: true,
  meetingReminderMinutes: 15,
  meetingEnabled: true,
};


function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTime(value: string): number | null {
  // Accept "HH:mm", "HH:mm:ss", or a date/time string containing HH:mm.
  const match = value.match(/(?:^|T|\s)(\d{1,2}):(\d{2})(?::\d{2})?/);

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function formatTime(value: string): string {
  const minutes = parseTime(value);
  if (minutes === null) return value;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function dismissalKey(date: Date, id: string) {
  return `dm-reminder-dismissed:${localDateKey(date)}:${id}`;
}

function wasDismissed(date: Date, id: string): boolean {
  try {
    return window.localStorage.getItem(dismissalKey(date, id)) === "1";
  } catch {
    return false;
  }
}

function markDismissed(date: Date, id: string) {
  try {
    window.localStorage.setItem(dismissalKey(date, id), "1");
  } catch {
    // The popup can still be dismissed for the current session.
  }
}

export function ReminderModal({
  lineId,
  department,
  sessions,
  papercardSubmitted,
  papercardHref,
  meetingHref,
  enabled = true,
}: ReminderModalProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [windowStart, setWindowStart] = useState<string | null>(null);
  const [windowEnd, setWindowEnd] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [active, setActive] = useState<ReminderItem | null>(null);
  const [demo, setDemo] = useState(false);
  const [demoError, setDemoError] = useState("");
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);


  // Keep the clock current while the dashboard is open.
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();

    const interval = window.setInterval(tick, 15_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lineId) return;

    let cancelled = false;
    const load = () => {
      notificationApi
        .getSettings(lineId)
        .then((result) => {
          if (cancelled) return;
          setSettings({
            papercardReminderMinutes: result.papercardReminderMinutes,
            papercardEnabled: result.papercardEnabled,
            meetingReminderMinutes: result.meetingReminderMinutes,
            meetingEnabled: result.meetingEnabled,
          });
        })
        .catch(() => undefined);
    };

    load();
    const interval = window.setInterval(load, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [lineId]);


  // Load the saved Papercard window for this line and department.
  useEffect(() => {
    if (!lineId || !department) {
      setWindowStart(null);
      setWindowEnd(null);
      return;
    }

    let cancelled = false;
    setTemplateLoading(true);

    papercardApi
      .listTemplates({ lineId, department })
      .then((templates) => {
        if (cancelled) return;

        // The endpoint may return multiple templates. Prefer the first
        // matching line + department template returned by the API.
        const template = templates.find(
          (item) =>
            item.lineId === lineId &&
            item.department.toUpperCase() === department.toUpperCase(),
        );

        setWindowStart(template?.windowStart || null);
        setWindowEnd(template?.windowEnd || null);
      })
      .catch(() => {
        if (!cancelled) {
          setWindowStart(null);
          setWindowEnd(null);
        }
      })
      .finally(() => {
        if (!cancelled) setTemplateLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lineId, department]);

  const reminders = useMemo<ReminderItem[]>(() => {
    const items: ReminderItem[] = [];

    if (windowStart) {
      items.push({
        id: "papercard",
        type: "papercard",
        title: "Waktunya isi Papercard",
        description:
          "Jendela pengisian Papercard akan segera dibuka. Pastikan checklist kesiapan kerja Anda sudah lengkap.",
        startTime: windowStart,
        endTime: windowEnd || undefined,
        href: papercardHref,
        leadMinutes: settings.papercardReminderMinutes,
        enabled: settings.papercardEnabled,  
      });
    }

    for (const session of sessions) {
      if (session.status !== "pending") continue;
      items.push({
        id: `meeting-${session.id}`,
        type: "meeting",
        title: "Meeting akan segera dimulai",
        description: `${session.label || `Sesi ${session.sessionNumber}`} akan segera dimulai. Persiapkan diri untuk Daily Management Meeting.`,
        startTime: session.scheduledTime,
        href: meetingHref,
        leadMinutes: settings.meetingReminderMinutes,
        enabled: settings.meetingEnabled,  
      });
    }

    return items;
  }, [windowStart, windowEnd, sessions, papercardHref, meetingHref, settings]);


  const dismiss = useCallback((item: ReminderItem) => {
    markDismissed(new Date(), item.id);
    setActive(null);
    setDemo(false);
    setDemoError("");
  }, []);

  // Trigger once per reminder when the configured start is 15 minutes away.
  useEffect(() => {
    if (!enabled || !now || active || demo || templateLoading) return;

    const currentMinute = now.getHours() * 60 + now.getMinutes();

    const due = reminders.find((item) => {
      if (item.type === "papercard" && papercardSubmitted) return false;
      if (!item.enabled) return false;


      const startMinute = parseTime(item.startTime);
      if (startMinute === null) return false;

      // If the user opens the dashboard during the 15-minute lead window,
      // still show the reminder, rather than requiring an exact page-open minute.
      const reminderMinute = startMinute - item.leadMinutes;
      const isInReminderWindow =
        currentMinute >= reminderMinute && currentMinute < startMinute;

      return isInReminderWindow && !wasDismissed(now, item.id);
    });

    if (due) setActive(due);
  }, [
    enabled,
    now,
    active,
    demo,
    templateLoading,
    reminders,
    papercardSubmitted,
  ]);

  const openDemo = (type: ReminderType) => {
    setDemoError("");

    const item =
      type === "papercard"
        ? reminders.find((reminder) => reminder.type === "papercard")
        : reminders.find((reminder) => reminder.type === "meeting");

    if (!item) {
      setDemoError(
        type === "papercard"
          ? templateLoading
            ? "Template Papercard sedang dimuat."
            : "Template Papercard untuk lini dan departemen ini belum ditemukan."
          : "Belum ada jadwal meeting yang tersedia untuk hari ini.",
      );
      return;
    }

    setActive(item);
    setDemo(true);
  };

  const current = active;

  return (
    <>
      {process.env.NODE_ENV === "development" && (
        <div className="dm-reminder-demo">
          <span>Preview reminder</span>
          <button type="button" onClick={() => openDemo("papercard")}>
            Demo Papercard
          </button>
          <button type="button" onClick={() => openDemo("meeting")}>
            Demo Meeting
          </button>
          {demoError && <span className="dm-reminder-demo-error">{demoError}</span>}
        </div>
      )}

      {current && (
        <div
          className="dm-reminder-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) dismiss(current);
          }}
        >
          <section
            className="dm-reminder-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dm-reminder-title"
          >
            <button
              className="dm-reminder-close"
              type="button"
              aria-label="Tutup pengingat"
              onClick={() => dismiss(current)}
            >
              ×
            </button>

            <div className="dm-reminder-icon" aria-hidden="true">
              {current.type === "papercard" ? "✓" : "◷"}
            </div>

            <p className="dm-reminder-eyebrow">
              {current.type === "papercard" ? "PRE-MANAGEMENT" : "DURING MANAGEMENT"}
            </p>

            <h2 id="dm-reminder-title">{current.title}</h2>
            <p className="dm-reminder-description">{current.description}</p>

            <div className="dm-reminder-time">
              <span className="dm-reminder-time-label">
                {current.type === "papercard" ? "Durasi pengisian" : "Waktu meeting"}
              </span>

              <strong>
                {current.endTime
                  ? `${formatTime(current.startTime)}–${formatTime(current.endTime)}`
                  : formatTime(current.startTime)}
              </strong>

              <span className="dm-reminder-time-note">
                Pengingat {current.leadMinutes} menit sebelum waktu dimulai
              </span>
            </div>

            <div className="dm-reminder-actions">
              <button
                type="button"
                className="dm-reminder-secondary"
                onClick={() => dismiss(current)}
              >
                Tutup
              </button>

              <button
                type="button"
                className="dm-reminder-primary"
                onClick={() => {
                  markDismissed(new Date(), current.id);
                  window.location.assign(current.href);
                }}
              >
                {current.type === "papercard" ? "Isi Papercard" : "Lihat Dashboard"}
                <span aria-hidden="true"> →</span>
              </button>
            </div>

            {demo && (
              <p className="dm-reminder-demo-note">
                Mode demo — tidak mengubah status Papercard atau meeting.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
