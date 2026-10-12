export type KategoriSQCDIP = "S" | "Q" | "C" | "D" | "I" | "P";
export type StatusAbnormal = "Open" | "In Progress" | "Resolved";

export type StatIndikator = { label: string; nilai: string; target: string; baik: boolean };

export const chartMetrik: Record<KategoriSQCDIP, { kpiId: string; label: string }> = {
  S: { kpiId: "battery-safety", label: "Battery Safety" },
  Q: { kpiId: "oqc-defect-rate", label: "OQC Sampling Defect Rate" },
  C: { kpiId: "single-labor-cost", label: "Single Labor Cost (SLC)" },
  D: { kpiId: "end-to-end-delivery-time", label: "End-to-End Delivery Time" },
  I: { kpiId: "__wip", label: "WIP Pre-Assembly" },
  P: { kpiId: "upph", label: "UPPH" },
};

export function buildSqcdipStats(nilai: (kpiId: string) => string, isHijau: (kpiId: string) => boolean): Record<KategoriSQCDIP, StatIndikator[]> {
  return {
    S: [
      { label: "Incident Count", nilai: `${nilai("safety-incident")} kasus`, target: "0 kasus", baik: isHijau("safety-incident") },
      { label: "Battery Safety", nilai: `${nilai("battery-safety")} kasus`, target: "0 kasus", baik: isHijau("battery-safety") },
      { label: "Information Security", nilai: "100%", target: "100% patuh", baik: true },
      { label: "Absensi Rate", nilai: "98,2%", target: "≥ 97%", baik: true },
    ],
    Q: [
      { label: "OQC Sampling Defect Rate", nilai: nilai("oqc-defect-rate"), target: "≤ 1%", baik: isHijau("oqc-defect-rate") },
      { label: "NGP", nilai: nilai("ngp"), target: "≤ 30%", baik: isHijau("ngp") },
      { label: "Component Sorting Rate", nilai: "99,1%", target: "≥ 99%", baik: true },
      { label: "Retur Material 509", nilai: "12 lot", target: "≤ 5 lot", baik: false },
    ],
    C: [
      { label: "Single Labor Cost (SLC)", nilai: nilai("single-labor-cost"), target: "≤ 3,67", baik: isHijau("single-labor-cost") },
      { label: "Material Losses", nilai: nilai("losses-material"), target: "≤ 0,51", baik: isHijau("losses-material") },
      { label: "OPE", nilai: "92%", target: "≥ 95%", baik: false },
      { label: "UPPH", nilai: nilai("upph"), target: "≥ 5,26", baik: isHijau("upph") },
    ],
    D: [
      { label: "End-to-End Delivery Time", nilai: nilai("end-to-end-delivery-time"), target: "≤ 60,45 hari", baik: isHijau("end-to-end-delivery-time") },
      { label: "WO Close Rate (3D)", nilai: nilai("wo-close-3d-on-time"), target: "≥ 98%", baik: isHijau("wo-close-3d-on-time") },
      { label: "Kesiapan New Model", nilai: "78%", target: "≥ 90%", baik: false },
      { label: "Model Clearance Rate", nilai: "98%", target: "≥ 95%", baik: true },
    ],
    I: [
      { label: "WIP Pre-Assembly", nilai: "2.456 pcs", target: "≤ 2.800 pcs", baik: true },
      { label: "WIP Rework", nilai: "890 pcs", target: "≤ 900 pcs", baik: true },
      { label: "WIP Service", nilai: "650 pcs", target: "≤ 700 pcs", baik: true },
      { label: "Material Impact Count", nilai: `${nilai("material-management-impact")} kali`, target: "≤ 3 kali", baik: isHijau("material-management-impact") },
    ],
    P: [
      { label: "Output Attainment Instalasi", nilai: "96%", target: "≥ 95%", baik: true },
      { label: "Output Attainment Packing", nilai: "93%", target: "≥ 95%", baik: false },
      { label: "Changeover Time (SMED)", nilai: nilai("smed"), target: "≤ 6 jam", baik: isHijau("smed") },
      { label: "UPPH", nilai: nilai("upph"), target: "≥ 5,26", baik: isHijau("upph") },
    ],
  };
}

export type HostAbnormality = {
  id: string;
  kategori: KategoriSQCDIP;
  tanggal: string;
  area: string;
  foto: string;
  faktor: string;
  masalah: string;
  akar: string;
  dampak: string;
  solusi: string;
  pic: string;
  penanggungJawab: string;
  dueDate: string;
  status: StatusAbnormal;
  saranAI: string;
};

