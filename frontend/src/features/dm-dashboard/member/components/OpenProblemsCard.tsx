import { IconAlert } from "@/components/ui/icons";

/** KPI-style card: how many follow-ups are waiting on this member. */
export function OpenProblemsCard({ open, escalated }: { open: number; escalated: number }) {
  const tone = escalated > 0 ? "bad" : open > 0 ? "warn" : "ok";
  const hint =
    escalated > 0
      ? `${escalated} melewati due date · dieskalasi ke SPV`
      : open > 0
        ? "Belum ada yang melewati due date"
        : "Tidak ada tindak lanjut terbuka";

  return (
    <article className="dml-kpi">
      <div className="dml-kpi__top">
        <h3>Tindak lanjut saya</h3>
        <span className={`dml-kpi__icon dml-kpi__icon--${tone}`}>
          <IconAlert size={20} />
        </span>
      </div>
      <p className="dml-kpi__value">{open}</p>
      <p className="dml-kpi__hint">{hint}</p>
    </article>
  );
}
