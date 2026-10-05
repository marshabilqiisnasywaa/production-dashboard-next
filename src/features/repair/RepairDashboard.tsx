"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  Download,
  Filter,
  PencilLine,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RepairPage = "Preassembly" | "Rework" | "Warranty" | "Abnormal";
type Direction = "lower" | "higher";

const periods = ["2025", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "W36", "W37", "W38", "W39", "28/9", "29/9", "30/9", "1/10", "2/10"];
const wipActual = [14479, 12995, 11492, 6710, 4010, 3681, 3340, 3416, 3380, 3529, 3359, 2886, 2756, 2336, 2456, null, null, null];
const wipTargets = [6000, 5600, 5600, 5600, 3550, 3550, 3550, 3550, 2800, 2800, 2800, 2800, 2800, 2800, 2800, 2800, 2800, 2800];
const inputRate = [1.29, 1.46, 1.39, 1.82, 1.99, 1.02, .98, .94, .69, .92, 1.03, 1.05, .72, .52, .8, 1.5, 1.43, 1];
const preassemblyRate = [97.5, 96.3, 96.8, 98.8, 98.8, 99.5, 99.7, 99.8, 99.8, 99.7, 100, 100, 100, 100, 100];
const qaRate = [99.6, 99.8, 99.2, 99.5, 99.4, 99.5, 99.9, 99.8, 99.7, 100, 100, 100, 100, 100, 100, 100];
const frameRate = [59.4, 47.3, 45, 50.6, 64, 67.9, 70, 85.8, 94.4, 100, 100, 100, 100, 100, 100, 100];
const lcdRate = [75.7, null, null, null, 75, 69, 78.8, 86.4, 100, 100, 100, 100, 100, 100, 100];

const kpiSeed = [
  { id: "wip", name: "WIP / Inventory Qty", value: 2456, display: "2,456", unit: "pcs", target: 2800, targetLabel: "2,800 pcs", direction: "lower" as Direction },
  { id: "input", name: "Input Rate", value: 1.18, display: "1.18%", unit: "", target: 1, targetLabel: "1.00%", direction: "lower" as Direction },
  { id: "assembly", name: "Assembly Output", value: 100, display: "100.0%", unit: "", target: 99, targetLabel: "99%", direction: "higher" as Direction },
  { id: "ng", name: "NG Production Rate", value: .98, display: "0.98%", unit: "", target: 1, targetLabel: "1.00%", direction: "lower" as Direction },
  { id: "qa", name: "QA Pass Rate", value: 100, display: "100.0%", unit: "", target: 99, targetLabel: "99%", direction: "higher" as Direction },
  { id: "frame", name: "Pass Rate Repair Frame", value: 100, display: "100.0%", unit: "", target: 80, targetLabel: "80%", direction: "higher" as Direction },
  { id: "lcd", name: "Pass Rate Repair LCD", value: 100, display: "100.0%", unit: "", target: 80, targetLabel: "80%", direction: "higher" as Direction },
];

const wipProcesses = [
  { process: "Judgement Area 528", target: 1000, model: "121528", values: [2017,1872,1397,505,1025,910,770,407,227,331,290,144,82,82,92] },
  { process: "Proses Repair Pre-assembly", target: 300, model: "121516 Top Cover", values: [324,277,157,173,84,20,90,0,0,81,52,18,39,39,39] },
  { process: "Proses Repair Pre-assembly", target: 500, model: "121516 Frame", values: [1290,1457,1457,1457,1712,2144,1964,2186,3002,3049,2834,2488,2288,1868,1979] },
  { process: "Proses Repair Pre-assembly", target: 500, model: "121516 LCD", values: [2874,1415,1415,1415,145,93,29,100,0,0,91,133,147,147,180] },
];

const ngRows = [
  { label: "Standar NG Rate", values: [1,1,1,1,1,1,1], percent: true, target: 1, lower: true },
  { label: "Actual NG Rate", values: [1.29,1.46,1.39,1.82,1.99,1.02,.98], percent: true, target: 1, lower: true },
  { label: "Total NGS", values: [38674,6960,8333,5183,5891,3920,3550] },
  { label: "Actual NG Rate (NGS)", values: [1.22,1.37,1.34,1.73,1.93,.98,.94], percent: true, target: 1, lower: true },
  { label: "Total NGP", values: [1984,486,322,271,212,148,173] },
  { label: "Actual NG Rate (NGP)", values: [.06,.1,.05,.09,.07,.04,.05], percent: true, target: 1, lower: true },
  { label: "TC Preassembly", values: [27493,9217,7612,3501,3225,1175,1165] },
  { label: "NG Proses Preassembly", values: [678,337,247,43,38,6,4] },
  { label: "Passrate", values: [97.5,96.3,96.8,98.8,98.8,99.5,99.7], percent: true, target: 99, lower: false },
];

const issueSeed = [
  { no: 1, date: "30 Sep 2025", problem: "LCD flicker after assembly", improvement: "Replace connector jig", plan: "03 Oct 2025", pic: "Yusriyadi", status: "Open" },
  { no: 2, date: "29 Sep 2025", problem: "Frame gap over tolerance", improvement: "Calibration and retraining", plan: "02 Oct 2025", pic: "Andri", status: "On Progress" },
  { no: 3, date: "28 Sep 2025", problem: "Top cover scratch", improvement: "Add protective film", plan: "30 Sep 2025", pic: "Rina", status: "Done" },
];

function Glyph({ name }: { name: "calendar" | "download" | "plus" | "trend" | "close" | "upload" | "search" | "alert" }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4"/><path d="M4 19h16"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    trend: <><path d="m3 7 6 6 4-4 8 8"/><path d="M15 17h6v-6"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    upload: <><path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 16v4h16v-4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    alert: <><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5m0 3h.01"/></>,
  };
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const isOnTarget = (actual: number, target: number, direction: Direction) => direction === "lower" ? actual <= target : actual >= target;

function Sparkline({ success }: { success: boolean }) {
  return <svg className="repair-spark" viewBox="0 0 112 35" preserveAspectRatio="none"><path d="M1 28 8 25 15 27 22 18 29 21 36 15 43 18 50 11 57 14 64 8 71 13 78 6 85 10 92 5 99 9 111 3" fill="none" stroke={success ? "var(--success)" : "var(--danger)"} strokeWidth="2"/><path d="M1 34V28L8 25 15 27 22 18 29 21 36 15 43 18 50 11 57 14 64 8 71 13 78 6 85 10 92 5 99 9 111 3V34Z" fill={success ? "var(--success-soft)" : "var(--danger-soft)"}/></svg>;
}

type ChartDatum = { period: string; actual: number | null; target: number };

function RepairTooltip({ active, payload, label }: { active?: boolean; payload?: readonly { payload?: ChartDatum }[]; label?: string }) {
  if (!active || !payload?.[0]?.payload) return null;
  const point = payload[0].payload;
  return <div className="repair-tooltip"><strong>{label}</strong>{point.actual === null ? <p>Belum ada data</p> : <><div><span>Target</span><b>{point.target.toLocaleString()}</b></div><div><span>Actual</span><b>{point.actual.toLocaleString()}</b></div><div><span>Selisih</span><b>{(point.actual - point.target).toLocaleString()}</b></div></>}</div>;
}

function StatusDot(props: { cx?: number; cy?: number; payload?: ChartDatum; direction: Direction }) {
  if (props.cx === undefined || props.cy === undefined || props.payload?.actual == null) return <g />;
  const good = isOnTarget(props.payload.actual, props.payload.target, props.direction);
  return <circle cx={props.cx} cy={props.cy} r="4" fill={good ? "var(--success)" : "var(--danger)"} stroke="var(--card)" strokeWidth="2" />;
}

