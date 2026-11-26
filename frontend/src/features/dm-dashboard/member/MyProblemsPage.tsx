"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import "../leader/problems/problems.css"; // table styles shared with the Leader's Tracking Masalah
import { Card } from "@/components/ui/Card";
import { AddProblemModal } from "../leader/problems/components/AddProblemModal";
import { ProblemTable } from "../leader/problems/components/ProblemTable";
import { ProblemLoadError } from "../leader/problems/components/ProblemLoadError";
import ProblemsPage from "../leader/problems/ProblemsPage";
import { useMyProblems } from "./hooks/useMyProblems";

type ProblemView = "mine" | "all";

const VIEWS: readonly { key: ProblemView; label: string }[] = [
  { key: "mine", label: "Masalah saya" },
  { key: "all", label: "Semua masalah" },
];

/** "Masalah Saya": rows where this user is the PIC, plus a read-only tab of every problem (only PICs can act). */
export default function MyProblemsPage() {
  const { text: uiText } = useUiText();
  const [view, setView] = useState<ProblemView>("mine");
  const { mine, open, escalated, solved, ready, toggleSolved, saveSolution, error, refresh } =
    useMyProblems();
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleToggleSolved(id: string, currentlySolved: boolean) {
    if (updatingStatus) return;
    setUpdatingStatus(true);
    setActionError(null);
    setToast(null);
    try {
      await toggleSolved(id, currentlySolved);
      setToast(
        currentlySolved ? "Masalah dibuka kembali" : "Masalah ditandai selesai"
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Status masalah gagal disimpan.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <div className="dml-pb">
      <div className="dml-page-head">
        <div>
          <h1>{uiText("Masalah Saya")}</h1>
          <p>{uiText("Tindak lanjut dari DM dan workshop meeting yang menjadi tanggung jawab Anda. Yang melewati due date otomatis dieskalasi ke Supervisor.")}</p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div className="dml-pb-sources" role="group" aria-label={uiText("Tampilan masalah")}>
          {VIEWS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={"dml-pb-source" + (view === item.key ? " is-active" : "")}
              aria-pressed={view === item.key}
              onClick={() => setView(item.key)}
            >
              {uiText(item.label)}
            </button>
          ))}
        </div>

        {view === "mine" && (
          <button
            type="button"
            className="dml-pb-add-btn"
            onClick={() => setAddOpen(true)}
          >
            <Plus size={15} aria-hidden="true" />
            {uiText("Tambah Masalah")}
          </button>
        )}
      </div>

      {view === "all" ? <ProblemsPage hideHeading /> : <Card
        flush
        title={uiText("Daftar masalah")}
        subtitle={uiText("{{v0}} terbuka · {{v1}} eskalasi SPV · {{v2}} selesai", { v0: open.length, v1: escalated, v2: solved })}
      >
        {actionError && <p role="alert">{actionError}</p>}
        {updatingStatus && <p role="status">{uiText("Menyimpan status masalah...")}</p>}
        {error ? <ProblemLoadError error={error} onRetry={refresh} /> : ready ? (
          <ProblemTable
            rows={mine}
            onToggleSolved={handleToggleSolved}
            onSaveSolution={saveSolution}
          />
        ) : (
          <div className="dml-empty">{uiText("Memuat masalah…")}</div>
        )}
      </Card>}

      <AddProblemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          refresh();
          setToast(uiText("Masalah berhasil ditambahkan"));
        }}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md px-3.5 py-2 text-xs font-medium text-white shadow-md"
          style={{ background: "#286b46" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
