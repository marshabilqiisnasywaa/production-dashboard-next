"use client";
import { useUiText } from "@/locales/useUiText";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Clock, X } from "lucide-react";
import { papercardApi, type DmLine, type DmPapercardSubmission } from "../api";
import { departmentLabel } from "../departments";
import { ProblemLoadError } from "../leader/problems/components/ProblemLoadError";
import { addDays, formatDate, formatHm, localDate } from "../leader/log/utils";
import { DateRangePicker } from "../scorecard/ScorecardFilters";
import { papercardProblemRows } from "./papercardProblemRows";
import {
  HistoryChip,
  HistoryPager,
  type HistoryChipTone,
} from "./HistoryParts";
import "../leader/problems/problems.css";
import "./History.css";

const DEFAULT_RANGE_DAYS = 7;

const PAGE_SIZE = 10;
const LATE_NOTE_PREFIX = "Terlambat mengirim papercard.";

const ICON_PROPS = { size: 13, strokeWidth: 2.5, "aria-hidden": true } as const;

const APPROVAL_VIEW: Record<
  string,
  { tone: HistoryChipTone; label: string; icon: ReactNode }
> = {
  approved: { tone: "ok", label: "Disetujui", icon: <Check {...ICON_PROPS} /> },
  rejected: { tone: "red", label: "Ditolak", icon: <X {...ICON_PROPS} /> },
};

function approvalView(value: string | null | undefined) {
  return (
    APPROVAL_VIEW[(value ?? "").toLowerCase()] ?? {
      tone: "wait" as HistoryChipTone,
      label: "Menunggu",
      icon: <Clock {...ICON_PROPS} />,
    }
  );
}

