"use client";
import CustomSelect from "@/components/shell/CustomSelect";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NavigateCost } from "@/data/costData";

type Page = "Overview" | "Abnormal Tracker";
type Direction = "lower" | "higher";
type Category = "S" | "Q" | "C" | "D" | "I" | "P" | "O";
type Kpi = { name: string; actual: number; display: string; target: number; targetLabel: string; direction: Direction; unit?: string; views: ("H" | "B")[]; external?: boolean; externalUrl?: string };

const categories: { key: Category; name: string; summary: string; abnormal: number }[] = [
  { key: "S", name: "Safety", summary: "3/4 on target", abnormal: 1 },
  { key: "Q", name: "Quality", summary: "2/3 on target", abnormal: 3 },
  { key: "D", name: "Delivery", summary: "0/2 on target", abnormal: 2 },
  { key: "C", name: "Cost", summary: "5/7 on target", abnormal: 0 },
  { key: "I", name: "Inventory", summary: "4/4 on target", abnormal: 1 },
  { key: "P", name: "Productivity", summary: "5/5 on target", abnormal: 2 },
  { key: "O", name: "Lainnya", summary: "1/4 on target", abnormal: 0 },
];

const kpis: Record<Category, Kpi[]> = {
  S: [
    { name: "Battery Safety", actual: 0, display: "0", target: 0, targetLabel: "0 kasus", direction: "lower", unit: "kasus", views: ["B"] },
    { name: "Safety Incident", actual: 1, display: "1", target: 0, targetLabel: "0 kasus", direction: "lower", unit: "kasus", views: ["B"] },
    { name: "Safety Information", actual: 100, display: "100%", target: 100, targetLabel: "100%", direction: "higher", views: ["B"] },
    { name: "Safety Material", actual: 0, display: "0", target: 0, targetLabel: "0 kasus", direction: "lower", unit: "kasus", views: ["B"] },
  ],
  Q: [
    { name: "FQC Rate", actual: 1.45, display: "1.45%", target: 1.5, targetLabel: "1.50%", direction: "lower", views: ["H", "B"] },
    { name: "OQC Rate", actual: 1.82, display: "1.82%", target: 1.2, targetLabel: "1.20%", direction: "lower", views: ["H", "B"] },
    { name: "ODM Rate", actual: 1.15, display: "1.15%", target: 1.3, targetLabel: "1.30%", direction: "lower", views: ["H", "B"] },
  ],
  D: [
    { name: "WO Close", actual: 94, display: "94%", target: 100, targetLabel: "100%", direction: "higher", views: ["H", "B"] },
    { name: "End-to-End Delivery", actual: 5.2, display: "5.2", target: 5, targetLabel: "5.0 hari", direction: "lower", unit: "hari", views: ["B"] },
  ],
  C: [
    { name: "NGP", actual: .98, display: "0.98%", target: 1, targetLabel: "1.00%", direction: "lower", views: ["H", "B"] },
    { name: "Single Labor Cost", actual: 1250, display: "Rp1,250", target: 1300, targetLabel: "Rp1,300/unit", direction: "lower", views: ["H", "B"] },
    { name: "UPPH", actual: 5.4, display: "5.4", target: 5.26, targetLabel: "5.26", direction: "higher", views: ["H", "B"] },
    { name: "OPE Pabrik", actual: 92, display: "92%", target: 95, targetLabel: "95%", direction: "higher", views: ["H"] },
    { name: "OPE Instalasi", actual: 96, display: "96%", target: 95, targetLabel: "95%", direction: "higher", views: ["H"] },
    { name: "OPE Packing", actual: 93, display: "93%", target: 95, targetLabel: "95%", direction: "higher", views: ["H"] },
    { name: "Losses Material", actual: .35, display: "0.35%", target: .4, targetLabel: "0.40%", direction: "lower", views: ["B"] },
  ],
  I: [
    { name: "WIP Warranty", actual: 890, display: "890", target: 900, targetLabel: "900 pcs", direction: "lower", unit: "pcs", views: ["H"] },
    { name: "WIP Rework", actual: 640, display: "640", target: 700, targetLabel: "700 pcs", direction: "lower", unit: "pcs", views: ["H"] },
    { name: "WIP Pre-assembly", actual: 2456, display: "2,456", target: 2800, targetLabel: "2,800 pcs", direction: "lower", unit: "pcs", views: ["H"] },
    { name: "Clearance Model", actual: 98, display: "98%", target: 95, targetLabel: "95%", direction: "higher", views: ["H"] },
  ],
  P: [
    { name: "Assembly Plan", actual: 12800, display: "12,800", target: 12500, targetLabel: "12,500 units", direction: "higher", unit: "units", views: ["H"] },
    { name: "Assembly Actual", actual: 12650, display: "12,650", target: 12500, targetLabel: "12,500 units", direction: "higher", unit: "units", views: ["H"] },
    { name: "Achievement Rate", actual: 98.8, display: "98.8%", target: 95, targetLabel: "95%", direction: "higher", views: ["H"] },
    { name: "Packaging Plan", actual: 9600, display: "9,600", target: 9500, targetLabel: "9,500 units", direction: "higher", unit: "units", views: ["H"] },
    { name: "FG Actual", actual: 9580, display: "9,580", target: 9500, targetLabel: "9,500 units", direction: "higher", unit: "units", views: ["H"] },
  ],
  O: [
    { name: "5S", actual: 88, display: "88%", target: 90, targetLabel: "90%", direction: "higher", views: ["H"], external: true },
    { name: "Lean 5S", actual: 82, display: "82%", target: 85, targetLabel: "85%", direction: "higher", views: ["B"] },
    { name: "Absensi Rate", actual: 97.5, display: "97.5%", target: 98, targetLabel: "98%", direction: "higher", views: ["H"], external: true },
    { name: "Lean DM", actual: 4.1, display: "4.1", target: 4, targetLabel: "4.0", direction: "higher", views: ["B"] },
  ],
};

