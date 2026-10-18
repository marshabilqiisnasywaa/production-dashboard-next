"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import type { DmEmployee } from "../api";

interface EmployeePickProps {
  idPrefix: string;
  title: string;
  employees: readonly DmEmployee[];
  preferLine?: string | null;
  hideAssigned?: boolean;
  showSortOrder?: boolean;
  defaultSortOrder?: number;
  submitLabel: string;
  onSubmit: (input: { employeePk: number; sortOrder: number }) => Promise<void>;
}

function optionLabel(employee: DmEmployee) {
  const extra = [employee.employeeId, employee.dept].filter(Boolean).join(", ");
  return `${employee.name} (${extra})`;
}

export default function EmployeePick({
  idPrefix,
  title,
  employees,
  preferLine = null,
  hideAssigned = false,
  showSortOrder = false,
  defaultSortOrder = 0,
  submitLabel,
  onSubmit,
}: EmployeePickProps) {
  const [pk, setPk] = useState("");
  const [sortOrder, setSortOrder] = useState(String(defaultSortOrder));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pool = employees.filter((employee) => employee.isActive && !(hideAssigned && employee.lineLabel));
  const preferred = preferLine ? pool.filter((employee) => employee.lineLabel === preferLine) : [];
  const others = preferLine ? pool.filter((employee) => employee.lineLabel !== preferLine) : pool;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!pk) {
      setError("Pilih nama dulu.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        employeePk: Number(pk),
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      });
      setPk("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="dm-admin-member-card" onSubmit={submit} noValidate>
      <div className="dm-admin-member-head">
        <span className="dm-admin-member-role">{title}</span>
        {showSortOrder ? (
          <span className="dm-admin-member-idx">
            <label htmlFor={`${idPrefix}-sort`}>Urutan </label>
            <input
              id={`${idPrefix}-sort`}
              type="number"
              className="dm-admin-input dm-admin-sort-input"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </span>
        ) : null}
      </div>
      <div className="dm-admin-member-body">
        <div className="dm-admin-field">
          <label htmlFor={`${idPrefix}-pick`}>
            Nama<span className="dm-required-mark"> *</span>
          </label>
          <select
            id={`${idPrefix}-pick`}
            className="dm-admin-input"
            value={pk}
            onChange={(event) => setPk(event.target.value)}
          >
            <option value="">Pilih dari daftar User</option>
            {preferred.length > 0 ? (
              <optgroup label="Anggota lini ini">
                {preferred.map((employee) => (
                  <option key={employee.id} value={employee.id}>{optionLabel(employee)}</option>
                ))}
              </optgroup>
            ) : null}
            {preferLine && others.length > 0 ? (
              <optgroup label="User lain">
                {others.map((employee) => (
                  <option key={employee.id} value={employee.id}>{optionLabel(employee)}</option>
                ))}
              </optgroup>
            ) : null}
            {!preferLine ? others.map((employee) => (
              <option key={employee.id} value={employee.id}>{optionLabel(employee)}</option>
            )) : null}
          </select>
        </div>
        {pool.length === 0 ? (
          <p className="dm-admin-empty-note">
            {hideAssigned
              ? "Tidak ada User yang bebas. Tambahkan di menu User, atau lepas seseorang dari lini lain."
              : "Belum ada User aktif. Tambahkan di menu User."}
          </p>
        ) : null}
        {error ? <p className="dm-admin-inline-error" role="alert">{error}</p> : null}
        <div className="dm-admin-member-actions">
          <button type="submit" className="dm-admin-btn is-primary" disabled={busy || pool.length === 0}>
            {busy ? "Menyimpan..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