/** Catatan saja: baris otomatis "Terlambat mengirim papercard. Batas ... dikirim ..." dibuang. */
function notesOf(s: DmPapercardSubmission): string {
  return [s.supervisorNotes, s.abnormalNotes]
    .filter(Boolean)
    .join("\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(LATE_NOTE_PREFIX))
    .join("\n");
}

export default function PapercardHistory({
  lines,
  call,
}: {
  lines: DmLine[];
  call: <T>(fn: () => Promise<T>) => Promise<T>;
}) {
  const { text: uiText, locale: uiLocale } = useUiText();
  const [from, setFrom] = useState(() =>
    addDays(localDate(new Date()), -DEFAULT_RANGE_DAYS)
  );
  const [to, setTo] = useState(() => localDate(new Date()));
  const [lineId, setLineId] = useState("");
  const [department, setDepartment] = useState("");
  const [result, setResult] = useState("");
  const [search, setSearch] = useState("");
  const [submissions, setSubmissions] = useState<DmPapercardSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);

  // API hanya menerima satu tanggal. Kalau rentang > 1 hari, ambil semua lalu
  // saring per rentang di client.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    call(() =>
      papercardApi.listSubmissions({
        lineId: lineId ? Number(lineId) : undefined,
        date: from && from === to ? from : undefined,
      })
    )
      .then((data) => {
        if (!cancelled) setSubmissions(data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, lineId, call, attempt]);

  useEffect(() => {
    setPage(1);
  }, [from, to, lineId, department, result, search]);

  const lineNames = useMemo(
    () => new Map(lines.map((item) => [item.id, item.code || item.name])),
    [lines]
  );

  const rows = useMemo(
    () =>
      submissions
        .map((submission) => {
          const problems = papercardProblemRows([submission]);
          return {
            submission,
            late: problems.some((item) => item.late),
            ngCount: problems.filter((item) => !item.late).length,
            okCount: submission.answers.filter(
              (answer: { status?: string } | null) => answer?.status === "OK"
            ).length,
          };
        })
        .sort(
          (a, b) =>
            b.submission.date.localeCompare(a.submission.date) ||
            (b.submission.submittedAt ?? "").localeCompare(
              a.submission.submittedAt ?? ""
            )
        ),
    [submissions]
  );

  const departments = useMemo(
    () => [...new Set(submissions.map((item) => item.department))].sort(),
    [submissions]
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(({ submission: s, late, ngCount }) => {
      if (from && s.date < from) return false;
      if (to && s.date > to) return false;
      if (department && s.department !== department) return false;
      if (result === "ok" && (late || ngCount > 0)) return false;
      if (result === "ng" && ngCount === 0) return false;
      if (result === "late" && !late) return false;
      if (!query) return true;
      return [
        s.employeeName,
        s.employeeNo,
        s.recipientSupervisorName,
        s.approvedByName,
        lineNames.get(s.lineId),
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [rows, from, to, department, result, search, lineNames]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="dml-pb is-admin dm-history">
      <section
        className="dml-pb-panel"
        aria-label={uiText("Riwayat papercard")}
        aria-busy={loading}
      >
        <div className="dml-pb-toolbar">
          <div className="dml-pb-search">
            <input
              type="search"
              aria-label={uiText("Cari riwayat papercard")}
              placeholder={uiText("Cari nama, NIK, line, atau supervisor...")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="dml-pb-filters">
            <div className="dm-history-field">
              <DateRangePicker
                value={{ from, to }}
                onChange={(range) => {
                  setFrom(range.from);
                  setTo(range.to);
                }}
              />
            </div>
            <select
              aria-label={uiText("Filter line papercard")}
              value={lineId}
              onChange={(event) => setLineId(event.target.value)}
            >
              <option value="">{uiText("Semua line")}</option>
              {lines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code || item.name}
                </option>
              ))}
            </select>
            <select
              aria-label={uiText("Filter departemen papercard")}
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="">{uiText("Semua departemen")}</option>
              {[...new Set([...departments, ...(department ? [department] : [])])]
                .sort()
                .map((item) => (
                  <option key={item} value={item}>
                    {uiText(departmentLabel(item))}
                  </option>
                ))}
            </select>
            <select
              aria-label={uiText("Filter hasil papercard")}
              value={result}
              onChange={(event) => setResult(event.target.value)}
            >
              <option value="">{uiText("Semua hasil")}</option>
              <option value="ok">{uiText("OK")}</option>
              <option value="ng">{uiText("Ada temuan NG")}</option>
              <option value="late">{uiText("Terlambat")}</option>
            </select>
            <button
              type="button"
              className="dml-pb-reset"
              onClick={() => {
                setFrom(addDays(localDate(new Date()), -DEFAULT_RANGE_DAYS));
                setTo(localDate(new Date()));
                setLineId("");
                setDepartment("");
                setResult("");
                setSearch("");
              }}
            >
              {uiText("Reset")}
            </button>
            <button
              type="button"
              className="dml-pb-reset"
              disabled={loading}
              onClick={() => setAttempt((value) => value + 1)}
            >
              {uiText("Muat ulang")}
            </button>
          </div>
        </div>

        {error ? (
          <ProblemLoadError
            error={error}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        ) : loading ? (
          <div className="dml-empty" role="status">
            {uiText("Memuat riwayat papercard...")}
          </div>
        ) : (
          <>
            <div
              className="dml-pb-table-wrap"
              tabIndex={0}
              role="region"
              aria-label={uiText(
                "Tabel riwayat papercard, geser untuk melihat semua kolom"
              )}
            >
              <table className="dml-pb-table dm-history-table">
                <thead>
                  <tr>
                    {[
                      "Tanggal",
                      "Line",
                      "Departemen",
                      "Pengirim",
                      "Dikirim",
                      "Hasil",
                      "Status",
                      "Disetujui oleh",
                      "Catatan",
                    ].map((heading) => (
                      <th key={heading} scope="col">
                        {uiText(heading)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="dml-empty">
                        {uiText("Tidak ada papercard pada filter yang dipilih.")}
                      </td>
                    </tr>
                  ) : (
                    paged.map(({ submission: s, late, ngCount, okCount }) => {
                      const approval = approvalView(s.approvalStatus);
                      const note = notesOf(s);
                      return (
                        <tr key={s.id}>
                          <td className="is-strong">
                            {formatDate(s.date, uiLocale)}
                          </td>
                          <td>
                            {lineNames.get(s.lineId) ||
                              uiText("Line #{{v0}}", { v0: s.lineId })}
                          </td>
                          <td>{uiText(departmentLabel(s.department))}</td>
                          <td>
                            {s.employeeName || "-"}
                            {s.employeeNo && (
                              <div className="dm-history-sub">
                                {s.employeeNo}
                              </div>
                            )}
                          </td>
                          <td>
                            {s.submittedAt ? formatHm(s.submittedAt) : "-"}
                          </td>
                          <td>
                            {late && (
                              <HistoryChip tone="red">
                                {uiText("Terlambat")}
                              </HistoryChip>
                            )}
                            <div className="dm-history-count">
                              {ngCount + okCount === 0
                                ? "-"
                                : `${uiText("NG")} ${ngCount} · ${uiText("OK")} ${okCount}`}
                            </div>
                          </td>
                          <td>
                            <HistoryChip tone={approval.tone} icon={approval.icon}>
                              {uiText(approval.label)}
                            </HistoryChip>
                          </td>
                          <td>{s.approvedByName || "-"}</td>
                          <td className="dm-history-note">{note || "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <HistoryPager
              page={safePage}
              pageSize={PAGE_SIZE}
              total={visible.length}
              unitName={uiText("papercard")}
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
