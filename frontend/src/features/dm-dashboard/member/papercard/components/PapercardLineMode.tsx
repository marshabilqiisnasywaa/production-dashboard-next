"use client";
import { useUiText } from "@/locales/useUiText";
import type { DmFillableLine } from "../../../api";

interface Props {
  lines: DmFillableLine[];
  activeLineId: number | null;
  userName: string;
  supervisorName: string;
  locked?: boolean;
  onSelect: (lineId: number) => void;
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function PapercardLineMode({
  lines,
  activeLineId,
  userName,
  supervisorName,
  locked,
  onSelect,
}: Props) {
  const { text: uiText } = useUiText();
  const active = lines.find((l) => l.id === activeLineId) ?? null;
  if (!active || active.isOwn) return null;

  const replaced = active.mainMembers;
  const home = lines.find((l) => l.isOwn) ?? null;

  return (
    <section className="dml-lm" aria-label={uiText("Mode pengganti")}>
      <div className="dml-lm__swap">
        <span className="dml-lm__avatar dml-lm__avatar--me">{initials(userName)}</span>
        <span className="dml-lm__arrow" aria-hidden="true">
          →
        </span>
        <span className="dml-lm__avatar dml-lm__avatar--other">
          {replaced.length > 0 ? initials(replaced[0]) : "?"}
        </span>
        <div className="dml-lm__text">
          <p className="dml-lm__title">
            {replaced.length > 0
              ? uiText("Anda mengisi sebagai pengganti {{v0}}", { v0: replaced.join(", ") })
              : uiText("Anda mengisi sebagai pengganti")}
          </p>
          <p className="dml-lm__sub">
            {uiText("Supervisor {{v0}} akan melihat nama Anda dan siapa yang digantikan. Tercatat di riwayat papercard.", {
              v0: supervisorName,
            })}
          </p>
        </div>
        {home && (
          <button
            type="button"
            className="dml-lm__back"
            disabled={locked}
            onClick={() => onSelect(home.id)}
          >
            {uiText("Kembali ke line saya")}
          </button>
        )}
      </div>
    </section>
  );
}