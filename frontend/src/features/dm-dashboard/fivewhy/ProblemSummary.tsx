"use client";
import { Fragment, useEffect, useRef } from "react";
import { IconCheck } from "@/components/ui/icons";
import {
  SUMBER_ABNORMAL_OPTIONS,
  TINGKAT_PENGARUH_OPTIONS,
  buildProblemSummary,
  joinDateTime,
  splitDateTime,
} from "./fiveWhyData";
import type {
  FiveWhyAbnormal,
  ProblemSummaryFields,
  SumberAbnormal,
  TingkatPengaruh,
} from "./fiveWhyData";

type ProblemSummaryProps = {
  abnormal: FiveWhyAbnormal;
  canEdit: boolean;
  focusTitleToken?: number;
  onChange: (next: FiveWhyAbnormal) => void;
};

type StatementFieldKey =
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
  { key: "where", label: "Where", placeholder: "Di mana kejadian terjadi" },
  { key: "who", label: "Who", placeholder: "Siapa yang terlibat" },
  { key: "what", label: "What", placeholder: "Apa masalah yang terjadi" },
  { key: "howMuch", label: "How much", placeholder: "Berapa besar dampaknya" },
  {
    key: "shortTermSolution",
    label: "Short-term solution",
    placeholder: "Tindakan sementara yang dilakukan",
  },
];

