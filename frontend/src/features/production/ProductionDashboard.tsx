"use client";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
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

type Navigate = (page: string) => void;

const outputData = [
  { day: "Mon", actual: 1180, target: 1285 }, { day: "Tue", actual: 1250, target: 1285 },
  { day: "Wed", actual: 1090, target: 1285 }, { day: "Thu", actual: 1320, target: 1285 },
  { day: "Fri", actual: 1210, target: 1285 }, { day: "Sat", actual: 1370, target: 1285 },
  { day: "Sun", actual: 1030, target: 1285 },
];

const areaCards = [
  { name: "Pre-Assembly", target: "Pre-Assembly", score: "6/9", status: "partial", kpis: [["WIP","2,456 pcs","good"],["NG Produksi","0.98%","good"],["QA Pass","100%","good"]] },
  { name: "Assembly", target: "Assembly", score: "5/7", status: "partial", kpis: [["OQC/FQC","98.9%","bad"],["UPPH","6.8","bad"],["WIP","1,840 pcs","good"]] },
  { name: "Packing", target: "Packing", score: "4/7", status: "bad", kpis: [["OQC/FQC","99.2%","good"],["Workorder Close","92%","bad"],["WIP","1,120 pcs","bad"]] },
  { name: "QC", target: "QC", score: "5/7", status: "partial", kpis: [["OQC Eksternal","99.1%","good"],["Simulasi Harian","92","bad"],["Kehadiran","97%","bad"]] },
  { name: "Warranty", target: "Warranty", score: "1/1", status: "good", kpis: [["Quantity","45 unit","good"],["Claim rate","0.3%","good"],["Response","2.1h","good"]] },
  { name: "Service", target: "Service", score: "2/3", status: "partial", kpis: [["Success Rate","92%","bad"],["WIP","320 pcs","good"],["Rate Unit","1.8%","good"]] },
  { name: "Material", target: "Material", score: "2/3", status: "partial", kpis: [["Hari Stok","12.4","good"],["Clearance","4x/minggu","good"],["2x Clearance","2 kali","bad"]] },
];

const offTarget = [
  ["Output Finished Good","Packing","P","8,450","9,000","-6.1%","Yusriyadi"],
  ["OPE","Assembly","P","92%","95%","-3.2%","Andri"],
  ["Workorder Close","Packing","D","94%","100%","-6.0%","Rina"],
  ["OTP / OTPR","QC","Q","96.5%","98%","-1.5%","Dimas"],
  ["FPY","Assembly","Q","97.8%","98%","-0.2%","Nadia"],
  ["Packing WIP","Packing","I","1,120","1,000","+12.0%","Fajar"],
  ["End-to-End Delivery","Material","D","5.2","5.0","+4.0%","Yuni"],
  ["OQC / FQC","Assembly","Q","98.9%","99%","-0.1%","Ari"],
];

const abnormalities = [
  ["I","Method","Packing WIP above target","Packing","Yusriyadi","Open"],
  ["Q","Man","OQC result below standard","QC","Andri","On Progress"],
  ["S","Machine","Line incident at Station 4","Assembly","Rina","Open"],
  ["D","Material","Workorder close delayed","Service","Dimas","On Progress"],
  ["P","Measurement","Finished good output gap","Packing","Nadia","Closed"],
];

const wipData = [
  { area:"Pre-Assembly",actual:2456,target:2800 },{ area:"Assembly",actual:1840,target:2000 },
  { area:"Packing",actual:1120,target:1000 },{ area:"Service Mainboard",actual:320,target:400 },
  { area:"Unit External",actual:85,target:100 },
];
const ngData = [
  {day:"Mon",pre:.98,assembly:.82,packing:.73,standard:1},{day:"Tue",pre:1.08,assembly:.9,packing:.84,standard:1},
  {day:"Wed",pre:.94,assembly:.88,packing:1.04,standard:1},{day:"Thu",pre:.92,assembly:1.02,packing:.9,standard:1},
  {day:"Fri",pre:1.03,assembly:.91,packing:.87,standard:1},{day:"Sat",pre:.89,assembly:.84,packing:.79,standard:1},
  {day:"Sun",pre:.98,assembly:.87,packing:.82,standard:1},
];

function Icon({ name }: { name: "calendar"|"download"|"trend"|"factory"|"arrow"|"alert" }) {
  const paths = {
    calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    download:<><path d="M12 3v12m-4-4 4 4 4-4"/><path d="M4 19h16"/></>,
    trend:<><path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/></>,
    factory:<><path d="M3 21h18M5 21V10l5 3V8l5 3V4h4v17"/><path d="M8 17h1m4 0h1m4 0h1"/></>,
    arrow:<><path d="M5 12h14m-5-5 5 5-5 5"/></>,
    alert:<><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5m0 3h.01"/></>,
  };
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

type KpiTone = "good" | "bad" | "warning" | "neutral" | "featured";

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: KpiTone }) {
  return <span className={`status-pill status-pill--${tone}`}>{label}</span>;
}

