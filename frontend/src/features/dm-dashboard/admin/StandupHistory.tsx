"use client";
import { useUiText } from "@/locales/useUiText";

import { Fragment, useEffect, useMemo, useState } from "react";
import { meetingApi, type DmLine, type DmMeetingSession } from "../api";
import { ProblemLoadError } from "../leader/problems/components/ProblemLoadError";
import { addDays, formatDate, formatHm, localDate } from "../leader/log/utils";
import { HistoryChip, HistoryPager, type HistoryChipTone } from "./HistoryParts";
import "../leader/problems/problems.css";
import "./History.css";

const DEFAULT_RANGE_DAYS = 14;
const PAGE_SIZE = 10;
// Sesuaikan dengan daftar shift yang dipakai di pabrik.
const SHIFT_OPTIONS = ["Shift 1", "Shift 2", "Shift 3"];

const STATUS_VIEW: Record<
  DmMeetingSession["status"],
  { tone: HistoryChipTone; label: string }
> = {
  completed: { tone: "ok", label: "Selesai" },
  in_progress: { tone: "wait", label: "Berlangsung" },
  pending: { tone: "muted", label: "Belum dimulai" },
};

function absenceLabel(
  status: string,
  reason: string | null | undefined
): string {
  if (status === "permit") return "Izin";
  if (status === "sick") return "Sakit";
  if (reason === "represented") return "Diwakilkan";
  return "Tidak hadir";
}

