import type { PicAreaKey } from "@/components/providers/RoleProvider";
import type { FiveWhy, NotAchieved } from "@/types/morningMeeting";
import { dateOffset } from "@/features/morning-meeting/aiFollowupData";

export type NotAchievedItem = NotAchieved & { area: PicAreaKey; period: string; attachmentLabel: string };

export const notAchievedItems: NotAchievedItem[] = [
  { id: "na-e2e-jul", kpiId: "end-to-end-delivery-time", tanggal: "2026-07-01", period: "Juli 2026", problem: "End-to-End Delivery Time melewati T1", reason: "Lead time Juli melonjak dan perlu keputusan lintas area.", countermeasure: "Kunci prioritas material, clearance, dan slot produksi harian.", dueDate: dateOffset(2), pic: "ALVIN CHANDRA", status: "in-progress", lampiran: ["e2e-juli.png"], attachmentLabel: "Screenshot trend E2E Juli", area: "assembly" },
  { id: "na-losses-jun", kpiId: "losses-material", tanggal: "2026-06-01", period: "Juni 2026", problem: "Losses Material melewati T1", reason: "Losses naik ke zona merah pada Juni.", countermeasure: "Audit scrap dan transaksi gudang untuk top material loss.", dueDate: dateOffset(-1), pic: "RICKHY LADIANSYAH", status: "open", lampiran: ["losses-juni.png"], attachmentLabel: "Foto audit material Juni", area: "material" },
  { id: "na-losses-jul", kpiId: "losses-material", tanggal: "2026-07-01", period: "Juli 2026", problem: "Losses Material tetap merah", reason: "Recovery Juni belum cukup menurunkan aktual Juli.", countermeasure: "Daily review abnormal material dan owner shift.", dueDate: dateOffset(3), pic: "RICKHY LADIANSYAH", status: "in-progress", lampiran: ["losses-juli.png"], attachmentLabel: "Log material abnormal Juli", area: "material" },
  { id: "na-slc-mar", kpiId: "single-labor-cost", tanggal: "2026-03-01", period: "Maret 2026", problem: "Single Labor Cost Maret abnormal", reason: "Rasio Maret menjadi outlier dan melewati T1.", countermeasure: "Rekonsiliasi manpower plan, actual output, dan line balancing.", dueDate: dateOffset(1), pic: "REYNARD", status: "in-progress", lampiran: ["slc-maret.png"], attachmentLabel: "Worksheet SLC Maret", area: "cost" },
  { id: "na-ngp-mar", kpiId: "ngp", tanggal: "2026-03-01", period: "Maret 2026", problem: "NGP Maret melewati target", reason: "NGP Maret masuk zona merah dan perlu pareto NG.", countermeasure: "Review top NG bersama QC dan owner proses.", dueDate: dateOffset(4), pic: "SOLI", status: "in-progress", lampiran: ["ngp-maret.png"], attachmentLabel: "Pareto NG Maret", area: "qc" },
];

export const fiveWhyExamples: Record<string, FiveWhy[]> = {
  "na-e2e-jul": [
    { id: "fw-e2e-teknis", notAchievedId: "na-e2e-jul", jalur: "teknis", why1: "Lead time Juli melewati T1.", why2: "Material prioritas belum clear tepat waktu.", why3: "Daftar model prioritas berubah saat produksi berjalan.", why4: "Koordinasi material dan produksi belum punya cut-off harian.", why5: "Belum ada owner tunggal untuk keputusan prioritas E2E.", foto: ["mock-e2e-1.jpg", "mock-e2e-2.jpg"], solusiJangkaPendek: "Tetapkan war room E2E harian sampai aktual turun di bawah T1.", kesimpulan: "E2E perlu keputusan prioritas lintas area dan follow-up harian." },
    { id: "fw-e2e-manajemen", notAchievedId: "na-e2e-jul", jalur: "manajemen", why1: "Eskalasi terlambat saat tren mulai merah.", why2: "Countermeasure belum langsung menjadi task dengan due date.", why3: "PIC lintas area belum punya ritme review yang sama.", why4: "Meeting fokus pada status, bukan keputusan bottleneck.", why5: "Belum ada aturan eskalasi H+3 untuk KPI merah.", foto: ["mock-e2e-mgmt.jpg"], solusiJangkaPendek: "Host membuat follow-up lintas area dan HOD memutuskan prioritas material.", kesimpulan: "Perlu mekanisme eskalasi otomatis untuk KPI merah E2E." },
  ],
  "na-losses-jun": [
    { id: "fw-losses-teknis", notAchievedId: "na-losses-jun", jalur: "teknis", why1: "Losses Material Juni melewati T1.", why2: "Scrap dan adjustment material meningkat.", why3: "Top material loss belum diaudit per shift.", why4: "Transaksi gudang abnormal belum ditutup harian.", why5: "Kontrol visual losses belum menjadi standar area.", foto: ["mock-losses-1.jpg", "mock-losses-2.jpg"], solusiJangkaPendek: "Audit top material loss harian dan kunci owner countermeasure.", kesimpulan: "Losses Material butuh kontrol scrap, transaksi gudang, dan audit shift." },
    { id: "fw-losses-manajemen", notAchievedId: "na-losses-jun", jalur: "manajemen", why1: "Countermeasure losses belum konsisten dieksekusi.", why2: "Owner action berbeda antara produksi dan material.", why3: "Due date follow-up tidak terlihat di meeting berikutnya.", why4: "Belum ada eskalasi untuk losses berulang.", why5: "Decision maker belum melihat daftar item prioritas losses.", foto: ["mock-losses-mgmt.jpg"], solusiJangkaPendek: "Jadikan top losses sebagai follow-up meeting sampai status kembali kuning/hijau.", kesimpulan: "Perlu satu owner recovery dan review harian sampai losses turun." },
  ],
};

export function getNotAchievedForKpi(kpiId: string): NotAchievedItem[] {
  return notAchievedItems.filter((item) => item.kpiId === kpiId);
}

export function getNotAchievedForArea(area: PicAreaKey): NotAchievedItem[] {
  return notAchievedItems.filter((item) => item.area === area);
}
