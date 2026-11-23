"use client";
import { useUiText } from "@/locales/useUiText";

import { labelWithDepartment } from "../../departments";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../../leader/papercard/papercard.css";
import "../../leader/dmSoft.css";

import { CategoryNav } from "../../leader/papercard/components/CategoryNav";
import { CategoryPanel } from "../../leader/papercard/components/CategoryPanel";
import { OverallProgress } from "../../leader/papercard/components/OverallProgress";
import { PapercardMetaCard } from "../../leader/papercard/components/PapercardMetaCard";
import {
  NextLineModal,
  SubstituteConfirmModal,
  lineLabel,
} from "./components/PapercardModals";
import {
  SupervisorSelect,
  usePapercardSupervisor,
} from "../../leader/papercard/components/SupervisorSelect";
import { SubmitBar } from "../../leader/papercard/components/SubmitBar";
import { WindowBanner } from "../../leader/papercard/components/WindowBanner";
import { useInspectionWindow } from "../../leader/papercard/hooks/useInspectionWindow";
import { usePapercardForm } from "../../leader/papercard/hooks/usePapercardForm";
import {
  PAPERCARD_CONFIG,
  PAPERCARD_LINES,
} from "../../leader/papercard/mockTemplate";
import type {
  ChecklistCategory,
  ChecklistTemplate,
  Submission,
} from "../../leader/papercard/types";
import {
  buildAnswerPayload,
  formatDateId,
  groupItemsBySubject,
} from "../../leader/papercard/utils";
import type { DepartmentKey } from "../../leader/types";
import { accountApi, papercardApi } from "../../api";
import type { DmFillableLine, DmMe, DmPapercardSubmission } from "../../api";
import { PAPERCARD_CHANGED_EVENT } from "../../notifications/revisions";

