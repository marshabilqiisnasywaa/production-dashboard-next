export type ClearanceTab = "Ringkasan" | "Persiapan & Tracking" | "Riwayat" | "Kerugian Material";

export type MaterialOverviewCard = {
  key: "clearance" | "total-clearance" | "wo-close" | "new-model";
  label: string;
  value: string;
  target: string;
  tone: "danger" | "primary" | "neutral";
  note: string;
  page: "material-clearance" | "material-clearance" | "material-woclose" | "material-new-model";
};

export const materialOverviewCards: MaterialOverviewCard[] = [
  { key: "clearance", label: "Clearance Sekali Habis", value: "39%", target: "Target 98%", tone: "danger", note: "Off Target", page: "material-clearance" },
  { key: "total-clearance", label: "Total Clearance", value: "56", target: "Target 65", tone: "neutral", note: "Dalam pengawasan", page: "material-clearance" },
  { key: "wo-close", label: "On-time Closing Rate WO", value: "98.30%", target: "Target 95.00%", tone: "primary", note: "On target", page: "material-woclose" },
  { key: "new-model", label: "New Model Progress", value: "74%", target: "Target 80%", tone: "neutral", note: "Progres berjalan", page: "material-new-model" },
];

export const clearanceSummaryKpis = [
  { label: "Total Clearance", value: 56, target: "Target 60" },
  { label: "Sekali Habis", value: "39%", target: "Target 98%", tone: "danger" },
  { label: "Model dengan Clearance Berulang", value: 15, target: "Target 12" },
  { label: "Waktu Clearance", value: "13/13", target: "Di atas target" },
];

export const clearanceFrequencyData = [
  { model: "RMX3930", value: 3 },
  { model: "RMX5070", value: 3 },
  { model: "RMX5078", value: 3 },
  { model: "Changjiang", value: 2 },
  { model: "Whoopass S1", value: 2 },
  { model: "Moscow B", value: 2 },
  { model: "Whoopass S3", value: 2 },
  { model: "Madrid", value: 2 },
  { model: "Alpha L4", value: 2 },
  { model: "Others", value: 1 },
];

export const materialHandlingDonut = [
  { name: "Transfer ke Danghuan", value: 27, color: "var(--primary)" },
  { name: "Clearance ke-2", value: 20, color: "var(--accent-teal)" },
  { name: "Clearance ke-3", value: 3, color: "var(--accent-amber)" },
  { name: "Tidak masalah", value: 6, color: "var(--accent-slate)" },
];

export const dominantIssueData = [
  { cause: "NG Airtightness (PE)", value: 2 },
  { cause: "Delay Kedatangan Material (PMC)", value: 0 },
  { cause: "Preparation (Produksi)", value: 0 },
];

export const clearanceTimeData = [
  { model: "Zhuque S2", target: 3, actual: 4 },
  { model: "Chopard A", target: 8, actual: 10 },
  { model: "Zhuque S3", target: 4, actual: 5 },
  { model: "ORIS A", target: 5.5, actual: 6 },
  { model: "Baikal L4", target: 5, actual: 6 },
  { model: "Baikal L5", target: 5, actual: 6.5 },
  { model: "Latte K", target: 8, actual: 9 },
  { model: "IWC", target: 4.5, actual: 5 },
  { model: "Mumbai B", target: 8, actual: 10 },
  { model: "Latte T", target: 8, actual: 8.5 },
  { model: "Changjiang", target: 2, actual: 3 },
  { model: "Whoopass S1", target: 9, actual: 10 },
  { model: "Moscow B", target: 9, actual: 11 },
];

export const monthlyClearanceData = [
  { month: "Jan", yes: 14, no: 6 },
  { month: "Feb", yes: 18, no: 8 },
  { month: "Mar", yes: 12, no: 10 },
  { month: "Apr", yes: 10, no: 4 },
];

export const prepChecklistRows = [
  { line: "Moscow A RMX5555", startDate: "2026-01-02", finishDate: "2026-01-08", planQty: 14240, pic: "R. Satria", status: "On time" },
  { line: "Dhaka A", startDate: "2026-01-05", finishDate: "2026-01-10", planQty: 12640, pic: "F. Rahman", status: "Late" },
  { line: "Zenith", startDate: "2026-01-03", finishDate: "2026-01-09", planQty: 15480, pic: "A. Yusuf", status: "On time" },
  { line: "Baikal B5", startDate: "2026-01-07", finishDate: "2026-01-14", planQty: 13890, pic: "T. Wibowo", status: "Late" },
  { line: "Whoopass S1", startDate: "2026-01-09", finishDate: "2026-01-15", planQty: 13380, pic: "I. Putra", status: "On time" },
  { line: "Whoopass S3", startDate: "2026-01-05", finishDate: "2026-01-12", planQty: 14700, pic: "D. Firmansyah", status: "On time" },
  { line: "Whoopass F4", startDate: "2026-01-11", finishDate: "2026-01-18", planQty: 15620, pic: "H. Tri", status: "Late" },
];

