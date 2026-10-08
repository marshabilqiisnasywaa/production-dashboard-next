import type { NavIconName } from "@/config/navigation";

export type CommandItem = {
  label: string;
  icon: NavIconName;
  shortcut?: string;
};

export type CommandGroup = {
  label: string;
  items: CommandItem[];
};

export const commandGroups: CommandGroup[] = [
  {
    label: "Suggestions",
    items: [
      { label: "Dashboard", icon: "grid", shortcut: "G D" },
      { label: "Beranda Meeting", icon: "calendar", shortcut: "G M" },
      { label: "Production KPI", icon: "chart", shortcut: "G K" },
      { label: "Project 2026", icon: "trending", shortcut: "G P" },
      { label: "Followup", icon: "message", shortcut: "G F" },
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
