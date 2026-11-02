"use client";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { leaderAssignmentApi } from "../api";
import type { DmEmployee, LeaderHistoryEntry } from "../api";
import "./DmLeaderDialog.css";

type Props = {
  users: DmEmployee[];
  initialEmployeeId?: number;
  loadingUsers: boolean;
  usersError: string | null;
  call: <T>(fn: () => Promise<T>) => Promise<T>;
  onBack: () => void;
  onRetryUsers: () => Promise<void>;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function UserHistoryPage({
  users,
  initialEmployeeId,
  loadingUsers,
  usersError,
  call,
  onBack,
  onRetryUsers,
}: Props) {
  const [employeeId, setEmployeeId] = useState(
    initialEmployeeId ? String(initialEmployeeId) : "",
  );
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<LeaderHistoryEntry[]>([]);
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const employee = users.find((user) => user.id === Number(employeeId));
  const query = search.trim().toLowerCase();
  const choices = users.filter((user) =>
    `${user.name} ${user.employeeId}`.toLowerCase().includes(query),
  );

  function selectEmployee(id: number) {
    setSearch("");
    if (String(id) === employeeId) return;
    setEmployeeId(String(id));
    setPage(0);
    setItems([]);
    setHasMore(false);
    setError(null);
  }

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void call(() => leaderAssignmentApi.history(Number(employeeId), page * 50))
      .then((rows) => {
        if (cancelled) return;
        setItems((previous) => (page === 0 ? rows : [...previous, ...rows]));
        setHasMore(rows.length === 50);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Riwayat gagal dimuat.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, page, retry, call]);

  return (
    <section className="dm-panel" aria-labelledby="user-history-title">
      <div className="dm-panel-head">
        <div>
          <h3 id="user-history-title" className="dm-panel-title">
            Riwayat User
          </h3>
          <p className="dm-panel-sub">
            Perjalanan penugasan leader line dan leader DM, dari yang terbaru.
          </p>
        </div>
        <button
          type="button"
          className="dm-admin-btn is-secondary"
          onClick={onBack}
        >
          <ArrowLeft size={16} /> Daftar User
        </button>
      </div>
      <div className="dm-history-filters">
        <div className="dm-admin-field">
          <label htmlFor="history-user-search">Cari nama atau NIK</label>
          <input
            id="history-user-search"
            type="search"
            className="dm-admin-input"
            placeholder="Ketik nama atau NIK, lalu pilih hasilnya"
            disabled={loadingUsers || Boolean(usersError)}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-controls="history-user-results"
          />
        </div>
        {query && !loadingUsers && !usersError && users.length > 0 ? (
          <div>
            {choices.length === 0 ? (
              <p className="dm-leader-note" role="status">
                User tidak ditemukan.
              </p>
            ) : null}
            {choices.length > 0 ? (
              <ul
                id="history-user-results"
                className="dm-history-user-results"
                aria-label="Hasil pencarian User"
              >
                {choices.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className={`dm-history-user-result${String(user.id) === employeeId ? " is-selected" : ""}`}
                      aria-pressed={String(user.id) === employeeId}
                      onClick={() => selectEmployee(user.id)}
                    >
                      <strong>{user.name}</strong>
                      <span>
                        {user.employeeId}
                        {user.isActive ? "" : " · Nonaktif"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
      {loadingUsers ? (
        <p role="status">Memuat daftar User...</p>
      ) : usersError ? (
        <div role="alert">
          <p>{usersError}</p>
          <button
            type="button"
            className="dm-admin-btn is-secondary"
            onClick={() => void onRetryUsers()}
          >
            Muat ulang User
          </button>
        </div>
      ) : users.length === 0 ? (
        <p>Belum ada User terdaftar.</p>
      ) : null}
      {employee ? (
        <div className="dm-history-content">
          <h4>
            {employee.name}{" "}
            <span className="dm-pill">{employee.employeeId}</span>
          </h4>
          <ol className="dm-leader-timeline">
            {items.map((item) => (
              <li key={item.id}>
                <div className="dm-leader-timeline-title">
                  <strong>
                    {item.kind === "dm_leader"
                      ? "Leader DM"
                      : `Leader Line ${item.line_code_snapshot}`}
                  </strong>
                  <span className="dm-pill">
                    {item.ended_at ? "Selesai" : "Aktif"}
                  </span>
                </div>
                <p>{item.dm_name_snapshot}</p>
                <p>
                  <time dateTime={item.started_at}>
                    {dateLabel(item.started_at)}
                  </time>{" "}
                  —{" "}
                  {item.ended_at ? (
                    <time dateTime={item.ended_at}>
                      {dateLabel(item.ended_at)}
                    </time>
                  ) : (
                    "Sekarang"
                  )}
                </p>
                {item.source === "line_membership" ? (
                  <p>
                    Periode mengikuti catatan keanggotaan line; nama DM dan line
                    mengikuti data saat ini.
                  </p>
                ) : null}
                {item.reason ? <p>{item.reason}</p> : null}
              </li>
            ))}
          </ol>
          {loading ? <p role="status">Memuat riwayat...</p> : null}
          {!loading && !error && items.length === 0 ? (
            <p>Belum ada riwayat yang tercatat untuk User ini.</p>
          ) : null}
          {error ? (
            <div role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="dm-admin-btn is-secondary"
                disabled={loading}
                onClick={() => setRetry((value) => value + 1)}
              >
                Coba lagi
              </button>
            </div>
          ) : hasMore ? (
            <button
              type="button"
              className="dm-admin-btn is-secondary"
              disabled={loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Muat riwayat sebelumnya
            </button>
          ) : null}
        </div>
      ) : !loadingUsers && !usersError ? (
        <p className="dm-leader-note">
          Pilih User untuk menampilkan timeline jabatannya.
        </p>
      ) : null}
    </section>
  );
}
