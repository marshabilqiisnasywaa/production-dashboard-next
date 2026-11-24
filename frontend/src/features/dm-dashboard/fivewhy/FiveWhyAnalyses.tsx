"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useUiText } from "@/locales/useUiText";
import { fiveWhyAnalysesApi, fiveWhyDocumentsApi } from "../api";
import type { FiveWhyAnalysisSummary } from "../api";
import FiveWhyList from "./FiveWhyList";
import type { FiveWhyLineOption } from "./FiveWhyList";
import FiveWhyPage from "./FiveWhyPage";
import "./FiveWhy.css";
import "../admin/UserTable.css";

type Props = {
  headerActions?: ReactNode;
  hideHeader?: boolean;
  syncUrl?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

function idFromUrl() {
  return new URLSearchParams(window.location.search).get("id") ?? "";
}

function failureMessage(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

export default function FiveWhyAnalyses({
  headerActions,
  hideHeader,
  syncUrl = false,
  onDirtyChange,
}: Props) {
  const { text: uiText } = useUiText();
  const [ready, setReady] = useState(!syncUrl);
  const [selectedId, setSelectedId] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [items, setItems] = useState<FiveWhyAnalysisSummary[]>([]);
  const [lines, setLines] = useState<FiveWhyLineOption[]>([]);
  const [newLineId, setNewLineId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!syncUrl) return;
    setSelectedId(idFromUrl());
    setReady(true);
    function onPop() {
      setSelectedId(idFromUrl());
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [syncUrl]);

  useEffect(() => {
    let active = true;
    fiveWhyDocumentsApi
      .options()
      .catch(() => [])
      .then((options) => {
        if (!active) return;
        const choices = options.map((line) => ({ id: line.id, code: line.code }));
        setLines(choices);
        setNewLineId((current) =>
          choices.some((line) => line.id === current) ? current : choices[0]?.id ?? 0
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || selectedId) return;
    let active = true;
    setLoading(true);
    setLoadError("");
    fiveWhyAnalysesApi
      .list()
      .then((list) => {
        if (active) setItems(list);
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(failureMessage(reason, "Analisis gagal dimuat."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ready, selectedId, reload]);

  function open(id: string) {
    if (syncUrl) {
      const url = new URL(window.location.href);
      if (id) url.searchParams.set("id", id);
      else url.searchParams.delete("id");
      window.history.pushState(null, "", url);
    }
    setSelectedId(id);
  }

  async function create() {
    const lineId = newLineId || lines[0]?.id;
    if (!lineId || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      const detail = await fiveWhyAnalysesApi.create(lineId);
      setCreatedId(detail.id);
      open(detail.id);
    } catch (reason) {
      setCreateError(failureMessage(reason, "Analisis gagal dibuat."));
    } finally {
      setCreating(false);
    }
  }

  if (!ready) return null;

  if (selectedId) {
    return (
      <FiveWhyPage
        analysisId={selectedId}
        headerActions={headerActions}
        hideHeader={hideHeader}
        focusTitle={createdId === selectedId}
        onBack={() => open("")}
        onOpen={open}
        onDirtyChange={onDirtyChange}
      />
    );
  }

  return (
    <div className="dm-5w-root">
      <div className="dm-5w-page dm-5w-document-page">
        {hideHeader ? null : (
          <header className="dm-5w-page-head">
            <div className="dm-5w-page-head-main">
              <div>
                <h1 className="dm-5w-page-title">{uiText("5Why + PDCA")}</h1>
                <p className="dm-5w-page-sub">{uiText("Analisis akar masalah dan rencana tindak lanjutnya.")}</p>
              </div>
              {headerActions}
            </div>
          </header>
        )}
        {loading ? (
          <p role="status">{uiText("Memuat analisis...")}</p>
        ) : loadError ? (
          <div className="dm-5w-document-error" role="alert">
            {uiText(loadError)}{" "}
            <button
              type="button"
              className="dm-5w-btn dm-5w-btn-secondary"
              onClick={() => setReload((value) => value + 1)}
            >
              {uiText("Coba lagi")}
            </button>
          </div>
        ) : (
          <FiveWhyList
            items={items}
            lines={lines}
            newLineId={newLineId}
            creating={creating}
            createError={createError}
            onNewLineChange={setNewLineId}
            onCreate={() => void create()}
            onOpen={open}
          />
        )}
      </div>
    </div>
  );
}
