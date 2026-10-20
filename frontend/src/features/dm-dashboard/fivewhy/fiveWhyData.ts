export type FiveWhyRole = "leader" | "supervisor" | "member";

export type FiveWhyAnalysisStatus =
  | "draft"
  | "in_analysis"
  | "waiting_approval"
  | "done";

export type ProblemTiming = "Sebelum" | "Selama" | "Sesudah" | "Lainnya";

export type ProblemCharacteristic =
  | "Sering terjadi"
  | "Siklus penanganan panjang"
  | "Lainnya";

export type WhyVerification =
  | "unverified"
  | "verified"
  | "not_root"
  | "root";

export type BranchVerification = Exclude<WhyVerification, "root">;

export type ActionType = "Short term" | "Long term" | "Preventive";

export type ActionStatus = "Rencana" | "Selesai" | "Monitoring" | "Standar";

export type PdcaStage = "Plan" | "Do" | "Check" | "Act";

export type RecurrenceStatus = "Ya" | "Tidak" | "Belum dipantau";

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
  shortTermSolution: string;
};

export type FiveWhyAbnormal = {
  id: string;
  label: string;
  line: string;
  pengusul: string;
  jenis: string;
  sumber: string;
  tingkatPengaruh: string;
  waktu: ProblemTiming;
  karakteristik: ProblemCharacteristic | null;
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

export type ActionRow = {
  id: string;
  rootCause: string;
  solution: string;
  actionType: ActionType;
  pic: string;
  department: string;
  deadline: string;
  status: ActionStatus;
  recurrence: RecurrenceStatus;
  remark: string;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
};

export type FiveWhyRecord = {
  abnormal: FiveWhyAbnormal;
  analysisStatus: FiveWhyAnalysisStatus;
  whys: WhyNode[];
  actions: ActionRow[];
  updatedAt: string | null;
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

export const PDCA_STAGE_BY_STATUS: Record<ActionStatus, PdcaStage> = {
  Rencana: "Plan",
  Selesai: "Do",
  Monitoring: "Check",
  Standar: "Act",
};

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

export const PROBLEM_TIMING_OPTIONS: readonly ProblemTiming[] = [
  "Sebelum",
  "Selama",
  "Sesudah",
  "Lainnya",
];

export const PROBLEM_CHARACTERISTIC_OPTIONS: readonly ProblemCharacteristic[] = [
  "Sering terjadi",
  "Siklus penanganan panjang",
  "Lainnya",
];

export const ABNORMAL_SOURCE_OPTIONS: readonly string[] = [
  "Summary",
  "DM Meeting",
  "Input manual",
];

export const ABNORMAL_IMPACT_OPTIONS: readonly string[] = [
  "Rendah",
  "Sedang",
  "Tinggi",
];

export const ACTION_TYPE_OPTIONS: readonly ActionType[] = [
  "Short term",
  "Long term",
  "Preventive",
];

export const ACTION_STATUS_OPTIONS: readonly ActionStatus[] = [
  "Rencana",
  "Selesai",
  "Monitoring",
  "Standar",
];

export const RECURRENCE_OPTIONS: readonly RecurrenceStatus[] = [
  "Ya",
  "Tidak",
  "Belum dipantau",
];

export function createFiveWhyId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

type LegacyEvidenceSource = {
  ok?: unknown;
  ng?: unknown;
  note?: unknown;
  photoUrl?: unknown;
  evidence?: unknown;
};

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function legacyEvidence(source: LegacyEvidenceSource): Evidence[] {
  const result: Evidence[] = [];
  const ok = textValue(source.ok).trim();
  const ng = textValue(source.ng).trim();
  const note = textValue(source.note).trim();
  const photo = textValue(source.photoUrl);
  if (ok) {
    result.push({ id: createFiveWhyId("evidence"), label: "OK", text: ok, photos: [] });
  }
  if (ng) {
    result.push({ id: createFiveWhyId("evidence"), label: "NG", text: ng, photos: [] });
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
    const raw = item as Partial<WhyNode> & LegacyEvidenceSource;
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
        const rawBranch = branch as Partial<WhyBranch> & LegacyEvidenceSource;
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
