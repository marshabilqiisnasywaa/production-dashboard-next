export type FiveWhyAnalysisStatus =
  | "draft"
  | "in_analysis"
  | "done";

export type FiveWhyTabKey = 1 | 2 | 3;

export type TabStatus = "kosong" | "sebagian" | "selesai";

export type SumberAbnormal = "pre" | "onProgress" | "post" | "lainnya";

export type TingkatPengaruh = "sering" | "siklusPanjang" | "lainnya";

export type WhyVerification =
  | "unverified"
  | "verified"
  | "not_root"
  | "root";

export type BranchVerification = Exclude<WhyVerification, "root">;

export type SolutionType = "short" | "long";

export type SolutionStatus = "rencana" | "dikerjakan" | "dipantau" | "standar";

export type RecurrenceStatus = "ya" | "tidak" | "belum";

export type PdcaStage = "Plan" | "Do" | "Check" | "Act";

export type Evidence = {
  id: string;
  label: string;
  text: string;
  photos: string[];
};

export type ProblemSummaryFields = {
  when: string;
  where: string;
  what: string;
  who: string;
  how: string;
  howMuch: string;
  downtime: string;
  shortTermSolution: string;
};

export type FiveWhyAbnormal = {
  id: string;
  label: string;
  line: string;
  pengusul: string;
  jenis: string;
  sumberAbnormal: SumberAbnormal[];
  sumberLainnya: string;
  tingkatPengaruh: TingkatPengaruh[];
  pengaruhLainnya: string;
  summary: ProblemSummaryFields;
};

export type WhyBranch = {
  id: string;
  statement: string;
  verification: BranchVerification;
  evidence: Evidence[];
};

export type WhyNode = {
  id: string;
  level: number;
  statement: string;
  verification: WhyVerification;
  evidence: Evidence[];
  branches: WhyBranch[];
};

export type Solution = {
  id: string;
  text: string;
  type: SolutionType;
  pic: string;
  dept: string;
  deadline: string;
  status: SolutionStatus;
  recurred: RecurrenceStatus;
  remark: string;
  photosBefore: string[];
  photosAfter: string[];
};

export type FiveWhyRecord = {
  nomor: string;
  abnormal: FiveWhyAbnormal;
  analysisStatus: FiveWhyAnalysisStatus;
  whys: WhyNode[];
  solutions: Solution[];
  createdAt: string;
  updatedAt: string;
};

export const FIVE_WHY_ANALYSIS_LABELS: Record<FiveWhyAnalysisStatus, string> = {
  draft: "Draft",
  in_analysis: "Dalam analisis",
  done: "Selesai",
};

export const WHY_VERIFICATION_LABELS: Record<WhyVerification, string> = {
  unverified: "Belum diverifikasi",
  verified: "Terverifikasi",
  not_root: "Bukan akar masalah",
  root: "Root Cause",
};

export const BRANCH_VERIFICATION_LABELS: Record<BranchVerification, string> = {
  unverified: "Belum diverifikasi",
  verified: "Terbukti",
  not_root: "Bukan akar masalah · Terverifikasi",
};

export const SOLUTION_TYPE_LABELS: Record<SolutionType, string> = {
  short: "Short term",
  long: "Long term",
};

export const SOLUTION_STATUS_LABELS: Record<SolutionStatus, string> = {
  rencana: "Rencana",
  dikerjakan: "Dikerjakan",
  dipantau: "Dipantau",
  standar: "Selesai & standar",
};

export const RECURRENCE_LABELS: Record<RecurrenceStatus, string> = {
  ya: "Ya",
  tidak: "Tidak",
  belum: "Belum dipantau",
};

export const PDCA_STAGE_BY_STATUS: Record<SolutionStatus, PdcaStage> = {
  rencana: "Plan",
  dikerjakan: "Do",
  dipantau: "Check",
  standar: "Act",
};

export const PDCA_STAGES: readonly PdcaStage[] = ["Plan", "Do", "Check", "Act"];

export const EVIDENCE_LABEL_OPTIONS: readonly string[] = [
  "OK",
  "NG",
  "Standar",
  "Aktual",
  "Sebelum",
  "Sesudah",
  "Catatan",
  "Lainnya...",
];

export const SUMBER_ABNORMAL_OPTIONS: readonly {
  value: SumberAbnormal;
  label: string;
}[] = [
  { value: "pre", label: "Pre" },
  { value: "onProgress", label: "On progress" },
  { value: "post", label: "Post" },
  { value: "lainnya", label: "Lainnya" },
];

export const TINGKAT_PENGARUH_OPTIONS: readonly {
  value: TingkatPengaruh;
  label: string;
}[] = [
  { value: "sering", label: "Sering" },
  { value: "siklusPanjang", label: "Siklus penanganan panjang" },
  { value: "lainnya", label: "Lainnya" },
];

export const SOLUTION_TYPE_OPTIONS: readonly SolutionType[] = ["short", "long"];

export const SOLUTION_STATUS_OPTIONS: readonly SolutionStatus[] = [
  "rencana",
  "dikerjakan",
  "dipantau",
  "standar",
];

export const RECURRENCE_OPTIONS: readonly RecurrenceStatus[] = [
  "ya",
  "tidak",
  "belum",
];

