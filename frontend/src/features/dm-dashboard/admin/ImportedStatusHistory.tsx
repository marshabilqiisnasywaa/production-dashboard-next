"use client";

import { useEffect, useMemo, useState } from "react";
import { useUiText } from "@/locales/useUiText";
import { historyImportApi, type DmHistoryStoredRow } from "../api";
import { formatDate } from "../leader/log/utils";
import { HistoryChip, HistoryPager } from "./HistoryParts";
import { importedStatusLabel, importedStatusRows } from "./importedStatusRows";

const PAGE_SIZE = 10;

export default function ImportedStatusHistory({ from, to, line, kind, search, shift, refresh, call }: {
  from: string;
  to: string;
  line?: string;
  kind: "papercard_status" | "attendance";
  search: string;
  shift?: string;
  refresh: number;
  call: <T>(fn: () => Promise<T>) => Promise<T>;
}) {
  const { text: uiText, locale } = useUiText();
  const [rows, setRows] = useState<DmHistoryStoredRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const attendance = kind === "attendance";
  const roles = attendance ? ["Leader", "ME", "PE Structure", "PE Electric", "QA"] : ["Leader", "ME", "PE", "IPQC"];

  useEffect(() => {
    const refresh = () => setReload((value) => value + 1);
    window.addEventListener("dm-history-imported", refresh);
    return () => window.removeEventListener("dm-history-imported", refresh);
  }, []);

  useEffect(() => {
    if (!from || !to || from > to) return;
    let active = true;
    setLoading(true);
    setError(null);
    call(() => historyImportApi.statuses({ from, to, line, kind }))
      .then((data) => { if (active) setRows(data); })
      .catch((cause) => { if (active) { setRows([]); setError(cause instanceof Error ? cause.message : "Histori Excel gagal dimuat."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to, line, kind, refresh, reload, call]);

  useEffect(() => { setPage(1); }, [from, to, line, kind, search, shift, refresh, reload]);

  const visible = useMemo(() => importedStatusRows(rows, attendance, search, shift), [rows, attendance, search, shift]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(visible.length / PAGE_SIZE)));
  const title = attendance ? "Kehadiran Standup Meeting dari Excel" : "Status Papercard dari Excel";

  return <section className="dml-pb-panel" aria-label={uiText(title)} aria-busy={loading}>
    <div className="dml-pb-toolbar">
      <h3>{uiText(title)}</h3>
      <HistoryChip tone="muted">{uiText("Import Excel")}</HistoryChip>
    </div>
    {error ? <div className="dml-empty" role="alert"><p>{error}</p><button type="button" className="dml-pb-reset" onClick={() => setReload((value) => value + 1)}>{uiText("Coba lagi")}</button></div>
      : loading ? <p className="dml-empty" role="status">{uiText("Memuat histori Excel...")}</p>
      : <>
        <div className="dml-pb-table-wrap" tabIndex={0} role="region" aria-label={uiText(title)}>
          <table className="dml-pb-table dm-history-table">
            <thead><tr>{["Tanggal", "Line / DM", "Leader", "Sesi / Shift", ...roles].map((label, index) => <th key={`${index}-${label}`} scope="col">{uiText(label)}</th>)}</tr></thead>
            <tbody>{visible.length === 0 ? <tr><td colSpan={4 + roles.length} className="dml-empty">{uiText("Tidak ada status Excel pada filter yang dipilih.")}</td></tr>
              : visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE).map((row) => <tr key={row.key}>
                <td className="is-strong">{formatDate(row.date, locale)}</td>
                <td>{row.line}<div className="dm-history-sub">{row.dm ?? "—"}</div></td>
                <td>{row.leader}<div className="dm-history-sub">{uiText(row.scope === "dm" ? "Leader DM" : "Leader Line")}</div></td>
                <td>{row.session === null ? "—" : uiText("Sesi {{v0}}", { v0: row.session })}<div className="dm-history-sub">{row.shift ?? uiText("Shift tidak tercatat")}</div></td>
                {roles.map((role) => {
                  const status = row.statuses.find((item) => item.role === role)?.status;
                  return <td key={role}><HistoryChip tone={status === "OK" ? "ok" : status === "NG" ? "red" : "muted"}>{uiText(importedStatusLabel(status, attendance))}</HistoryChip></td>;
                })}
              </tr>)}</tbody>
          </table>
        </div>
        <HistoryPager page={safePage} pageSize={PAGE_SIZE} total={visible.length} unitName={uiText(attendance ? "sesi" : "baris")} onPageChange={setPage} />
      </>}
  </section>;
}
