"use client";

import { useEffect, useState } from "react";
import "../leader/problems/problems.css"; // table styles shared with the Leader's Tracking Masalah
import { Card } from "@/components/ui/Card";
import { ProblemTable } from "../leader/problems/components/ProblemTable";
import { useMyProblems } from "./hooks/useMyProblems";

/** "Masalah Saya": the Leader's Tracking Masalah table, but only the rows where this member is the PIC. */
export default function MyProblemsPage() {
  const { mine, open, escalated, solved, ready, toggleSolved, saveSolution } =
    useMyProblems();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleToggleSolved(id: string, currentlySolved: boolean) {
    toggleSolved(id, currentlySolved);
    setToast(
      currentlySolved ? "Masalah dibuka kembali" : "Masalah ditandai selesai"
    );
  }

  return (
    <div className="dml-pb">
      <div className="dml-page-head">
        <div>
          <h1>Masalah Saya</h1>
          <p>
            Tindak lanjut dari DM meeting yang menjadi tanggung jawab Anda. Yang
            melewati due date otomatis dieskalasi ke Supervisor.
          </p>
        </div>
      </div>

      <Card
        flush
        title="Daftar masalah"
        subtitle={`${open.length} terbuka · ${escalated} eskalasi SPV · ${solved} selesai`}
      >
        {ready ? (
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