export const trackingClearanceCards = [
  { model: "Whoopass F4 CPH2801", plan: 14480, output: 3930, remaining: 10550, progress: 27, note: "Material BU belum sampai" },
  { model: "Dhaka A CPH2132", plan: 13210, output: 5210, remaining: 8000, progress: 39, note: "Backup material on track" },
  { model: "Zenith CPH4401", plan: 15140, output: 6110, remaining: 9030, progress: 40, note: "Stok OK siap line" },
];

export type HistoryRow = {
  bulan: string;
  model: string;
  tanggalClearance: string;
  target: string;
  sisaPcbOk: number;
  sisaUnit: number;
  penanganan: string;
  sekaliHabis: "YES" | "NO";
  masalah: string;
  penyebab: string;
  countermeasure: string;
  pic: string;
  dueDate: string;
  status: "Open" | "Closed" | "Monitoring";
};

export const clearanceHistoryRows: HistoryRow[] = [
  { bulan: "Jan", model: "RMX3930", tanggalClearance: "2026-01-10", target: "H-2", sisaPcbOk: 120, sisaUnit: 30, penanganan: "Transfer ke Danghuan", sekaliHabis: "YES", masalah: "Stock tidak cukup saat model dihentikan", penyebab: "Lead time material panjang", countermeasure: "Backup material segera dibentuk", pic: "R. Satria", dueDate: "2026-01-13", status: "Closed" },
  { bulan: "Jan", model: "RMX5070", tanggalClearance: "2026-01-15", target: "H-1", sisaPcbOk: 240, sisaUnit: 85, penanganan: "Clearance ke-2", sekaliHabis: "NO", masalah: "Pemakaian model berulang", penyebab: "Repeat clearance", countermeasure: "Monitoring weekly", pic: "F. Rahman", dueDate: "2026-01-17", status: "Monitoring" },
  { bulan: "Feb", model: "RMX5078", tanggalClearance: "2026-02-03", target: "H-2", sisaPcbOk: 180, sisaUnit: 45, penanganan: "Transfer ke Danghuan", sekaliHabis: "YES", masalah: "Jumlah akhir model turun tajam", penyebab: "Demand turun", countermeasure: "Review forecast", pic: "A. Yusuf", dueDate: "2026-02-06", status: "Closed" },
  { bulan: "Mar", model: "Moscow B", tanggalClearance: "2026-03-02", target: "H-3", sisaPcbOk: 90, sisaUnit: 12, penanganan: "Transfer ke Danghuan", sekaliHabis: "YES", masalah: "Material siap line belum terkumpul", penyebab: "Kendala pemilahan gudang", countermeasure: "Pengecekan kualitas gudang", pic: "T. Wibowo", dueDate: "2026-03-04", status: "Open" },
];

export const lossByDepartment = [
  { name: "China", value: 180702, color: "var(--primary)" },
  { name: "PE", value: 145978, color: "var(--accent-teal)" },
  { name: "Produksi", value: 41193, color: "var(--accent-amber)" },
];

export const goodMaterialScrapData = [
  { month: "Jan", actual: 42.58, target: 32 },
  { month: "Feb", actual: 11.39, target: 22 },
  { month: "Mar", actual: 4.48, target: 18 },
  { month: "Apr", actual: 0, target: 12 },
];

export const progressHandlingData = [
  { model: "Return China", value: 22 },
  { model: "Scrap", value: 14 },
  { model: "Waimai", value: 7 },
  { model: "Danghuan", value: 12 },
  { model: "Belum Selesai", value: 11 },
];

export const lossModelRows = [
  { model: "RMX3930", idleQty: 128, idlePrice: 38000, lossUnit: "12.0", status: "Open" },
  { model: "RMX5070", idleQty: 96, idlePrice: 24000, lossUnit: "8.5", status: "Monitoring" },
  { model: "Moscow B", idleQty: 63, idlePrice: 18000, lossUnit: "6.2", status: "Closed" },
];

export const actionPlanRows = [
  { pic: "P. Hardi", dept: "PE", dueDate: "2026-03-16", status: "On track" },
  { pic: "S. Gunawan", dept: "Produksi", dueDate: "2026-03-18", status: "Pending" },
  { pic: "R. Satria", dept: "PMC", dueDate: "2026-03-20", status: "On track" },
  { pic: "A. Yusuf", dept: "QA", dueDate: "2026-03-21", status: "Monitoring" },
];

export const newModelRows = [
  { model: "RMX5555", launch: "2026-04-18", progress: 68, pic: "T. Arya", status: "On track" },
  { model: "Zenith", launch: "2026-04-19", progress: 82, pic: "A. Dani", status: "Completed" },
  { model: "Whoopass S1", launch: "2026-04-22", progress: 40, pic: "R. Indra", status: "Delayed" },
  { model: "Baikal B5", launch: "2026-04-25", progress: 74, pic: "B. Prasetyo", status: "On track" },
];

export const newModelMilestones = [
  "Meeting Backup Material",
  "Meeting Internal",
  "Material Backup Tiba",
  "Pemilahan Gudang",
  "Cek QC Workshop",
  "Repair",
  "Validasi Stok",
  "Material Terkumpul",
  "Serah Terima ke Line",
  "QMS & Trial",
];
