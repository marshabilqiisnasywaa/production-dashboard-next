"use client";
import { useUiText } from "@/locales/useUiText";

import "./leaderPageHeader.css";

interface Props {
  lineName: string;
  lineCode: string;
  workshopName: string;
  supervisorName: string;
}

/** Plain page heading: line information + supervisor. */
export function LeaderPageHeader({
  lineName,
  lineCode,
  workshopName,
  supervisorName,
}: Props) {
  const { text: uiText } = useUiText();
  return (
    <header className="dml-lh">
      <div className="dml-lh__copy">
        <h1 className="dml-lh__title">{uiText("Dashboard Leader")}</h1>
        <p className="dml-lh__meta">
          <span>
            {lineName} ({lineCode}) · {workshopName}
          </span>
          <span>{uiText("SPV: ")}<strong>{supervisorName}</strong>
          </span>
        </p>
      </div>
    </header>
  );
}