export const hostAbnormalities: HostAbnormality[] = [
  { id: "ABN-S-01", kategori: "S", tanggal: "2026-10-04", area: "Instalasi", foto: "tray-terbuka.jpg", faktor: "Man", masalah: "Kabel tray terbuka di jalur instalasi", akar: "Penutup tray belum terpasang setelah instalasi", dampak: "Risiko insiden kerja", solusi: "Pasang penutup tray dan kunci baut pengaman", pic: "ALVIN CHANDRA", penanggungJawab: "Tim Instalasi", dueDate: "2026-10-06", status: "Open", saranAI: "Jadwalkan inspeksi tray mingguan dan jadikan checklist serah terima instalasi." },
  { id: "ABN-S-02", kategori: "S", tanggal: "2026-10-05", area: "Gudang Material", foto: "apar-gudang.jpg", faktor: "Material", masalah: "APAR kedaluwarsa di gudang material", akar: "Jadwal refill terlewat satu siklus", dampak: "Risiko temuan audit safety", solusi: "Refill APAR dan pasang label masa berlaku", pic: "IKHWAN HANDOKO", penanggungJawab: "Tim Gudang", dueDate: "2026-10-10", status: "In Progress", saranAI: "Tempel label masa berlaku di tiap APAR dan review bulanan sebelum kedaluwarsa." },
  { id: "ABN-Q-01", kategori: "Q", tanggal: "2026-10-06", area: "Pre-Assembly", foto: "lcd-flicker.jpg", faktor: "Machine", masalah: "LCD flicker setelah proses assembly", akar: "Connector jig aus dan suhu bonding tidak stabil", dampak: "Line Stop 10 Min", solusi: "Ganti connector jig dan kalibrasi ulang heater", pic: "SOLI", penanggungJawab: "Tim Pre-Assembly", dueDate: "2026-10-09", status: "Open", saranAI: "Kalibrasi heater tiap awal shift dan catat suhu bonding pada lembar kontrol." },
  { id: "ABN-Q-02", kategori: "Q", tanggal: "2026-10-06", area: "Rework", foto: "frame-gap.jpg", faktor: "Man", masalah: "Gap frame melebihi toleransi di line rework", akar: "Drift kalibrasi dan variasi handling operator", dampak: "Penumpukan WIP", solusi: "Kalibrasi ulang dan retraining operator", pic: "SOLI", penanggungJawab: "Tim Rework", dueDate: "", status: "In Progress", saranAI: "Standarkan cara pegang frame dan pasang batas toleransi visual di meja rework." },
  { id: "ABN-C-01", kategori: "C", tanggal: "2026-10-05", area: "Produksi Shift 2", foto: "scrap-shift2.jpg", faktor: "Material", masalah: "Scrap material naik di shift 2", akar: "Setting mesin belum dikunci setelah ganti model", dampak: "Biaya scrap naik", solusi: "Kunci parameter dan audit scrap per shift", pic: "RICKHY LADIANSYAH", penanggungJawab: "Tim Produksi", dueDate: "2026-10-08", status: "Open", saranAI: "Audit timbangan scrap harian dan bandingkan dengan output tiap shift." },
  { id: "ABN-C-02", kategori: "C", tanggal: "2026-10-04", area: "Produksi", foto: "overtime-log.jpg", faktor: "Method", masalah: "Pemakaian overtime melebihi anggaran", akar: "Changeover panjang menambah jam lembur", dampak: "OPE turun", solusi: "Percepat SMED dan susun ulang jadwal changeover", pic: "REYNARD", penanggungJawab: "Tim Produksi", dueDate: "2026-10-11", status: "In Progress", saranAI: "Analisis changeover terpanjang minggu ini dan pecah menjadi kerja eksternal." },
  { id: "ABN-D-01", kategori: "D", tanggal: "2026-10-03", area: "Instalasi Lapangan", foto: "instalasi-lapangan.jpg", faktor: "Method", masalah: "Keterlambatan instalasi di lapangan", akar: "Urutan instalasi dan dokumen tidak sinkron", dampak: "Lead time +2 hari", solusi: "Susun ulang urutan dan bagikan checklist terbaru", pic: "ALVIN CHANDRA", penanggungJawab: "Tim Instalasi", dueDate: "2026-10-05", status: "Open", saranAI: "Kirim checklist sehari sebelum instalasi dan konfirmasi kesiapan lokasi." },
  { id: "ABN-D-02", kategori: "D", tanggal: "2026-10-02", area: "Material", foto: "wo-clearance.jpg", faktor: "Material", masalah: "WO close tertunda menunggu clearance", akar: "Satu model belum clearance penuh", dampak: "Antrean WO 1 hari", solusi: "Prioritaskan clearance model yang tertunda", pic: "IRFAN NURCHOLIS", penanggungJawab: "Tim Material", dueDate: "2026-10-06", status: "Resolved", saranAI: "Tetapkan batas clearance H-1 sebelum WO dijadwalkan close." },
  { id: "ABN-I-01", kategori: "I", tanggal: "2026-10-05", area: "Pre-Assembly", foto: "wip-pre.jpg", faktor: "Method", masalah: "Penumpukan WIP di pre-assembly", akar: "Output assembly tidak seimbang dengan input", dampak: "Penumpukan WIP", solusi: "Seimbangkan input dengan kapasitas assembly", pic: "IRFAN NURCHOLIS", penanggungJawab: "Tim Pre-Assembly", dueDate: "2026-10-09", status: "Open", saranAI: "Batasi WIP maksimum per rak dan tarik material berbasis kebutuhan assembly." },
  { id: "ABN-I-02", kategori: "I", tanggal: "2026-10-06", area: "Warranty", foto: "wip-warranty.jpg", faktor: "Material", masalah: "WIP warranty menunggu part pengganti", akar: "Part pengganti datang bertahap dari pemasok", dampak: "Lead time klaim +1 hari", solusi: "Eskalasi PO part kritis ke pemasok", pic: "RICKHY LADIANSYAH", penanggungJawab: "Tim Warranty", dueDate: "2026-10-12", status: "In Progress", saranAI: "Buat daftar part kritis dan pantau ETA harian sampai tiba." },
  { id: "ABN-P-01", kategori: "P", tanggal: "2026-10-06", area: "Produksi", foto: "changeover.jpg", faktor: "Machine", masalah: "Changeover melebihi 6 jam", akar: "Setting awal belum standar antar shift", dampak: "Output hilang 2 jam", solusi: "Standarkan setting awal dan latih ulang operator", pic: "FAJRUL AL HUDA", penanggungJawab: "Tim Produksi", dueDate: "2026-10-07", status: "Open", saranAI: "Rekam changeover tercepat sebagai video standar untuk semua shift." },
  { id: "ABN-P-02", kategori: "P", tanggal: "2026-10-07", area: "Packing", foto: "packing-output.jpg", faktor: "Man", masalah: "Output packing di bawah target", akar: "Penumpukan verifikasi di ujung line", dampak: "Output -7%", solusi: "Tambah satu checker dan susun ulang alur", pic: "SUBAGYO", penanggungJawab: "Tim Packing", dueDate: "2026-10-10", status: "In Progress", saranAI: "Pindahkan verifikasi ke tengah line agar tidak menumpuk di ujung." },
];

