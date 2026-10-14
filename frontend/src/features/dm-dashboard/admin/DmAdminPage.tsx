"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError, adminApi, getToken, setToken } from "../api";
import type { DmLine, DmLineInput, DmWorkshop } from "../api";
import type { DmLineStatus } from "../dmData";
import AttendanceRecap from "../meeting/AttendanceRecap";
import AdminLogin from "./AdminLogin";
import DmAdminSidebar from "./DmAdminSidebar";
import type { DmAdminTabKey } from "./DmAdminSidebar";
import DashboardTab from "./DashboardTab";
import LineDetailModal from "./LineDetailModal";
import type { TabKey } from "./LineDetailModal";
import MpvManager from "./MpvManager";
import { AlertIcon, CopyIcon, ExternalIcon, GearIcon, PlusIcon, UsersIcon } from "./AdminIcons";
import WorkshopManager from "./WorkshopManager";
import "./AdminPanel.css";

type Auth =
  | { kind: "checking" }
  | { kind: "offline"; message: string }
  | { kind: "anon"; notice: string | null }
  | { kind: "in"; username: string };

type Banner = { type: "success" | "info" | "error"; message: string };

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

function dashboardPath(line: DmLine) {
  return `/dm-dashboard/${line.slug}`;
}

export default function DmAdminPage() {
  const [auth, setAuth] = useState<Auth>({ kind: "checking" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      setAuth({ kind: "anon", notice: null });
      return;
    }
    let cancelled = false;
    adminApi
      .me()
      .then((me) => {
        if (!cancelled) setAuth({ kind: "in", username: me.username });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 0) {
          setAuth({ kind: "offline", message: error.message });
          return;
        }
        setToken(null);
        setAuth({ kind: "anon", notice: "Sesi berakhir, silakan login lagi." });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const logout = useCallback((notice: string | null) => {
    setToken(null);
    setAuth({ kind: "anon", notice });
  }, []);

  if (auth.kind === "checking") {
    return (
      <main className="dm-admin-login-screen" aria-busy="true">
        <p role="status">Memeriksa sesi...</p>
      </main>
    );
  }

  if (auth.kind === "offline") {
    return (
      <main className="dm-admin-login-screen">
        <div className="dm-admin-state-block">
          <h1>Backend tidak terhubung</h1>
          <p role="alert">{auth.message}</p>
          <button type="button" className="dm-admin-btn is-primary" onClick={() => setAttempt((n) => n + 1)}>
            Coba lagi
          </button>
        </div>
      </main>
    );
  }

  if (auth.kind === "anon") {
    return <AdminLogin notice={auth.notice} onLoggedIn={(username) => setAuth({ kind: "in", username })} />;
  }

  return <AdminWorkspace username={auth.username} onLogout={logout} />;
}

const tabLabels: Record<DmAdminTabKey, { crumb: string; title: string }> = {
  dashboard: { crumb: "Dashboard", title: "Dashboard Lini: KPI, Absensi, dan Meeting" },
  workshop: { crumb: "Lini, Workshop & Tim", title: "Pengaturan Workshop, Lini Produksi, dan Anggota Tim" },
  mpv: { crumb: "MPV of The Month", title: "MPV of The Month per Lini dan Riwayatnya" },
  attendance: { crumb: "Rekap Presensi", title: "Rekapitulasi Presensi & Riwayat Meeting per Tanggal" },
};

function AdminWorkspace({ username, onLogout }: { username: string; onLogout: (notice: string | null) => void }) {
  const [activeTab, setActiveTab] = useState<DmAdminTabKey>("workshop");
  const [workshops, setWorkshops] = useState<DmWorkshop[]>([]);
  const [lines, setLines] = useState<DmLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DmLineStatus>("all");
  const [workshopFilter, setWorkshopFilter] = useState<"all" | number>("all");
  const [modal, setModal] = useState<{ open: boolean; line: DmLine | null; tab: TabKey }>({
    open: false,
    line: null,
    tab: "general",
  });

  const call = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          onLogout("Sesi berakhir, silakan login lagi.");
        }
        throw error;
      }
    },
    [onLogout]
  );

  const refreshAll = useCallback(async () => {
    const [nextWorkshops, nextLines] = await call(() => Promise.all([adminApi.workshops(), adminApi.lines()]));
    setWorkshops(nextWorkshops);
    setLines(nextLines);
  }, [call]);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await refreshAll();
    } catch (error) {
      setLoadError(messageOf(error));
    } finally {
      setLoading(false);
    }
  }, [refreshAll]);

  useEffect(() => {
    reload();
  }, [reload]);

  const refreshQuietly = useCallback(async () => {
    try {
      await refreshAll();
    } catch {
      return;
    }
  }, [refreshAll]);

  function notify(type: Banner["type"], message: string) {
    setBanner({ type, message });
  }

  async function createWorkshop(name: string) {
    await call(() => adminApi.createWorkshop(name));
    await refreshAll();
    notify("success", `Workshop "${name}" ditambahkan.`);
  }

  async function renameWorkshop(id: number, name: string) {
    await call(() => adminApi.renameWorkshop(id, name));
    await refreshAll();
    notify("success", `Nama workshop diubah menjadi "${name}". Rail kanan dashboard ikut berubah.`);
  }

  async function deleteWorkshop(workshop: DmWorkshop) {
    if (!window.confirm(`Hapus ${workshop.name}?`)) return;
    await call(() => adminApi.deleteWorkshop(workshop.id));
    await refreshAll();
    notify("success", `${workshop.name} dihapus.`);
  }

  async function saveLine(data: DmLineInput) {
    const editing = modal.line;
    const saved = await call(() => (editing ? adminApi.updateLine(editing.id, data) : adminApi.createLine(data)));
    await refreshAll();
    if (editing) {
      setModal({ open: false, line: null, tab: "general" });
      notify("success", `Lini ${saved.code} diperbarui. Dashboard di layar ikut berubah dalam semenit.`);
    } else {
      setModal({ open: true, line: saved, tab: "team" });
      notify("success", `Lini ${saved.code} dibuat. Link dashboard: ${dashboardPath(saved)}`);
    }
  }

  async function deleteLine(line: DmLine) {
    await call(() => adminApi.deleteLine(line.id));
    await refreshAll();
    setModal({ open: false, line: null, tab: "general" });
    notify("success", `Lini ${line.code} dan dashboard-nya dihapus.`);
  }

  async function copyLink(line: DmLine) {
    const url = `${window.location.origin}${dashboardPath(line)}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("success", `Link disalin: ${url}`);
    } catch {
      notify("info", `Browser menolak menyalin otomatis. Salin manual: ${url}`);
    }
  }

  const query = searchQuery.toLowerCase().trim();
  const filteredLines = lines.filter((line) => {
    const matchesSearch =
      !query ||
      [line.code, line.name, line.workshopName, line.model ?? "", line.slogan ?? ""].some((value) =>
        value.toLowerCase().includes(query)
      );
    const matchesStatus = statusFilter === "all" || line.status === statusFilter;
    const matchesWorkshop = workshopFilter === "all" || line.workshopId === workshopFilter;
    return matchesSearch && matchesStatus && matchesWorkshop;
  });

  const groupedLines = Array.from(
    filteredLines.reduce((groups, line) => {
      groups.set(line.workshopName, [...(groups.get(line.workshopName) ?? []), line]);
      return groups;
    }, new Map<string, DmLine[]>())
  );

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setWorkshopFilter("all");
  }

  return (
    <div className="dm-admin-layout">
      <DmAdminSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      <div className="dm-admin-main-wrap">
        <header className="dm-admin-topbar-nav">
          <div className="dm-admin-topbar-left">
            <span className="dm-admin-topbar-crumb">DM Admin &bull; {tabLabels[activeTab].crumb}</span>
            <h2 className="dm-admin-topbar-title">{tabLabels[activeTab].title}</h2>
          </div>
          <div className="dm-admin-topbar-actions">
            <span className="dm-admin-topbar-crumb">Masuk sebagai {username}</span>
            <button type="button" className="dm-admin-btn is-secondary" onClick={reload} disabled={loading}>
              Muat Ulang
            </button>
            <button type="button" className="dm-admin-btn is-danger-outline" onClick={() => onLogout(null)}>
              Keluar
            </button>
          </div>
        </header>

        <main className="dm-admin-content-pane">
          {banner && (
            <div className={`dm-admin-alert-banner is-${banner.type}`} role={banner.type === "error" ? "alert" : "status"}>
              <span>{banner.message}</span>
              <button
                type="button"
                onClick={() => setBanner(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "inherit", fontWeight: "bold" }}
                aria-label="Tutup notifikasi"
              >
                &times;
              </button>
            </div>
          )}

          <div className={`dm-admin-panel-card${activeTab === "workshop" || activeTab === "dashboard" ? " is-bare" : ""}`}>
            {activeTab === "dashboard" && (
              <div className="dm-admin-section dm-tab-lines">
                {loading ? (
                  <p role="status">Memuat lini...</p>
                ) : loadError ? (
                  <div className="dm-admin-state-block">
                    <h3>Data belum bisa dimuat</h3>
                    <p role="alert">{loadError}</p>
                    <button type="button" className="dm-admin-btn is-primary" onClick={reload}>Coba lagi</button>
                  </div>
                ) : (
                  <DashboardTab lines={lines} onGoToLines={() => setActiveTab("workshop")} />
                )}
              </div>
            )}

            {activeTab === "workshop" && (
              <div className="dm-admin-section dm-tab-lines">
                {loading ? (
                  <p role="status">Memuat workshop dan lini...</p>
                ) : loadError ? (
                  <div className="dm-admin-state-block">
                    <h3>Data belum bisa dimuat</h3>
                    <p role="alert">{loadError}</p>
                    <button type="button" className="dm-admin-btn is-primary" onClick={reload}>Coba lagi</button>
                  </div>
                ) : (
                  <>
                    <WorkshopManager
                      workshops={workshops}
                      onCreate={createWorkshop}
                      onRename={renameWorkshop}
                      onDelete={deleteWorkshop}
                    />

                    <section className="dm-panel dm-lines-card" aria-labelledby="lines-title">
                      <div className="dm-panel-head">
                        <div>
                          <h3 id="lines-title" className="dm-panel-title">Daftar Lini Produksi</h3>
                          <p className="dm-panel-sub">
                            Tiap lini punya satu dashboard dengan link sendiri untuk dipasang di layar lini.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="dm-admin-btn is-primary dm-btn-add"
                          disabled={workshops.length === 0}
                          title={workshops.length === 0 ? "Tambahkan workshop dulu" : undefined}
                          onClick={() => setModal({ open: true, line: null, tab: "general" })}
                        >
                          <PlusIcon size={14} />
                          Tambah Lini Baru
                        </button>
                      </div>

                      {lines.length === 0 ? (
                        <p className="dm-lines-empty">
                          {workshops.length === 0
                            ? "Belum ada lini. Tambahkan workshop lebih dulu, lalu buat lini di dalamnya."
                            : "Belum ada lini. Klik \"Tambah Lini Baru\" untuk membuat lini dan dashboard pertama."}
                        </p>
                      ) : (
                        <>
                          <div className="dm-lines-toolbar">
                            <div className="dm-table-search-box">
                              <label className="dm-admin-sr-only" htmlFor="line-search">Cari lini</label>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="dm-table-search-icon" aria-hidden="true">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              </svg>
                              <input
                                id="line-search"
                                type="search"
                                className="dm-table-search-input"
                                placeholder="Cari kode lini, nama tim, atau model"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                              />
                            </div>
                            <label className="dm-admin-sr-only" htmlFor="line-workshop-filter">Filter workshop</label>
                            <select
                              id="line-workshop-filter"
                              className="dm-table-filter-select"
                              value={workshopFilter}
                              onChange={(event) =>
                                setWorkshopFilter(event.target.value === "all" ? "all" : Number(event.target.value))
                              }
                            >
                              <option value="all">Semua workshop</option>
                              {workshops.map((workshop) => (
                                <option key={workshop.id} value={workshop.id}>{workshop.name}</option>
                              ))}
                            </select>
                            <label className="dm-admin-sr-only" htmlFor="line-status-filter">Filter status</label>
                            <select
                              id="line-status-filter"
                              className="dm-table-filter-select"
                              value={statusFilter}
                              onChange={(event) => setStatusFilter(event.target.value as "all" | DmLineStatus)}
                            >
                              <option value="all">Semua status</option>
                              <option value="running">RUNNING</option>
                              <option value="idle">IDLE</option>
                              <option value="stopped">STOPPED</option>
                            </select>
                            <span className="dm-pill dm-lines-count" role="status">
                              {filteredLines.length} dari {lines.length} lini
                            </span>
                          </div>

                          {filteredLines.length === 0 ? (
                            <div className="dm-lines-none">
                              <p>Tidak ada lini yang cocok dengan pencarian atau filter ini.</p>
                              <button type="button" className="dm-admin-btn is-tonal" onClick={resetFilters}>
                                Tampilkan semua lini
                              </button>
                            </div>
                          ) : (
                            groupedLines.map(([workshopName, items]) => (
                              <section key={workshopName} className="dm-lines-group" aria-label={workshopName}>
                                <h4 className="dm-lines-group-title">
                                  {workshopName}
                                  <span className="dm-pill">{items.length} lini</span>
                                </h4>
                                <ul className="dm-line-grid">
                                  {items.map((line) => (
                                    <li key={line.id} className="dm-line-card">
                                      <div className="dm-line-card-top">
                                        <span className="dm-line-code">{line.code}</span>
                                        <span className={`dm-status-badge is-${line.status}`}>
                                          <span className="dm-status-dot" aria-hidden="true" />
                                          {line.status.toUpperCase()}
                                        </span>
                                      </div>
                                      <span className="dm-line-name">{line.name}</span>
                                      <div className="dm-line-chips">
                                        {line.model ? <span className="dm-chip">{line.model}</span> : null}
                                        {line.memberCount > 0 ? (
                                          <span className="dm-chip">
                                            <UsersIcon size={13} />
                                            {line.memberCount} anggota
                                          </span>
                                        ) : (
                                          <span className="dm-chip is-warn">
                                            <AlertIcon size={13} />
                                            0 anggota
                                          </span>
                                        )}
                                      </div>
                                      <a
                                        className="dm-line-link"
                                        href={dashboardPath(line)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Buka dashboard lini ini di tab baru"
                                      >
                                        <span>{dashboardPath(line)}</span>
                                        <ExternalIcon size={14} />
                                      </a>
                                      <div className="dm-line-actions">
                                        <button
                                          type="button"
                                          className="dm-admin-btn is-soft"
                                          onClick={() => setModal({ open: true, line, tab: "general" })}
                                        >
                                          <GearIcon size={14} />
                                          Kelola Lini &amp; Tim
                                        </button>
                                        <button type="button" className="dm-admin-btn is-tonal" onClick={() => copyLink(line)}>
                                          <CopyIcon size={14} />
                                          Salin Link
                                        </button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </section>
                            ))
                          )}
                        </>
                      )}
                    </section>
                  </>
                )}
              </div>
            )}

            {activeTab === "mpv" && (
              <div className="dm-admin-section">
                {loading ? (
                  <p role="status">Memuat lini...</p>
                ) : loadError ? (
                  <div className="dm-admin-state-block">
                    <h3>Data belum bisa dimuat</h3>
                    <p role="alert">{loadError}</p>
                    <button type="button" className="dm-admin-btn is-primary" onClick={reload}>Coba lagi</button>
                  </div>
                ) : (
                  <MpvManager lines={lines} call={call} />
                )}
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="dm-admin-section">
                <div className="dm-admin-sec-head" style={{ marginBottom: "1.2rem" }}>
                  <h3 className="dm-admin-sec-title">Rekapitulasi Presensi</h3>
                  <span className="dm-admin-sec-sub">Pantau kehadiran tim.</span>
                </div>
                <AttendanceRecap />
              </div>
            )}
          </div>
        </main>
      </div>

      <LineDetailModal
        open={modal.open}
        line={modal.line}
        initialTab={modal.tab}
        workshops={workshops}
        defaultWorkshopId={null}
        call={call}
        onTeamChanged={refreshQuietly}
        onSave={saveLine}
        onDelete={deleteLine}
        onClose={() => setModal({ open: false, line: null, tab: "general" })}
      />
    </div>
  );
}