function MetricChart({ id, title, values, target, direction, domain, full = false }: {
  id: string; title: string; values: (number | null)[]; target: number | number[]; direction: Direction; domain?: [number, number]; full?: boolean;
}) {
  const [labels, setLabels] = useState(false);
  const data: ChartDatum[] = periods.map((period, index) => ({
    period,
    actual: values[index] ?? null,
    target: Array.isArray(target) ? (target[index] ?? target[target.length - 1]) : target,
  }));
  return <article id={`chart-${id}`} className={`repair-panel metric-chart ${full ? "wide" : ""}`}>
    <div className="repair-card-head"><div><h2>{title}</h2><p>Performa aktual terhadap target • 2025</p></div><label className="label-toggle"><input type="checkbox" checked={labels} onChange={(event) => setLabels(event.target.checked)}/><span/>Tampilkan label</label></div>
    <div className="line-chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 18, right: 18, left: 6, bottom: 8 }}>
          <CartesianGrid vertical={false}/>
          <XAxis dataKey="period" axisLine={false} tickLine={false} tickMargin={10} interval="preserveStartEnd"/>
          <YAxis domain={domain ?? ["auto", "auto"]} axisLine={false} tickLine={false} width={48}/>
          <Tooltip content={<RepairTooltip/>} cursor={{ stroke: "var(--line)" }}/>
          <Legend wrapperStyle={{ paddingTop: 8, marginTop: 0 }} iconType="line" />
          <Line type="natural" dataKey="target" name="Target" stroke="var(--success)" strokeDasharray="5 5" dot={false} strokeWidth={2} connectNulls={false}/>
          <Line type="natural" dataKey="actual" name="Actual" stroke="var(--chart-1)" strokeWidth={2} connectNulls={false} dot={(props) => <StatusDot {...props} direction={direction}/>}>
            {labels && <LabelList dataKey="actual" position="top" className="repair-point-label"/>}
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
    <div className="metric-chart-footer"><strong><Glyph name="trend"/> Trending down 12% vs last week</strong><span>Target and actual for the selected reporting period</span></div>
  </article>;
}

function WipTable() {
  return <div className="repair-table-scroll"><table className="repair-data-table wip-table"><thead><tr><th className="sticky-col">Proses</th><th>T</th>{periods.slice(0,15).map((period) => <th key={period}>{period}</th>)}</tr></thead><tbody>
    <tr><td className="sticky-col"><strong>Target WIP</strong></td><td>—</td>{wipTargets.slice(0,15).map((value,index) => <td key={index}>{value.toLocaleString()}</td>)}</tr>
    <tr><td className="sticky-col"><strong>Actual WIP</strong></td><td>—</td>{wipActual.slice(0,15).map((value,index) => <td className={value !== null && value <= wipTargets[index] ? "pass-cell" : "fail-cell"} key={index}>{value?.toLocaleString() ?? "—"}</td>)}</tr>
    {wipProcesses.map((row) => <tr key={row.model}><td className="sticky-col"><strong>{row.process}</strong><small>{row.model}</small></td><td>{row.target}</td>{row.values.map((value,index) => <td className={value > row.target ? "fail-cell" : "pass-cell"} key={index}>{value.toLocaleString()}</td>)}</tr>)}
  </tbody></table></div>;
}

function NgProductionCard() {
  const [showTable, setShowTable] = useState(false);
  const miniData = ["2026","Jan","Feb","Mar","Apr","Mei","Jun"].map((period,index) => ({ period, actual: ngRows[1].values[index], target: 1 }));
  return <article className="repair-panel wide ng-panel"><div className="repair-card-head"><div><h2>NG Production Rate</h2><p>Actual NG Rate compared with standard</p></div><div className="chart-card-actions"><span className="repair-status good">Target ≤ 1.00%</span><button type="button" className={`chart-toggle ${showTable ? "active" : ""}`} onClick={() => setShowTable((value) => !value)}>{showTable ? "Sembunyikan Tabel" : "Tampilkan Tabel"}</button></div></div>
    <div className="ng-mini-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={miniData}><CartesianGrid vertical={false}/><XAxis dataKey="period" axisLine={false} tickLine={false}/><YAxis domain={[0,2.1]} axisLine={false} tickLine={false}/><Tooltip/><Legend/><Line dataKey="target" stroke="var(--success)" strokeDasharray="5 5" dot={false}/><Line dataKey="actual" stroke="var(--chart-1)" strokeWidth={2}/></LineChart></ResponsiveContainer></div>
    {showTable && <div className="chart-detail-table-wrap"><table className="repair-data-table chart-detail-table"><thead><tr><th className="sticky-col">Metric</th>{["2026","Jan","Feb","Mar","Apr","Mei","Jun"].map((p)=><th key={p}>{p}</th>)}</tr></thead><tbody>{ngRows.map((row)=><tr key={row.label}><td className="sticky-col"><strong>{row.label}</strong></td>{row.values.map((value,index)=>{const status = row.target === undefined ? "" : ((row.lower ? value <= row.target : value >= row.target) ? "pass-cell":"fail-cell"); return <td className={status} key={index}>{value.toLocaleString()}{row.percent ? "%" : ""}</td>})}</tr>)}</tbody></table></div>}
  </article>;
}

function Header({ page, onInput }: { page: string; onInput: () => void }) {
  const [periodType,setPeriodType] = useState("Harian");
  const [exportOpen,setExportOpen] = useState(false);
  return <div className="repair-header"><div><div className="repair-eyebrow">REPAIR CENTER</div><div className="repair-title-row"><h1>{page}</h1><span className="pic-chip"><span>YU</span>PIC: Yusriyadi</span></div><p>Monitor performa repair dan quality secara real-time.</p></div><div className="repair-actions">
    <div className="period-tabs">{["Harian","Mingguan","Bulanan"].map((type)=><button className={periodType===type?"active":""} onClick={()=>setPeriodType(type)} key={type}>{type}</button>)}</div>
    <button className="repair-outline"><Glyph name="calendar"/>30 Sep 2025</button>
    <div className="export-wrap"><button className="repair-outline" onClick={()=>setExportOpen(!exportOpen)}><Glyph name="download"/>Export</button>{exportOpen&&<div><button>Excel (.xlsx)</button><button>PDF</button></div>}</div>
    <button className="repair-primary" onClick={onInput}><Glyph name="plus"/>Input Data</button>
  </div></div>;
}

