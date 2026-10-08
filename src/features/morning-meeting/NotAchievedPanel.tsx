import type { PicAreaKey } from "@/components/providers/RoleProvider";
import type { Role } from "@/types/morningMeeting";
import { getNotAchievedForArea, getNotAchievedForKpi, notAchievedItems, type NotAchievedItem } from "@/features/morning-meeting/notAchievedData";

type NotAchievedPanelProps = { role: Role; picArea: PicAreaKey; kpiId?: string; onFollowup: () => void };

function rowsFor({ role, picArea, kpiId }: Pick<NotAchievedPanelProps, "role" | "picArea" | "kpiId">): NotAchievedItem[] {
  if (kpiId) return getNotAchievedForKpi(kpiId).filter((item) => role !== "PIC Area" || item.area === picArea);
  if (role === "PIC Area") return getNotAchievedForArea(picArea);
  if (role === "HOD") return notAchievedItems.filter((item) => item.status !== "done").slice(0, 3);
  return notAchievedItems;
}

export default function NotAchievedPanel(props: NotAchievedPanelProps) {
  const rows = rowsFor(props);
  if (!rows.length) return <section className="mm-panel"><h2>Not Achieved</h2><p className="mm-empty">Belum ada not achieved untuk filter ini.</p></section>;
  return <section className="mm-panel"><div className="mm-panel-head"><h2>Not Achieved</h2><button onClick={props.onFollowup}>Jadikan Follow-up</button></div><div className="mm-table-wrap"><table className="mm-table"><thead><tr><th>Problem</th><th>Reason</th><th>Countermeasure</th><th>Due Date</th><th>PIC</th><th>Status</th><th>Lampiran</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><b>{item.problem}</b><span>{item.period}</span></td><td>{item.reason}</td><td>{item.countermeasure}</td><td>{item.dueDate}</td><td>{item.pic}</td><td><span className={`mm-project-status ${item.status === "done" ? "on-track" : item.status === "open" ? "off-track" : "belum-dilaporkan"}`}>{item.status}</span></td><td>{item.attachmentLabel}</td></tr>)}</tbody></table></div></section>;
}
