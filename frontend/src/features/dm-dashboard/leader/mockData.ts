/**
 * Mock data that mirrors the Figma design.
 * Replace the exports below with real API calls (see hooks/useInspection.ts).
 */
import type { InspectionRow, LineOverviewData, PapercardStatus, RoleKey, SessionItem, TeamMember, TimeShare } from "./types";
import { addDays } from "./utils";

export const MOCK_TODAY = "2025-06-17";
export const LEADER_LINE = "TAC20601";

export const LEADER_USER = {
  name: "Andi Wijaya",
  initials: "AW",
  employeeId: "LDR-001",
  role: "Leader Line",
  line: LEADER_LINE,
  lineName: "Line 1",
  workshop: "Assembly Workshop",
  supervisor: {
    name: "Hendra Pratama",
    employeeId: "SPV-019",
    role: "Supervisor Assembly 1",
  },
};

export const LINE_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "tm-1",
    name: "Andi Wijaya",
    initials: "AW",
    employeeId: "LDR-001",
    role: "leader",
    dept: "PROD",
    deptLabel: "Leader (Produksi)",
    position: "Line Leader",
    papercardStatus: "OK",
    approvalStatus: "PENDING_APPROVAL", // Menunggu review & approve Supervisor Hendra Pratama
    submittedAt: "07:42",
    attendanceToday: "Hadir",
  },
  {
    id: "tm-2",
    name: "Budi Santoso",
    initials: "BS",
    employeeId: "PRD-102",
    role: "member",
    dept: "PROD",
    deptLabel: "Produksi",
    position: "Senior Operator",
    papercardStatus: "OK",
    approvalStatus: "PENDING_APPROVAL",
    submittedAt: "07:35",
    attendanceToday: "Hadir",
  },
  {
    id: "tm-3",
    name: "Reza Pratama",
    initials: "RP",
    employeeId: "ME-205",
    role: "member",
    dept: "ME",
    deptLabel: "Maintenance Eng",
    position: "ME Technician",
    papercardStatus: "NG",
    approvalStatus: "PENDING_APPROVAL",
    submittedAt: "07:38",
    abnormalNote: "Suhu solder station #4 berfluktuasi (±15°C di atas SOP batas)",
    attendanceToday: "Hadir",
  },
  {
    id: "tm-4",
    name: "Maulana I. Arif",
    initials: "MA",
    employeeId: "PE-310",
    role: "member",
    dept: "PE",
    deptLabel: "Process Eng",
    position: "PE Technician",
    papercardStatus: "OK",
    approvalStatus: "APPROVED",
    submittedAt: "07:29",
    attendanceToday: "Hadir",
  },
  {
    id: "tm-5",
    name: "Siti Rahma",
    initials: "SR",
    employeeId: "QC-408",
    role: "member",
    dept: "QC",
    deptLabel: "Quality Control",
    position: "IPQC Inspector",
    papercardStatus: "PENDING",
    approvalStatus: "NOT_SUBMITTED",
    attendanceToday: "Hadir",
  },
];