function Sparkline({ tone = "good", featured = false }: { tone?: KpiTone; featured?: boolean }) {
  const values = [10, 18, 16, 20, 18, 22, 17, 24, 21, 26, 23, 28];
  const stroke = featured ? "#ffffff" : tone === "bad" ? "var(--danger)" : tone === "warning" ? "var(--accent-amber)" : "var(--primary)";
  const fill = featured ? "rgba(255,255,255,0.14)" : tone === "bad" ? "rgba(214,69,69,0.10)" : tone === "warning" ? "rgba(245,158,11,0.12)" : "rgba(21,103,74,0.12)";

  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={values.map((value, index) => ({ index, value }))} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-fill-${featured ? "featured" : tone}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={featured ? 0.42 : 0.32} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} fill={`url(#spark-fill-${featured ? "featured" : tone})`} fillOpacity={1} dot={false} activeDot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function KpiCard({ item, onClick }: { item: { name: string; value: string; unit?: string; target: string; delta: string; go: string; focus?: boolean }; onClick: () => void }) {
  const isBad = item.delta.startsWith("-") || item.delta === "Needs action";
  const isWarning = item.delta === "Needs action";
  const tone: KpiTone = item.focus ? "good" : isWarning ? "warning" : isBad ? "bad" : "good";
  const statusLabel = item.delta === "Needs action" ? "Needs action" : isBad ? "Off Target" : "On Target";
  const helperText = item.name === "Abnormal Terbuka" ? "2 overdue · Needs action" : undefined;

  return (
    <button type="button" className={`pd-kpi-card ${item.focus ? "featured" : ""}`} onClick={onClick}>
      <div className="pd-kpi-head">
        <span className="pd-kpi-label">{item.name}</span>
        <StatusPill label={statusLabel} tone={item.focus ? "featured" : isWarning ? "warning" : isBad ? "bad" : "good"} />
      </div>

      <div className="pd-kpi-main">
        <span className="pd-kpi-value">{item.value}</span>
        {item.unit ? <span className="pd-kpi-unit">{item.unit}</span> : null}
      </div>

      <div className="pd-kpi-foot">
        <div className="pd-kpi-foot-row">
          <span>Target: {item.target}</span>
          <span className={`pd-kpi-delta pd-kpi-delta--${item.focus ? "featured" : isWarning ? "warning" : isBad ? "bad" : "good"}`}>{item.delta}</span>
        </div>
        {helperText ? <span className="pd-kpi-helper">{helperText}</span> : null}
      </div>

      <div className="pd-kpi-spark">
        <Sparkline tone={tone} featured={Boolean(item.focus)} />
      </div>
    </button>
  );
}

