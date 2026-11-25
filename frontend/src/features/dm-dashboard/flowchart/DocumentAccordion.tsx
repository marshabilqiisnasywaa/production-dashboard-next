"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import { flowchartApi } from "./../api";
import type { Flowchart, FlowchartListItem } from "./types";
import DocumentView from "./DocumentView";

export default function DocumentAccordion({ items, phase }: { items: FlowchartListItem[]; phase: string }) {
  const { text: uiText, locale } = useUiText();
  const [openId, setOpenId] = useState<number | null>(null);
  const [docs, setDocs] = useState<Record<number, Flowchart | undefined>>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const refs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      const match = hash.match(/^([^/]+)\/([0-9]+)$/);
      if (match && match[1] === phase) {
        const id = Number(match[2]);
        if (items.some((item) => item.id === id)) setOpenId(id);
      } else if (items.length === 1) {
        setOpenId(items[0].id);
      }
    }
  }, [items, phase]);

  useEffect(() => {
    if (openId === null) return;
    if (typeof window !== "undefined") window.history.replaceState(null, "", `#${phase}/${openId}`);
    if (!docs[openId]) {
      setLoadingId(openId);
      flowchartApi.get(openId)
        .then((doc) => setDocs((current) => ({ ...current, [openId]: doc })))
        .finally(() => setLoadingId(null));
    }
    window.setTimeout(() => refs.current[openId]?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [openId, phase]);

  if (items.length === 0) {
    return <div className="dmfc-document-empty"><h2>{uiText("Belum ada dokumen")}</h2><p>{uiText("Belum ada dokumen pada fase ini.")}</p></div>;
  }

  return (
    <div className="dmfc-document-accordion">
      {items.map((item) => {
        const open = openId === item.id;
        const effectiveDate = item.effectiveDate
          ? new Date(`${item.effectiveDate}T12:00:00`).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
          : "";
        return (
          <div className={`dmfc-document-row${open ? " is-open" : ""}`} key={item.id} ref={(node) => { refs.current[item.id] = node; }}>
            <button type="button" className="dmfc-document-row__head" aria-expanded={open} onClick={() => setOpenId(open ? null : item.id)}>
              <div className="dmfc-document-row__title">
                <strong>{item.title}</strong>
              </div>
              {item.version && <span className="dmfc-version-chip">v{item.version}</span>}
              {effectiveDate && <span className="dmfc-document-date">{effectiveDate}</span>}
              {item.owner && <span className="dmfc-document-owner">{item.owner}</span>}
              {item.purpose && <span className="dmfc-document-purpose">{item.purpose}</span>}
              <ChevronDown size={18} className="dmfc-document-chevron" />
            </button>
            {open && (
              <div className="dmfc-document-row__body">
                {loadingId === item.id || !docs[item.id] ? (
                  <div className="dmfc-document-skeleton" aria-busy="true"><div /><div /><div /></div>
                ) : <DocumentView doc={docs[item.id]!} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
