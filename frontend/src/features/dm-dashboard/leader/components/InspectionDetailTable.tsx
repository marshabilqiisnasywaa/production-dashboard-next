"use client";

import { useMemo, useState } from "react";
import { IconDownload } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/Pagination";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";
import type { InspectionRow, PapercardStatus, RoleKey } from "../types";
import { TARGET, downloadCsv, rate, toCsv, toneFor } from "../utils";

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
}

export function InspectionDetailTable({ rows }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === "complete" && r.submitted !== r.total) return false;
      if (status === "incomplete" && r.submitted === r.total) return false;
      return !q || `${r.date} ${r.line} ${r.type}`.toLowerCase().includes(q);
    });
  }, [rows, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="dml-detail">
      <div className="dml-detail__toolbar">
        <h3>Detail Inspection</h3>
        <div className="dml-detail__filters">
          <input
            className="ui-input"
            type="search"
            placeholder="Cari tanggal, line, atau tipe"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="ui-select"
            value={status}
            aria-label="Filter status"
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setPage(1);
            }}
          >
            <option value="all">Semua</option>
            <option value="complete">Lengkap</option>
            <option value="incomplete">Belum lengkap</option>
          </select>
          <button
            type="button"
            className="ui-btn ui-btn--ghost"
            disabled={filtered.length === 0}
            onClick={() => downloadCsv("inspection-rate.csv", toCsv(filtered))}
          >
            <IconDownload size={16} /> Export
          </button>
        </div>
      </div>

      <div className="dml-table-wrap">
        <table className="dml-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Line</th>
              <th>Tipe</th>
              {ROLE_COLUMNS.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th className="is-num">Total</th>
              <th className="is-num">Papercard</th>
              <th>Inspection Rate</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={10} className="dml-empty">
                  Tidak ada data yang cocok dengan filter
                </td>
              </tr>
            )}
            {visible.map((r) => {
              const value = rate(r.submitted, r.total);
              const tone = toneFor(value, TARGET);
              return (
                <tr key={r.id}>
                  <td className="is-strong">{r.date}</td>
                  <td>{r.line}</td>
                  <td className="is-muted">{r.type}</td>
                  {ROLE_COLUMNS.map((c) => {
                    const s = STATUS_VIEW[r.statuses[c.key]];
                    return (
                      <td key={c.key}>
                        <StatusChip tone={s.tone}>{s.label}</StatusChip>
                      </td>
                    );
                  })}
                  <td className="is-num">{r.total}</td>
                  <td className="is-num">{r.submitted}</td>
                  <td className={tone === "ok" ? "" : "is-low"}>
                    <div className="dml-rate">
                      <strong className={`dml-rate__value dml-rate__value--${tone}`}>{value}%</strong>
                      <ProgressBar value={value} tone={tone} size="sm" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={safePage}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />
    </div>
  );
}
