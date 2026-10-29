"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError, accountApi, adminApi, getToken, setToken } from "../api";
import type { DmLine, DmLineInput, DmWorkshop } from "../api";
import type { DmLineStatus } from "../dmData";
import { homeFor } from "../account/homeFor";
import AttendanceRecap from "../meeting/AttendanceRecap";
import DmAdminSidebar from "./DmAdminSidebar";
import type { DmAdminTabKey } from "./DmAdminSidebar";
import DashboardTab from "./DashboardTab";
import MeetingScheduleManager from "./MeetingScheduleManager";
import LineDetailModal from "./LineDetailModal";
import type { TabKey } from "./LineDetailModal";
import LineTeamModal from "./LineTeamModal";
import MpvManager from "./MpvManager";
import UserManager from "./UserManager";
import {
  AlertIcon,
  CopyIcon,
  ExternalIcon,
  GearIcon,
  PlusIcon,
  UsersIcon,
} from "./AdminIcons";
import { IconLogout } from "@/components/ui/icons";
import { Layers, Pencil, Trash2 } from "lucide-react";
import WorkshopManager from "./WorkshopManager";
import PapercardTemplateManager from "./PapercardTemplateManager";
import { NotificationBellButton } from "../notifications/NotificationBellButton";
import DmGroupDialog from "./DmGroupDialog";
import RowMenu from "./RowMenu";
import { useDmGroups } from "./dmGroupsStore";
import type { DmGroup } from "./dmGroupsStore";
import "./AdminPanel.css";
import ProblemsPage from "../leader/problems/ProblemsPage";

type Auth =
  | { kind: "checking" }
  | { kind: "offline"; message: string }
  | { kind: "anon" }
  | { kind: "in"; username: string; isAdmin: boolean };

type Banner = { type: "success" | "info" | "error"; message: string };

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

function dashboardPath(line: DmLine) {
  return `/dm-dashboard/${line.slug}`;
}

function lineCodeRange(items: DmLine[]) {
  if (items.length === 0) return "";
  const codes = items
    .map((line) => line.code)
    .sort((left, right) =>
      left.localeCompare(right, undefined, { numeric: true })
    );
  return codes.length === 1
    ? `Line: ${codes[0]}`
    : `Line: ${codes[0]} - ${codes[codes.length - 1]}`;
}

