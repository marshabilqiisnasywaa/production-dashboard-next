"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Expand, Minimize, Users } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import type { Flowchart } from "./types";
import { flowchartImageSrc } from "./types";
import { fromBoard } from "./board/boardModel";
import FlowchartImageViewer from "./FlowchartImageViewer";

const FlowchartCanvas = dynamic(() => import("./board/FlowchartCanvas"), { ssr: false });

export default function DocumentView({ doc }: { doc: Flowchart }) {
  const { text: uiText, locale } = useUiText();
  const boardRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(true);
  const [contactsOpen, setContactsOpen] = useState(true);

  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const effectiveDate = doc.effectiveDate
    ? new Date(`${doc.effectiveDate}T12:00:00`).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })
    : "";
  const board = doc.kind === "board" ? fromBoard(doc.board) : null;

  return (
    <div className="dmfc-document-view">
      <article className="dmfc-document-header dmfc-card">
        <div>
          <h2>{doc.title}</h2>
            <div className="dmfc-document-summary">
              {doc.purpose && <div><strong>{uiText("Tujuan")}</strong><p>{doc.purpose}</p></div>}
              {doc.scope && <div><strong>{uiText("Ruang lingkup")}</strong><p>{doc.scope}</p></div>}
            </div>
        </div>
        <aside className="dmfc-document-meta dmfc-card">
          {effectiveDate && <div><span>{uiText("Tanggal efektif")}</span><strong>{effectiveDate}</strong></div>}
          {doc.version && <div><span>{uiText("Versi")}</span><strong>{doc.version}</strong></div>}
          {doc.owner && <div><span>{uiText("Penanggung jawab")}</span><strong>{doc.owner}</strong></div>}
          {doc.approver && <div><span>{uiText("Penyetuju")}</span><strong>{doc.approver}</strong></div>}
        </aside>

      </article>

      <div className={`dmfc-document-body${requirementsOpen ? "" : " requirements-collapsed"}`}>
        <aside className="dmfc-requirements dmfc-card">
          <button type="button" className="dmfc-panel-toggle" onClick={() => setRequirementsOpen((value) => !value)} aria-expanded={requirementsOpen}>
            {requirementsOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            {requirementsOpen && <strong>{uiText("Persyaratan proses")}</strong>}
          </button>
          {requirementsOpen && (
            doc.requirements.length ? (
              <ol>
                {doc.requirements.map((item, index) => (
                  <li key={`${index}-${item}`}><span>{index + 1}</span><p>{item}</p></li>
                ))}
              </ol>
            ) : <p className="dmfc-panel-empty">{uiText("Belum ada persyaratan.")}</p>
          )}
        </aside>

        <div className="dmfc-document-board-wrap" ref={boardRef}>
          <div className="dmfc-document-board-toolbar">
            <strong>{doc.title}</strong>
            <button type="button" className="dmfc-image-button" onClick={() => document.fullscreenElement ? document.exitFullscreen() : boardRef.current?.requestFullscreen()} aria-label={fullscreen ? uiText("Keluar layar penuh") : uiText("Layar penuh") as string}>
              {fullscreen ? <Minimize size={17} /> : <Expand size={17} />}
            </button>
          </div>

          <div className="dmfc-document-board">
            {doc.kind === "image" ? (
              <FlowchartImageViewer src={flowchartImageSrc(doc.imageUrl)} title={doc.title} />
            ) : board && board.nodes.length > 0 ? (
              <FlowchartCanvas initial={{ version: 1, nodes: board.nodes, edges: board.edges, viewport: board.viewport }} readOnly onDirty={() => undefined} />
            ) : (
              <div className="dmfc-board-placeholder"><h2>{uiText("Belum ada flowchart")}</h2></div>
            )}

            {doc.contacts.length > 0 && (
              <aside className={`dmfc-contact-card dmfc-card${contactsOpen ? "" : " is-collapsed"}`}>
                <button type="button" className="dmfc-contact-toggle" onClick={() => setContactsOpen((value) => !value)} aria-expanded={contactsOpen}>
                  <Users size={16} />
                  {contactsOpen ? uiText("Kontak") : uiText("Kontak ({{v0}})", { v0: doc.contacts.length })}
                  <ChevronDown size={16} className={`dmfc-contact-chevron${contactsOpen ? " is-open" : ""}`} />
                </button>
                {contactsOpen && (
                  <div className="dmfc-contact-groups">
                    {doc.contacts.map((contact, index) => (
                      <div className="dmfc-contact-row" key={`${contact.role}-${contact.name}-${index}`}>
                        {contact.role && <strong>{contact.role}</strong>}
                        {contact.name && <span>{contact.name}</span>}
                        {contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
