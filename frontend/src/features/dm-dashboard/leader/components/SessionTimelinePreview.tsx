"use client";

import type { TimelineModel, TimelineSession } from "../timelineTypes";

type Props = {
  model: TimelineModel | null;
  session: TimelineSession | null;
  error: string | null;
  onNext: () => void;
};

export function SessionTimelinePreview({
  model,
  session,
  error,
  onNext,
}: Props) {
  const sessionIndex = session
    ? model?.sessions.findIndex((item) => item.id === session.id) ?? -1
    : -1;

  return (
    <section className="dml-header-timeline" aria-label="Timeline hari ini">
      <div className="dml-header-timeline__content" aria-live="polite">
        <span className="dml-header-timeline__label">Timeline hari ini</span>
        {error ? (
          <strong>Data tidak tersedia</strong>
        ) : !model ? (
          <strong>Memuat timeline…</strong>
        ) : session ? (
          <>
            <div className="dml-header-timeline__session">
              <strong title={session.name}>{session.name}</strong>
              <span>{session.time}</span>
            </div>
            <span
              className={`dml-header-timeline__status is-${session.status}`}
            >
              {session.statusLabel}
            </span>
          </>
        ) : (
          <strong>Belum ada sesi hari ini</strong>
        )}
      </div>
      {session && sessionIndex >= 0 && model && (
        <span className="dml-header-timeline__count">
          {sessionIndex + 1}/{model.sessions.length}
        </span>
      )}
      <button
        type="button"
        aria-label="Tampilkan sesi berikutnya"
        title="Sesi berikutnya"
        disabled={!session || !model || model.sessions.length < 2}
        onClick={onNext}
      >
        →
      </button>
    </section>
  );
}