export function createFiveWhyId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function splitDateTime(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value.trim());
  if (match) return { date: match[1], time: match[2] };
  const parsed = new Date(value);
  if (value.trim() && !Number.isNaN(parsed.getTime())) {
    return {
      date: `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(
        parsed.getDate()
      )}`,
      time: `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`,
    };
  }
  return { date: "", time: "" };
}

export function joinDateTime(date: string, time: string) {
  if (!date) return "";
  return `${date}T${time || "00:00"}`;
}

export function formatDateTimeLabel(value: string, locale = "id-ID") {
  const { date, time } = splitDateTime(value);
  if (!date) return value.trim();
  const parsed = new Date(`${date}T${time || "00:00"}:00`);
  if (Number.isNaN(parsed.getTime())) return value.trim();
  const day = parsed.toLocaleDateString(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return time ? `${day}, ${time}` : day;
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/\.+$/, "");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function describeProblem(
  fields: Pick<ProblemSummaryFields, "what" | "who" | "how" | "howMuch">
) {
  const what = cleanText(fields.what);
  if (!what) return "";
  const who = cleanText(fields.who);
  const how = cleanText(fields.how);
  const howMuch = cleanText(fields.howMuch);
  const sentences = [`${capitalize(what)}.`];
  if (who) sentences.push(`Terkait ${who}.`);
  if (how) sentences.push(`${capitalize(how)}.`);
  if (howMuch) sentences.push(`Dampak: ${howMuch}.`);
  return sentences.join(" ");
}

export function buildProblemSummary(fields: ProblemSummaryFields, locale = "id-ID") {
  const missing = "(belum diisi)";
  const when = cleanText(fields.when)
    ? formatDateTimeLabel(fields.when, locale)
    : missing;
  const where = cleanText(fields.where) || missing;
  const what = cleanText(fields.what) || missing;
  const who = cleanText(fields.who);
  const how = cleanText(fields.how);
  const howMuch = cleanText(fields.howMuch);
  const downtime = cleanText(fields.downtime);
  const shortTerm = cleanText(fields.shortTermSolution);
  const sentences = [`Pada ${when}, di ${where}, terjadi ${what}.`];
  if (who) sentences.push(`Terkait ${who}.`);
  if (how) sentences.push(`${capitalize(how)}.`);
  if (howMuch) sentences.push(`Dampak: ${howMuch}.`);
  if (downtime) sentences.push(`Downtime ${downtime} menit.`);
  if (shortTerm) sentences.push(`Tindakan sementara: ${shortTerm}.`);
  return sentences.join(" ").replace(/\s{2,}/g, " ");
}

export function createEmptySolution(): Solution {
  return {
    id: createFiveWhyId("solution"),
    text: "",
    type: "short",
    pic: "",
    dept: "",
    deadline: "",
    status: "rencana",
    recurred: "belum",
    remark: "",
    photosBefore: [],
    photosAfter: [],
  };
}

export function findRootCause(record: FiveWhyRecord | null) {
  if (!record) return null;
  return record.whys.find((why) => why.verification === "root") ?? null;
}

export function isMajorProblem(record: FiveWhyRecord | null) {
  if (!record) return false;
  const downtime = record.abnormal.summary.downtime.trim();
  if (!downtime) return false;
  const minutes = Number(downtime);
  return Number.isFinite(minutes) && minutes >= 30;
}

export function analysisStatusTone(status: FiveWhyAnalysisStatus) {
  if (status === "done" || status === "in_analysis") return "is-success";
  return "is-neutral";
}

export function isSummaryTabDone(record: FiveWhyRecord) {
  const { when, where, what, how } = record.abnormal.summary;
  return (
    record.abnormal.label.trim().length > 0 &&
    when.trim().length > 0 &&
    where.trim().length > 0 &&
    what.trim().length > 0 &&
    how.trim().length > 0
  );
}

export function isWhyTabDone(record: FiveWhyRecord) {
  return (
    record.whys.length === 5 &&
    record.whys.every((why) => why.statement.trim().length > 0) &&
    record.whys.filter((why) => why.verification === "root").length === 1
  );
}

export function isSolutionTabDone(record: FiveWhyRecord) {
  if (!findRootCause(record)) return false;
  return record.solutions.some(
    (solution) =>
      solution.text.trim().length > 0 &&
      solution.pic.trim().length > 0 &&
      solution.dept.trim().length > 0 &&
      solution.deadline.trim().length > 0
  );
}

export function getTabStatus(
  record: FiveWhyRecord,
  tab: FiveWhyTabKey
): TabStatus {
  if (tab === 1) {
    if (isSummaryTabDone(record)) return "selesai";
    const { summary, label } = record.abnormal;
    return label.trim() ||
      summary.when.trim() ||
      summary.where.trim() ||
      summary.what.trim() ||
      summary.how.trim()
      ? "sebagian"
      : "kosong";
  }
  if (tab === 2) {
    if (isWhyTabDone(record)) return "selesai";
    return record.whys.some(
      (why) => why.statement.trim() || why.verification !== "unverified"
    )
      ? "sebagian"
      : "kosong";
  }
  if (isSolutionTabDone(record)) return "selesai";
  return record.solutions.length > 0 ? "sebagian" : "kosong";
}