export const SUPERVISOR_LINES_DATA: LineOverviewData[] = [
  {
    lineId: "line-1",
    lineName: "Line 1",
    code: "TAC20601",
    workshop: "Assembly Workshop",
    leader: { name: "Andi Wijaya", employeeId: "LDR-001", initials: "AW" },
    supervisor: { name: "Hendra Pratama", employeeId: "SPV-019" },
    shift: "Shift 1",
    members: LINE_TEAM_MEMBERS,
    approvalStatus: "HAS_ABNORMAL",
  },
  {
    lineId: "line-2",
    lineName: "Line 2",
    code: "TAC20602",
    workshop: "Assembly Workshop",
    leader: { name: "Dani Setiawan", employeeId: "LDR-002", initials: "DS" },
    supervisor: { name: "Hendra Pratama", employeeId: "SPV-019" },
    shift: "Shift 1",
    members: [
      { id: "l2-1", name: "Dani Setiawan", initials: "DS", employeeId: "LDR-002", role: "leader", dept: "PROD", deptLabel: "Leader", position: "Line Leader", papercardStatus: "OK", approvalStatus: "APPROVED", submittedAt: "07:30", attendanceToday: "Hadir" },
      { id: "l2-2", name: "Agus Santoso", initials: "AS", employeeId: "PRD-201", role: "member", dept: "PROD", deptLabel: "Produksi", position: "Operator", papercardStatus: "OK", approvalStatus: "APPROVED", submittedAt: "07:25", attendanceToday: "Hadir" },
      { id: "l2-3", name: "Fikri Akbar", initials: "FA", employeeId: "ME-202", role: "member", dept: "ME", deptLabel: "Maintenance", position: "ME Tech", papercardStatus: "OK", approvalStatus: "APPROVED", submittedAt: "07:28", attendanceToday: "Hadir" },
      { id: "l2-4", name: "Irfan Hakim", initials: "IH", employeeId: "PE-203", role: "member", dept: "PE", deptLabel: "Process Eng", position: "PE Tech", papercardStatus: "OK", approvalStatus: "APPROVED", submittedAt: "07:20", attendanceToday: "Hadir" },
      { id: "l2-5", name: "Dewi Lestari", initials: "DL", employeeId: "QC-204", role: "member", dept: "QC", deptLabel: "Quality Control", position: "IPQC", papercardStatus: "OK", approvalStatus: "APPROVED", submittedAt: "07:32", attendanceToday: "Hadir" },
    ],
    approvalStatus: "APPROVED",
  },
  {
    lineId: "line-3",
    lineName: "Line 3",
    code: "TAC20603",
    workshop: "Assembly Workshop",
    leader: { name: "M. Wildan Firdaus", employeeId: "LDR-003", initials: "WF" },
    supervisor: { name: "Hendra Pratama", employeeId: "SPV-019" },
    shift: "Shift 1",
    members: [
      { id: "l3-1", name: "M. Wildan Firdaus", initials: "WF", employeeId: "LDR-003", role: "leader", dept: "PROD", deptLabel: "Leader", position: "Line Leader", papercardStatus: "OK", approvalStatus: "PENDING_APPROVAL", submittedAt: "07:44", attendanceToday: "Hadir" },
      { id: "l3-2", name: "Surya Kencana", initials: "SK", employeeId: "PRD-301", role: "member", dept: "PROD", deptLabel: "Produksi", position: "Operator", papercardStatus: "OK", approvalStatus: "PENDING_APPROVAL", submittedAt: "07:40", attendanceToday: "Hadir" },
      { id: "l3-3", name: "Bambang Pamungkas", initials: "BP", employeeId: "ME-302", role: "member", dept: "ME", deptLabel: "Maintenance", position: "ME Tech", papercardStatus: "OK", approvalStatus: "PENDING_APPROVAL", submittedAt: "07:39", attendanceToday: "Hadir" },
      { id: "l3-4", name: "Rizky Ramadhan", initials: "RR", employeeId: "PE-303", role: "member", dept: "PE", deptLabel: "Process Eng", position: "PE Tech", papercardStatus: "OK", approvalStatus: "PENDING_APPROVAL", submittedAt: "07:35", attendanceToday: "Hadir" },
      { id: "l3-5", name: "Nadia Utami", initials: "NU", employeeId: "QC-304", role: "member", dept: "QC", deptLabel: "Quality Control", position: "IPQC", papercardStatus: "OK", approvalStatus: "PENDING_APPROVAL", submittedAt: "07:41", attendanceToday: "Hadir" },
    ],
    approvalStatus: "PENDING",
  },
  {
    lineId: "line-4",
    lineName: "Line 4",
    code: "TAC20604",
    workshop: "Assembly Workshop",
    leader: { name: "Rudiyansyah", employeeId: "LDR-004", initials: "RY" },
    supervisor: { name: "Hendra Pratama", employeeId: "SPV-019" },
    shift: "Shift 1",
    members: [
      { id: "l4-1", name: "Rudiyansyah", initials: "RY", employeeId: "LDR-004", role: "leader", dept: "PROD", deptLabel: "Leader", position: "Line Leader", papercardStatus: "OK", approvalStatus: "APPROVED", submittedAt: "07:22", attendanceToday: "Hadir" },
      { id: "l4-2", name: "Heri Susanto", initials: "HS", employeeId: "PRD-401", role: "member", dept: "PROD", deptLabel: "Produksi", position: "Operator", papercardStatus: "OK", approvalStatus: "APPROVED", submittedAt: "07:20", attendanceToday: "Hadir" },
      { id: "l4-3", name: "Eko Prasetyo", initials: "EP", employeeId: "ME-402", role: "member", dept: "ME", deptLabel: "Maintenance", position: "ME Tech", papercardStatus: "OK", approvalStatus: "APPROVED", submittedAt: "07:18", attendanceToday: "Hadir" },
      { id: "l4-4", name: "Yusuf Mansur", initials: "YM", employeeId: "PE-403", role: "member", dept: "PE", deptLabel: "Process Eng", position: "PE Tech", papercardStatus: "OK", approvalStatus: "APPROVED", submittedAt: "07:24", attendanceToday: "Hadir" },
      { id: "l4-5", name: "Tika Kartika", initials: "TK", employeeId: "QC-404", role: "member", dept: "QC", deptLabel: "Quality Control", position: "IPQC", papercardStatus: "OK", approvalStatus: "APPROVED", submittedAt: "07:26", attendanceToday: "Hadir" },
    ],
    approvalStatus: "APPROVED",
  },
];


