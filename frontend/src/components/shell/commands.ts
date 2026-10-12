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
      { label: "Production KPI", icon: "chart", shortcut: "G K", key: "production-kpi" },
      { label: "Project 2026", icon: "trending", shortcut: "G P", key: "project-2026" },
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
