interface Props {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}

/** Two native date inputs. Empty = no limit. */
export function DateRangeFilter({ from, to, onChange }: Props) {
  return (
    <div className="dml-lg-range" role="group" aria-label="Rentang tanggal">
      <input
        type="date"
        className="ui-input"
        value={from}
        max={to || undefined}
        aria-label="Dari tanggal"
        onChange={(e) => onChange({ from: e.target.value, to })}
      />
      <span aria-hidden="true">–</span>
      <input
        type="date"
        className="ui-input"
        value={to}
        min={from || undefined}
        aria-label="Sampai tanggal"
        onChange={(e) => onChange({ from, to: e.target.value })}
      />
    </div>
  );
}