const EMPTY_MEMBER_TEMPLATE: ChecklistTemplate = {
  id: "0",
  version: 1,
  window: { start: "07:30", end: "08:15" },
  rule: {
    ok: "OK jika seluruh item normal.",
    ng: "NG jika ada deviasi abnormal.",
  },
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
  const { text: uiText, locale: uiLocale } = useUiText();
  const [selectedDept, setSelectedDept] = useState<DepartmentKey>(initialDept);
  const [line, setLine] = useState(PAPERCARD_LINES[0]);
  const [currentUser, setCurrentUser] = useState<DmMe | null>(null);

  // Template strictly from PostgreSQL Database
  const [dynamicTemplate, setDynamicTemplate] = useState<ChecklistTemplate>(
    EMPTY_MEMBER_TEMPLATE
  );
  const [templateLoading, setTemplateLoading] = useState(true);

  const [activeId, setActiveId] = useState<string>("");

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [realSubmission, setRealSubmission] =
    useState<DmPapercardSubmission | null>(null);

  const [selectedLineOverride, setSelectedLineOverride] = useState<
    DmMe["line"] | null
  >(null);

  const [fillable, setFillable] = useState<DmFillableLine[]>([]);
  useEffect(() => {
    let cancelled = false;
    papercardApi
      .fillableLines()
      .then((rows) => {
        if (!cancelled) setFillable(rows ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Line aktif HANYA berasal dari pilihan member (tidak ada auto-select diam-diam).
  const activeLine = selectedLineOverride;
  const hasLine = Boolean(activeLine);

  // Modal konfirmasi pengganti & modal jadwal berikutnya
  const [pendingLine, setPendingLine] = useState<DmFillableLine | null>(null);
  const [nextPrompt, setNextPrompt] = useState<{
    submitted: DmFillableLine | null;
    next: DmFillableLine;
    remaining: number;
  } | null>(null);
  const activeFillable = fillable.find((l) => l.id === activeLine?.id) ?? null;
  const isSubstituteFill = Boolean(activeFillable && !activeFillable.isOwn);
  const effectiveLineId =
    activeLine?.id || (line === "502" ? 2 : line === "503" ? 3 : 1);

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
            rawDept === "QA"
              ? "QC"
              : ["PROD", "ME", "PE", "QC"].includes(rawDept)
              ? (rawDept as DepartmentKey)
              : "PROD";
          setSelectedDept(mappedDept);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // Line default = line sendiri (jika punya dua, yang pertama); tetap bisa diganti manual.
  useEffect(() => {
    if (selectedLineOverride) return;
    const own = fillable.find((l) => l.isOwn);
    if (own) {
      applyLine(String(own.id));
    } else if (fillable.length === 0 && currentUser?.lines?.length) {
      applyLine(String(currentUser.lines[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillable, currentUser, selectedLineOverride]);

  const activeProfile = useMemo(() => {
    if (!currentUser) {
      return {
        name: "Member",
        deptLabel: "Departemen belum diatur",
        lineName: "Lini belum dipilih",
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
        ? ""
        : "Quality";

    return {
      name: currentUser.name || currentUser.username,
      employeeId: currentUser.username,
      role: "Operator Lini",
      position: currentUser.position || `${deptLabel} Operator`,
      dept,
      deptLabel,
      line: activeLine?.code || "",
      lineName: activeLine?.name || "Lini belum dipilih",
      workshop: activeLine?.workshopName || "Workshop belum diatur",
      supervisor: {
        name: currentUser.supervisor || "Belum diatur admin",
        employeeId: "SPV-019",
        role: "Supervisor Lini",
      },
    };
  }, [currentUser, line, activeLine, effectiveLineId, selectedDept]);

  // 2. Fetch template strictly from PostgreSQL database
  useEffect(() => {
    let cancelled = false;
    if (!hasLine) {
      setDynamicTemplate(EMPTY_MEMBER_TEMPLATE);
      setActiveId("");
      setTemplateLoading(false);
      return;
    }
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
        if (
          matched &&
          matched.templateData &&
          matched.templateData.categories &&
          matched.templateData.categories.length > 0
        ) {
          const loadedCategories: ChecklistCategory[] =
            matched.templateData.categories.map((c: any) => ({
              id: c.id,
              name: c.name,
              groups:
                c.groups ??
                groupItemsBySubject(
                  c.id,
                  c.items ?? [],
                  matched.templateData.okRule
                ),
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
              ng:
                matched.templateData.ngRule || "NG jika ada deviasi abnormal.",
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
  }, [effectiveLineId, selectedDept, hasLine]);

  // 3. Load today's submissions for this department
  const loadDailySubmissions = useCallback(() => {
    if (!hasLine) return;
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
  }, [effectiveLineId, selectedDept, hasLine]);

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

  useEffect(() => {
    form.loadAnswers({});
    setRealSubmission(null);
    setSubmission(null);
  }, [effectiveLineId, selectedDept]);

  // Pre-fill answers from database submission if present
  useEffect(() => {
    if (
      realSubmission &&
      realSubmission.answers &&
      realSubmission.answers.length > 0
    ) {
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

  const supervisor = usePapercardSupervisor(
    `${currentUser?.username}:${effectiveLineId}:${selectedDept}`,
    realSubmission?.lineId === effectiveLineId &&
      realSubmission?.department === selectedDept
      ? realSubmission
      : null,
    { lineId: effectiveLineId, department: selectedDept }
  );

  const approvalStatus = (realSubmission?.approvalStatus || "").toLowerCase();
  const isApproved = approvalStatus === "approved";
  const isRejected = approvalStatus === "rejected";
  const isPending = Boolean(realSubmission) && !isApproved && !isRejected;
  const isRevisionMode = isRejected;
  const readOnly = isApproved || isPending;
  const lineInactive = Boolean(
    activeLine?.status && activeLine.status !== "running"
  );
  const lineCount = currentUser?.lines?.length ?? 0;
  const inactiveText = lineInactive
    ? uiText(
        "Line {{v0}} nonaktif. Papercard tidak dapat diisi untuk line ini.",
        {
          v0: activeLine?.code ?? "",
        }
      )
    : undefined;

  const active =
    dynamicTemplate.categories.find((c) => c.id === activeId) ??
    dynamicTemplate.categories[0];
  const activeProgress = active
    ? form.progress.byCategory[active.id] ?? { done: 0, total: 0 }
    : { done: 0, total: 0 };

  const activeIndex = dynamicTemplate.categories.findIndex(
    (c) => c.id === active?.id
  );
  const isFirstStep = activeIndex <= 0;
  const isLastStep =
    activeIndex < 0 || activeIndex >= dynamicTemplate.categories.length - 1;
  const goToStep = (index: number) => {
    const target = dynamicTemplate.categories[index];
    if (!target) return;
    setActiveId(target.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const bannerProps = {
    state: win.state,
    start: dynamicTemplate.window?.start || "07:30",
    end: dynamicTemplate.window?.end || "08:15",
    remainingMs: win.remainingMs,
    supervisorName: realSubmission?.approvedByName || supervisor.name,
    supervisorNotes: realSubmission?.supervisorNotes,
    submittedAt: realSubmission?.submittedAt
      ? (realSubmission.submittedAt.includes("T")
          ? new Date(realSubmission.submittedAt).toLocaleTimeString(uiLocale, {
              hour: "2-digit",
              minute: "2-digit",
            })
          : realSubmission.submittedAt) + " WIB"
      : null,
  };

  /** Jadwal milik sendiri (selain yang baru dikirim) yang belum diisi / perlu revisi. */
  const findUnfilledOwnLines = async (excludeId: number) => {
    const today = new Date().toISOString().slice(0, 10);
    const candidates = fillable.filter(
      (l) =>
        l.isOwn && l.id !== excludeId && (!l.status || l.status === "running")
    );
    const checked = await Promise.all(
      candidates.map(
        (l) =>
          papercardApi
            .listSubmissions({
              lineId: l.id,
              department: selectedDept,
              date: today,
            })
            .then((subs) => ({ line: l, sub: subs?.[0] ?? null }))
            .catch(() => null) // gagal cek -> jangan menawarkan apa pun
      )
    );
    return (
      checked
        .filter(
          (
            r
          ): r is { line: DmFillableLine; sub: DmPapercardSubmission | null } =>
            r !== null
        )
        // belum ada submission = belum diisi; rejected = perlu direvisi.
        // pending / approved dianggap selesai -> tidak ditawarkan lagi.
        .filter(
          (r) =>
            !r.sub || (r.sub.approvalStatus || "").toLowerCase() === "rejected"
        )
        .map((r) => r.line)
    );
  };

  const handleSubmit = async () => {
    if (
      !form.progress.complete ||
      !supervisor.available ||
      !win.now ||
      readOnly ||
      lineInactive
    )
      return;
    const now = win.now;
    const status = win.state === "closed" ? "LATE" : "ON_TIME";
    const submittedLineId = effectiveLineId;
    const submittedFillable = activeFillable;

    setSubmission({ submittedAt: now, status });
    setIsEditing(false);

    try {
      await papercardApi.submit({
        lineId: submittedLineId,
        department: selectedDept,
        date: new Date().toISOString().slice(0, 10),
        shift: PAPERCARD_CONFIG.shift,
        answers: buildAnswerPayload(dynamicTemplate.categories, form.answers),
        abnormalNotes: null,
        recipientSupervisorId: supervisor.selectedId,
      });
      loadDailySubmissions();
      window.dispatchEvent(new Event(PAPERCARD_CHANGED_EVENT));
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Modal jadwal berikutnya: hanya setelah submit sukses & masih ada sisa.
      const unfilled = await findUnfilledOwnLines(submittedLineId);
      if (unfilled.length > 0) {
        setNextPrompt({
          submitted: submittedFillable,
          next: unfilled[0],
          remaining: unfilled.length,
        });
      }
      return;
    } catch (e: any) {
      console.warn("Papercard API submission warning:", e);
      alert(e?.message || uiText("Gagal mengirimkan papercard."));
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Terapkan line terpilih (tanpa konfirmasi). */
  function applyLine(newLineVal: string) {
    const pick = fillable.find((l) => String(l.id) === newLineVal);
    const found = pick
      ? {
          id: pick.id,
          code: pick.code,
          name: pick.name,
          model: pick.model,
          status: pick.status,
          workshopName: pick.workshopName,
          slug: "",
        }
      : currentUser?.lines?.find((l) => String(l.id) === newLineVal);
    if (found) {
      setSelectedLineOverride(found);
      setLine(found.name);
    }
  }

  /** Dipanggil dropdown: line sendiri -> langsung; line orang lain -> konfirmasi dulu. */
  const selectLineById = (newLineVal: string) => {
    if (!newLineVal) return;
    const pick = fillable.find((l) => String(l.id) === newLineVal);
    if (pick && !pick.isOwn && pick.id !== activeLine?.id) {
      setPendingLine(pick);
      return;
    }
    applyLine(newLineVal);
  };

  const confirmSubstitute = () => {
    if (!pendingLine) return;
    applyLine(String(pendingLine.id));
    setPendingLine(null);
  };

  const continueToNextLine = () => {
    if (!nextPrompt) return;
    applyLine(String(nextPrompt.next.id)); // jadwal sendiri -> tanpa konfirmasi
    setNextPrompt(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Dropdown: kode line · model — pemilik jadwal
  const lineOptionList =
    fillable.length > 0
      ? fillable.map((l) => {
          const owner = l.isOwn ? "" : l.mainMembers?.join(", ") ?? "";
          const inactive = l.status && l.status !== "running";
          return {
            value: String(l.id),
            label: lineLabel(l),
            title: l.code,
            model: l.model,
            owner: owner ? `${uiText("Line")} ${owner}` : undefined,
            tag: inactive
              ? uiText("Nonaktif")
              : l.isOwn
              ? uiText("Line Anda")
              : undefined,
          };
        })
      : (currentUser?.lines ?? []).map((l) => ({
          value: String(l.id),
          label: lineLabel(l),
          title: l.code,
          model: l.model,
          tag:
            l.status && l.status !== "running"
              ? uiText("Nonaktif")
              : uiText("Line Anda"),
        }));

  return (
    <div className="dml-pc">
      <div className="dml-page-head" style={{ marginBottom: 12 }}>
        <div>
          <h1
            className="dml-pc__title"
            style={{ fontSize: 18, margin: "0 0 4px" }}
          >
            {uiText("Papercard Kesiapan Anggota Lini")}
          </h1>
          {hasLine ? (
            <p
              className="dml-pc__intro"
              style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}
            >
              {uiText(
                "Checklist kesiapan kerja sebelum DM Meeting khusus departemen"
              )}{" "}
              <strong>
                {labelWithDepartment(activeProfile.deptLabel, selectedDept)}
              </strong>
              {uiText(" pada")} <strong>{activeProfile.lineName}</strong>
              {uiText(". Hasil pemeriksaan otomatis diteruskan ke Supervisor ")}
              {supervisor.name}
              {uiText(" untuk persetujuan.")}
            </p>
          ) : (
            <p
              className="dml-pc__intro"
              style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}
            >
              {uiText("Pilih line untuk mulai mengisi papercard.")}
            </p>
          )}
        </div>
      </div>

      {isRejected && (
        <div className="dml-pc-revision">
          <WindowBanner {...bannerProps} submissionStatus="rejected" />
        </div>
      )}

      {inactiveText && (
        <div
          className="dml-banner dml-banner--rejected"
          role="alert"
          style={{ marginBottom: 12 }}
        >
          <p className="dml-banner__title">{uiText("Line nonaktif")}</p>
          <p className="dml-banner__sub" style={{ margin: "2px 0 0" }}>
            {inactiveText}
          </p>
        </div>
      )}

      {/* Meta Card with Countdown or Approval Banner */}
      <PapercardMetaCard
        lines={
          currentUser?.lines && currentUser.lines.length > 0
            ? currentUser.lines.map((l) => l.name.replace(/^Line\s+/i, ""))
            : PAPERCARD_LINES
        }
        lineOptions={
          hasLine
            ? lineOptionList
            : [{ value: "", label: uiText("Pilih Line") }, ...lineOptionList]
        }
        line={hasLine && activeLine ? String(activeLine.id) : ""}
        onLineChange={selectLineById}
        leader={`${activeProfile.name} (${selectedDept})`}
        operatorLabel="Operator / Anggota"
        shift={PAPERCARD_CONFIG.shift}
        date={win.now ? formatDateId(win.now, uiLocale) : ""}
        supervisorField={
          <SupervisorSelect selection={supervisor} disabled={readOnly} />
        }
        lineLocked={
          !hasLine
            ? false
            : fillable.length > 1
            ? false
            : !(currentUser?.lines && currentUser.lines.length > 1)
        }
      >
        {!isRejected && (
          <WindowBanner
            {...bannerProps}
            submissionStatus={
              isApproved ? "approved" : isPending ? "pending" : null
            }
          />
        )}
      </PapercardMetaCard>

      {hasLine && isSubstituteFill && !realSubmission && (
        <p
          className="dml-pc__intro"
          style={{ fontSize: 12.5, lineHeight: 1.5, margin: "8px 0 0" }}
        >
          {uiText("Mengisi sebagai pengganti ")}
          <strong>
            {activeFillable?.mainMembers?.length
              ? activeFillable.mainMembers.join(", ")
              : uiText("anggota line ini")}
          </strong>
          .
        </p>
      )}

      {realSubmission?.isSubstitute && realSubmission.replacedEmployeeName ? (
        <p
          className="dml-pc__intro"
          style={{ fontSize: 12.5, lineHeight: 1.5, margin: "8px 0 0" }}
        >
          {uiText("Diisi oleh ")}
          <strong>{realSubmission.employeeName}</strong>
          {uiText(" sebagai pengganti ")}
          <strong>{realSubmission.replacedEmployeeName}</strong>.
        </p>
      ) : realSubmission?.employeeName &&
        realSubmission.employeeNo !== currentUser?.username ? (
        <p
          className="dml-pc__intro"
          style={{ fontSize: 12.5, lineHeight: 1.5, margin: "8px 0 0" }}
        >
          {uiText("Papercard hari ini sudah diisi oleh ")}
          <strong>{realSubmission.employeeName}</strong>
          {uiText(" (satu departemen).")}
        </p>
      ) : null}

      {/* 6. Dynamic Database Template Checklist Section */}
      {!hasLine ? null : templateLoading ? (
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
            {uiText("Memuat Checklist Papercard dari Database...")}
          </div>
          <div
            style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}
          >
            {uiText("Mengambil konfigurasi resmi untuk ")}
            {labelWithDepartment(activeProfile.deptLabel, selectedDept)}
            {uiText(" pada ")}
            {activeProfile.lineName}
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
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: "6px",
            }}
          >
            {uiText("Belum Ada Template Papercard di Database")}
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "#64748b",
              maxWidth: "480px",
              margin: "0 auto 16px",
              lineHeight: "1.5",
            }}
          >
            {uiText(
              "Database belum memiliki konfigurasi checklist pertanyaan papercard untuk Lini "
            )}
            <strong>{activeProfile.lineName}</strong>
            {uiText(" dan Departemen ")}
            <strong>{selectedDept}</strong>.
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
            {uiText(
              "💡 Silakan hubungi Administrator untuk membuat template melalui menu "
            )}
            <strong>{uiText("Admin Panel > Papercard Template")}</strong>.
          </div>
        </div>
      ) : (
        <>
          {/* Overall Progress Bar */}
          <OverallProgress
            done={form.progress.done}
            total={form.progress.total}
          />

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
                readOnly={readOnly || lineInactive}
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
            complete={form.progress.complete && supervisor.available}
            submitted={readOnly}
            isRevision={isRevisionMode}
            blockedText={inactiveText}
            onSubmit={handleSubmit}
            showNext={!isLastStep}
            onNext={() => goToStep(activeIndex + 1)}
            showPrev={!isFirstStep}
            onPrev={() => goToStep(activeIndex - 1)}
          />
        </>
      )}

      {pendingLine && (
        <SubstituteConfirmModal
          line={pendingLine}
          onConfirm={confirmSubstitute}
          onCancel={() => setPendingLine(null)}
        />
      )}

      {nextPrompt && (
        <NextLineModal
          submittedLine={nextPrompt.submitted}
          next={nextPrompt.next}
          remaining={nextPrompt.remaining}
          userName={activeProfile.name}
          shift={PAPERCARD_CONFIG.shift}
          onContinue={continueToNextLine}
          onLater={() => setNextPrompt(null)}
        />
      )}
    </div>
  );
}
