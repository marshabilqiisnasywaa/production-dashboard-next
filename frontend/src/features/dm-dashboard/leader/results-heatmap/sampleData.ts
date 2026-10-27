/**
 * Demo data for any week, so the card can be designed and tested without a backend.
 * Deterministic: the same week always gives the same result.
 * Today and yesterday are pinned so the NG detail, a late papercard and a recurring aspect are always visible.
 */
import type { AspectResult, PapercardResult, RoleKey } from "./types";
import { ROLE_ORDER } from "./types";
import { addDays, parseDate, weekDays } from "./utils";

interface SampleItem {
  key: string;
  categoryId: string;
  categoryName: string;
  groupTitle: string | null;
  title: string;
  ruleText?: string;
}

const item = (key: string, categoryId: string, categoryName: string, groupTitle: string | null, title: string, ruleText?: string): SampleItem => ({
  key, categoryId, categoryName, groupTitle, title, ruleText,
});

const TEMPLATES: Record<RoleKey, SampleItem[]> = {
  leader: [
    item("l1", "manusia", "Manusia", "Pengecekan POS Penting", "Ada penandaan pada pos pergerakan operator"),
    item("l2", "manusia", "Manusia", "Pengecekan POS Penting", "Mengetahui nama leader"),
    item("l3", "manusia", "Manusia", "Pengecekan POS Penting", "Telah melalui training JI"),
    item("l4", "manusia", "Manusia", "ESD", "Kipas ion / gelang statis sesuai aturan"),
    item("l5", "mesin", "Mesin", null, "Mesin utama berfungsi normal"),
    item("l6", "mesin", "Mesin", null, "Tidak ada kebocoran oli atau udara"),
    item("l7", "material", "Material", null, "Label material terbaca jelas"),
    item("l8", "material", "Material", null, "Material sesuai BOM"),
    item("l9", "metode", "Metode", null, "SOP terbaru terpasang di pos"),
    item("l10", "5s", "5S", null, "Area kerja bersih dan rapi"),
  ],
  me: [
    item("m1", "mesin", "Mesin", "Monitoring TPM Level 1", "Single camera", "Status mesin OK"),
    item("m2", "mesin", "Mesin", "Monitoring TPM Level 1", "Double camera", "Status mesin OK"),
    item("m3", "mesin", "Mesin", "Monitoring TPM Level 1", "Audio", "Status mesin OK"),
    item("m4", "mesin", "Mesin", "Monitoring TPM Level 1", "CCD", "Status mesin OK"),
    item("m5", "mesin", "Mesin", "Monitoring TPM Level 1", "3 Stage", "Status mesin OK"),
    item("m6", "mesin", "Mesin", "Trouble 3 hari", "Mesin utama bebas trouble berulang"),
    item("m7", "mesin", "Mesin", "Penanganan masalah", "Masalah kemarin sudah ditutup"),
    item("m8", "mesin", "Mesin", "Penanganan masalah", "Operator baru sudah ditraining"),
  ],
  pe: [
    item("p1", "orang", "Orang", "Pergerakan operator", "Ada penandaan pada pos pergerakan operator"),
    item("p2", "orang", "Orang", "Pergerakan operator", "Pos penting terisi operator terlatih"),
    item("p3", "material", "Material", "Material service", "Label material terbaca jelas"),
    item("p4", "material", "Material", "Material service", "Sampling 3 pcs sesuai standar"),
    item("p5", "metode", "Metode", "Dokumen engineering", "Dokumen engineering sesuai revisi"),
    item("p6", "metode", "Metode", "SOP", "SOP update terpasang"),
    item("p7", "6s", "6S", "Area Analisa PE", "Peminjaman material tercatat"),
    item("p8", "lainnya", "Lainnya", null, "Post management closed loop"),
  ],
  ipqc: [
    item("q1", "orang", "Orang", null, "Change over line sesuai form"),
    item("q2", "orang", "Orang", null, "Pergerakan operator di pos umum"),
    item("q3", "material", "Material", null, "Pengecekan material berdasarkan BOM"),
    item("q4", "material", "Material", null, "Status kualitas material termonitor"),
    item("q5", "metode", "Metode", null, "Dokumen engineering tepat waktu"),
    item("q6", "metode", "Metode", null, "Pengecekan MES sesuai"),
    item("q7", "lingkungan", "Lingkungan", null, "Suhu dan kelembapan sesuai standar"),
    item("q8", "lainnya", "Lainnya", null, "Post management closed loop"),
  ],
};

