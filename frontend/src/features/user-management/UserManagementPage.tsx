"use client";
import { useState } from "react";
import { appRoles, picAreaOptions, type PicAreaKey } from "@/components/providers/RoleProvider";
import { accessModuleOrder, accessModuleRules, type AccessModuleKey } from "@/config/access";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  getUsers,
  removeUser,
  resetPassword,
  resetToSeed,
  saveUser,
  type ManagedUser,
} from "@/features/user-management/userStore";
import type { Role } from "@/types/morningMeeting";
import "./user-management.css";

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function emailFor(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")}@manuflow.id`;
}

const extraModuleOptions = accessModuleOrder
  .filter((key) => key !== "user-management")
  .map((key) => ({ key, ...accessModuleRules[key] }));

function newUserId(nik: string, users: ManagedUser[]): string {
  let id = `user-${nik}`;
  let suffix = 2;
  while (users.some((user) => user.id === id)) {
    id = `user-${nik}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function UserEditor({
  user,
  currentUser,
  users,
  onSave,
  onCancel,
}: {
  user: ManagedUser | null;
  currentUser: ManagedUser;
  users: ManagedUser[];
  onSave: (user: ManagedUser) => void;
  onCancel: () => void;
}) {
  const [nik, setNik] = useState(user?.nik ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "PIC Area");
  const [areas, setAreas] = useState<PicAreaKey[]>(user?.areas ?? []);
  const [extraModules, setExtraModules] = useState<AccessModuleKey[]>(user?.extraModules ?? []);
  const [active, setActive] = useState(user?.active ?? true);
  const [error, setError] = useState("");

  const toggleArea = (area: PicAreaKey) => {
    setAreas((current) => current.includes(area) ? current.filter((item) => item !== area) : [...current, area]);
  };

  const toggleModule = (key: AccessModuleKey) => {
    setExtraModules((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const submit = () => {
    setError("");
    const trimmedNik = nik.trim();
    const trimmedName = name.trim();
    if (!trimmedNik) {
      setError("NIK wajib diisi.");
      return;
    }
    if (!/^\d+$/.test(trimmedNik)) {
      setError("NIK hanya boleh berisi angka.");
      return;
    }
    if (users.some((item) => item.id !== user?.id && item.nik.toLowerCase() === trimmedNik.toLowerCase())) {
      setError("NIK sudah digunakan.");
      return;
    }
    if (!trimmedName) {
      setError("Nama wajib diisi.");
      return;
    }
    if (role === "PIC Area" && areas.length === 0) {
      setError("PIC Area wajib memiliki minimal satu area.");
      return;
    }
    if (user?.id === currentUser.id) {
      if (!active) {
        setError("Akun yang sedang login tidak dapat dinonaktifkan.");
        return;
      }
      if (role !== user.role) {
        setError("Role akun yang sedang login tidak dapat diturunkan.");
        return;
      }
    }
    if (user?.role === "Superadmin" && role !== "Superadmin" && users.filter((item) => item.role === "Superadmin" && item.id !== user.id).length === 0) {
      setError("Superadmin terakhir tidak boleh diturunkan.");
      return;
    }

    onSave({
      id: user?.id ?? newUserId(trimmedNik, users),
      nik: trimmedNik,
      name: trimmedName,
      email: emailFor(trimmedName),
      initials: initialsFor(trimmedName),
      role,
      area: role === "PIC Area" ? areas[0] : undefined,
      areas: role === "PIC Area" ? areas : [],
      extraModules,
      password: user?.password ?? trimmedNik,
      active,
      mustChangePassword: user?.mustChangePassword ?? true,
    });
  };

  return (
    <div className="mmu-editor">
      <div className="mmu-editor__head">
        <div>
          <span>Kelola akun</span>
          <h2>{user ? "Edit user" : "Tambah user"}</h2>
        </div>
        <button type="button" className="mmu-editor__close" aria-label="Tutup" onClick={onCancel}>×</button>
      </div>
      <div className="mmu-form">
        <label className="mmu-field">
          <span>NIK</span>
          <input value={nik} inputMode="numeric" onChange={(event) => setNik(event.target.value)} placeholder="Masukkan NIK" />
        </label>
        <label className="mmu-field">
          <span>Nama</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Masukkan nama lengkap" />
        </label>
        <label className="mmu-field">
          <span>Role</span>
          <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
            {appRoles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        {role === "PIC Area" && (
          <div className="mmu-field">
            <span>Area</span>
            <div className="mmu-check-grid">
              {picAreaOptions.map((option) => (
                <label className="mmu-check" key={option.key}>
                  <input type="checkbox" checked={areas.includes(option.key)} onChange={() => toggleArea(option.key)} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="mmu-field">
          <span>Akses tambahan</span>
          <div className="mmu-check-grid mmu-check-grid--modules">
            {extraModuleOptions.map((option) => (
              <label className="mmu-check" key={option.key}>
                <input type="checkbox" checked={extraModules.includes(option.key)} onChange={() => toggleModule(option.key)} />
                <span>{option.label}<small>{option.group}</small></span>
              </label>
            ))}
          </div>
        </div>
        <label className="mmu-check mmu-check--status">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          <span>Akun aktif</span>
        </label>
        {!user && <p className="mmu-note">Password awal sama dengan NIK. User wajib menggantinya saat pertama masuk.</p>}
        {error && <p className="mmu-error" role="alert">{error}</p>}
      </div>
      <div className="mmu-editor__actions">
        <button type="button" className="mmu-secondary" onClick={onCancel}>Batal</button>
        <button type="button" className="mmu-primary" onClick={submit}>Simpan</button>
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const { user: currentUser, refreshUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>(() => getUsers());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  if (!currentUser) return null;

  const refreshList = () => {
    setUsers(getUsers());
    refreshUser();
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
    setError("");
    setNotice("");
  };

  const openEdit = (user: ManagedUser) => {
    setEditing(user);
    setFormOpen(true);
    setError("");
    setNotice("");
  };

  const handleSave = (user: ManagedUser) => {
    saveUser(user);
    refreshList();
    setFormOpen(false);
    setEditing(null);
    setNotice("Data user tersimpan.");
  };

  const handleResetPassword = (user: ManagedUser) => {
    setError("");
    setNotice("");
    if (!window.confirm(`Reset password ${user.name}? Password akan kembali ke NIK dan user wajib menggantinya saat masuk.`)) return;
    resetPassword(user.nik);
    refreshList();
    setNotice("Password berhasil direset.");
  };

  const handleToggleActive = (user: ManagedUser) => {
    setError("");
    setNotice("");
    if (user.id === currentUser.id) {
      setError("Akun yang sedang login tidak dapat dinonaktifkan.");
      return;
    }
    saveUser({ ...user, active: !user.active });
    refreshList();
    setNotice(user.active ? "Akun dinonaktifkan." : "Akun diaktifkan.");
  };

  const handleRemove = (user: ManagedUser) => {
    setError("");
    setNotice("");
    if (user.id === currentUser.id) {
      setError("Akun yang sedang login tidak dapat dihapus.");
      return;
    }
    if (user.role === "Superadmin" && users.filter((item) => item.role === "Superadmin").length === 1) {
      setError("Superadmin terakhir tidak boleh dihapus.");
      return;
    }
    if (!window.confirm(`Hapus user ${user.name} (${user.nik})?`)) return;
    removeUser(user.nik);
    refreshList();
    setNotice("User dihapus.");
  };

  const handleResetSeed = () => {
    setError("");
    setNotice("");
    if (!window.confirm("Reset semua data user ke data demo? Perubahan yang sudah dibuat akan hilang.")) return;
    resetToSeed();
    refreshList();
    setNotice("Data user dikembalikan ke data demo.");
  };

  const areaLabels = (user: ManagedUser) => {
    if (user.role !== "PIC Area" || user.areas.length === 0) return "—";
    return user.areas.map((area) => picAreaOptions.find((option) => option.key === area)?.label ?? area).join(", ");
  };

  const extraLabels = (user: ManagedUser) => {
    if (user.extraModules.length === 0) return "—";
    return user.extraModules.map((key) => accessModuleRules[key]?.label ?? key).join(", ");
  };

  return (
    <div className="mm-page mmu-page">
      <header className="mmu-head">
        <div>
          <p className="mmu-eyebrow">Administrasi</p>
          <h1>Atur User</h1>
          <p>Kelola akun, area, dan akses tambahan pengguna dashboard.</p>
        </div>
        <div className="mmu-head__actions">
          <button type="button" className="mmu-secondary" onClick={handleResetSeed}>Reset ke data demo</button>
          <button type="button" className="mmu-primary" onClick={openCreate}>+ Tambah user</button>
        </div>
      </header>
      {notice && <p className="mmu-notice" role="status">{notice}</p>}
      {error && <p className="mmu-error" role="alert">{error}</p>}
      <section className="mm-panel mmu-panel">
        <div className="mmu-table-wrap">
          <table className="mm-table mmu-table">
            <thead>
              <tr>
                <th>NIK</th>
                <th>Nama</th>
                <th>Role</th>
                <th>Area</th>
                <th>Akses tambahan</th>
                <th>Status</th>
                <th>Ganti password wajib</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><b>{user.nik}</b></td>
                  <td>{user.name}</td>
                  <td>{user.role}</td>
                  <td>{areaLabels(user)}</td>
                  <td>{extraLabels(user)}</td>
                  <td><span className={`mmu-badge ${user.active ? "mmu-badge--active" : "mmu-badge--inactive"}`}>{user.active ? "Aktif" : "Nonaktif"}</span></td>
                  <td>{user.mustChangePassword ? "Ya" : "Tidak"}</td>
                  <td>
                    <div className="mmu-row-actions">
                      <button type="button" onClick={() => openEdit(user)}>Edit</button>
                      <button type="button" onClick={() => handleResetPassword(user)}>Reset password</button>
                      <button type="button" onClick={() => handleToggleActive(user)}>{user.active ? "Nonaktifkan" : "Aktifkan"}</button>
                      <button type="button" className="mmu-danger" onClick={() => handleRemove(user)}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {formOpen && (
        <div className="mmu-modal" role="dialog" aria-modal="true">
          <UserEditor user={editing} currentUser={currentUser} users={users} onSave={handleSave} onCancel={() => setFormOpen(false)} />
        </div>
      )}
    </div>
  );
}
