export type AnswerStatus = "OK" | "NG";

export interface ChecklistItem {
  id: string;
  /** Number inside its category (1..n), shown in the badge */
  number: number;
  title: string;
  /** Optional per-item rule text. Falls back to the shared RuleTemplate. */
  rule?: string;
  /** Optional tooltip rule guidance for the small info bullet */
  ruleInfo?: string;
  /** Question answer type: OK/NG button or Text Input */
  answerType?: "ok_ng" | "text";
  /** Show the "Nama pos/proses yang diperiksa" input (Leader special component) */
  askPosName?: boolean;
}

export interface ChecklistGroup {
  id: string;
  /** Sub-heading such as "Pengecekan POS Penting". Omit for no heading. */
  title?: string;
  items: ChecklistItem[];
}

export interface ChecklistCategory {
  id: string;
  name: string;
  groups: ChecklistGroup[];
}

/** The ONE "aturan pengecekan" template shown under every "Lihat aturan". */
export interface RuleTemplate {
  ok: string;
  ng: string;
}

export interface ChecklistTemplate {
  id: string;
  version: number;
  window: { start: string; end: string }; // "HH:mm"
  rule: RuleTemplate;
  categories: ChecklistCategory[];
}

export interface Answer {
  status: AnswerStatus | null;
  textValue?: string;
  posName: string;
  cause: string;
  solution: string;
}

export type WindowState = "loading" | "before" | "open" | "closed";
export type SubmissionStatus = "ON_TIME" | "LATE";

export interface Submission {
  submittedAt: Date;
  status: SubmissionStatus;
}
