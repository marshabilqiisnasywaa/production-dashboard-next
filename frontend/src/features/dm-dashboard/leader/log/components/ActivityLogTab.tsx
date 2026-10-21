"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { IconDownload } from "@/components/ui/icons";
import { downloadCsv } from "../../utils";
import type { ActivityEntry, ActivityGroup } from "../types";
import { activityToCsv, formatDateTime, localDate } from "../utils";
import { DateRangeFilter } from "./DateRangeFilter";

const GROUPS: { value: "all" | ActivityGroup; label: string }[] = [
  { value: "all", label: "Semua aksi" },
  { value: "meeting", label: "Meeting" },
  { value: "presensi", label: "Presensi" },
  { value: "tindak-lanjut", label: "Tindak lanjut" },
];

/** Read-only audit trail (BR-13): nobody can edit or delete an entry here. */
export function ActivityLogTab({ entries }: { entries: ActivityEntry[] }) {
  const [query, setQuery] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [group, setGroup] = useState<"all" | ActivityGroup>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const day = localDate(new Date(e.at));
      if (range.from && day < range.from) return false;
      if (range.to && day > range.to) return false;
      if (group !== "all" && e.group !== group) return false;
      return !q || `${e.user} ${e.role} ${e.action} ${e.object}`.toLowerCase().includes(q);
    });
  }, [entries, query, range, group]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <section className="ui-card">
      <div className="dml-lg-filters">
        <input
          type="search"
          className="ui-input dml-lg-search"
          placeholder="Cari user, aksi, atau objek…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <DateRangeFilter
          from={range.from}
          to={range.to}
          onChange={(r) => {
            setRange(r);
            setPage(1);
          }}
        />
        <select
          className="ui-select"
          aria-label="Filter aksi"
          value={group}
          onChange={(e) => {
            setGroup(e.target.value as "all" | ActivityGroup);
            setPage(1);
          }}
        >
          {GROUPS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        <Button disabled={filtered.length === 0} onClick={() => downloadCsv("activity-log.csv", activityToCsv(filtered))}>
          <IconDownload size={16} /> Export
        </Button>
      </div>

      <div className="dml-table-wrap">
        <table className="dml-table dml-lg-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>User</th>
              <th>Role</th>
              <th>Aksi</th>
              <th>Objek</th>
              <th>Sebelum → Sesudah</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="dml-empty">
                  Belum ada aktivitas yang cocok dengan filter.
                </td>
              </tr>
            )}
            {visible.map((e) => (
              <tr key={e.id}>
                <td className="is-strong">{formatDateTime(e.at)}</td>
                <td>{e.user}</td>
                <td className="is-muted">{e.role}</td>
                <td>{e.action}</td>
                <td className="dml-lg-object">{e.object}</td>
                <td>
                  {e.before || e.after ? (
                    <>
                      {e.before && <span className="dml-lg-sub">{e.before}</span>}
                      {e.before && e.after && " → "}
                      {e.after && <strong>{e.after}</strong>}
                    </>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
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
    </section>
  );
}