const CAUSES = [
  "Penanda pos terhapus saat cleaning.",
  "Operator baru belum mendapat briefing.",
  "Printer label kehabisan tinta.",
  "Sensor bergeser setelah changeover.",
  "Dokumen revisi lama belum diganti.",
  "Tidak ada jadwal pengecekan di shift ini.",
];
const SOLUTIONS = [
  "Pasang ulang penanda dan tambahkan ke jadwal cek mingguan.",
  "Briefing ulang operator dan catat di form training.",
  "Ganti cartridge, cetak ulang label.",
  "Kalibrasi ulang sensor dan cek hasil 3 pcs.",
  "Ganti dengan dokumen revisi terbaru.",
  "Tambahkan pengecekan ke checklist shift.",
];

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

interface Plan {
  missing: boolean;
  ng: number;
  ngStart: number;
  late: boolean;
}

function planFor(date: string, role: RoleKey, today: string): Plan {
  const yesterday = addDays(today, -1);
  // pinned cases: a recurring NG (PE, two days in a row), a late NG, and a missing papercard
  if (date === yesterday && role === "pe") return { missing: false, ng: 2, ngStart: 0, late: false };
  if (date === today && role === "pe") return { missing: false, ng: 2, ngStart: 0, late: true };
  if (date === today && role === "ipqc") return { missing: true, ng: 0, ngStart: 0, late: false };
  if (date === today || date === yesterday) return { missing: false, ng: 0, ngStart: 0, late: false };

  const h = hash(`${date}:${role}`);
  const roll = h % 100;
  return {
    missing: roll < 9,
    ng: roll >= 9 && roll < 22 ? 1 + (h % 3 === 0 ? 1 : 0) : 0,
    ngStart: h % TEMPLATES[role].length,
    late: h % 11 === 0,
  };
}

function buildResult(date: string, role: RoleKey, plan: Plan): PapercardResult {
  const template = TEMPLATES[role];
  const ngIndexes = new Set(Array.from({ length: plan.ng }, (_, k) => (plan.ngStart + k * 2) % template.length));
  const h = hash(`${date}:${role}:text`);

  const aspects: AspectResult[] = template.map((t, i) => {
    const isNg = ngIndexes.has(i);
    return {
      key: t.key,
      categoryId: t.categoryId,
      categoryName: t.categoryName,
      groupTitle: t.groupTitle,
      title: t.title,
      ruleText: t.ruleText ?? null,
      status: isNg ? "NG" : "OK",
      cause: isNg ? CAUSES[(h + i) % CAUSES.length] : "",
      solution: isNg ? SOLUTIONS[(h + i) % SOLUTIONS.length] : "",
      textValue: null,
    };
  });

  const dt = parseDate(date);
  const minutes = plan.late ? 9 * 60 + 5 + (h % 40) : 7 * 60 + 40 + (h % 30);
  dt.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return {
    id: `${date}:${role}`,
    date,
    role,
    late: plan.late,
    submittedBy: { leader: "leader-test", me: "me-test", pe: "pe-test", ipqc: "ipqc-test" }[role],
    submittedAt: dt.toISOString(),
    aspects,
    ngCount: plan.ng,
    okCount: aspects.length - plan.ng,
  };
}

export function makeSampleResults(weekStart: string, today: string): PapercardResult[] {
  const out: PapercardResult[] = [];
  for (const date of weekDays(weekStart)) {
    if (date > today) continue;
    for (const role of ROLE_ORDER) {
      const plan = planFor(date, role, today);
      if (!plan.missing) out.push(buildResult(date, role, plan));
    }
  }
  return out;
}
