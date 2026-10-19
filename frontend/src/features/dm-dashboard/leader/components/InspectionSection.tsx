"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { IconClose } from "@/components/ui/icons";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { InspectionRow, TrendGranularity } from "../types";
import { buildTrend, periodKey, periodLabel } from "../utils";
import { LEADER_LINE } from "../mockData";
import { InspectionDetailTable } from "./InspectionDetailTable";
import { InspectionTrendChart } from "./InspectionTrendChart";

const GRANULARITY_OPTIONS: { value: TrendGranularity; label: string }[] = [
  { value: "day", label: "Hari" },
  { value: "week", label: "Minggu" },
  { value: "month", label: "Bulan" },
];

/** Chart + table card. Clicking a chart point filters the table to that period. */
export function InspectionSection({ rows }: { rows: InspectionRow[] }) {
  const [granularity, setGranularity] = useState<TrendGranularity>("day");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const trend = useMemo(() => buildTrend(rows, granularity), [rows, granularity]);

  // if the date range changes and the selected period no longer exists, ignore it
  const activeKey = selectedKey && trend.some((p) => p.key === selectedKey) ? selectedKey : null;

  const tableRows = useMemo(
    () => (activeKey ? rows.filter((r) => periodKey(r.date, granularity) === activeKey) : rows),
    [rows, activeKey, granularity],
  );

  return (
    <Card
      flush
      title="Inspection Rate"
      actions={
        <SegmentedControl
          ariaLabel="Satuan waktu grafik"
          options={GRANULARITY_OPTIONS}
          value={granularity}
          onChange={(g) => {
            setGranularity(g);
            setSelectedKey(null);
          }}
        />
      }
    >
      <div className="dml-section__chart">
        {activeKey && (
          <button type="button" className="dml-filter-pill" onClick={() => setSelectedKey(null)}>
            Periode: {periodLabel(activeKey, granularity)} <IconClose size={14} />
          </button>
        )}
        <InspectionTrendChart data={trend} selectedKey={activeKey} onSelect={setSelectedKey} />
      </div>
      <InspectionDetailTable key={`${granularity}-${activeKey ?? "all"}`} rows={tableRows} />
    </Card>
  );
}
