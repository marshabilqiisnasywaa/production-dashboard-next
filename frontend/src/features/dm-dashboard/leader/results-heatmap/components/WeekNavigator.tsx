import { addDays, weekOptions } from "../utils";

interface Props {
  weekStart: string;
  currentWeek: string;
  weeksBack: number;
  onChange: (weekStart: string) => void;
}

/** ‹ [ 19 – 25 Okt 2026 ▾ ] ›  + "Minggu ini" shortcut. Cannot go into the future. */
export function WeekNavigator({ weekStart, currentWeek, weeksBack, onChange }: Props) {
  const options = weekOptions(currentWeek, weeksBack);
  const oldest = options[options.length - 1].value;
  const isCurrent = weekStart === currentWeek;

  return (
    <div className="dmr-weeknav" role="group" aria-label="Pilih minggu">
      <button type="button" className="dmr-navbtn" aria-label="Minggu sebelumnya" disabled={weekStart <= oldest} onClick={() => onChange(addDays(weekStart, -7))}>
        ‹
      </button>
      <select className="ui-select dmr-weekselect" aria-label="Minggu" value={weekStart} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button type="button" className="dmr-navbtn" aria-label="Minggu berikutnya" disabled={isCurrent} onClick={() => onChange(addDays(weekStart, 7))}>
        ›
      </button>
      {!isCurrent && (
        <button type="button" className="dmr-link" onClick={() => onChange(currentWeek)}>
          Minggu ini
        </button>
      )}
    </div>
  );
}
