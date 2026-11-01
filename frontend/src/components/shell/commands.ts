import type { NavIconName } from "@/config/navigation";

export type CommandItem = {
  label: string;
  icon: NavIconName;
  shortcut?: string;
  key?: string;
};

export type CommandGroup = {
  label: string;
  items: CommandItem[];
};

export const commandGroups: CommandGroup[] = [
  {
    label: "Suggestions",
    items: [
      { label: "Dashboard", icon: "grid", shortcut: "G D", key: "Dashboard" },
      { label: "Meeting Dashboard", icon: "calendar", shortcut: "G M", key: "meeting-home" },
      { label: "SQDCIP Overview", icon: "chart", shortcut: "G K", key: "sqcdip-overview" },
      { label: "Abnormal Tracker", icon: "alert", shortcut: "G A", key: "sqcdip-abnormal" },
      { label: "Follow-up", icon: "message", shortcut: "G F", key: "followup" },
      { label: "My Wallet", icon: "warehouse", shortcut: "G W" },
      { label: "Transactions", icon: "refresh", shortcut: "G T" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Profile", icon: "profile" },
      { label: "Billing", icon: "billing" },
      { label: "Settings", icon: "settings", shortcut: "G S" },
    ],
  },
];