const sqcdipLabels: Record<Category, string> = {
  S: "Safety",
  Q: "Quality",
  C: "Cost",
  D: "Delivery",
  I: "Inventory",
  P: "Productivity",
  O: "Lainnya",
};

const abnormalSeed = [
  { id: "ABN-001", date: "2026-10-01 09:30", title: "LCD bonding temperature fluctuation", area: "Pre Assembly", sqcdip: "Q" as Category, factor: "Machine", kpi: "Quality", severity: "Medium", problem: "LCD bonding machine temperature fluctuation caused slight adhesive peeling.", action: "Adjusted heater cartridge and recalibrated PID controller.", pic: "Ahmad Supriyadi", due: "2026-10-02", status: "Closed-Loop" },
  { id: "ABN-002", date: "2026-10-01 10:15", title: "Mainboard service rate deviation", area: "Service", sqcdip: "Q" as Category, factor: "Man", kpi: "Quality", severity: "High", problem: "Mainboard service rate dropped due to operator misjudge analysis on IC repair.", action: "Immediate re-training on BGA rework diagnostic manual.", pic: "Siti Rahma", due: "2026-10-02", status: "In Progress" },
  { id: "ABN-003", date: "2026-10-01 10:45", title: "Battery supplier PPM exceedance", area: "Warranty", sqcdip: "C" as Category, factor: "Material", kpi: "Cost", severity: "High", problem: "Phone off issue reported in market units exceeding standard PPM threshold.", action: "Quarantined batch #BT-992 from battery supplier.", pic: "Hendra Wijaya", due: "2026-10-03", status: "Open" },
  { id: "ABN-004", date: "2026-10-01 11:00", title: "Delivery delay on field installation", area: "Instalasi", sqcdip: "D" as Category, factor: "Method", kpi: "Delivery", severity: "Medium", problem: "Delivery delay caused by poor field installation sequencing and documentation gaps.", action: "Re-sequenced install steps and shared updated checklist with field team.", pic: "Dewi Lestari", due: "2026-10-02", status: "Closed-Loop" },
  { id: "ABN-2026-031", date: "02 Oct 2025", title: "Packing WIP above target", area: "Packing", sqcdip: "I" as Category, factor: "Method", kpi: "Packing WIP", severity: "High", pic: "Yusriyadi", due: "03 Oct", status: "Open" },
  { id: "ABN-2026-030", date: "02 Oct 2025", title: "OQC result below standard", area: "QC", sqcdip: "Q" as Category, factor: "Man", kpi: "OQC / FQC", severity: "High", pic: "Andri", due: "04 Oct", status: "On Progress" },
];