export default function ProblemSummary({
  abnormal,
  canEdit,
  focusTitleToken = 0,
  onChange,
}: ProblemSummaryProps) {
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!focusTitleToken) return;
    titleRef.current?.focus();
  }, [focusTitleToken]);

  function updateSummary(patch: Partial<ProblemSummaryFields>) {
    onChange({ ...abnormal, summary: { ...abnormal.summary, ...patch } });
  }

  function toggleSumber(value: SumberAbnormal) {
    const selected = abnormal.sumberAbnormal.includes(value);
    const sumberAbnormal = selected
      ? abnormal.sumberAbnormal.filter((item) => item !== value)
      : [...abnormal.sumberAbnormal, value];
    onChange({
      ...abnormal,
      sumberAbnormal,
      sumberLainnya:
        value === "lainnya" && selected ? "" : abnormal.sumberLainnya,
    });
  }

  function togglePengaruh(value: TingkatPengaruh) {
    const selected = abnormal.tingkatPengaruh.includes(value);
    const tingkatPengaruh = selected
      ? abnormal.tingkatPengaruh.filter((item) => item !== value)
      : [...abnormal.tingkatPengaruh, value];
    onChange({
      ...abnormal,
      tingkatPengaruh,
      pengaruhLainnya:
        value === "lainnya" && selected ? "" : abnormal.pengaruhLainnya,
    });
  }

  function renderSummary() {
    const parts = buildProblemSummary(abnormal.summary).split("(belum diisi)");
    return parts.map((part, index) => (
      <Fragment key={`summary-${index}`}>
        {part}
        {index < parts.length - 1 ? (
          <span className="dm-5w-summary-missing">(belum diisi)</span>
        ) : null}
      </Fragment>
    ));
  }

  const when = splitDateTime(abnormal.summary.when);

  return (
    <>
      <section className="dm-5w-card" aria-labelledby="dm-5w-metadata-title">
        <h2 className="dm-5w-card-title" id="dm-5w-metadata-title">
          Metadata abnormal
        </h2>

        <label className="dm-5w-field">
          <span className="dm-5w-label">
            Judul abnormal <span className="dm-5w-required">*</span>
          </span>
          <input
            ref={titleRef}
            className="dm-5w-input"
            value={abnormal.label}
            placeholder="Tulis ringkas masalahnya, misalnya: PC Upgrade fail"
            onChange={(event) =>
              onChange({ ...abnormal, label: event.target.value })
            }
            disabled={!canEdit}
            aria-label="Judul abnormal"
            aria-required="true"
          />
        </label>

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

          <label className="dm-5w-field dm-5w-field-wide">
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

          <div className="dm-5w-choice-grid dm-5w-field-wide">
            <div className="dm-5w-choice-group">
              <span className="dm-5w-label">Sumber abnormal</span>
              <div
                className="dm-5w-choice-row"
                role="group"
                aria-label="Sumber abnormal"
              >
                {SUMBER_ABNORMAL_OPTIONS.map((option) => {
                  const selected = abnormal.sumberAbnormal.includes(
                    option.value
                  );
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`dm-5w-choice ${selected ? "is-selected" : ""}`}
                      aria-pressed={selected}
                      disabled={!canEdit}
                      onClick={() => toggleSumber(option.value)}
                    >
                      <span className="dm-5w-choice-box" aria-hidden="true">
                        {selected ? <IconCheck size={9} /> : null}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {abnormal.sumberAbnormal.includes("lainnya") ? (
                <>
                  <input
                    className="dm-5w-input dm-5w-choice-input"
                    value={abnormal.sumberLainnya}
                    placeholder="Sebutkan"
                    onChange={(event) =>
                      onChange({
                        ...abnormal,
                        sumberLainnya: event.target.value,
                      })
                    }
                    disabled={!canEdit}
                    aria-label="Sumber abnormal lainnya"
                    aria-required="true"
                  />
                  {!abnormal.sumberLainnya.trim() ? (
                    <span className="dm-5w-field-error">Wajib diisi</span>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="dm-5w-choice-group">
              <span className="dm-5w-label">Tingkat pengaruh</span>
              <div
                className="dm-5w-choice-row"
                role="group"
                aria-label="Tingkat pengaruh"
              >
                {TINGKAT_PENGARUH_OPTIONS.map((option) => {
                  const selected = abnormal.tingkatPengaruh.includes(
                    option.value
                  );
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`dm-5w-choice ${selected ? "is-selected" : ""}`}
                      aria-pressed={selected}
                      disabled={!canEdit}
                      onClick={() => togglePengaruh(option.value)}
                    >
                      <span className="dm-5w-choice-box" aria-hidden="true">
                        {selected ? <IconCheck size={9} /> : null}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {abnormal.tingkatPengaruh.includes("lainnya") ? (
                <>
                  <input
                    className="dm-5w-input dm-5w-choice-input"
                    value={abnormal.pengaruhLainnya}
                    placeholder="Sebutkan"
                    onChange={(event) =>
                      onChange({
                        ...abnormal,
                        pengaruhLainnya: event.target.value,
                      })
                    }
                    disabled={!canEdit}
                    aria-label="Tingkat pengaruh lainnya"
                    aria-required="true"
                  />
                  {!abnormal.pengaruhLainnya.trim() ? (
                    <span className="dm-5w-field-error">Wajib diisi</span>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="dm-5w-card" aria-labelledby="dm-5w-statement-title">
        <h2 className="dm-5w-card-title" id="dm-5w-statement-title">
          Pernyataan masalah (4W + 1H)
        </h2>
        <div className="dm-5w-statement-grid">
          <div className="dm-5w-field">
            <span className="dm-5w-label">When</span>
            <div className="dm-5w-datetime">
              <input
                type="date"
                className="dm-5w-input"
                value={when.date}
                onChange={(event) =>
                  updateSummary({
                    when: joinDateTime(event.target.value, when.time),
                  })
                }
                disabled={!canEdit}
                aria-label="Tanggal kejadian"
              />
              <input
                type="time"
                className="dm-5w-input"
                value={when.time}
                onChange={(event) =>
                  updateSummary({
                    when: joinDateTime(when.date, event.target.value),
                  })
                }
                disabled={!canEdit}
                aria-label="Jam kejadian"
              />
            </div>
          </div>

          {STATEMENT_FIELDS.slice(0, 3).map((field) => (
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

          <label className="dm-5w-field dm-5w-field-wide">
            <span className="dm-5w-label">How</span>
            <textarea
              className="dm-5w-textarea"
              rows={2}
              value={abnormal.summary.how}
              placeholder="Kronologi singkat: bagaimana masalah ini terjadi"
              onChange={(event) => updateSummary({ how: event.target.value })}
              disabled={!canEdit}
              aria-label="How"
            />
          </label>

          <label className="dm-5w-field">
            <span className="dm-5w-label">How much</span>
            <input
              className="dm-5w-input"
              value={abnormal.summary.howMuch}
              placeholder="Berapa besar dampaknya"
              onChange={(event) =>
                updateSummary({ howMuch: event.target.value })
              }
              disabled={!canEdit}
              aria-label="How much"
            />
          </label>

          <label className="dm-5w-field">
            <span className="dm-5w-label">Downtime (menit)</span>
            <input
              type="number"
              min="0"
              step="1"
              className="dm-5w-input"
              value={abnormal.summary.downtime}
              placeholder="0"
              onChange={(event) =>
                updateSummary({ downtime: event.target.value })
              }
              disabled={!canEdit}
              aria-label="Downtime menit"
            />
          </label>

          <label className="dm-5w-field">
            <span className="dm-5w-label">Short-term solution</span>
            <input
              className="dm-5w-input"
              value={abnormal.summary.shortTermSolution}
              placeholder="Tindakan sementara yang dilakukan"
              onChange={(event) =>
                updateSummary({ shortTermSolution: event.target.value })
              }
              disabled={!canEdit}
              aria-label="Short-term solution"
            />
          </label>
        </div>
        <div className="dm-5w-summary-preview">
          <span className="dm-5w-label">Ringkasan masalah (otomatis)</span>
          <p>{renderSummary()}</p>
        </div>
      </section>
    </>
  );
}
