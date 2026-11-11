"use client";

import { useState } from "react";
import { useUiText } from "@/locales/useUiText";
import DocumentLibrary from "./DocumentLibrary";
import FiveWhyPage from "./FiveWhyPage";
import "./FiveWhy.css";
import "../admin/UserTable.css";

export default function FiveWhyWorkspace() {
  const { text: uiText } = useUiText();
  const [section, setSection] = useState<"documents" | "form">("documents");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  function openSection(next: "documents" | "form") {
    if (busy || next === section) return;
    if (
      dirty &&
      !window.confirm(
        uiText("Pindah bagian? Isian dokumen yang belum disimpan akan dibuang.")
      )
    )
      return;
    setDirty(false);
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
          section === "documents" ? "is-active" : ""
        }`}
        disabled={busy}
        aria-pressed={section === "documents"}
        onClick={() => openSection("documents")}
      >
        {uiText("Upload")}
      </button>
      <button
        type="button"
        className={`dm-5w-workspace-tab ${
          section === "form" ? "is-active" : ""
        }`}
        disabled={busy}
        aria-pressed={section === "form"}
        onClick={() => openSection("form")}
      >
        {uiText("Form 5Why (belum siap)")}
      </button>
    </nav>
  );

  return (
    <div className="dm-5w-root">
      {section === "documents" ? (
        <DocumentLibrary
          onBusyChange={setBusy}
          onDraftChange={setDirty}
          headerActions={sectionControls}
        />
      ) : (
        <FiveWhyPage
          headerActions={sectionControls}
          notice={uiText(
            "Form 5Why masih dalam pengembangan dan memakai penyimpanan browser. Untuk sementara, gunakan bagian Dokumen Excel / SIMO."
          )}
        />
      )}
    </div>
  );
}
