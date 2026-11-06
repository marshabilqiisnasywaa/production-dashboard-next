"use client";
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

interface Props {
  title: string;
  phase: MeetingPhase;
  lines: string[];
  dateText: string;
  timeText: string;
  location: string;
}

export function MeetingHeaderCard({ title, phase, lines, dateText, timeText, location }: Props) {
  const { text: uiText } = useUiText();
  const status = STATUS[phase];
  return (
    <section className="ui-card dml-mt-head">
      <div className="dml-mt-head__left">
        <div className="dml-mt-head__title">
          <h2>{uiText(title)}</h2>
          <StatusChip tone={status.tone}>
            <span className="dml-mt-dot" /> {uiText(status.label)}
          </StatusChip>
        </div>
        <ul className="dml-mt-head__lines" aria-label={uiText("Line yang dibahas")}>
          {lines.map((l) => (
            <li key={l}>{uiText("Line ")}{l}</li>
          ))}
        </ul>
      </div>

      <dl className="dml-mt-head__meta">
        <div>
          <IconCalendar size={18} />
          <dt>{uiText("Tanggal")}</dt>
          <dd>{dateText || "\u00a0"}</dd>
        </div>
        <div>
          <IconClock size={18} />
          <dt>{uiText("Waktu")}</dt>
          <dd>{uiText(timeText)}</dd>
        </div>
        <div>
          <IconUsers size={18} />
          <dt>{uiText("Lokasi")}</dt>
          <dd>{location}</dd>
        </div>
      </dl>
    </section>
  );
}
