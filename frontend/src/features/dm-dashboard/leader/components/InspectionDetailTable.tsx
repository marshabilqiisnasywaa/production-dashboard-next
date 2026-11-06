"use client";

import { useMemo, useState } from "react";
import { useUiText } from "@/locales/useUiText";
import { IconDownload } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/Pagination";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";
import type { InspectionRow, PapercardStatus, RoleKey } from "../types";
import { downloadCsv, toCsv } from "../utils";

const ROLE_COLUMNS: { key: RoleKey; label: string }[] = [
  { key: "leader", label: "Leader Line" },
  { key: "me", label: "ME" },
  { key: "pe", label: "PE" },
  { key: "ipqc", label: "IPQC" },
];

const STATUS_VIEW: Record<PapercardStatus, { tone: ChipTone; label: string }> = {
  OK: { tone: "ok", label: "OK" },
  NG: { tone: "ng", label: "NG" },
  PENDING: { tone: "wait", label: "Belum diisi" },
  LIBUR: { tone: "muted", label: "Libur" },
};

type StatusFilter = "all" | "complete" | "incomplete";

interface Props {
  rows: InspectionRow[];
  showDate?: boolean;
  loading?: boolean;
  error?: string | null;
}

export function InspectionDetailTable({
  rows,
  showDate = false,
  loading = false,
  error = null,
}: Props) {
  const { text: uiText } = useUiText();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (status === "complete" && row.submitted !== row.total) return false;
        if (status === "incomplete" && row.submitted === row.total) return false;
        return true;
      }),
    [rows, status],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const columnCount = ROLE_COLUMNS.length + 1 + Number(showDate);

  return (
    <div className="dml-detail dml-inspection-detail">
      <div className="dml-detail__toolbar">
        <h2>{uiText("Detail OK / NG")}</h2>
        <div className="dml-detail__filters">
          <select
            className="ui-select"
            value={status}
            aria-label={uiText("Filter status")}
            onChange={(event) => {
              setStatus(event.target.value as StatusFilter);
              setPage(1);
            }}
          >
            <option value="all">{uiText("Semua")}</option>
            <option value="complete">{uiText("Lengkap")}</option>
            <option value="incomplete">{uiText("Belum lengkap")}</option>
          </select>
          <button
            type="button"
            className="ui-btn ui-btn--ghost"
            disabled={filtered.length === 0 || loading || Boolean(error)}
            onClick={() =>
              downloadCsv("inspection-rate.csv", toCsv(filtered, showDate))
            }
          >
            <IconDownload size={16} />
            {uiText(" Export")}
          </button>
        </div>
      </div>

      <div className="dml-table-wrap dml-inspection-table-wrap">
        <table
          className={`dml-table dml-inspection-table${
            showDate ? " dml-inspection-table--with-date" : ""
          }`}
        >
          <colgroup>
            {showDate && <col className="dml-inspection-table__date" />}
            <col className="dml-inspection-table__leader" />
            {ROLE_COLUMNS.slice(1).map((column) => (
              <col key={column.key} className="dml-inspection-table__role" />
            ))}
            <col className="dml-inspection-table__total" />
          </colgroup>
          <thead>
            <tr>
              {showDate && <th>{uiText("Tanggal")}</th>}
              {ROLE_COLUMNS.map((column) => (
                <th key={column.key}>{uiText(column.label)}</th>
              ))}
              <th className="is-num">{uiText("Total")}</th>
            </tr>
          </thead>
          <tbody>
            {(loading || error || visible.length === 0) && (
              <tr>
                <td colSpan={columnCount} className="dml-empty">
                  {loading
                    ? uiText("Memuat detail inspeksi…")
                    : error
                    ? error
                    : uiText("Tidak ada data yang cocok dengan filter")}
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              visible.map((row) => (
                <tr key={row.id}>
                  {showDate && <td className="is-strong">{row.date}</td>}
                  {ROLE_COLUMNS.map((column) => {
                    const statusView = STATUS_VIEW[row.statuses[column.key]];
                    return (
                      <td key={column.key}>
                        <StatusChip tone={statusView.tone}>
                          {uiText(statusView.label)}
                        </StatusChip>
                      </td>
                    );
                  })}
                  <td className="is-num">{row.total}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!loading && !error && filtered.length === 1 && (
        <p className="dml-inspection-detail__caption">
          {uiText(
            showDate
              ? "Hanya 1 data pada periode ini. Ubah periode di atas untuk melihat periode lain."
              : "Data untuk tanggal terpilih. Ubah periode di atas untuk melihat hari lain.",
          )}
        </p>
      )}

      <Pagination
        page={safePage}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
