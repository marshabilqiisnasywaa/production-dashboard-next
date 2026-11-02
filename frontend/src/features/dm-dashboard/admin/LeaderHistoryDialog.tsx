"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { leaderAssignmentApi } from "../api";
import type { DmEmployee, LeaderHistoryEntry } from "../api";
import "./DmGroupDialog.css";
import "./DmLeaderDialog.css";

type Props = {
  employee: DmEmployee;
  call: <T>(fn: () => Promise<T>) => Promise<T>;
  onClose: () => void;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function LeaderHistoryDialog({
  employee,
  call,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<LeaderHistoryEntry[]>([]);
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void call(() => leaderAssignmentApi.history(employee.id, page * 50))
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
  }, [employee.id, page, retry, call]);

  return (
    <dialog
      ref={dialog}
      className="dm-dialog"
      aria-labelledby="leader-history-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dm-dialog-card dm-leader-card">
        <header className="dm-dialog-head">
          <h2 id="leader-history-title" className="dm-dialog-title">
            Riwayat — {employee.name}
          </h2>
          <button
            type="button"
            className="dm-dialog-close"
            aria-label="Tutup"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <p className="dm-leader-note">
          {employee.employeeId} · Penugasan terbaru ditampilkan lebih dulu.
        </p>
        <ol className="dm-leader-timeline">
          {items.map((item) => (
            <li key={item.id}>
              <div className="dm-leader-timeline-title">
                <strong>
                  {item.kind === "dm_leader"
                    ? "Leader DM"
                    : `Leader ${item.line_code_snapshot}`}
                </strong>
                {item.ended_at === null ? (
                  <span className="dm-pill">Aktif</span>
                ) : null}
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
              {item.reason ? <p>{item.reason}</p> : null}
            </li>
          ))}
        </ol>
        {loading ? <p role="status">Memuat riwayat...</p> : null}
        {!loading && !error && items.length === 0 ? (
          <p className="dm-leader-note">
            Belum ada riwayat penugasan leader yang tercatat.
          </p>
        ) : null}
        {error ? (
          <p className="dm-dialog-error" role="alert">
            {error}
          </p>
        ) : null}
        <footer className="dm-dialog-foot">
          {error ? (
            <button
              type="button"
              className="dm-dialog-btn is-outline"
              disabled={loading}
              onClick={() => setRetry((value) => value + 1)}
            >
              Coba lagi
            </button>
          ) : hasMore ? (
            <button
              type="button"
              className="dm-dialog-btn is-outline"
              disabled={loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Muat riwayat sebelumnya
            </button>
          ) : null}
          <button
            type="button"
            className="dm-dialog-btn is-primary"
            onClick={onClose}
          >
            Tutup
          </button>
        </footer>
      </div>
    </dialog>
  );
}
