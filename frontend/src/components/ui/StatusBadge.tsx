export type BadgeStatus = "Open" | "In Progress" | "Resolved";

export type StatusBadgeProps = {
  status: BadgeStatus;
  overdue?: boolean;
  variant?: "pill" | "chip";
};

const pillTone: Record<BadgeStatus | "Overdue", string> = {
  Overdue: "bg-red-600 text-white",
  Open: "bg-red-100 text-red-700",
  "In Progress": "bg-amber-100 text-amber-800",
  Resolved: "bg-green-100 text-green-800",
};

const chipTone: Record<BadgeStatus, string> = {
  Open: "status-open",
  "In Progress": "status-progress",
  Resolved: "status-closed-loop",
};

export default function StatusBadge({ status, overdue = false, variant = "pill" }: StatusBadgeProps) {
  if (variant === "chip") return <span className={`status-chip ${chipTone[status]}`}>{status}</span>;
  const shown = overdue && status !== "Resolved" ? "Overdue" : status;
  return <div className="text-center"><span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${pillTone[shown]}`}>{shown}</span></div>;
}
