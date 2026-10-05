"use client";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  packingCategoryDonut,
  packingCategoryOptions,
  packingCategoryRateCards,
  packingDetailBar,
  packingModelTabs,
  packingOutputRows,
  packingStandardMap,
  packingTableRows,
  packingTimeOptions,
  type PackingRow,
} from "@/data/packingData";

const summary = {
  ngRate: "4.05%",
  ngTotal: 378,
  outputTotal: 9938,
  warehouseKemarin: 3388,
  expectedInbound: 3388,
  k5450: 9962,
};

const productionByLine = [
  { line: "PKC20603", K6070: 3380, K6081: 3362, K6100: 3366, K6200: 3365, K5440: 3381, K5450: 3368 },
  { line: "PKC20606", K6070: 3261, K6081: 3188, K6100: 3175, K6200: 3152, K5440: 3163, K5450: 3198 },
  { line: "PKC20607", K6070: 3479, K6081: 3454, K6100: 3424, K6200: 3406, K5440: 3424, K5450: 3396 },
  { line: "PKC20604", K6100: 34, K6200: 14 },
  { line: "TAC20607", A7600: 3361 },
  { line: "TAC20603", A7600: 3334 },
  { line: "TAC20606", A7600: 3190 },
] as const;

const donutPalette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--accent-lime)", "var(--accent-slate)"];

