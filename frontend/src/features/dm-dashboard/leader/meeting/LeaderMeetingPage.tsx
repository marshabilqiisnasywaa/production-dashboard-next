"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "../dmSoft.css";
import "../../leader/papercard/papercard.css";
import {
  IconAlert,
  IconCheck,
  IconCheckCircle,
  IconClipboardCheck,
  IconClock,
  IconClose,
  IconUsers,
} from "@/components/ui/icons";
import {
  accountApi,
  meetingApi,
  publicApi,
  type DmMe,
  type DmMeetingAttendance,
  type DmMeetingSession,
  type DmMeetingSummary,
} from "../../api";
import { LEADER_USER, LINE_TEAM_MEMBERS } from "../mockData";
import { LEADER_ROUTES } from "../routes";
import type { AttendanceStatus, TeamMember } from "../types";

type SessionTab = "during1" | "during2" | "during3";

interface SummaryFormItem {
  problem: string;
  picName: string;
  dueDate: string;
}

const SESSION_META: Record<
  "during1" | "during2" | "during3",
  { number: number; label: string; time: string; desc: string }
> = {
  during1: {
    number: 1,
    label: "During-Meeting 1",
    time: "10:00",
    desc: "Monitoring awal shift & verifikasi abnormalitas temuan papercard pagi.",
  },
  during2: {
    number: 2,
    label: "During-Meeting 2",
    time: "14:00",
    desc: "Evaluasi tengah shift, progress output, dan kendala operasional siang.",
  },
  during3: {
    number: 3,
    label: "During-Meeting 3",
    time: "16:00",
    desc: "Evaluasi akhir shift, rekonsiliasi output harian, & persiapan serah terima.",
  },
};

