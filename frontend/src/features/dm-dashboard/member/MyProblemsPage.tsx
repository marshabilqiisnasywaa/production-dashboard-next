"use client";

import { useEffect, useState } from "react";
import "../leader/problems/problems.css"; // table styles shared with the Leader's Tracking Masalah
import { Card } from "@/components/ui/Card";
import { ProblemTable } from "../leader/problems/components/ProblemTable";
import { ProblemLoadError } from "../leader/problems/components/ProblemLoadError";
import { useMyProblems } from "./hooks/useMyProblems";

/** "Masalah Saya": the Leader's Tracking Masalah table, but only the rows where this member is the PIC. */
export default function MyProblemsPage() {
  const { mine, open, escalated, solved, ready, toggleSolved, saveSolution, error, refresh } =
    useMyProblems();
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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
          <h1>Masalah Saya</h1>
          <p>
            Tindak lanjut dari DM dan workshop meeting yang menjadi tanggung jawab Anda. Yang
            melewati due date otomatis dieskalasi ke Supervisor.
          </p>
        </div>
      </div>

      <Card
        flush
        title="Daftar masalah"
        subtitle={`${open.length} terbuka · ${escalated} eskalasi SPV · ${solved} selesai`}
      >
        {actionError && <p role="alert">{actionError}</p>}
        {updatingStatus && <p role="status">Menyimpan status masalah...</p>}
        {error ? <ProblemLoadError error={error} onRetry={refresh} /> : ready ? (
          <ProblemTable
            rows={mine}
            onToggleSolved={handleToggleSolved}
            onSaveSolution={saveSolution}
          />
        ) : (
          <div className="dml-empty">Memuat masalah…</div>
        )}
      </Card>

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
