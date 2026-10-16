"use client";
import { useCallback, useEffect, useState } from "react";
import { adminApi, dmDepartments, dmEmployeeRoles } from "../api";
import type { DmEmployee, DmEmployeeInput, DmEmployeeRole } from "../api";
import { PlusIcon } from "./AdminIcons";
import RowMenu from "./RowMenu";
import type { RowMenuItem } from "./RowMenu";
import UserModal from "./UserModal";
import "./UserTable.css";

interface UserManagerProps {
  call: <T>(fn: () => Promise<T>) => Promise<T>;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

function roleLabel(role: DmEmployeeRole) {
  return dmEmployeeRoles.find((item) => item.value === role)?.label ?? role;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const iconProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const icons = {
  edit: (
    <svg {...iconProps}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  key: (
    <svg {...iconProps}>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.7 12.3 9.8-9.8M16 7l3 3" />
    </svg>
  ),
  off: (
    <svg {...iconProps}>
      <path d="M12 3v9" />
      <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
    </svg>
  ),
  on: (
    <svg {...iconProps}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  trash: (
    <svg {...iconProps}>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  ),
};

export default function UserManager({ call }: UserManagerProps) {
  const [users, setUsers] = useState<DmEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const ok = (text: string) => setNotice({ type: "ok", text });
  const fail = (error: unknown) => setNotice({ type: "error", text: messageOf(error) });
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
      ok(`Data ${input.name} disimpan.`);
    } else {
      await call(() => adminApi.createEmployee(input));
      ok(`${input.name} ditambahkan.`);
    }
    setForm({ open: false, user: null });
    await load();
  }

  async function toggleActive(user: DmEmployee) {
    try {
      await call(() => adminApi.updateEmployee(user.id, { isActive: !user.isActive }));
      ok(user.isActive ? `${user.name} dinonaktifkan.` : `${user.name} diaktifkan lagi.`);
      await load();
    } catch (error) {
      fail(error);
    }
  }

  async function resetPassword(user: DmEmployee) {
    if (!window.confirm(`Reset password ${user.name} ke NIK (${user.employeeId})? Orangnya wajib menggantinya saat login berikutnya.`)) return;
    const updated = await call(() => adminApi.resetEmployeePassword(user.id));
    ok(`Password ${user.name} dikembalikan ke NIK. Wajib diganti saat login.`);
    setForm((current) => (current.open && current.user?.id === updated.id ? { open: true, user: updated } : current));
    await load();
  }

  async function remove(user: DmEmployee) {
    if (!window.confirm(`Hapus ${user.name} secara permanen? Riwayat lininya yang sudah dilepas ikut terhapus dan tidak bisa dikembalikan.`)) return;
    try {
      await call(() => adminApi.deleteEmployee(user.id));
      ok(`${user.name} dihapus.`);
      await load();
    } catch (error) {
      fail(error);
    }
  }

  const query = search.toLowerCase().trim();
  const shown = users.filter((user) => {
    if (!showInactive && !user.isActive) return false;
    if (roleFilter !== "all" && user.role !== roleFilter) return false;
    if (deptFilter !== "all" && (user.dept ?? "") !== deptFilter) return false;
    return !query || [user.name, user.employeeId, user.dept ?? "", user.position ?? "", user.supervisor ?? "", user.lineLabel ?? ""].some((value) => value.toLowerCase().includes(query));
  });
  const supervisors = users.filter((user) => user.role === "supervisor" && user.isActive);
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
            Daftarkan supervisor lebih dulu, lalu pilih mereka saat mengisi member. Saat menyusun tim atau MPV, cukup pilih namanya. Akun admin diatur terpisah di login.
          </p>
        </div>
        <button type="button" className="dm-admin-btn is-primary dm-btn-add" onClick={() => setForm({ open: true, user: null })}>
          <PlusIcon size={14} />
          Tambah Pengguna
        </button>
      </div>

      {notice ? (
        <div className={`ut-notice is-${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>
          <span>{notice.text}</span>
          <button type="button" className="ut-notice-close" onClick={() => setNotice(null)} aria-label="Tutup pesan">
            &times;
          </button>
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
              <label className="ut-toggle">
                <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
                <span>Tampilkan nonaktif ({inactiveCount})</span>
              </label>
            ) : null}
            <span className="dm-pill dm-lines-count" role="status">
              {shown.length} dari {users.length} pengguna
            </span>
          </div>

          {shown.length === 0 ? (
            <p className="dm-lines-none">Tidak ada pengguna yang cocok dengan pencarian atau filter ini.</p>
          ) : (
            <div className="ut-wrap">
              <table className="ut-table">
                <thead>
                  <tr>
                    <th>Pengguna</th>
                    <th>Role</th>
                    <th>Departemen</th>
                    <th>Lini</th>
                    <th>Supervisor</th>
                    <th>Login</th>
                    <th className="ut-col-action"><span className="ut-sr">Aksi</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((user) => {
                    const items: RowMenuItem[] = [
                      { key: "edit", label: "Ubah", icon: icons.edit, onSelect: () => setForm({ open: true, user }) },
                      {
                        key: "reset",
                        label: "Reset password",
                        icon: icons.key,
                        onSelect: () => resetPassword(user).catch((error) => fail(error)),
                      },
                      {
                        key: "toggle",
                        label: user.isActive ? "Nonaktifkan" : "Aktifkan",
                        icon: user.isActive ? icons.off : icons.on,
                        onSelect: () => toggleActive(user),
                      },
                      { key: "delete", label: "Hapus", icon: icons.trash, danger: true, onSelect: () => remove(user) },
                    ];
                    return (
                      <tr key={user.id} className={user.isActive ? undefined : "is-inactive"}>
                        <td>
                          <div className="ut-person">
                            {user.photoUrl ? (
                              <img src={user.photoUrl} alt="" className="ut-avatar" />
                            ) : (
                              <span className="ut-avatar is-initials" aria-hidden="true">{initials(user.name)}</span>
                            )}
                            <div className="ut-person-text">
                              <span className="ut-name">
                                {user.name}
                                {user.isActive ? null : <span className="ut-badge is-off">Nonaktif</span>}
                              </span>
                              <span className="ut-sub">{user.employeeId}</span>
                            </div>
                          </div>
                        </td>
                        <td><span className={`ut-badge is-${user.role}`}>{roleLabel(user.role)}</span></td>
                        <td>
                          <div className="ut-stack">
                            <strong>{user.dept ?? "-"}</strong>
                            {user.position ? <span className="ut-muted">{user.position}</span> : null}
                          </div>
                        </td>
                        <td>{user.lineLabel ?? <span className="ut-muted">Belum ada lini</span>}</td>
                        <td>{user.supervisor ?? <span className="ut-muted">-</span>}</td>
                        <td>
                          {user.mustChangePassword ? (
                            <span className="ut-badge is-warn">Password awal</span>
                          ) : (
                            <span className="ut-muted">Sudah diganti</span>
                          )}
                        </td>
                        <td className="ut-col-action">
                          <RowMenu label={`Aksi untuk ${user.name}`} items={items} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <UserModal
        open={form.open}
        user={form.user}
        supervisors={supervisors}
        onSave={save}
        onResetPassword={resetPassword}
        onClose={() => setForm({ open: false, user: null })}
      />
    </section>
  );
}
