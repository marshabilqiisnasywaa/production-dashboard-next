"use client";

import { useUiText } from "@/locales/useUiText";
import { TARGET } from "../utils";

interface Props {
  submitted: number;
  total: number;
  rate: number;
  dayCount: number;
  roleCount: number;
  loading: boolean;
  error: string | null;
}

export function InspectionSummaryStrip({
  submitted,
  total,
  rate,
  dayCount,
  roleCount,
  loading,
  error,
}: Props) {
  const { text: uiText } = useUiText();
  const available = !error && total > 0;
  const gap = Math.abs(rate - TARGET);
  const targetDescription = rate === TARGET
    ? uiText("Sesuai target")
    : rate < TARGET
      ? uiText("Kurang {{v0}} poin", { v0: gap })
      : uiText("Lebih {{v0}} poin", { v0: gap });
  const items = [
    {
      label: "Pengisian",
      value: available ? `${uiText(submitted)} / ${uiText(total)}` : "–",
      detail: available
        ? uiText("{{v0}}% papercard terisi", { v0: rate })
        : uiText(error ? "Data tidak tersedia" : "Belum ada data"),
      skeletonWidth: "68%",
    },
    {
      label: "Target",
      value: `${TARGET}%`,
      detail: available ? targetDescription : "–",
      skeletonWidth: "54%",
    },
    {
      label: "Cakupan",
      value: `${uiText(dayCount)} ${uiText("hari")}`,
      detail: available ? uiText("{{v0}} role wajib mengisi", { v0: roleCount }) : "–",
      skeletonWidth: "42%",
    },
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
              <>
                {item.value}
                <span className="dml-inspection-summary__description">{item.detail}</span>
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
