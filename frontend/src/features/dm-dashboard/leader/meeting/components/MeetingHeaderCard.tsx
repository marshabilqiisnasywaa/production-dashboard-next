"use client";
import type { ReactNode } from "react";
import { useUiText } from "@/locales/useUiText";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";
import { IconClock, IconUsers } from "@/components/ui/icons";
import type { MeetingPhase } from "../types";
import { IconCalendar } from "./MeetingIcons";

const STATUS: Record<MeetingPhase, { tone: ChipTone; label: string }> = {
  idle: { tone: "muted", label: "Belum Dimulai" },
  presensi: { tone: "muted", label: "Belum Dimulai" },
  ready: { tone: "muted", label: "Belum Dimulai" },
  running: { tone: "ok", label: "Berlangsung" },
  done: { tone: "ok", label: "Selesai" },
};

interface Participants {
  title: string;
  description: string;
  control: ReactNode;
}

interface Props {
  title: string;
  sessionText: string;
  phase: MeetingPhase;
  lines: string[];
  dateText: string;
  timeText: string;
  location: string;
  participants?: Participants;
}

export function MeetingHeaderCard({ title, sessionText, phase, lines, dateText, timeText, location, participants }: Props) {
  const { text: uiText } = useUiText();
  const status = STATUS[phase];
  return (
    <section className="ui-card dml-mt-head">
      <div className="dml-mt-head__top">
        <span className="dml-mt-head__tile" aria-hidden="true">
          <IconCalendar size={20} />
        </span>
        <div className="dml-mt-head__left">
          <div className="dml-mt-head__title">
            <h2>{uiText(title)}</h2>
            <StatusChip tone={status.tone}>
              <span className="dml-mt-dot" /> {uiText(status.label)}
            </StatusChip>
          </div>
          <div className="dml-mt-head__sub">
            <span>{uiText(sessionText)}</span>
            <ul className="dml-mt-head__lines" aria-label={uiText("Line yang dibahas")}>
              {lines.map((l) => (
                <li key={l}>{uiText("Line ")}{l}</li>
              ))}
            </ul>
          </div>
        </div>

        <dl className="dml-mt-head__meta">
          <div>
            <IconCalendar size={16} />
            <dt>{uiText("Tanggal")}</dt>
            <dd>{dateText || " "}</dd>
          </div>
          <div>
            <IconClock size={16} />
            <dt>{uiText("Waktu")}</dt>
            <dd>{uiText(timeText)}</dd>
          </div>
          <div>
            <IconUsers size={16} />
            <dt>{uiText("Lokasi")}</dt>
            <dd>{location}</dd>
          </div>
        </dl>
      </div>

      {participants && (
        <div className="dml-mt-head__participants">
          <IconUsers size={18} />
          <div className="dml-mt-head__participants-text">
            <strong>{participants.title}</strong>
            <p>{participants.description}</p>
          </div>
          <div className="dml-mt-head__participants-control">{participants.control}</div>
        </div>
      )}
    </section>
  );
}