function InputDialog({ onClose, onSave }: { onClose: () => void; onSave: (id: string, actual: number) => void }) {
  const [tab,setTab] = useState<"manual"|"import">("manual");
  const [selectedKpi,setSelectedKpi] = useState("wip");
  return <div className="repair-modal-backdrop" onMouseDown={onClose}><form className="repair-dialog" onMouseDown={(event)=>event.stopPropagation()} onSubmit={(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);onSave(String(data.get("kpi")),Number(data.get("actual")));}}>
    <div className="repair-dialog-head"><div><h2>Input Data KPI</h2><p>Tambahkan data aktual untuk periode baru.</p></div><button type="button" onClick={onClose}><Glyph name="close"/></button></div>
    <div className="dialog-tabs"><button type="button" className={tab==="manual"?"active":""} onClick={()=>setTab("manual")}>Input Manual</button><button type="button" className={tab==="import"?"active":""} onClick={()=>setTab("import")}>Import Excel</button></div>
    {tab==="manual"?<div className="repair-form"><label>Pilih KPI<select name="kpi" value={selectedKpi} onChange={(event)=>setSelectedKpi(event.target.value)}>{kpiSeed.map((kpi)=><option value={kpi.id} key={kpi.id}>{kpi.name}</option>)}</select></label><div className="form-grid"><label>Periode<input type="date" required/></label><label>Tipe<select><option>Harian</option><option>Mingguan</option><option>Bulanan</option></select></label><label>Target<input name="target" type="number" step="any" required/></label><label>Actual<input name="actual" type="number" step="any" required/></label></div>{selectedKpi==="wip"&&<div className="form-grid detail-fields"><label>Judgement Area<input type="number"/></label><label>Top Cover<input type="number"/></label><label>Frame<input type="number"/></label><label>LCD<input type="number"/></label></div>}{selectedKpi==="ng"&&<div className="form-grid detail-fields"><label>Total NGS<input type="number"/></label><label>Total NGP<input type="number"/></label><label>TC Preassembly<input type="number"/></label><label>NG Proses<input type="number"/></label></div>}<label>Catatan<textarea rows={3} placeholder="Catatan PIC..."/></label></div>:<div className="repair-dropzone"><Glyph name="upload"/><strong>Drop file Excel atau CSV di sini</strong><span>.xlsx, .xls, atau .csv maksimal 10 MB</span><input type="file" accept=".xlsx,.xls,.csv"/><div className="import-preview"><span>Preview akan tampil setelah file dipilih</span></div></div>}
    <div className="repair-dialog-actions"><button type="button" className="repair-outline" onClick={onClose}>Batal</button><button className="repair-primary">{tab==="manual"?"Simpan":"Konfirmasi Import"}</button></div>
  </form></div>;
}

function KpiSheet({ kpi, onClose, onInput }: { kpi: typeof kpiSeed[number]; onClose: () => void; onInput: () => void }) {
  const good = isOnTarget(kpi.value,kpi.target,kpi.direction);
  return <><button className="repair-sheet-overlay" onClick={onClose}/><aside className="repair-sheet"><div className="repair-dialog-head"><div><p>DETAIL KPI</p><h2>{kpi.name}</h2></div><button onClick={onClose}><Glyph name="close"/></button></div><div className="sheet-value"><strong>{kpi.display}</strong><span className={`repair-status ${good?"good":"bad"}`}>{good?"On Target":"Off Target"}</span><p>Target: {kpi.targetLabel}</p></div><MetricChart id={`sheet-${kpi.id}`} title="Trend KPI" values={inputRate} target={kpi.target} direction={kpi.direction} full/><div className="sheet-notes"><h3>Catatan PIC</h3><p>Performa dipantau harian. Follow-up dilakukan pada setiap nilai yang berada di luar target.</p></div><div className="repair-dialog-actions"><button className="repair-outline"><Glyph name="upload"/>Import Excel</button><button className="repair-primary" onClick={onInput}>Input Actual</button></div></aside></>;
}

