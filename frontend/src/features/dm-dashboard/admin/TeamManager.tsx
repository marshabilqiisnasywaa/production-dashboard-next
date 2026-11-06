"use client";
import { useUiText } from "@/locales/useUiText";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi } from "../api";
import type { DmEmployee, DmLine } from "../api";
import type { DmMember } from "../dmData";
import { matchesTeamSlot, teamDepartment, teamSlots } from "./teamSlots";
import "./LineTeamModal.css";

type Props = {
  line: DmLine;
  call: <T>(fn: () => Promise<T>) => Promise<T>;
  onChanged: () => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
};

export default function TeamManager({ line, call, onChanged, onBusyChange }: Props) {
  const { text: uiText } = useUiText();
  const [members, setMembers] = useState<DmMember[]>([]);
  const [employees, setEmployees] = useState<DmEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const slot = teamSlots.find((item) => item.order === selectedSlot);
  const currentIds = new Set(members.map((member) => member.employeeId));
  const query = search.trim().toLowerCase();
  const candidates = selectedSlot === null ? [] : employees.filter((employee) => employee.isActive
    && !currentIds.has(employee.employeeId)
    && matchesTeamSlot(employee, selectedSlot)
    && `${employee.name} ${employee.employeeId}`.toLowerCase().includes(query));
  const extraMembers = members.filter((member) => !teamSlots.some((item) => item.department === teamDepartment(member.dept)));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextMembers, nextEmployees] = await call(() => Promise.all([adminApi.members(line.id), adminApi.employees()]));
      setMembers(nextMembers);
      setEmployees(nextEmployees);
    } catch (err) { setLoadError(err instanceof Error ? err.message : "Tim gagal dimuat."); }
    finally { setLoading(false); }
  }, [line.id, call]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (selectedSlot !== null) searchInput.current?.focus(); }, [selectedSlot]);
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);

  async function add(employee: DmEmployee) {
    if (!slot || busy) return;
    setBusy(true);
    setError(null);
    try {
      await call(() => adminApi.addMember(line.id, { employeePk: employee.id, sortOrder: slot.order, targetDept: slot.department }));
      setSelectedSlot(null);
      setSearch("");
      await Promise.all([load(), onChanged()]);
    } catch (err) { setError(err instanceof Error ? err.message : "Anggota gagal ditambahkan."); }
    finally { setBusy(false); }
  }

  async function release(member: DmMember) {
    if (member.id === undefined || busy || !window.confirm(uiText("Lepas {{v0}} dari Line {{v1}}?", { v0: member.name, v1: line.code }))) return;
    setBusy(true);
    setError(null);
    try {
      await call(() => adminApi.releaseMember(member.id!));
      setSelectedSlot(null);
      await Promise.all([load(), onChanged()]);
    } catch (err) { setError(err instanceof Error ? err.message : "Anggota gagal dilepas."); }
    finally { setBusy(false); }
  }

  if (loading) return <p role="status">{uiText("Memuat tim line...")}</p>;
  if (loadError) return <div role="alert"><p>{loadError}</p><button type="button" className="ltm-btn-add" onClick={() => void load()}>{uiText("Coba lagi")}</button></div>;

  return <div className="ltm-fixed-team">
    <p className="ltm-fixed-note">{uiText("Klik slot kosong untuk memilih anggota dari departemen tersebut.")}</p>
    <div className="ltm-slots-grid">{teamSlots.map((item) => {
      const occupants = members.filter((member) => teamDepartment(member.dept) === item.department);
      return occupants.length ? <section key={item.order} className={`ltm-slot-card${item.order === 1 ? " is-leader" : ""}`} aria-label={uiText("Slot {{v0}} {{v1}}", { v0: item.order, v1: item.label })}>
        <div className="ltm-slot-head"><span className="ltm-slot-badge">#{item.order} {uiText(item.label)}</span></div>
        {occupants.map((member) => <div key={member.id ?? member.employeeId} className="ltm-fixed-occupant">
          <div className="ltm-member-details"><strong className="ltm-member-name">{member.name}</strong><span className="ltm-member-meta">{uiText("NIK: ")}{member.employeeId}</span></div>
          {item.order === 1 && member.role !== "leader" ? <p className="ltm-fixed-error">{uiText("User ini belum memiliki role Leader. Lepas dan pilih leader Produksi.")}</p> : null}
          <button type="button" className="ltm-btn-release" disabled={busy} onClick={() => void release(member)}>{uiText("Keluarkan")}</button>
        </div>)}
        {occupants.length > 1 ? <p className="ltm-fixed-error">{uiText("Slot berisi lebih dari satu anggota. Sisakan satu anggota.")}</p> : null}
      </section> : <button key={item.order} type="button" className={`ltm-slot-card is-empty${selectedSlot === item.order ? " is-active-target" : ""}`} disabled={busy} aria-pressed={selectedSlot === item.order} onClick={() => { setSelectedSlot(item.order); setSearch(""); setError(null); }}>
        <strong>#{item.order} {uiText(item.label)}</strong><span>{uiText("Pilih ")}{uiText(item.label)}</span>
      </button>;
    })}</div>
    {slot ? <section className="ltm-fixed-picker" aria-label={uiText("Pilih {{v0}}", { v0: slot.label })}>
      <div className="ltm-fixed-picker-head"><strong>{uiText("Pilih ")}{uiText(slot.label)}</strong><button type="button" className="ltm-btn-release" disabled={busy} onClick={() => setSelectedSlot(null)}>{uiText("Batal")}</button></div>
      <label className="ltm-label" htmlFor={`team-search-${line.id}`}>{uiText("Cari nama atau NIK")}</label>
      <input ref={searchInput} id={`team-search-${line.id}`} type="search" className="ltm-search-input" placeholder={uiText("Cari anggota {{v0}}", { v0: slot.label })} value={search} disabled={busy} onChange={(event) => setSearch(event.target.value)} />
      <ul className="ltm-fixed-candidates">{candidates.map((employee) => <li key={employee.id}><button type="button" disabled={busy} onClick={() => void add(employee)}><strong>{employee.name}</strong><span>{employee.employeeId}</span></button></li>)}</ul>
      {candidates.length === 0 ? <p className="ltm-fixed-note">{uiText("Tidak ada User aktif ")}{uiText(slot.label)}{uiText(" yang cocok. Tambahkan atau periksa departemen User di menu User.")}</p> : null}
      {busy ? <p role="status">{uiText("Menyimpan...")}</p> : null}
    </section> : null}
    {extraMembers.length ? <section><strong>{uiText("Anggota dengan departemen di luar empat slot")}</strong>{extraMembers.map((member) => <div key={member.id ?? member.employeeId} className="ltm-fixed-extra"><span>{member.name} — {member.dept ?? uiText("Tanpa departemen")}</span><button type="button" className="ltm-btn-release" disabled={busy} onClick={() => void release(member)}>{uiText("Keluarkan")}</button></div>)}</section> : null}
    {error ? <p className="ltm-fixed-error" role="alert">{uiText(error)}</p> : null}
  </div>;
}
