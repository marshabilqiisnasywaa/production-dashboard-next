import { Card } from "@/components/ui/Card";
import { IconCheckCircle, IconAlert } from "@/components/ui/icons";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { TimeShare } from "../types";

function onTarget(s: TimeShare): boolean {
  if (s.mode === "min") return s.value >= s.target;
  if (s.mode === "max") return s.value <= s.target;
  return Math.abs(s.value - s.target) <= 5; // "≈" tolerance
}

export function TimeCompositionCard({ items }: { items: TimeShare[] }) {
  const allOk = items.every(onTarget);

  return (
    <Card title="Komposisi waktu DM" subtitle="Aktual dibanding target harian">
      <ul className="dml-time">
        {items.map((s) => (
          <li key={s.label}>
            <div className="dml-time__row">
              <span>{s.label}</span>
              <span>
                <strong>{s.value}%</strong> / {s.targetText}
              </span>
            </div>
            <ProgressBar value={s.value} target={s.target} tone={onTarget(s) ? "ok" : "warn"} size="sm" />
          </li>
        ))}
      </ul>

      <div className={allOk ? "dml-note dml-note--ok" : "dml-note dml-note--warn"}>
        {allOk ? <IconCheckCircle size={20} /> : <IconAlert size={20} />}
        <div>
          <strong>{allOk ? "Komposisi waktu sesuai target" : "Komposisi waktu belum sesuai target"}</strong>
          <p>
            {allOk
              ? "Pre telah mencapai minimum 60%, During mendekati 20%, dan Post tetap di bawah batas 20%."
              : "Periksa fase yang belum memenuhi target di atas."}
          </p>
        </div>
      </div>
    </Card>
  );
}
