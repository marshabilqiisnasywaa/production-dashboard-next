import type { ChecklistCategory, ChecklistTemplate } from "../../leader/papercard/types";
import type { DepartmentKey } from "../../leader/types";

export const MEMBER_PROD_TEMPLATE: ChecklistTemplate = {
  id: "prod-v1",
  version: 1,
  window: { start: "07:30", end: "08:15" },
  rule: {
    ok: "OK jika seluruh pos kerja, mesin, material, dan personel siap tanpa ada kendala.",
    ng: "NG jika ada abnormalitas kesiapan. Wajib isi penyebab dan eskalasi ke Supervisor.",
  },
  categories: [
    {
      id: "prod-cat-1",
      name: "Manusia & POS Kerja",
      groups: [
        {
          id: "prod-cat-1-g1",
          items: [
            {
              id: "prd-1",
              number: 1,
              title: "Ada penandaan pada pos pergerakan operator",
              ruleInfo: "Lihat garis marking batas aman di lantai pos kerja",
            },
            {
              id: "prd-2",
              number: 2,
              title: "Operator telah melalui training JI (Job Instruction)",
              ruleInfo: "Cek matriks skill operator pada pos kritis",
            },
            {
              id: "prd-3",
              number: 3,
              title: "Catat jumlah operator pengganti / absen hari ini",
              answerType: "text",
              ruleInfo: "Ketik jumlah orang dan nomor pos jika ada yang berganti",
            },
            {
              id: "prd-4",
              number: 4,
              title: "Kipas ion dan gelang statis ESD terpasang sesuai aturan",
              ruleInfo: "Lampu hijau continuous monitor harus menyala",
            },
            {
              id: "prd-5",
              number: 5,
              title: "Operator bekerja sesuai SOP dan memahami instruksi pos kritis",
              ruleInfo: "Sampling 3 operator di pos kritis perakitan",
            },
          ],
        },
      ],
    },
    {
      id: "prod-cat-2",
      name: "Mesin & Peralatan Lini",
      groups: [
        {
          id: "prod-cat-2-g1",
          items: [
            {
              id: "prd-6",
              number: 6,
              title: "Seluruh mesin utama menyala dan siap produksi",
              ruleInfo: "Tidak ada alarm fault pada panel mesin",
            },
            {
              id: "prd-7",
              number: 7,
              title: "Conveyor berjalan lancar tanpa getaran abnormal",
              ruleInfo: "Kecepatan conveyor stabil sesuai takttime",
            },
            {
              id: "prd-8",
              number: 8,
              title: "Sensor stopper dan interlock safety mesin berfungsi normal",
              ruleInfo: "Uji fungsi tombol emergency stop di awal shift",
            },
          ],
        },
      ],
    },
    {
      id: "prod-cat-3",
      name: "Material & 5S",
      groups: [
        {
          id: "prod-cat-3-g1",
          items: [
            {
              id: "prd-9",
              number: 9,
              title: "Material lot pertama lengkap di rak buffer pos kerja",
              ruleInfo: "Cek ketersediaan part untuk target 1 jam pertama",
            },
            {
              id: "prd-10",
              number: 10,
              title: "Label identitas lot & barcode part sesuai Work Order",
              ruleInfo: "Periksa kecocokan nomor lot box dengan lembar WO",
            },
            {
              id: "prd-11",
              number: 11,
              title: "Kebersihan 5S meja kerja dan lantai area perakitan",
              ruleInfo: "Bebas dari debu, ceceran part, dan sampah boks",
            },
          ],
        },
      ],
    },
  ],
};

export const MEMBER_ME_TEMPLATE: ChecklistTemplate = {
  id: "me-v1",
  version: 1,
  window: { start: "07:30", end: "08:15" },
  rule: {
    ok: "OK jika seluruh mesin, tekanan angin, dan temperatur sesuai batas SOP.",
    ng: "NG jika ada deviasi parameter suhu / tekanan. Wajib catat nilai ukur.",
  },
  categories: [
    {
      id: "me-cat-1",
      name: "Pemeriksaan Mesin & Temperatur",
      groups: [
        {
          id: "me-cat-1-g1",
          items: [
            {
              id: "me-1",
              number: 1,
              title: "Suhu solder station stabil pada 350±10°C",
              ruleInfo: "Ukur suhu ujung mata solder dengan thermometer kontak",
            },
            {
              id: "me-2",
              number: 2,
              title: "Catat nilai tekanan kompresor angin utama (MPa)",
              answerType: "text",
              ruleInfo: "Standar normal: 0.5 - 0.7 MPa",
            },
            {
              id: "me-3",
              number: 3,
              title: "Obeng elektrik (electric screwdriver) terkalibrasi torsinya",
              ruleInfo: "Batas kalibrasi 30 hari stiker kalibrasi",
            },
            {
              id: "me-4",
              number: 4,
              title: "Sensor stopper dan interlock safety mesin berfungsi normal",
              ruleInfo: "Pastikan curtain safety sensor aktif dan memutus daya saat terhalang",
            },
            {
              id: "me-5",
              number: 5,
              title: "Mesin press otomatis bekerja presisi tanpa deviasi langkah (stroke)",
              ruleInfo: "Cek tekanan hidrolik/pneumatik pada gauge",
            },
            {
              id: "me-6",
              number: 6,
              title: "Pemeriksaan kebocoran angin (air leak) pada seluruh sambungan selang",
              ruleInfo: "Dengarkan suara desisan angin di sepanjang jalur lini",
            },
          ],
        },
      ],
    },
  ],
};

