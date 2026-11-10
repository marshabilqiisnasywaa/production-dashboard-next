"use client";

import { useEffect, useMemo, useState } from "react";
import { useUiText } from "@/locales/useUiText";
import { publicApi, type DmHistoryStoredRow } from "../api";
import { DateRangePicker, type DateRangeValue } from "../scorecard/ScorecardFilters";
import { jakartaToday } from "../scorecard/useScorecardData";
import "./historical-attendance.css";

export default function HistoricalAttendancePanel({ range, level, session }: {
  range: DateRangeValue; level: string; session: string;
}) {
  const { text: uiText } = useUiText();
  const [override, setOverride] = useState<DateRangeValue | null>(null);
  const [rows, setRows] = useState<DmHistoryStoredRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const activeRange = override ?? range;
  useEffect(() => { setOverride(null); setPage(1); }, [range.from, range.to]);
  useEffect(() => { setPage(1); }, [level, session]);
  useEffect(() => {
    const reload = () => setRefresh((value) => value + 1);
    window.addEventListener("dm-history-imported", reload);
    window.addEventListener("focus", reload);
    return () => { window.removeEventListener("dm-history-imported", reload); window.removeEventListener("focus", reload); };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    publicApi.historicalAttendance(activeRange)
      .then((data) => { if (active) setRows(data); })
      .catch((cause) => { if (active) { setRows([]); setError(cause instanceof Error ? cause.message : "Histori tidak dapat dimuat."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeRange.from, activeRange.to, refresh]);
  const visible = useMemo(() => level !== "Semua" && level !== "DM Line" ? [] : rows.flatMap((row) =>
    [1, 2].filter((number) => session === "Semua sesi" || session === `Sesi ${number === 1 ? "10:30" : "14:30"}`).map((number) => ({
      ...row, number, statuses: row.data.statuses.filter((item) => item.session === number),
    }))
  ), [rows, level, session]);
  const statuses = visible.flatMap((row) => row.statuses);
  const roles = ["Leader", "ME", "PE Structure", "PE Electric", "QA"];
  return <section className="att-panel att-history-panel" aria-labelledby="attendance-history-title">
    <div className="att-panel-heading"><div><h2 id="attendance-history-title">{uiText("Attendance historis Excel")}</h2><p>{uiText("Status per role dan sesi dari workbook asesmen. Jam hadir dan nama peserta yang tidak tersedia tidak direkonstruksi.")}</p></div><DateRangePicker value={activeRange} maxDate={jakartaToday()} onChange={(value) => { setOverride(value); setPage(1); }} /></div>
    {error ? <p className="att-history-error" role="alert">{error}</p> : loading ? <p role="status">{uiText("Memuat histori…")}</p> : <>
      <div className="att-history-counts">{["OK", "NG", "IZIN", null].map((status) => <span key={status ?? "unknown"}>{uiText(status ?? "Tidak diketahui")} <strong>{statuses.filter((item) => item.status === status).length}</strong></span>)}</div>
      <p className="att-history-note">{uiText("Status Excel ini terpisah dari perhitungan tepat waktu/telat pada presensi aktual.")}</p>
      <div className="att-history-scroll"><table><caption className="sr-only">{uiText("Attendance historis per line dan role")}</caption><thead><tr>{["Tanggal", "Line / DM", "Leader", "Sesi / Shift", ...roles].map((label) => <th key={label}>{uiText(label)}</th>)}</tr></thead><tbody>{visible.slice((page - 1) * 15, page * 15).map((row) => <tr key={`${row.id}-${row.number}`}><td>{row.date}</td><td>{row.line}<br /><small>{row.dm ?? "—"}</small></td><td>{row.leader}</td><td>{row.number === 1 ? "10:30" : "14:30"}<br /><small>{row.shift}</small></td>{roles.map((role) => {
        const status = row.statuses.find((item) => item.role === role)?.status;
        return <td key={role}><span className={`att-history-status is-${status?.toLowerCase() ?? "unknown"}`}>{uiText(status ?? "Tidak diketahui")}</span></td>;
      })}</tr>)}{!visible.length && <tr><td colSpan={9}>{uiText("Belum ada histori Excel pada periode dan filter ini.")}</td></tr>}</tbody></table></div>
      <div className="att-history-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>{uiText("Sebelumnya")}</button><span>{page} / {Math.max(1, Math.ceil(visible.length / 15))}</span><button type="button" disabled={page * 15 >= visible.length} onClick={() => setPage((value) => value + 1)}>{uiText("Berikutnya")}</button></div>
    </>}
  </section>;
}
