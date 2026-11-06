"use client";
import { useUiText } from "@/locales/useUiText";

import CustomSelect from "@/components/shell/CustomSelect";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  assemblyKpiDefinitions,
  assemblyKpiOrder,
  assemblyLeaderBar,
  assemblyOverviewKpis,
  assemblyOverviewTable,
  assemblyPerLeaderValues,
  assemblyPencapaianTarget,
  assemblySpvValues,
  type AssemblyKpiDefinition,
} from "@/data/assemblyData";

export type AssemblyPage =
  | "assembly-overview"
  | "assembly-oqc"
  | "assembly-violation"
  | "assembly-upph"
  | "assembly-ngp"
  | "assembly-woclose"
  | "assembly-wip"
  | "assembly-rework";

function getKpiStatus(actual: number, t1: number, t2: number, higherIsBetter: boolean) {
  if (higherIsBetter) {
    if (actual >= t2) return { label: "On Target", tone: "good" };
    if (actual >= t1) return { label: "Watch", tone: "watch" };
    return { label: "Off Target", tone: "bad" };
  }

  if (actual <= t2) return { label: "On Target", tone: "good" };
  if (actual <= t1) return { label: "Watch", tone: "watch" };
  return { label: "Off Target", tone: "bad" };
}

function PageHeader({
  eyebrow,
  title,
  subtitle,
  pic,
  showActions = true,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  pic: string;
  showActions?: boolean;
}) {
  const { text: uiText } = useUiText();
  return (
    <header className="qc-page-header">
      <div>
        <div className="qc-kicker">{uiText(eyebrow)}</div>
        <h1>{uiText(title)}</h1>
        <p>{uiText(subtitle)}</p>
      </div>
      {showActions && (
        <div className="qc-toolbar">
          <button className="qc-secondary-button" type="button">{uiText("30 Sep 2026")}</button>
          <button className="qc-primary-button" type="button">{uiText("Export")}</button>
        </div>
      )}
    </header>
  );
}

