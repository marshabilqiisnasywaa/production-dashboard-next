"use client";
import { useUiText } from "@/locales/useUiText";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fiveWhyAnalysesApi } from "../api";
import type { FiveWhyAnalysisSummary, FiveWhyStandard } from "../api";
import { departmentLabel } from "../departments";

export type StandardTarget = {
  analysisId: string;
  solutionId: string;
  solutionText: string;
  nomor: string;
  title: string;
  lineCode: string;
  department: string;
  note: string;
  rootCause: string;
};

type Proposal = {
  key: string;
  analysis: FiveWhyAnalysisSummary;
  solutionId: string;
  standard: FiveWhyStandard;
};

type Filter = "pending" | "applied" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "Belum diterapkan" },
  { key: "applied", label: "Sudah diterapkan" },
  { key: "all", label: "Semua" },
];

export default function StandardProposals({
  onOpenPapercard,
}: {
  onOpenPapercard: (target: StandardTarget) => void;
}) {
  const { text: uiText } = useUiText();
  const [items, setItems] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("pending");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fiveWhyAnalysesApi
      .list()
      .then((rows) =>
        setItems(
          rows
            .flatMap((analysis) =>
              Object.entries(analysis.standard ?? {}).map(([solutionId, standard]) => ({
                key: `${analysis.id}:${solutionId}`,
                analysis,
                solutionId,
                standard,
              }))
            )
            .sort((a, b) => b.standard.flaggedAt.localeCompare(a.standard.flaggedAt))
        )
      )
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Usulan standar gagal dimuat."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          filter === "all" ||
          (filter === "applied") === item.standard.applied
      ),
    [items, filter]
  );

  return (
    <div className="dm-standard">
      <div className="dm-subtabs" role="group" aria-label={uiText("Filter usulan standar")}>
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`dm-subtab${filter === item.key ? " is-active" : ""}`}
            aria-pressed={filter === item.key}
            onClick={() => setFilter(item.key)}
          >
            {uiText(item.label)}
          </button>
        ))}
      </div>

      {loading ? (
        <p role="status">{uiText("Memuat usulan standar...")}</p>
      ) : error ? (
        <p role="alert">{uiText(error)}</p>
      ) : visible.length === 0 ? (
        <div className="dm-admin-state-block">
          <h3>{uiText("Belum ada usulan standar")}</h3>
          <p>{uiText("Usulan muncul setelah Supervisor Production menandai 5Why & PDCA.")}</p>
        </div>
      ) : (
        <div className="dm-admin-table-wrap">
          <table className="dm-admin-table">
            <thead>
              <tr>
                <th>{uiText("Nomor")}</th>
                <th>{uiText("Line")}</th>
                <th>{uiText("Masalah")}</th>
                <th>{uiText("Solusi")}</th>
                <th>{uiText("Papercard")}</th>
                <th>{uiText("Catatan standar")}</th>
                <th>{uiText("Ditandai")}</th>
                <th>{uiText("Status")}</th>
                <th>{uiText("Aksi")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.key}>
                  <td>{item.analysis.nomor}</td>
                  <td>{item.analysis.lineCode || "—"}</td>
                  <td className="dm-standard-note">{item.analysis.title || "—"}</td>
                  <td className="dm-standard-note">{item.standard.solutionText || "—"}</td>
                  <td>{departmentLabel(item.standard.department)}</td>
                  <td className="dm-standard-note">{item.standard.note || "—"}</td>
                  <td>
                    {item.standard.flaggedBy}
                    <br />
                    {new Date(item.standard.flaggedAt).toLocaleDateString("id-ID")}
                  </td>
                  <td>
                    {uiText(item.standard.applied ? "Sudah diterapkan" : "Belum diterapkan")}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="dm-admin-btn is-primary"
                      onClick={() =>
                        onOpenPapercard({
                          analysisId: item.analysis.id,
                          solutionId: item.solutionId,
                          solutionText: item.standard.solutionText,
                          nomor: item.analysis.nomor,
                          title: item.analysis.title,
                          lineCode: item.analysis.lineCode,
                          department: item.standard.department,
                          note: item.standard.note,
                          rootCause: item.analysis.rootCause,
                        })
                      }
                    >
                      {uiText("Ubah Checklist")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
