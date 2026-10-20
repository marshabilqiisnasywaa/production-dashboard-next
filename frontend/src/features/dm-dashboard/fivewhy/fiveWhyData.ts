export const CURRENT_USER = {
  name: "Andi Wijaya",
  initials: "AW",
  role: "Leader Line",
};

export type FiveWhyRole = "leader" | "supervisor" | "member";

export type FiveWhyAnalysisStatus =
  | "draft"
  | "in_analysis"
  | "waiting_approval"
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

export type FiveWhyStore = {
  selectedAbnormalId: string;
  records: FiveWhyRecord[];
};

export const FIVE_WHY_STORAGE_KEY = "dm_fivewhy_records";

export const FIVE_WHY_ROLE_LABELS: Record<FiveWhyRole, string> = {
  leader: "Leader Line",
  supervisor: "Supervisor",
  member: "Anggota Tim",
};

export const FIVE_WHY_ANALYSIS_LABELS: Record<FiveWhyAnalysisStatus, string> = {
  draft: "Draft",
  in_analysis: "Dalam analisis",
  waiting_approval: "Menunggu approval",
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

export const SUMBER_ABNORMAL_VALUES: readonly SumberAbnormal[] =
  SUMBER_ABNORMAL_OPTIONS.map((option) => option.value);

export const TINGKAT_PENGARUH_VALUES: readonly TingkatPengaruh[] =
  TINGKAT_PENGARUH_OPTIONS.map((option) => option.value);

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

export function fiveWhyDateStamp(date: Date) {
  return `${String(date.getFullYear()).slice(-2)}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

export function nextFiveWhyNumber(
  nomorList: readonly string[],
  createdAt: Date = new Date()
) {
  const prefix = `5W-${fiveWhyDateStamp(createdAt)}-`;
  let last = 0;
  for (const nomor of nomorList) {
    if (!nomor.startsWith(prefix)) continue;
    const sequence = Number(nomor.slice(prefix.length));
    if (Number.isFinite(sequence)) last = Math.max(last, sequence);
  }
  return `${prefix}${pad2(last + 1)}`;
}

export function toDateTimeValue(date: Date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
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

export function formatDateTimeLabel(value: string) {
  const { date, time } = splitDateTime(value);
  if (!date) return value.trim();
  const parsed = new Date(`${date}T${time || "00:00"}:00`);
  if (Number.isNaN(parsed.getTime())) return value.trim();
  const day = parsed.toLocaleDateString("id-ID", {
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

export function buildProblemSummary(fields: ProblemSummaryFields) {
  const missing = "(belum diisi)";
  const when = cleanText(fields.when)
    ? formatDateTimeLabel(fields.when)
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

export function createEmptySummary(): ProblemSummaryFields {
  return {
    when: "",
    where: "",
    what: "",
    who: "",
    how: "",
    howMuch: "",
    downtime: "",
    shortTermSolution: "",
  };
}

export function createEmptyWhyNodes(recordId: string): WhyNode[] {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `${recordId}-why-${index + 1}`,
    level: index + 1,
    statement: "",
    verification: "unverified" as WhyVerification,
    evidence: [],
    branches: [],
  }));
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
  if (status === "waiting_approval") return "is-warning";
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

export function hasStandardSolution(record: FiveWhyRecord | null) {
  if (!record) return false;
  return record.solutions.some((solution) => solution.status === "standar");
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Foto tidak valid."));
    };
    reader.onerror = () => reject(new Error("Foto tidak bisa dibaca."));
    reader.readAsDataURL(file);
  });
}

type LegacyEvidenceFields = {
  ok?: unknown;
  ng?: unknown;
  note?: unknown;
  photoUrl?: unknown;
  evidence?: unknown;
};

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function legacyEvidence(fields: LegacyEvidenceFields): Evidence[] {
  const result: Evidence[] = [];
  const ok = textValue(fields.ok).trim();
  const ng = textValue(fields.ng).trim();
  const note = textValue(fields.note).trim();
  const photo = textValue(fields.photoUrl);
  if (ok) {
    result.push({
      id: createFiveWhyId("evidence"),
      label: "OK",
      text: ok,
      photos: [],
    });
  }
  if (ng) {
    result.push({
      id: createFiveWhyId("evidence"),
      label: "NG",
      text: ng,
      photos: [],
    });
  }
  if (note) {
    result.push({
      id: createFiveWhyId("evidence"),
      label: "Catatan",
      text: note,
      photos: [],
    });
  }
  if (photo) {
    result.push({
      id: createFiveWhyId("evidence"),
      label: "Foto",
      text: "",
      photos: [photo],
    });
  }
  return result;
}

export function normalizeEvidenceList(value: unknown): Evidence[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const raw = item as Partial<Evidence>;
    const photos = Array.isArray(raw.photos)
      ? raw.photos.filter((photo): photo is string => typeof photo === "string")
      : [];
    return {
      id: typeof raw.id === "string" ? raw.id : createFiveWhyId("evidence"),
      label:
        typeof raw.label === "string" && raw.label.trim()
          ? raw.label
          : "Lainnya...",
      text: typeof raw.text === "string" ? raw.text : "",
      photos,
    };
  });
}

function isWhyVerification(value: unknown): value is WhyVerification {
  return (
    value === "unverified" ||
    value === "verified" ||
    value === "not_root" ||
    value === "root"
  );
}

function isBranchVerification(value: unknown): value is BranchVerification {
  return (
    value === "unverified" ||
    value === "verified" ||
    value === "not_root"
  );
}

export function normalizeWhyTree(whys: unknown): WhyNode[] {
  if (!Array.isArray(whys)) return [];
  return whys.map((item, index) => {
    const raw = item as Partial<WhyNode> & LegacyEvidenceFields;
    const evidence = Array.isArray(raw.evidence)
      ? normalizeEvidenceList(raw.evidence)
      : legacyEvidence(raw);
    const branches = Array.isArray(raw.branches) ? raw.branches : [];
    return {
      id: typeof raw.id === "string" ? raw.id : createFiveWhyId("why"),
      level: typeof raw.level === "number" ? raw.level : index + 1,
      statement: typeof raw.statement === "string" ? raw.statement : "",
      verification: isWhyVerification(raw.verification)
        ? raw.verification
        : "unverified",
      evidence,
      branches: branches.map((branch) => {
        const rawBranch = branch as Partial<WhyBranch> & LegacyEvidenceFields;
        return {
          id:
            typeof rawBranch.id === "string"
              ? rawBranch.id
              : createFiveWhyId("why-branch"),
          statement:
            typeof rawBranch.statement === "string"
              ? rawBranch.statement
              : "",
          verification: isBranchVerification(rawBranch.verification)
            ? rawBranch.verification
            : "unverified",
          evidence: Array.isArray(rawBranch.evidence)
            ? normalizeEvidenceList(rawBranch.evidence)
            : legacyEvidence(rawBranch),
        };
      }),
    };
  });
}

const SUMBER_MIGRATION: Record<string, SumberAbnormal> = {
  Sebelum: "pre",
  Selama: "onProgress",
  Sesudah: "post",
};

const PENGARUH_MIGRATION: Record<string, TingkatPengaruh> = {
  "Sering terjadi": "sering",
  Sering: "sering",
  "Siklus penanganan panjang": "siklusPanjang",
};

function migrateSolutionType(value: string): SolutionType {
  if (value === "short" || value === "Short term") return "short";
  if (!value.trim()) return "short";
  return "long";
}

const SOLUTION_STATUS_MIGRATION: Record<string, SolutionStatus> = {
  rencana: "rencana",
  dikerjakan: "dikerjakan",
  dipantau: "dipantau",
  standar: "standar",
  Rencana: "rencana",
  Selesai: "dikerjakan",
  Monitoring: "dipantau",
  Standar: "standar",
};

const RECURRENCE_MIGRATION: Record<string, RecurrenceStatus> = {
  ya: "ya",
  tidak: "tidak",
  belum: "belum",
  Ya: "ya",
  Tidak: "tidak",
  "Belum dipantau": "belum",
};

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeAbnormal(value: unknown): FiveWhyAbnormal {
  const raw = (value ?? {}) as Partial<FiveWhyAbnormal> & {
    waktu?: unknown;
    karakteristik?: unknown;
    sumber?: unknown;
  };
  const rawSummary = (raw.summary ?? {}) as Partial<ProblemSummaryFields>;
  const sumberAbnormal = Array.isArray(raw.sumberAbnormal)
    ? raw.sumberAbnormal.filter(
        (item): item is SumberAbnormal =>
          typeof item === "string" &&
          SUMBER_ABNORMAL_VALUES.includes(item as SumberAbnormal)
      )
    : [];
  const migratedSumber = SUMBER_MIGRATION[textValue(raw.waktu)];
  if (sumberAbnormal.length === 0 && migratedSumber) {
    sumberAbnormal.push(migratedSumber);
  }
  const tingkatPengaruh = Array.isArray(raw.tingkatPengaruh)
    ? raw.tingkatPengaruh.filter(
        (item): item is TingkatPengaruh =>
          typeof item === "string" &&
          TINGKAT_PENGARUH_VALUES.includes(item as TingkatPengaruh)
      )
    : [];
  const migratedPengaruh = PENGARUH_MIGRATION[textValue(raw.karakteristik)];
  if (tingkatPengaruh.length === 0 && migratedPengaruh) {
    tingkatPengaruh.push(migratedPengaruh);
  }
  return {
    id: typeof raw.id === "string" ? raw.id : createFiveWhyId("analysis"),
    label: textValue(raw.label),
    line: textValue(raw.line),
    pengusul: textValue(raw.pengusul),
    jenis: textValue(raw.jenis),
    sumberAbnormal,
    sumberLainnya:
      typeof raw.sumberLainnya === "string" ? raw.sumberLainnya : "",
    tingkatPengaruh,
    pengaruhLainnya:
      typeof raw.pengaruhLainnya === "string" ? raw.pengaruhLainnya : "",
    summary: {
      when: textValue(rawSummary.when),
      where: textValue(rawSummary.where),
      what: textValue(rawSummary.what),
      who: textValue(rawSummary.who),
      how: textValue(rawSummary.how),
      howMuch: textValue(rawSummary.howMuch),
      downtime: textValue(rawSummary.downtime),
      shortTermSolution: textValue(rawSummary.shortTermSolution),
    },
  };
}

function normalizeSolution(value: unknown): Solution {
  const raw = (value ?? {}) as Partial<Solution> & {
    beforePhotoUrl?: unknown;
    afterPhotoUrl?: unknown;
    rootCause?: unknown;
  };
  const photosBefore = normalizeStringList(raw.photosBefore);
  const photosAfter = normalizeStringList(raw.photosAfter);
  const legacyBefore = textValue(raw.beforePhotoUrl);
  const legacyAfter = textValue(raw.afterPhotoUrl);
  if (photosBefore.length === 0 && legacyBefore) photosBefore.push(legacyBefore);
  if (photosAfter.length === 0 && legacyAfter) photosAfter.push(legacyAfter);
  return {
    id: typeof raw.id === "string" ? raw.id : createFiveWhyId("solution"),
    text: textValue(raw.text),
    type: migrateSolutionType(textValue(raw.type)),
    pic: textValue(raw.pic),
    dept: textValue(raw.dept),
    deadline: textValue(raw.deadline),
    status: SOLUTION_STATUS_MIGRATION[textValue(raw.status)] ?? "rencana",
    recurred: RECURRENCE_MIGRATION[textValue(raw.recurred)] ?? "belum",
    remark: textValue(raw.remark),
    photosBefore,
    photosAfter,
  };
}

function normalizeSolutions(value: unknown): Solution[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeSolution);
}

type LegacyAction = {
  solution?: unknown;
  actionType?: unknown;
  pic?: unknown;
  department?: unknown;
  deadline?: unknown;
  status?: unknown;
  recurrence?: unknown;
  remark?: unknown;
  beforePhotoUrl?: unknown;
  afterPhotoUrl?: unknown;
};

function legacyActionsToSolutions(actions: unknown): Solution[] {
  if (!Array.isArray(actions)) return [];
  return actions
    .map((item) => {
      const raw = (item ?? {}) as LegacyAction;
      return {
        id: createFiveWhyId("solution"),
        text: textValue(raw.solution),
        type: migrateSolutionType(textValue(raw.actionType)),
        pic: textValue(raw.pic),
        dept: textValue(raw.department),
        deadline: textValue(raw.deadline),
        status: SOLUTION_STATUS_MIGRATION[textValue(raw.status)] ?? "rencana",
        recurred: RECURRENCE_MIGRATION[textValue(raw.recurrence)] ?? "belum",
        remark: textValue(raw.remark),
        photosBefore: textValue(raw.beforePhotoUrl)
          ? [textValue(raw.beforePhotoUrl)]
          : [],
        photosAfter: textValue(raw.afterPhotoUrl)
          ? [textValue(raw.afterPhotoUrl)]
          : [],
      };
    })
    .filter(
      (solution) =>
        solution.text.trim() ||
        solution.pic.trim() ||
        solution.dept.trim() ||
        solution.deadline.trim()
    );
}

function normalizeRecord(
  raw: Record<string, unknown>,
  fallbackNumber: string
): FiveWhyRecord | null {
  const abnormalRaw = raw.abnormal;
  if (typeof abnormalRaw !== "object" || abnormalRaw === null) return null;
  const abnormal = normalizeAbnormal(abnormalRaw);
  if (!abnormal.id) return null;
  const createdAt =
    typeof raw.createdAt === "string" && raw.createdAt
      ? raw.createdAt
      : new Date().toISOString();
  const nomor = typeof raw.nomor === "string" ? raw.nomor.trim() : "";
  const solutions = Array.isArray(raw.solutions)
    ? normalizeSolutions(raw.solutions)
    : legacyActionsToSolutions(raw.actions);
  let analysisStatus: FiveWhyAnalysisStatus = "draft";
  if (
    raw.analysisStatus === "in_analysis" ||
    raw.analysisStatus === "waiting_approval" ||
    raw.analysisStatus === "done"
  ) {
    analysisStatus = raw.analysisStatus;
  }
  const normalizedWhys = normalizeWhyTree(raw.whys);
  const whys = Array.from({ length: 5 }, (_, index) => {
    const level = index + 1;
    const existing = normalizedWhys.find((why) => why.level === level);
    if (existing) return existing;
    return {
      id: createFiveWhyId("why"),
      level,
      statement: "",
      verification: "unverified" as WhyVerification,
      evidence: [],
      branches: [],
    };
  });
  return {
    nomor: nomor || fallbackNumber,
    abnormal,
    analysisStatus,
    whys,
    solutions,
    createdAt,
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt
        ? raw.updatedAt
        : createdAt,
  };
}

export function normalizeFiveWhyStore(value: unknown): FiveWhyStore | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as {
    selectedAbnormalId?: unknown;
    records?: unknown;
  };
  if (!Array.isArray(candidate.records)) return null;
  const records: FiveWhyRecord[] = [];
  const daily = new Map<string, number>();
  for (const item of candidate.records) {
    if (typeof item !== "object" || item === null) continue;
    const nomor = (item as { nomor?: unknown }).nomor;
    if (typeof nomor !== "string") continue;
    const match = /^5W-(\d{6})-(\d+)$/.exec(nomor);
    if (!match) continue;
    daily.set(match[1], Math.max(daily.get(match[1]) ?? 0, Number(match[2])));
  }
  for (const item of candidate.records) {
    if (typeof item !== "object" || item === null) continue;
    const raw = item as Record<string, unknown>;
    const date = new Date(
      typeof raw.createdAt === "string" ? raw.createdAt : Date.now()
    );
    const stamp = fiveWhyDateStamp(
      Number.isNaN(date.getTime()) ? new Date() : date
    );
    let fallback = "";
    if (typeof raw.nomor !== "string" || !raw.nomor.trim()) {
      const next = (daily.get(stamp) ?? 0) + 1;
      daily.set(stamp, next);
      fallback = `5W-${stamp}-${String(next).padStart(2, "0")}`;
    }
    const record = normalizeRecord(raw, fallback);
    if (record) records.push(record);
  }
  if (records.length === 0) return null;
  const storedSelection =
    typeof candidate.selectedAbnormalId === "string"
      ? candidate.selectedAbnormalId
      : "";
  const selectedAbnormalId = records.some(
    (record) => record.abnormal.id === storedSelection
  )
    ? storedSelection
    : records[0].abnormal.id;
  return {
    selectedAbnormalId,
    records,
  };
}
