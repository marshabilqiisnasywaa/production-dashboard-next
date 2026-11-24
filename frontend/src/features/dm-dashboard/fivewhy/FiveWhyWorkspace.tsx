"use client";

import { useState } from "react";
import { useUiText } from "@/locales/useUiText";
import DocumentLibrary from "./DocumentLibrary";
import FiveWhyAnalyses from "./FiveWhyAnalyses";
import "./FiveWhy.css";
import "../admin/UserTable.css";

type Section = "analysis" | "documents";

export default function FiveWhyWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { text: uiText } = useUiText();
  const [section, setSection] = useState<Section>("analysis");
  const [busy, setBusy] = useState(false);
  const [documentDirty, setDocumentDirty] = useState(false);
  const [analysisDirty, setAnalysisDirty] = useState(false);

  function openSection(next: Section) {
    if (busy || next === section) return;
    const dirty = section === "documents" ? documentDirty : analysisDirty;
    if (
      dirty &&
      !window.confirm(
        uiText(
          section === "documents"
            ? "Pindah bagian? Isian dokumen yang belum disimpan akan dibuang."
            : "Pindah bagian? Perubahan analisis yang belum disimpan akan dibuang."
        )
      )
    )
      return;
    setDocumentDirty(false);
    setAnalysisDirty(false);
    setSection(next);
  }

  const sectionControls = (
    <nav
      className="dm-5w-workspace-nav"
      aria-label={uiText("Bagian 5Why & PDCA")}
    >
      <button
        type="button"
        className={`dm-5w-workspace-tab ${
          section === "analysis" ? "is-active" : ""
        }`}
        disabled={busy}
        aria-pressed={section === "analysis"}
        onClick={() => openSection("analysis")}
      >
        {uiText("Analisis 5Why")}
      </button>
      <button
        type="button"
        className={`dm-5w-workspace-tab ${
          section === "documents" ? "is-active" : ""
        }`}
        disabled={busy}
        aria-pressed={section === "documents"}
        onClick={() => openSection("documents")}
      >
        {uiText("Upload")}
      </button>
    </nav>
  );

  return (
    <div className="dm-5w-root">
      {embedded ? sectionControls : null}
      {section === "analysis" ? (
        <FiveWhyAnalyses
          syncUrl={!embedded}
          hideHeader={embedded}
          headerActions={embedded ? undefined : sectionControls}
          onDirtyChange={setAnalysisDirty}
        />
      ) : (
        <DocumentLibrary
          hideHeader={embedded}
          onBusyChange={setBusy}
          onDraftChange={setDocumentDirty}
          headerActions={embedded ? undefined : sectionControls}
        />
      )}
    </div>
  );
}
