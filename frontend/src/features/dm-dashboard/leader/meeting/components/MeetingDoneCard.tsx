import Link from "next/link";
import { IconCheckCircle } from "@/components/ui/icons";
import { LEADER_ROUTES } from "../../routes";
import type { MeetingMember, SummaryItem } from "../types";
import { formatClock, formatDue, formatDuration } from "../utils";

interface Props {
  startedAt: string;
  endedAt: string;
  present: number;
  total: number;
  items: SummaryItem[];
  members: MeetingMember[];
}

export function MeetingDoneCard({ startedAt, endedAt, present, total, items, members }: Props) {
  const duration = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const picName = (id: string) => members.find((m) => m.id === id)?.name ?? "-";

  return (
    <section className="ui-card dml-mt-done">
      <span className="dml-mt-ready__icon">
        <IconCheckCircle size={32} />
      </span>
      <h2>Meeting selesai</h2>

      <dl className="dml-mt-done__stats">
        <div>
          <dt>Durasi</dt>
          <dd>{formatDuration(duration)}</dd>
        </div>
        <div>
          <dt>Mulai – selesai</dt>
          <dd>
            {formatClock(startedAt)} – {formatClock(endedAt)}
          </dd>
        </div>
        <div>
          <dt>Hadir</dt>
          <dd>
            {present}/{total}
          </dd>
        </div>
        <div>
          <dt>Tindak lanjut</dt>
          <dd>{items.length} poin</dd>
        </div>
      </dl>

      {items.length > 0 && (
        <ul className="dml-mt-done__items">
          {items.map((i) => (
            <li key={i.id}>
              <strong>{i.problem}</strong>
              <span>
                {i.line} · PIC {i.picName ?? picName(i.picId)} · due {formatDue(i.due)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link href={LEADER_ROUTES.dashboard} className="dml-tl__cta dml-mt-done__back">
        Kembali ke Dashboard
      </Link>
    </section>
  );
}