const areas = ["Pre Assembly", "Assembly", "Packing", "QC", "Warranty", "Service", "Instalasi", "Material"];
const factors = ["Man", "Machine", "Material", "Method", "Measurement", "Environment"];

function Icon({ name, size = 16 }: { name: "calendar"|"download"|"chevron"|"trend"|"close"|"plus"|"search"|"paperclip"|"target"|"upload"; size?: number }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4"/><path d="M4 19h16"/></>,
    chevron: <path d="m9 7 5 5-5 5"/>,
    trend: <><path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    paperclip: <path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 1 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.9-2.8l8.6-8.6"/>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></>,
    upload: <><path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 16v4h16v-4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const onTarget = (kpi: Kpi) => kpi.direction === "lower" ? kpi.actual <= kpi.target : kpi.actual >= kpi.target;

function Header({ tracker, onNew }: { tracker?: boolean; onNew?: () => void }) {
  const [period,setPeriod] = useState("Harian");
  return <header className="sq-header"><div><div className="sq-eyebrow">SQDCIP / {tracker ? "ABNORMAL TRACKER" : "OVERVIEW"}</div><h1>{tracker ? "Abnormal Tracker" : "SQDCIP"}</h1><p>{tracker ? "Kelola abnormal lintas kategori, faktor, dan area." : "Pantau performa Safety, Quality, Delivery, Cost, Inventory, dan Productivity."}</p></div><div className="sq-header-actions">
    {!tracker && <><button className="sq-outline"><Icon name="calendar"/>02 Oct 2025</button><CustomSelect defaultValue="Semua Shift" options={["Semua Shift", "Shift 1", "Shift 2"]} /><CustomSelect defaultValue="Semua Area" options={["Semua Area", ...areas]} /><div className="sq-period">{["Harian","MTD","YTD"].map((item)=><button className={period===item?"active":""} onClick={()=>setPeriod(item)} key={item}>{item}</button>)}</div></>}
    <button className="sq-outline"><Icon name="download"/>Export</button>{tracker&&<button className="sq-primary" onClick={onNew}><Icon name="plus"/>Abnormal Baru</button>}
  </div></header>;
}

function Spark({ good }: { good: boolean }) {
  return <svg className="sq-spark" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M1 24 10 21 19 23 28 16 37 19 46 10 55 14 64 8 73 11 82 5 91 9 99 3" fill="none" stroke={good?"var(--success)":"var(--danger)"} strokeWidth="2"/><path d="M1 30V24L10 21 19 23 28 16 37 19 46 10 55 14 64 8 73 11 82 5 91 9 99 3V30Z" fill={good?"var(--success-soft)":"var(--danger-soft)"}/></svg>;
}

function KpiCard({ kpi, category, onClick }: { kpi: Kpi; category: Category; onClick: () => void }) {
  const good = onTarget(kpi);
  const delta = Math.abs(kpi.actual-kpi.target);
  return <button className="sq-kpi" onClick={onClick}><div className="sq-kpi-head"><span>{kpi.name}</span><b>{category}</b></div><strong>{kpi.display} <small>{kpi.unit}</small></strong><p>Target: {kpi.targetLabel}</p><div className="sq-view-tags">{kpi.views.map((view)=><span key={view} className="sq-view-tag" title={view === "H" ? "Tampilan Harian" : "Tampilan Bulanan"}>{view}</span>)}</div><div className={`sq-status ${good?"good":"bad"}`}>{good?"On Target":"Off Target"} <span>{good?"↓":"↑"} {delta.toLocaleString()}</span></div><Spark good={good}/></button>;
}

function KpiDetail({ kpi, category, initialPeriod, onClose, onOpenCost }: { kpi: Kpi; category: Category; initialPeriod?: string; onClose: () => void; onOpenCost?: NavigateCost }) {
  const data = ["H1","H2","H3","H4","H5","H6","H7"].map((period,index)=>({ period, actual: kpi.actual*(.86+index*.025), target:kpi.target }));
  const [periodTab,setPeriodTab]=useState(initialPeriod ?? "Harian");
  return <><button className="sq-sheet-overlay" onClick={onClose}/><aside className="sq-sheet"><div className="sq-sheet-head"><div><span>{category} • KPI DETAIL</span><h2>{kpi.name}</h2></div><button onClick={onClose}><Icon name="close"/></button></div><div className="sq-detail-value"><strong>{kpi.display}</strong><span className={`sq-status ${onTarget(kpi)?"good":"bad"}`}>{onTarget(kpi)?"On Target":"Off Target"}</span><p>Target: {kpi.targetLabel}</p></div>{category === "C" && onOpenCost && <div className="sq-sheet-actions"><button className="sq-outline" onClick={() => onOpenCost("Monitoring", kpi.name === "Single Labour Cost" ? { kpiKey: "slc" } : undefined)}>Buka di Cost Monitoring →</button>{!onTarget(kpi) && <button className="sq-outline" onClick={() => onOpenCost("Losses Cost", kpi.name === "Single Labour Cost" ? { kpiKey: "slc" } : undefined)}>Lihat penyebab →</button>}</div>}<div className="sq-detail-tabs">{["Harian","Mingguan","Bulanan"].map((tab)=><button key={tab} className={periodTab===tab?"active":""} onClick={()=>setPeriodTab(tab)}>{tab}</button>)}</div><div className="sq-detail-chart"><ResponsiveContainer><LineChart data={data}><CartesianGrid vertical={false}/><XAxis dataKey="period" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip/><Legend/><Line dataKey="target" name="Target" stroke="var(--success)" strokeDasharray="5 5" dot={false}/><Line dataKey="actual" name="Actual" stroke="var(--chart-1)" strokeWidth={2}/></LineChart></ResponsiveContainer></div><h3>Kontribusi per area</h3><table className="sq-table"><thead><tr><th>Area</th><th>Actual</th><th>Kontribusi</th><th>Status</th></tr></thead><tbody>{areas.slice(0,5).map((area,index)=><tr key={area}><td>{area}</td><td>{(kpi.actual*(.13+index*.02)).toFixed(1)}</td><td>{15+index*3}%</td><td><span className={`sq-dot ${index===2?"bad":"good"}`}/></td></tr>)}</tbody></table><h3>Abnormal terkait</h3><div className="sq-related">{abnormalSeed.filter((item)=>item.sqcdip===category).map((item)=><div key={item.id}><b>{item.id}</b><span>{item.title}</span><em>{item.status}</em></div>)}{!abnormalSeed.some((item)=>item.sqcdip===category)&&<p>Belum ada abnormal terkait.</p>}</div></aside></>;
}

function TodayAbnormal({ category, onReset }: { category: Category | null; onReset: () => void }) {
  const items = (category ? abnormalSeed.filter((item) => item.sqcdip === category) : abnormalSeed).slice(0, 5);
  const subtitle = category ? `${items.length} laporan ${sqcdipLabels[category]} terbaru` : "5 laporan terbaru";
  return <aside className="sq-panel today-abnormal"><div className="sq-panel-head"><div><h2>Abnormal Hari Ini</h2><p>{subtitle}</p></div><button onClick={onReset}>Lihat semua</button></div><div className="today-list">{items.length ? items.map((item)=><article key={item.id}><div className="today-badges"><b className={`cat-${item.sqcdip}`}>{item.sqcdip}</b><span>{item.factor}</span></div><h3>{item.title}</h3><p>{item.area} • PIC {item.pic}</p><em className={`ab-status ${item.status.toLowerCase().replace(" ","-")}`}>{item.status}</em></article>) : <div className="abnormality-empty">Belum ada laporan abnormal.</div>}</div></aside>;
}

function Overview({ onOpenCost }: { onOpenCost?: NavigateCost }) {
  const [selected,setSelected]=useState<Category|null>(null);
  const [collapsed,setCollapsed]=useState<Category[]>([]);
  const [detail,setDetail]=useState<{kpi:Kpi;category:Category;initialPeriod:string}|null>(null);
  const visible=selected?categories.filter((item)=>item.key===selected):categories;
  const getState=(item:{abnormal:number})=>item.abnormal===0?"good":item.abnormal<=2?"warning":"bad";
  return <div className="sqcdip-content"><Header/><div className="sq-tiles">{categories.map((item)=>{const state=item.key==="O"?"neutral":getState(item);return <button className={`${state} ${selected===item.key?"active":""}`.trim()} onClick={()=>setSelected(selected===item.key?null:item.key)} key={item.key}><strong>{item.key}</strong><div><h2>{item.name}</h2><p>{item.summary}</p></div><span className={`sq-big-dot ${state}`}/><em>{item.abnormal} open</em></button>;})}</div><div className="sq-overview-main"><div className="sq-sections">{visible.map((category)=><section className="sq-panel sq-category" key={category.key}><button className="sq-category-head" onClick={()=>setCollapsed((current)=>current.includes(category.key)?current.filter((key)=>key!==category.key):[...current,category.key])}><span>{category.key}</span><div><h2>{category.name}</h2><p>{category.summary}</p></div><Icon name="chevron"/></button>{!collapsed.includes(category.key)&&<div className="sq-kpi-grid">{kpis[category.key].map((kpi)=><KpiCard key={kpi.name} kpi={kpi} category={category.key} onClick={()=>{ if (kpi.externalUrl) { window.open(kpi.externalUrl, "_blank", "noopener,noreferrer"); return; } setDetail({ kpi, category: category.key, initialPeriod: kpi.views[0] === "B" ? "Bulanan" : "Harian" }); }}/>)}</div>}</section>)}</div><TodayAbnormal category={selected} onReset={() => setSelected(null)} /></div>{detail&&<KpiDetail {...detail} onClose={()=>setDetail(null)} onOpenCost={onOpenCost}/>}</div>;
}

const heatValues = [[1,0,2,1,0,0],[3,1,2,2,1,0],[0,1,3,2,0,1],[1,2,1,3,2,0],[0,1,2,1,3,1],[2,1,0,2,2,1],[0,1,0,0,1,0]];

function Heatmap({ onFilter }: { onFilter:(category:Category,factor:string)=>void }) {
  return <section className="sq-panel tracker-heat"><div className="sq-panel-head"><div><h2>SQDCIP × 5M1E</h2><p>Intensitas abnormal berdasarkan akar masalah</p></div></div><div className="heat-grid"><span/>{factors.map((factor)=><b key={factor}>{factor}</b>)}{categories.map((category,row)=><div className="heat-row" key={category.key}><strong>{category.key}</strong>{factors.map((factor,col)=><button className={`level-${heatValues[row][col]}`} onClick={()=>onFilter(category.key,factor)} key={factor}>{heatValues[row][col]}</button>)}</div>)}</div></section>;
}

function NewAbnormalSheet({ onClose, onSave }: { onClose:()=>void; onSave:(title:string)=>void }) {
  const [category,setCategory]=useState<Category>("S");
  return <><button className="sq-sheet-overlay" onClick={onClose}/><aside className="sq-sheet new-abnormal"><form onSubmit={(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);onSave(String(data.get("title")))}}><div className="sq-sheet-head"><div><span>CREATE RECORD</span><h2>Abnormal Baru</h2></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="sq-form"><label>Judul abnormal<input name="title" required placeholder="Ringkasan kejadian..."/></label><div className="sq-form-grid"><label>Tanggal & jam<input type="datetime-local" required/></label><label>Shift<CustomSelect defaultValue="Shift 1" options={["Shift 1", "Shift 2", "Shift 3"]} /></label></div><label>Area<CustomSelect defaultValue={areas[0] ?? ""} options={areas} /></label><label>Kategori SQDCIP<div className="category-segment">{categories.map((item)=><button type="button" className={category===item.key?"active":""} onClick={()=>setCategory(item.key)} key={item.key}>{item.key}</button>)}</div></label><label>KPI terdampak<CustomSelect defaultValue={kpis[category][0]?.name ?? ""} options={kpis[category].map((kpi) => kpi.name)} /></label><label>Kategori 5M1E<div className="factor-checks">{factors.map((factor)=><label key={factor}><input type="checkbox"/>{factor}</label>)}</div></label><div className="sq-form-grid"><label>Severity<CustomSelect defaultValue="Low" options={["Low", "Medium", "High"]} /></label><label>PIC<CustomSelect defaultValue="Yusriyadi" options={["Yusriyadi", "Andri", "Rina"]} /></label><label>Due date<input type="date"/></label></div><label>Deskripsi<textarea rows={4}/></label><label>Containment action<textarea rows={3}/></label><label className="sq-dropzone"><Icon name="upload"/><strong>Upload attachment</strong><span>Drop file atau klik untuk memilih</span><input type="file" multiple/></label></div><div className="sq-sheet-actions"><button type="button" className="sq-outline" onClick={onClose}>Batal</button><button className="sq-primary">Simpan Abnormal</button></div></form></aside></>;
}