function QualityIssues() {
  const [dialog,setDialog] = useState(false);
  const [query,setQuery] = useState("");
  const [status,setStatus] = useState("All");
  const [selected,setSelected] = useState<(typeof issueSeed)[number]|null>(null);
  const filtered=issueSeed.filter((issue)=>(status==="All"||issue.status===status)&&issue.problem.toLowerCase().includes(query.toLowerCase()));
  return <article id="quality-issues" className="repair-panel wide quality-panel"><div className="repair-card-head"><div><h2>Quality Issue</h2><p>Daftar issue terbuka dan improvement plan</p></div><button className="repair-primary" onClick={()=>setDialog(true)}><Glyph name="plus"/>Tambah Issue</button></div><div className="issue-toolbar"><label><Glyph name="search"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Cari problem..."/></label><select value={status} onChange={(e)=>setStatus(e.target.value)}><option>All</option><option>Open</option><option>On Progress</option><option>Done</option></select></div><div className="repair-table-scroll"><table className="repair-data-table"><thead><tr><th>No</th><th>Tanggal</th><th>Problem</th><th>Improvement</th><th>Plan</th><th>PIC</th><th>Status</th><th>Attachment</th></tr></thead><tbody>{filtered.map((issue)=><tr key={issue.no} onClick={()=>setSelected(issue)}><td>{issue.no}</td><td>{issue.date}</td><td><strong>{issue.problem}</strong></td><td>{issue.improvement}</td><td>{issue.plan}</td><td>{issue.pic}</td><td><span className={`issue-status ${issue.status.toLowerCase().replace(" ","-")}`}>{issue.status}</span></td><td><button className="attachment-thumb"><Glyph name="alert"/></button></td></tr>)}</tbody></table></div>
    {dialog&&<div className="repair-modal-backdrop" onMouseDown={()=>setDialog(false)}><form className="repair-dialog" onMouseDown={(e)=>e.stopPropagation()} onSubmit={(e)=>{e.preventDefault();setDialog(false)}}><div className="repair-dialog-head"><div><h2>Tambah Quality Issue</h2><p>Lengkapi detail issue dan improvement.</p></div><button type="button" onClick={()=>setDialog(false)}><Glyph name="close"/></button></div><div className="repair-form"><label>Tanggal<input type="date" required/></label><label>Problem<textarea rows={3} required/></label><label>Improvement<textarea rows={3}/></label><div className="form-grid"><label>Due date<input type="date"/></label><label>PIC<select><option>Yusriyadi</option><option>Andri</option><option>Rina</option></select></label><label>Status<select><option>Open</option><option>On Progress</option><option>Done</option></select></label></div><label className="repair-dropzone"><Glyph name="upload"/><strong>Upload foto</strong><span>Drag & drop atau klik untuk pilih beberapa file</span><input type="file" multiple accept="image/*"/></label></div><div className="repair-dialog-actions"><button type="button" className="repair-outline" onClick={()=>setDialog(false)}>Batal</button><button className="repair-primary">Simpan Issue</button></div></form></div>}
    {selected&&<><button className="repair-sheet-overlay" onClick={()=>setSelected(null)}/><aside className="repair-sheet issue-sheet"><div className="repair-dialog-head"><div><p>QUALITY ISSUE #{selected.no}</p><h2>{selected.problem}</h2></div><button onClick={()=>setSelected(null)}><Glyph name="close"/></button></div><dl><dt>Status</dt><dd><span className={`issue-status ${selected.status.toLowerCase().replace(" ","-")}`}>{selected.status}</span></dd><dt>Improvement</dt><dd>{selected.improvement}</dd><dt>Plan</dt><dd>{selected.plan}</dd><dt>PIC</dt><dd>{selected.pic}</dd></dl><div className="repair-dialog-actions"><button className="danger-button">Hapus</button><button className="repair-primary">Edit</button></div></aside></>}
  </article>;
}

function Preassembly() {
  const [sheetKpi,setSheetKpi] = useState<typeof kpiSeed[number]|null>(null);
  const [inputOpen,setInputOpen] = useState(false);
  const [values,setValues] = useState<Record<string,number>>({});
  const [toast,setToast] = useState(false);
  const [showWipTable,setShowWipTable] = useState(false);
  const kpis=useMemo(()=>kpiSeed.map((kpi)=>values[kpi.id]===undefined?kpi:{...kpi,value:values[kpi.id],display:kpi.unit==="pcs"?values[kpi.id].toLocaleString():`${values[kpi.id].toFixed(2)}%`}),[values]);
  const save=(id:string,actual:number)=>{setValues((current)=>({...current,[id]:actual}));setInputOpen(false);setToast(true);window.setTimeout(()=>setToast(false),2600)};
  return <><Header page="Preassembly" onInput={()=>setInputOpen(true)}/><div className="repair-kpis">{kpis.map((kpi)=>{const good=isOnTarget(kpi.value,kpi.target,kpi.direction);return <button className="repair-kpi" key={kpi.id} onClick={()=>setSheetKpi(kpi)}><div className="repair-kpi-top"><span>{kpi.name}</span><span className={`repair-status ${good?"good":"bad"}`}>{good?"On Target":"Off Target"}</span></div><strong>{kpi.display} <small>{kpi.unit}</small></strong><p>Target: {kpi.targetLabel} <b className={good?"good-text":"bad-text"}>{good?"↓":"↑"} {Math.abs(kpi.value-kpi.target).toLocaleString()}</b></p><Sparkline success={good}/></button>})}<button className="repair-kpi issue-kpi" onClick={()=>document.getElementById("quality-issues")?.scrollIntoView({behavior:"smooth"})}><div className="repair-kpi-top"><span>Quality Issue</span><span className="repair-status bad">Needs action</span></div><strong>3 <small>Open</small></strong><p>2 due this week</p><Glyph name="alert"/></button></div>
    <div className="repair-charts"><div className="repair-panel wide wip-combo"><div className="repair-card-head"><div><h2>WIP / Inventory Qty</h2><p>Data stok dan performa inventori harian</p></div><button type="button" className={`chart-toggle ${showWipTable ? "active" : ""}`} onClick={()=>setShowWipTable((value)=>!value)}>{showWipTable ? "Sembunyikan Tabel" : "Tampilkan Tabel"}</button></div><MetricChart id="wip" title="WIP / Inventory Qty" values={wipActual} target={wipTargets} direction="lower" full/>{showWipTable && <WipTable/>}</div><MetricChart id="input" title="Input Rate" values={inputRate} target={1} direction="lower" domain={[0,2.1]}/><MetricChart id="assembly" title="Passrate Preassembly" values={preassemblyRate} target={99} direction="higher" domain={[95,102]}/><MetricChart id="qa" title="QA Pass Rate" values={qaRate} target={99} direction="higher" domain={[95,101]}/><MetricChart id="frame" title="Pass Rate Repair Frame" values={frameRate} target={80} direction="higher" domain={[30,120]}/><MetricChart id="lcd" title="Pass Rate Repair LCD" values={lcdRate} target={80} direction="higher" domain={[50,120]}/><NgProductionCard/><QualityIssues/></div>
    {sheetKpi&&<KpiSheet kpi={sheetKpi} onClose={()=>setSheetKpi(null)} onInput={()=>setInputOpen(true)}/>}
    {inputOpen&&<InputDialog onClose={()=>setInputOpen(false)} onSave={save}/>}
    {toast&&<div className="repair-toast"><span>✓</span>Data berhasil disimpan</div>}
  </>;
}

function Rework() {
  const [dialog,setDialog]=useState(false);
  const planning=[{date:"28 Sep",model:"A5 Pro",plan:120,actual:126},{date:"29 Sep",model:"Reno 14",plan:100,actual:94},{date:"30 Sep",model:"A5 Pro",plan:130,actual:132},{date:"1 Oct",model:"Reno 14",plan:110,actual:101}];
  return <><Header page="Rework" onInput={()=>setDialog(true)}/><div className="repair-kpis two"><button className="repair-kpi"><div className="repair-kpi-top"><span>WIP Rework</span><span className="repair-status good">On Target</span></div><strong>1,284 <small>pcs</small></strong><p>Target: 1,500 pcs</p><Sparkline success/></button><button className="repair-kpi"><div className="repair-kpi-top"><span>Planning Harian</span><span className="repair-status good">Achieved</span></div><strong>102.4%</strong><p>Target: 100%</p><Sparkline success/></button></div><div className="repair-charts"><MetricChart id="rework" title="WIP Rework" values={wipActual.map((v)=>v===null?null:Math.round(v*.45))} target={1500} direction="lower" full/><article className="repair-panel wide"><div className="repair-card-head"><div><h2>Planning Harian</h2><p>Plan vs actual output per hari</p></div><button className="repair-primary" onClick={()=>setDialog(true)}><Glyph name="plus"/>Input Planning</button></div><div className="planning-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={planning}><CartesianGrid vertical={false}/><XAxis dataKey="date" axisLine={false} tickLine={false}/><Tooltip/><Legend/><Bar dataKey="plan" name="Plan" fill="var(--chart-1)" radius={6}/><Bar dataKey="actual" name="Actual" fill="var(--chart-2)" radius={6}/></BarChart></ResponsiveContainer></div><div className="repair-table-scroll"><table className="repair-data-table"><thead><tr><th>Tanggal</th><th>Model</th><th>Plan Qty</th><th>Actual Qty</th><th>Achievement</th><th>Status</th><th>Catatan</th></tr></thead><tbody>{planning.map((row)=><tr key={row.date}><td>{row.date}</td><td>{row.model}</td><td>{row.plan}</td><td>{row.actual}</td><td><div className="achievement"><i style={{width:`${Math.min(row.actual/row.plan*100,100)}%`}}/><span>{(row.actual/row.plan*100).toFixed(1)}%</span></div></td><td><span className={`repair-status ${row.actual>=row.plan?"good":"bad"}`}>{row.actual>=row.plan?"Achieved":"Behind"}</span></td><td>Monitoring</td></tr>)}</tbody></table></div></article></div>{dialog&&<InputDialog onClose={()=>setDialog(false)} onSave={()=>setDialog(false)}/>}</>;
}

function Warranty() {
  const [dialog,setDialog]=useState(false);
  const daily=[{day:"25 Sep",input:32,off:4},{day:"26 Sep",input:41,off:6},{day:"27 Sep",input:36,off:3},{day:"28 Sep",input:48,off:8},{day:"29 Sep",input:44,off:5},{day:"30 Sep",input:52,off:7}];
  return <><Header page="Warranty" onInput={()=>setDialog(true)}/><div className="repair-kpis two"><button className="repair-kpi"><div className="repair-kpi-top"><span>Input Unit Market</span><span className="repair-status good">Active</span></div><strong>52 <small>units</small></strong><p>Hari ini</p><Sparkline success/></button><button className="repair-kpi"><div className="repair-kpi-top"><span>Phone Off</span><span className="repair-status bad">7 units</span></div><strong>13.5%</strong><p>dari input market</p><Sparkline success={false}/></button></div><div className="repair-charts"><article className="repair-panel"><div className="repair-card-head"><div><h2>Input Unit Market</h2><p>Jumlah unit masuk harian</p></div><button className="repair-primary" onClick={()=>setDialog(true)}><Glyph name="plus"/>Input</button></div><div className="warranty-chart"><ResponsiveContainer><BarChart data={daily}><CartesianGrid vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="input" fill="var(--chart-1)" radius={6}/></BarChart></ResponsiveContainer></div></article><article className="repair-panel"><div className="repair-card-head"><div><h2>Phone Off</h2><p>Temuan phone off harian</p></div><button className="repair-primary" onClick={()=>setDialog(true)}><Glyph name="plus"/>Input</button></div><div className="warranty-chart"><ResponsiveContainer><LineChart data={daily}><CartesianGrid vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false}/><Tooltip/><Line dataKey="off" stroke="var(--chart-5)" strokeWidth={2}/></LineChart></ResponsiveContainer></div></article><article className="repair-panel wide"><div className="repair-card-head"><div><h2>Warranty recap</h2><p>Rekap unit berdasarkan tanggal dan model</p></div></div><div className="repair-table-scroll"><table className="repair-data-table"><thead><tr><th>Tanggal</th><th>Model</th><th>Input Unit Market</th><th>Phone Off</th><th>Keterangan</th></tr></thead><tbody>{daily.map((row)=><tr key={row.day}><td>{row.day}</td><td>OPPO A5 Pro</td><td>{row.input}</td><td className={row.off>5?"fail-cell":"pass-cell"}>{row.off}</td><td>Warranty inspection</td></tr>)}</tbody></table></div></article></div>{dialog&&<InputDialog onClose={()=>setDialog(false)} onSave={()=>setDialog(false)}/>}</>;
}