export default function LeaderMeetingPage() {
  const [currentUser, setCurrentUser] = useState<DmMe | null>(null);
  const [activeTab, setActiveTab] = useState<SessionTab>("during1");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(LINE_TEAM_MEMBERS);
  const [dbSessions, setDbSessions] = useState<DmMeetingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Timer state for active session
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal States
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isFaceIdModalOpen, setIsFaceIdModalOpen] = useState(false);

  // Face ID Dummy Scanner State
  const [faceIdTarget, setFaceIdTarget] = useState<TeamMember | null>(null);
  const [faceIdStatus, setFaceIdStatus] = useState<"scanning" | "matched" | "verified">("scanning");
  const [faceIdConfidence, setFaceIdConfidence] = useState(98.5);

  // Summary Form Items in Modal (Problem, PIC, Due Date)
  const [summaryItems, setSummaryItems] = useState<SummaryFormItem[]>([
    {
      problem: "Suhu solder station #4 berfluktuasi (±15°C di atas SOP batas)",
      picName: "Reza Pratama",
      dueDate: "12:00 WIB",
    },
  ]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // 1. Fetch user & load sessions
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const me = await accountApi.me();
      if (me) {
        setCurrentUser(me);
        const lineId = me.line?.id || 1;

        // Fetch team members from line board if available
        if (me.line?.slug) {
          try {
            const board = await publicApi.board(me.line.slug);
            if (board && board.members && board.members.length > 0) {
              const mapped: TeamMember[] = board.members.map((bm) => {
                const memberName = bm.name || "Anggota Tim";
                const initials = memberName
                  .split(" ")
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "MB";

                return {
                  id: String(bm.id),
                  name: memberName,
                  initials,
                  employeeId: bm.employeeId || `EMP-${bm.id}`,
                  role: (bm.role as any) || "member",
                  dept: (bm.dept as any) || "PROD",
                  deptLabel:
                    bm.dept === "ME"
                      ? "Maintenance"
                      : bm.dept === "PE"
                      ? "Process Eng"
                      : bm.dept === "QC"
                      ? "Quality Control"
                      : "Produksi",
                  position: bm.position || "Operator Lini",
                  papercardStatus: "OK",
                  approvalStatus: "APPROVED",
                  submittedAt: "07:40",
                  attendanceToday: "Hadir",
                };
              });
              setTeamMembers(mapped);
            }
          } catch {
            // Keep LINE_TEAM_MEMBERS fallback
          }
        }

        // Load sessions from API
        const sessions = await meetingApi.listSessions(lineId, todayStr);
        setDbSessions(sessions || []);
      }
    } catch (err) {
      console.warn("Meeting data load fallback:", err);
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active Session info
  const activeSessionMeta = SESSION_META[activeTab];
  const activeSessionDb = useMemo(() => {
    if (!activeSessionMeta) return null;
    return (
      dbSessions.find((s) => s.sessionNumber === activeSessionMeta.number) || {
        id: activeSessionMeta.number,
        lineId: currentUser?.line?.id || 1,
        date: todayStr,
        shift: "Shift 1",
        sessionType: `during_${activeSessionMeta.number}`,
        sessionNumber: activeSessionMeta.number,
        scheduledTime: activeSessionMeta.time,
        status: "pending" as const,
        durationSeconds: 0,
        attendances: [],
        summaries: [],
      }
    );
  }, [activeSessionMeta, dbSessions, currentUser?.line?.id, todayStr]);

  // Sync Timer with Active Session
  useEffect(() => {
    if (activeSessionDb?.status === "in_progress") {
      setIsTimerRunning(true);
      if (activeSessionDb.startedAt) {
        const startMs = new Date(activeSessionDb.startedAt).getTime();
        const diffSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setTimerSeconds(diffSec);
      }
    } else {
      setIsTimerRunning(false);
      setTimerSeconds(activeSessionDb?.durationSeconds || 0);
    }
  }, [activeSessionDb]);

  // Stopwatch ticking
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Format seconds to HH:MM:SS
  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const p = (n: number) => String(n).padStart(2, "0");
    if (hrs > 0) return `${p(hrs)}:${p(mins)}:${p(secs)}`;
    return `${p(mins)}:${p(secs)}`;
  };

  const completedDuringCount = useMemo(() => {
    return dbSessions.filter((s) => s.status === "completed").length;
  }, [dbSessions]);

  // Presensi helper
  const handleAttendanceChange = (memberId: string, status: AttendanceStatus) => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, attendanceToday: status } : m))
    );
  };

  // Face ID Dummy Trigger
  const triggerFaceId = (member: TeamMember) => {
    setFaceIdTarget(member);
    setFaceIdStatus("scanning");
    setFaceIdConfidence(Number((97.5 + Math.random() * 2.3).toFixed(1)));
    setIsFaceIdModalOpen(true);

    // Simulate scanning progression
    setTimeout(() => {
      setFaceIdStatus("matched");
    }, 1200);

    setTimeout(() => {
      setFaceIdStatus("verified");
      setTeamMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, attendanceToday: "Hadir" } : m
        )
      );
    }, 2100);
  };

  // Quick verify all members Face ID
  const verifyAllFaceId = () => {
    setTeamMembers((prev) =>
      prev.map((m) => ({ ...m, attendanceToday: "Hadir" }))
    );
    setNotice("Semua anggota tim lini berhasil diverifikasi Face ID!");
    setTimeout(() => setNotice(null), 3500);
  };

  // START MEETING
  const handleStartMeeting = async () => {
    if (!activeSessionMeta) return;
    const lineId = currentUser?.line?.id || 1;

    try {
      const payloadAttendances = teamMembers.map((m, idx) => ({
        employeeId: Number(m.id) || idx + 1,
        status: (m.attendanceToday === "Hadir"
          ? "present"
          : m.attendanceToday === "Izin"
          ? "permit"
          : m.attendanceToday === "Sakit"
          ? "sick"
          : "absent") as any,
        verificationMethod: "face_id_dummy",
        faceConfidence: 0.985,
        notes: undefined,
      }));

      const updatedSession = await meetingApi.startSession({
        lineId,
        date: todayStr,
        shift: "Shift 1",
        sessionNumber: activeSessionMeta.number,
        attendances: payloadAttendances,
      });

      setDbSessions((prev) => {
        const others = prev.filter((s) => s.sessionNumber !== activeSessionMeta.number);
        return [...others, updatedSession].sort((a, b) => a.sessionNumber - b.sessionNumber);
      });

      setIsTimerRunning(true);
      setTimerSeconds(0);
      setNotice(`Sesi DM Meeting ${activeSessionMeta.label} dimulai! Timer berjalan.`);
      setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      console.warn("Start meeting error (mock mode):", err);
      setIsTimerRunning(true);
      setTimerSeconds(0);
      setDbSessions((prev) =>
        prev.map((s) =>
          s.sessionNumber === activeSessionMeta.number ? { ...s, status: "in_progress" } : s
        )
      );
    }
  };

  // END MEETING -> Open Summary Modal
  const handleEndMeetingClick = () => {
    setIsSummaryModalOpen(true);
  };

  // SUBMIT SUMMARY MODAL
  const handleSaveSummary = async () => {
    if (!activeSessionMeta || !activeSessionDb) return;
    setIsTimerRunning(false);

    try {
      const updatedSession = await meetingApi.endSession(activeSessionDb.id, {
        summaries: summaryItems.map((si) => ({
          problem: si.problem,
          picName: si.picName,
          dueDate: si.dueDate,
        })),
      });

      setDbSessions((prev) => {
        const others = prev.filter((s) => s.id !== activeSessionDb.id);
        return [...others, updatedSession].sort((a, b) => a.sessionNumber - b.sessionNumber);
      });

      setIsSummaryModalOpen(false);
      setNotice(`Sesi ${activeSessionMeta.label} selesai! Notulensi & action item tersimpan di database.`);
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.warn("End meeting error (mock mode):", err);
      setIsSummaryModalOpen(false);
      setDbSessions((prev) =>
        prev.map((s) =>
          s.sessionNumber === activeSessionMeta.number
            ? {
                ...s,
                status: "completed",
                durationSeconds: timerSeconds,
                summaries: summaryItems.map((si, idx) => ({
                  id: idx + 1,
                  sessionId: s.id,
                  lineId: s.lineId,
                  problem: si.problem,
                  picName: si.picName,
                  picId: null,
                  dueDate: si.dueDate,
                  status: "open",
                  createdAt: new Date().toISOString(),
                })),
              }
            : s
        )
      );
      setNotice(`Sesi ${activeSessionMeta.label} selesai! Notulensi tersimpan.`);
      setTimeout(() => setNotice(null), 4000);
    }
  };



  const hadirCount = teamMembers.filter((m) => m.attendanceToday === "Hadir").length;

  return (
    <div className="dms-container" style={{ maxWidth: "1280px", margin: "0 auto", padding: "20px 24px" }}>
      {/* 1. Breadcrumb & Supervisor Header Pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
          <Link
            href={LEADER_ROUTES.dashboard}
            style={{ color: "#0f766e", textDecoration: "none", fontWeight: 700 }}
          >
            ← Kembali ke Dashboard Leader
          </Link>
          <span style={{ color: "#94a3b8" }}>/</span>
          <span style={{ color: "#475569", fontWeight: 600 }}>DM Meeting Lini (During-Management)</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="dms-pill dms-pill--supervisor" style={{ fontSize: "12px" }}>
            Dilaporkan ke Supervisor: <strong>{LEADER_USER.supervisor.name}</strong>
          </span>
          <span
            style={{
              fontSize: "12px",
              background: "#f0fdfa",
              color: "#0f766e",
              border: "1px solid #ccfbf1",
              padding: "4px 12px",
              borderRadius: "999px",
              fontWeight: 700,
            }}
          >
            📍 {currentUser?.line?.name || "Line 1"} ({currentUser?.line?.code || "501"}) · Shift 1
          </span>
        </div>
      </div>

      {/* 2. Page Head Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          padding: "18px 24px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
          marginBottom: "20px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                background: "#0f766e",
                color: "#ffffff",
                padding: "2px 8px",
                borderRadius: "6px",
              }}
            >
              AKUN LEADER
            </span>
            <span style={{ fontSize: "12.5px", color: "#64748b" }}>
              Pemimpin Sesi: <strong>{currentUser?.name || LEADER_USER.name}</strong>
            </span>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
            Daily Management (DM) Meeting &amp; Evaluasi Lini
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: "#64748b" }}>
            Pelaksanaan 3 sesi pertemuan harian (10:00, 14:00, 16:00), presensi tim Face ID, stopwatch durasi meeting, serta modal action item &amp; notulensi kendala lini.
          </p>
        </div>

        {/* Papercard Pre-Met Shortcut */}
        <Link
          href="/dm-dashboard/leader/papercard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            fontSize: "12.5px",
            color: "#0f766e",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <IconClipboardCheck size={16} />
          <span>Buka Papercard 5M (Pre-Met)</span>
        </Link>
      </div>

      {/* Global Alert Notice */}
      {notice && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 18px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "12px",
            color: "#047857",
            fontSize: "13.5px",
            fontWeight: 600,
            marginBottom: "18px",
          }}
        >
          <IconCheckCircle size={18} />
          <span>{notice}</span>
        </div>
      )}

      {/* 3. Session Navigation Tabs (10:00, 14:00, 16:00, Post-Met) */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "6px",
          background: "#f1f5f9",
          borderRadius: "14px",
          marginBottom: "20px",
          width: "fit-content",
        }}
      >
        {(["during1", "during2", "during3"] as const).map((key) => {
          const meta = SESSION_META[key];
          const isSelected = activeTab === key;
          const sDb = dbSessions.find((s) => s.sessionNumber === meta.number);
          const isDone = sDb?.status === "completed";
          const isRunning = sDb?.status === "in_progress";

          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "10px",
                border: 0,
                background: isSelected ? "#ffffff" : "transparent",
                color: isSelected ? "#0f172a" : "#64748b",
                fontWeight: isSelected ? 700 : 500,
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: isSelected ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <IconClock size={15} />
              <span>
                {meta.label} ({meta.time})
              </span>
              {isDone ? (
                <span
                  style={{
                    fontSize: "10.5px",
                    background: "#ecfdf5",
                    color: "#047857",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    fontWeight: 700,
                  }}
                >
                  ✓ Selesai
                </span>
              ) : isRunning ? (
                <span
                  style={{
                    fontSize: "10.5px",
                    background: "#fee2e2",
                    color: "#dc2626",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    fontWeight: 700,
                  }}
                >
                  ● Live
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "10.5px",
                    background: "#f1f5f9",
                    color: "#94a3b8",
                    padding: "1px 6px",
                    borderRadius: "4px",
                  }}
                >
                  Standby
                </span>
              )}
            </button>
          );
        })}

      </div>

      {/* 4. Active During Session Control Bar */}
      {activeSessionMeta && activeSessionDb && (
        <section
          style={{
            padding: "20px 24px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.02)",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  background: "#eef2ff",
                  color: "#4338ca",
                  padding: "2px 8px",
                  borderRadius: "6px",
                }}
              >
                SESI {activeSessionMeta.number} HARI INI
              </span>
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                Jadwal: <strong>{activeSessionMeta.time} WIB</strong> · {activeSessionMeta.desc}
              </span>
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              {activeSessionMeta.label}
            </h2>
          </div>

          {/* Stopwatch & Action Trigger Row */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            {/* Stopwatch Box */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "8px 20px",
                background: isTimerRunning ? "#fff1f2" : "#f8fafc",
                border: isTimerRunning ? "1.5px solid #fecdd3" : "1px solid #e2e8f0",
                borderRadius: "12px",
                minWidth: "140px",
              }}
            >
              <div
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: isTimerRunning ? "#e11d48" : "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {isTimerRunning && (
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#e11d48",
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                )}
                {isTimerRunning ? "Meeting Berjalan" : "Durasi Meeting"}
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  color: isTimerRunning ? "#be123c" : "#0f172a",
                  lineHeight: 1.2,
                  marginTop: "2px",
                }}
              >
                {formatTimer(timerSeconds)}
              </div>
            </div>

            {/* Action Buttons: Start Meeting vs End Meeting */}
            {activeSessionDb.status === "in_progress" ? (
              <button
                type="button"
                onClick={handleEndMeetingClick}
                className="dms-btn"
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  padding: "10px 22px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  border: 0,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 2px 6px rgba(220, 38, 38, 0.25)",
                }}
              >
                <span>⏹</span>
                <span>End Meeting &amp; Input Summary</span>
              </button>
            ) : activeSessionDb.status === "completed" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "10px",
                    color: "#047857",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  ✓ Sesi Telah Selesai
                </span>
                <button
                  type="button"
                  onClick={() => setIsSummaryModalOpen(true)}
                  style={{
                    padding: "8px 14px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    fontSize: "12.5px",
                    color: "#0f766e",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Lihat / Edit Summary
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartMeeting}
                className="dms-btn dms-btn--primary"
                style={{
                  padding: "10px 22px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 2px 6px rgba(15, 118, 110, 0.25)",
                }}
              >
                <span>▶</span>
                <span>Start Meeting Sesi Ini</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* 5. Main Content Grid: Attendance (Left) + Action Items/Abnormals (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
        {/* Attendance Card */}
        <div className="dms-card" style={{ padding: "20px" }}>
          <div className="dms-card-head" style={{ marginBottom: "16px" }}>
            <div className="dms-card-head-left">
              <div className="dms-card-icon dms-card-icon--indigo">
                <IconUsers size={20} />
              </div>
              <div>
                <h2 className="dms-card-title">Presensi Anggota Tim Lini (Face ID)</h2>
                <p className="dms-card-subtitle">
                  Tingkat Kehadiran: <strong>{hadirCount} dari {teamMembers.length} Anggota ({Math.round((hadirCount / teamMembers.length) * 100)}%)</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={verifyAllFaceId}
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#0f766e",
                background: "#f0fdfa",
                border: "1px solid #99f6e4",
                padding: "6px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
              title="Verifikasi cepat semua anggota menggunakan Face ID"
            >
              <span>⚡</span>
              <span>Scan Face ID Semua</span>
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {teamMembers.map((member) => (
              <div
                key={member.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                  padding: "12px 16px",
                  background: "#fcfcfd",
                  border: "1px solid #f1f5f9",
                  borderRadius: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    className="dms-avatar"
                    style={{
                      background: member.role === "leader" ? "#fef3c7" : "#ccfbf1",
                      color: member.role === "leader" ? "#92400e" : "#0f766e",
                      fontWeight: 700,
                    }}
                  >
                    {member.initials}
                  </span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>{member.name}</strong>
                      {member.role === "leader" && (
                        <span
                          style={{
                            fontSize: "10.5px",
                            background: "#fef3c7",
                            color: "#92400e",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontWeight: 700,
                          }}
                        >
                          LEADER
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      NIK: {member.employeeId} · {member.deptLabel} · {member.position}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {/* Face ID Status Button / Trigger */}
                  <button
                    type="button"
                    onClick={() => triggerFaceId(member)}
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: member.attendanceToday === "Hadir" ? "1px solid #a7f3d0" : "1px solid #cbd5e1",
                      background: member.attendanceToday === "Hadir" ? "#ecfdf5" : "#ffffff",
                      color: member.attendanceToday === "Hadir" ? "#047857" : "#64748b",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>📷</span>
                    <span>{member.attendanceToday === "Hadir" ? "Face ID ✓" : "Scan Wajah"}</span>
                  </button>

                  {/* Manual Status Buttons */}
                  <div style={{ display: "flex", gap: "3px" }}>
                    {(["Hadir", "Izin", "Sakit", "Alpa"] as AttendanceStatus[]).map((st) => {
                      const isSel = member.attendanceToday === st;
                      let bg = "#f8fafc";
                      let fg = "#64748b";
                      let border = "#e2e8f0";

                      if (isSel) {
                        if (st === "Hadir") {
                          bg = "#ecfdf5";
                          fg = "#047857";
                          border = "#a7f3d0";
                        } else if (st === "Izin") {
                          bg = "#eff6ff";
                          fg = "#1d4ed8";
                          border = "#bfdbfe";
                        } else if (st === "Sakit") {
                          bg = "#fffbeb";
                          fg = "#b45309";
                          border = "#fde68a";
                        } else {
                          bg = "#fff1f2";
                          fg = "#be123c";
                          border = "#fecdd3";
                        }
                      }

                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleAttendanceChange(member.id, st)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: `1px solid ${border}`,
                            background: bg,
                            color: fg,
                            fontSize: "11.5px",
                            fontWeight: isSel ? 700 : 500,
                            cursor: "pointer",
                          }}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Topics & Action Item Summary for this Session */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Papercard Abnormalities from Pre-Met */}
          <div className="dms-card" style={{ padding: "18px" }}>
            <div className="dms-card-head" style={{ marginBottom: "12px" }}>
              <div className="dms-card-head-left">
                <div className="dms-card-icon" style={{ background: "#fff1f2", color: "#be123c" }}>
                  <IconAlert size={18} />
                </div>
                <div>
                  <h3 className="dms-card-title" style={{ fontSize: "15px" }}>
                    Temuan Abnormal Papercard Pagi
                  </h3>
                  <p className="dms-card-subtitle" style={{ fontSize: "12px" }}>
                    Wajib dibahas bersama anggota lini di sesi ini
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "12px 14px",
                background: "#fff1f2",
                border: "1px solid #ffe4e6",
                borderRadius: "10px",
                fontSize: "12.5px",
                color: "#9f1239",
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <strong>ME Technician (Reza Pratama):</strong>
                <span style={{ fontSize: "10.5px", fontWeight: 700, background: "#fecdd3", padding: "1px 6px", borderRadius: "4px" }}>
                  STATUS NG
                </span>
              </div>
              <p style={{ margin: "2px 0 0" }}>
                &ldquo;Suhu solder station #4 berfluktuasi (±15°C di atas SOP batas toleransi). Memerlukan kalibrasi thermocouple.&rdquo;
              </p>
            </div>
          </div>

          {/* Action Items List recorded in this session */}
          <div className="dms-card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div>
                <h3 className="dms-card-title" style={{ fontSize: "15px" }}>
                  Summary Masalah &amp; Action Item Sesi Ini
                </h3>
                <p className="dms-card-subtitle" style={{ fontSize: "12px" }}>
                  Diisi oleh Leader saat End Meeting
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSummaryModalOpen(true)}
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#0f766e",
                  background: "#f0fdfa",
                  border: "1px solid #ccfbf1",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                + Edit Summary
              </button>
            </div>

            {summaryItems.length === 0 ? (
              <div style={{ fontSize: "12.5px", color: "#94a3b8", fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>
                Belum ada notulensi. Klik &ldquo;End Meeting&rdquo; untuk menginput masalah, PIC, dan target waktu.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {summaryItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px 12px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12.5px",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                      ⚠️ {item.problem}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11.5px", color: "#64748b" }}>
                      <span>
                        PIC: <strong style={{ color: "#0f766e" }}>{item.picName}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Due Date: <strong style={{ color: "#b45309" }}>{item.dueDate}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MODAL: INPUT SUMMARY (POPS UP ON END MEETING)                          */}
      {/* ========================================================================= */}
      {isSummaryModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "640px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
            }}
          >
            {/* Modal Head */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Input Summary &amp; Action Item {activeSessionMeta?.label}
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Durasi Meeting: <strong>{formatTimer(timerSeconds)}</strong> · Hanya diisi oleh Leader
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSummaryModalOpen(false)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <IconClose size={20} />
              </button>
            </div>

            {/* Modal Body: Problems, PIC, Due Date */}
            <div style={{ padding: "20px", maxHeight: "65vh", overflowY: "auto" }}>
              <div style={{ marginBottom: "14px", fontSize: "13px", color: "#475569" }}>
                Catat poin kendala, penanggung jawab (PIC), dan batas waktu tindak lanjut dari sesi meeting ini:
              </div>

              {summaryItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "14px",
                    background: "#fcfcfd",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f766e" }}>
                      Poin Masalah #{idx + 1}
                    </span>
                    {summaryItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSummaryItems((prev) => prev.filter((_, i) => i !== idx))}
                        style={{
                          fontSize: "11px",
                          color: "#ef4444",
                          background: "transparent",
                          border: 0,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "3px" }}>
                      Masalah / Kendala:
                    </label>
                    <input
                      type="text"
                      value={item.problem}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSummaryItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, problem: val } : it))
                        );
                      }}
                      placeholder="Contoh: Suhu solder station #4 berfluktuasi..."
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "13px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "3px" }}>
                        PIC (Penanggung Jawab):
                      </label>
                      <select
                        value={item.picName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSummaryItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, picName: val } : it))
                          );
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          fontSize: "13px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          boxSizing: "border-box",
                          background: "#ffffff",
                        }}
                      >
                        {teamMembers.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name} ({m.deptLabel})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "3px" }}>
                        Due Date / Target Waktu:
                      </label>
                      <input
                        type="text"
                        value={item.dueDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSummaryItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, dueDate: val } : it))
                          );
                        }}
                        placeholder="Contoh: 12:00 WIB"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          fontSize: "13px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setSummaryItems((prev) => [
                    ...prev,
                    { problem: "", picName: teamMembers[0]?.name || "Operator Lini", dueDate: "Hari ini" },
                  ])
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px dashed #0f766e",
                  background: "#f0fdfa",
                  color: "#0f766e",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Tambah Poin Masalah Lain
              </button>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
                padding: "14px 20px",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <button
                type="button"
                onClick={() => setIsSummaryModalOpen(false)}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  color: "#475569",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSummary}
                className="dms-btn dms-btn--primary"
                style={{
                  padding: "8px 20px",
                  fontSize: "13px",
                  borderRadius: "8px",
                  fontWeight: 700,
                }}
              >
                Simpan Notulensi &amp; Selesaikan Sesi
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* 8. MODAL: DUMMY FACE ID SCANNER (SIMULATION VIEW)                         */}
      {/* ========================================================================= */}
      {isFaceIdModalOpen && faceIdTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            zIndex: 99999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#0f172a",
              color: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              textAlign: "center",
            }}
          >
            {/* Viewfinder Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#14b8a6", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                AI Biometric Scanner
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "2px 0 0" }}>
                Verifikasi Face ID Anggota
              </h3>
            </div>

            {/* Viewfinder Camera Box */}
            <div style={{ padding: "24px 20px", position: "relative" }}>
              <div
                style={{
                  width: "220px",
                  height: "220px",
                  margin: "0 auto",
                  borderRadius: "24px",
                  border: faceIdStatus === "verified" ? "2px solid #10b981" : "2px dashed #06b6d4",
                  position: "relative",
                  background: "radial-gradient(circle, rgba(15,118,110,0.15) 0%, rgba(15,23,42,0.6) 100%)",
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                }}
              >
                {/* Silhouette avatar inside viewfinder */}
                <div style={{ fontSize: "64px", opacity: 0.85 }}>👤</div>

                {/* Animated scan bar */}
                {faceIdStatus !== "verified" && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      height: "3px",
                      background: "linear-gradient(90deg, transparent, #06b6d4, #14b8a6, transparent)",
                      boxShadow: "0 0 12px #06b6d4",
                      animation: "scanLine 2s infinite ease-in-out",
                    }}
                  />
                )}

                {/* Verified Check Icon */}
                {faceIdStatus === "verified" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(16, 185, 129, 0.2)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        background: "#10b981",
                        display: "grid",
                        placeItems: "center",
                        color: "#ffffff",
                      }}
                    >
                      <IconCheck size={32} />
                    </div>
                  </div>
                )}
              </div>

              {/* Status Text & Target Name */}
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}>
                  {faceIdTarget.name}
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                  NIK: {faceIdTarget.employeeId} · {faceIdTarget.deptLabel}
                </div>

                <div style={{ marginTop: "10px" }}>
                  {faceIdStatus === "scanning" ? (
                    <span style={{ fontSize: "12px", color: "#38bdf8", fontWeight: 600 }}>
                      Memindai kontur wajah anggota...
                    </span>
                  ) : faceIdStatus === "matched" ? (
                    <span style={{ fontSize: "12px", color: "#fde047", fontWeight: 700 }}>
                      Wajah Cocok! Memvalidasi database...
                    </span>
                  ) : (
                    <span style={{ fontSize: "12.5px", color: "#34d399", fontWeight: 700 }}>
                      ✓ Face ID Terverifikasi ({faceIdConfidence}%)! Presensi Hadir.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Viewfinder Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <button
                type="button"
                onClick={() => setIsFaceIdModalOpen(false)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "10px",
                  border: 0,
                  background: faceIdStatus === "verified" ? "#0f766e" : "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {faceIdStatus === "verified" ? "Selesai & Tutup" : "Batal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for animations */}
      <style jsx global>{`
        @keyframes scanLine {
          0% {
            top: 5%;
          }
          50% {
            top: 90%;
          }
          100% {
            top: 5%;
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
