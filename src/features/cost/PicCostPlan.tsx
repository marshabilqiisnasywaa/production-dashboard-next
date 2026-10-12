"use client";
import { useState } from "react";

type CostPlanStatus = "Planned" | "On Progress" | "Done";

type CostPlanRecord = {
  id: string;
  plan: string;
  owner: string;
  dueDate: string;
  status: CostPlanStatus;
};

const seedPlans: CostPlanRecord[] = [
  { id: "PLN-001", plan: "Kurangi overtime packing 10%", owner: "Cost PIC", dueDate: "2026-10-10", status: "On Progress" },
  { id: "PLN-002", plan: "Audit handling tray pre-assembly", owner: "Cost PIC", dueDate: "2026-10-09", status: "Planned" },
  { id: "PLN-003", plan: "Standarisasi profil solder rework", owner: "Cost PIC", dueDate: "2026-10-08", status: "Done" },
];

const statusOptions: CostPlanStatus[] = ["Planned", "On Progress", "Done"];

export default function PicCostPlan() {
  const [plans, setPlans] = useState<CostPlanRecord[]>(seedPlans);
  const [plan, setPlan] = useState("");
  const [dueDate, setDueDate] = useState("2026-10-10");

  const addPlan = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!plan.trim()) return;
    const nextId = `PLN-${String(plans.length + 1).padStart(3, "0")}`;
    setPlans((current) => [{ id: nextId, plan: plan.trim(), owner: "Cost PIC", dueDate, status: "Planned" }, ...current]);
    setPlan("");
  };

  return (
    <div className="pic-page">
      <div className="repair-header">
        <div>
          <div className="repair-eyebrow">MORNING MEETING • PIC AREA • COST</div>
          <div className="repair-title-row">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Plan</h1>
          </div>
          <p>Rencana harian pengendalian cost area: pemilik, tenggat, dan status.</p>
        </div>
      </div>

      <article className="repair-panel wide">
        <div className="repair-card-head"><div><h2>Tambah Rencana</h2><p>Rencana baru otomatis berstatus Planned</p></div></div>
        <form className="repair-form" onSubmit={addPlan}>
          <label>Rencana<input value={plan} onChange={(event) => setPlan(event.target.value)} placeholder="Contoh: Kurangi scrap top cover" required /></label>
          <label>Tenggat<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          <div className="repair-dialog-actions">
            <button type="submit" className="repair-primary">+ Tambah Plan</button>
          </div>
        </form>
      </article>

      <article className="repair-panel wide">
        <div className="repair-card-head"><div><h2>Daftar Plan</h2><p>{plans.filter((item) => item.status !== "Done").length} plan aktif</p></div></div>
        <div className="repair-table-scroll">
          <table className="repair-data-table pic-table pic-table-slim">
            <thead>
              <tr><th>Rencana</th><th>Owner</th><th>Tenggat</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {plans.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.plan}</strong><small>{item.id}</small></td>
                  <td>{item.owner}</td>
                  <td>{item.dueDate}</td>
                  <td><span className={`repair-status ${item.status === "Done" ? "good" : item.status === "On Progress" ? "bad" : ""}`}>{item.status}</span></td>
                  <td>
                    <select
                      className="repair-outline"
                      value={item.status}
                      onChange={(event) => setPlans((current) => current.map((row) => (row.id === item.id ? { ...row, status: event.target.value as CostPlanStatus } : row)))}
                      aria-label={`Update status ${item.id}`}
                    >
                      {statusOptions.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
