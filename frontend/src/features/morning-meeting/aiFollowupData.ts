import type { PicAreaKey } from "@/components/providers/RoleProvider";
import type { Role } from "@/types/morningMeeting";
import { standardPics } from "@/data/morningMeetingMasterData";
import { productionKpiActualRows, type ProductionKpiActualRow } from "@/data/morningMeetingActualData";
import { formatKpiValue, getExceptionInsights, getKpiInsights, kpiAreaMap } from "@/features/morning-meeting/morningMeetingUtils";

export type AiWarning = { title: string; body: string; severity: "merah" | "kuning"; target: string };
export type FollowupTask = { id: string; task: string; output: string; pic: string; area: PicAreaKey; dueDate: string; status: "Selesai" | "Berjalan" | "Overdue"; assigneeRole?: Role; source: string };
export type AppNotification = { id: string; title: string; body: string; target: string; role: "all" | Role; area?: PicAreaKey; severity: "merah" | "kuning" | "hijau" };

const dayMs = 24 * 60 * 60 * 1000;

export function dateOffset(days: number): string {
  return new Date(Date.now() + days * dayMs).toISOString().slice(0, 10);
}

export function getAiWarnings(): AiWarning[] {
  return getExceptionInsights().slice(0, 3).map((item) => ({ title: item.row.kpi.nama, body: item.reason, severity: item.status === "merah" ? "merah" : "kuning", target: "Production KPI" }));
}

export function getActionPlan(row: ProductionKpiActualRow) {
  const latest = row.monthly["2026-07"];
  const base = { title: row.kpi.nama, summary: `${row.kpi.nama} Juli 2026 berada di ${formatKpiValue(row.kpi, latest)}. Panel ini adalah simulasi rekomendasi, keputusan tetap oleh manusia.`, causes: ["Perubahan beban kerja lintas area belum stabil.", "Data harian menunjukkan variasi yang perlu dikunci lewat review PIC.", "Countermeasure belum dikonversi menjadi follow-up dengan due date."], actions: [`Validasi akar masalah bersama ${row.pic ?? row.kpi.picUtama}.`, "Buat follow-up harian sampai status kembali hijau.", "Review target T1/T2 dalam meeting pagi berikutnya."], pic: row.pic ?? row.kpi.picUtama };
  if (row.kpi.id === "end-to-end-delivery-time") return { ...base, causes: ["Antrian material dan clearance mendorong lead time melewati T1.", "Lonjakan Juli jauh di atas pola Jan-Jun sehingga perlu eskalasi lintas area.", "WO close sudah hijau tetapi belum cukup menahan E2E delivery."], actions: ["Freeze daftar model prioritas dan owner clearance hari ini.", "Buka war room material sampai lead time turun di bawah T1.", "Minta keputusan HOD untuk prioritas supply dan slot produksi."], pic: "ALVIN CHANDRA" };
  if (row.kpi.id === "losses-material") return { ...base, causes: ["Losses Material merah sejak Juni dan tetap merah pada Juli.", "Tren Jan-Mar sempat memburuk sebelum melewati batas.", "Kontrol scrap dan transaksi gudang perlu audit ulang."], actions: ["Audit top material loss harian dengan RICKHY.", "Kunci countermeasure scrap dan owner shift.", "Laporkan status recovery di meeting berikutnya."], pic: "RICKHY LADIANSYAH" };
  if (row.kpi.id === "single-labor-cost") return { ...base, causes: ["SLC Maret menjadi outlier tertinggi dalam Jan-Jul.", "Output dan manpower belum seimbang pada periode spike.", "Perlu validasi perhitungan rasio dari sumber Excel."], actions: ["Bandingkan manpower plan vs actual untuk periode spike.", "Pisahkan action ECRS dan balancing line.", "Tentukan PIC validasi data SLC sebelum review berikutnya."], pic: "ALVIN CHANDRA / REYNARD" };
  if (row.kpi.id === "oqc-defect-rate") return { ...base, causes: ["OQC masih kuning sepanjang beberapa bulan walau belum merah.", "Defect rate berada di atas T2 sehingga perlu early warning.", "Perlu drill-down model dan defect type dari area QC."], actions: ["Prioritaskan pareto defect OQC minggu ini.", "Hubungkan action QC dengan Pre Assembly dan Packing.", "Review efektivitas countermeasure setelah 3 hari."], pic: "SOLI" };
  return base;
}

