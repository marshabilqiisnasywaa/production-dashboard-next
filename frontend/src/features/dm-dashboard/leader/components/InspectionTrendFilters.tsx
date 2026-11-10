"use client";

import { useUiText } from "@/locales/useUiText";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { InspectionDateRange, TrendGranularity } from "../types";
import { addDays, periodKey } from "../utils";

type Props = {
  range: InspectionDateRange;
  maxDate: string;
  navigationUnit: TrendGranularity;
  onNavigationUnitChange: (value: TrendGranularity) => void;
  onRangeChange: (range: InspectionDateRange) => void;
};

const OPTIONS: { value: TrendGranularity; label: string }[] = [
  { value: "day", label: "Hari" },
  { value: "week", label: "Minggu" },
  { value: "month", label: "Bulan" },
];

export function InspectionTrendFilters({ range, maxDate, navigationUnit, onNavigationUnitChange, onRangeChange }: Props) {
  const { text: uiText } = useUiText();

  function adjacentRange(direction: -1 | 1): InspectionDateRange {
    if (navigationUnit === "day") {
      return { from: addDays(range.from, direction), to: addDays(range.to, direction) };
    }
    if (navigationUnit === "week") {
      const from = addDays(periodKey(range.from, "week"), direction * 7);
      return { from, to: addDays(from, 6) };
    }

    const [year, month] = range.from.split("-").map(Number);
    const from = new Date(Date.UTC(year, month - 1 + direction, 1))
      .toISOString().slice(0, 10);
    const to = new Date(Date.UTC(year, month + direction, 0))
      .toISOString().slice(0, 10);
    return { from, to };
  }

  function navigate(direction: -1 | 1) {
    const next = adjacentRange(direction);
    if (next.from > maxDate || (navigationUnit === "day" && next.to > maxDate)) return;
    onRangeChange({ ...next, to: next.to > maxDate ? maxDate : next.to });
  }

  const previousLabel = navigationUnit === "day" ? "Hari sebelumnya" : navigationUnit === "week" ? "Minggu sebelumnya" : "Bulan sebelumnya";
  const nextLabel = navigationUnit === "day" ? "Hari berikutnya" : navigationUnit === "week" ? "Minggu berikutnya" : "Bulan berikutnya";
  const nextRange = adjacentRange(1);

  return (
    <div className="dml-inspection-period-nav" role="group" aria-label={uiText("Filter periode tren")}>
        <button className="dml-inspection-period-nav__arrow" type="button" onClick={() => navigate(-1)} aria-label={uiText(previousLabel)} title={uiText(previousLabel)}>
          <span aria-hidden="true">‹</span>
        </button>
        <SegmentedControl
          ariaLabel={uiText("Navigasi periode")}
          options={OPTIONS}
          value={navigationUnit}
          onChange={onNavigationUnitChange}
        />
        <button
          className="dml-inspection-period-nav__arrow"
          type="button"
          onClick={() => navigate(1)}
          disabled={nextRange.from > maxDate || (navigationUnit === "day" && nextRange.to > maxDate)}
          aria-label={uiText(nextLabel)}
          title={uiText(nextLabel)}
        >
          <span aria-hidden="true">›</span>
        </button>
    </div>
  );
}
