"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  meetingApi,
  notificationApi,
  papercardApi,
  type DmMeetingSchedule,
  type DmMeetingSession,
  type DmNotificationSetting,
  type DmNotificationSettingInput,
  type DmPapercardSubmission,
  type DmPapercardTemplate,
} from "../api";
import { playNotificationChime } from "./sound";
import type { DmAppNotification, NotificationLocalPrefs } from "./types";

const LOCAL_PREFS_KEY = "dm_notification_prefs_v1";

function getLocalPrefs(): NotificationLocalPrefs {
  if (typeof window === "undefined") {
    return { soundEnabled: true, desktopNotification: false, dismissedIds: [] };
  }
  try {
    const raw = localStorage.getItem(LOCAL_PREFS_KEY);
    if (!raw) return { soundEnabled: true, desktopNotification: false, dismissedIds: [] };
    return JSON.parse(raw);
  } catch {
    return { soundEnabled: true, desktopNotification: false, dismissedIds: [] };
  }
}

function saveLocalPrefs(prefs: Partial<NotificationLocalPrefs>) {
  if (typeof window === "undefined") return;
  try {
    const cur = getLocalPrefs();
    const updated = { ...cur, ...prefs };
    localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(updated));
  } catch {}
}

const pad = (n: number) => String(n).padStart(2, "0");

interface UseDmNotificationsProps {
  lineId?: number | null;
  dept?: string | null;
  role?: string | null;
  lineName?: string | null;
}