export const MEMBER_PE_TEMPLATE: ChecklistTemplate = {
  id: "pe-v1",
  version: 1,
  window: { start: "07:30", end: "08:15" },
  rule: {
    ok: "OK jika jig, fixture, dan dokumen instruksi kerja valid.",
    ng: "NG jika jig aus, oblak, atau ada trial part tanpa SPK.",
  },
  categories: [
    {
      id: "pe-cat-1",
      name: "Jig, Fixture & Instruksi Kerja",
      groups: [
        {
          id: "pe-cat-1-g1",
          items: [
            {
              id: "pe-1",
              number: 1,
              title: "Jig perakitan dalam kondisi presisi, baut tidak kendor",
              ruleInfo: "Pin locator tidak boleh goyang / tergores parah",
            },
            {
              id: "pe-2",
              number: 2,
              title: "Work Instruction (WI) revisi terbaru aktif di display pos",
              ruleInfo: "Periksa nomor revisi drawing dengan dokumen engineering",
            },
            {
              id: "pe-3",
              number: 3,
              title: "Catat nomor versi firmware / parameter proses",
              answerType: "text",
              ruleInfo: "Tuliskan kode versi parameter yang sedang di-flash",
            },
            {
              id: "pe-4",
              number: 4,
              title: "First-piece sample lolos uji dimensi dan trial proses",
              ruleInfo: "Verifikasi 3 unit pertama bersama tim QC",
            },
            {
              id: "pe-5",
              number: 5,
              title: "Keseimbangan takt-time dan pembagian beban kerja pos valid",
              ruleInfo: "Tidak ada bottleneck berlebih pada pos manual",
            },
          ],
        },
      ],
    },
  ],
};

export const MEMBER_QC_TEMPLATE: ChecklistTemplate = {
  id: "qc-v1",
  version: 1,
  window: { start: "07:30", end: "08:15" },
  rule: {
    ok: "OK jika sampel batas dan alat ukur QC tervalidasi.",
    ng: "NG jika sampel limit kadaluarsa atau alat ukur belum kalibrasi.",
  },
  categories: [
    {
      id: "qc-cat-1",
      name: "Alat Ukur & Master Sample Limit",
      groups: [
        {
          id: "qc-cat-1-g1",
          items: [
            {
              id: "qc-1",
              number: 1,
              title: "Master limit sample kosmetik dan gap tersedia di pos QC",
              ruleInfo: "Sample harus berlabel tanggal verifikasi QC Dept Head",
            },
            {
              id: "qc-2",
              number: 2,
              title: "Alat ukur (caliper, micrometer, ESD tester) berstiker kalibrasi valid",
              ruleInfo: "Masa berlaku kalibrasi alat ukur masih aktif",
            },
            {
              id: "qc-3",
              number: 3,
              title: "Catat hasil uji ground monitor ESD (Ohm)",
              answerType: "text",
              ruleInfo: "Batas normal < 1.0 x 10^6 Ohm",
            },
            {
              id: "qc-4",
              number: 4,
              title: "Verifikasi 5 unit first piece perakitan lolos kriteria QA",
              ruleInfo: "Uji fungsi layar, kamera, baterai, dan uji kosmetik luar",
            },
            {
              id: "qc-5",
              number: 5,
              title: "Catat temuan cacat kritis (defective rate) shift sebelumnya",
              answerType: "text",
              ruleInfo: "Ketik jenis cacat tertinggi dan pos asalnya",
            },
          ],
        },
      ],
    },
  ],
};

export const MEMBER_DEPARTMENT_TEMPLATES: Record<DepartmentKey, ChecklistTemplate> = {
  PROD: MEMBER_PROD_TEMPLATE,
  ME: MEMBER_ME_TEMPLATE,
  PE: MEMBER_PE_TEMPLATE,
  QC: MEMBER_QC_TEMPLATE,
};

export const MEMBER_DEPARTMENTS: { key: DepartmentKey; name: string; itemCount: number }[] = [
  { key: "PROD", name: "Produksi", itemCount: 11 },
  { key: "ME", name: "Maintenance", itemCount: 6 },
  { key: "PE", name: "Process Eng", itemCount: 5 },
  { key: "QC", name: "Quality Control", itemCount: 5 },
];

export const DEFAULT_MEMBER_USER = {
  name: "Budi Santoso",
  employeeId: "OP-501-01",
  role: "Operator Lini",
  position: "Operator Produksi",
  dept: "PROD" as DepartmentKey,
  deptLabel: "Produksi",
  line: "501",
  lineCode: "501",
  lineId: 1,
  lineName: "Line 1",
  workshop: "Assembly Workshop",
  workshopName: "Assembly Workshop",
  supervisorName: "Hendra Pratama",
  supervisor: {
    name: "Hendra Pratama",
    employeeId: "SPV-019",
    role: "Supervisor Assembly 1",
  },
};
