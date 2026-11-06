"use client";

import { useUiText } from "@/locales/useUiText";
import type { TrendGranularity } from "../types";

interface Props {
  recorded: number;
  periodCount: number;
  aboveTarget: number;
  averageRate: number | null;
  granularity: TrendGranularity;
  loading: boolean;
  error: string | null;
}

export function InspectionSummaryStrip({
  recorded,
  periodCount,
  aboveTarget,
  averageRate,
  granularity,
  loading,
  error,
}: Props) {
  const { text: uiText } = useUiText();
  const periodUnit =
    granularity === "day"
      ? "hari"
      : granularity === "week"
        ? "minggu"
        : "bulan";
  const recordedLabel =
    granularity === "day"
      ? "Hari tercatat"
      : granularity === "week"
        ? "Minggu tercatat"
        : "Bulan tercatat";
  const values = error
    ? ["–", "–", "–"]
    : [
        `${uiText(recorded)} ${uiText("dari")} ${uiText(periodCount)}`,
        `${uiText(aboveTarget)} ${uiText(periodUnit)}`,
        averageRate === null ? "–" : `${uiText(averageRate)}%`,
      ];

  const items = [
    { label: recordedLabel, value: values[0], skeletonWidth: "68%" },
    { label: "Di atas target", value: values[1], skeletonWidth: "54%" },
    { label: "Rata-rata periode", value: values[2], skeletonWidth: "42%" },
  ];

  return (
    <dl className="dml-inspection-summary" aria-label={uiText("Ringkasan tren")}>
      {items.map((item) => (
        <div className="dml-inspection-summary__item" key={item.label}>
          <dt>{uiText(item.label)}</dt>
          <dd>
            {loading ? (
              <span
                className="dml-inspection-summary__skeleton"
                style={{ width: item.skeletonWidth }}
                aria-hidden="true"
              />
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