export default function DmAdminPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<Auth>({ kind: "checking" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      setAuth({ kind: "anon" });
      router.replace("/dm-dashboard/masuk");
      return;
    }
    let cancelled = false;
    accountApi
      .me()
      .then((me) => {
        if (cancelled) return;
        if (me.kind !== "admin") {
          router.replace(homeFor(me));
          return;
        }
        setAuth({
          kind: "in",
          username: me.name ?? me.username,
          isAdmin: true,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 0) {
          setAuth({ kind: "offline", message: error.message });
          return;
        }
        setToken(null);
        setAuth({ kind: "anon" });
        router.replace("/dm-dashboard/masuk?expired=1");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, router]);

  const logout = useCallback(
    (notice: string | null) => {
      setToken(null);
      setAuth({ kind: "anon" });
      router.replace(
        notice ? "/dm-dashboard/masuk?expired=1" : "/dm-dashboard/masuk"
      );
    },
    [router]
  );

  if (auth.kind === "checking" || auth.kind === "anon") {
    return (
      <main className="dm-admin-login-screen" aria-busy="true">
        <p role="status">
          {auth.kind === "anon"
            ? "Mengalihkan ke halaman masuk..."
            : "Memeriksa sesi..."}
        </p>
      </main>
    );
  }

  if (auth.kind === "offline") {
    return (
      <main className="dm-admin-login-screen">
        <div className="dm-admin-state-block">
          <h1>Backend tidak terhubung</h1>
          <p role="alert">{auth.message}</p>
          <button
            type="button"
            className="dm-admin-btn is-primary"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Coba lagi
          </button>
        </div>
      </main>
    );
  }

  return (
    <AdminWorkspace
      username={auth.username}
      isAdmin={auth.isAdmin}
      onLogout={logout}
    />
  );
}

const tabLabels: Record<DmAdminTabKey, { crumb: string; title: string }> = {
  dashboard: {
    crumb: "Dashboard",
    title: "Dashboard Lini: KPI, Absensi, dan Meeting",
  },
  workshop: {
    crumb: "Lini, Workshop & Tim",
    title: "Pengaturan Workshop, Lini Produksi, dan Anggota Tim",
  },
  users: { crumb: "User", title: "Daftar User: Role dan Departemen" },
  papercard: {
    crumb: "Papercard & Meeting",
    title: "Template Papercard dan Jadwal DM Meeting per Lini",
  },
  mpv: {
    crumb: "MVP of The Month",
    title: "MVP of The Month per Lini dan Riwayatnya",
  },
  attendance: {
    crumb: "Rekap Presensi",
    title: "Rekapitulasi Presensi & Riwayat Meeting per Tanggal",
  },
  problems: {
    crumb: "Tracking Masalah",
    title: "Tracking Masalah DM Meeting",
  },
};

function AdminWorkspace({
  username,
  isAdmin,
  onLogout,
}: {
  username: string;
  isAdmin: boolean;
  onLogout: (notice: string | null) => void;
}) {
  const [activeTab, setActiveTab] = useState<DmAdminTabKey>(
    isAdmin ? "workshop" : "dashboard"
  );
  const [papercardSub, setPapercardSub] = useState<"template" | "meeting">(
    "template"
  );
  const [workshops, setWorkshops] = useState<DmWorkshop[]>([]);
  const [lines, setLines] = useState<DmLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DmLineStatus>("all");
  const [workshopFilter, setWorkshopFilter] = useState<"all" | number>("all");
  const [modal, setModal] = useState<{
    open: boolean;
    line: DmLine | null;
    tab: TabKey;
  }>({
    open: false,
    line: null,
    tab: "general",
  });
  const [teamModalLine, setTeamModalLine] = useState<DmLine | null>(null);
  const {
    groups,
    lineGroupMap,
    deleteGroup,
    refresh: refreshDmGroups,
  } = useDmGroups();
  const [dmCreateWorkshopId, setDmCreateWorkshopId] = useState<number | null>(
    null
  );
  const [lineDefaults, setLineDefaults] = useState<{
    workshopId: number;
    dmGroupId: number;
  } | null>(null);
  const [dmEditGroup, setDmEditGroup] = useState<DmGroup | null>(null);

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
    if (!isAdmin) {
      setLines(await call(() => accountApi.lines()));
      return;
    }
    const [nextWorkshops, nextLines] = await call(() =>
      Promise.all([adminApi.workshops(), adminApi.lines()])
    );
    setWorkshops(nextWorkshops);
    setLines(nextLines);
  }, [call, isAdmin]);

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
    notify(
      "success",
      `Nama workshop diubah menjadi "${name}". Rail kanan dashboard ikut berubah.`
    );
  }

  async function deleteWorkshop(workshop: DmWorkshop) {
    if (!window.confirm(`Hapus ${workshop.name}?`)) return;
    await call(() => adminApi.deleteWorkshop(workshop.id));
    await refreshAll();
    notify("success", `${workshop.name} dihapus.`);
  }

  async function saveLine(data: DmLineInput, lineId: number | null) {
    const saved = await call(() =>
      lineId ? adminApi.updateLine(lineId, data) : adminApi.createLine(data)
    );
    await refreshAll();
    await refreshDmGroups();
    return saved;
  }

  function finishLine(line: DmLine) {
    setModal({ open: false, line: null, tab: "general" });
    notify(
      "success",
      `Line ${line.code} diterbitkan. Link dashboard: ${dashboardPath(line)}`
    );
  }

  async function deleteLine(line: DmLine) {
    await call(() => adminApi.deleteLine(line.id));
    await refreshAll();
    setModal({ open: false, line: null, tab: "general" });
    notify("success", `Line ${line.code} dan dashboard-nya dihapus.`);
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

  async function removeDmGroup(group: DmGroup) {
    if (!window.confirm(`Hapus ${group.name}?`)) return;
    try {
      await deleteGroup(group.id);
      notify("success", `${group.name} dihapus.`);
    } catch (error) {
      notify("error", messageOf(error));
    }
  }

  const query = searchQuery.toLowerCase().trim();
  const filteredLines = lines.filter((line) => {
    const matchesSearch =
      !query ||
      [
        line.code,
        line.name,
        line.workshopName,
        line.model ?? "",
        line.slogan ?? "",
      ].some((value) => value.toLowerCase().includes(query));
    const matchesStatus =
      statusFilter === "all" || line.status === statusFilter;
    const matchesWorkshop =
      workshopFilter === "all" || line.workshopId === workshopFilter;
    return matchesSearch && matchesStatus && matchesWorkshop;
  });

  const groupedLines: [number, { name: string; items: DmLine[] }][] = workshops
    .filter(
      (workshop) => workshopFilter === "all" || workshop.id === workshopFilter
    )
    .map((workshop) => [
      workshop.id,
      {
        name: workshop.name,
        items: filteredLines.filter((line) => line.workshopId === workshop.id),
      },
    ]);

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setWorkshopFilter("all");
  }

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = currentTime
    .toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/\./g, ":"); // Ganti titik dengan titik dua

  function renderLineCards(items: DmLine[]) {
    return (
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
              {line.published ? null : (
                <span className="dm-chip is-warn">DRAFT</span>
              )}
              {line.model ? (
                <span className="dm-chip">{line.model}</span>
              ) : null}
              {line.memberCount > 0 ? (
                <button
                  type="button"
                  className="dm-chip"
                  onClick={() => setTeamModalLine(line)}
                  style={{
                    cursor: "pointer",
                    border: "none",
                    background: "inherit",
                  }}
                  title="Klik untuk membuka manajemen tim line ini"
                >
                  <UsersIcon size={13} />
                  {line.memberCount} anggota
                </button>
              ) : (
                <button
                  type="button"
                  className="dm-chip is-warn"
                  onClick={() => setTeamModalLine(line)}
                  style={{ cursor: "pointer", border: "none" }}
                  title="Klik untuk menambahkan anggota tim"
                >
                  <AlertIcon size={13} />0 anggota
                </button>
              )}
            </div>
            <a
              className="dm-line-link"
              href={dashboardPath(line)}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka dashboard line ini di tab baru"
            >
              <span>{dashboardPath(line)}</span>
              <ExternalIcon size={14} />
            </a>
            <div className="dm-line-actions">
              <button
                type="button"
                className="dm-admin-btn is-primary"
                onClick={() => setTeamModalLine(line)}
                style={{
                  background: "#008a4f",
                  color: "#ffffff",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 6px rgba(0, 138, 79, 0.25)",
                }}
                title={`Buka Manajemen Tim khusus untuk Line ${line.code}`}
              >
                <UsersIcon size={14} />
                <span>Atur Tim ({line.memberCount}/4)</span>
              </button>
              <button
                type="button"
                className="dm-admin-btn is-soft"
                onClick={() => setModal({ open: true, line, tab: "general" })}
                title="Ubah informasi line, model, atau status"
              >
                <GearIcon size={14} />
                Kelola line
              </button>
              <button
                type="button"
                className="dm-admin-btn is-tonal"
                onClick={() => copyLink(line)}
              >
                <CopyIcon size={14} />
                Salin Link
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="dm-admin-layout">
      <DmAdminSidebar
        isAdmin={isAdmin}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={() => onLogout(null)}
      />

      <div className="dm-admin-main-wrap">
        <header className="dm-admin-topbar-nav">
          <div className="dm-admin-topbar-left">
            <nav className="dm-admin-crumbs" aria-label="Hari dan Tanggal">
              <span>{formattedDate}</span>
            </nav>
            <h2
              className="dm-admin-topbar-title"
              style={{
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.5px",
              }}
            >
              {formattedTime} WIB
            </h2>
          </div>
          <div className="dm-admin-topbar-actions">
            <span className="dm-admin-topbar-crumb">
              Masuk sebagai {username}
            </span>
            <NotificationBellButton
              lineId={0}
              role="admin"
              lineName="Semua Line"
              lines={lines}
            />
            <button
              type="button"
              className="dm-admin-btn is-secondary"
              onClick={reload}
              disabled={loading}
            >
              Muat Ulang
            </button>
            <button
              type="button"
              className="dm-admin-btn is-danger-outline"
              onClick={() => onLogout(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
              title="Keluar dari sesi Admin"
            >
              <IconLogout size={14} />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        <main className="dm-admin-content-pane">
          {banner && (
            <div
              className={`dm-admin-alert-banner is-${banner.type}`}
              role={banner.type === "error" ? "alert" : "status"}
            >
              <span>{banner.message}</span>
              <button
                type="button"
                onClick={() => setBanner(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  color: "inherit",
                  fontWeight: "bold",
                }}
                aria-label="Tutup notifikasi"
              >
                &times;
              </button>
            </div>
          )}

          <div
            className={`dm-admin-panel-card${
              activeTab === "workshop" ||
              activeTab === "dashboard" ||
              activeTab === "users"
                ? " is-bare"
                : ""
            }`}
          >
            {activeTab === "dashboard" && (
              <div className="dm-admin-section dm-tab-lines">
                {loading ? (
                  <p role="status">Memuat line...</p>
                ) : loadError ? (
                  <div className="dm-admin-state-block">
                    <h3>Data belum bisa dimuat</h3>
                    <p role="alert">{loadError}</p>
                    <button
                      type="button"
                      className="dm-admin-btn is-primary"
                      onClick={reload}
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : (
                  <DashboardTab
                    lines={lines}
                    onGoToLines={() => setActiveTab("workshop")}
                    canManage={isAdmin}
                  />
                )}
              </div>
            )}

            {activeTab === "workshop" && (
              <div className="dm-admin-section dm-tab-lines">
                {loading ? (
                  <p role="status">Memuat workshop dan line...</p>
                ) : loadError ? (
                  <div className="dm-admin-state-block">
                    <h3>Data belum bisa dimuat</h3>
                    <p role="alert">{loadError}</p>
                    <button
                      type="button"
                      className="dm-admin-btn is-primary"
                      onClick={reload}
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : (
                  <>
                    <WorkshopManager
                      workshops={workshops}
                      onAddDm={(workshop) => setDmCreateWorkshopId(workshop.id)}
                      onCreate={createWorkshop}
                      onRename={renameWorkshop}
                      onDelete={deleteWorkshop}
                    />

                    <section
                      className="dm-panel dm-lines-card"
                      aria-labelledby="lines-title"
                    >
                      <div className="dm-panel-head">
                        <div>
                          <h3 id="lines-title" className="dm-panel-title">
                            Daftar Line Produksi
                          </h3>
                          <p className="dm-panel-sub">
                            Tiap Line punya satu dashboard dengan link sendiri
                            untuk dipasang di layar Line. Lini dikelompokkan
                            berdasarkan DM Meeting.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="dm-admin-btn is-primary dm-btn-add"
                          disabled={groups.length === 0}
                          title={
                            groups.length === 0
                              ? "Tambahkan workshop dan DM dulu"
                              : undefined
                          }
                          onClick={() => {
                            setLineDefaults(null);
                            setModal({
                              open: true,
                              line: null,
                              tab: "general",
                            });
                          }}
                        >
                          <PlusIcon size={14} />
                          Tambah Line Baru
                        </button>
                      </div>

                      {workshops.length === 0 ? (
                        <p className="dm-lines-empty">
                          {workshops.length === 0
                            ? "Belum ada line. Tambahkan workshop lebih dulu, lalu buat line di dalamnya."
                            : 'Belum ada line. Klik "Tambah Line Baru" untuk membuat line dan dashboard pertama.'}
                        </p>
                      ) : (
                        <>
                          <div className="dm-lines-toolbar">
                            <div className="dm-table-search-box">
                              <label
                                className="dm-admin-sr-only"
                                htmlFor="line-search"
                              >
                                Cari line
                              </label>
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                className="dm-table-search-icon"
                                aria-hidden="true"
                              >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              </svg>
                              <input
                                id="line-search"
                                type="search"
                                className="dm-table-search-input"
                                placeholder="Cari kode line, nama tim, atau model"
                                value={searchQuery}
                                onChange={(event) =>
                                  setSearchQuery(event.target.value)
                                }
                              />
                            </div>
                            <label
                              className="dm-admin-sr-only"
                              htmlFor="line-workshop-filter"
                            >
                              Filter workshop
                            </label>
                            <select
                              id="line-workshop-filter"
                              className="dm-table-filter-select"
                              value={workshopFilter}
                              onChange={(event) =>
                                setWorkshopFilter(
                                  event.target.value === "all"
                                    ? "all"
                                    : Number(event.target.value)
                                )
                              }
                            >
                              <option value="all">Semua workshop</option>
                              {workshops.map((workshop) => (
                                <option key={workshop.id} value={workshop.id}>
                                  {workshop.name}
                                </option>
                              ))}
                            </select>
                            <label
                              className="dm-admin-sr-only"
                              htmlFor="line-status-filter"
                            >
                              Filter status
                            </label>
                            <select
                              id="line-status-filter"
                              className="dm-table-filter-select"
                              value={statusFilter}
                              onChange={(event) =>
                                setStatusFilter(
                                  event.target.value as "all" | DmLineStatus
                                )
                              }
                            >
                              <option value="all">Semua status</option>
                              <option value="running">RUNNING</option>
                              <option value="idle">IDLE</option>
                              <option value="stopped">STOPPED</option>
                            </select>
                            <span
                              className="dm-pill dm-lines-count"
                              role="status"
                            >
                              {filteredLines.length} dari {lines.length} line
                            </span>
                          </div>

                          {filteredLines.length === 0 &&
                          (query !== "" || statusFilter !== "all") ? (
                            <div className="dm-lines-none">
                              <p>
                                Tidak ada line yang cocok dengan pencarian atau
                                filter ini.
                              </p>
                              <button
                                type="button"
                                className="dm-admin-btn is-tonal"
                                onClick={resetFilters}
                              >
                                Tampilkan semua line
                              </button>
                            </div>
                          ) : (
                            groupedLines.map(([workshopId, workshop]) => {
                              const workshopDms = groups
                                .filter(
                                  (group) => group.workshopId === workshopId
                                )
                                .sort((left, right) => left.id - right.id);

                              if (workshopDms.length === 0) {
                                return (
                                  <section
                                    key={workshopId}
                                    className="dm-lines-group"
                                    aria-label={workshop.name}
                                  >
                                    <h4 className="dm-lines-group-title">
                                      {workshop.name}
                                      <span className="dm-pill">
                                        {workshop.items.length} line
                                      </span>
                                    </h4>
                                    <p className="dm-lines-empty">
                                      Belum ada DM. Tambahkan DM sebelum membuat
                                      lini.
                                    </p>
                                    <button
                                      type="button"
                                      className="dm-admin-btn is-primary"
                                      onClick={() =>
                                        setDmCreateWorkshopId(workshopId)
                                      }
                                    >
                                      <PlusIcon size={14} /> Tambah DM
                                    </button>
                                    {renderLineCards(workshop.items)}
                                  </section>
                                );
                              }

                              const dmSections = workshopDms
                                .map((group) => ({
                                  group,
                                  visible: workshop.items.filter(
                                    (line) => lineGroupMap[line.id] === group.id
                                  ),
                                  all: lines.filter(
                                    (line) =>
                                      line.workshopId === workshopId &&
                                      lineGroupMap[line.id] === group.id
                                  ),
                                }))
                                .filter(
                                  (entry) =>
                                    entry.visible.length > 0 ||
                                    entry.all.length === 0
                                );
                              const otherVisible = workshop.items.filter(
                                (line) =>
                                  !workshopDms.some(
                                    (group) =>
                                      group.id === lineGroupMap[line.id]
                                  )
                              );

                              return (
                                <section
                                  key={workshopId}
                                  className="dm-lines-group is-dm"
                                  aria-label={workshop.name}
                                >
                                  <h4 className="dm-lines-group-title">
                                    {workshop.name}
                                    <span className="dm-pill">
                                      {workshop.items.length} line
                                    </span>
                                    <button
                                      type="button"
                                      className="dm-admin-btn is-tonal"
                                      onClick={() =>
                                        setDmCreateWorkshopId(workshopId)
                                      }
                                    >
                                      <PlusIcon size={14} /> Tambah DM
                                    </button>
                                  </h4>
                                  <div className="dm-dm-groups">
                                    {dmSections.map(
                                      ({ group, visible, all }) => (
                                        <div
                                          key={group.id}
                                          className="dm-dm-group"
                                        >
                                          <div className="dm-dm-head">
                                            <div className="dm-dm-head-main">
                                              <span className="dm-dm-icon">
                                                <Layers
                                                  size={16}
                                                  strokeWidth={1.8}
                                                  aria-hidden="true"
                                                />
                                              </span>
                                              <span className="dm-dm-name">
                                                {group.name}
                                              </span>
                                              <span className="dm-pill">
                                                {visible.length} line
                                              </span>
                                            </div>
                                            <div className="dm-dm-head-side">
                                              <button
                                                type="button"
                                                className="dm-admin-btn is-tonal"
                                                onClick={() => {
                                                  setLineDefaults({
                                                    workshopId,
                                                    dmGroupId: group.id,
                                                  });
                                                  setModal({
                                                    open: true,
                                                    line: null,
                                                    tab: "general",
                                                  });
                                                }}
                                              >
                                                <PlusIcon size={14} /> Tambah
                                                Lini
                                              </button>
                                              {all.length > 0 ? (
                                                <span className="dm-dm-range">
                                                  {lineCodeRange(all)}
                                                </span>
                                              ) : null}
                                              <RowMenu
                                                label={`Aksi ${group.name}`}
                                                items={[
                                                  {
                                                    key: "edit",
                                                    label: "Ubah DM",
                                                    icon: (
                                                      <Pencil
                                                        size={16}
                                                        strokeWidth={1.8}
                                                      />
                                                    ),
                                                    onSelect: () =>
                                                      setDmEditGroup(group),
                                                  },
                                                  {
                                                    key: "delete",
                                                    label: "Hapus DM",
                                                    icon: (
                                                      <Trash2
                                                        size={16}
                                                        strokeWidth={1.8}
                                                      />
                                                    ),
                                                    danger: true,
                                                    onSelect: () => {
                                                      void removeDmGroup(group);
                                                    },
                                                  },
                                                ]}
                                              />
                                            </div>
                                          </div>
                                          {visible.length > 0
                                            ? renderLineCards(visible)
                                            : null}
                                        </div>
                                      )
                                    )}

                                    {otherVisible.length > 0 ? (
                                      <div className="dm-dm-group is-other">
                                        <div className="dm-dm-head">
                                          <div className="dm-dm-head-main">
                                            <span className="dm-dm-icon">
                                              <Layers
                                                size={16}
                                                strokeWidth={1.8}
                                                aria-hidden="true"
                                              />
                                            </span>
                                            <span className="dm-dm-name">
                                              Belum masuk DM
                                            </span>
                                            <span className="dm-pill">
                                              {otherVisible.length} line
                                            </span>
                                          </div>
                                        </div>
                                        {renderLineCards(otherVisible)}
                                      </div>
                                    ) : null}
                                  </div>
                                </section>
                              );
                            })
                          )}
                        </>
                      )}
                    </section>
                  </>
                )}
              </div>
            )}

            {activeTab === "users" && (
              <div className="dm-admin-section dm-tab-lines">
                <UserManager call={call} />
              </div>
            )}

            {activeTab === "papercard" && (
              <div className="dm-admin-section">
                <div
                  className="dm-subtabs"
                  role="tablist"
                  aria-label="Pengaturan line"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={papercardSub === "template"}
                    className={`dm-subtab${
                      papercardSub === "template" ? " is-active" : ""
                    }`}
                    onClick={() => setPapercardSub("template")}
                  >
                    Template Papercard
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={papercardSub === "meeting"}
                    className={`dm-subtab${
                      papercardSub === "meeting" ? " is-active" : ""
                    }`}
                    onClick={() => setPapercardSub("meeting")}
                  >
                    Jadwalkan Meeting
                  </button>
                </div>
                {papercardSub === "template" ? (
                  <PapercardTemplateManager
                    workshops={workshops}
                    lines={lines}
                  />
                ) : (
                  <MeetingScheduleManager lines={lines} />
                )}
              </div>
            )}

            {activeTab === "mpv" && (
              <div className="dm-admin-section">
                {loading ? (
                  <p role="status">Memuat line...</p>
                ) : loadError ? (
                  <div className="dm-admin-state-block">
                    <h3>Data belum bisa dimuat</h3>
                    <p role="alert">{loadError}</p>
                    <button
                      type="button"
                      className="dm-admin-btn is-primary"
                      onClick={reload}
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : (
                  <MpvManager lines={lines} call={call} />
                )}
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="dm-admin-section">
                <div
                  className="dm-admin-sec-head"
                  style={{ marginBottom: "1.2rem" }}
                >
                  <h3 className="dm-admin-sec-title">Rekapitulasi Presensi</h3>
                  <span className="dm-admin-sec-sub">
                    Pantau kehadiran tim.
                  </span>
                </div>
                <AttendanceRecap lines={lines} call={call} />
              </div>
            )}
            {activeTab === "problems" && (
              <div className="dm-admin-section">
                <ProblemsPage />
              </div>
            )}
          </div>
        </main>
      </div>

      {isAdmin ? (
        <>
          <LineTeamModal
            open={Boolean(teamModalLine)}
            line={teamModalLine}
            call={call}
            onChanged={refreshQuietly}
            onClose={() => setTeamModalLine(null)}
            onGoToMpv={() => {
              setTeamModalLine(null);
              setActiveTab("mpv");
            }}
          />
          <LineDetailModal
            open={modal.open}
            line={modal.line}
            initialTab={modal.tab}
            workshops={workshops}
            defaultWorkshopId={lineDefaults?.workshopId ?? null}
            defaultDmGroupId={lineDefaults?.dmGroupId ?? null}
            call={call}
            onTeamChanged={refreshQuietly}
            onSave={saveLine}
            onFinish={finishLine}
            onDelete={deleteLine}
            onClose={() =>
              setModal({ open: false, line: null, tab: "general" })
            }
          />
          <DmGroupDialog
            open={dmCreateWorkshopId !== null}
            mode="create"
            group={null}
            workshops={workshops}
            initialWorkshopId={dmCreateWorkshopId}
            workshopLocked
            onClose={() => setDmCreateWorkshopId(null)}
            onSaved={(group) => {
              setDmCreateWorkshopId(null);
              notify(
                "success",
                `DM ${group.name} ditambahkan. Tambahkan lini di dalam DM ini.`
              );
            }}
          />
          <DmGroupDialog
            open={Boolean(dmEditGroup)}
            mode="edit"
            group={dmEditGroup}
            workshops={workshops}
            initialWorkshopId={dmEditGroup?.workshopId ?? null}
            workshopLocked
            onClose={() => setDmEditGroup(null)}
            onSaved={(group) => {
              setDmEditGroup(null);
              notify("success", `DM ${group.name} berhasil diperbarui.`);
            }}
          />
        </>
      ) : null}
    </div>
  );
}
