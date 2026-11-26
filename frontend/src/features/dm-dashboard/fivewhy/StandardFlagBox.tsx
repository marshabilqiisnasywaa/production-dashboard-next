"use client";
import { useUiText } from "@/locales/useUiText";

import { useState } from "react";
import { fiveWhyAnalysesApi } from "../api";
import type { FiveWhyStandard } from "../api";
import { departmentLabel, normalizeDepartment } from "../departments";
import type { Solution } from "./fiveWhyData";

const DEPARTMENTS = [
  { key: "PROD", label: "Produksi" },
  { key: "ME", label: "ME" },
  { key: "PE", label: "PE" },
  { key: "QC", label: "Quality" },
];

function suggestedDepartment(solution: Solution) {
  const department = normalizeDepartment(solution.dept);
  return DEPARTMENTS.some((item) => item.key === department) ? department : "PROD";
}

type Props = {
  analysisId: string;
  solutions: Solution[];
  standard: Record<string, FiveWhyStandard>;
  canFlag: boolean;
  onSaved: (standard: Record<string, FiveWhyStandard>) => void;
  onNotify: (message: string) => void;
};

function SolutionRow({
  analysisId,
  solution,
  index,
  current,
  onSaved,
  onNotify,
}: {
  analysisId: string;
  solution: Solution;
  index: number;
  current: FiveWhyStandard | undefined;
  onSaved: Props["onSaved"];
  onNotify: Props["onNotify"];
}) {
  const { text: uiText } = useUiText();
  const [flagged, setFlagged] = useState(Boolean(current?.flagged));
  const [department, setDepartment] = useState(
    current?.department || suggestedDepartment(solution)
  );
  const [note, setNote] = useState(current?.note ?? "");
  const [saving, setSaving] = useState(false);

  const changed =
    flagged !== Boolean(current?.flagged) ||
    (flagged && (department !== current?.department || note !== current?.note));

  async function save() {
    setSaving(true);
    try {
      const detail = await fiveWhyAnalysesApi.setStandard(analysisId, solution.id, {
        flagged,
        department,
        note,
      });
      onSaved(detail.standard);
      onNotify(
        flagged ? "Solusi ditandai sebagai standar baru." : "Tanda standar baru dihapus."
      );
    } catch (reason) {
      onNotify(
        reason instanceof Error ? reason.message : "Tanda standar gagal disimpan."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="dm-5w-standard-item">
      <label className="dm-5w-standard-check">
        <input
          type="checkbox"
          checked={flagged}
          disabled={saving}
          onChange={(event) => setFlagged(event.target.checked)}
        />
        <span>
          {index + 1}. {solution.text.trim() || uiText("Solusi tanpa teks")}
        </span>
      </label>
      {flagged ? (
        <div className="dm-5w-standard-grid">
          <div className="dm-5w-field">
            <label className="dm-5w-label" htmlFor={`dm-5w-standard-dept-${solution.id}`}>
              {uiText("Papercard departemen")}
            </label>
            <select
              id={`dm-5w-standard-dept-${solution.id}`}
              className="dm-5w-select"
              value={department}
              disabled={saving}
              onChange={(event) => setDepartment(event.target.value)}
            >
              {DEPARTMENTS.map((item) => (
                <option key={item.key} value={item.key}>
                  {uiText(item.label)}
                </option>
              ))}
            </select>
          </div>
          <div className="dm-5w-field">
            <label className="dm-5w-label" htmlFor={`dm-5w-standard-note-${solution.id}`}>
              {uiText("Catatan standar baru")}
            </label>
            <textarea
              id={`dm-5w-standard-note-${solution.id}`}
              className="dm-5w-textarea"
              value={note}
              maxLength={2000}
              disabled={saving}
              placeholder={uiText("Apa yang harus ditambahkan atau diubah di papercard?")}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>
      ) : null}
      <div className="dm-5w-standard-actions">
        <button
          type="button"
          className="dm-5w-btn dm-5w-btn-primary dm-5w-btn-sm"
          disabled={!changed || saving}
          onClick={() => void save()}
        >
          {uiText(saving ? "Menyimpan..." : "Simpan")}
        </button>
        {current?.flagged ? (
          <span className="dm-5w-standard-meta">
            {uiText("Ditandai oleh")} {current.flaggedBy}
            {current.applied ? ` · ${uiText("Sudah diterapkan")}` : ""}
          </span>
        ) : null}
      </div>
    </li>
  );
}

export default function StandardFlagBox({
  analysisId,
  solutions,
  standard,
  canFlag,
  onSaved,
  onNotify,
}: Props) {
  const { text: uiText } = useUiText();
  const flaggedSolutions = solutions.filter((solution) => standard[solution.id]?.flagged);

  if (!canFlag && flaggedSolutions.length === 0) return null;
  if (canFlag && solutions.length === 0) return null;

  if (!canFlag) {
    return (
      <div className="dm-5w-card dm-5w-standard">
        <h4 className="dm-5w-card-title">{uiText("Standar baru")}</h4>
        <ul className="dm-5w-standard-list">
          {flaggedSolutions.map((solution) => {
            const item = standard[solution.id];
            return (
              <li key={solution.id} className="dm-5w-standard-item">
                <strong>{solution.text.trim() || "—"}</strong>
                <p className="dm-5w-standard-meta">
                  {uiText("Papercard")} {departmentLabel(item.department)} ·{" "}
                  {uiText("Ditandai oleh")} {item.flaggedBy}
                  {item.applied ? ` · ${uiText("Sudah diterapkan")}` : ""}
                </p>
                {item.note ? <p>{item.note}</p> : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="dm-5w-card dm-5w-standard">
      <h4 className="dm-5w-card-title">{uiText("Jadikan standar baru")}</h4>
      <p className="dm-5w-standard-meta">
        {uiText("Centang solusi yang menjadi standar baru, lalu simpan per solusi.")}
      </p>
      <ul className="dm-5w-standard-list">
        {solutions.map((solution, index) => (
          <SolutionRow
            key={solution.id}
            analysisId={analysisId}
            solution={solution}
            index={index}
            current={standard[solution.id]}
            onSaved={onSaved}
            onNotify={onNotify}
          />
        ))}
      </ul>
    </div>
  );
}
