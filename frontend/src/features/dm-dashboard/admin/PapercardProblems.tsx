"use client";

import { departmentLabel } from "../departments";
import { useEffect, useMemo, useState } from "react";
import { papercardApi, type DmLine, type DmPapercardSubmission } from "../api";
import { ProblemLoadError } from "../leader/problems/components/ProblemLoadError";
import { papercardProblemRows } from "./papercardProblemRows";
import "../leader/problems/problems.css";
import "./PapercardProblems.css";

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function PapercardProblems({
  lines,
  call,
}: {
  lines: DmLine[];
  call: <T>(fn: () => Promise<T>) => Promise<T>;
}) {
  const [date, setDate] = useState(today);
  const [line, setLine] = useState("");
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");
  const [submissions, setSubmissions] = useState<DmPapercardSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    call(() => papercardApi.listSubmissions({ date: date || undefined }))
      .then((data) => {
        if (!cancelled) setSubmissions(data);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setError(
            error instanceof Error ? error.message : "Terjadi kesalahan."
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, call, attempt]);

  const rows = useMemo(() => papercardProblemRows(submissions), [submissions]);
  const lineNames = useMemo(
    () => new Map(lines.map((item) => [item.id, item.code || item.name])),
    [lines]
  );
  const departments = [
    ...new Set(submissions.map((item) => item.department)),
  ].sort();
  const visible = rows.filter((row) => {
    const query = search.trim().toLowerCase();
    return (
      (!line || row.submission.lineId === Number(line)) &&
      (!department || row.submission.department === department) &&
      (!query ||
        [
          row.problem,
          row.description,
          row.category,
          row.cause,
          row.solution,
          row.submission.employeeName,
          row.submission.department,
          lineNames.get(row.submission.lineId),
        ].some((value) => value?.toLowerCase().includes(query)))
    );
  });

  return (
    <div className="dml-pb is-admin dm-papercard-problems">
      <section
        className="dml-pb-panel"
        aria-label="Log masalah papercard"
        aria-busy={loading}
      >
        <div className="dml-pb-toolbar">
          <div className="dml-pb-search">
            <input
              type="search"
              aria-label="Cari masalah papercard"
              placeholder="Cari kategori, masalah, penyebab, atau solusi..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="dml-pb-filters">
            <label className="dm-papercard-date">
              Tanggal
              <input
                type="date"
                aria-label="Tanggal papercard"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter line papercard"
              value={line}
              onChange={(event) => setLine(event.target.value)}
            >
              <option value="">Semua line</option>
              {lines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code || item.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter departemen papercard"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="">Semua departemen</option>
              {[
                ...new Set([
                  ...departments,
                  ...(department ? [department] : []),
                ]),
              ]
                .sort()
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className="dml-pb-reset"
              onClick={() => {
                setDate(today());
                setLine("");
                setDepartment("");
                setSearch("");
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="dml-pb-reset"
              disabled={loading}
              onClick={() => setAttempt((value) => value + 1)}
            >
              Muat ulang
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
            Memuat log papercard...
          </div>
        ) : (
          <>
            <div className="dml-pb-result-count" role="status">
              Menampilkan <strong>{visible.length}</strong> dari{" "}
              <strong>{rows.length}</strong> masalah NG
              {!date && " · Semua tanggal"}. Hanya papercard dengan temuan NG
              atau keterlambatan yang ditampilkan.
            </div>
            <div
              className="dml-pb-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Tabel masalah papercard, geser untuk melihat semua kolom"
            >
              <table className="dml-pb-table dm-papercard-problems-table">
                <thead>
                  <tr>
                    {[
                      "Tanggal",
                      "Line",
                      "Departemen",
                      "Kategori",
                      "Masalah",
                      "Penyebab",
                      "Solusi",
                      "keterangan",
                    ].map((heading) => (
                      <th key={heading} scope="col">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="dml-empty">
                        {rows.length
                          ? "Tidak ada masalah NG yang sesuai filter."
                          : "Tidak ada masalah NG papercard pada tanggal yang dipilih."}
                      </td>
                    </tr>
                  ) : (
                    visible.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {row.submission.date}
                          <br />
                        </td>
                        <td>
                          {lineNames.get(row.submission.lineId) ||
                            `Line #${row.submission.lineId}`}
                        </td>
                        <td>{departmentLabel(row.submission.department)}</td>
                        <td>{row.category}</td>
                        <td>
                          <strong className="dm-papercard-ng">
                            {row.late ? "NG telat" : "NG"}
                          </strong>
                          {!row.late && <div>{row.problem}</div>}
                        </td>
                        <td>
                          {row.cause || (row.late ? "-" : "Belum dicatat")}
                        </td>
                        <td>
                          {row.solution || (row.late ? "-" : "Belum dicatat")}
                        </td>
                        <td>{row.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