export function getInitialFollowups(): FollowupTask[] {
  return [
    { id: "fu-e2e", task: "Turunkan E2E Delivery Juli", output: "Daftar bottleneck material dan keputusan prioritas", pic: "ALVIN CHANDRA", area: "assembly", dueDate: dateOffset(-2), status: "Overdue", assigneeRole: "HOD", source: "E2E Delivery merah" },
    { id: "fu-losses-jun", task: "Audit Losses Material Juni", output: "Countermeasure scrap material", pic: "RICKHY LADIANSYAH", area: "material", dueDate: dateOffset(-1), status: "Overdue", source: "Losses Material merah" },
    { id: "fu-losses-jul", task: "Recovery Losses Material Juli", output: "Losses harian turun menuju T1", pic: "RICKHY LADIANSYAH", area: "material", dueDate: dateOffset(2), status: "Berjalan", source: "Losses Material merah" },
    { id: "fu-slc", task: "Validasi Single Labor Cost Maret", output: "Rekonsiliasi manpower dan output", pic: "REYNARD", area: "cost", dueDate: dateOffset(1), status: "Berjalan", source: "SLC Maret abnormal" },
    { id: "fu-ngp", task: "Review NGP Maret", output: "Pareto NG dan action QC", pic: "SOLI", area: "qc", dueDate: dateOffset(3), status: "Berjalan", source: "NGP Maret merah" },
    { id: "fu-oqc", task: "Pareto OQC defect", output: "Top defect dan owner action", pic: "SOLI", area: "qc", dueDate: dateOffset(0), status: "Berjalan", source: "OQC kuning" },
    { id: "fu-smed", task: "Eskalasi SMED di atas 6H", output: "Plan Lean support", pic: "FAJRUL AL HUDA", area: "assembly", dueDate: dateOffset(-3), status: "Overdue", assigneeRole: "HOD", source: "SMED off-track" },
  ];
}

export function getNotifications(role: Role, picArea: PicAreaKey): AppNotification[] {
  const red = getKpiInsights().filter((item) => item.status === "merah");
  const base: AppNotification[] = [
    ...red.slice(0, 3).map((item) => ({ id: `notif-${item.row.kpi.id}`, title: `${item.row.kpi.nama} merah`, body: item.reason, target: "Production KPI", role: "all" as const, area: kpiAreaMap[item.row.kpi.id], severity: "merah" as const })),
    { id: "notif-d1", title: "PIC belum input H-1", body: "Simulasi disiplin data untuk area dengan follow-up berjalan.", target: "Followup", role: "all", area: picArea, severity: "kuning" },
    { id: "notif-d4", title: "Follow-up overdue", body: "Ada task E2E dan SMED melewati due date.", target: "Followup", role: "all", severity: "merah" },
    { id: "notif-d5", title: "Butuh keputusan HOD", body: "KPI merah tanpa countermeasure final perlu eskalasi.", target: "Beranda Meeting", role: "HOD", severity: "merah" },
  ];
  return base.filter((item) => (item.role === "all" || item.role === role) && (role !== "PIC Area" || !item.area || item.area === picArea) && (role !== "HOD" || item.severity === "merah"));
}

export function answerRobotQuestion(question: string): string {
  const red = getKpiInsights().filter((item) => item.status === "merah");
  if (question.includes("KPI apa")) return `KPI merah Juli 2026: ${red.map((item) => item.row.kpi.nama).join(", ")}.`;
  if (question.includes("Losses Material")) {
    const row = productionKpiActualRows.find((item) => item.kpi.id === "losses-material")!;
    const avg = ((row.monthly["2026-05"]! + row.monthly["2026-06"]! + row.monthly["2026-07"]!) / 3).toLocaleString("id-ID", { maximumFractionDigits: 2 });
    return `Rata-rata Losses Material 3 bulan terakhir adalah ${avg}.`;
  }
  if (question.includes("End-to-End")) return "Simulasi: E2E Delivery Juli naik karena kombinasi bottleneck material, clearance, dan prioritas produksi yang belum dikunci.";
  if (question.includes("baret logo")) return "Simulasi: gunakan jig pelindung, inspeksi visual sebelum packing, pisahkan part rawan gesek, dan audit handling operator.";
  if (question.includes("Ringkas")) return `Ringkasan data: ${red.length} KPI merah, ${getExceptionInsights().length} eksepsi KPI, dan follow-up overdue perlu diprioritaskan.`;
  return "Ini simulasi P-AI Robot. Pilih salah satu chip pertanyaan agar jawaban berbasis data prototype lebih akurat.";
}

export { standardPics };
