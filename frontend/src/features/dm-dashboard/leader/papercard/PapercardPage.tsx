"use client";

import { useState } from "react";
import "./papercard.css";
import { CategoryNav } from "./components/CategoryNav";
import { CategoryPanel } from "./components/CategoryPanel";
import { OverallProgress } from "./components/OverallProgress";
import { PapercardMetaCard } from "./components/PapercardMetaCard";
import { SubmissionNotice } from "./components/SubmissionNotice";
import { SubmitBar } from "./components/SubmitBar";
import { WindowBanner } from "./components/WindowBanner";
import { useInspectionWindow } from "./hooks/useInspectionWindow";
import { usePapercardForm } from "./hooks/usePapercardForm";
import { LEADER_TEMPLATE, PAPERCARD_CONFIG, PAPERCARD_LINES } from "./mockTemplate";
import type { Submission } from "./types";
import { formatDateId } from "./utils";
import { LEADER_USER } from "../mockData";

const TEMPLATE = LEADER_TEMPLATE;

/** Composition only: logic is in hooks/, UI pieces are in components/. */
export default function PapercardPage() {
  const win = useInspectionWindow({
    start: TEMPLATE.window.start,
    end: TEMPLATE.window.end,
    simulate: PAPERCARD_CONFIG.simulateWindow,
  });
  const form = usePapercardForm(TEMPLATE.categories);

  const [line, setLine] = useState(PAPERCARD_LINES[0]);
  const [activeId, setActiveId] = useState(TEMPLATE.categories[0].id);
  const [submission, setSubmission] = useState<Submission | null>(null);

  const readOnly = submission !== null;
  const active = TEMPLATE.categories.find((c) => c.id === activeId) ?? TEMPLATE.categories[0];
  const activeProgress = form.progress.byCategory[active.id] ?? { done: 0, total: 0 };

  const handleSubmit = () => {
    if (!form.progress.complete || !win.now) return;
    // Late = sent after the window closes (BR-02)
    setSubmission({ submittedAt: win.now, status: win.state === "closed" ? "LATE" : "ON_TIME" });
    // TODO: POST { templateId, templateVersion, line, answers: form.answers, submittedAt } to the API
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="dml-pc">
      <div className="dml-page-head">
        <div>
          <h1>Papercard Leader</h1>
          <p>Isi checklist setiap hari sebelum DM meeting tepat waktu untuk memastikan kesiapan line.</p>
        </div>
      </div>

      {submission && <SubmissionNotice submission={submission} />}

      <PapercardMetaCard
        lines={PAPERCARD_LINES}
        line={line}
        onLineChange={setLine}
        leader={LEADER_USER.name}
        shift={PAPERCARD_CONFIG.shift}
        date={win.now ? formatDateId(win.now) : ""}
        lineLocked={readOnly}
      >
        <WindowBanner
          state={win.state}
          start={TEMPLATE.window.start}
          end={TEMPLATE.window.end}
          remainingMs={win.remainingMs}
        />
      </PapercardMetaCard>

      <OverallProgress done={form.progress.done} total={form.progress.total} />

      <div className="dml-pc__grid">
        <CategoryNav
          categories={TEMPLATE.categories}
          activeId={active.id}
          progress={form.progress.byCategory}
          onSelect={setActiveId}
        />
        <CategoryPanel
          category={active}
          rule={TEMPLATE.rule}
          done={activeProgress.done}
          total={activeProgress.total}
          readOnly={readOnly}
          getAnswer={form.getAnswer}
          onChange={form.update}
          onMarkAllOk={() => form.markAllOk(active.id)}
        />
      </div>

      <SubmitBar
        done={form.progress.done}
        total={form.progress.total}
        complete={form.progress.complete}
        submitted={readOnly}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
