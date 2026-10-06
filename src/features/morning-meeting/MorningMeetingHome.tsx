import { picAreaOptions, type PicAreaKey } from "@/components/providers/RoleProvider";
import type { Role } from "@/types/morningMeeting";
import AiWarningRibbon from "@/features/morning-meeting/AiWarningRibbon";
import KpiStatusCard from "@/features/morning-meeting/KpiStatusCard";
import { filterInsightsByArea, filterProjectsByArea, formatKpiValue, formatProjectValue, formatTarget, getDimensionStatus, getExceptionInsights, getKpiInsights, getOffTrackProjects, getSafeKpiCount, kpiAreaMap } from "@/features/morning-meeting/morningMeetingUtils";

type MorningMeetingHomeProps = {
  role: Role;
  picArea: PicAreaKey;
  onNavigate: (target: string) => void;
};

const dimensions = ["S", "Q", "C", "D", "I", "P"] as const;
const escalations = ["Countermeasure E2E menunggu persetujuan perubahan slot material.", "Losses Material butuh keputusan batas scrap dan audit gudang H+1.", "SMED masih di atas target 6H, minta eskalasi support Lean."];

export default function MorningMeetingHome({ role, picArea, onNavigate }: MorningMeetingHomeProps) {
  const exceptions = getExceptionInsights();
  const offTrackProjects = getOffTrackProjects();
  const allOutTarget = getKpiInsights().filter((item) => item.status === "merah" || item.status === "kuning");
  const picInsights = filterInsightsByArea(picArea);
  const picProjects = filterProjectsByArea(picArea);
  const areaLabel = picAreaOptions.find((item) => item.key === picArea)?.label ?? picArea;

  if (role === "HOD") {
    const attentionCount = exceptions.length + offTrackProjects.length;
    return <div className="mm-page mm-hod"><AiWarningRibbon onNavigate={onNavigate} /><section className="mm-hero"><div><span>Morning Meeting HOD</span><h1>{attentionCount} item perlu perhatian</h1><p>Eksepsi Juli 2026, KPI hijau dan tren aman disembunyikan dari layar utama.</p></div><div className="mm-dimension-strip">{dimensions.map((dimension) => <button key={dimension} className={getDimensionStatus(dimension)}>{dimension}</button>)}</div></section><div className="mm-hod-grid"><section className="mm-panel mm-attention"><div className="mm-panel-head"><h2>Perlu Perhatian</h2><button onClick={() => onNavigate("Production KPI")}>Detail KPI</button></div><div className="mm-card-grid">{exceptions.slice(0, 7).map((item) => <KpiStatusCard key={item.row.kpi.id} title={item.row.kpi.nama} meta={`${item.row.kpi.dimensi} · ${item.row.pic ?? item.row.kpi.picUtama}`} value={formatKpiValue(item.row.kpi, item.latestValue)} target={`T1 ${formatTarget(item.row.kpi, item.row.target.t1)} · T2 ${formatTarget(item.row.kpi, item.row.target.t2)}`} status={item.status} reason={item.reason} actions onDetail={() => onNavigate("Production KPI")} />)}</div></section><aside className="mm-panel mm-escalation"><h2>Keputusan dan Eskalasi</h2>{escalations.map((item) => <div className="mm-decision" key={item}><strong>Butuh keputusan HOD</strong><p>{item}</p></div>)}</aside></div><section className="mm-panel"><div className="mm-panel-head"><h2>Proyek Strategis Off-track</h2><button onClick={() => onNavigate("Project 2026")}>Lihat proyek</button></div><div className="mm-project-row">{offTrackProjects.map((project) => <article key={project.id}><b>{project.nama}</b><span>{project.kategori} · {project.pic}</span><p>Q2 {formatProjectValue(project.q2)} · target {project.target}</p></article>)}</div></section><button className="mm-fold">Lihat semua ({getSafeKpiCount()} KPI aman disembunyikan)</button></div>;
  }

  if (role === "PIC Area") {
    return <div className="mm-page"><AiWarningRibbon onNavigate={onNavigate} /><section className="mm-hero compact"><div><span>Morning Meeting PIC</span><h1>{areaLabel}</h1><p>Hanya KPI dan not achieved yang relevan dengan area terpilih.</p></div></section><section className="mm-panel"><h2>Not Achieved Area</h2><div className="mm-card-grid">{picInsights.length ? picInsights.map((item) => <KpiStatusCard key={item.row.kpi.id} title={item.row.kpi.nama} meta={`${item.row.kpi.dimensi} · ${item.row.pic ?? item.row.kpi.picUtama}`} value={formatKpiValue(item.row.kpi, item.latestValue)} target={`T1 ${formatTarget(item.row.kpi, item.row.target.t1)} · T2 ${formatTarget(item.row.kpi, item.row.target.t2)}`} status={item.status} reason={item.reason} />) : <p className="mm-empty">Tidak ada KPI merah/kuning untuk area ini pada Juli 2026.</p>}</div></section><section className="mm-panel"><h2>Project Follow-up Area</h2><div className="mm-project-row">{picProjects.length ? picProjects.map((project) => <article key={project.id}><b>{project.nama}</b><span>{project.kategori} · {project.pic}</span><p>Q2 {formatProjectValue(project.q2)} · {project.progress.find((item) => item.kuartal === "Q2")?.status}</p></article>) : <article><b>Belum ada proyek area yang perlu eskalasi</b><span>{areaLabel}</span><p>Semua item yang dilaporkan masih on-track atau belum masuk scope area ini.</p></article>}</div></section></div>;
  }

  return <div className="mm-page"><AiWarningRibbon onNavigate={onNavigate} /><section className="mm-hero"><div><span>Morning Meeting</span><h1>Important Review Juli 2026</h1><p>Ringkasan untuk {role}: fokus pada 3 cek awal, status SQCDIP, dan KPI/proyek tidak achieve.</p></div><div className="mm-important"><article><b>Big Problem Q&S</b><strong>Aman</strong><p>Data Juli menunjukkan 0 kasus.</p></article><article><b>Masalah meeting pagi</b><strong>Perlu pantau</strong><p>2 proyek strategis butuh follow-up lintas area.</p></article><article><b>KPI/proyek tidak achieve</b><strong>{allOutTarget.length + offTrackProjects.length}</strong><p><button onClick={() => onNavigate("Production KPI")}>Buka Production KPI</button></p></article></div></section><section className="mm-panel"><h2>Status SQCDIP</h2><div className="mm-dimension-strip wide">{dimensions.map((dimension) => <button key={dimension} className={getDimensionStatus(dimension)}>{dimension}</button>)}</div></section><section className="mm-panel"><div className="mm-panel-head"><h2>KPI di Luar Target</h2><button onClick={() => onNavigate("Production KPI")}>Lihat 17 KPI</button></div><div className="mm-card-grid">{allOutTarget.map((item) => <KpiStatusCard key={item.row.kpi.id} title={item.row.kpi.nama} meta={`${item.row.kpi.dimensi} · ${kpiAreaMap[item.row.kpi.id] ?? "general"}`} value={formatKpiValue(item.row.kpi, item.latestValue)} target={`T1 ${formatTarget(item.row.kpi, item.row.target.t1)} · T2 ${formatTarget(item.row.kpi, item.row.target.t2)}`} status={item.status} reason={item.reason} />)}</div></section></div>;
}