export default function ProductionDashboard({ onNavigate }: { onNavigate: Navigate }) {
  const [loading,setLoading]=useState(true);
  const [period,setPeriod]=useState("2025");
  const [hovered,setHovered]=useState<number|null>(null);
  useEffect(()=>{const timer=window.setTimeout(()=>setLoading(false),450);return()=>window.clearTimeout(timer)},[]);
  if(loading)return <div className="pd-skeleton"><i/><div>{Array.from({length:5},(_,index)=><b key={index}/>)}</div><section><b/><b/></section></div>;
  const kpiCards=[
    {name:"Output Finished Good",value:"8,450",unit:"unit",target:"9,000",delta:"-6.1%",focus:true,go:"SQCDIP Overview"},
    {name:"OPE",value:"92%",target:"95%",delta:"-3.2%",go:"SQCDIP Overview"},
    {name:"OQC / FQC",value:"98.9%",target:"99%",delta:"-0.1%",go:"SQCDIP Overview"},
    {name:"Workorder Close",value:"94%",target:"100%",delta:"-6.0%",go:"SQCDIP Overview"},
    {name:"Abnormal Terbuka",value:"7",unit:"kasus",target:"2 overdue",delta:"Needs action",go:"Abnormal Tracker"},
  ];
  return <div className="production-dashboard"><header className="pd-header"><div><span>PRODUCTION ANALYTICS</span><h1>Production Overview</h1><p>Ringkasan performa semua area produksi</p></div><div><button><Icon name="calendar"/>30 Sep – 06 Oct 2025</button><select><option>Semua Shift</option><option>Shift 1</option><option>Shift 2</option></select><button><Icon name="download"/>Export</button></div></header>
    <div className="pd-kpis">{kpiCards.map((item)=><KpiCard item={item} onClick={()=>onNavigate(item.go)} key={item.name} />)}</div>
    <div className="pd-row-two"><article className="pd-panel output-chart"><div className="pd-panel-head"><div><h2>Output vs Target</h2><p>Actual production output per day</p></div><select value={period} onChange={(e)=>setPeriod(e.target.value)}><option>2025</option><option>2024</option></select></div><div className="pd-chart"><ResponsiveContainer><BarChart data={outputData} onMouseMove={(state)=>setHovered(typeof state?.activeTooltipIndex==="number"?state.activeTooltipIndex:null)} onMouseLeave={()=>setHovered(null)}><CartesianGrid vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10}/><Tooltip cursor={{fill:"var(--chart-cursor)"}}/><Legend/><Bar dataKey="actual" name="Actual" fill="var(--chart-1)" radius={6} maxBarSize={28}>{outputData.map((_,index)=><Cell key={index} opacity={hovered===null||hovered===index?1:.6}/>)}</Bar><Bar dataKey="target" name="Target" fill="var(--chart-2)" radius={6} maxBarSize={28}>{outputData.map((_,index)=><Cell key={index} opacity={hovered===null||hovered===index?1:.6}/>)}</Bar></BarChart></ResponsiveContainer></div><footer><strong>Trending up by 5.2% this month <Icon name="trend"/></strong><span>Showing production output for the last 7 days</span></footer></article>
      <article className="pd-panel kpi-donut"><div className="pd-panel-head"><div><h2>Status KPI Semua Area</h2><p>Ringkasan pencapaian target</p></div></div><div className="pd-donut"><span><strong>25</strong><small>KPI</small></span></div><div className="pd-donut-legend"><span><i className="good"/>On Target <b>18</b></span><span><i className="bad"/>Off Target <b>7</b></span></div></article></div>
    <section className="pd-section"><div className="pd-section-head"><div><h2>Ringkasan per Area</h2><p>Status KPI utama seluruh area produksi</p></div></div><div className="pd-area-grid">{areaCards.map((area)=><button className="pd-area-card" onClick={()=>onNavigate(area.target)} key={area.name}><div className="pd-area-head"><span><Icon name="factory"/></span><div><h3>{area.name}</h3><p>{area.score} on target</p></div><i className={area.status}/></div><div className="pd-area-kpis">{area.kpis.map(([name,value,status])=><div key={name}><span>{name}</span><b>{value}</b><i className={status}/></div>)}</div><footer>Lihat detail <Icon name="arrow"/></footer></button>)}<button className="pd-all-areas"><span>7</span><strong>Semua Area</strong><p>Lihat performa lengkap</p><Icon name="arrow"/></button></div></section>
    <div className="pd-row-four"><article className="pd-panel off-target"><div className="pd-panel-head"><div><h2>KPI Off Target</h2><p>KPI dengan gap terjauh dari target</p></div><button onClick={()=>onNavigate("SQCDIP Overview")}>Lihat semua</button></div><div className="pd-table-wrap"><table><thead><tr><th>KPI</th><th>Area</th><th>SQCDIP</th><th>Actual</th><th>Target</th><th>Gap</th><th>PIC</th><th/></tr></thead><tbody>{offTarget.map((row)=><tr key={row[0]}>{row.slice(0,7).map((value,index)=><td key={index}>{index===0?<strong>{value}</strong>:index===2?<b className="pd-sq-badge">{value}</b>:index===5?<span className="pd-gap">{value}</span>:value}</td>)}<td><button onClick={()=>onNavigate("Abnormal Tracker")}>Lapor Abnormal</button></td></tr>)}</tbody></table></div></article><article className="pd-panel recent-abnormal"><div className="pd-panel-head"><div><h2>Abnormal Terbaru</h2><p>5 laporan terakhir</p></div></div>{abnormalities.map((item)=><div className="pd-abnormal-item" key={item[2]}><div><b>{item[0]}</b><span>{item[1]}</span></div><h3>{item[2]}</h3><p>{item[3]} • PIC {item[4]}</p><em className={item[5].toLowerCase().replace(" ","-")}>{item[5]}</em></div>)}<button className="pd-tracker-link" onClick={()=>onNavigate("Abnormal Tracker")}>Buka Abnormal Tracker <Icon name="arrow"/></button></article></div>
    <div className="pd-row-five"><article className="pd-panel"><div className="pd-panel-head"><div><h2>WIP per Area</h2><p>Actual inventory dibanding target</p></div></div><div className="pd-wide-chart"><ResponsiveContainer><BarChart data={wipData} layout="vertical"><CartesianGrid horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="area" axisLine={false} tickLine={false} width={110}/><Tooltip/><Legend/><Bar dataKey="actual" name="Actual" fill="var(--chart-1)" radius={6}/><Bar dataKey="target" name="Target" fill="var(--chart-2)" radius={6}/></BarChart></ResponsiveContainer></div></article><article className="pd-panel"><div className="pd-panel-head"><div><h2>NG Rate per Area</h2><p>7 hari terakhir • Standar 1.00%</p></div></div><div className="pd-wide-chart"><ResponsiveContainer><LineChart data={ngData}><CartesianGrid vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis domain={[0,1.3]} axisLine={false} tickLine={false}/><Tooltip/><Legend/><Line dataKey="pre" name="Pre-Assembly" stroke="var(--chart-1)" strokeWidth={2}/><Line dataKey="assembly" name="Assembly" stroke="var(--chart-2)" strokeWidth={2}/><Line dataKey="packing" name="Packing" stroke="var(--chart-3)" strokeWidth={2}/><Line dataKey="standard" name="Standard" stroke="var(--success)" strokeDasharray="5 5" dot={false}/></LineChart></ResponsiveContainer></div></article></div>
  </div>;
}