type Overrides = Partial<Record<RoleKey, PapercardStatus>>;

// days-ago -> status overrides (everything else is OK)
const OVERRIDES: Record<number, Overrides> = {
  0: { pe: "NG" },
  4: { ipqc: "PENDING" },
  5: { me: "LIBUR" },
  12: { pe: "PENDING" },
  19: { leader: "NG" },
  27: { ipqc: "PENDING", me: "PENDING" },
  33: { pe: "LIBUR" },
};

function buildRow(daysAgo: number): InspectionRow {
  const date = addDays(MOCK_TODAY, -daysAgo);
  const statuses: Record<RoleKey, PapercardStatus> = {
    leader: "OK",
    me: "OK",
    pe: "OK",
    ipqc: "OK",
    ...OVERRIDES[daysAgo],
  };
  const all = Object.values(statuses);
  return {
    id: `${LEADER_LINE}-${date}`,
    date,
    line: LEADER_LINE,
    type: "Nairobi-N",
    statuses,
    total: all.filter((s) => s !== "LIBUR").length,
    submitted: all.filter((s) => s === "OK" || s === "NG").length,
  };
}

export const MOCK_ROWS: InspectionRow[] = Array.from({ length: 42 }, (_, i) => buildRow(i));

export const OTHER_KPIS = [
  { id: "ontime", title: "Papercard tepat waktu", value: 94, icon: "clipboard" as const },
  { id: "abnormal", title: "Penanganan abnormal tepat waktu", value: 86, icon: "alert" as const },
  { id: "closure", title: "Closure rate masalah meeting", value: 91, icon: "check" as const },
];

export const TIME_SHARES: TimeShare[] = [
  { label: "Pre-Management", value: 64, target: 60, mode: "min", targetText: "target ≥ 60%" },
  { label: "During-Management", value: 19, target: 20, mode: "approx", targetText: "target ≈ 20%" },
  { label: "Post-Management", value: 17, target: 20, mode: "max", targetText: "target ≤ 20%" },
];

export const SESSIONS: SessionItem[] = [
  { id: "pre", order: 1, time: "07:45–08:00", name: "Pre-Management", status: "done" },
  { id: "during-1", order: 2, time: "10:00", name: "During-Management 1", status: "live" },
  { id: "during-2", order: 3, time: "14:00", name: "During-Management 2", status: "upcoming" },
  { id: "post", order: 4, time: "16:00", name: "Post-Management", status: "upcoming" },
];