function PageHeader({
  title,
  eyebrow,
  description,
  timeFilter,
  onTimeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
}: {
  title: string;
  eyebrow: string;
  description: string;
  timeFilter: string;
  onTimeFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
}) {
  return (
    <header className="qc-page-header packing-page-header">
      <div>
        <div className="qc-kicker">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="packing-toolbar">
        <label className="packing-filter-field">
          <span>Time</span>
          <select value={timeFilter} onChange={(event) => onTimeFilterChange(event.target.value)}>
            {packingTimeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="packing-filter-field">
          <span>Category</span>
          <select value={categoryFilter} onChange={(event) => onCategoryFilterChange(event.target.value)}>
            {packingCategoryOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}

function KpiCard({
  label,
  value,
  detail,
  status,
  accent,
  onClick,
}: {
  label: string;
  value: string | number;
  detail: string;
  status?: string;
  accent?: "green" | "neutral";
  onClick?: () => void;
}) {
  const toneClass = accent === "green" ? "repair-status good" : "repair-status";
  return (
    <button type="button" className="qc-kpi-card packing-kpi-card" onClick={onClick}>
      <div className="packing-kpi-head">
        <span className="kpi-label">{label}</span>
        {status ? <span className={toneClass}>{status}</span> : null}
      </div>
      <strong>{value}</strong>
      <div className="kpi-unit">{detail}</div>
    </button>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <article className="qc-card packing-chart-card">
      <div className="qc-card-header compact">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

function matchesTime(date: string, filter: string) {
  if (filter === "Yesterday") return date === "2026-09-30";
  if (filter === "Today") return date === "2026-10-01";
  if (filter === "Last 7 Days") return date >= "2026-09-25" && date <= "2026-10-01";
  if (filter === "This Month") return date.startsWith("2026-09");
  return true;
}

function formatMetric(value: number) {
  return Number(value).toLocaleString("en-US");
}

export default function PackingDashboard() {
  const [timeFilter, setTimeFilter] = useState("Yesterday");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedModel, setSelectedModel] = useState<(typeof packingModelTabs)[number]>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof PackingRow>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const filteredRows = useMemo(() => {
    return packingTableRows.filter((row) => {
      const timeOk = matchesTime(row.date, timeFilter);
      const categoryOk = categoryFilter === "All" || row.category === categoryFilter;
      const modelOk = selectedModel === "ALL" || row.model === selectedModel;
      return timeOk && categoryOk && modelOk;
    });
  }, [categoryFilter, selectedModel, timeFilter]);

  const processedRows = useMemo(() => {
    const rows = [...filteredRows];
    rows.sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (typeof left === "number" && typeof right === "number") {
        return sortDirection === "asc" ? left - right : right - left;
      }
      return sortDirection === "asc"
        ? String(left).localeCompare(String(right))
        : String(right).localeCompare(String(left));
    });
    return rows;
  }, [filteredRows, sortDirection, sortKey]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const paginatedRows = processedRows.slice((page - 1) * pageSize, page * pageSize);

  const searchedRows = useMemo(() => {
    const text = searchTerm.trim().toLowerCase();
    if (!text) return paginatedRows;
    return paginatedRows.filter((row) =>
      [row.date, row.line, row.model, row.category, row.ngDetail, row.subProcess, String(row.quantity)]
        .join(" ")
        .toLowerCase()
        .includes(text),
    );
  }, [paginatedRows, searchTerm]);

  const productionChartData = useMemo(() => {
    if (selectedModel === "ALL") {
      return productionByLine.map((row) => ({ ...row }));
    }

    return productionByLine.map((row) => {
      const value = Number(row[selectedModel as keyof typeof row] ?? 0);
      return { line: row.line, [selectedModel]: value ?? 0 };
    });
  }, [selectedModel]);

  const categoryCards = useMemo(() => {
    const base = packingCategoryRateCards.map((item) => ({ ...item }));
    if (selectedModel === "ALL") return base;
    const multiplier = selectedModel === "K5450" ? 1.12 : selectedModel === "A7600" ? 0.78 : 0.92;
    return base.map((item) => ({
      ...item,
      value: Number((item.value * multiplier).toFixed(2)),
      exceedsStandard: Number((item.value * multiplier).toFixed(2)) > item.standard,
    }));
  }, [selectedModel]);

  const donutData = useMemo(() => {
    if (selectedModel === "ALL") return packingCategoryDonut.map((item, index) => ({ ...item, fill: donutPalette[index % donutPalette.length] }));
    const scale = selectedModel === "K5450" ? 1.12 : selectedModel === "A7600" ? 0.6 : 0.82;
    return packingCategoryDonut.map((item, index) => ({
      ...item,
      value: Math.max(0, Math.round(item.value * scale)),
      fill: donutPalette[index % donutPalette.length],
    }));
  }, [selectedModel]);

  const detailBarData = useMemo(() => {
    if (selectedModel === "ALL") return [...packingDetailBar].sort((a, b) => b.value - a.value);
    const scale = selectedModel === "K5450" ? 1.12 : selectedModel === "A7600" ? 0.76 : 0.9;
    return [...packingDetailBar].map((item) => ({ ...item, value: Math.max(1, Math.round(item.value * scale)) })).sort((a, b) => b.value - a.value);
  }, [selectedModel]);

  const totalQuantity = searchedRows.reduce((sum, row) => sum + row.quantity, 0);
  const activeFilterRangeLabel = selectedModel === "ALL" ? "All Models" : selectedModel;

  const sortBy = (key: keyof PackingRow) => {
    if (sortKey === key) {
      setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  };

  return (
    <div className="packing-page">
      <PageHeader
        title="Packing Area Monitoring"
        eyebrow="PACKING"
        description="Track output, NG rate, and defect concentration across packing lines."
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
      />

      <div className="packing-kpi-grid">
        <KpiCard label="NG Rate" value={summary.ngRate} detail="Overall NG %" status={Number(summary.ngRate.replace("%", "")) > 5 ? "Off Target" : "On Target"} accent={Number(summary.ngRate.replace("%", "")) > 5 ? "neutral" : "green"} />
        <KpiCard label="NG Total" value={formatMetric(summary.ngTotal)} detail="Total NG cases" />
        <KpiCard label="Output Total" value={formatMetric(summary.outputTotal)} detail="Packed output" />
        <KpiCard label="Warehouse Kemarin (210100)" value={formatMetric(summary.warehouseKemarin)} detail="Expected inbound volume 3,388" />
        <KpiCard label="K5450" value={formatMetric(summary.k5450)} detail="Model output" />
      </div>

      <div className="packing-model-tabs" aria-label="Model filter tabs">
        {packingModelTabs.map((model) => (
          <button
            key={model}
            type="button"
            className={selectedModel === model ? "active" : ""}
            onClick={() => {
              setSelectedModel(model);
              setPage(1);
            }}
          >
            {model}
          </button>
        ))}
      </div>

      <div className="packing-main-grid">
        <ChartCard title="Actual Production by Line" subtitle="Model comparison by line">
          <div className="packing-vertical-chart-wrap">
            <ResponsiveContainer width="100%" height={470}>
              <BarChart
                data={productionChartData}
                layout="vertical"
                margin={{ top: 8, right: 18, left: 12, bottom: 8 }}
              >
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 3500]}
                  tickFormatter={(value) => `${Math.round(value / 1000)}K`}
                  tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="line"
                  type="category"
                  width={88}
                  tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(4,106,57,0.04)" }}
                  formatter={(value: number) => [formatMetric(Number(value)), "Actual production"]}
                  contentStyle={{
                    background: "rgba(27, 43, 35, 0.92)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    color: "#fff",
                    boxShadow: "0 18px 36px rgba(0,0,0,0.22)",
                    fontFamily: "Montserrat",
                    fontSize: 12,
                  }}
                />
                <ReferenceLine x={420} stroke="var(--danger)" strokeDasharray="6 6" label={{ value: "Target: 420", position: "insideTopRight", fill: "var(--danger)", fontSize: 12, fontWeight: 600 }} />
                {selectedModel === "ALL" ? (
                  <>
                    {productionByLine[0] && Object.keys(productionByLine[0]).filter((key) => key !== "line").map((key, index) => (
                      <Bar key={key} dataKey={key} name={key} radius={[0, 8, 8, 0]} fill={index % 2 === 0 ? "var(--chart-1)" : "var(--chart-2)"} isAnimationActive={false}>
                        {productionChartData.map((entry, barIndex) => {
                          const value = Number(entry[key as keyof typeof entry] ?? 0);
                          return <Cell key={`${key}-${barIndex}`} fill={value >= 420 ? "var(--primary)" : "var(--danger)"} />;
                        })}
                        <LabelList dataKey={key} position="right" formatter={(value: number) => formatMetric(Number(value))} style={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} />
                      </Bar>
                    ))}
                  </>
                ) : (
                  <Bar dataKey={selectedModel} name={selectedModel} radius={[0, 8, 8, 0]} fill="var(--primary)" isAnimationActive={false}>
                    {productionChartData.map((entry, index) => {
                      const value = Number(entry[selectedModel as keyof typeof entry] ?? 0);
                      return <Cell key={`${selectedModel}-${index}`} fill={value >= 420 ? "var(--primary)" : "var(--danger)"} />;
                    })}
                    <LabelList dataKey={selectedModel} position="right" formatter={(value: number) => formatMetric(Number(value))} style={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }} />
                  </Bar>
                )}
                <Legend wrapperStyle={{ paddingTop: 16, fontFamily: "Montserrat", fontSize: 11, color: "var(--muted)" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <div className="packing-side-stack">
          <div className="packing-side-top">
            <div className="packing-category-grid">
              {categoryCards.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className={`packing-category-card ${categoryFilter === item.name ? "selected" : ""}`}
                  onClick={() => setCategoryFilter(item.name)}
                >
                  <span>{item.name}</span>
                  <strong style={{ color: item.exceedsStandard ? "var(--danger)" : "var(--text)" }}>{item.value.toFixed(2)}%</strong>
                  <small>Standard: {item.standard.toFixed(2)}%</small>
                </button>
              ))}
            </div>

            <ChartCard title="NG Category Quantity" subtitle="Quantity by category">
              <div className="packing-donut-chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={2} stroke="var(--card)" strokeWidth={2}>
                      {donutData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={entry.fill as string} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatMetric(Number(value)), "NG quantity"]}
                      contentStyle={{
                        background: "rgba(27, 43, 35, 0.92)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10,
                        color: "#fff",
                        boxShadow: "0 18px 36px rgba(0,0,0,0.22)",
                        fontFamily: "Montserrat",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="packing-donut-center">
                  <strong>{formatMetric(donutData.reduce((sum, item) => sum + item.value, 0))}</strong>
                  <span>Total NG</span>
                </div>
              </div>
              <div className="packing-chart-legend">
                {donutData.map((item) => (
                  <div key={item.name} className="packing-legend-item">
                    <i style={{ background: item.fill as string }} />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <ChartCard title="NG Detail by Category (Kemarin)" subtitle="Top defect groups by quantity">
            <div className="packing-detail-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={detailBarData} margin={{ top: 16, right: 16, left: 6, bottom: 50 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Montserrat" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }}
                    axisLine={false}
                    tickLine={false}
                    ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80]}
                    label={{ value: "[Sum] Quantity", angle: -90, position: "insideLeft", fill: "var(--muted)", style: { fontSize: 11, fontFamily: "Montserrat" } }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatMetric(Number(value)), "Quantity"]}
                    contentStyle={{
                      background: "rgba(27, 43, 35, 0.92)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      color: "#fff",
                      boxShadow: "0 18px 36px rgba(0,0,0,0.22)",
                      fontFamily: "Montserrat",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--primary)" isAnimationActive={false}>
                    {detailBarData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={index % 2 === 0 ? "var(--primary)" : "var(--primary-dark)"} />
                    ))}
                    <LabelList dataKey="value" position="top" formatter={(value: number) => formatMetric(Number(value))} style={{ fill: "var(--text)", fontSize: 10, fontWeight: 700, fontFamily: "Montserrat" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </div>

      <article className="qc-card packing-table-card">
        <div className="packing-table-header">
          <div>
            <h3>Table Detail</h3>
            <p>Filter by model, time, and category.</p>
          </div>
          <div className="packing-table-actions">
            <div className="packing-search-box">
              <span>Search</span>
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search defect..." />
            </div>
            <button type="button" className="qc-primary-button">Export</button>
          </div>
        </div>

        <div className="packing-table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  ["date", "Date"],
                  ["line", "Line"],
                  ["model", "Model"],
                  ["category", "Category"],
                  ["ngDetail", "NG Detail"],
                  ["subProcess", "Sub Process"],
                  ["quantity", "Quantity"],
                ].map(([key, label]) => (
                  <th key={label}>
                    <button type="button" onClick={() => sortBy(key as keyof PackingRow)}>{label}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {searchedRows.length ? (
                searchedRows.map((row, index) => (
                  <tr key={`${row.date}-${row.line}-${row.model}-${row.ngDetail}-${index}`}>
                    <td>{row.date}</td>
                    <td>{row.line}</td>
                    <td>{row.model}</td>
                    <td><span className="packing-pill">{row.category}</span></td>
                    <td>{row.ngDetail}</td>
                    <td>{row.subProcess}</td>
                    <td>{row.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="packing-empty-state">No abnormals match the selected filters.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6}>Total Quantity</td>
                <td>{totalQuantity}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="packing-table-pagination">
          <span>{activeFilterRangeLabel}</span>
          <div>
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>Previous</button>
            <strong>{page}</strong>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>Next</button>
          </div>
        </div>
      </article>
    </div>
  );
}

