"use client";
import { useUiText } from "@/locales/useUiText";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { leaderAssignmentApi } from "../api";
import { dmEmployeeRoles } from "../api";
import type { DmEmployee, LeaderCurrent, LeaderHistoryEntry, UserTimeline } from "../api";
import "./DmLeaderDialog.css";
import "./UserTable.css";

type Props = {
  users: DmEmployee[];
  initialEmployeeId?: number;
  loadingUsers: boolean;
  usersError: string | null;
  call: <T>(fn: () => Promise<T>) => Promise<T>;
  onBack: () => void;
  onRetryUsers: () => Promise<void>;
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function positionLabel(item: LeaderHistoryEntry) {
  return item.kind === "dm_leader"
    ? `Leader DM ${item.dm_name_snapshot}`
    : `Leader Line ${item.line_code_snapshot}`;
}

function dateLabel(value: string, locale = "id-ID") {
  return new Intl.DateTimeFormat(locale, {
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
  const { text: uiText, locale: uiLocale } = useUiText();
  const [employeeId, setEmployeeId] = useState(
    initialEmployeeId ? String(initialEmployeeId) : ""
  );
  const [search, setSearch] = useState("");
  const [timeline, setTimeline] = useState<UserTimeline | null>(null);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLeaders, setCurrentLeaders] = useState<LeaderCurrent[]>([]);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const employee = users.find((user) => user.id === Number(employeeId));
  const query = search.trim().toLowerCase();
  const choices = users.filter((user) =>
    `${user.name} ${user.employeeId}`.toLowerCase().includes(query)
  );

  const currentHolders = currentLeaders.flatMap((row) => {
    const holder = users.find((user) => user.id === row.employee_id);
    return holder ? [{ row, holder }] : [];
  });

  function selectEmployee(id: number) {
    setSearch("");
    if (String(id) === employeeId) return;
    setEmployeeId(String(id));
    setTimeline(null);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void call(() => leaderAssignmentApi.current())
      .then((rows) => {
        if (cancelled) return;
        setCurrentLeaders(rows);
        setCurrentError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setCurrentError(
            err instanceof Error
              ? err.message
              : "Daftar leader aktif gagal dimuat."
          );
      });
    return () => {
      cancelled = true;
    };
  }, [call]);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void call(() => leaderAssignmentApi.timeline(Number(employeeId)))
      .then((data) => {
        if (cancelled) return;
        setTimeline(data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Riwayat gagal dimuat."
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, retry, call]);

  return (
    <section className="dm-panel" aria-labelledby="user-history-title">
      <div className="dm-panel-head">
        <div>
          <h3 id="user-history-title" className="dm-panel-title">{uiText("Riwayat User")}</h3>
          <p className="dm-panel-sub">{uiText("Perjalanan penugasan leader line dan leader DM, dari yang terbaru.")}</p>
        </div>
        <button
          type="button"
          className="dm-admin-btn is-secondary"
          onClick={onBack}
        >
          <ArrowLeft size={16} />{uiText(" Daftar User")}</button>
      </div>
      <div className="dm-history-filters">
        <div className="dm-admin-field">
          <label htmlFor="history-user-search">{uiText("Cari nama atau NIK")}</label>
          <input
            id="history-user-search"
            type="search"
            className="dm-admin-input"
            placeholder={uiText("Ketik nama atau NIK, lalu pilih hasilnya")}
            disabled={loadingUsers || Boolean(usersError)}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-controls="history-user-results"
          />
        </div>
        {query && !loadingUsers && !usersError && users.length > 0 ? (
          <div>
            {choices.length === 0 ? (
              <p className="dm-leader-note" role="status">{uiText("User tidak ditemukan.")}</p>
            ) : null}
            {choices.length > 0 ? (
              <ul
                id="history-user-results"
                className="dm-history-user-results"
                aria-label={uiText("Hasil pencarian User")}
              >
                {choices.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className={`dm-history-user-result${
                        String(user.id) === employeeId ? " is-selected" : ""
                      }`}
                      aria-pressed={String(user.id) === employeeId}
                      onClick={() => selectEmployee(user.id)}
                    >
                      <strong>{user.name}</strong>
                      <span>
                        {user.employeeId}
                        {user.isActive ? "" : uiText(" · Nonaktif")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {!query && !loadingUsers && !usersError ? (
          <div className="dm-holders">
            <p className="dm-holders-lead">{uiText("Posisi saat ini. Pilih satu orang untuk melihat riwayatnya.")}</p>
            {currentError ? (
              <p role="alert">{currentError}</p>
            ) : currentHolders.length === 0 ? (
              <p className="dm-leader-note" role="status">{uiText("Belum ada leader aktif yang tercatat. Cari nama di atas untuk melihat riwayat user lain.")}</p>
            ) : (
              <div className="dm-holder-wrap">
                <ul className="dm-holder-list" aria-label={uiText("Leader saat ini")}>
                  {uiText(currentHolders.map(({ row, holder }) => {
                    const selected = String(holder.id) === employeeId;
                    return (
                      <li key={holder.id}>
                        <button
                          type="button"
                          className={`dm-holder${
                            selected ? " is-selected" : ""
                          }`}
                          aria-pressed={selected}
                          onClick={() => selectEmployee(holder.id)}
                        >
                          <span className="ut-person">
                            {holder.photoUrl ? (
                              <img
                                src={holder.photoUrl}
                                alt=""
                                className="ut-avatar"
                              />
                            ) : (
                              <span
                                className="ut-avatar is-initials"
                                aria-hidden="true"
                              >
                                {initialsOf(holder.name)}
                              </span>
                            )}
                            <span className="ut-person-text">
                              <span className="ut-name">{holder.name}</span>
                              <span className="ut-sub">
                                {holder.employeeId}
                              </span>
                            </span>
                          </span>
                          <span className="dm-holder-move">
                            <span className="ut-badge is-off">
                              {row.previous
                                ? uiText(positionLabel(row.previous))
                                : uiText("Belum ada")}
                            </span>
                            <span
                              className="dm-holder-arrow"
                              aria-label={uiText("menjadi")}
                            >
                              →
                            </span>
                            <span className="ut-badge is-leader">
                              {uiText(positionLabel(row.position))}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  }))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </div>
      {loadingUsers ? (
        <p role="status">{uiText("Memuat daftar User...")}</p>
      ) : usersError ? (
        <div role="alert">
          <p>{usersError}</p>
          <button
            type="button"
            className="dm-admin-btn is-secondary"
            onClick={() => void onRetryUsers()}
          >{uiText("Muat ulang User")}</button>
        </div>
      ) : users.length === 0 ? (
        <p>{uiText("Belum ada User terdaftar.")}</p>
      ) : null}
      {employee ? (
        <div className="dm-history-content">
          <h4>
            {employee.name}{" "}
            <span className="dm-pill">{employee.employeeId}</span>
          </h4>
          {timeline ? (
            <dl className="dm-history-profile">
              {[
                [uiText("Role"), uiText(dmEmployeeRoles.find((role) => role.value === timeline.role)?.label ?? timeline.role)],
                [uiText("Departemen"), timeline.dept ?? "-"],
                [uiText("Jabatan"), timeline.position ?? "-"],
                [uiText("Supervisor"), timeline.supervisor_name ?? "-"],
                [uiText("Status"), timeline.is_active ? uiText("Aktif") : uiText("Nonaktif")],
                [uiText("Akun dibuat"), uiText(dateLabel(timeline.created_at, uiLocale))],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <ol className="dm-leader-timeline">
            {(timeline?.events ?? []).map((item) => (
              <li key={item.key}>
                <div className="dm-leader-timeline-title">
                  <span className={`dm-history-kind is-${item.category}`}>
                    {item.category === "account"
                      ? uiText("Akun")
                      : item.category === "leader"
                      ? uiText("Leader")
                      : uiText("Line")}
                  </span>
                  <strong>{uiText(item.title)}</strong>
                  {item.category !== "account" ? (
                    <span className="dm-pill">
                      {item.ended_at ? uiText("Selesai") : uiText("Aktif")}
                    </span>
                  ) : null}
                </div>
                {item.detail ? <p>{item.detail}</p> : null}
                <p>
                  <time dateTime={item.started_at}>
                    {uiText(dateLabel(item.started_at, uiLocale))}
                  </time>
                  {item.category !== "account" ? (
                    <>
                      {" "}
                      —{" "}
                      {item.ended_at ? (
                        <time dateTime={item.ended_at}>
                          {uiText(dateLabel(item.ended_at, uiLocale))}
                        </time>
                      ) : (
                        uiText("Sekarang")
                      )}
                    </>
                  ) : null}
                </p>
                {item.reason ? <p>{item.reason}</p> : null}
                {item.by ? <p>{uiText("Dicatat oleh {{v0}}", { v0: item.by })}</p> : null}
              </li>
            ))}
          </ol>
          {loading ? <p role="status">{uiText("Memuat riwayat...")}</p> : null}
          {error ? (
            <div role="alert">
              <p>{uiText(error)}</p>
              <button
                type="button"
                className="dm-admin-btn is-secondary"
                disabled={loading}
                onClick={() => setRetry((value) => value + 1)}
              >{uiText("Coba lagi")}</button>
            </div>
          ) : null}
          <p className="dm-leader-note">{uiText("Perubahan data akun seperti role, NIK, atau departemen belum dicatat sistem, jadi tidak tampil di sini.")}</p>
        </div>
      ) : !loadingUsers && !usersError ? (
        <p className="dm-leader-note">{uiText("Pilih User untuk menampilkan timeline riwayatnya.")}</p>
      ) : null}
    </section>
  );
}
