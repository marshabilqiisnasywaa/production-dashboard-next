import { project2026Rows } from "@/data/morningMeetingProjectData";
import { formatProjectValue } from "@/features/morning-meeting/morningMeetingUtils";

const categories = ["Delivery", "Quality", "Cost", "Lean", "Digitalisasi", "Other"] as const;

export default function Project2026Page() {
  return <div className="mm-page"><section className="mm-hero compact"><div><span>Project 2026</span><h1>24 Proyek Strategis</h1><p>Q1 dan Q2 berasal dari JSON. Q3 dan Q4 masih kosong bila belum dilaporkan.</p></div></section>{categories.map((category) => { const projects = project2026Rows.filter((project) => project.kategori === category); return <section className="mm-panel" key={category}><h2>{category}</h2><div className="mm-table-wrap"><table className="mm-table project"><thead><tr><th>Project</th><th>Target</th><th>PIC</th><th>Level</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Status</th></tr></thead><tbody>{projects.map((project) => { const q2Status = project.progress.find((item) => item.kuartal === "Q2")?.status ?? "belum-dilaporkan"; return <tr key={project.id}><td><b>{project.nama}</b></td><td>{project.target}</td><td>{project.pic}</td><td>{project.level}</td><td>{formatProjectValue(project.q1)}</td><td>{formatProjectValue(project.q2)}</td><td>{formatProjectValue(project.q3)}</td><td>{formatProjectValue(project.q4)}</td><td><span className={`mm-project-status ${q2Status}`}>{q2Status}</span></td></tr>; })}</tbody></table></div></section>; })}</div>;
}
