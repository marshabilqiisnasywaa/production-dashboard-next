"use client";

import { Fragment, useState } from "react";
import type { ReactNode } from "react";
import { useUiText } from "@/locales/useUiText";
import { IconClose } from "@/components/ui/icons";
import AuthImage from "./AuthImage";
import {
  FIVE_WHY_ANALYSIS_LABELS,
  PDCA_STAGE_BY_STATUS,
  RECURRENCE_LABELS,
  SOLUTION_STATUS_LABELS,
  SOLUTION_TYPE_LABELS,
  SUMBER_ABNORMAL_OPTIONS,
  TINGKAT_PENGARUH_OPTIONS,
  analysisStatusTone,
  buildProblemSummary,
  findRootCause,
  formatDateTimeLabel,
  isMajorProblem,
} from "./fiveWhyData";
import type {
  Evidence,
  FiveWhyRecord,
  Solution,
  WhyNode,
} from "./fiveWhyData";

type FiveWhyReportProps = {
  record: FiveWhyRecord;
  canEdit: boolean;
};

function evidenceTone(label: string) {
  const key = label.trim().toLowerCase();
  if (key === "ok" || key === "sesudah") return "is-ok";
  if (key === "ng") return "is-ng";
  if (key === "standar") return "is-standar";
  if (key === "aktual") return "is-aktual";
  return "is-other";
}