function Tracker({ onOpenCost }: { onOpenCost?: NavigateCost }) {
  const [view,setView]=useState<"table"|"kanban">("table");
  const [newOpen,setNewOpen]=useState(false);
  const [records,setRecords]=useState(abnormalSeed);
  const [query,setQuery]=useState("");
  const [catFilter,setCatFilter]=useState<Category|null>(null);
  const [factorFilter,setFactorFilter]=useState<string|null>(null);
  const [toast,setToast]=useState(false);
  const filtered=useMemo(()=>records.filter((item)=>item.title.toLowerCase().includes(query.toLowerCase())&&(!catFilter||item.sqcdip===catFilter)&&(!factorFilter||item.factor===factorFilter)),[records,query,catFilter,factorFilter]);
  const counts={ total:records.length, open:records.filter((r)=>r.status==="Open").length, progress:records.filter((r)=>["On Progress","In Progress"].includes(r.status)).length, closed:records.filter((r)=>["Closed","Closed-Loop"].includes(r.status)).length };
  const move=(id:string,status:string)=>setRecords((current)=>current.map((record)=>record.id===id?{...record,status}:record));
  const add=(title:string)=>{setRecords((current)=>[{...abnormalSeed[0],id:`ABN-2026-${String(32+current.length).padStart(3,"0")}`,title},...current]);setNewOpen(false);setToast(true);window.setTimeout(()=>setToast(false),2500)};
  return <div className="sqcdip-content"><Header tracker onNew={()=>setNewOpen(true)}/><div className="tracker-kpis">{[{label:"Total Abnormal",value:counts.total},{label:"Open",value:counts.open},{label:"On Progress",value:counts.progress},{label:"Closed",value:counts.closed},{label:"Rata-rata Hari",value:"3.2"},{label:"Overdue",value:2,bad:true}].map((item)=><button className={item.bad?"bad":""} key={item.label}><span>{item.label}</span><strong>{item.value}</strong><p>Updated today</p></button>)}</div><div className="tracker-analytics"><Heatmap onFilter={(cat,factor)=>{setCatFilter(cat);setFactorFilter(factor)}}/><section className="sq-panel area-bar"><div className="sq-panel-head"><div><h2>Abnormal per Area</h2><p>Distribusi laporan aktif</p></div></div><div><ResponsiveContainer><BarChart data={areas.map((area,index)=>({area,value:[3,5,4,6,2,3,4][index]}))} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 8 }}><CartesianGrid horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="area" axisLine={false} tickLine={false} width={110} tick={{ fontSize: 10, fill: "var(--muted)" }}/><Tooltip/><Bar dataKey="value" fill="var(--chart-1)" radius={6}/></BarChart></ResponsiveContainer></div></section><section className="sq-panel status-donut"><div className="sq-panel-head"><div><h2>Status</h2><p>Komposisi abnormal</p></div></div><div className="donut-ring" style={{background:`conic-gradient(var(--danger) 0 ${counts.open/records.length*100}%,var(--chart-1) 0 ${(counts.open+counts.progress)/records.length*100}%,var(--success) 0)`}}><span><strong>{records.length}</strong><small>Total</small></span></div><div className="donut-legend"><span><i className="open"/>Open</span><span><i className="progress"/>On Progress</span><span><i className="closed"/>Closed</span></div></section></div><section className="sq-panel tracker-list"><div className="tracker-toolbar"><label><Icon name="search"/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Cari ID atau judul..."/></label><div className="filter-chips">{categories.map((cat)=><button className={catFilter===cat.key?"active":""} onClick={()=>setCatFilter(catFilter===cat.key?null:cat.key)} key={cat.key}>{cat.key}</button>)}</div><CustomSelect value={factorFilter ?? ""} options={[{ value: "", label: "Semua 5M1E" }, ...factors]} onChange={(next) => setFactorFilter(next || null)} /><CustomSelect defaultValue="Semua Area" options={["Semua Area", ...areas]} /><CustomSelect defaultValue="Semua Severity" options={["Semua Severity", "High", "Medium", "Low"]} /><div className="view-toggle"><button className={view==="table"?"active":""} onClick={()=>setView("table")}>Tabel</button><button className={view==="kanban"?"active":""} onClick={()=>setView("kanban")}>Kanban</button></div></div>{view==="table"?<div className="sq-table-wrap"><table className="sq-table abnormal-table"><thead><tr><th>ID</th><th>Date</th><th>Area</th><th>SQDCIP</th><th>5M1E</th><th>Problem</th><th>PIC</th><th>Status</th><th>Action</th></tr></thead><tbody>{filtered.map((item)=><tr key={item.id}><td><strong>{item.id}</strong></td><td>{item.date}</td><td>{item.area}</td><td><b className={`sq-badge cat-${item.sqcdip}`}>{sqcdipLabels[item.sqcdip]}</b></td><td><span className="factor-badge">{item.factor}</span></td><td className="tracker-problem">{item.problem ?? item.title}</td><td>{item.pic}</td><td><span className={`ab-status ${item.status.toLowerCase().replace(/\s+/g,"-").replace(/-+/g,"-")}`}>{item.status}</span></td><td className="tracker-action">{item.action ?? "—"}</td><td>•••</td></tr>)}</tbody></table></div>:<div className="kanban">{["Open","On Progress","Closed"].map((status)=><section onDragOver={(event)=>event.preventDefault()} onDrop={(event)=>move(event.dataTransfer.getData("text/plain"),status)} key={status}><header><span>{status}</span><b>{filtered.filter((item)=>item.status===status).length}</b></header>{filtered.filter((item)=>item.status===status).map((item)=><article draggable onDragStart={(event)=>event.dataTransfer.setData("text/plain",item.id)} key={item.id}><small>{item.id}</small><h3>{item.title}</h3><div><b className={`sq-badge cat-${item.sqcdip}`}>{item.sqcdip}</b><span className="factor-badge">{item.factor}</span></div><p>{item.pic}<span>Due {item.due}</span></p></article>)}</section>)}</div>}</section>{newOpen&&<NewAbnormalSheet onClose={()=>setNewOpen(false)} onSave={add}/>} {toast&&<div className="sq-toast">✓ Abnormal berhasil dibuat</div>}</div>;
}

export default function SqcdipDashboard({ page, onOpenCost }: { page: Page; onOpenCost?: NavigateCost }) {
  return page === "Overview" ? <Overview onOpenCost={onOpenCost}/> : <Tracker onOpenCost={onOpenCost}/>;
}



