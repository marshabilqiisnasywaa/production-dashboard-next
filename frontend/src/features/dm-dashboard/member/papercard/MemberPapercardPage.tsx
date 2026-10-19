"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../../leader/papercard/papercard.css";
import "../../leader/dmSoft.css";

import { CategoryNav } from "../../leader/papercard/components/CategoryNav";
import { CategoryPanel } from "../../leader/papercard/components/CategoryPanel";
import { OverallProgress } from "../../leader/papercard/components/OverallProgress";
import { PapercardMetaCard } from "../../leader/papercard/components/PapercardMetaCard";
import { SubmitBar } from "../../leader/papercard/components/SubmitBar";
import { WindowBanner } from "../../leader/papercard/components/WindowBanner";
import { useInspectionWindow } from "../../leader/papercard/hooks/useInspectionWindow";
import { usePapercardForm } from "../../leader/papercard/hooks/usePapercardForm";
import { PAPERCARD_CONFIG, PAPERCARD_LINES } from "../../leader/papercard/mockTemplate";
import type { ChecklistCategory, ChecklistTemplate, Submission } from "../../leader/papercard/types";
import { formatDateId } from "../../leader/papercard/utils";
import type { DepartmentKey } from "../../leader/types";
import { accountApi, papercardApi } from "../../api";
import type { DmMe, DmPapercardSubmission } from "../../api";

const EMPTY_MEMBER_TEMPLATE: ChecklistTemplate = {
  id: "0",
  version: 1,
  window: { start: "07:30", end: "08:15" },
  rule: { ok: "OK jika seluruh item normal.", ng: "NG jika ada deviasi abnormal." },
  categories: [],
};

interface MemberPapercardPageProps {
  initialDept?: DepartmentKey;
  onBackToDashboard?: () => void;
}

