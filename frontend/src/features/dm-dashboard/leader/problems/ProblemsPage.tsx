"use client";

import { useMemo, useState } from "react";
import "./problems.css";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ProblemTable } from "./components/ProblemTable";
import { useProblems } from "./hooks/useProblems";
import type { ProblemFilter } from "./types";

/** Composition only: data in hooks/useProblems, table in components/ProblemTable. */
export default function ProblemsPage() {
  const { rows, counts, ready, toggleSolved } = useProblems();
  const [filter, setFilter] = useState<ProblemFilter>("all");

  const visible = useMemo(() => (filter === "all" ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);

  const options: { value: ProblemFilter; label: string }[] = [
    { value: "all", label: `Semua (${counts.all})` },
    { value: "unsolved", label: `Unsolved (${counts.unsolved})` },
    { value: "escalated", label: `Eskalasi (${counts.escalated})` },
    { value: "solved", label: `Solved (${counts.solved})` },
  ];

  return (
    <div className="dml-pb">
      <div className="dml-page-head">
        <div>
          <h1>Tracking Masalah</h1>
          <p>
            Pantau tindak lanjut dari DM meeting. Masalah yang melewati due date otomatis ditandai{" "}
            <strong>Eskalasi SPV</strong>.
          </p>
        </div>
      </div>

      <Card
        flush
        title="Daftar masalah"
        actions={<SegmentedControl ariaLabel="Filter status masalah" options={options} value={filter} onChange={(v) => setFilter(v as ProblemFilter)} />}
      >
        {ready ? (
          <ProblemTable rows={visible} onToggle={toggleSolved} />
        ) : (
          <div className="dml-empty">Memuat masalah…</div>
        )}
      </Card>
    </div>
  );
}
