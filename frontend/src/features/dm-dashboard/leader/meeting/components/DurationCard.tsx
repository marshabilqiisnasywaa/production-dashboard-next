"use client";
import { useUiText } from "@/locales/useUiText";


import { useNow } from "../../hooks/useNow";
import { formatClock, formatDuration } from "../utils";

/** Live meeting timer. Has its own 1s clock so the form below does not re-render every second. */
export function DurationCard({ startedAt }: { startedAt: string }) {
  const { text: uiText } = useUiText();
  const now = useNow(1000);
  const elapsed = now ? now.getTime() - new Date(startedAt).getTime() : 0;

  return (
    <section className="ui-card dml-mt-duration">
      <span className="dml-mt-duration__label">{uiText("Durasi")}</span>
      <p className="dml-mt-duration__time" role="timer" aria-live="off">
        {formatDuration(elapsed)}
      </p>
      <p className="dml-mt-duration__since">{uiText("Meeting dimulai sejak ")}{formatClock(startedAt)}</p>
    </section>
  );
}
