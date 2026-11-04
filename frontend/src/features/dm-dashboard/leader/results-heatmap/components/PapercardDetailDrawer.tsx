"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect } from "react";
import { IconClose, IconCheckCircle, IconAlert } from "@/components/ui/icons";
import type { PapercardResult, RoleKey } from "../types";
import { ROLE_LABEL } from "../types";
import { formatLongDate, formatTimeHm, groupAspects, recurrenceCount } from "../utils";

interface Props {
  result: PapercardResult | null;
  allResults: PapercardResult[];
  onClose: () => void;
}

export function PapercardDetailDrawer({ result, allResults, onClose }: Props) {
  const { text: uiText } = useUiText();
  useEffect(() => {
    if (!result) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [result, onClose]);

  if (!result) return null;
  const categories = groupAspects(result.aspects);
  const role = result.role as RoleKey;

  return (
    <div className="dmr-drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="dmr-drawer" role="dialog" aria-modal="true" aria-labelledby="dmr-drawer-title">
        <header className="dmr-drawer__head">
          <div>
            <p className="dmr-eyebrow">{uiText("Detail Papercard")}</p>
            <h2 id="dmr-drawer-title">{ROLE_LABEL[role]}</h2>
            <p className="dmr-muted">{formatLongDate(result.date)}</p>
          </div>
          <button type="button" className="dmr-close" aria-label={uiText("Tutup detail")} onClick={onClose}><IconClose size={18} /></button>
        </header>
        <div className="dmr-drawer__body">
          <div className="dmr-detail-summary">
            <span className={result.ngCount ? "dmr-status-pill dmr-status-pill--ng" : "dmr-status-pill dmr-status-pill--ok"}>
              {result.ngCount ? <IconAlert size={15} /> : <IconCheckCircle size={15} />}
              {result.ngCount ? uiText("{{v0}} NG", { v0: result.ngCount }) : uiText("OK")}
            </span>
            {result.late && <span className="dmr-status-pill dmr-status-pill--late">{uiText("Terlambat")}</span>}
            <span className="dmr-muted">{result.okCount}{uiText(" aspek OK")}</span>
          </div>
          <div className="dmr-meta-grid">
            <div><span>{uiText("Diisi oleh")}</span><strong>{result.submittedBy || uiText("Tidak diketahui")}</strong></div>
            <div><span>{uiText("Waktu pengisian")}</span><strong>{formatTimeHm(result.submittedAt) || uiText("Tidak tersedia")}</strong></div>
          </div>
          {categories.length === 0 ? <p className="dmr-message">{uiText("Tidak ada rincian jawaban yang tersedia untuk papercard ini.")}</p> : categories.map((category) => (
            <section key={category.id} className={`dmr-category ${category.ngCount ? "has-ng" : ""}`}>
              <header className="dmr-category__head">
                <div><h3>{uiText(category.name)}</h3><p>{category.okCount}{uiText(" OK")}{category.ngCount ? uiText(" · {{v0}} NG", { v0: category.ngCount }) : ""}</p></div>
                {category.ngCount > 0 && <span className="dmr-status-pill dmr-status-pill--ng">{category.ngCount}{uiText(" NG")}</span>}
              </header>
              {category.groups.map((group, index) => <div className="dmr-answer-group" key={`${category.id}-${group.title ?? "default"}-${index}`}>
                {group.title && <h4>{uiText(group.title)}</h4>}
                {group.aspects.map((aspect) => {
                  const repeated = aspect.status === "NG" ? recurrenceCount(allResults, role, aspect.key) : 0;
                  return <article key={aspect.key} className={`dmr-answer ${aspect.status === "NG" ? "dmr-answer--ng" : "dmr-answer--ok"}`}>
                    <div className="dmr-answer__title"><strong>{uiText(aspect.title)}</strong><span className={`dmr-answer__badge ${aspect.status === "NG" ? "is-ng" : "is-ok"}`}>{uiText(aspect.status)}</span></div>
                    {aspect.ruleText && <p className="dmr-answer__rule">{uiText(aspect.ruleText)}</p>}
                    {aspect.textValue && <p><span className="dmr-muted">{uiText("Nilai: ")}</span>{aspect.textValue}</p>}
                    {aspect.status === "NG" && <div className="dmr-ng-focus">
                      {aspect.cause && <p><strong>{uiText("Penyebab:")}</strong> {aspect.cause}</p>}
                      {aspect.solution && <p><strong>{uiText("Tindakan perbaikan:")}</strong> {aspect.solution}</p>}
                      {repeated > 1 && <span className="dmr-recurrence">{uiText("NG berulang ")}{repeated}{uiText("× minggu ini")}</span>}
                    </div>}
                  </article>;
                })}
              </div>)}
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}
