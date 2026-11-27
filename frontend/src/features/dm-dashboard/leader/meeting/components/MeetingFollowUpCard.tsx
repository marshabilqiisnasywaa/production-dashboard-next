"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useUiText } from "@/locales/useUiText";
import {
  accountApi,
  meetingApi,
  papercardApi,
  type DmLine,
  type DmMyProblem,
  type DmPapercardSubmission,
} from "../../../api";
import { departmentLabel } from "../../../departments";
import { useNow } from "../../hooks/useNow";
import { AddProblemModal } from "../../problems/components/AddProblemModal";
import { CategoryCodeBadges } from "../../problems/components/CategoryCodeBadges";
import ProblemDetailDrawer from "../../problems/components/ProblemDetailDrawer";
import type { ProblemRow } from "../../problems/types";
import {
  formatMeetingDate,
  formatOverdue,
  getStatus,
  sortRows,
} from "../../problems/utils";
import { formatDue } from "../utils";

type TabKey = "problems" | "papercards";

interface Props {
  variant: "dm" | "workshop";
  meetingLines: string[];
  sessionLineId: number | null;
  groupLineIds: number[];
  workshopName: string | null;
  userRole: string | null;
  userKind: "admin" | "employee" | null;
}

function toProblemRow(p: DmMyProblem, now: Date): ProblemRow {
  const due = p.dueDate ?? "";
  const isSolved = p.status === "resolved";
  const status = getStatus(isSolved, due, now);
  const dueTime = due ? new Date(due).getTime() : 0;

  return {
    id: String(p.id),
    canEdit: p.canEdit ?? false,
    date: p.date,
    sessionLabel: p.sessionLabel ?? "-",
    line: p.lineCode ?? "-",
    lineCodes: p.lineCodes,
    pics: p.pics,
    problem: p.problem,
    problemCategories: p.problemCategories ?? [],
    categoryCodes: p.categoryCodes ?? null,
    occurredAt: p.occurredAt ?? null,
    respondedAt: p.respondedAt ?? null,
    solution: p.solution ?? null,
    picName: p.picName ?? "-",
    picDept: p.picDept ?? null,
    due,
    status,
    overdueMs: status === "escalated" && dueTime ? now.getTime() - dueTime : 0,
    solvedAt: null,
    sample: false,
  };
}

function problemMatchesLines(row: ProblemRow, lineCodes: Set<string>): boolean {
  if (lineCodes.size === 0) return true;
  if (row.lineCodes?.length) {
    return row.lineCodes.some((code) => lineCodes.has(code));
  }
  return row.line
    .split(",")
    .map((part) => part.trim())
    .some((code) => lineCodes.has(code));
}