export function useDmNotifications({ lineId, dept, role, lineName }: UseDmNotificationsProps) {
  const [settings, setSettings] = useState<DmNotificationSetting>({
    lineId: lineId || 1,
    papercardReminderMinutes: 15,
    papercardEnabled: true,
    meetingReminderMinutes: 15,
    meetingEnabled: true,
    updatedAt: null,
  });

  const [schedule, setSchedule] = useState<DmMeetingSchedule | null>(null);
  const [sessions, setSessions] = useState<DmMeetingSession[]>([]);
  const [templates, setTemplates] = useState<DmPapercardTemplate[]>([]);
  const [submissions, setSubmissions] = useState<DmPapercardSubmission[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastCheck, setLastCheck] = useState<number>(Date.now());
  const [activeToasts, setActiveToasts] = useState<import("./types").ActiveGlassToast[]>([]);

  // Dismiss a toast with smooth exit animation
  const dismissToast = useCallback((id: string) => {
    setActiveToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== id));
    }, 350);
  }, []);

  // Trigger floating glass toast
  const triggerToast = useCallback((notif: DmAppNotification, durationMs = 8500) => {
    setActiveToasts((prev) => {
      if (prev.some((t) => t.id === notif.id)) return prev;
      return [...prev.slice(-1), { id: notif.id, notification: notif, isExiting: false, durationMs }];
    });
  }, []);

  // Track notifications that already triggered audio alert in this session
  const alertedIdsRef = useRef<Set<string>>(new Set());

  // Load preferences
  useEffect(() => {
    const prefs = getLocalPrefs();
    setDismissedIds(prefs.dismissedIds || []);
    setSoundEnabled(prefs.soundEnabled ?? true);
  }, []);

  // Fetch settings & data
  const fetchData = useCallback(async () => {
    const todayStr = new Date().toISOString().split("T")[0];

    try {
      const targetLine = lineId && lineId > 0 ? lineId : 0;
      const settRes = await notificationApi.getSettings(targetLine).catch(() => null);
      if (settRes) setSettings(settRes);

      if (lineId && lineId > 0) {
        const [schedRes, sessRes, tmplRes, subRes] = await Promise.all([
          meetingApi.getSchedule(lineId).catch(() => null),
          meetingApi.listSessions(lineId, todayStr).catch(() => []),
          papercardApi.listTemplates({ lineId }).catch(() => []),
          papercardApi.listSubmissions({ lineId, date: todayStr }).catch(() => []),
        ]);

        if (schedRes) setSchedule(schedRes);
        if (sessRes) setSessions(sessRes);
        if (tmplRes) setTemplates(tmplRes);
        if (subRes) setSubmissions(subRes);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setLastCheck(Date.now());
    }
  }, [lineId]);

  useEffect(() => {
    fetchData();
    // Re-check notification times every 10 seconds for timely popups
    const interval = setInterval(() => {
      setLastCheck(Date.now());
    }, 10_000);

    // Periodically refetch templates and meeting schedules every 45 seconds
    const fetchInterval = setInterval(() => {
      fetchData();
    }, 45_000);

    return () => {
      clearInterval(interval);
      clearInterval(fetchInterval);
    };
  }, [fetchData]);

  // Compute Active Notifications
  // Compute Active Notifications (Comprehensive 4-Stage Lifecycle)
  const notifications = useMemo(() => {
    const list: DmAppNotification[] = [];
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const curDate = now.getDate();

    // ISO weekday: 1=Senin ... 7=Minggu
    const jsDay = now.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;

    // 1. MEETING (DM) NOTIFICATIONS
    if (settings.meetingEnabled && schedule?.items) {
      const targetLine = lineName || "Lini";
      schedule.items.forEach((item, idx) => {
        if (!item.isActive || !item.days.includes(isoDay)) return;

        const parts = item.time.split(":");
        if (parts.length < 2) return;
        const sh = Number(parts[0]);
        const sm = Number(parts[1]);
        const schedTime = new Date(curYear, curMonth, curDate, sh, sm, 0);

        const diffMins = Math.round((schedTime.getTime() - now.getTime()) / 60000);

        // Check if meeting session is already completed
        const session = sessions.find((s) => s.scheduledTime === item.time || s.sessionNumber === idx + 1);
        const isCompleted = session?.status === "completed";

        if (isCompleted) return;

        const isLeader = role === "leader" || role === "admin";
        const meetingUrl = isLeader ? "/dm-dashboard/leader/meeting" : "/dm-dashboard/member";

        // Stage 1: Pre-meeting Reminder (diffMins > 0 up to meetingReminderMinutes)
        if (diffMins > 0 && diffMins <= settings.meetingReminderMinutes) {
          list.push({
            id: `meeting_upcoming_${item.id || item.time}`,
            type: "meeting",
            title: `Pengingat: Meeting ${item.label}`,
            message: `Jadwal meeting di lini ${targetLine} akan dimulai dalam ${diffMins} menit lagi (pukul ${item.time}). Mohon persiapkan kehadiran tim.`,
            timeLabel: `${diffMins}m lagi`,
            severity: "warning", // Pengingat -> Soft Yellow
            actionLabel: isLeader ? "Buka Sesi Meeting" : "Lihat Jadwal",
            actionUrl: meetingUrl,
            createdAt: schedTime.getTime() - settings.meetingReminderMinutes * 60000,
          });
        }
        // Stage 2: Pas Waktunya Meeting Dimulai (0 to 10 menit pertama sejak mulai)
        else if (diffMins <= 0 && diffMins >= -10) {
          list.push({
            id: `meeting_started_${item.id || item.time}`,
            type: "meeting",
            title: `Waktunya Meeting: ${item.label} Dimulai!`,
            message: `Jadwal meeting pukul ${item.time} di lini ${targetLine} sekarang sudah dimulai. Harap segera buka dan mulai sesi meeting.`,
            timeLabel: diffMins === 0 ? "Mulai Sekarang" : `Berjalan ${Math.abs(diffMins)}m`,
            severity: "warning", // Soft Yellow
            actionLabel: isLeader ? "Mulai Sesi Sekarang" : "Buka Meeting",
            actionUrl: meetingUrl,
            createdAt: schedTime.getTime(),
          });
        }
        // Stage 3: Sedang Berlangsung (11 sampai 30 menit)
        else if (diffMins < -10 && diffMins >= -30) {
          list.push({
            id: `meeting_ongoing_${item.id || item.time}`,
            type: "meeting",
            title: `Pengingat: Meeting ${item.label} Berlangsung`,
            message: `Sesi meeting pukul ${item.time} di lini ${targetLine} sedang berjalan ${Math.abs(diffMins)} menit. Pastikan absensi dan pembahasan kendala diselesaikan.`,
            timeLabel: `Berjalan ${Math.abs(diffMins)}m`,
            severity: "warning", // Soft Yellow
            actionLabel: isLeader ? "Masuk ke Sesi" : "Lihat Sesi",
            actionUrl: meetingUrl,
            createdAt: schedTime.getTime(),
          });
        }
        // Stage 4: Overdue / Belum Selesai (lebih dari 30 menit lewat dari jadwal)
        else if (diffMins < -30 && diffMins >= -120) {
          list.push({
            id: `meeting_overdue_${item.id || item.time}`,
            type: "meeting",
            title: `Telat: Meeting ${item.label} Belum Diselesaikan`,
            message: `Jadwal meeting pukul ${item.time} telah terlewat ${Math.abs(diffMins)} menit dan belum diselesaikan. Harap segera lengkapi sesi meeting.`,
            timeLabel: `Telat ${Math.abs(diffMins)}m`,
            severity: "urgent", // Soft Red
            actionLabel: isLeader ? "Selesaikan Sekarang" : "Buka Meeting",
            actionUrl: meetingUrl,
            createdAt: schedTime.getTime(),
          });
        }
      });
    }

    // 2. PAPERCARD NOTIFICATIONS
    if (settings.papercardEnabled && templates.length > 0) {
      // Member only sees their department; Leader and Admin monitor all departments on the line
      const relevantTemplates =
        role === "member" && dept
          ? templates.filter((t) => t.department.toUpperCase() === dept.toUpperCase())
          : templates;

      relevantTemplates.forEach((tmpl) => {
        const d = tmpl.department.toUpperCase();
        // Check if submitted today
        const hasSubmitted = submissions.some(
          (s) => s.department.toUpperCase() === d && s.status !== "rejected"
        );

        const isMemberOrLeader = role === "member" ? "/dm-dashboard/member/papercard" : "/dm-dashboard/leader/papercard";

        if (hasSubmitted) {
          return;
        }

        const wsParts = (tmpl.windowStart || "07:30").split(":");
        const weParts = (tmpl.windowEnd || "08:15").split(":");
        const wStart = new Date(curYear, curMonth, curDate, Number(wsParts[0]), Number(wsParts[1]), 0);
        let wEnd = new Date(curYear, curMonth, curDate, Number(weParts[0]), Number(weParts[1]), 0);

        // Safeguard if windowEnd is set earlier or equal to windowStart
        if (wEnd.getTime() <= wStart.getTime()) {
          wEnd = new Date(wStart.getTime() + 45 * 60000);
        }

        const diffToStart = Math.round((wStart.getTime() - now.getTime()) / 60000);
        const diffToEnd = Math.round((wEnd.getTime() - now.getTime()) / 60000);

        // Stage 1: Pre-open Reminder (diffToStart > 0 up to papercardReminderMinutes)
        if (diffToStart > 0 && diffToStart <= settings.papercardReminderMinutes) {
          list.push({
            id: `papercard_upcoming_${d}`,
            type: "papercard",
            title: `Pengingat: Papercard ${d}`,
            message: `Waktu pengisian Papercard Departemen ${d} akan dibuka dalam ${diffToStart} menit lagi (pukul ${tmpl.windowStart}).`,
            timeLabel: `${diffToStart}m lagi`,
            severity: "warning", // Soft Yellow
            actionLabel: "Isi Papercard",
            actionUrl: isMemberOrLeader,
            createdAt: wStart.getTime() - settings.papercardReminderMinutes * 60000,
          });
        }
        // Stage 2 & 3: During active window (now >= wStart && now <= wEnd)
        else if (now >= wStart && now <= wEnd) {
          // Stage 3: Sisa 10 Menit atau Kurang (Closing Soon Warning)
          if (diffToEnd <= 10 && diffToEnd > 0) {
            const isCritical = diffToEnd <= 5;
            list.push({
              id: `papercard_ending_${d}`,
              type: "papercard",
              title: isCritical
                ? `Mendesak: Sisa ${Math.max(1, diffToEnd)} Menit Papercard ${d}!`
                : `Pengingat: Sisa ${Math.max(1, diffToEnd)} Menit Papercard ${d}`,
              message: `Waktu pengisian Papercard Departemen ${d} akan ditutup dalam ${Math.max(1, diffToEnd)} menit lagi (pukul ${tmpl.windowEnd}). Segera lengkapi dan submit formulir.`,
              timeLabel: `Sisa ${Math.max(1, diffToEnd)}m`,
              severity: isCritical ? "urgent" : "warning",
              actionLabel: "Isi Sekarang",
              actionUrl: isMemberOrLeader,
              createdAt: wEnd.getTime() - 10 * 60000,
            });
          }
          // Stage 2: Pas Waktunya Pengisian / Baru Dibuka
          else {
            list.push({
              id: `papercard_started_${d}`,
              type: "papercard",
              title: `Waktunya Pengisian: Papercard ${d} Dibuka!`,
              message: `Sesi pengisian Papercard Departemen ${d} sekarang sudah dibuka (pukul ${tmpl.windowStart} - ${tmpl.windowEnd}). Silakan mulai lengkapi data pemeriksaan.`,
              timeLabel: `Dibuka Sekarang`,
              severity: "warning", // Soft Yellow
              actionLabel: "Isi Sekarang",
              actionUrl: isMemberOrLeader,
              createdAt: wStart.getTime(),
            });
          }
        }
        // Stage 4: After window has closed and still not submitted -> TELAT
        else if (now > wEnd) {
          list.push({
            id: `papercard_overdue_${d}`,
            type: "papercard",
            title: `Telat Pengisian Papercard ${d}`,
            message: `Batas waktu pengisian pukul ${tmpl.windowEnd} telah lewat dan formulir belum diserahkan. Harap segera lengkapi pemeriksaan.`,
            timeLabel: `Lewat ${tmpl.windowEnd}`,
            severity: "urgent", // Soft Red
            actionLabel: "Lengkapi Sekarang",
            actionUrl: isMemberOrLeader,
            createdAt: wEnd.getTime(),
          });
        }
      });
    }

    // Filter out dismissed
    return list.filter((n) => !dismissedIds.includes(n.id));
  }, [
    settings,
    schedule,
    sessions,
    templates,
    submissions,
    dismissedIds,
    dept,
    role,
    lineName,
    lastCheck,
  ]);

  // Play audio chime and trigger floating toasts for all unalerted notifications
  useEffect(() => {
    if (notifications.length === 0) return;

    let chimePlayed = false;
    notifications.forEach((n) => {
      if ((n.severity === "urgent" || n.severity === "warning") && !alertedIdsRef.current.has(n.id)) {
        alertedIdsRef.current.add(n.id);

        if (soundEnabled && !chimePlayed) {
          playNotificationChime();
          chimePlayed = true;
        }

        triggerToast(n, 9000);

        // Trigger desktop browser notification if allowed
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(n.title, {
              body: n.message,
              icon: "/favicon.ico",
            });
          } catch {}
        }
      }
    });
  }, [notifications, soundEnabled, triggerToast]);

  // Unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  // Dismiss notification
  const dismissNotification = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const updated = [...prev, id];
      saveLocalPrefs({ dismissedIds: updated });
      return updated;
    });
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setReadIds(notifications.map((n) => n.id));
  }, [notifications]);

  // Save settings (targetId = 0 applies to all lines)
  const saveSettings = useCallback(
    async (newSettings: DmNotificationSettingInput, targetId?: number) => {
      const effectiveId = typeof targetId === "number" ? targetId : (lineId ?? 0);
      const res = await notificationApi.saveSettings(effectiveId, newSettings);
      setSettings(res);
      // Refresh notifications immediately
      fetchData();
    },
    [lineId, fetchData]
  );

  // Toggle sound
  const toggleSound = useCallback((val: boolean) => {
    setSoundEnabled(val);
    saveLocalPrefs({ soundEnabled: val });
    if (val) playNotificationChime();
  }, []);

  // Trigger test notification
  const triggerTestNotification = useCallback(() => {
    playNotificationChime();
    const demoNotif: DmAppNotification = {
      id: `test_${Date.now()}`,
      type: "meeting",
      severity: "warning",
      title: "Pengingat Jadwal Meeting (Simulasi)",
      message: `Meeting akan dimulai dalam ${settings.meetingReminderMinutes} menit. Harap persiapkan kehadiran tim lini ${lineName || "Lini"}.`,
      timeLabel: `${settings.meetingReminderMinutes}m Lagi`,
      actionLabel: role === "leader" ? "Buka Sesi Meeting" : "Lihat Jadwal",
      actionUrl: role === "leader" ? "/dm-dashboard/leader/meeting" : "/dm-dashboard/member",
      createdAt: Date.now(),
    };
    triggerToast(demoNotif, 8500);

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(demoNotif.title, {
          body: demoNotif.message,
          icon: "/favicon.ico",
        });
      } catch {}
    }
  }, [settings, role, lineName, triggerToast]);

  return {
    settings,
    notifications,
    activeToasts,
    dismissToast,
    unreadCount,
    loading,
    soundEnabled,
    saveSettings,
    dismissNotification,
    markAllAsRead,
    toggleSound,
    triggerTestNotification,
    refresh: fetchData,
  };
}
