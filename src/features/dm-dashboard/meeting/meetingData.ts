export type DmChecklistItem = { id: string; label: string };

export type DmMeeting = { number: number; startedAt: string; endedAt: string | null };

export type DmAttendance = { meeting: number; at: string };

export type DmChecklistRecord = { at: string; by: string; doneIds: readonly string[] };

export type DmAttendanceRecord = {
  id: string;
  name: string;
  employeeId: string;
  role: string;
  photoUrl?: string;
  date: string; // YYYY-MM-DD
  meeting: number; // 1: Pre, 2: During, 3: Post
  time: string;
  status: "Hadir" | "Terlambat" | "Izin";
};

export const DM_ATTENDANCE_STORAGE_KEY = "dm_dashboard_attendance_history";

export const initialAttendanceRecords: readonly DmAttendanceRecord[] = [
  // Today (2026-10-11)
  { id: "att-1", name: "ALIF MAULANA", employeeId: "I000126", role: "Leader Produksi", photoUrl: "/assets/dm/alif-maulana.png", date: "2026-10-11", meeting: 1, time: "07:05", status: "Hadir" },
  { id: "att-2", name: "MAULANA I. ARIF", employeeId: "LB231792", role: "PE Technician", photoUrl: "/assets/dm/maulana-arif.png", date: "2026-10-11", meeting: 1, time: "07:10", status: "Hadir" },
  { id: "att-3", name: "ASHABUL KAHFI", employeeId: "10000971", role: "QE Technician", photoUrl: "/assets/dm/ashabul-kahfi.png", date: "2026-10-11", meeting: 1, time: "07:12", status: "Hadir" },
  { id: "att-4", name: "FIKRI AKBAR", employeeId: "10004132", role: "ME Technician", photoUrl: "/assets/dm/fikri-akbar.png", date: "2026-10-11", meeting: 1, time: "07:14", status: "Hadir" },
  { id: "att-5", name: "ALIF MAULANA", employeeId: "I000126", role: "Leader Produksi", photoUrl: "/assets/dm/alif-maulana.png", date: "2026-10-11", meeting: 2, time: "11:28", status: "Hadir" },
  { id: "att-6", name: "MAULANA I. ARIF", employeeId: "LB231792", role: "PE Technician", photoUrl: "/assets/dm/maulana-arif.png", date: "2026-10-11", meeting: 2, time: "11:30", status: "Hadir" },
  { id: "att-7", name: "ASHABUL KAHFI", employeeId: "10000971", role: "QE Technician", photoUrl: "/assets/dm/ashabul-kahfi.png", date: "2026-10-11", meeting: 2, time: "11:31", status: "Hadir" },
  { id: "att-8", name: "FIKRI AKBAR", employeeId: "10004132", role: "ME Technician", photoUrl: "/assets/dm/fikri-akbar.png", date: "2026-10-11", meeting: 2, time: "11:33", status: "Hadir" },

  // Yesterday (2026-10-10)
  { id: "att-9", name: "ALIF MAULANA", employeeId: "I000126", role: "Leader Produksi", photoUrl: "/assets/dm/alif-maulana.png", date: "2026-10-10", meeting: 1, time: "07:08", status: "Hadir" },
  { id: "att-10", name: "MAULANA I. ARIF", employeeId: "LB231792", role: "PE Technician", photoUrl: "/assets/dm/maulana-arif.png", date: "2026-10-10", meeting: 1, time: "07:12", status: "Hadir" },
  { id: "att-11", name: "ASHABUL KAHFI", employeeId: "10000971", role: "QE Technician", photoUrl: "/assets/dm/ashabul-kahfi.png", date: "2026-10-10", meeting: 1, time: "07:14", status: "Hadir" },
  { id: "att-12", name: "FIKRI AKBAR", employeeId: "10004132", role: "ME Technician", photoUrl: "/assets/dm/fikri-akbar.png", date: "2026-10-10", meeting: 1, time: "07:15", status: "Hadir" },
  { id: "att-13", name: "ALIF MAULANA", employeeId: "I000126", role: "Leader Produksi", photoUrl: "/assets/dm/alif-maulana.png", date: "2026-10-10", meeting: 2, time: "11:30", status: "Hadir" },
  { id: "att-14", name: "MAULANA I. ARIF", employeeId: "LB231792", role: "PE Technician", photoUrl: "/assets/dm/maulana-arif.png", date: "2026-10-10", meeting: 2, time: "11:31", status: "Hadir" },
  { id: "att-15", name: "ASHABUL KAHFI", employeeId: "10000971", role: "QE Technician", photoUrl: "/assets/dm/ashabul-kahfi.png", date: "2026-10-10", meeting: 2, time: "11:33", status: "Hadir" },
  { id: "att-16", name: "FIKRI AKBAR", employeeId: "10004132", role: "ME Technician", photoUrl: "/assets/dm/fikri-akbar.png", date: "2026-10-10", meeting: 2, time: "11:35", status: "Hadir" },
  { id: "att-17", name: "ALIF MAULANA", employeeId: "I000126", role: "Leader Produksi", photoUrl: "/assets/dm/alif-maulana.png", date: "2026-10-10", meeting: 3, time: "16:02", status: "Hadir" },
  { id: "att-18", name: "MAULANA I. ARIF", employeeId: "LB231792", role: "PE Technician", photoUrl: "/assets/dm/maulana-arif.png", date: "2026-10-10", meeting: 3, time: "16:04", status: "Hadir" },
  { id: "att-19", name: "ASHABUL KAHFI", employeeId: "10000971", role: "QE Technician", photoUrl: "/assets/dm/ashabul-kahfi.png", date: "2026-10-10", meeting: 3, time: "16:05", status: "Hadir" },
  { id: "att-20", name: "FIKRI AKBAR", employeeId: "10004132", role: "ME Technician", photoUrl: "/assets/dm/fikri-akbar.png", date: "2026-10-10", meeting: 3, time: "16:07", status: "Hadir" },

  // 2026-10-09
  { id: "att-21", name: "ALIF MAULANA", employeeId: "I000126", role: "Leader Produksi", photoUrl: "/assets/dm/alif-maulana.png", date: "2026-10-09", meeting: 1, time: "07:11", status: "Hadir" },
  { id: "att-22", name: "MAULANA I. ARIF", employeeId: "LB231792", role: "PE Technician", photoUrl: "/assets/dm/maulana-arif.png", date: "2026-10-09", meeting: 1, time: "07:12", status: "Hadir" },
  { id: "att-23", name: "ASHABUL KAHFI", employeeId: "10000971", role: "QE Technician", photoUrl: "/assets/dm/ashabul-kahfi.png", date: "2026-10-09", meeting: 1, time: "07:15", status: "Hadir" },
  { id: "att-24", name: "FIKRI AKBAR", employeeId: "10004132", role: "ME Technician", photoUrl: "/assets/dm/fikri-akbar.png", date: "2026-10-09", meeting: 1, time: "07:16", status: "Hadir" },
  { id: "att-25", name: "ALIF MAULANA", employeeId: "I000126", role: "Leader Produksi", photoUrl: "/assets/dm/alif-maulana.png", date: "2026-10-09", meeting: 2, time: "11:29", status: "Hadir" },
  { id: "att-26", name: "MAULANA I. ARIF", employeeId: "LB231792", role: "PE Technician", photoUrl: "/assets/dm/maulana-arif.png", date: "2026-10-09", meeting: 2, time: "11:30", status: "Hadir" },
  { id: "att-27", name: "ASHABUL KAHFI", employeeId: "10000971", role: "QE Technician", photoUrl: "/assets/dm/ashabul-kahfi.png", date: "2026-10-09", meeting: 2, time: "11:32", status: "Hadir" },
  { id: "att-28", name: "FIKRI AKBAR", employeeId: "10004132", role: "ME Technician", photoUrl: "/assets/dm/fikri-akbar.png", date: "2026-10-09", meeting: 2, time: "11:34", status: "Hadir" },
  { id: "att-29", name: "ALIF MAULANA", employeeId: "I000126", role: "Leader Produksi", photoUrl: "/assets/dm/alif-maulana.png", date: "2026-10-09", meeting: 3, time: "16:01", status: "Hadir" },
  { id: "att-30", name: "MAULANA I. ARIF", employeeId: "LB231792", role: "PE Technician", photoUrl: "/assets/dm/maulana-arif.png", date: "2026-10-09", meeting: 3, time: "16:03", status: "Hadir" },
  { id: "att-31", name: "ASHABUL KAHFI", employeeId: "10000971", role: "QE Technician", photoUrl: "/assets/dm/ashabul-kahfi.png", date: "2026-10-09", meeting: 3, time: "16:05", status: "Hadir" },
  { id: "att-32", name: "FIKRI AKBAR", employeeId: "10004132", role: "ME Technician", photoUrl: "/assets/dm/fikri-akbar.png", date: "2026-10-09", meeting: 3, time: "16:08", status: "Hadir" },
];

export const dmMeetingsPerDay = 3;

export const dmMeetingLabels: readonly string[] = ["Pre", "During", "Post"];

export function getMeetingLabel(number: number): string {
  return dmMeetingLabels[number - 1] ?? `Meeting ${number}`;
}

export const dmMorningUntilHour = 12;

export const dmChecklist: readonly DmChecklistItem[] = [
  { id: "item-1", label: "Item checklist 1 (belum diisi)" },
  { id: "item-2", label: "Item checklist 2 (belum diisi)" },
  { id: "item-3", label: "Item checklist 3 (belum diisi)" },
];

export function clock(date: Date) {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function isMorning(date: Date) {
  return date.getHours() < dmMorningUntilHour;
}