export function MeetingFollowUpCard({
  variant,
  meetingLines,
  sessionLineId,
  groupLineIds,
  workshopName,
  userRole,
  userKind,
}: Props) {
  const { text: uiText, locale: uiLocale } = useUiText();
  const now = useNow(60_000);
  const [tab, setTab] = useState<TabKey>("problems");
  const [showAllProblems, setShowAllProblems] = useState(false);

  const [rawProblems, setRawProblems] = useState<DmMyProblem[]>([]);
  const [submissions, setSubmissions] = useState<DmPapercardSubmission[]>([]);
  const [allLines, setAllLines] = useState<DmLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editingProblem, setEditingProblem] = useState<ProblemRow | null>(null);
  const [editInitialSolved, setEditInitialSolved] = useState(false);
  const [detailProblem, setDetailProblem] = useState<ProblemRow | null>(null);

  const canEditProblem =
    userKind === "admin" || userRole === "leader" || userRole === "supervisor";
  const canApprovePapercard = userKind === "admin" || userRole === "supervisor";

  const targetLineIdsKey = useMemo(() => {
    const ids =
      groupLineIds.length > 0
        ? groupLineIds
        : sessionLineId !== null
        ? [sessionLineId]
        : [];
    return Array.from(new Set(ids))
      .sort((a, b) => a - b)
      .join(",");
  }, [groupLineIds, sessionLineId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const targetIds = targetLineIdsKey
        ? targetLineIdsKey.split(",").map(Number).filter(Boolean)
        : [];

      const linesPromise = accountApi.lines().catch(() => [] as DmLine[]);
      const problemsPromise = meetingApi.problems();
      const submissionsPromise =
        variant === "dm" && targetIds.length > 0
          ? Promise.all(
              targetIds.map((lineId) =>
                papercardApi
                  .listSubmissions({ lineId })
                  .catch(() => [] as DmPapercardSubmission[])
              )
            ).then((lists) => {
              const byId = new Map<number, DmPapercardSubmission>();
              for (const list of lists) {
                for (const item of list) byId.set(item.id, item);
              }
              return Array.from(byId.values());
            })
          : papercardApi
              .listSubmissions({})
              .catch(() => [] as DmPapercardSubmission[]);

      const [linesRes, problemsRes, submissionsRes] = await Promise.all([
        linesPromise,
        problemsPromise,
        submissionsPromise,
      ]);

      setAllLines(linesRes);
      setRawProblems(problemsRes);
      setSubmissions(submissionsRes);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat daftar masalah & papercard."
      );
    } finally {
      setLoading(false);
    }
  }, [variant, targetLineIdsKey]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const lineById = useMemo(
    () => new Map(allLines.map((line) => [line.id, line])),
    [allLines]
  );

  const scopeLineCodes = useMemo(() => {
    if (variant === "dm") {
      return new Set(meetingLines);
    }
    if (!workshopName) return new Set<string>();
    return new Set(
      allLines
        .filter((line) => line.workshopName === workshopName)
        .map((line) => line.code)
    );
  }, [variant, meetingLines, workshopName, allLines]);

  const scopeLineIds = useMemo(() => {
    if (variant === "dm") {
      const ids =
        groupLineIds.length > 0
          ? groupLineIds
          : sessionLineId !== null
          ? [sessionLineId]
          : [];
      return new Set(ids);
    }
    if (!workshopName) return new Set<number>();
    return new Set(
      allLines
        .filter((line) => line.workshopName === workshopName)
        .map((line) => line.id)
    );
  }, [variant, groupLineIds, sessionLineId, workshopName, allLines]);

  const allUnsolvedProblems = useMemo(() => {
    const refNow = now ?? new Date();
    const mapped = rawProblems
      .filter((item) => item.status !== "resolved")
      .map((item) => toProblemRow(item, refNow));
    return sortRows(mapped);
  }, [rawProblems, now]);

  const scopedUnsolvedProblems = useMemo(() => {
    if (scopeLineCodes.size === 0) return allUnsolvedProblems;
    return allUnsolvedProblems.filter(
      (row) =>
        problemMatchesLines(row, scopeLineCodes) ||
        (variant === "workshop" && Number(row.id) < 0)
    );
  }, [allUnsolvedProblems, scopeLineCodes, variant]);

  const visibleProblems = showAllProblems
    ? allUnsolvedProblems
    : scopedUnsolvedProblems;

  const pendingPapercards = useMemo(() => {
    return submissions
      .filter((sub) => sub.approvalStatus.toLowerCase() !== "approved")
      .filter((sub) => {
        if (
          variant === "workshop" &&
          userKind === "admin" &&
          scopeLineIds.size > 0
        ) {
          return scopeLineIds.has(sub.lineId);
        }
        return true;
      })
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [submissions, variant, userKind, scopeLineIds]);

  async function handleMarkSolved(row: ProblemRow) {
    setBusyId(`pb-${row.id}`);
    setActionError(null);
    try {
      await meetingApi.setProblemStatus(Number(row.id), "resolved");
      setRawProblems((prev) =>
        prev.map((item) =>
          String(item.id) === row.id ? { ...item, status: "resolved" } : item
        )
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal menandai masalah selesai."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprovePapercard(sub: DmPapercardSubmission) {
    setBusyId(`pc-${sub.id}`);
    setActionError(null);
    try {
      await papercardApi.approve(sub.id, { approvalStatus: "approved" });
      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === sub.id ? { ...item, approvalStatus: "approved" } : item
        )
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal ACC papercard."
      );
    } finally {
      setBusyId(null);
    }
  }

  const scopeLabel = variant === "workshop" ? "Workshop ini" : "Lini ini";

  return (
    <>
      <Card
        className="dml-mt-followup"
        title={uiText("Masalah & Papercard Belum Selesai")}
        subtitle={uiText(
          "Tinjau masalah DM yang belum selesai dan papercard yang belum di-ACC SPV sebelum mencatat summary baru."
        )}
      >
        <div className="dml-mt-followup__bar">
          <div
            className="ui-segmented dml-mt-followup__tabs"
            role="tablist"
            aria-label={uiText("Daftar pembahasan meeting")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "problems"}
              className={
                "ui-segmented__btn dml-mt-followup__tab" +
                (tab === "problems" ? " is-active" : "")
              }
              onClick={() => setTab("problems")}
            >
              <span>{uiText("Masalah")}</span>
              <span
                className={
                  "dml-mt-followup__count" +
                  (scopedUnsolvedProblems.length > 0 ? " is-warn" : "")
                }
              >
                {scopedUnsolvedProblems.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === "papercards"}
              className={
                "ui-segmented__btn dml-mt-followup__tab" +
                (tab === "papercards" ? " is-active" : "")
              }
              onClick={() => setTab("papercards")}
            >
              <span>{uiText("Papercard")}</span>
              <span
                className={
                  "dml-mt-followup__count" +
                  (pendingPapercards.length > 0 ? " is-warn" : "")
                }
              >
                {pendingPapercards.length}
              </span>
            </button>
          </div>

          <div className="dml-mt-followup__tools">
            {tab === "problems" &&
              scopeLineCodes.size > 0 &&
              allUnsolvedProblems.length > scopedUnsolvedProblems.length && (
                <Button
                  variant={showAllProblems ? "primary" : "outline"}
                  onClick={() => setShowAllProblems((prev) => !prev)}
                >
                  {showAllProblems
                    ? `${uiText(scopeLabel)} (${scopedUnsolvedProblems.length})`
                    : `${uiText("Semua")} (${allUnsolvedProblems.length})`}
                </Button>
              )}

            <Button
              variant="outline"
              className="dml-mt-followup__icon-btn"
              aria-label={uiText("Muat ulang data")}
              title={uiText("Muat ulang data")}
              disabled={loading}
              onClick={() => void loadData()}
            >
              <RefreshCw
                size={15}
                aria-hidden="true"
                className={loading ? "dml-mt-followup__spin" : undefined}
              />
            </Button>
          </div>
        </div>

        {actionError && (
          <p className="dml-mt-followup__error" role="alert">
            {uiText(actionError)}
          </p>
        )}

        {error ? (
          <div className="dml-mt-followup__state" role="alert">
            <span>{uiText(error)}</span>
            <Button variant="outline" onClick={() => void loadData()}>
              {uiText("Coba lagi")}
            </Button>
          </div>
        ) : loading ? (
          <div className="dml-mt-followup__state" role="status">
            {uiText("Memuat daftar pembahasan…")}
          </div>
        ) : tab === "problems" ? (
          visibleProblems.length === 0 ? (
            <div className="dml-mt-followup__state">
              {uiText("Tidak ada masalah DM yang belum selesai.")}
            </div>
          ) : (
            <ul className="dml-mt-followup__list">
              {visibleProblems.map((row) => {
                const isEscalated = row.status === "escalated";
                const isBusy = busyId === `pb-${row.id}`;
                return (
                  <li key={row.id} className="dml-mt-followup__item">
                    <div className="dml-mt-followup__item-main">
                      <div className="dml-mt-followup__badges">
                        <span
                          className={
                            "ui-chip " +
                            (isEscalated ? "ui-chip--ng" : "ui-chip--wait")
                          }
                        >
                          {isEscalated
                            ? uiText("Eskalasi SPV")
                            : uiText("Belum Selesai")}
                        </span>
                        <span className="ui-chip ui-chip--ok">{row.line}</span>
                        {isEscalated && row.overdueMs > 0 && (
                          <span className="dml-mt-followup__overdue">
                            {uiText("Terlambat ")}{" "}
                            {uiText(formatOverdue(row.overdueMs, uiLocale))}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="dml-mt-followup__title-btn"
                        onClick={() => setDetailProblem(row)}
                      >
                        {row.problem}
                      </button>

                      <div className="dml-mt-followup__meta">
                        <span>
                          {uiText("PIC")}: <strong>{row.picName}</strong>
                        </span>
                        <span>
                          {uiText("Due")}:{" "}
                          {row.due ? uiText(formatDue(row.due, uiLocale)) : "—"}
                        </span>
                        <span>
                          {row.date
                            ? formatMeetingDate(row.date, uiLocale)
                            : "—"}
                        </span>
                      </div>

                      {row.problemCategories?.length ||
                      row.categoryCodes?.length ? (
                        <div className="dml-mt-followup__cats">
                          <CategoryCodeBadges
                            categories={row.problemCategories}
                            codes={row.categoryCodes}
                          />
                        </div>
                      ) : null}
                      {row.solution && (
                        <p className="dml-mt-followup__solution">
                          <strong>{uiText("Solusi")}:</strong> {row.solution}
                        </p>
                      )}
                    </div>

                    <div className="dml-mt-followup__actions">
                      {canEditProblem && (
                        <Button
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => {
                            setEditInitialSolved(false);
                            setEditingProblem(row);
                          }}
                        >
                          <Pencil size={14} aria-hidden="true" />
                          <span>{uiText("Edit")}</span>
                        </Button>
                      )}
                      {(canEditProblem || row.canEdit) && (
                        <Button
                          variant="primary"
                          disabled={isBusy}
                          onClick={() => {
                            if (row.solution?.trim() && row.canEdit) {
                              void handleMarkSolved(row);
                            } else {
                              setEditInitialSolved(true);
                              setEditingProblem(row);
                            }
                          }}
                        >
                          <Check size={14} aria-hidden="true" />
                          <span>{uiText("Selesai")}</span>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : pendingPapercards.length === 0 ? (
          <div className="dml-mt-followup__state">
            {uiText("Semua papercard sudah di-ACC SPV.")}
          </div>
        ) : (
          <ul className="dml-mt-followup__list">
            {pendingPapercards.map((sub) => {
              const line = lineById.get(sub.lineId);
              const lineLabel = line?.code ?? `Line #${sub.lineId}`;
              const isRejected =
                sub.approvalStatus.toLowerCase() === "rejected";
              const isNg = sub.status.toUpperCase() === "NG";
              const isBusy = busyId === `pc-${sub.id}`;

              return (
                <li key={sub.id} className="dml-mt-followup__item">
                  <div className="dml-mt-followup__item-main">
                    <div className="dml-mt-followup__badges">
                      <span
                        className={
                          "ui-chip " +
                          (isRejected ? "ui-chip--ng" : "ui-chip--wait")
                        }
                      >
                        {isRejected
                          ? uiText("Ditolak SPV")
                          : uiText("Menunggu ACC SPV")}
                      </span>
                      <span
                        className={
                          "ui-chip " + (isNg ? "ui-chip--ng" : "ui-chip--ok")
                        }
                      >
                        {sub.status.toUpperCase()}
                      </span>
                      <span className="ui-chip ui-chip--ok">{lineLabel}</span>
                      <span className="ui-chip ui-chip--muted">
                        {uiText(departmentLabel(sub.department))}
                      </span>
                    </div>

                    <div className="dml-mt-followup__pc-title">
                      <strong>
                        {sub.employeeName ?? sub.employeeNo ?? "-"}
                      </strong>
                      {sub.employeeNo ? (
                        <span className="dml-mt-followup__muted">
                          {" "}
                          ({sub.employeeNo})
                        </span>
                      ) : null}
                    </div>

                    <div className="dml-mt-followup__meta">
                      <span>
                        {sub.date ? formatMeetingDate(sub.date, uiLocale) : "—"}{" "}
                        · {sub.shift}
                      </span>
                      {sub.recipientSupervisorName && (
                        <span>
                          SPV: <strong>{sub.recipientSupervisorName}</strong>
                        </span>
                      )}
                    </div>

                    {sub.abnormalNotes && (
                      <p className="dml-mt-followup__note">
                        {sub.abnormalNotes}
                      </p>
                    )}
                  </div>

                  {canApprovePapercard && (
                    <div className="dml-mt-followup__actions">
                      <Button
                        variant="primary"
                        disabled={isBusy}
                        onClick={() => void handleApprovePapercard(sub)}
                      >
                        <Check size={14} aria-hidden="true" />
                        <span>
                          {isBusy ? uiText("Menyimpan…") : uiText("ACC")}
                        </span>
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <AddProblemModal
        open={Boolean(editingProblem)}
        editingProblem={editingProblem}
        initialSolved={editInitialSolved}
        onClose={() => {
          setEditingProblem(null);
          setEditInitialSolved(false);
        }}
        onCreated={() => {
          setEditingProblem(null);
          setEditInitialSolved(false);
          void loadData();
        }}
      />

      <ProblemDetailDrawer
        problem={detailProblem}
        onClose={() => setDetailProblem(null)}
      />
    </>
  );
}