export default function MemberPapercardPage({
  initialDept = "PROD",
  onBackToDashboard,
}: MemberPapercardPageProps) {
  const [selectedDept, setSelectedDept] = useState<DepartmentKey>(initialDept);
  const [line, setLine] = useState(PAPERCARD_LINES[0]);
  const [currentUser, setCurrentUser] = useState<DmMe | null>(null);

  // Template strictly from PostgreSQL Database
  const [dynamicTemplate, setDynamicTemplate] = useState<ChecklistTemplate>(EMPTY_MEMBER_TEMPLATE);
  const [templateLoading, setTemplateLoading] = useState(true);

  const [activeId, setActiveId] = useState<string>("");

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [realSubmission, setRealSubmission] = useState<DmPapercardSubmission | null>(null);

  const effectiveLineId = currentUser?.line?.id || (line === "502" ? 2 : line === "503" ? 3 : 1);

  // 1. Fetch authenticated user profile if token exists
  useEffect(() => {
    let cancelled = false;
    accountApi
      .me()
      .then((me) => {
        if (cancelled || !me) return;
        setCurrentUser(me);
        if (me.dept) {
          const rawDept = me.dept.toUpperCase();
          const mappedDept: DepartmentKey =
            rawDept === "QA" ? "QC" : ["PROD", "ME", "PE", "QC"].includes(rawDept) ? (rawDept as DepartmentKey) : "PROD";
          setSelectedDept(mappedDept);
        }
        if (me.line?.name) {
          setLine(me.line.name);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const activeProfile = useMemo(() => {
    if (!currentUser) {
      return {
        name: "Member",
        deptLabel: "Departemen belum diatur",
        lineName: "Lini belum diatur",
        supervisor: { name: "Belum diatur admin" },
      };
    }
    const dept = (currentUser.dept as DepartmentKey) || selectedDept;
    const deptLabel =
      dept === "ME"
        ? "Maintenance"
        : dept === "PROD"
        ? "Produksi"
        : dept === "PE"
        ? "Process Eng"
        : "Quality Control";

    return {
      name: currentUser.name || currentUser.username,
      employeeId: currentUser.username,
      role: "Operator Lini",
      position: currentUser.position || `${deptLabel} Operator`,
      dept,
      deptLabel,
      line: currentUser.line?.code || line,
      lineName: currentUser.line?.name || "Lini belum diatur",
      workshop: currentUser.line?.workshopName || "Workshop belum diatur",
      supervisor: {
        name: currentUser.supervisor || "Belum diatur admin",
        employeeId: "SPV-019",
        role: "Supervisor Lini",
      },
    };
  }, [currentUser, line, effectiveLineId, selectedDept]);

  // 2. Fetch template strictly from PostgreSQL database
  useEffect(() => {
    let cancelled = false;
    setTemplateLoading(true);

    papercardApi
      .listTemplates({
        lineId: effectiveLineId,
        department: selectedDept,
      })
      .then((res) => {
        if (cancelled) return;
        if (!res || res.length === 0) {
          setDynamicTemplate(EMPTY_MEMBER_TEMPLATE);
          setActiveId("");
          return;
        }

        const matched = res[0];
        if (matched && matched.templateData && matched.templateData.categories && matched.templateData.categories.length > 0) {
          const loadedCategories: ChecklistCategory[] = matched.templateData.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            groups: c.groups ?? [
              {
                id: `${c.id}-g1`,
                title: undefined,
                items: (c.items ?? []).map((it: any) => ({
                  id: it.id,
                  number: it.number,
                  title: it.title,
                  answerType: it.answerType ?? "ok_ng",
                  ruleInfo: it.ruleInfo,
                  rule: it.rule ?? matched.templateData.okRule ?? "Standar normal proses",
                })),
              },
            ],
          }));

          setDynamicTemplate({
            id: String(matched.id),
            version: Number(matched.version.replace(/[^0-9.]/g, "")) || 1,
            window: {
              start: matched.windowStart || "07:30",
              end: matched.windowEnd || "08:15",
            },
            rule: {
              ok: matched.templateData.okRule || "OK jika seluruh item normal.",
              ng: matched.templateData.ngRule || "NG jika ada deviasi abnormal.",
            },
            categories: loadedCategories,
          });

          if (loadedCategories[0]) {
            setActiveId(loadedCategories[0].id);
          }
        } else {
          setDynamicTemplate(EMPTY_MEMBER_TEMPLATE);
          setActiveId("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDynamicTemplate(EMPTY_MEMBER_TEMPLATE);
          setActiveId("");
        }
      })
      .finally(() => {
        if (!cancelled) setTemplateLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveLineId, selectedDept]);

  // 3. Load today's submissions for this department
  const loadDailySubmissions = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    papercardApi
      .listSubmissions({
        lineId: effectiveLineId,
        department: selectedDept,
        date: today,
      })
      .then((subs) => {
        if (subs && subs.length > 0) {
          const todaySub = subs[0];
          setRealSubmission(todaySub);
          setSubmission({
            submittedAt: new Date(todaySub.submittedAt),
            status: todaySub.status === "LATE" ? "LATE" : "ON_TIME",
          });
        } else {
          setRealSubmission(null);
          setSubmission(null);
        }
      })
      .catch(() => {});
  }, [effectiveLineId, selectedDept]);

  useEffect(() => {
    loadDailySubmissions();
  }, [loadDailySubmissions]);

  // Inspection Window
  const win = useInspectionWindow({
    start: dynamicTemplate.window?.start || "07:30",
    end: dynamicTemplate.window?.end || "08:15",
    simulate: PAPERCARD_CONFIG.simulateWindow,
  });

  // Papercard Form Hook
  const form = usePapercardForm(dynamicTemplate.categories || []);

  // Pre-fill answers from database submission if present
  useEffect(() => {
    if (realSubmission && realSubmission.answers && realSubmission.answers.length > 0) {
      realSubmission.answers.forEach((ans: any) => {
        form.update(ans.itemId, {
          status: ans.status,
          textValue: ans.textValue,
          cause: ans.cause ?? "",
          solution: ans.solution ?? "",
        });
      });
    }
  }, [realSubmission]);

  const approvalStatus = (realSubmission?.approvalStatus || "").toLowerCase();
  const isApproved = approvalStatus === "approved";
  const isRejected = approvalStatus === "rejected";
  const isPending = Boolean(realSubmission) && !isApproved && !isRejected;
  const isRevisionMode = isRejected;
  const readOnly = isApproved || isPending;

  const active =
    dynamicTemplate.categories.find((c) => c.id === activeId) ?? dynamicTemplate.categories[0];
  const activeProgress = active
    ? (form.progress.byCategory[active.id] ?? { done: 0, total: 0 })
    : { done: 0, total: 0 };

  const handleSubmit = async () => {
    if (!form.progress.complete || !win.now || readOnly) return;
    const now = win.now;
    const status = win.state === "closed" ? "LATE" : "ON_TIME";

    setSubmission({ submittedAt: now, status });
    setIsEditing(false);

    try {
      await papercardApi.submit({
        lineId: effectiveLineId,
        department: selectedDept,
        date: new Date().toISOString().slice(0, 10),
        shift: PAPERCARD_CONFIG.shift,
        answers: Object.entries(form.answers).map(([itemId, val]) => ({
          itemId,
          status: val.status,
          textValue: val.posName || val.textValue || "",
          cause: val.cause,
          solution: val.solution,
        })),
        abnormalNotes: null,
      });
      loadDailySubmissions();
    } catch (e: any) {
      console.warn("Papercard API submission warning:", e);
      alert(e?.message || "Gagal mengirimkan papercard.");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="dml-pc">
      <div className="dml-page-head" style={{ marginBottom: 12 }}>
        <div>
          <h1 className="dml-pc__title" style={{ fontSize: 18, margin: "0 0 4px" }}>
            Papercard Kesiapan Anggota Lini
          </h1>
          <p className="dml-pc__intro" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
            Checklist kesiapan kerja sebelum DM Meeting khusus departemen{" "}
            <strong>{activeProfile.deptLabel} ({selectedDept})</strong> pada{" "}
            <strong>{activeProfile.lineName}</strong>. Hasil pemeriksaan otomatis diteruskan ke
            Supervisor {activeProfile.supervisor.name} untuk persetujuan.
          </p>
        </div>
      </div>

      {/* Meta Card with Countdown or Approval Banner */}
      <PapercardMetaCard
        lines={PAPERCARD_LINES}
        line={activeProfile.lineName.replace(/^Line\s+/i, "")}
        onLineChange={() => {}}
        leader={`${activeProfile.name} (${selectedDept})`}
        operatorLabel="Operator / Anggota"
        shift={PAPERCARD_CONFIG.shift}
        date={win.now ? formatDateId(win.now) : ""}
        lineLocked={true}
      >
        <WindowBanner
          state={win.state}
          start={dynamicTemplate.window?.start || "07:30"}
          end={dynamicTemplate.window?.end || "08:15"}
          remainingMs={win.remainingMs}
          submissionStatus={
            isApproved ? "approved" : isRejected ? "rejected" : isPending ? "pending" : null
          }
          supervisorName={realSubmission?.approvedByName || activeProfile.supervisor.name}
          supervisorNotes={realSubmission?.supervisorNotes}
          submittedAt={
            realSubmission?.submittedAt
              ? (realSubmission.submittedAt.includes("T")
                  ? new Date(realSubmission.submittedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                  : realSubmission.submittedAt) + " WIB"
              : null
          }
        />
      </PapercardMetaCard>

      {/* 6. Dynamic Database Template Checklist Section */}
      {templateLoading ? (
        <div
          className="ui-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            margin: "20px 0",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
          }}
        >
          <div
            style={{
              display: "inline-block",
              width: "32px",
              height: "32px",
              border: "3px solid #cbd5e1",
              borderTopColor: "#0f766e",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "12px",
            }}
          />
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
            Memuat Checklist Papercard dari Database...
          </div>
          <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
            Mengambil konfigurasi resmi untuk {activeProfile.deptLabel} ({selectedDept}) pada {activeProfile.lineName}
          </div>
        </div>
      ) : dynamicTemplate.categories.length === 0 ? (
        <div
          className="ui-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "#f8fafc",
            borderRadius: "14px",
            border: "1.5px dashed #cbd5e1",
            margin: "20px 0",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>📋</div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
            Belum Ada Template Papercard di Database
          </h3>
          <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "480px", margin: "0 auto 16px", lineHeight: "1.5" }}>
            Database belum memiliki konfigurasi checklist pertanyaan papercard untuk Lini <strong>{activeProfile.lineName}</strong> dan Departemen <strong>{selectedDept}</strong>.
          </p>
          <div
            style={{
              fontSize: "12px",
              color: "#0f766e",
              background: "#f0fdfa",
              padding: "10px 18px",
              borderRadius: "8px",
              display: "inline-block",
              border: "1px solid #ccfbf1",
              fontWeight: 500,
            }}
          >
            💡 Silakan hubungi Administrator untuk membuat template melalui menu <strong>Admin Panel &gt; Papercard Template</strong>.
          </div>
        </div>
      ) : (
        <>
          {/* Overall Progress Bar */}
          <OverallProgress done={form.progress.done} total={form.progress.total} />

          {/* Category Navigation (Left) + Checklist Item Panel (Right) */}
          <div className="dml-pc__grid">
            <CategoryNav
              categories={dynamicTemplate.categories}
              activeId={active?.id ?? ""}
              progress={form.progress.byCategory}
              onSelect={setActiveId}
            />
            {active ? (
              <CategoryPanel
                category={active}
                rule={dynamicTemplate.rule}
                done={activeProgress.done}
                total={activeProgress.total}
                readOnly={readOnly}
                getAnswer={form.getAnswer}
                onChange={form.update}
                onMarkAllOk={() => form.markAllOk(active.id)}
              />
            ) : null}
          </div>

          {/* Sticky Submit Bar */}
          <SubmitBar
            done={form.progress.done}
            total={form.progress.total}
            complete={form.progress.complete}
            submitted={readOnly}
            isRevision={isRevisionMode}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  );
}