type AbnormalStatus = "Open" | "In Progress" | "Closed-Loop" | "Draft";

type AbnormalRecord = {
  id: string;
  date: string;
  area: string;
  sqcdip: string;
  factor: string;
  problem: string;
  improvement: string;
  plan: string;
  pic: string;
  status: AbnormalStatus;
};

const abnormalSeed: AbnormalRecord[] = [
  {
    id: "ABN-001",
    date: "2026-10-01 09:30",
    area: "Pre Assembly",
    sqcdip: "Quality",
    factor: "Machine",
    problem: "LCD bonding machine temperature fluctuation caused slight adhesive peeling.",
    improvement: "Adjusted heater cartridge and recalibrated PID controller.",
    plan: "Daily pre-check thermal sensor calibration before shift.",
    pic: "Ahmad Supriyadi",
    status: "Closed-Loop",
  },
  {
    id: "ABN-002",
    date: "2026-10-01 10:15",
    area: "Service",
    sqcdip: "Quality",
    factor: "Man",
    problem: "Mainboard service rate dropped due to operator misjudge analysis on IC repair.",
    improvement: "Immediate re-training on BGA rework diagnostic manual.",
    plan: "Conduct weekly technical skill evaluation for all line technicians.",
    pic: "Siti Rahma",
    status: "In Progress",
  },
  {
    id: "ABN-003",
    date: "2026-10-01 10:45",
    area: "Warranty",
    sqcdip: "Cost",
    factor: "Material",
    problem: "Phone off issue reported in market units exceeding standard PPM threshold.",
    improvement: "Quarantined batch #BT-992 from battery supplier.",
    plan: "Supplier audit and incoming battery voltage stress test implementation.",
    pic: "Hendra Wijaya",
    status: "Open",
  },
  {
    id: "ABN-004",
    date: "2026-10-01 11:00",
    area: "Instalasi",
    sqcdip: "Delivery",
    factor: "Method",
    problem: "Delivery delay caused by poor field installation sequencing and documentation gaps.",
    improvement: "Re-sequenced install steps and shared updated checklist with field team.",
    plan: "Daily handoff review before each installation batch.",
    pic: "Dewi Lestari",
    status: "Closed-Loop",
  },
];

const abnormalStatusClass: Record<AbnormalStatus, string> = {
  Open: "status-open",
  "In Progress": "status-progress",
  "Closed-Loop": "status-closed-loop",
  Draft: "status-draft",
};

const abnormalSqcdipClass: Record<string, string> = {
  Safety: "sqcdip-safety",
  Quality: "sqcdip-quality",
  Cost: "sqcdip-cost",
  Delivery: "sqcdip-delivery",
  Inventory: "sqcdip-inventory",
  Productivity: "sqcdip-productivity",
};

