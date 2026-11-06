"use client";
import { useUiText } from "@/locales/useUiText";


import { departmentLabel } from "../departments";
import { DateRangePicker, type DateRangeValue } from "../scorecard/ScorecardFilters";
import { jakartaToday } from "../scorecard/useScorecardData";
import type { DepartmentAttendance, DepartmentKey } from "./useDepartmentAttendance";

type Props = {
  data: DepartmentAttendance[];
  selectedDepartment: DepartmentKey | null;
  onSelectDepartment: (department: DepartmentKey) => void;
  range: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
  loading: boolean;
  error: string | null;
  mismatches: string[];
  onRetry: () => void;
  formatPercent: (value: number) => string;
};

export default function DepartmentRecap({
  data,
  selectedDepartment,
  onSelectDepartment,
  range,
  onRangeChange,
  loading,
  error,
  mismatches,
  onRetry,
  formatPercent,
}: Props) {
  const { text: uiText } = useUiText();
  const topDepartment = data.find((item) => item.total > 0);

  return (
    <section className="att-panel att-dept-panel">
      <div className="att-panel-heading">
        <div>
          <h2>{uiText("Rekap per Departemen")}</h2>
          <p>{uiText("Departemen dengan tingkat tidak hadir tertinggi")}</p>
        </div>
        <DateRangePicker value={range} onChange={onRangeChange} maxDate={jakartaToday()} />
      </div>

      {loading ? (
        <div className="att-chart-empty">{uiText("Memuat data departemen…")}</div>
      ) : error ? (
        <div className="att-dept-message" role="alert">
          <p>{uiText(error)}</p>
          <button type="button" onClick={onRetry}>{uiText("Coba lagi")}</button>
        </div>
      ) : mismatches.length > 0 ? (
        <div className="att-dept-message" role="alert">
          <p>{uiText("Data roster belum cocok dengan ringkasan kehadiran. Rekap departemen disembunyikan agar angka tidak menyesatkan.")}</p>
          <details>
            <summary>{uiText("Lihat perbedaan per sesi (")}{mismatches.length})</summary>
            <ul>
              {mismatches.map((mismatch) => (
                <li key={mismatch}>{mismatch}</li>
              ))}
            </ul>
          </details>
          <button type="button" onClick={onRetry}>{uiText("Coba lagi")}</button>
        </div>
      ) : !data.some((item) => item.total > 0) ? (
        <div className="att-chart-empty">{uiText("Belum ada data kehadiran pada periode ini.")}</div>
      ) : (
        <>
          <div className="att-dept-list">
            {uiText(data.map((item) => {
              const absentRate = item.total
                ? (item.absent / item.total) * 100
                : 0;
              const isTop =
                item === topDepartment && item.absent > 0;
              const isSelected = selectedDepartment === item.department;

              return (
                <div
                  key={item.department}
                  className={[
                    "att-dept-row",
                    isTop ? "is-top-absent" : "",
                    isSelected ? "is-selected" : "",
                    item.total === 0 ? "is-no-data" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={
                    item.total
                      ? `${departmentLabel(item.department)}: ${formatPercent(
                          absentRate
                        )} tidak hadir, ${item.absent} orang`
                      : `${departmentLabel(item.department)}: Belum ada data`
                  }
                  onClick={() => onSelectDepartment(item.department)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectDepartment(item.department);
                    }
                  }}
                >
                  <span className="att-dept-name">{departmentLabel(item.department)}</span>
                  {item.total > 0 ? (
                    <>
                      <span
                        className="att-dept-bar"
                        aria-hidden="true"
                        title={`Tepat waktu ${item.onTime}; Telat ${item.late}; Tidak hadir ${item.absent}`}
                      >
                        <i
                          className="is-ontime"
                          style={{
                            width: `${(item.onTime / item.total) * 100}%`,
                          }}
                        />
                        <i
                          className="is-late"
                          style={{
                            width: `${(item.late / item.total) * 100}%`,
                          }}
                        />
                        <i
                          className="is-absent"
                          style={{
                            width: `${(item.absent / item.total) * 100}%`,
                          }}
                        />
                      </span>
                      <span className="att-dept-rate">
                        <strong>{formatPercent(absentRate)}</strong>
                        <small>{item.absent}{uiText(" orang")}</small>
                      </span>
                      {isTop && (
                        <span className="att-dept-badge">{uiText("Absen tertinggi")}</span>
                      )}
                    </>
                  ) : (
                    <span className="att-dept-no-data">{uiText("Belum ada data")}</span>
                  )}
                </div>
              );
            }))}
          </div>

          <div className="att-legend att-legend--analytics">
            <span>
              <i className="legend-dot ontime" />{uiText(" Tepat waktu")}</span>
            <span>
              <i className="legend-dot late" />{uiText(" Telat")}</span>
            <span>
              <i className="legend-dot absent" />{uiText(" Tidak hadir")}</span>
          </div>
        </>
      )}
    </section>
  );
}
