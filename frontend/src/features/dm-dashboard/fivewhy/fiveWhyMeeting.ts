import type { DmMe, DmMeetingSession, DmMeetingSummary } from "../api";
import type {
  ActionRow,
  FiveWhyRecord,
  FiveWhyStore,
  WhyNode,
} from "./fiveWhyData";

export function summaryRecordId(summaryId: number) {
  return `summary-${summaryId}`;
}

function formatSessionDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function normalizeDueDate(value: string | null | undefined) {
  const dueDate = value?.trim() ?? "";
  if (!dueDate) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return dueDate;
  const parts = dueDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!parts) return "";
  return `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
}

function sessionLabel(session: DmMeetingSession) {
  return session.label?.trim() || `Sesi ${session.sessionNumber}`;
}

function buildWhyNodes(recordId: string, problem: string): WhyNode[] {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `${recordId}-why-${index + 1}`,
    level: index + 1,
    statement: index === 0 ? problem : "",
    verification: "unverified",
    evidence: [],
    branches: [],
  }));
}

function buildAction(
  recordId: string,
  summary: DmMeetingSummary
): ActionRow {
  const dueDate = summary.dueDate?.trim() ?? "";
  return {
    id: `${recordId}-action-1`,
    rootCause: "",
    solution: "",
    actionType: "Short term",
    pic: summary.picName?.trim() ?? "",
    department: "",
    deadline: normalizeDueDate(dueDate),
    status: "Rencana",
    recurrence: "Belum dipantau",
    remark: dueDate ? `Target dari End Meeting: ${dueDate}` : "",
    beforePhotoUrl: null,
    afterPhotoUrl: null,
  };
}

export function createRecordFromSummary(
  summary: DmMeetingSummary,
  session: DmMeetingSession,
  me: DmMe
): FiveWhyRecord | null {
  const problem = summary.problem?.trim() ?? "";
  if (!problem) return null;

  const recordId = summaryRecordId(summary.id);
  const lineCode = me.line?.code ?? String(summary.lineId);
  const pengusul =
    session.leaderName?.trim() || me.name?.trim() || "Leader Line";
  const label = sessionLabel(session);

  return {
    abnormal: {
      id: recordId,
      label: problem,
      line: lineCode,
      pengusul,
      jenis: "Kendala DM Meeting",
      sumber: label,
      tingkatPengaruh: "",
      waktu: "Selama",
      karakteristik: null,
      summary: {
        when: `${formatSessionDate(session.date)}, ${label} (${session.scheduledTime})`,
        where: `Line ${lineCode}`,
        what: problem,
        who: summary.picName?.trim() ?? "",
        how: "Diinput pada summary End Meeting",
        howMuch: "",
        shortTermSolution: "",
      },
    },
    analysisStatus: "draft",
    whys: buildWhyNodes(recordId, problem),
    actions: [buildAction(recordId, summary)],
    updatedAt: summary.createdAt || null,
  };
}

export function recordsFromSessions(
  sessions: DmMeetingSession[],
  me: DmMe
): FiveWhyRecord[] {
  const records: FiveWhyRecord[] = [];
  for (const session of sessions) {
    for (const summary of session.summaries) {
      const record = createRecordFromSummary(summary, session, me);
      if (record) records.push(record);
    }
  }
  return records;
}

export function mergeMeetingRecords(
  saved: FiveWhyStore | null,
  sources: FiveWhyRecord[]
): FiveWhyStore {
  if (sources.length === 0) {
    return { selectedAbnormalId: "", records: [] };
  }
  const savedById = new Map(
    (saved?.records ?? []).map(
      (record) => [record.abnormal.id, record] as const
    )
  );
  const records = sources.map(
    (source) => savedById.get(source.abnormal.id) ?? source
  );
  const selected = saved?.selectedAbnormalId ?? "";
  return {
    selectedAbnormalId: records.some(
      (record) => record.abnormal.id === selected
    )
      ? selected
      : records[0].abnormal.id,
    records,
  };
}
