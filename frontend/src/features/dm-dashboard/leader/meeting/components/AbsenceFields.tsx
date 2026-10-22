import type { AbsenceNote } from "../types";
import { ABSENCE_REASONS } from "../utils";

interface Props {
  idPrefix: string;
  name: string;
  value: AbsenceNote;
  onChange: (next: AbsenceNote) => void;
}

export function AbsenceFields({ idPrefix, name, value, onChange }: Props) {
  const represented = value.reason === "represented";
  return (
    <>
      <label className="dml-mt-sr" htmlFor={idPrefix + "-reason"}>
        Alasan {name} tidak hadir
      </label>
      <select
        id={idPrefix + "-reason"}
        className="ui-select"
        value={value.reason}
        onChange={(e) => onChange({ ...value, reason: e.target.value as AbsenceNote["reason"] })}
      >
        {ABSENCE_REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <label className="dml-mt-sr" htmlFor={idPrefix + "-note"}>
        {represented ? "Nama yang mewakili " : "Keterangan "}
        {name}
      </label>
      <input
        id={idPrefix + "-note"}
        type="text"
        className="ui-input"
        maxLength={200}
        placeholder={represented ? "Nama yang mewakili" : "Keterangan (opsional)"}
        value={value.note}
        onChange={(e) => onChange({ ...value, note: e.target.value })}
      />
    </>
  );
}
