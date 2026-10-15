"use client";
import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { adminApi, dmDepartments, dmEmployeeRoles } from "../api";
import type { DmEmployee, DmEmployeeInput, DmEmployeeRole } from "../api";
import { PlusIcon } from "./AdminIcons";

interface UserManagerProps {
  call: <T>(fn: () => Promise<T>) => Promise<T>;
}

const MAX_PHOTO_BYTES = 1024 * 1024;

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

function roleLabel(role: DmEmployeeRole) {
  return dmEmployeeRoles.find((item) => item.value === role)?.label ?? role;
}

function blankToNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

interface UserFormProps {
  user: DmEmployee | null;
  onSave: (input: DmEmployeeInput) => Promise<void>;
  onCancel: () => void;
}

function UserForm({ user, onSave, onCancel }: UserFormProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [employeeId, setEmployeeId] = useState(user?.employeeId ?? "");
  const [role, setRole] = useState<DmEmployeeRole>(user?.role ?? "member");
  const [dept, setDept] = useState(user?.dept ?? "");
  const [position, setPosition] = useState(user?.position ?? "");
  const [supervisor, setSupervisor] = useState(user?.supervisor ?? "");
  const [workPhone, setWorkPhone] = useState(user?.workPhone ?? "");
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deptOptions = dept && !dmDepartments.includes(dept) ? [...dmDepartments, dept] : dmDepartments;

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Foto lebih dari 1 MB. Kecilkan ukurannya dulu.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(String(reader.result));
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !employeeId.trim()) {
      setError("Nama dan NIK wajib diisi.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave({
        employeeId: employeeId.trim(),
        name: name.trim(),
        role,
        dept: blankToNull(dept),
        position: blankToNull(position),
        supervisor: blankToNull(supervisor),
        workPhone: blankToNull(workPhone),
        photoUrl: blankToNull(photoUrl),
      });
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  }

  const text = (id: string, label: string, value: string, set: (v: string) => void, placeholder: string, required = false) => (
    <div className="dm-admin-field">
      <label htmlFor={`user-${id}`}>
        {label}
        {required ? <span className="dm-required-mark"> *</span> : null}
      </label>
      <input
        id={`user-${id}`}
        type="text"
        className="dm-admin-input"
        value={value}
        onChange={(event) => set(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <form className="dm-admin-member-card" onSubmit={submit} noValidate>
      <div className="dm-admin-member-head">
        <span className="dm-admin-member-role">{user ? `Ubah ${user.name}` : "Pengguna baru"}</span>
      </div>
      <div className="dm-admin-member-body">
        {text("name", "Name", name, setName, "Nama lengkap", true)}
        {text("nik", "Work No", employeeId, setEmployeeId, "Nomor induk karyawan", true)}
        <div className="dm-admin-field">
          <label htmlFor="user-role">Role</label>
          <select
            id="user-role"
            className="dm-admin-input"
            value={role}
            onChange={(event) => setRole(event.target.value as DmEmployeeRole)}
          >
            {dmEmployeeRoles.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className="dm-admin-field">
          <label htmlFor="user-dept">Departemen</label>
          <select
            id="user-dept"
            className="dm-admin-input"
            value={dept}
            onChange={(event) => setDept(event.target.value)}
          >
            <option value="">Belum dipilih</option>
            {deptOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        {text("pos", "Position", position, setPosition, "Jabatan, contoh: PE Technician")}
        {text("sup", "Supervisor", supervisor, setSupervisor, "Nama atasan")}
        {text("phone", "Work Phone", workPhone, setWorkPhone, "Nomor kontak kerja")}
        <div className="dm-admin-field">
          <label htmlFor="user-photo">Foto Profil</label>
          <div className="dm-admin-upload-wrap">
            <input
              id="user-photo"
              type="text"
              className="dm-admin-input"
              value={photoUrl.startsWith("data:") ? "" : photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              placeholder={photoUrl.startsWith("data:") ? "Foto dari berkas terpilih" : "URL foto"}
            />
            <label className="dm-admin-file-label">
              Unggah
              <input type="file" accept="image/*" className="dm-admin-file-input" onChange={pickPhoto} />
            </label>
          </div>
        </div>
        {photoUrl ? (
          <div className="dm-admin-avatar-preview">
            <img src={photoUrl} alt={name ? `Foto ${name}` : "Pratinjau foto"} className="dm-admin-avatar-img" />
            <button type="button" className="dm-admin-btn is-secondary" onClick={() => setPhotoUrl("")}>
              Hapus Foto
            </button>
          </div>
        ) : null}
        {error ? <p className="dm-admin-inline-error" role="alert">{error}</p> : null}
        <div className="dm-admin-member-actions">
          <button type="submit" className="dm-admin-btn is-primary" disabled={busy}>
            {busy ? "Menyimpan..." : user ? "Simpan Perubahan" : "Tambah Pengguna"}
          </button>
          <button type="button" className="dm-admin-btn is-tonal" disabled={busy} onClick={onCancel}>
            Batal
          </button>
        </div>
      </div>
    </form>
  );
}

export default function UserManager({ call }: UserManagerProps) {
  const [users, setUsers] = useState<DmEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState<{ open: boolean; user: DmEmployee | null }>({ open: false, user: null });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | DmEmployeeRole>("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setUsers(await call(() => adminApi.employees()));
    } catch (error) {
      setLoadError(messageOf(error));
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(input: DmEmployeeInput) {
    const editing = form.user;
    if (editing) {
      await call(() => adminApi.updateEmployee(editing.id, input));
      setStatus(`Data ${input.name} disimpan.`);
    } else {
      await call(() => adminApi.createEmployee(input));
      setStatus(`${input.name} ditambahkan.`);
    }
    setForm({ open: false, user: null });
    await load();
  }

  async function toggleActive(user: DmEmployee) {
    try {
      await call(() => adminApi.updateEmployee(user.id, { isActive: !user.isActive }));
      setStatus(user.isActive ? `${user.name} dinonaktifkan.` : `${user.name} diaktifkan lagi.`);
      await load();
    } catch (error) {
      setStatus(messageOf(error));
    }
  }

  async function resetPassword(user: DmEmployee) {
    if (!window.confirm(`Reset password ${user.name} ke NIK (${user.employeeId})? Orangnya wajib menggantinya saat login berikutnya.`)) return;
    try {
      await call(() => adminApi.resetEmployeePassword(user.id));
      setStatus(`Password ${user.name} dikembalikan ke NIK. Wajib diganti saat login.`);
      await load();
    } catch (error) {
      setStatus(messageOf(error));
    }
  }

  async function remove(user: DmEmployee) {
    if (!window.confirm(`Hapus ${user.name} dari daftar pengguna?`)) return;
    try {
      await call(() => adminApi.deleteEmployee(user.id));
      setStatus(`${user.name} dihapus.`);
      await load();
    } catch (error) {
      setStatus(messageOf(error));
    }
  }

  const query = search.toLowerCase().trim();
  const shown = users.filter((user) => {
    if (!showInactive && !user.isActive) return false;
    if (roleFilter !== "all" && user.role !== roleFilter) return false;
    if (deptFilter !== "all" && (user.dept ?? "") !== deptFilter) return false;
    return !query || [user.name, user.employeeId, user.dept ?? "", user.position ?? "", user.lineLabel ?? ""].some((value) => value.toLowerCase().includes(query));
  });
  const inactiveCount = users.filter((user) => !user.isActive).length;
  const deptChoices = Array.from(
    new Set([...dmDepartments, ...users.map((user) => user.dept).filter((value): value is string => Boolean(value))])
  );

  return (
    <section className="dm-panel" aria-labelledby="users-title">
      <div className="dm-panel-head">
        <div>
          <div className="dm-panel-titlebar">
            <h3 id="users-title" className="dm-panel-title">Daftar Pengguna</h3>
            <span className="dm-pill">{users.length} Terdaftar</span>
          </div>
          <p className="dm-panel-sub">
            Isi data orang sekali di sini. Saat menyusun tim atau memilih MPV, cukup pilih namanya.
            Akun admin diatur terpisah di login, bukan di daftar ini.
          </p>
        </div>
        {!form.open ? (
          <button type="button" className="dm-admin-btn is-primary dm-btn-add" onClick={() => setForm({ open: true, user: null })}>
            <PlusIcon size={14} />
            Tambah Pengguna
          </button>
        ) : null}
      </div>

      <div role="status" className="dm-admin-team-status">{status}</div>

      {form.open ? (
        <div className="dm-admin-member-grid">
          <UserForm
            key={form.user?.id ?? "new"}
            user={form.user}
            onSave={save}
            onCancel={() => setForm({ open: false, user: null })}
          />
        </div>
      ) : null}

      {loading && users.length === 0 ? (
        <p role="status">Memuat pengguna...</p>
      ) : loadError ? (
        <div className="dm-admin-state-block">
          <p role="alert">{loadError}</p>
          <button type="button" className="dm-admin-btn is-primary" onClick={load}>Coba lagi</button>
        </div>
      ) : users.length === 0 ? (
        <p className="dm-lines-empty">Belum ada pengguna. Klik &quot;Tambah Pengguna&quot; untuk mengisi yang pertama.</p>
      ) : (
        <>
          <div className="dm-lines-toolbar">
            <div className="dm-table-search-box">
              <label className="dm-admin-sr-only" htmlFor="user-search">Cari pengguna</label>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="dm-table-search-icon" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="user-search"
                type="search"
                className="dm-table-search-input"
                placeholder="Cari nama, NIK, jabatan, atau lini"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <label className="dm-admin-sr-only" htmlFor="user-role-filter">Filter role</label>
            <select
              id="user-role-filter"
              className="dm-table-filter-select"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as "all" | DmEmployeeRole)}
            >
              <option value="all">Semua role</option>
              {dmEmployeeRoles.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <label className="dm-admin-sr-only" htmlFor="user-dept-filter">Filter departemen</label>
            <select
              id="user-dept-filter"
              className="dm-table-filter-select"
              value={deptFilter}
              onChange={(event) => setDeptFilter(event.target.value)}
            >
              <option value="all">Semua departemen</option>
              {deptChoices.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            {inactiveCount > 0 ? (
              <label>
                <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />{" "}
                Tampilkan nonaktif ({inactiveCount})
              </label>
            ) : null}
            <span className="dm-pill dm-lines-count" role="status">
              {shown.length} dari {users.length} pengguna
            </span>
          </div>

          {shown.length === 0 ? (
            <p className="dm-lines-none">Tidak ada pengguna yang cocok dengan pencarian atau filter ini.</p>
          ) : (
            <div className="dm-admin-table-wrap">
              <table className="dm-admin-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>NIK</th>
                    <th>Role</th>
                    <th>Departemen</th>
                    <th>Position</th>
                    <th>Lini</th>
                    <th>Login</th>
                    <th style={{ textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <span className="dm-col-name">{user.name}</span>
                        {user.isActive ? null : <span className="dm-pill"> Nonaktif</span>}
                      </td>
                      <td><span className="dm-col-code">{user.employeeId}</span></td>
                      <td>{roleLabel(user.role)}</td>
                      <td>{user.dept ?? "-"}</td>
                      <td>{user.position ?? "-"}</td>
                      <td>{user.lineLabel ?? "-"}</td>
                      <td>{user.mustChangePassword ? "Password awal" : "Sudah diganti"}</td>
                      <td style={{ textAlign: "center" }}>
                        <button type="button" className="dm-table-btn" onClick={() => setForm({ open: true, user })}>
                          Ubah
                        </button>{" "}
                        <button type="button" className="dm-table-btn" onClick={() => resetPassword(user)}>
                          Reset password
                        </button>{" "}
                        <button type="button" className="dm-table-btn" onClick={() => toggleActive(user)}>
                          {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>{" "}
                        <button type="button" className="dm-table-btn" onClick={() => remove(user)}>
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
