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
