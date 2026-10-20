export type NotificationType = "papercard" | "meeting" | "system";

export type NotificationSeverity = "urgent" | "warning" | "info" | "success";

export interface DmAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timeLabel?: string;
  severity: NotificationSeverity;
  actionLabel?: string;
  actionUrl?: string;
  isRead?: boolean;
  createdAt: number; // timestamp
}

export interface ActiveGlassToast {
  id: string;
  notification: DmAppNotification;
  isExiting: boolean;
  durationMs: number;
}

export interface NotificationLocalPrefs {
  soundEnabled: boolean;
  desktopNotification: boolean;
  dismissedIds: string[];
}
