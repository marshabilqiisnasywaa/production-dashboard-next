"use client";

import { useEffect, useState } from "react";
import { useUiText } from "@/locales/useUiText";
import PapercardProblems from "../../admin/PapercardProblems";
import { accountApi, type DmLine } from "../../api";
import {
  ProblemSourceTabs,
  type ProblemSource,
} from "./components/ProblemSourceTabs";
import ProblemsPage from "./ProblemsPage";
import "./problems.css";

export default function ProblemTracking() {
  const { text: uiText } = useUiText();
  const [source, setSource] = useState<ProblemSource>("meeting");
  const [lines, setLines] = useState<DmLine[]>([]);

  useEffect(() => {
    let cancelled = false;
    accountApi
      .lines()
      .then((data) => {
        if (!cancelled) setLines(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="dml-page-head dml-pb-heading">
        <div>
          <h1>{uiText("Tracking Masalah")}</h1>
          <p>{uiText("Pantau tindak lanjut masalah DM meeting dan temuan NG papercard harian.")}</p>
        </div>
      </div>
      <ProblemSourceTabs value={source} onChange={setSource} />
      {source === "meeting" ? (
        <ProblemsPage hideHeading />
      ) : (
        <PapercardProblems lines={lines} adminLayout={false} />
      )}
    </div>
  );
}
