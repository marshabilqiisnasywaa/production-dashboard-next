import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { IconCheck } from "@/components/ui/icons";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";
import type { TimelineModel, TimelineSession, TimelineStatus } from "../timelineTypes";
import "./sessionTimeline.css";

const TONE: Record<TimelineStatus, ChipTone> = {
  done: "ok",
  live: "ok",
  upcoming: "muted",
  overdue: "wait",
};

interface Props {
  /** null while data is loading */
  model: TimelineModel | null;
}

export function SessionTimeline({ model }: Props) {
  if (!model) {
    return (
      <Card title="Timeline hari ini" subtitle="Progres sesi Daily Management">
        <div className="dml-tl-loading">Memuat sesi hari ini…</div>
      </Card>
    );
  }

  const total = model.sessions.length;

  return (
    <Card
      title="Timeline hari ini"
      subtitle={model.nextHint ?? "Progres sesi Daily Management"}
      actions={
        <span className="dml-tl-count">
          {model.doneCount}/{total} selesai
        </span>
      }
    >
      <div className="dml-tl-segs" aria-hidden="true">
        {model.sessions.map((s) => (
          <span key={s.id} className={`dml-tl-seg is-${s.status}`} />
        ))}
      </div>

      <ol className="dml-tl">
        {model.sessions.map((s) => (
          <SessionRow key={s.id} session={s} focused={s.id === model.focusId} />
        ))}
      </ol>
    </Card>
  );
}

function SessionRow({ session, focused }: { session: TimelineSession; focused: boolean }) {
  const { papercard, attendance, cta } = session;
  const showCta = cta && (focused || session.status === "overdue");

  return (
    <li className={`dml-tl__item dml-tl__item--${session.status}${focused ? " is-focus" : ""}`}>
      <div className="dml-tl__row">
        <span className="dml-tl__badge" aria-hidden="true">
          {session.status === "done" ? <IconCheck size={14} /> : session.order}
        </span>
        <div className="dml-tl__main">
          <strong>{session.name}</strong>
          <span className="dml-tl__time">{session.time}</span>
        </div>
        <StatusChip tone={TONE[session.status]}>{session.statusLabel}</StatusChip>
      </div>

      {session.status === "done" && session.summary && <p className="dml-tl__summary">{session.summary}</p>}

      {focused && (papercard || attendance) && (
        <div className="dml-tl__detail">
          {papercard && (
            <>
              <div className="dml-tl__roles" role="list" aria-label="Status papercard per role">
                {papercard.roles.map((r) => (
                  <span key={r.key} role="listitem" className={r.submitted ? "dml-role is-sent" : "dml-role"}>
                    {r.submitted && <IconCheck size={12} />}
                    {r.label}
                  </span>
                ))}
              </div>
              <p className="dml-tl__caption">
                {papercard.submittedCount} dari {papercard.roles.length} role sudah kirim papercard
              </p>
            </>
          )}
          {attendance && (
            <p className="dml-tl__caption">
              Presensi tim:{" "}
              <strong>
                {attendance.present}/{attendance.total}
              </strong>{" "}
              hadir
            </p>
          )}
        </div>
      )}

      {showCta && cta && (
        <Link href={cta.href} className={focused ? "dml-tl__cta" : "dml-tl__link"}>
          {cta.label} →
        </Link>
      )}
    </li>
  );
}