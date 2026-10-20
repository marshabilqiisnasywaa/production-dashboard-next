"use client";

import "../leader/problems/problems.css"; // table styles shared with the Leader's Tracking Masalah
import { Card } from "@/components/ui/Card";
import { ProblemTable } from "../leader/problems/components/ProblemTable";
import { useMyProblems } from "./hooks/useMyProblems";
import { useMember } from "./MemberProvider";

/** "Masalah Saya": the Leader's Tracking Masalah table, but only the rows where this member is the PIC. */
export default function MyProblemsPage() {
  const { profile } = useMember();
  const { mine, open, escalated, ready, toggleSolved } = useMyProblems(profile.name);

  return (
    <div className="dml-pb">
      <div className="dml-page-head">
        <div>
          <h1>Masalah Saya</h1>
          <p>
            Tindak lanjut dari DM meeting yang menjadi tanggung jawab Anda. Yang melewati due date otomatis dieskalasi ke
            Supervisor.
          </p>
        </div>
      </div>

      <Card flush title="Daftar masalah" subtitle={`${open.length} terbuka · ${escalated} eskalasi SPV`}>
        {ready ? <ProblemTable rows={mine} /> : <div className="dml-empty">Memuat masalah…</div>}
      </Card>
    </div>
  );
}