function isFilledWhy(node: WhyNode) {
  return Boolean(
    node.statement.trim() ||
      node.evidence.length > 0 ||
      node.branches.length > 0 ||
      node.verification === "root"
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="dm-5w-report-detail">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function PhotoStrip({
  photos,
  label,
  onOpen,
}: {
  photos: string[];
  label: string;
  onOpen: (photoId: string) => void;
}) {
  const { text: uiText } = useUiText();
  if (photos.length === 0) return null;
  return (
    <div className="dm-5w-evidence-photos dm-5w-report-photos">
      {photos.map((photo, index) => (
        <div className="dm-5w-evidence-thumb" key={`${photo}-${index}`}>
          <button
            type="button"
            className="dm-5w-evidence-thumb-open"
            onClick={() => onOpen(photo)}
            aria-label={uiText("Perbesar foto {{v0}} {{v1}}", {
              v0: label,
              v1: index + 1,
            })}
          >
            <AuthImage photoId={photo} />
          </button>
        </div>
      ))}
    </div>
  );
}

function EvidenceList({
  evidence,
  label,
  onOpen,
}: {
  evidence: Evidence[];
  label: string;
  onOpen: (photoId: string) => void;
}) {
  const { text: uiText } = useUiText();
  const filled = evidence.filter(
    (entry) => entry.text.trim() || entry.photos.length > 0
  );
  if (filled.length === 0) return null;
  return (
    <ul className="dm-5w-report-evidence">
      {filled.map((entry) => (
        <li key={entry.id}>
          <span className={`dm-5w-report-tag ${evidenceTone(entry.label)}`}>
            {uiText(entry.label.trim() || "Lainnya...")}
          </span>
          {entry.text.trim() ? (
            <p className="dm-5w-report-evidence-text">{entry.text}</p>
          ) : null}
          <PhotoStrip
            photos={entry.photos}
            label={`${label} ${entry.label}`}
            onOpen={onOpen}
          />
        </li>
      ))}
    </ul>
  );
}

function SolutionRow({
  solution,
  index,
  onOpen,
}: {
  solution: Solution;
  index: number;
  onOpen: (photoId: string) => void;
}) {
  const { text: uiText, locale } = useUiText();
  const stage = PDCA_STAGE_BY_STATUS[solution.status];
  const deadline = solution.deadline
    ? new Date(`${solution.deadline}T00:00:00`).toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
  return (
    <tr>
      <td data-label={uiText("No")}>{index + 1}</td>
      <td data-label={uiText("Solusi")} className="dm-5w-report-solution">
        {solution.text.trim() || "—"}
      </td>
      <td data-label={uiText("Tipe aksi")}>{uiText(SOLUTION_TYPE_LABELS[solution.type])}</td>
      <td data-label={uiText("PIC")}>{solution.pic.trim() || "—"}</td>
      <td data-label={uiText("Departemen")}>{solution.dept.trim() || "—"}</td>
      <td data-label={uiText("Deadline")}>{deadline}</td>
      <td data-label={uiText("Status")}>
        <span className={`dm-5w-pdca-badge is-${stage.toLowerCase()}`}>{stage}</span>
        <span className="dm-5w-report-status">
          {uiText(SOLUTION_STATUS_LABELS[solution.status])}
        </span>
      </td>
      <td data-label={uiText("Terulang kembali?")}>
        {uiText(RECURRENCE_LABELS[solution.recurred])}
      </td>
      <td data-label={uiText("Monitoring & Remark")} className="dm-5w-report-remark">
        {solution.remark.trim() ? <p>{solution.remark}</p> : null}
        {solution.photosBefore.length > 0 ? (
          <div className="dm-5w-report-photo-group">
            <span>{uiText("Before")}</span>
            <PhotoStrip
              photos={solution.photosBefore}
              label={`${uiText("Before")} ${index + 1}`}
              onOpen={onOpen}
            />
          </div>
        ) : null}
        {solution.photosAfter.length > 0 ? (
          <div className="dm-5w-report-photo-group">
            <span>{uiText("After")}</span>
            <PhotoStrip
              photos={solution.photosAfter}
              label={`${uiText("After")} ${index + 1}`}
              onOpen={onOpen}
            />
          </div>
        ) : null}
        {!solution.remark.trim() &&
        solution.photosBefore.length === 0 &&
        solution.photosAfter.length === 0
          ? "—"
          : null}
      </td>
    </tr>
  );
}

export default function FiveWhyReport({ record, canEdit }: FiveWhyReportProps) {
  const { text: uiText, locale } = useUiText();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const { abnormal } = record;
  const summary = abnormal.summary;
  const rootCause = findRootCause(record);
  const major = isMajorProblem(record);
  const whys = [...record.whys]
    .sort((a, b) => a.level - b.level)
    .filter(isFilledWhy);
  const emptyHint = canEdit ? " Pilih Edit untuk mengisinya." : "";

  const sumber = abnormal.sumberAbnormal.map((value) => {
    const label = SUMBER_ABNORMAL_OPTIONS.find((item) => item.value === value)?.label ?? value;
    return value === "lainnya" && abnormal.sumberLainnya.trim()
      ? `${uiText(label)}: ${abnormal.sumberLainnya.trim()}`
      : uiText(label);
  });
  const pengaruh = abnormal.tingkatPengaruh.map((value) => {
    const label = TINGKAT_PENGARUH_OPTIONS.find((item) => item.value === value)?.label ?? value;
    return value === "lainnya" && abnormal.pengaruhLainnya.trim()
      ? `${uiText(label)}: ${abnormal.pengaruhLainnya.trim()}`
      : uiText(label);
  });

  const summaryParts = buildProblemSummary(summary, locale).split("(belum diisi)");
  const when = summary.when.trim() ? formatDateTimeLabel(summary.when, locale) : "";
  const stamp = (value: string) =>
    new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });

  const problemFields = [
    { label: "When", value: when },
    { label: "Where", value: summary.where.trim() },
    { label: "What", value: summary.what.trim() },
    { label: "Who", value: summary.who.trim() },
    { label: "How much", value: summary.howMuch.trim() },
    { label: "Downtime (menit)", value: summary.downtime.trim() },
    { label: "How", value: summary.how.trim() },
    { label: "Short-term solution", value: summary.shortTermSolution.trim() },
  ];

  function questionFor(node: WhyNode) {
    if (node.level === 1) {
      return `Kenapa ${abnormal.label.trim() || "masalah ini"}?`;
    }
    const previous = record.whys.find((item) => item.level === node.level - 1);
    return `Kenapa ${previous?.statement.trim() || "hal ini"}?`;
  }

  return (
    <div className="dm-5w-report">
      <section className="dm-5w-card dm-5w-report-head" aria-labelledby="dm-5w-report-title">
        <div className="dm-5w-report-head-top">
          <span className="dm-5w-chip is-neutral">{record.nomor}</span>
          <span className={`dm-5w-chip ${analysisStatusTone(record.analysisStatus)}`}>
            {uiText(FIVE_WHY_ANALYSIS_LABELS[record.analysisStatus])}
          </span>
          {major ? (
            <span className="dm-5w-chip is-danger">{uiText("Major problem")}</span>
          ) : null}
        </div>
        <h2 className="dm-5w-report-title" id="dm-5w-report-title">
          {abnormal.label.trim() || uiText("Tanpa judul")}
        </h2>
        <dl className="dm-5w-report-details">
          {abnormal.line.trim() ? (
            <Detail label={uiText("Teruntuk (Line)")}>{abnormal.line.trim()}</Detail>
          ) : null}
          {abnormal.pengusul.trim() ? (
            <Detail label={uiText("Pengusul")}>{abnormal.pengusul.trim()}</Detail>
          ) : null}
          {sumber.length ? (
            <Detail label={uiText("Sumber abnormal")}>{sumber.join(", ")}</Detail>
          ) : null}
          {pengaruh.length ? (
            <Detail label={uiText("Tingkat pengaruh")}>{pengaruh.join(", ")}</Detail>
          ) : null}
        </dl>
        <p className="dm-5w-report-stamp">
          {uiText("Dibuat")} {stamp(record.createdAt)} · {uiText("Diperbarui")}{" "}
          {stamp(record.updatedAt)}
        </p>
      </section>

      <section className="dm-5w-card dm-5w-report-section" aria-labelledby="dm-5w-report-problem">
        <h2 className="dm-5w-card-title" id="dm-5w-report-problem">
          {uiText("Pernyataan masalah")}
        </h2>
        <p className="dm-5w-report-summary">
          {summaryParts.map((part, index) => (
            <Fragment key={`summary-${index}`}>
              {part}
              {index < summaryParts.length - 1 ? (
                <span className="dm-5w-summary-missing">{uiText("(belum diisi)")}</span>
              ) : null}
            </Fragment>
          ))}
        </p>
        {problemFields.some((field) => field.value) ? (
          <dl className="dm-5w-report-details">
            {problemFields
              .filter((field) => field.value)
              .map((field) => (
                <Detail key={field.label} label={uiText(field.label)}>
                  {field.value}
                </Detail>
              ))}
          </dl>
        ) : null}
        {canEdit && problemFields.some((field) => !field.value) ? (
          <p className="dm-5w-report-empty">
            {uiText("Belum diisi:")}{" "}
            {problemFields
              .filter((field) => !field.value)
              .map((field) => uiText(field.label))
              .join(", ")}
            . {uiText("Pilih Edit untuk mengisinya.")}
          </p>
        ) : null}
      </section>

      <section className="dm-5w-card dm-5w-report-section" aria-labelledby="dm-5w-report-whys">
        <h2 className="dm-5w-card-title" id="dm-5w-report-whys">
          {uiText("Analisis 5Why")}
        </h2>
        {whys.length === 0 ? (
          <p className="dm-5w-report-empty">
            {uiText(`Belum ada Why yang diisi.${emptyHint}`)}
          </p>
        ) : (
          <ol className="dm-5w-report-whys">
            {whys.map((node) => {
              const isRoot = node.verification === "root";
              const hypotheses = node.branches.filter(
                (branch) =>
                  branch.statement.trim() ||
                  branch.evidence.some((entry) => entry.text.trim() || entry.photos.length > 0)
              );
              return (
                <li
                  key={node.id}
                  className={`dm-5w-report-why ${isRoot ? "is-root" : ""}`}
                >
                  <span className="dm-5w-report-why-badge">
                    {uiText("Why ")}{node.level}
                  </span>
                  <div className="dm-5w-report-why-body">
                    <p className="dm-5w-report-question">{questionFor(node)}</p>
                    <p className="dm-5w-report-statement">
                      {node.statement.trim() || uiText("Pernyataan Why belum diisi.")}
                      {isRoot ? (
                        <span className="dm-5w-report-root-tag">{uiText("Root Cause")}</span>
                      ) : null}
                    </p>
                    <EvidenceList
                      evidence={node.evidence}
                      label={`Why ${node.level}`}
                      onOpen={setPreviewId}
                    />
                    {hypotheses.length > 0 ? (
                      <div className="dm-5w-report-hypotheses">
                        <p className="dm-5w-report-hypotheses-title">
                          {uiText("Dugaan lain yang sudah dicek dan ditolak")}
                        </p>
                        <ul>
                          {hypotheses.map((branch) => (
                            <li key={branch.id}>
                              <p className="dm-5w-report-hypothesis">
                                {branch.statement.trim() || uiText("Dugaan belum ditulis.")}
                              </p>
                              <EvidenceList
                                evidence={branch.evidence}
                                label={`Why ${node.level}`}
                                onOpen={setPreviewId}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="dm-5w-card dm-5w-report-section" aria-labelledby="dm-5w-report-pdca">
        <h2 className="dm-5w-card-title" id="dm-5w-report-pdca">
          {uiText("Solusi & Pencegahan Terulang")}
        </h2>
        {rootCause ? (
          <p className="dm-5w-report-root">
            <span>{uiText("Root Cause")} · {uiText("Why ")}{rootCause.level}</span>
            {rootCause.statement.trim() || uiText("Pernyataan Why belum diisi.")}
          </p>
        ) : (
          <p className="dm-5w-report-empty">
            {uiText(`Root Cause belum ditandai.${emptyHint}`)}
          </p>
        )}
        {record.solutions.length === 0 ? (
          <p className="dm-5w-report-empty">
            {uiText(`Belum ada solusi.${emptyHint}`)}
          </p>
        ) : (
          <div className="dm-5w-report-table-wrap">
            <table className="dm-5w-report-table">
              <caption className="dm-5w-sr-only">{uiText("Siklus PDCA")}</caption>
              <thead>
                <tr>
                  <th scope="col">{uiText("No")}</th>
                  <th scope="col">{uiText("Solusi")}</th>
                  <th scope="col">{uiText("Tipe aksi")}</th>
                  <th scope="col">{uiText("PIC")}</th>
                  <th scope="col">{uiText("Departemen")}</th>
                  <th scope="col">{uiText("Deadline")}</th>
                  <th scope="col">{uiText("Status")}</th>
                  <th scope="col">{uiText("Terulang kembali?")}</th>
                  <th scope="col">{uiText("Monitoring & Remark")}</th>
                </tr>
              </thead>
              <tbody>
                {record.solutions.map((solution, index) => (
                  <SolutionRow
                    key={solution.id}
                    solution={solution}
                    index={index}
                    onOpen={setPreviewId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {previewId ? (
        <div
          className="dm-5w-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={uiText("Foto bukti")}
          onClick={() => setPreviewId(null)}
        >
          <button
            type="button"
            className="dm-5w-lightbox-close"
            onClick={() => setPreviewId(null)}
            aria-label={uiText("Tutup foto")}
          >
            <IconClose size={16} />
          </button>
          <AuthImage
            photoId={previewId}
            alt={uiText("Foto bukti diperbesar")}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
