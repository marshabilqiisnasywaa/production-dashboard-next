"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Circle, CircleCheck, Plus } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import type { FiveWhyAnalysisSummary } from "../api";
import {
  FIVE_WHY_ANALYSIS_LABELS,
  describeProblem,
  formatDateTimeLabel,
} from "./fiveWhyData";
import type { FiveWhyAnalysisStatus } from "./fiveWhyData";

export type FiveWhyLineOption = { id: number; code: string };

type FiveWhyListProps = {
  items: FiveWhyAnalysisSummary[];
  lines: FiveWhyLineOption[];
  newLineId: number;
  creating: boolean;
  createError: string;
  onNewLineChange: (lineId: number) => void;
  onCreate: () => void;
  onOpen: (analysisId: string) => void;
};

type EventDay = { year: number; month: number; day: number };

const COUNTERMEASURES_SHOWN = 3;
const ALL_PERIODS = "all";

function eventDay(item: FiveWhyAnalysisSummary): EventDay {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(item.occurredAt);
  if (match) {
    return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
  }
  const created = new Date(item.createdAt);
  return { year: created.getFullYear(), month: created.getMonth(), day: created.getDate() };
}

function dayStamp(value: EventDay) {
  return value.year * 10000 + value.month * 100 + value.day;
}

function periodKey(value: EventDay) {
  return `${value.year}-${String(value.month + 1).padStart(2, "0")}`;
}

