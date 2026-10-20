"use client";
import {
  ABNORMAL_IMPACT_OPTIONS,
  ABNORMAL_SOURCE_OPTIONS,
  PROBLEM_CHARACTERISTIC_OPTIONS,
  PROBLEM_TIMING_OPTIONS,
} from "./fiveWhyData";
import type {
  FiveWhyAbnormal,
  ProblemCharacteristic,
  ProblemSummaryFields,
  ProblemTiming,
} from "./fiveWhyData";

type ProblemSummaryProps = {
  abnormal: FiveWhyAbnormal;
  canEdit: boolean;
  onChange: (next: FiveWhyAbnormal) => void;
};

type StatementFieldKey =
  | "when"
  | "where"
  | "what"
  | "who"
  | "how"
  | "howMuch"
  | "shortTermSolution";

const STATEMENT_FIELDS: readonly {
  key: StatementFieldKey;
  label: string;
  placeholder: string;
}[] = [
  { key: "when", label: "When", placeholder: "Kapan kejadian berlangsung" },
  { key: "where", label: "Where", placeholder: "Di mana kejadian terjadi" },
  { key: "what", label: "What", placeholder: "Apa masalah yang terjadi" },
  { key: "who", label: "Who", placeholder: "Siapa yang terlibat" },
  { key: "how", label: "How", placeholder: "Bagaimana masalah terdeteksi" },
  { key: "howMuch", label: "How much", placeholder: "Berapa besar dampaknya" },
  {
    key: "shortTermSolution",
    label: "Short-term solution",
    placeholder: "Tindakan sementara yang dilakukan",
  },
];

function buildSummarySentence(summary: ProblemSummaryFields) {
  const parts: string[] = [];
  if (summary.when.trim()) parts.push(`Pada ${summary.when.trim()}`);
  if (summary.where.trim()) parts.push(`di ${summary.where.trim()}`);
  if (summary.what.trim()) parts.push(`terjadi ${summary.what.trim()}`);
  if (summary.who.trim()) parts.push(`melibatkan ${summary.who.trim()}`);
  if (summary.how.trim()) parts.push(`penyebab awal ${summary.how.trim()}`);
  if (summary.howMuch.trim()) parts.push(`dampak ${summary.howMuch.trim()}`);
  if (summary.shortTermSolution.trim())
    parts.push(`tindakan sementara ${summary.shortTermSolution.trim()}`);
  return parts.length
    ? `${parts.join(", ")}.`
    : "Ringkasan akan muncul setelah field diisi.";
}

export default function ProblemSummary({
  abnormal,
  canEdit,
  onChange,
}: ProblemSummaryProps) {
  function updateSummary(patch: Partial<ProblemSummaryFields>) {
    onChange({ ...abnormal, summary: { ...abnormal.summary, ...patch } });
  }

  const sentence = buildSummarySentence(abnormal.summary);

  return (
    <>
      <section className="dm-5w-card" aria-labelledby="dm-5w-metadata-title">
        <h2 className="dm-5w-card-title" id="dm-5w-metadata-title">
          Metadata abnormal
        </h2>
        <div className="dm-5w-summary-grid">
          <label className="dm-5w-field">
            <span className="dm-5w-label">Teruntuk (Line)</span>
            <input
              className="dm-5w-input"
              value={abnormal.line}
              onChange={(event) =>
                onChange({ ...abnormal, line: event.target.value })
              }
              disabled={!canEdit}
              aria-label="Teruntuk line"
            />
          </label>

          <label className="dm-5w-field">
            <span className="dm-5w-label">Pengusul</span>
            <input
              className="dm-5w-input"
              value={abnormal.pengusul}
              onChange={(event) =>
                onChange({ ...abnormal, pengusul: event.target.value })
              }
              disabled={!canEdit}
              aria-label="Pengusul"
            />
          </label>

          <label className="dm-5w-field">
            <span className="dm-5w-label">Jenis perbaikan abnormal</span>
            <input
              className="dm-5w-input"
              value={abnormal.jenis}
              onChange={(event) =>
                onChange({ ...abnormal, jenis: event.target.value })
              }
              disabled={!canEdit}
              aria-label="Jenis perbaikan abnormal"
            />
          </label>

          <label className="dm-5w-field">
            <span className="dm-5w-label">Sumber abnormal</span>
            <select
              className="dm-5w-select"
              value={abnormal.sumber}
              onChange={(event) =>
                onChange({ ...abnormal, sumber: event.target.value })
              }
              disabled={!canEdit}
              aria-label="Sumber abnormal"
            >
              <option value="">Pilih sumber abnormal</option>
              {ABNORMAL_SOURCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="dm-5w-field">
            <span className="dm-5w-label">Tingkat pengaruh</span>
            <select
              className="dm-5w-select"
              value={abnormal.tingkatPengaruh}
              onChange={(event) =>
                onChange({ ...abnormal, tingkatPengaruh: event.target.value })
              }
              disabled={!canEdit}
              aria-label="Tingkat pengaruh"
            >
              <option value="">Pilih tingkat pengaruh</option>
              {ABNORMAL_IMPACT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="dm-5w-field dm-5w-field-wide">
            <span className="dm-5w-label">Waktu</span>
            <div className="dm-5w-segment" role="group" aria-label="Waktu kejadian">
              {PROBLEM_TIMING_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`dm-5w-segment-btn ${
                    abnormal.waktu === option ? "is-active" : ""
                  }`}
                  aria-pressed={abnormal.waktu === option}
                  disabled={!canEdit}
                  onClick={() =>
                    onChange({ ...abnormal, waktu: option as ProblemTiming })
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="dm-5w-field dm-5w-field-wide">
            <span className="dm-5w-label">Karakteristik</span>
            <div className="dm-5w-segment" role="group" aria-label="Karakteristik masalah">
              {PROBLEM_CHARACTERISTIC_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`dm-5w-segment-btn ${
                    abnormal.karakteristik === option ? "is-active" : ""
                  }`}
                  aria-pressed={abnormal.karakteristik === option}
                  disabled={!canEdit}
                  onClick={() =>
                    onChange({
                      ...abnormal,
                      karakteristik: option as ProblemCharacteristic,
                    })
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="dm-5w-card" aria-labelledby="dm-5w-statement-title">
        <h2 className="dm-5w-card-title" id="dm-5w-statement-title">
          Pernyataan masalah (4W + 1H)
        </h2>
        <div className="dm-5w-statement-grid">
          {STATEMENT_FIELDS.map((field) => (
            <label className="dm-5w-field" key={field.key}>
              <span className="dm-5w-label">{field.label}</span>
              <input
                className="dm-5w-input"
                value={abnormal.summary[field.key]}
                placeholder={field.placeholder}
                onChange={(event) =>
                  updateSummary({ [field.key]: event.target.value })
                }
                disabled={!canEdit}
                aria-label={field.label}
              />
            </label>
          ))}
        </div>
        <div className="dm-5w-summary-preview">
          <span className="dm-5w-label">Ringkasan masalah (otomatis)</span>
          <p>{sentence}</p>
        </div>
      </section>
    </>
  );
}