function formatDateTime(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function AbnormalPageHeader() {
  return (
    <header className="qc-page-header">
      <div>
        <div className="qc-kicker">ABNORMALITY</div>
        <h1>Abnormality</h1>
        <p>Track unresolved nonconformities and quality exceptions across production lines.</p>
      </div>
      <div className="qc-toolbar">
        <div className="qc-live">
          <span className="live-dot" />
          <span>PIC: Yusriyadi</span>
        </div>
        <button className="qc-secondary-button" type="button">30 Sep 2026</button>
        <button className="qc-primary-button" type="button">
          <Download size={14} />
          Export
        </button>
      </div>
    </header>
  );
}

function AbnormalPage() {
  const [rows, setRows] = useState<AbnormalRecord[]>(abnormalSeed);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sqcdipFilter, setSqcdipFilter] = useState("All");
  const [factorFilter, setFactorFilter] = useState("All");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AbnormalRecord>({
    id: "",
    date: formatDateTime(new Date()),
    area: "Pre Assembly",
    sqcdip: "Quality",
    factor: "Machine",
    problem: "",
    improvement: "",
    plan: "",
    pic: "",
    status: "Open",
  });

  const filteredRows = useMemo(() => rows.filter((row) => {
    const searchTerm = query.trim().toLowerCase();
    const matchesQuery = !searchTerm || [row.id, row.problem, row.area, row.pic, row.sqcdip, row.factor].join(" ").toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === "All" || row.status === statusFilter;
    const matchesSqcdip = sqcdipFilter === "All" || row.sqcdip === sqcdipFilter;
    const matchesFactor = factorFilter === "All" || row.factor === factorFilter;
    return matchesQuery && matchesStatus && matchesSqcdip && matchesFactor;
  }), [factorFilter, query, rows, sqcdipFilter, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setDraft({
      id: "",
      date: formatDateTime(new Date()),
      area: "Pre Assembly",
      sqcdip: "Quality",
      factor: "Machine",
      problem: "",
      improvement: "",
      plan: "",
      pic: "",
      status: "Open",
    });
    setIsFormOpen(true);
  };

  const openEdit = (row: AbnormalRecord) => {
    setEditingId(row.id);
    setDraft({ ...row });
    setIsFormOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanProblem = draft.problem.trim();
    if (!cleanProblem || !draft.pic.trim()) return;

    const nextRecord: AbnormalRecord = {
      ...draft,
      problem: cleanProblem,
      improvement: draft.improvement.trim(),
      plan: draft.plan.trim(),
      pic: draft.pic.trim(),
      date: draft.date || formatDateTime(new Date()),
    };

    if (editingId) {
      setRows((current) => current.map((item) => (item.id === editingId ? nextRecord : item)));
    } else {
      const highestId = rows.reduce((max, item) => {
        const match = item.id.match(/ABN-(\d+)/);
        const number = match ? Number(match[1]) : 0;
        return Math.max(max, number);
      }, 0);
      const newId = `ABN-${String(highestId + 1).padStart(3, "0")}`;
      setRows((current) => [{ ...nextRecord, id: newId, date: formatDateTime(new Date()) }, ...current]);
    }

    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setRows((current) => current.filter((item) => item.id !== id));
  };

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("All");
    setSqcdipFilter("All");
    setFactorFilter("All");
  };

  const summary = [
    { label: "Total Abnormal", value: "124", helper: "all cases" },
    { label: "Open", value: "26", helper: "needs action" },
    { label: "In Progress", value: "18", helper: "in review" },
    { label: "Closed-Loop", value: "80", helper: "resolved" },
    { label: "Average SLA", value: "4.8d", helper: "days to close" },
  ];

  return (
    <div className="abnormality-page">
      <AbnormalPageHeader />

      <section className="qc-kpi-grid abnormality-kpis">
        {summary.map((item) => (
          <article key={item.label} className="qc-kpi-card abnormality-kpi-card">
            <span className="kpi-label">{item.label}</span>
            <strong>{item.value}</strong>
            <span className="kpi-unit">{item.helper}</span>
          </article>
        ))}
      </section>

      <article className="abnormality-panel">
        <div className="abnormality-panel-head">
          <div>
            <h2>Abnormal log</h2>
            <p>Filter by SQCDIP, 5M1E, or status.</p>
          </div>
          <button type="button" className="qc-primary-button" onClick={openCreate}>
            <Plus size={14} />
            Add abnormal
          </button>
        </div>

        <div className="abnormality-filter-row">
          <label className="abnormality-search">
            <Search size={14} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search abnormal..." />
          </label>

          <select value={sqcdipFilter} onChange={(event) => setSqcdipFilter(event.target.value)}>
            <option value="All">All SQCDIP</option>
            <option value="Safety">Safety</option>
            <option value="Quality">Quality</option>
            <option value="Cost">Cost</option>
            <option value="Delivery">Delivery</option>
            <option value="Inventory">Inventory</option>
            <option value="Productivity">Productivity</option>
          </select>

          <select value={factorFilter} onChange={(event) => setFactorFilter(event.target.value)}>
            <option value="All">All 5M1E</option>
            <option value="Machine">Machine</option>
            <option value="Man">Man</option>
            <option value="Material">Material</option>
            <option value="Method">Method</option>
            <option value="Measurement">Measurement</option>
            <option value="Environment">Environment</option>
          </select>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="All">All status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed-Loop">Closed-Loop</option>
            <option value="Draft">Draft</option>
          </select>

          <button type="button" className="qc-secondary-button abnormality-reset" onClick={resetFilters}>
            <Filter size={14} />
            Reset
          </button>
        </div>

        {filteredRows.length === 0 ? (
          <div className="abnormality-empty">No abnormals match the selected filters.</div>
        ) : (
          <div className="repair-table-scroll">
            <table className="repair-data-table abnormality-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Area</th>
                  <th>SQCDIP</th>
                  <th>5M1E</th>
                  <th>Problem</th>
                  <th>PIC</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.id}</strong></td>
                    <td>{item.date}</td>
                    <td>{item.area}</td>
                    <td>
                      <span className={`abnormality-sq-badge ${abnormalSqcdipClass[item.sqcdip] ?? "sqcdip-quality"}`}>
                        {item.sqcdip}
                      </span>
                    </td>
                    <td>{item.factor}</td>
                    <td>
                      <div className="abnormality-title-wrap">
                        <strong>{item.problem}</strong>
                        <small>{item.improvement}</small>
                      </div>
                    </td>
                    <td>{item.pic}</td>
                    <td>
                      <span className={`status-chip ${abnormalStatusClass[item.status]}`}>{item.status}</span>
                    </td>
                    <td className="abnormality-actions">
                      <button type="button" className="icon-button" aria-label="Edit abnormal" onClick={() => openEdit(item)}>
                        <PencilLine size={14} />
                      </button>
                      <button type="button" className="icon-button danger" aria-label="Delete abnormal" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {isFormOpen && (
        <div className="repair-modal-backdrop" onMouseDown={() => setIsFormOpen(false)}>
          <form className="repair-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
            <div className="repair-dialog-head">
              <div>
                <h2>{editingId ? "Edit abnormal" : "Add abnormal"}</h2>
                <p>{editingId ? "Update the selected abnormal record." : "Create a new abnormal record and add it to the log."}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setIsFormOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="repair-form">
              <div className="form-grid">
                <label>
                  Area
                  <select value={draft.area} onChange={(event) => setDraft((current) => ({ ...current, area: event.target.value }))}>
                    <option>Pre Assembly</option>
                    <option>Rework</option>
                    <option>Warranty</option>
                    <option>Service</option>
                    <option>QC</option>
                    <option>Material</option>
                    <option>Packing</option>
                    <option>Instalasi</option>
                  </select>
                </label>

                <label>
                  SQCDIP
                  <select value={draft.sqcdip} onChange={(event) => setDraft((current) => ({ ...current, sqcdip: event.target.value }))}>
                    <option>Safety</option>
                    <option>Quality</option>
                    <option>Cost</option>
                    <option>Delivery</option>
                    <option>Inventory</option>
                    <option>Productivity</option>
                  </select>
                </label>

                <label>
                  5M1E
                  <select value={draft.factor} onChange={(event) => setDraft((current) => ({ ...current, factor: event.target.value }))}>
                    <option>Machine</option>
                    <option>Man</option>
                    <option>Material</option>
                    <option>Method</option>
                    <option>Measurement</option>
                    <option>Environment</option>
                  </select>
                </label>

                <label>
                  PIC
                  <input
                    value={draft.pic}
                    onChange={(event) => setDraft((current) => ({ ...current, pic: event.target.value }))}
                    placeholder="PIC name"
                    required
                  />
                </label>
              </div>

              <label>
                Problem
                <textarea
                  rows={3}
                  value={draft.problem}
                  onChange={(event) => setDraft((current) => ({ ...current, problem: event.target.value }))}
                  placeholder="Detailed problem"
                  required
                />
              </label>

              <label>
                Improvement
                <textarea
                  rows={3}
                  value={draft.improvement}
                  onChange={(event) => setDraft((current) => ({ ...current, improvement: event.target.value }))}
                  placeholder="Corrective action taken"
                />
              </label>

              <label>
                Action plan
                <textarea
                  rows={3}
                  value={draft.plan}
                  onChange={(event) => setDraft((current) => ({ ...current, plan: event.target.value }))}
                  placeholder="Follow-up plan"
                />
              </label>

              <div className="form-grid">
                <label>
                  Status
                  <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as AbnormalStatus }))}>
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Closed-Loop</option>
                    <option>Draft</option>
                  </select>
                </label>

                <label>
                  Date & time
                  <input
                    type="datetime-local"
                    value={draft.date.replace(" ", "T").slice(0, 16)}
                    onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value.replace("T", " ") }))}
                  />
                </label>
              </div>
            </div>

            <div className="repair-dialog-actions">
              <button type="button" className="repair-outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="repair-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AbnormalDetail({ abnormal, onBack }: { abnormal: { id: string; date: string; name: string; workshop: string; proposer: string; source: string; frequency: string; track: string; status: string; attachment: number }; onBack: () => void }) {
  return <div className="abnormal-page detail-page">
    <header className="abnormal-header detail-header">
      <div>
        <div className="abnormal-breadcrumb">Repair / Abnormal / {abnormal.id}</div>
        <h1>{abnormal.name}</h1>
      </div>
      <div className="abnormal-actions">
        <button className="repair-outline" onClick={onBack}>Kembali</button>
        <button className="repair-primary">Edit</button>
      </div>
    </header>

    <div className="detail-grid">
      <div className="detail-main">
        <div className="abnormal-card info-grid">
          <div><label>Workshop Line</label><strong>{abnormal.workshop}</strong></div>
          <div><label>Proposer</label><strong>{abnormal.proposer}</strong></div>
          <div><label>Tanggal</label><strong>{abnormal.date}</strong></div>
          <div><label>Exception source</label><span className="abnormal-chip source-chip">{abnormal.source}</span></div>
          <div><label>Frequency</label><span className="abnormal-chip">{abnormal.frequency}</span></div>
          <div><label>Status</label><span className={`repair-status ${abnormal.status === "Closed" ? "good" : "bad"}`}>{abnormal.status}</span></div>
        </div>

        <div className="abnormal-card">
          <h3>Problem Statement</h3>
          <p>Tgl 4/10, line TAC20501 Zenit kekurangan material bracket kode 612210001971 (-223pcs) mengakibatkan plan mundur dan lead time naik.</p>
        </div>

        <div className="abnormal-card why-tree">
          <h3>5 Why Analysis</h3>
          <div className="why-columns">
            <div className="why-column">
              <div className="why-root">Problem</div>
              <div className="why-node"><span className="why-badge">Why 1</span><p>Material bracket tidak tersedia pada saat line running.</p></div>
              <div className="why-node"><span className="why-badge">Why 2</span><p>Reorder dilakukan terlambat dan pengiriman supplier tidak sesuai jadwal.</p></div>
              <div className="why-node root-cause"><span className="why-badge">ROOT CAUSE</span><p>Stock planning tidak memadai untuk kode material 612210001971.</p></div>
            </div>
            <div className="why-column">
              <div className="why-root">Management</div>
              <div className="why-node"><span className="why-badge">Why 1</span><p>Review replenishment dilakukan tanpa escalation cepat.</p></div>
              <div className="why-node"><span className="why-badge">Why 2</span><p>Lead time supplier belum di-update ke owner line.</p></div>
              <div className="why-node root-cause"><span className="why-badge">ROOT CAUSE</span><p>Proses review vendor dan stock buffer belum terintegrasi.</p></div>
            </div>
          </div>
        </div>

        <div className="abnormal-card">
          <h3>Risk & Evaluation</h3>
          <ol>
            <li>Risiko keterlambatan produksi pada line TAC20501.</li>
            <li>Potensi kenaikan backlog produksi 6–8%.</li>
            <li>Pengaruh ke service SLA customer.</li>
          </ol>
        </div>
      </div>

      <aside className="detail-side">
        <div className="abnormal-card">
          <h3>Attachment</h3>
          <ul className="attachment-list">
            <li>IMG_20261004_1.jpg</li>
            <li>IMG_20261004_2.png</li>
            <li>IMG_20261004_3.png</li>
          </ul>
        </div>
        <div className="abnormal-card">
          <h3>Riwayat Aktivitas</h3>
          <ul className="timeline-list">
            <li><strong>2026-10-04</strong><span>Dibuat oleh Galuh</span></li>
            <li><strong>2026-10-05</strong><span>Status diubah ke Closed</span></li>
            <li><strong>2026-10-06</strong><span>Upload foto evidence</span></li>
          </ul>
        </div>
      </aside>
    </div>
  </div>;
}

