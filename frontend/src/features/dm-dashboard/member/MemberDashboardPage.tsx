"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../leader/dmSoft.css";
import "../leader/papercard/papercard.css";

import {
  IconAlert,
  IconCheck,
  IconCheckCircle,
  IconClipboardCheck,
  IconClock,
  IconUsers,
} from "@/components/ui/icons";
import { accountApi, papercardApi, publicApi, setToken } from "../api";
import type { DmMe, DmPapercardSubmission } from "../api";
import type { DmBoard } from "../dmData";
import type { DepartmentKey } from "../leader/types";
import { DEFAULT_MEMBER_USER, MEMBER_DEPARTMENT_TEMPLATES } from "./papercard/mockPresets";
import { formatDateId } from "../leader/papercard/utils";
import MemberPapercardPage from "./papercard/MemberPapercardPage";

export type MemberPapercardApproval = "NOT_SUBMITTED" | "PENDING_APPROVAL" | "APPROVED" | "REVISION";

interface MemberDashboardPageProps {
  initialTab?: "dashboard" | "papercard";
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function MemberDashboardPage({ initialTab = "dashboard" }: MemberDashboardPageProps) {
  if (initialTab === "papercard") {
    return <MemberPapercardPage />;
  }

  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<DmMe | null>(null);
  const [lineBoard, setLineBoard] = useState<DmBoard | null>(null);
  const [realSubmissions, setRealSubmissions] = useState<DmPapercardSubmission[]>([]);
  const [selectedDept, setSelectedDept] = useState<DepartmentKey>("PROD");
  const [dbTemplateCount, setDbTemplateCount] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // 1. Fetch user data if logged in
  const fetchAuthUser = useCallback(async () => {
    setAuthLoading(true);
    try {
      const me = await accountApi.me();
      if (me) {
        setCurrentUser(me);
        if (me.dept) {
          const rawDept = me.dept.toUpperCase();
          const mappedDept: DepartmentKey =
            rawDept === "QA" ? "QC" : ["PROD", "ME", "PE", "QC"].includes(rawDept) ? (rawDept as DepartmentKey) : "PROD";
          setSelectedDept(mappedDept);
        }
        if (me.line?.slug) {
          const board = await publicApi.board(me.line.slug);
          setLineBoard(board);
        }
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthUser();
  }, [fetchAuthUser]);

  // Quick Login helper
  const handleQuickLogin = async (nik: string) => {
    setLoginBusy(true);
    try {
      const res = await accountApi.login(nik, nik);
      setToken(res.accessToken);
      await fetchAuthUser();
      setNotice(`Berhasil masuk sebagai ${nik}!`);
      setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      setNotice(`Gagal login: ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setLoginBusy(false);
    }
  };

  // 2. Active Profile with clean fallback
  const activeProfile = useMemo(() => {
    if (!currentUser) return DEFAULT_MEMBER_USER;
    return {
      name: currentUser.name || currentUser.username,
      employeeId: currentUser.username,
      dept: selectedDept,
      deptLabel:
        selectedDept === "ME"
          ? "Maintenance"
          : selectedDept === "PROD"
          ? "Produksi"
          : selectedDept === "PE"
          ? "Process Eng"
          : "Quality Control",
      position: currentUser.position || `${selectedDept} Operator`,
      lineName: currentUser.line?.name || "Line 1",
      lineCode: currentUser.line?.code || "501",
      lineId: currentUser.line?.id || 1,
      workshopName: currentUser.line?.workshopName || "Assembly Workshop",
      supervisorName: currentUser.supervisor || "Hendra Pratama",
      supervisor: {
        name: currentUser.supervisor || "Hendra Pratama",
        employeeId: "SPV-019",
        role: "Supervisor Lini",
      },
    };
  }, [currentUser, selectedDept]);

  // 3. Load daily submissions for this line
  const loadSubmissions = useCallback(() => {
    const lineId = activeProfile.lineId || 1;
    papercardApi
      .listSubmissions({
        lineId,
        date: todayStr,
      })
      .then((subs) => {
        setRealSubmissions(subs || []);
      })
      .catch(() => {});
  }, [activeProfile.lineId, todayStr]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // 3b. Load template for active department & line from PostgreSQL database
  useEffect(() => {
    let cancelled = false;
    const lineId = activeProfile.lineId || 1;
    papercardApi
      .listTemplates({ lineId, department: selectedDept })
      .then((res) => {
        if (cancelled) return;
        if (res && res.length > 0 && res[0].templateData?.categories) {
          const count = res[0].templateData.categories.reduce(
            (acc: number, c: any) => acc + (c.items?.length || c.groups?.[0]?.items?.length || 0),
            0
          );
          setDbTemplateCount(count);
        } else {
          setDbTemplateCount(0);
        }
      })
      .catch(() => {
        if (!cancelled) setDbTemplateCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProfile.lineId, selectedDept]);

  // 4. Today's submission status for active department
  const todaySubmission = useMemo(() => {
    return realSubmissions.find((s) => s.department?.toUpperCase() === selectedDept);
  }, [realSubmissions, selectedDept]);

  const currentSubmission = useMemo(() => {
    if (!todaySubmission) {
      return {
        status: "NOT_SUBMITTED" as MemberPapercardApproval,
        submitTime: "-",
        approvalTime: undefined,
        supervisorNotes: undefined,
      };
    }
    const status: MemberPapercardApproval =
      todaySubmission.approvalStatus === "approved"
        ? "APPROVED"
        : todaySubmission.approvalStatus === "rejected"
        ? "REVISION"
        : "PENDING_APPROVAL";
    const submitTime = new Date(todaySubmission.submittedAt).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const approvalTime = todaySubmission.approvedAt
      ? new Date(todaySubmission.approvedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      : undefined;

    return {
      status,
      submitTime,
      approvalTime,
      supervisorNotes: todaySubmission.supervisorNotes ?? undefined,
    };
  }, [todaySubmission]);

  // 5. Team members mapped cleanly
  const { topTeamMembers, mpvTeamMember } = useMemo(() => {
    if (!lineBoard || !lineBoard.members || lineBoard.members.length === 0) {
      // Clean fallback team
      const fallbackList = [
        {
          id: "m-ldr",
          name: "Andi Wijaya",
          employeeNo: "LDR-001",
          dept: "PROD" as DepartmentKey,
          position: "Line Leader",
          role: "leader" as const,
          initials: "AW",
          photoUrl: null,
          papercardStatus: "OK" as const,
          approvalStatus: "APPROVED" as const,
          submittedAt: "07:42",
        },
        {
          id: "m-me",
          name: "Rian Hidayat",
          employeeNo: "009878",
          dept: "ME" as DepartmentKey,
          position: "ME Technician",
          role: "member" as const,
          initials: "RH",
          photoUrl: null,
          papercardStatus: "OK" as const,
          approvalStatus: "PENDING_APPROVAL" as const,
          submittedAt: "07:48",
        },
        {
          id: "m-pe",
          name: "Dedi Kurniawan",
          employeeNo: "3323",
          dept: "PE" as DepartmentKey,
          position: "PE Engineer",
          role: "member" as const,
          initials: "DK",
          photoUrl: null,
          papercardStatus: "OK" as const,
          approvalStatus: "PENDING_APPROVAL" as const,
          submittedAt: "07:50",
        },
        {
          id: "m-qc",
          name: "Siti Rahma",
          employeeNo: "S22311",
          dept: "QC" as DepartmentKey,
          position: "QC Inspector",
          role: "member" as const,
          initials: "SR",
          photoUrl: null,
          papercardStatus: "OK" as const,
          approvalStatus: "APPROVED" as const,
          submittedAt: "07:45",
        },
      ];

      return {
        topTeamMembers: fallbackList,
        mpvTeamMember: {
          id: "m-mpv",
          name: "Budi Santoso",
          employeeNo: "OP-501-01",
          dept: "PROD" as DepartmentKey,
          position: "Operator Teladan (Pos 3)",
          role: "member" as const,
          initials: "BS",
          photoUrl: null,
          papercardStatus: "OK" as const,
          approvalStatus: "APPROVED" as const,
          submittedAt: "07:38",
          period: "Oktober 2026",
        },
      };
    }

    const sorted = [...lineBoard.members].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));

    const mapped = sorted.map((m) => {
      const memberDept = (m.dept?.toUpperCase() as DepartmentKey) || "PROD";
      const sub = realSubmissions.find((s) => s.department?.toUpperCase() === memberDept);

      let approvalStatus: MemberPapercardApproval = "NOT_SUBMITTED";
      let submittedAt = "-";
      let papercardStatus: "OK" | "NG" | "EMPTY" = "EMPTY";

      if (sub) {
        submittedAt = new Date(sub.submittedAt).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        if (sub.approvalStatus === "approved") approvalStatus = "APPROVED";
        else if (sub.approvalStatus === "rejected") approvalStatus = "REVISION";
        else approvalStatus = "PENDING_APPROVAL";

        papercardStatus = sub.answers.some((a: any) => a.status === "NG") ? "NG" : "OK";
      }

      const isLeader =
        m.role === "leader" ||
        m.position?.toLowerCase().includes("leader") ||
        m.sortOrder === 1;

      return {
        id: String(m.id ?? m.employeeId),
        name: m.name ?? "Anggota Tim",
        employeeNo: m.employeeId ?? "-",
        dept: memberDept,
        position: m.position ?? "-",
        role: isLeader ? ("leader" as const) : ("member" as const),
        initials: getInitials(m.name),
        photoUrl: m.photoUrl,
        papercardStatus,
        approvalStatus,
        submittedAt,
        sortOrder: m.sortOrder ?? 0,
      };
    });

    const mpv = lineBoard.mpv;
    let mpvData = null;
    if (mpv) {
      const sub = realSubmissions.find(
        (s) => (s.employeeNo && s.employeeNo === mpv.employeeId) || s.department?.toUpperCase() === mpv.dept?.toUpperCase()
      );
      mpvData = {
        id: String(mpv.id ?? mpv.employeeId),
        name: mpv.name ?? "Operator Teladan",
        employeeNo: mpv.employeeId ?? "-",
        dept: (mpv.dept?.toUpperCase() as DepartmentKey) || "PROD",
        position: mpv.position ?? "Operator Lini",
        role: "member" as const,
        initials: getInitials(mpv.name),
        photoUrl: mpv.photoUrl,
        papercardStatus: sub ? (sub.answers.some((a: any) => a.status === "NG") ? ("NG" as const) : ("OK" as const)) : ("EMPTY" as const),
        approvalStatus: sub ? (sub.approvalStatus === "approved" ? ("APPROVED" as const) : ("PENDING_APPROVAL" as const)) : ("NOT_SUBMITTED" as const),
        submittedAt: sub ? new Date(sub.submittedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
        period: mpv.period || "Bulan Ini",
      };
    }

    return {
      topTeamMembers: mapped.slice(0, 4),
      mpvTeamMember: mpvData,
    };
  }, [lineBoard, realSubmissions]);



  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "1240px", margin: "0 auto" }}>
      {/* Demo / Unauthenticated Soft Hint (if not logged in) */}
      {!currentUser && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
            padding: "10px 16px",
            background: "#f0fdfa",
            border: "1px solid #ccfbf1",
            borderRadius: "10px",
            fontSize: "12.5px",
            color: "#0f766e",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 700 }}>ℹ️ Mode Pratinjau Member:</span>
            <span>Anda sedang melihat tampilan profil standar <strong>{activeProfile.name}</strong>.</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11.5px", color: "#475569" }}>Masuk cepat:</span>
            {["009877", "009878", "3323", "S22311"].map((nik) => (
              <button
                key={nik}
                type="button"
                disabled={loginBusy}
                onClick={() => handleQuickLogin(nik)}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "5px",
                  border: "1px solid #99f6e4",
                  background: "#ffffff",
                  color: "#0f766e",
                  cursor: "pointer",
                }}
              >
                NIK {nik}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Global alert notice (if any) */}
      {notice && (
        <div
          style={{
            padding: "10px 16px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "10px",
            color: "#047857",
            fontWeight: 600,
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <IconCheckCircle size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* 1. Compact Hero Header Bar (Soft & Space-Efficient) */}
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
          padding: "16px 20px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.02)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#0f766e",
                background: "#f0fdfa",
                padding: "2px 8px",
                borderRadius: "6px",
                border: "1px solid #ccfbf1",
              }}
            >
              {activeProfile.deptLabel} ({selectedDept})
            </span>
            <span style={{ fontSize: "12.5px", color: "#64748b" }}>
              📍 <strong>{activeProfile.lineName}</strong> ({activeProfile.lineCode}) · {activeProfile.workshopName}
            </span>
            <span
              style={{
                fontSize: "11.5px",
                background: "#eef2ff",
                color: "#4338ca",
                padding: "2px 8px",
                borderRadius: "6px",
                border: "1px solid #e0e7ff",
              }}
            >
              Supervisor: <strong>{activeProfile.supervisorName}</strong>
            </span>
          </div>

          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Selamat Bertugas, {activeProfile.name}
          </h1>
        </div>

        {/* Right Info: Presensi Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: "8px",
              fontSize: "12.5px",
              color: "#047857",
              fontWeight: 600,
            }}
          >
            <IconCheckCircle size={15} />
            <span>Presensi DM: Hadir (Shift 1)</span>
          </div>
        </div>
      </section>

      {/* 2. Tri-Card Metric / Quick Status Row (Compact, Space-Saving) */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
        {/* Card 1: Papercard Status */}
        <div
          style={{
            padding: "16px 18px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: "#f0fdfa",
                  color: "#0f766e",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <IconClipboardCheck size={16} />
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                Papercard {selectedDept}
              </span>
            </div>

            {currentSubmission.status === "APPROVED" ? (
              <span className="dms-status-badge dms-status-badge--approved" style={{ fontSize: "11px", padding: "2px 8px" }}>
                ✓ Disetujui
              </span>
            ) : currentSubmission.status === "PENDING_APPROVAL" ? (
              <span className="dms-status-badge dms-status-badge--waiting" style={{ fontSize: "11px", padding: "2px 8px" }}>
                Menunggu SPV
              </span>
            ) : currentSubmission.status === "REVISION" ? (
              <span className="dms-status-badge dms-status-badge--revision" style={{ fontSize: "11px", padding: "2px 8px" }}>
                Perlu Revisi
              </span>
            ) : (
              <span style={{ fontSize: "11px", background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
                Belum Diisi
              </span>
            )}
          </div>

          <div>
            <div style={{ fontSize: "12.5px", color: "#475569", marginBottom: "4px" }}>
              {currentSubmission.status === "APPROVED"
                ? `Disetujui oleh ${activeProfile.supervisorName} (${currentSubmission.approvalTime ?? "08:00"} WIB)`
                : currentSubmission.status === "PENDING_APPROVAL"
                ? `Terkirim pukul ${currentSubmission.submitTime} WIB · Menunggu review`
                : currentSubmission.status === "REVISION"
                ? `Catatan revisi: "${currentSubmission.supervisorNotes || "Periksa kembali butir checklist"}"`
                : dbTemplateCount === null
                ? "Memuat konfigurasi checklist dari database..."
                : dbTemplateCount > 0
                ? `Total ${dbTemplateCount} butir checklist kesiapan kerja sebelum DM Meeting`
                : `Belum ada template papercard di database untuk departemen ${selectedDept}`}
            </div>
            <div style={{ fontSize: "11.5px", color: "#94a3b8" }}>
              Standar {selectedDept} · Shift 1
            </div>
          </div>

          <Link
            href="/dm-dashboard/member/papercard"
            className="dms-btn dms-btn--primary"
            style={{ padding: "7px 14px", fontSize: "12.5px", textDecoration: "none", width: "fit-content" }}
          >
            <IconClipboardCheck size={14} />
            <span>{currentSubmission.status === "NOT_SUBMITTED" ? "Isi Papercard Sekarang" : "Buka Detail Papercard"}</span>
          </Link>
        </div>

        {/* Card 2: Inspection Window */}
        <div
          style={{
            padding: "16px 18px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <IconClock size={16} />
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                Jendela Waktu Inspeksi
              </span>
            </div>

            <span style={{ fontSize: "11px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
              07:30 – 08:15 WIB
            </span>
          </div>

          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>
              Batas Waktu Pengisian Shift 1
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Pengiriman setelah pukul 08:15 WIB otomatis tercatat sebagai <strong>LATE (Telat)</strong> pada rekap DM Meeting.
            </div>
          </div>

          <div style={{ fontSize: "11.5px", color: "#0f766e", fontWeight: 600 }}>
            Status: Kesiapan Pra-Operasional Normal
          </div>
        </div>

        {/* Card 3: DM Meeting Presensi & Jadwal */}
        <div
          style={{
            padding: "16px 18px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: "#eef2ff",
                  color: "#4338ca",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <IconUsers size={16} />
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                DM Meeting Harian
              </span>
            </div>

            <span style={{ fontSize: "11px", background: "#eef2ff", color: "#4338ca", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
              07:45 – 08:00 WIB
            </span>
          </div>

          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>
              Briefing Kesiapan &amp; Safety Lini
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Dipimpin oleh Leader <strong>Andi Wijaya</strong> bersama Supervisor <strong>{activeProfile.supervisorName}</strong> di papan DM lini.
            </div>
          </div>

          <div style={{ fontSize: "11.5px", color: "#475569" }}>
            Kehadiran: <strong>4 dari 4 Personil Siap</strong>
          </div>
        </div>
      </section>

      {/* 3. Rekan Tim Lini Kamu (Clean, Compact, Not Cluttered) */}
      <section
        style={{
          padding: "18px 20px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
              Rekan Tim Lini — {activeProfile.lineName}
            </h2>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Status checklist dan presensi 4 personil inti lini hari ini
            </span>
          </div>

          <span style={{ fontSize: "11.5px", color: "#64748b", background: "#f8fafc", padding: "3px 10px", borderRadius: "999px", border: "1px solid #e2e8f0" }}>
            Tim Inti 4 Personil
          </span>
        </div>

        {/* 4 Compact Team Member Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "10px" }}>
          {topTeamMembers.map((member) => {
            const isCurrentUser = member.employeeNo === currentUser?.username || member.name === activeProfile.name;
            const isLeader = member.role === "leader";

            return (
              <div
                key={member.id}
                style={{
                  padding: "12px 14px",
                  background: isCurrentUser ? "#f0fdfa" : "#f8fafc",
                  border: isCurrentUser ? "1.5px solid #0f766e" : "1px solid #e2e8f0",
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "8px",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span className={`dms-dept-badge dms-dept-badge--${member.dept}`} style={{ fontSize: "10px", padding: "1px 6px" }}>
                      {isLeader ? "👑 LEADER" : member.dept}
                    </span>

                    {isCurrentUser && (
                      <span style={{ fontSize: "10px", fontWeight: 700, background: "#0f766e", color: "#fff", padding: "1px 6px", borderRadius: "999px" }}>
                        Kamu
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        background: isCurrentUser ? "#ccfbf1" : "#e2e8f0",
                        color: isCurrentUser ? "#0f766e" : "#475569",
                        fontSize: "11px",
                        fontWeight: 700,
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      {member.initials}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", fontSize: "13px", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {member.name}
                      </strong>
                      <span style={{ display: "block", fontSize: "10.5px", color: "#64748b" }}>
                        {member.position}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    paddingTop: "6px",
                    borderTop: "1px dashed #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "11px",
                  }}
                >
                  <span style={{ color: "#64748b" }}>
                    {member.submittedAt !== "-" ? `Submit: ${member.submittedAt}` : "Belum diisi"}
                  </span>

                  {member.approvalStatus === "APPROVED" ? (
                    <span style={{ color: "#047857", fontWeight: 700, display: "flex", alignItems: "center", gap: "2px" }}>
                      <IconCheck size={11} /> Approved
                    </span>
                  ) : member.approvalStatus === "PENDING_APPROVAL" ? (
                    <span style={{ color: "#b45309", fontWeight: 700, display: "flex", alignItems: "center", gap: "2px" }}>
                      <IconClock size={11} /> Pending
                    </span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>Belum submit</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* MPV of the Month (Compact 1-row banner) */}
        {mpvTeamMember && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              background: "linear-gradient(135deg, #fefce8 0%, #fffbeb 100%)",
              border: "1px solid #fef08a",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px" }}>🏆</span>
              <div>
                <strong style={{ fontSize: "12.5px", color: "#854d0e" }}>
                  MPV of The Month ({mpvTeamMember.period}): {mpvTeamMember.name}
                </strong>
                <span style={{ fontSize: "11.5px", color: "#a16207", marginLeft: "6px" }}>
                  ({mpvTeamMember.dept}) · {mpvTeamMember.position}
                </span>
              </div>
            </div>

            <span style={{ fontSize: "11px", background: "#fef9c3", color: "#854d0e", border: "1px solid #fef08a", padding: "2px 8px", borderRadius: "6px", fontWeight: 700 }}>
              Teladan Bulan Ini
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