function Sparkline({ values, good }: { values: number[]; good: boolean }) {
  const { text: uiText } = useUiText();
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / Math.max(max - min, 1)) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="assembly-spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={uiText("sparkline")}>
      <polyline points={points} fill="none" stroke={good ? "var(--success)" : "var(--danger)"} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  target,
  unit,
  weight,
  score,
  higherIsBetter,
  spark,
  onClick,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  weight: number;
  score: number;
  higherIsBetter: boolean;
  spark: number[];
  onClick: () => void;
}) {
  const { text: uiText } = useUiText();
  const status = getKpiStatus(value, target * 0.9, target, higherIsBetter);
  const isGood = status.tone === "good";
  return (
    <button type="button" className="qc-kpi-card assembly-kpi-card" onClick={onClick}>
      <div className="assembly-kpi-head">
        <span>{uiText(label)}</span>
        <span className={`repair-status ${status.tone}`}>{uiText(status.label)}</span>
      </div>
      <strong>
        {value.toFixed(value < 10 && value % 1 !== 0 ? 2 : 1)}
        {unit ? <small>{uiText(unit)}</small> : null}
      </strong>
      <div className="assembly-kpi-meta">
        <span>{uiText("Target ")}{target}</span>
        <span>{uiText("Bobot ")}{weight}</span>
      </div>
      <div className="assembly-kpi-footer">
        <span>{uiText("Nilai ")}{score}</span>
        <div className="assembly-spark-wrap"><Sparkline values={spark} good={isGood} /></div>
      </div>
    </button>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { text: uiText } = useUiText();
  return (
    <article className="qc-card large-card assembly-chart-card">
      <div className="qc-card-header compact">
        <div>
          <h3>{uiText(title)}</h3>
          <p>{uiText(subtitle)}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

function getCellClass(value: number) {
  if (value <= 0) return "score-bad";
  if (value < 10) return "score-warn";
  return "score-good";
}

function AssemblyOverview() {
  const { text: uiText } = useUiText();
  const [selectedKpi, setSelectedKpi] = useState<AssemblyPage>("assembly-oqc");

  const leaderRows = useMemo(() => assemblyOverviewTable, []);

  return (
    <div className="qc-page-shell">
      <PageHeader eyebrow="ASSEMBLY" title={uiText("KPI Instalasi")} subtitle={uiText("Ringkasan KPI area Instalasi · September 2026")} pic="Ikhwan" />

      <div className="qc-kpi-grid assembly-kpi-grid">
        {assemblyOverviewKpis.map((item) => (
          <KpiCard
            key={item.id}
            label={uiText(item.label)}
            value={item.current}
            target={item.target}
            unit={item.unit}
            weight={item.weight}
            score={item.score}
            higherIsBetter={item.higherIsBetter}
            spark={item.spark}
            onClick={() => setSelectedKpi(item.id as AssemblyPage)}
          />
        ))}
      </div>

      <div className="qc-grid-2">
        <ChartCard title={uiText("Nilai KPI per Leader")} subtitle={uiText("Total nilai per leader vs target 85")}>
          <div className="assembly-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assemblyPerLeaderValues} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="leader" tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={54} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "rgba(27, 43, 35, 0.92)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontFamily: "Montserrat" }} />
                <Legend />
                <Line type="monotone" dataKey="target" name={uiText("Nilai 85")} stroke="var(--danger)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Bar dataKey="totalNilai" name={uiText("Total Nilai")} radius={[8, 8, 0, 0]} fill="var(--chart-1)">
                  {assemblyPerLeaderValues.map((entry, index) => (
                    <Cell key={entry.leader} fill={entry.totalNilai >= 85 ? "var(--success)" : entry.totalNilai >= 75 ? "var(--warning)" : "var(--danger)"} opacity={index === 0 ? 1 : 0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={uiText("Nilai KPI per Penanggung Jawab Area")} subtitle={uiText("Total nilai per SPV")}>
          <div className="assembly-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assemblySpvValues} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="spv" tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "rgba(27, 43, 35, 0.92)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontFamily: "Montserrat" }} />
                <Legend />
                <Line type="monotone" dataKey="target" name={uiText("Nilai 85")} stroke="var(--danger)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Bar dataKey="totalNilai" name={uiText("Total Nilai")} radius={[8, 8, 0, 0]} fill="var(--chart-2)">
                  {assemblySpvValues.map((entry, index) => (
                    <Cell key={entry.spv} fill={entry.totalNilai >= 85 ? "var(--success)" : entry.totalNilai >= 75 ? "var(--warning)" : "var(--danger)"} opacity={index === 0 ? 1 : 0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <article className="qc-card assembly-table-card">
        <div className="qc-card-header compact">
          <div>
            <h3>{uiText("Nilai KPI Leader")}</h3>
            <p>{uiText("Ringkasan skor berdasarkan leader dan KPI utama")}</p>
          </div>
        </div>
        <div className="assembly-table-wrap">
          <table className="assembly-table">
            <thead>
              <tr>
                <th>{uiText("Line")}</th>
                <th>{uiText("Leader")}</th>
                <th>{uiText("OQC")}</th>
                <th>{uiText("Violation")}</th>
                <th>{uiText("UPPH")}</th>
                <th>{uiText("NG Produksi")}</th>
                <th>{uiText("Wo Close")}</th>
                <th>{uiText("WIP")}</th>
                <th>{uiText("Rework")}</th>
                <th>{uiText("Big problem")}</th>
                <th>{uiText("Safety Battery")}</th>
                <th>{uiText("Total Nilai")}</th>
                <th>{uiText("Ranking")}</th>
              </tr>
            </thead>
            <tbody>
              {leaderRows.map((row) => (
                <tr key={row.leader}>
                  <td>{row.line}</td>
                  <td>{row.leader}</td>
                  {[row.oqc, row.violation, row.upph, row.ngProduksi, row.woClose, row.wip, row.rework, row.bigProblem, row.safetyBattery].map((cell, index) => (
                    <td key={`${row.leader}-${index}`} className={getCellClass(cell)}>{cell}</td>
                  ))}
                  <td className="score-good">{row.totalNilai}</td>
                  <td>{row.ranking}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {selectedKpi && (
        <AssemblyKpiPage
          page={selectedKpi}
          pageTitle={selectedKpi.replace("assembly-", "").toUpperCase()}
        />
      )}
    </div>
  );
}

function TrendLineChart({
  title,
  data,
  valueKey,
  target,
  targetLabel,
  actualLabel,
  unit = "%",
  leaderFilter,
  selectedLeader,
  onFilterChange,
}: {
  title: string;
  data: Array<{ date: string; value: number; leader?: string; [key: string]: unknown }>;
  valueKey: string;
  target: number;
  targetLabel: string;
  actualLabel: string;
  unit?: string;
  leaderFilter?: string[];
  selectedLeader?: string;
  onFilterChange?: (leader: string) => void;
}) {
  const { text: uiText } = useUiText();
  const [showLabels, setShowLabels] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const filtered = selectedLeader && selectedLeader !== "Semua" ? data.filter((row) => row.leader === selectedLeader) : data;

  return (
    <ChartCard title={uiText(title)} subtitle={uiText("Trend harian vs target")}>
      <div className="assembly-chart-toolbar">
        {leaderFilter && (
          <CustomSelect value={selectedLeader ?? "Semua"} options={[{ value: "Semua", label: "Semua" }, ...leaderFilter]} onChange={(next) => onFilterChange?.(next)} />
        )}
        <button type="button" className="chart-toggle" onClick={() => setShowLabels((value) => !value)}>
          {showLabels ? uiText("Sembunyikan label") : uiText("Tampilkan label")}
        </button>
        <button type="button" className="chart-toggle" onClick={() => setShowTable((value) => !value)}>
          {showTable ? uiText("Sembunyikan Tabel") : uiText("Tampilkan Tabel")}
        </button>
      </div>
      <div className="assembly-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered} margin={{ top: 12, right: 16, left: 8, bottom: 12 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "rgba(27, 43, 35, 0.92)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontFamily: "Montserrat" }} />
            <Legend />
            <Line type="monotone" dataKey="target" name={uiText(targetLabel)} stroke="var(--danger)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey={valueKey} name={uiText(actualLabel)} stroke="var(--success)" strokeWidth={2.5} dot={{ r: 2.5, fill: "var(--success)" }} activeDot={{ r: 5 }}>
              {showLabels && <Legend />}
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      {showTable && (
        <div className="assembly-table-wrap compact-table">
          <table className="assembly-table mini-table">
            <thead>
              <tr>
                <th>{uiText("Tanggal")}</th>
                <th>{uiText("Leader")}</th>
                <th>{uiText("Nilai")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={`${row.date}-${row.leader ?? "total"}`}>
                  <td>{row.date}</td>
                  <td>{row.leader ?? uiText("Area")}</td>
                  <td>{Number(row[valueKey]).toFixed(2)}{uiText(unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}

function GroupedBarChart({
  title,
  data,
  xKey,
  series,
}: {
  title: string;
  data: Array<{ [key: string]: string | number }>;
  xKey: string;
  series: Array<{ key: string; color: string; name: string }>;
}) {
  const { text: uiText } = useUiText();
  return (
    <ChartCard title={uiText(title)} subtitle={uiText("Per leader")}>
      <div className="assembly-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 12 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} interval={0} angle={-10} textAnchor="end" height={52} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "rgba(27, 43, 35, 0.92)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontFamily: "Montserrat" }} />
            <Legend />
            {series.map((item) => (
              <Bar key={item.key} dataKey={item.key} name={item.name} fill={item.color} radius={[6, 6, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function DonutChart({ title, data }: { title: string; data: Array<{ name: string; value: number; color: string }> }) {
  const { text: uiText } = useUiText();
  return (
    <ChartCard title={uiText(title)} subtitle={uiText("Detail pelanggaran")}>
      <div className="assembly-donut-shell">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 18 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "rgba(27, 43, 35, 0.92)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontFamily: "Montserrat" }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function getScoreFromActual(actual: number, t1: number, t2: number, higherIsBetter: boolean) {
  if (higherIsBetter) {
    if (actual >= t2) return 20;
    if (actual >= t1) return 10;
    return 0;
  }

  if (actual <= t2) return 20;
  if (actual <= t1) return 10;
  return 0;
}

function AssemblyKpiPage({ page, pageTitle }: { page: AssemblyPage; pageTitle: string }) {
  const { text: uiText } = useUiText();
  const kpi = assemblyKpiDefinitions[page];
  const [leaderFilter, setLeaderFilter] = useState("Semua");
  const filteredSeries = useMemo(() => {
    if (leaderFilter === "Semua") return kpi.daily;
    return kpi.daily.filter((item) => item.leader === leaderFilter);
  }, [kpi.daily, leaderFilter]);

  const score = getScoreFromActual(kpi.perLeader[0]?.value ?? 0, kpi.t1, kpi.t2, kpi.higherIsBetter);
  const status = getKpiStatus(kpi.perLeader[0]?.value ?? 0, kpi.t1, kpi.t2, kpi.higherIsBetter);

  if (!kpi) return null;

  const chartData = filteredSeries.map((row) => ({ ...row, target: kpi.t2, value: row.value ?? 0 }));

  return (
    <div className="qc-page-shell">
      <PageHeader eyebrow="ASSEMBLY" title={uiText(kpi.label)} subtitle={uiText("{{v0}} · September 2026", { v0: kpi.label })} pic="Ikhwan" />

      <div className="qc-kpi-grid assembly-kpi-grid detail-grid-cards">
        <article className="qc-kpi-card">
          <span className="kpi-label">{uiText("Aktual bulan ini")}</span>
          <strong>{(kpi.perLeader.reduce((sum, item) => sum + item.value, 0) / kpi.perLeader.length).toFixed(2)}</strong>
          <span className="kpi-unit">{uiText(kpi.unit)}</span>
        </article>
        <article className="qc-kpi-card">
          <span className="kpi-label">{uiText("Target T2")}</span>
          <strong>{kpi.t2.toFixed(2)}</strong>
          <span className="kpi-unit">{uiText(kpi.unit)}</span>
        </article>
        <article className="qc-kpi-card">
          <span className="kpi-label">{uiText("Skor / Bobot")}</span>
          <strong>{score}</strong>
          <span className="kpi-unit">/ {kpi.weight}</span>
        </article>
        <article className="qc-kpi-card">
          <span className="kpi-label">{uiText("Status")}</span>
          <strong className={`status-inline ${status.tone}`}>{uiText(status.label)}</strong>
          <span className="kpi-unit">{uiText(kpi.label)}</span>
        </article>
      </div>

      <div className="qc-grid-2">
        {page === "assembly-oqc" && (
          <>
            <TrendLineChart
              title={uiText("Tren NG Rate OQC Harian")}
              data={chartData}
              valueKey="value"
              target={kpi.t2}
              targetLabel="Target 0.60%"
              actualLabel="NG Rate"
              leaderFilter={assemblyKpiDefinitions[page].perLeader.map((row) => row.leader)}
              selectedLeader={leaderFilter}
              onFilterChange={setLeaderFilter}
            />
            <GroupedBarChart
              title={uiText("NG Rate OQC per Leader")}
              data={kpi.perLeader.map((row) => ({ leader: row.leader, value: row.value }))}
              xKey="leader"
              series={[{ key: "value", color: "var(--chart-1)", name: "NG Rate" }]}
            />
            <GroupedBarChart
              title={uiText("Batch Kirim vs Batch Tidak Lolos per Leader")}
              data={[
                { leader: "Edi Prasetyo", kirim: 690, tidakLolos: 9 },
                { leader: "Ahmad Riswanto", kirim: 691, tidakLolos: 6 },
                { leader: "M Wildan Firdaus", kirim: 390, tidakLolos: 7 },
                { leader: "Rudiyansyah", kirim: 714, tidakLolos: 3 },
                { leader: "Agus Riyadi", kirim: 263, tidakLolos: 2 },
              ]}
              xKey="leader"
              series={[
                { key: "kirim", color: "var(--chart-1)", name: "Batch kirim" },
                { key: "tidakLolos", color: "var(--chart-2)", name: "Batch tidak lolos" },
              ]}
            />
          </>
        )}

        {page === "assembly-violation" && (
          <>
            <TrendLineChart
              title={uiText("Tren Violation Rate Harian")}
              data={chartData}
              valueKey="value"
              target={kpi.t2}
              targetLabel="Target 0.05%"
              actualLabel="Violation Rate"
              leaderFilter={assemblyKpiDefinitions[page].perLeader.map((row) => row.leader)}
              selectedLeader={leaderFilter}
              onFilterChange={setLeaderFilter}
            />
            <GroupedBarChart
              title={uiText("Total Bobot vs Jumlah Pos per Leader")}
              data={[
                { leader: "Edi Prasetyo", totalBobot: 0, jumlahPos: 1059.5 },
                { leader: "Ahmad Riswanto", totalBobot: 0, jumlahPos: 930 },
                { leader: "M Wildan Firdaus", totalBobot: 0, jumlahPos: 694 },
              ]}
              xKey="leader"
              series={[
                { key: "totalBobot", color: "var(--chart-1)", name: "Total Bobot" },
                { key: "jumlahPos", color: "var(--chart-2)", name: "Jumlah Pos" },
              ]}
            />
            <DonutChart
              title={uiText("Violation per Kategori")}
              data={[
                { name: "Safety", value: 3, color: "var(--chart-1)" },
                { name: "Quality", value: 2, color: "var(--chart-2)" },
                { name: "Delivery", value: 1, color: "var(--chart-3)" },
              ]}
            />
          </>
        )}

        {page === "assembly-upph" && (
          <>
            <TrendLineChart
              title={uiText("Tren UPPH Harian (Total Area)")}
              data={chartData}
              valueKey="value"
              target={kpi.t2}
              targetLabel="Target 6"
              actualLabel="UPPH"
              leaderFilter={assemblyKpiDefinitions[page].perLeader.map((row) => row.leader)}
              selectedLeader={leaderFilter}
              onFilterChange={setLeaderFilter}
            />
            <GroupedBarChart
              title={uiText("Rata-rata UPPH per Leader")}
              data={kpi.perLeader.map((row) => ({ leader: row.leader, value: row.value }))}
              xKey="leader"
              series={[{ key: "value", color: "var(--chart-1)", name: "Rata-rata UPPH" }]}
            />
          </>
        )}

        {page === "assembly-ngp" && (
          <>
            <TrendLineChart
              title={uiText("Tren NGP Harian")}
              data={chartData}
              valueKey="value"
              target={kpi.t2}
              targetLabel="Target T2 29%"
              actualLabel="NGP"
              leaderFilter={assemblyKpiDefinitions[page].perLeader.map((row) => row.leader)}
              selectedLeader={leaderFilter}
              onFilterChange={setLeaderFilter}
            />
            <GroupedBarChart
              title={uiText("Output vs Biaya Retur per Leader")}
              data={[
                { leader: "Edi Prasetyo", output: 47565, cost: 17702 },
                { leader: "Ahmad Riswanto", output: 53745, cost: 10850 },
                { leader: "M Wildan Firdaus", output: 31612, cost: 5101 },
                { leader: "Rudiyansyah", output: 52791, cost: 4841 },
                { leader: "Agus Riyadi", output: 12991, cost: 2391 },
              ]}
              xKey="leader"
              series={[
                { key: "output", color: "var(--chart-1)", name: "Output" },
                { key: "cost", color: "var(--chart-2)", name: "Biaya Retur" },
              ]}
            />
          </>
        )}

        {page === "assembly-woclose" && (
          <>
            <TrendLineChart
              title={uiText("Tren Closed Rate Harian")}
              data={chartData}
              valueKey="value"
              target={100}
              targetLabel="Target 100%"
              actualLabel="Closed Rate"
              leaderFilter={assemblyKpiDefinitions[page].perLeader.map((row) => row.leader)}
              selectedLeader={leaderFilter}
              onFilterChange={setLeaderFilter}
            />
            <GroupedBarChart
              title={uiText("WO Open vs WO Closed per Leader")}
              data={[
                { leader: "Edi Prasetyo", open: 21, closed: 21 },
                { leader: "Ahmad Riswanto", open: 21, closed: 21 },
                { leader: "M Wildan Firdaus", open: 13, closed: 13 },
                { leader: "Rudiyansyah", open: 21, closed: 21 },
                { leader: "Agus Riyadi", open: 8, closed: 8 },
              ]}
              xKey="leader"
              series={[
                { key: "open", color: "var(--chart-1)", name: "WO Open" },
                { key: "closed", color: "var(--chart-2)", name: "WO Closed" },
              ]}
            />
          </>
        )}

        {page === "assembly-wip" && (
          <>
            <TrendLineChart
              title={uiText("Tren WIP Harian (Total Area)")}
              data={chartData}
              valueKey="value"
              target={kpi.t2}
              targetLabel="Target 900"
              actualLabel="WIP"
              leaderFilter={assemblyKpiDefinitions[page].perLeader.map((row) => row.leader)}
              selectedLeader={leaderFilter}
              onFilterChange={setLeaderFilter}
            />
            <GroupedBarChart
              title={uiText("Rata-rata WIP per Leader")}
              data={kpi.perLeader.map((row) => ({ leader: row.leader, value: row.value }))}
              xKey="leader"
              series={[{ key: "value", color: "var(--chart-1)", name: "Rata-rata WIP" }]}
            />
          </>
        )}

        {page === "assembly-rework" && (
          <>
            <TrendLineChart
              title={uiText("Tren Rework Rate Harian")}
              data={chartData}
              valueKey="value"
              target={kpi.t2}
              targetLabel="Target 0.5%"
              actualLabel="Rework Rate"
              leaderFilter={assemblyKpiDefinitions[page].perLeader.map((row) => row.leader)}
              selectedLeader={leaderFilter}
              onFilterChange={setLeaderFilter}
            />
            <GroupedBarChart
              title={uiText("Penahanan vs Output per Leader")}
              data={[
                { leader: "Edi Prasetyo", output: 47565, penahanan: 621 },
                { leader: "Ahmad Riswanto", output: 53745, penahanan: 0 },
                { leader: "M Wildan Firdaus", output: 31612, penahanan: 0 },
                { leader: "Rudiyansyah", output: 52791, penahanan: 0 },
                { leader: "Agus Riyadi", output: 12991, penahanan: 0 },
              ]}
              xKey="leader"
              series={[
                { key: "output", color: "var(--chart-1)", name: "Output" },
                { key: "penahanan", color: "var(--chart-2)", name: "Penahanan" },
              ]}
            />
          </>
        )}
      </div>

      <article className="qc-card assembly-table-card">
        <div className="qc-card-header compact">
          <div>
            <h3>{pageTitle}</h3>
            <p>{uiText("Ringkasan data detail")}</p>
          </div>
        </div>
        <div className="assembly-table-wrap">
          <table className="assembly-table">
            <thead>
              <tr>
                <th>{uiText("Leader")}</th>
                <th>{uiText("Line")}</th>
                <th>{uiText("Nilai")}</th>
                <th>{uiText("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {uiText(kpi.perLeader.map((row) => {
                const status = getKpiStatus(row.value, kpi.t1, kpi.t2, kpi.higherIsBetter);
                return (
                  <tr key={row.leader}>
                    <td>{row.leader}</td>
                    <td>{row.line}</td>
                    <td>{row.value.toFixed(2)}{uiText(kpi.unit)}</td>
                    <td><span className={`repair-status ${status.tone}`}>{uiText(status.label)}</span></td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

export default function AssemblyDashboard({ page }: { page: AssemblyPage }) {
  if (page === "assembly-overview") return <AssemblyOverview />;
  return <AssemblyKpiPage page={page} pageTitle={assemblyKpiOrder.includes(page as typeof assemblyKpiOrder[number]) ? page.replace("assembly-", "").toUpperCase() : "Assembly"} />;
}


