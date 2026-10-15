"use client";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../api";
import type { DmEmployee, DmLine } from "../api";
import type { DmMember } from "../dmData";

interface TeamManagerProps {
  line: DmLine;
  call: <T>(fn: () => Promise<T>) => Promise<T>;
  onChanged: () => Promise<void>;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

const CANCELLED = "Dibatalkan.";

function initials(name: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

function Avatar({ member }: { member: DmMember }) {
  if (member.photoUrl) {
    return <img src={member.photoUrl} alt="" className="lw-avatar" />;
  }
  return <span className="lw-avatar is-initials" aria-hidden="true">{initials(member.name)}</span>;
}

interface MemberRowProps {
  member: DmMember;
  index: number;
  onSave: (input: { sortOrder: number }) => Promise<void>;
  onRelease: () => Promise<void>;
}

function MemberRow({ member, index, onSave, onRelease }: MemberRowProps) {
  const original = String(member.sortOrder ?? index + 1);
  const [sortOrder, setSortOrder] = useState(original);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      const message = messageOf(err);
      if (message !== CANCELLED) setError(message);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    run(() => onSave({ sortOrder: Number.parseInt(sortOrder, 10) || 0 }));
  }

  const detail = [member.employeeId, member.dept, member.position].filter(Boolean).join(" · ");

  return (
    <li className="lw-roster-item">
      <form className="lw-roster-row" onSubmit={submit} noValidate>
        <Avatar member={member} />
        <div className="lw-roster-info">
          <strong>{member.name}</strong>
          <span>{detail}</span>
        </div>
        <label className="lw-roster-order">
          <span>Urutan</span>
          <input
            type="number"
            className="lw-input"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            aria-label={`Urutan ${member.name ?? "anggota"}`}
          />
        </label>
        <div className="lw-roster-actions">
          <button type="submit" className="lw-btn is-secondary" disabled={busy || sortOrder === original}>
            Simpan
          </button>
          <button type="button" className="lw-btn is-danger" disabled={busy} onClick={() => run(onRelease)}>
            Lepas
          </button>
        </div>
      </form>
      {error ? <p className="lw-error is-inline" role="alert">{error}</p> : null}
    </li>
  );
}

export default function TeamManager({ line, call, onChanged }: TeamManagerProps) {
  const [members, setMembers] = useState<DmMember[]>([]);
  const [employees, setEmployees] = useState<DmEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const [order, setOrder] = useState("1");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextMembers, nextEmployees] = await call(() =>
        Promise.all([adminApi.members(line.id), adminApi.employees()])
      );
      setMembers(nextMembers);
      setEmployees(nextEmployees);
      setOrder(String(nextMembers.length + 1));
    } catch (error) {
      setLoadError(messageOf(error));
    } finally {
      setLoading(false);
    }
  }, [call, line.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function afterChange(message: string) {
    setStatus(message);
    await Promise.all([load(), onChanged()]);
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!pick) {
      setAddError("Pilih nama dulu.");
      return;
    }
    const chosen = employees.find((employee) => employee.id === Number(pick));
    setAdding(true);
    setAddError(null);
    try {
      await call(() => adminApi.addMember(line.id, { employeePk: Number(pick), sortOrder: Number.parseInt(order, 10) || 0 }));
      setPick("");
      await afterChange(`${chosen?.name ?? "Anggota"} ditambahkan ke tim.`);
    } catch (error) {
      setAddError(messageOf(error));
    } finally {
      setAdding(false);
    }
  }

  async function save(member: DmMember, input: { sortOrder: number }) {
    if (member.id === undefined) return;
    const memberId = member.id;
    await call(() => adminApi.updateMember(memberId, input));
    await afterChange(`Urutan ${member.name ?? "anggota"} disimpan.`);
  }

  async function release(member: DmMember) {
    if (member.id === undefined) return;
    const memberId = member.id;
    if (!window.confirm(`Lepas ${member.name ?? "anggota ini"} dari lini ${line.code}? Orangnya bisa dipasang ke lini lain setelah ini.`)) {
      throw new Error(CANCELLED);
    }
    await call(() => adminApi.releaseMember(memberId));
    await afterChange(`${member.name ?? "Anggota"} dilepas dari lini.`);
  }

  const available = employees.filter((employee) => employee.isActive && !employee.lineLabel);

  if (loading && members.length === 0 && employees.length === 0) {
    return <p role="status" className="lw-note">Memuat anggota...</p>;
  }

  if (loadError) {
    return (
      <div className="lw-card">
        <p className="lw-error" role="alert">{loadError}</p>
        <button type="button" className="lw-btn is-primary" onClick={load}>Coba lagi</button>
      </div>
    );
  }

  return (
    <div className="lw-stack">
      <form className="lw-card" onSubmit={add} noValidate>
        <h4 className="lw-card-title">Tambah anggota</h4>
        <p className="lw-card-sub">Pilih dari daftar Pengguna. Satu orang hanya bisa aktif di satu lini.</p>
        <div className="lw-add-row">
          <div className="lw-field lw-grow">
            <label htmlFor="team-pick" className="lw-label">Nama</label>
            <select id="team-pick" className="lw-input" value={pick} onChange={(event) => setPick(event.target.value)}>
              <option value="">{available.length === 0 ? "Tidak ada pengguna yang bebas" : "Pilih pengguna"}</option>
              {available.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({[employee.employeeId, employee.dept].filter(Boolean).join(", ")})
                </option>
              ))}
            </select>
          </div>
          <div className="lw-field lw-order">
            <label htmlFor="team-order" className="lw-label">Urutan</label>
            <input id="team-order" type="number" className="lw-input" value={order} onChange={(event) => setOrder(event.target.value)} />
          </div>
          <button type="submit" className="lw-btn is-primary lw-add-btn" disabled={adding || available.length === 0}>
            {adding ? "Menambah..." : "Tambah"}
          </button>
        </div>
        {available.length === 0 ? (
          <p className="lw-hint">Tambahkan orang baru di menu Pengguna, atau lepas seseorang dari lini lain.</p>
        ) : null}
        {addError ? <p className="lw-error" role="alert">{addError}</p> : null}
      </form>

      <section className="lw-card" aria-labelledby="team-roster-title">
        <div className="lw-card-head">
          <h4 id="team-roster-title" className="lw-card-title">Anggota lini {line.code}</h4>
          <span className="lw-count">{members.length} orang</span>
        </div>
        <div role="status" className="lw-note">{status}</div>
        {members.length === 0 ? (
          <p className="lw-empty">Belum ada anggota. Tambahkan dari kolom di atas.</p>
        ) : (
          <ul className="lw-roster">
            {members.map((member, index) => (
              <MemberRow
                key={`${line.id}-${member.id}`}
                member={member}
                index={index}
                onSave={(input) => save(member, input)}
                onRelease={() => release(member)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