export default function FiveWhyList({
  items,
  lines,
  newLineId,
  creating,
  createError,
  onNewLineChange,
  onCreate,
  onOpen,
}: FiveWhyListProps) {
  const { text: uiText, locale } = useUiText();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const currentKey = periodKey({
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lineFilter, setLineFilter] = useState("all");
  const [period, setPeriod] = useState(ALL_PERIODS);
  const canCreate = lines.length > 0;
  const query = search.trim().toLowerCase();
  const periodName = (key: string) => {
    const [year, month] = key.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
  };
  const shortMonth = (value: number) =>
    new Date(2000, value, 1).toLocaleDateString(locale, { month: "short" });
  const dated = items.map((item) => ({ item, when: eventDay(item) }));
  const lineCodes = Array.from(
    new Set(items.map((item) => item.lineCode).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, locale));
  const matching = dated.filter(
    ({ item }) =>
      (statusFilter === "all" || item.status === statusFilter) &&
      (lineFilter === "all" || item.lineCode === lineFilter) &&
      `${item.nomor} ${item.title} ${item.pengusul} ${item.lineCode} ${item.rootCause} ${item.what} ${item.shortTerm}`
        .toLowerCase()
        .includes(query)
  );
  const periodKeys = Array.from(
    new Set([currentKey, ...dated.map((entry) => periodKey(entry.when))])
  ).sort((a, b) => b.localeCompare(a));
  const options = [ALL_PERIODS, ...periodKeys];
  const optionIndex = Math.max(0, options.indexOf(period));
  const countOf = (key: string) =>
    matching.filter((entry) => periodKey(entry.when) === key).length;
  const shown = matching
    .filter((entry) => period === ALL_PERIODS || periodKey(entry.when) === period)
    .sort(
      (a, b) =>
        dayStamp(b.when) - dayStamp(a.when) ||
        b.item.createdAt.localeCompare(a.item.createdAt)
    );
  const groups = Array.from(new Set(shown.map((entry) => periodKey(entry.when)))).map(
    (key) => ({
      key,
      entries: shown.filter((entry) => periodKey(entry.when) === key),
    })
  );

  function deadlineInfo(value: string, done: boolean) {
    if (!value) return { label: uiText("tanpa tenggat"), late: false };
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return { label: value, late: false };
    return {
      label: date.toLocaleDateString(locale, { day: "2-digit", month: "short" }),
      late: !done && date < todayStart,
    };
  }

  return (
    <section
      className="dm-5w-card dm-5w-documents"
      aria-labelledby="dm-5w-analysis-list-title"
    >
      <div className="dm-5w-document-library-head">
        <h2 className="dm-5w-card-title" id="dm-5w-analysis-list-title">
          {uiText("Daftar analisis")}
        </h2>
        {canCreate ? (
          <div className="dm-5w-analysis-create">
            {lines.length > 1 ? (
              <select
                className="dm-5w-select"
                value={newLineId}
                disabled={creating}
                aria-label={uiText("Line untuk analisis baru")}
                onChange={(event) => onNewLineChange(Number(event.target.value))}
              >
                {lines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.code}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              className="dm-5w-btn dm-5w-btn-primary"
              disabled={creating}
              onClick={onCreate}
            >
              <Plus size={16} aria-hidden="true" />
              {uiText(creating ? "Memproses..." : "Analisis baru")}
            </button>
          </div>
        ) : null}
      </div>
      {createError ? (
        <div className="dm-5w-document-error" role="alert">
          {uiText(createError)}
        </div>
      ) : null}
      <div className="dm-5w-document-fields dm-5w-library-filters">
        <label className="dm-5w-field">
          <span className="dm-5w-label">{uiText("Cari analisis")}</span>
          <input
            className="dm-5w-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="dm-5w-field">
          <span className="dm-5w-label">{uiText("Status analisis")}</span>
          <select
            className="dm-5w-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">{uiText("Semua")}</option>
            {(
              Object.keys(FIVE_WHY_ANALYSIS_LABELS) as FiveWhyAnalysisStatus[]
            ).map((status) => (
              <option key={status} value={status}>
                {uiText(FIVE_WHY_ANALYSIS_LABELS[status])}
              </option>
            ))}
          </select>
        </label>
        <label className="dm-5w-field">
          <span className="dm-5w-label">{uiText("Line")}</span>
          <select
            className="dm-5w-select"
            value={lineFilter}
            onChange={(event) => setLineFilter(event.target.value)}
          >
            <option value="all">{uiText("Semua")}</option>
            {lineCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <div className="dm-5w-field">
          <label className="dm-5w-label" htmlFor="dm-5w-period-select">
            {uiText("Bulan kejadian")}
          </label>
          <div className="dm-5w-period">
            <button
              type="button"
              className="dm-5w-period-step"
              aria-label={uiText("Bulan sebelumnya")}
              disabled={optionIndex >= options.length - 1}
              onClick={() => setPeriod(options[optionIndex + 1])}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <select
              id="dm-5w-period-select"
              className="dm-5w-select"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value={ALL_PERIODS}>
                {uiText("Semua bulan")} ({matching.length})
              </option>
              {periodKeys.map((key) => (
                <option key={key} value={key}>
                  {periodName(key)} ({countOf(key)})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="dm-5w-period-step"
              aria-label={uiText("Bulan berikutnya")}
              disabled={optionIndex <= 0}
              onClick={() => setPeriod(options[optionIndex - 1])}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="dm-5w-cases-empty" role="status">
          {uiText(
            items.length
              ? "Tidak ada analisis yang cocok dengan filter ini."
              : canCreate
              ? "Belum ada analisis 5Why. Pilih Analisis baru untuk memulai."
              : "Belum ada analisis 5Why."
          )}
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="dm-5w-group" aria-label={periodName(group.key)}>
            <h3 className="dm-5w-group-title">
              {periodName(group.key)}
              <span>
                {uiText("{{v0}} analisis, {{v1}} selesai", {
                  v0: group.entries.length,
                  v1: group.entries.filter((entry) => entry.item.status === "done").length,
                })}
              </span>
            </h3>
            <ul className="dm-5w-rows">
              {group.entries.map(({ item, when }) => {
                const cases = item.countermeasures.slice(0, COUNTERMEASURES_SHOWN);
                const more = item.solutionCounts.total - cases.length;
                const whenText = [
                  item.occurredAt ? formatDateTimeLabel(item.occurredAt, locale) : "",
                  item.where,
                ]
                  .filter(Boolean)
                  .join(" · ");
                const statement = describeProblem(item);
                return (
                  <li key={item.id} className="dm-5w-row">
                    <div className="dm-5w-row-date" aria-hidden="true">
                      <strong>{when.day}</strong>
                      <span>{shortMonth(when.month)}</span>
                    </div>
                    <div className="dm-5w-row-body">
                      <p className="dm-5w-row-meta">
                        <span>{item.nomor}</span>
                        {item.lineCode ? <span>{item.lineCode}</span> : null}
                        <span>
                          {uiText("Pengusul")} {item.pengusul || "—"}
                        </span>
                        {item.photoCount > 0 ? (
                          <span>{uiText("{{v0}} foto", { v0: item.photoCount })}</span>
                        ) : null}
                        {item.major ? (
                          <strong className="dm-5w-row-major">{uiText("Major problem")}</strong>
                          
                        ) : null}
                        {Object.keys(item.standard ?? {}).length > 0 ? (
                          <strong className="dm-5w-row-standard">{uiText("Standar baru")}</strong>
                        ) : null}
                        
                      </p>
                      
                      <h4 className="dm-5w-row-title">
                        <button
                          type="button"
                          className="dm-5w-row-open"
                          title={uiText("Buka detail analisis")}
                          onClick={() => onOpen(item.id)}
                        >
                          <span>{item.title.trim() || uiText("Tanpa judul")}</span>
                          <ChevronRight size={18} aria-hidden="true" />
                        </button>
                      </h4>
                      <dl className="dm-5w-row-facts">
                        {whenText || item.downtime ? (
                          <div>
                            <dt>{uiText("Waktu")}</dt>
                            <dd>
                              {whenText}
                              {item.downtime ? (
                                <>
                                  {whenText ? " · " : ""}
                                  <strong>
                                    {uiText("downtime {{v0}} menit", { v0: item.downtime })}
                                  </strong>
                                </>
                              ) : null}
                            </dd>
                          </div>
                        ) : null}
                        <div>
                          <dt>{uiText("Pernyataan masalah")}</dt>
                          <dd className={statement ? "dm-5w-row-statement" : "dm-5w-row-empty"}>
                            {statement || uiText("Belum diisi")}
                          </dd>
                        </div>
                        <div>
                          <dt>{uiText("Root Cause")}</dt>
                          <dd>
                            {item.rootCause ? (
                              <span className="dm-5w-row-cause">{item.rootCause}</span>
                            ) : (
                              <span className="dm-5w-row-pending">{uiText("Belum ditandai")}</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>{uiText("Solusi")}</dt>
                          <dd>
                            {item.solutionCounts.total > 0 ? (
                              <>
                                <p className="dm-5w-row-progress">
                                  {uiText("{{v0}} dari {{v1}} solusi selesai", {
                                    v0: item.solutionCounts.standar,
                                    v1: item.solutionCounts.total,
                                  })}
                                </p>
                                <ul className="dm-5w-row-solutions">
                                  {cases.map((solution, index) => {
                                    const due = deadlineInfo(solution.deadline, solution.done);
                                    return (
                                      <li key={index}>
                                        {solution.done ? (
                                          <CircleCheck
                                            className="dm-5w-row-done"
                                            size={16}
                                            aria-label={uiText("Selesai")}
                                            role="img"
                                          />
                                        ) : (
                                          <Circle
                                            size={16}
                                            aria-label={uiText("Belum selesai")}
                                            role="img"
                                          />
                                        )}
                                        <span>
                                          {solution.text || uiText("Solusi belum ditulis")}
                                          <small className={due.late ? "is-late" : ""}>
                                            {solution.pic || uiText("PIC belum diisi")} · {due.label}
                                            {due.late ? ` · ${uiText("lewat tenggat")}` : ""}
                                          </small>
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                                {more > 0 ? (
                                  <span className="dm-5w-row-more">
                                    {uiText("+{{v0}} solusi lainnya", { v0: more })}
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span className="dm-5w-row-pending">{uiText("Belum ada solusi")}</span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <span className={`dm-5w-row-status is-${item.status}`}>
                      {uiText(FIVE_WHY_ANALYSIS_LABELS[item.status])}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
