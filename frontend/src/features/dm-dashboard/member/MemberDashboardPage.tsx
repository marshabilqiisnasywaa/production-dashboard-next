"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "../leader/dmSoft.css";
import "../leader/papercard/papercard.css";

import { IconCheckCircle } from "@/components/ui/icons";
import { accountApi, papercardApi, publicApi, setToken } from "../api";
import type { DmMe, DmPapercardSubmission } from "../api";
import type { DmBoard } from "../dmData";
import type { DepartmentKey } from "../leader/types";
import MemberPapercardPage from "./papercard/MemberPapercardPage";

// Modular Subcomponents
import { MemberHeroBanner } from "./components/MemberHeroBanner";
import {
  MemberPapercardStatusCard,
  type MemberPapercardApproval,
} from "./components/MemberPapercardStatusCard";
import { MemberInspectionWindowCard } from "./components/MemberInspectionWindowCard";
import { MemberMeetingCard } from "./components/MemberMeetingCard";
import {
  MemberTeamSection,
  type MappedTeamMember,
  type MappedMpvMember,
} from "./components/MemberTeamSection";

export type { MemberPapercardApproval };

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
  const [windowTime, setWindowTime] = useState<{ start: string; end: string }>({
    start: "08:00",
    end: "09:00",
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // 1. Fetch user data if logged in
  const fetchAuthUser = useCallback(async () => {
    setAuthLoading(true);
    try {
      const me = await accountApi.me();
      if (me) {
        if (me.mustChangePassword) {
          window.location.href = "/dm-dashboard/akun";
          return;
        }
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
    const deptLabel =
      selectedDept === "ME"
        ? "Maintenance"
        : selectedDept === "PROD"
        ? "Produksi"
        : selectedDept === "PE"
        ? "Process Eng"
        : "Quality Control";
    return {
      name: currentUser?.name || currentUser?.username || "Member",
      dept: selectedDept,
      deptLabel,
      lineName: currentUser?.line?.name || "Lini belum diatur",
      lineCode: currentUser?.line?.code || "-",
      lineId: currentUser?.line?.id ?? null,
      workshopName: currentUser?.line?.workshopName || "Workshop belum diatur",
      supervisorName: currentUser?.supervisor || "Belum diatur admin",
    };
  }, [currentUser, selectedDept]);

  // 3. Load daily submissions for this line
  const loadSubmissions = useCallback(() => {
    const lineId = activeProfile.lineId;
    if (!lineId) return;
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
    const lineId = activeProfile.lineId;
    if (!lineId) {
      setDbTemplateCount(0);
      return;
    }
    papercardApi
      .listTemplates({ lineId, department: selectedDept })
      .then((res) => {
        if (cancelled) return;
        if (res && res.length > 0) {
          const tpl = res[0];

          if (tpl.windowStart && tpl.windowEnd) {
            setWindowTime({
              start: tpl.windowStart,
              end: tpl.windowEnd,
            });
          }

          if (tpl.templateData?.categories) {
            const count = tpl.templateData.categories.reduce(
              (acc: number, c: any) => acc + (c.items?.length || c.groups?.[0]?.items?.length || 0),
              0
            );
            setDbTemplateCount(count);
          } else {
            setDbTemplateCount(0);
          }
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
  const { topTeamMembers, mpvTeamMember } = useMemo<{
    topTeamMembers: MappedTeamMember[];
    mpvTeamMember: MappedMpvMember | null;
  }>(() => {
    if (!lineBoard || !lineBoard.members || lineBoard.members.length === 0) {
      return { topTeamMembers: [], mpvTeamMember: null };
    }

    const sorted = [...lineBoard.members].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));

    const mapped: MappedTeamMember[] = sorted.map((m) => {
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
        role: isLeader ? "leader" : "member",
        initials: getInitials(m.name),
        photoUrl: m.photoUrl,
        papercardStatus,
        approvalStatus,
        submittedAt,
        sortOrder: m.sortOrder ?? 0,
      };
    });

    const mpv = lineBoard.mpv;
    let mpvData: MappedMpvMember | null = null;
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
        role: "member",
        initials: getInitials(mpv.name),
        photoUrl: mpv.photoUrl,
        papercardStatus: sub ? (sub.answers.some((a: any) => a.status === "NG") ? "NG" : "OK") : "EMPTY",
        approvalStatus: sub ? (sub.approvalStatus === "approved" ? "APPROVED" : "PENDING_APPROVAL") : "NOT_SUBMITTED",
        submittedAt: sub ? new Date(sub.submittedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
        period: mpv.period || "Bulan Ini",
      };
    }

    return {
      topTeamMembers: mapped.slice(0, 4),
      mpvTeamMember: mpvData,
    };
  }, [lineBoard, realSubmissions]);

  const leaderName = topTeamMembers.find((m) => m.role === "leader")?.name || "Belum ada leader";

  return (
    <div className="member-dash">
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
            <span style={{ fontWeight: 700 }}>ℹ️ Belum masuk:</span>
            <span>Masuk dengan akun member untuk melihat data lini kamu.</span>
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

      {/* 1. Compact Hero Header Bar */}
      <MemberHeroBanner
        name={activeProfile.name}
        deptLabel={activeProfile.deptLabel}
        dept={selectedDept}
        lineName={activeProfile.lineName}
        lineCode={activeProfile.lineCode}
        workshopName={activeProfile.workshopName}
        supervisorName={activeProfile.supervisorName}
      />

      {/* 2. Tri-Card Metric / Quick Status Row */}
      <section className="member-tri-grid">
        <MemberPapercardStatusCard
          selectedDept={selectedDept}
          status={currentSubmission.status}
          supervisorName={activeProfile.supervisorName}
          submitTime={currentSubmission.submitTime}
          approvalTime={currentSubmission.approvalTime}
          supervisorNotes={currentSubmission.supervisorNotes}
          dbTemplateCount={dbTemplateCount}
        />

        <MemberInspectionWindowCard
          status={currentSubmission.status}
          supervisorName={activeProfile.supervisorName}
          approvedByName={todaySubmission?.approvedByName}
          submitTime={currentSubmission.submitTime}
          approvalTime={currentSubmission.approvalTime}
          supervisorNotes={currentSubmission.supervisorNotes}
          windowTime={windowTime}
        />

        <MemberMeetingCard
          leaderName={leaderName}
          supervisorName={activeProfile.supervisorName}
        />
      </section>

      {/* 3. Rekan Tim Lini Kamu (Clean, Compact, Not Cluttered) */}
      <MemberTeamSection
        lineName={activeProfile.lineName}
        currentUsername={currentUser?.username}
        currentName={activeProfile.name}
        topTeamMembers={topTeamMembers}
        mpvTeamMember={mpvTeamMember}
      />
    </div>
  );
}