function AbnormalWizard({ onQuit }: { onQuit: () => void }) {
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(true);
  const [source, setSource] = useState("After Occurring");
  const [frequency, setFrequency] = useState("Long processing cycle");
  const [problemStatement, setProblemStatement] = useState("Tgl 4/10, line TAC20501 Zenit kekurangan material bracket kode 612210001971 (-223pcs) mengakibatkan plan mundur");
  const [technicalWhys, setTechnicalWhys] = useState([
    { id: 1, answer: "Material bracket tidak tersedia pada saat line running", root: false },
    { id: 2, answer: "Reorder terlambat dan pengiriman supplier tidak sesuai jadwal", root: true },
  ]);
  const [managementWhys, setManagementWhys] = useState([
    { id: 1, answer: "Review replenishment dilakukan tanpa eskalasi cepat", root: false },
    { id: 2, answer: "Lead time supplier belum di-update ke owner line", root: false },
  ]);
  const [risks, setRisks] = useState(["Keterlambatan produksi", "Backlog meningkat", "SLA customer berisiko"]);
  const [conclusions, setConclusions] = useState(["Stock planning perlu revisi", "Supplier escalation harus lebih cepat"]);
  const [actions, setActions] = useState([{ text: "Urgent review BOM dan stock buffer", pic: "Galuh", dueDate: "2026-10-08", status: "Proses" }]);

  const addWhy = (type: "technical" | "management") => {
    if (type === "technical") {
      setTechnicalWhys((current) => [...current, { id: current.length + 1, answer: "", root: false }]);
    } else {
      setManagementWhys((current) => [...current, { id: current.length + 1, answer: "", root: false }]);
    }
    setSaved(false);
  };

  const updateWhy = (type: "technical" | "management", id: number, value: string) => {
    if (type === "technical") {
      setTechnicalWhys((current) => current.map((item) => item.id === id ? { ...item, answer: value } : item));
    } else {
      setManagementWhys((current) => current.map((item) => item.id === id ? { ...item, answer: value } : item));
    }
    setSaved(false);
  };

  const setRoot = (type: "technical" | "management", id: number) => {
    if (type === "technical") {
      setTechnicalWhys((current) => current.map((item) => ({ ...item, root: item.id === id })));
    } else {
      setManagementWhys((current) => current.map((item) => ({ ...item, root: item.id === id })));
    }
    setSaved(false);
  };

  const removeWhy = (type: "technical" | "management", id: number) => {
    if (type === "technical") setTechnicalWhys((current) => current.filter((item) => item.id !== id));
    else setManagementWhys((current) => current.filter((item) => item.id !== id));
    setSaved(false);
  };

  const addListRow = (list: "risk" | "conclusion") => {
    if (list === "risk") setRisks((current) => [...current, ""]);
    else setConclusions((current) => [...current, ""]);
  };

  const updateListRow = (list: "risk" | "conclusion", index: number, value: string) => {
    if (list === "risk") setRisks((current) => current.map((item, idx) => idx === index ? value : item));
    else setConclusions((current) => current.map((item, idx) => idx === index ? value : item));
  };

  const addAction = () => setActions((current) => [...current, { text: "", pic: "", dueDate: "", status: "Belum" }]);
  const updateAction = (index: number, field: keyof { text: string; pic: string; dueDate: string; status: string }, value: string) => {
    setActions((current) => current.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  };

  const steps = ["Informasi Umum", "5 Why Teknis", "5 Why Management", "Kesimpulan", "Review"];

  return <div className="abnormal-wizard-shell">
    <div className="abnormal-wizard-header">
      <div>
        <div className="abnormal-breadcrumb">Repair / Abnormal / Baru</div>
        <h1>Abnormal Baru</h1>
      </div>
      <div className="abnormal-actions">
        <span className="autosave-indicator">{saved ? "Tersimpan otomatis" : "Belum tersimpan"}</span>
        <button className="repair-outline" onClick={onQuit}>Batal</button>
      </div>
    </div>

    <div className="wizard-stepper">
      {steps.map((item, index) => (
        <button type="button" key={item} className={step === index + 1 ? "active" : ""} onClick={() => setStep(index + 1)}>
          <span>{index + 1}</span>
          {item}
        </button>
      ))}
    </div>

    <div className="abnormal-wizard-body">
      {step === 1 && <div className="form-grid-large">
        <label>Abnormal Name<input value={problemStatement} onChange={(event) => { setProblemStatement(event.target.value); setSaved(false); }} /></label>
        <label>Workshop Line<select value="Workshop 5" onChange={() => setSaved(false)}><option>Workshop 5</option><option>Workshop 3</option><option>Workshop 2</option></select></label>
        <label>Proposer<input value="Galuh / Irfan N" onChange={() => setSaved(false)} /></label>
        <label>Tanggal kejadian<input type="date" value="2026-10-04" onChange={() => setSaved(false)} /></label>
        <label className="segmented-block">Exception source
          <div className="segmented-row">
            {['Before Occurring', 'Current Occurring', 'After Occurring', 'Other'].map((item) => (
              <button type="button" key={item} className={source === item ? 'active' : ''} onClick={() => { setSource(item); setSaved(false); }}>{item}</button>
            ))}
          </div>
        </label>
        <label className="segmented-block">Frequency
          <div className="segmented-row">
            {['Frequent occurrence', 'Long processing cycle', 'Others'].map((item) => (
              <button type="button" key={item} className={frequency === item ? 'active' : ''} onClick={() => { setFrequency(item); setSaved(false); }}>{item}</button>
            ))}
          </div>
        </label>
        <label className="full-span">Problem Statement<textarea rows={5} value={problemStatement} onChange={(event) => { setProblemStatement(event.target.value); setSaved(false); }} /></label>
        <div className="full-span upload-box"><h3>Foto / attachment kondisi awal</h3><input type="file" multiple accept="image/png,image/jpeg" /><div className="thumb-stack"><span>initial-line.jpg</span><span>warning-1.png</span></div></div>
      </div>}

      {step === 2 && <div className="why-form-step">
        <div className="abnormal-card why-readonly"><strong>Problem Statement</strong><p>{problemStatement}</p></div>
        {technicalWhys.map((item, index) => (
          <div key={item.id} className={`why-entry ${item.root ? 'root-entry' : ''}`}>
            <div className="why-entry-head"><h3>Why {index + 1}: Kenapa {index === 0 ? 'masalah ini terjadi?' : technicalWhys[index - 1].answer || 'jawaban sebelumnya'} terjadi?</h3>{technicalWhys.length > 1 && <button type="button" onClick={() => removeWhy('technical', item.id)}>Hapus</button>}</div>
            <textarea value={item.answer} onChange={(event) => updateWhy('technical', item.id, event.target.value)} placeholder="Jawaban why..." rows={3} />
            <div className="why-upload-area"><input type="file" multiple accept="image/png,image/jpeg" /><span>Upload foto</span></div>
            {item.root ? <div className="root-indicator">ROOT CAUSE</div> : <label className="root-toggle"><input type="checkbox" checked={item.root} onChange={() => setRoot('technical', item.id)} /> Ini akar masalah (Root Cause)</label>}
          </div>
        ))}
        {!technicalWhys.some((item) => item.root) && technicalWhys.length < 5 && <button type="button" className="repair-primary inline-button" onClick={() => addWhy('technical')}>+ Tambah Why berikutnya</button>}
      </div>}

      {step === 3 && <div className="why-form-step">
        <div className="abnormal-card why-readonly"><strong>Problem Statement</strong><p>{problemStatement}</p></div>
        {managementWhys.map((item, index) => (
          <div key={item.id} className={`why-entry ${item.root ? 'root-entry' : ''}`}>
            <div className="why-entry-head"><h3>Why {index + 1}: Kenapa {index === 0 ? 'masalah ini terjadi?' : managementWhys[index - 1].answer || 'jawaban sebelumnya'} terjadi?</h3>{managementWhys.length > 1 && <button type="button" onClick={() => removeWhy('management', item.id)}>Hapus</button>}</div>
            <textarea value={item.answer} onChange={(event) => updateWhy('management', item.id, event.target.value)} placeholder="Jawaban why..." rows={3} />
            <div className="why-upload-area"><input type="file" multiple accept="image/png,image/jpeg" /><span>Upload foto</span></div>
            {item.root ? <div className="root-indicator">ROOT CAUSE</div> : <label className="root-toggle"><input type="checkbox" checked={item.root} onChange={() => setRoot('management', item.id)} /> Ini akar masalah (Root Cause)</label>}
          </div>
        ))}
        {!managementWhys.some((item) => item.root) && managementWhys.length < 5 && <button type="button" className="repair-primary inline-button" onClick={() => addWhy('management')}>+ Tambah Why berikutnya</button>}
      </div>}

      {step === 4 && <div className="summary-form-step">
        <div className="summary-stack">
          <div className="abnormal-card">
            <h3>Risk & Evaluation</h3>
            {risks.map((item, index) => (
              <div key={index} className="list-row">
                <input value={item} onChange={(event) => updateListRow('risk', index, event.target.value)} />
                <button type="button" onClick={() => setRisks((current) => current.filter((_, idx) => idx !== index))}>Hapus</button>
              </div>
            ))}
            <button type="button" className="repair-primary inline-button" onClick={() => addListRow('risk')}>+ Tambah poin</button>
          </div>

          <div className="abnormal-card">
            <h3>Kesimpulan</h3>
            {conclusions.map((item, index) => (
              <div key={index} className="list-row">
                <input value={item} onChange={(event) => updateListRow('conclusion', index, event.target.value)} />
                <button type="button" onClick={() => setConclusions((current) => current.filter((_, idx) => idx !== index))}>Hapus</button>
              </div>
            ))}
            <button type="button" className="repair-primary inline-button" onClick={() => addListRow('conclusion')}>+ Tambah poin</button>
          </div>

          <div className="abnormal-card">
            <h3>Short-term Solution</h3>
            {actions.map((item, index) => (
              <div key={index} className="action-row">
                <input value={item.text} onChange={(event) => updateAction(index, 'text', event.target.value)} placeholder="Tindakan" />
                <select value={item.pic} onChange={(event) => updateAction(index, 'pic', event.target.value)}><option value="">PIC</option><option>Galuh</option><option>Irfan N</option><option>Bayu</option></select>
                <input type="date" value={item.dueDate} onChange={(event) => updateAction(index, 'dueDate', event.target.value)} />
                <select value={item.status} onChange={(event) => updateAction(index, 'status', event.target.value)}><option>Belum</option><option>Proses</option><option>Selesai</option></select>
                <button type="button" onClick={() => setActions((current) => current.filter((_, idx) => idx !== index))}>Hapus</button>
              </div>
            ))}
            <button type="button" className="repair-primary inline-button" onClick={addAction}>+ Tambah item</button>
          </div>
        </div>
      </div>}

      {step === 5 && <div className="review-step">
        <div className="abnormal-card review-box">
          <h3>Review dan Submit</h3>
          <p><strong>Abnormal Name:</strong> {problemStatement}</p>
          <p><strong>Source:</strong> {source}</p>
          <p><strong>Frequency:</strong> {frequency}</p>
          <div className="review-why-block"><h4>5 Why Teknis</h4>{technicalWhys.map((item, index) => <div key={item.id} className="review-why-item"><span>Why {index + 1}</span><p>{item.answer || "Belum diisi"}</p></div>)}</div>
          <div className="review-why-block"><h4>5 Why Management</h4>{managementWhys.map((item, index) => <div key={item.id} className="review-why-item"><span>Why {index + 1}</span><p>{item.answer || "Belum diisi"}</p></div>)}</div>
        </div>
      </div>}
    </div>

    <footer className="abnormal-footer">
      <button type="button" className="repair-outline" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1}>Kembali</button>
      <button type="button" className="repair-outline" onClick={() => setSaved(true)}>Simpan Draft</button>
      <button type="button" className="repair-primary" onClick={() => setStep((current) => Math.min(5, current + 1))}>{step === 5 ? "Submit" : "Lanjut"}</button>
    </footer>
  </div>;
}

export default function RepairDashboard({ page }: { page: RepairPage }) {
  const [loading,setLoading]=useState(true);
  useEffect(()=>{setLoading(true);const timer=window.setTimeout(()=>setLoading(false),450);return()=>window.clearTimeout(timer)},[page]);
  if(loading)return <div className="repair-skeleton"><div className="skeleton-title"/><div className="skeleton-kpis">{Array.from({length:8},(_,index)=><i key={index}/>)}</div><div className="skeleton-panels"><i/><i/><i/></div></div>;
  if (page === "Rework") return <Rework/>;
  if (page === "Warranty") return <Warranty/>;
  if (page === "Abnormal") return <AbnormalPage/>;
  return <Preassembly/>;
}