export default function StandupHistory({
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
  const [shift, setShift] = useState(SHIFT_OPTIONS[0]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [sessions, setSessions] = useState<DmMeetingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  // Endpoint riwayat meeting butuh satu line, jadi pilih line pertama
  // begitu daftar line sudah termuat.
  useEffect(() => {
    if (!lineId && lines.length > 0) setLineId(String(lines[0].id));
  }, [lines, lineId]);

  useEffect(() => {
    if (!lineId || !from || !to) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    call(() => meetingApi.history(Number(lineId), from, to, shift))
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Gagal memuat riwayat meeting."
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lineId, from, to, shift, call, attempt]);

  useEffect(() => {
    setPage(1);
    setOpenId(null);
  }, [lineId, from, to, shift, status, search]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...sessions]
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || a.sessionNumber - b.sessionNumber
      )
      .filter((s) => {
        if (status && s.status !== status) return false;
        if (!query) return true;
        return [s.label, s.leaderName, s.dmGroupName, s.date].some((value) =>
          value?.toLowerCase().includes(query)
        );
      });
  }, [sessions, status, search]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="dml-pb is-admin dm-history">
      <section
        className="dml-pb-panel"
        aria-label={uiText("Riwayat standup meeting")}
        aria-busy={loading}
      >
        <div className="dml-pb-toolbar">
          <div className="dml-pb-search">
            <input
              type="search"
              aria-label={uiText("Cari riwayat meeting")}
              placeholder={uiText("Cari sesi, pemimpin, atau tanggal...")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="dml-pb-filters">
            <label className="dm-history-date">
              {uiText("Dari")}
              <input
                type="date"
                aria-label={uiText("Dari tanggal")}
                value={from}
                max={to || undefined}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label className="dm-history-date">
              {uiText("Sampai")}
              <input
                type="date"
                aria-label={uiText("Sampai tanggal")}
                value={to}
                min={from || undefined}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
            <select
              aria-label={uiText("Pilih line meeting")}
              value={lineId}
              onChange={(event) => setLineId(event.target.value)}
            >
              {lines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code || item.name}
                </option>
              ))}
            </select>
            <select
              aria-label={uiText("Pilih shift meeting")}
              value={shift}
              onChange={(event) => setShift(event.target.value)}
            >
              {SHIFT_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              aria-label={uiText("Filter status meeting")}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">{uiText("Semua status")}</option>
              <option value="completed">{uiText("Selesai")}</option>
              <option value="in_progress">{uiText("Berlangsung")}</option>
              <option value="pending">{uiText("Belum dimulai")}</option>
            </select>
            <button
              type="button"
              className="dml-pb-reset"
              onClick={() => {
                setFrom(addDays(localDate(new Date()), -DEFAULT_RANGE_DAYS));
                setTo(localDate(new Date()));
                setShift(SHIFT_OPTIONS[0]);
                setStatus("");
                setSearch("");
              }}
            >
              {uiText("Reset")}
            </button>
            <button
              type="button"
              className="dml-pb-reset"
              disabled={loading || !lineId}
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
            {uiText("Memuat riwayat meeting...")}
          </div>
        ) : (
          <>
            <div className="dml-pb-result-count" role="status">
              {uiText("Menampilkan ")}
              <strong>{visible.length}</strong>
              {uiText(" sesi meeting")}
            </div>
            <div
              className="dml-pb-table-wrap"
              tabIndex={0}
              role="region"
              aria-label={uiText(
                "Tabel riwayat meeting, geser untuk melihat semua kolom"
              )}
            >
              <table className="dml-pb-table dm-history-table">
                <thead>
                  <tr>
                    {[
                      "Tanggal",
                      "Sesi",
                      "Jadwal",
                      "Waktu",
                      "Kehadiran",
                      "Pemimpin",
                      "Masalah",
                      "Status",
                      "",
                    ].map((heading, index) => (
                      <th key={index} scope="col">
                        {heading ? uiText(heading) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="dml-empty">
                        {uiText("Tidak ada meeting pada filter yang dipilih.")}
                      </td>
                    </tr>
                  ) : (
                    paged.map((s) => {
                      const view = STATUS_VIEW[s.status];
                      const present = s.attendances.filter(
                        (a) => a.status === "present"
                      ).length;
                      const absent = s.attendances.filter(
                        (a) => a.status !== "present"
                      );
                      const minutes = Math.round(s.durationSeconds / 60);
                      const open = openId === s.id;
                      return (
                        <Fragment key={s.id}>
                          <tr
                            className={open ? "is-selected" : undefined}
                            onClick={() => setOpenId(open ? null : s.id)}
                          >
                            <td className="is-strong">
                              {formatDate(s.date, uiLocale)}
                            </td>
                            <td>
                              {s.label ||
                                uiText("Sesi {{v0}}", { v0: s.sessionNumber })}
                              {s.meetingScope === "dm" && s.dmGroupName && (
                                <div className="dm-history-sub">
                                  {s.dmGroupName}
                                </div>
                              )}
                            </td>
                            <td>{s.scheduledTime}</td>
                            <td>
                              {s.startedAt ? (
                                <>
                                  {formatHm(s.startedAt)}–
                                  {s.endedAt ? formatHm(s.endedAt) : "…"}
                                  {minutes > 0 && (
                                    <div className="dm-history-sub">
                                      {minutes} {uiText("mnt")}
                                    </div>
                                  )}
                                </>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>
                              {s.attendances.length
                                ? `${present}/${s.attendances.length}`
                                : "-"}
                            </td>
                            <td>{s.leaderName || "-"}</td>
                            <td>{s.summaries.length}</td>
                            <td>
                              <HistoryChip tone={view.tone}>
                                {uiText(view.label)}
                              </HistoryChip>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="dm-history-toggle"
                                aria-expanded={open}
                                aria-label={uiText("Lihat detail meeting")}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenId(open ? null : s.id);
                                }}
                              >
                                {open ? "⌃" : "⌄"}
                              </button>
                            </td>
                          </tr>
                          {open && (
                            <tr className="dm-history-detail-row">
                              <td colSpan={9}>
                                <div className="dm-history-detail">
                                  <div>
                                    <h4>{uiText("Tidak hadir")}</h4>
                                    {absent.length === 0 ? (
                                      <p>{uiText("Semua anggota hadir.")}</p>
                                    ) : (
                                      <ul>
                                        {absent.map((a) => (
                                          <li key={a.id}>
                                            {a.employeeName ||
                                              a.employeeNo ||
                                              "-"}
                                            {" · "}
                                            {uiText(
                                              absenceLabel(
                                                a.status,
                                                a.absenceReason
                                              )
                                            )}
                                            {a.absenceNote && ` (${a.absenceNote})`}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <div>
                                    <h4>{uiText("Masalah & tindak lanjut")}</h4>
                                    {s.summaries.length === 0 ? (
                                      <p>{uiText("Tidak ada masalah dicatat.")}</p>
                                    ) : (
                                      <ul>
                                        {s.summaries.map((item) => (
                                          <li key={item.id}>
                                            <strong>{item.problem}</strong>
                                            <div className="dm-history-sub">
                                              {uiText("PIC")}: {item.picName}
                                              {item.dueDate &&
                                                ` · ${uiText("Tenggat")} ${item.dueDate}`}
                                              {" · "}
                                              {item.status}
                                            </div>
                                            {item.solution && (
                                              <div className="dm-history-sub">
                                                {uiText("Solusi")}:{" "}
                                                {item.solution}
                                              </div>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
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
              unitName={uiText("sesi meeting")}
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
