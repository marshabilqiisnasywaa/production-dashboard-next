"use client";
import { useUiText } from "@/locales/useUiText";

import "../../leader/components/leaderPageHeader.css";
import type { MemberProfile } from "../memberProfile";

/** Plain heading: line information + department + supervisor. */
export function MemberPageHeader({ profile }: { profile: MemberProfile }) {
  const { text: uiText } = useUiText();
  return (
    <header className="dml-lh">
      <h1 className="dml-lh__title">{uiText("Dashboard Member")}</h1>
      <p className="dml-lh__meta">
        <span>
          {profile.lineName} ({profile.lineCode}) · {profile.workshop}
        </span>
        <span>{uiText("Departemen ")}<strong>{uiText(profile.roleLabel)}</strong>
        </span>
        <span>{uiText("SPV: ")}<strong>{profile.supervisor}</strong>
        </span>
      </p>
    </header>
  );
}