export const trenKecelakaan = [
  { hari: "Sen", insiden: 0 },
  { hari: "Sel", insiden: 0 },
  { hari: "Rab", insiden: 1 },
  { hari: "Kam", insiden: 0 },
  { hari: "Jum", insiden: 0 },
  { hari: "Sab", insiden: 0 },
  { hari: "Min", insiden: 0 },
];

export const paretoDefect = [
  { line: "Line A", defect: 18 },
  { line: "Line B", defect: 12 },
  { line: "Line C", defect: 9 },
  { line: "Line D", defect: 6 },
  { line: "Line E", defect: 3 },
];

export const capaianDelivery = [
  { indikator: "End-to-End Delivery", capaian: 58 },
  { indikator: "WO Close Rate (3D)", capaian: 100 },
  { indikator: "Kesiapan New Model", capaian: 78 },
  { indikator: "Model Clearance Rate", capaian: 98 },
];

export const sebaranWip = [
  { stasiun: "Pre-Assembly", menumpuk: 640, aman: 1816 },
  { stasiun: "Rework", menumpuk: 210, aman: 680 },
  { stasiun: "Warranty", menumpuk: 145, aman: 505 },
  { stasiun: "Mainboard Service", menumpuk: 96, aman: 384 },
];

export const outputSmed = [
  { minggu: "W1", output: 8120, target: 9000, smed: 8.2 },
  { minggu: "W2", output: 8450, target: 9000, smed: 7.6 },
  { minggu: "W3", output: 7980, target: 9000, smed: 8.8 },
  { minggu: "W4", output: 8630, target: 9000, smed: 7.1 },
];
