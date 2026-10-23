"use client";

import { useEffect, useState } from "react";
import "./papercard.css";
import { CategoryNav } from "./components/CategoryNav";
import { CategoryPanel } from "./components/CategoryPanel";
import { OverallProgress } from "./components/OverallProgress";
import { PapercardMetaCard } from "./components/PapercardMetaCard";
import { SubmitBar } from "./components/SubmitBar";
import { WindowBanner } from "./components/WindowBanner";
import { useInspectionWindow } from "./hooks/useInspectionWindow";
import { usePapercardForm } from "./hooks/usePapercardForm";
import { LEADER_TEMPLATE, PAPERCARD_CONFIG, PAPERCARD_LINES } from "./mockTemplate";
import type { Answer, ChecklistCategory, ChecklistTemplate, Submission } from "./types";
import { buildAnswerPayload, formatDateId, groupItemsBySubject } from "./utils";
import { accountApi, papercardApi } from "../../api";
import type { DmMe, DmPapercardSubmission } from "../../api";
import { PAPERCARD_CHANGED_EVENT } from "../../notifications/revisions";

// Fallback empty template if neither LEADER_TEMPLATE nor database template exists
const EMPTY_LEADER_TEMPLATE: ChecklistTemplate = {
  id: "0",
  version: 1,
  window: { start: "07:30", end: "08:15" },
  rule: { ok: "OK jika seluruh item normal.", ng: "NG jika ada deviasi abnormal." },
  categories: [],
};

/** Composition only: logic is in hooks/, UI pieces are in components/. */
export default function PapercardPage() {
  const [currentUser, setCurrentUser] = useState<DmMe | null>(null);
  const [line, setLine] = useState(PAPERCARD_LINES[0]);
  const [dynamicTemplate, setDynamicTemplate] = useState<ChecklistTemplate>(EMPTY_LEADER_TEMPLATE);
  const [templateLoading, setTemplateLoading] = useState(true);

  // Fetch logged in leader profile
  useEffect(() => {
    let cancelled = false;
    accountApi
      .me()
      .then((me) => {
        if (cancelled || !me) return;
        setCurrentUser(me);
        if (me.line?.name) {
          setLine(me.line.name);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveLineId = currentUser?.line?.id || (line === "502" ? 2 : line === "503" ? 3 : 1);

  // Fetch template strictly from database for the leader's actual line and PROD department
  useEffect(() => {
    let cancelled = false;
    setTemplateLoading(true);

    papercardApi
      .listTemplates({
        lineId: effectiveLineId,
        department: "PROD",
      })
      .then((res) => {
        if (cancelled) return;
        if (!res || res.length === 0) {
          setDynamicTemplate(EMPTY_LEADER_TEMPLATE);
          setActiveId("");
          return;
        }

        const matched = res[0];
        if (matched && matched.templateData && matched.templateData.categories && matched.templateData.categories.length > 0) {
          const loadedCategories: ChecklistCategory[] = matched.templateData.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            groups: c.groups ?? groupItemsBySubject(c.id, c.items ?? [], matched.templateData.okRule),
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
              ng: matched.templateData.ngRule || "NG jika ada deviasi atau abnormalitas.",
            },
            categories: loadedCategories,
          });
          if (loadedCategories[0]) {
            setActiveId(loadedCategories[0].id);
          }
        } else {
          setDynamicTemplate(EMPTY_LEADER_TEMPLATE);
          setActiveId("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDynamicTemplate(EMPTY_LEADER_TEMPLATE);
          setActiveId("");
        }
      })
      .finally(() => {
        if (!cancelled) setTemplateLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveLineId]);

  const win = useInspectionWindow({
    start: dynamicTemplate.window?.start || "07:30",
    end: dynamicTemplate.window?.end || "08:15",
    simulate: PAPERCARD_CONFIG.simulateWindow,
  });
  const form = usePapercardForm(dynamicTemplate.categories || []);

  const [activeId, setActiveId] = useState<string>("");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [dbSubmission, setDbSubmission] = useState<DmPapercardSubmission | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState(true);

  const todayIso = new Date().toISOString().split("T")[0];

  // Fetch today's submission for Leader's line
  useEffect(() => {
    let cancelled = false;
    setSubmissionLoading(true);

    papercardApi
      .listSubmissions({
        lineId: effectiveLineId,
        department: "PROD",
        date: todayIso,
      })
      .then((res) => {
        if (cancelled) return;
        const sub = res && res.length > 0 ? res[0] : null;
        setDbSubmission(sub);

        if (sub && sub.answers && Array.isArray(sub.answers) && sub.answers.length > 0) {
          const loadedMap: Record<string, Answer> = {};
          for (const a of sub.answers) {
            if (a && a.itemId) {
              loadedMap[String(a.itemId)] = {
                status: a.status === "OK" || a.status === "NG" ? a.status : null,
                posName: a.textValue || "",
                cause: a.cause || "",
                solution: a.solution || "",
              };
            }
          }
          form.loadAnswers(loadedMap);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat submission hari ini:", err);
      })
      .finally(() => {
        if (!cancelled) setSubmissionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveLineId, todayIso]);

  const approvalStatus = (dbSubmission?.approvalStatus || "").toLowerCase();
  const isApproved = approvalStatus === "approved";
  const isRejected = approvalStatus === "rejected";
  const isPending = Boolean(dbSubmission) && !isApproved && !isRejected;
  const isRevisionMode = isRejected;
  // If approved or waiting review (pending), form is locked read-only.
  // If rejected by supervisor, readOnly is false (Leader can edit and resubmit).
  const readOnly = isApproved || isPending;

  const active = dynamicTemplate.categories.find((c) => c.id === activeId) ?? dynamicTemplate.categories[0];
  const activeProgress = active ? (form.progress.byCategory[active.id] ?? { done: 0, total: 0 }) : { done: 0, total: 0 };

  const handleSubmit = async () => {
    if (!form.progress.complete || !win.now || readOnly) return;
    const now = win.now;
    const status = win.state === "closed" ? "LATE" : "ON_TIME";

    // Set local submission notice
    setSubmission({ submittedAt: now, status });

    // Submit to backend API if available
    try {
      const res = await papercardApi.submit({
        lineId: effectiveLineId,
        department: "PROD",
        date: todayIso,
        shift: PAPERCARD_CONFIG.shift,
        answers: buildAnswerPayload(dynamicTemplate.categories, form.answers),
        abnormalNotes: null,
      });
      setDbSubmission(res);
      window.dispatchEvent(new Event(PAPERCARD_CHANGED_EVENT));
    } catch (e: any) {
      console.warn("Papercard API submission warning:", e);
      alert(e?.message || "Gagal mengirimkan papercard. Pastikan server aktif.");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const supervisorName = currentUser?.supervisor || "Belum diatur admin";
  const lineDisplayName = currentUser?.line?.name || `Line ${line}`;

  const bannerProps = {
    state: win.state,
    start: dynamicTemplate.window?.start || "07:30",
    end: dynamicTemplate.window?.end || "08:15",
    remainingMs: win.remainingMs,
    supervisorName: dbSubmission?.approvedByName || supervisorName,
    supervisorNotes: dbSubmission?.supervisorNotes,
    submittedAt: dbSubmission?.submittedAt
      ? (dbSubmission.submittedAt.includes("T")
          ? new Date(dbSubmission.submittedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
          : dbSubmission.submittedAt) + " WIB"
      : null,
  };

  return (
    <div className="dml-pc">


<div className="dml-page-head dml-pc-page-head">
  <div>
    <h1 className="dml-pc__title">
      Papercard Leader
    </h1>
    <p className="dml-pc__intro">
      Isi checklist harian sebelum DM Meeting tepat waktu untuk{" "}
      <strong>{lineDisplayName}</strong>. Hasil pemeriksaan otomatis dikirim
      ke Supervisor <strong>{supervisorName}</strong> untuk persetujuan.
    </p>
  </div>
</div>

      {isRejected && (
        <div className="dml-pc-revision">
          <WindowBanner {...bannerProps} submissionStatus="rejected" />
        </div>
      )}

      <PapercardMetaCard
        lines={PAPERCARD_LINES}
        line={lineDisplayName.replace(/^Line\s+/i, "")}
        onLineChange={() => {}}
        leader={`${currentUser?.name || "Leader"} (Leader PROD)`}
        shift={PAPERCARD_CONFIG.shift}
        date={win.now ? formatDateId(win.now) : ""}
        lineLocked={true}
      >
        {!isRejected && (
          <WindowBanner
            {...bannerProps}
            submissionStatus={isApproved ? "approved" : isPending ? "pending" : null}
          />
        )}
      </PapercardMetaCard>

      {/* Dynamic Database Template Checklist Section */}
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
            Mengambil konfigurasi resmi untuk Lini {lineDisplayName}
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
            Belum Ada Papercard yang harus anda checklist.
          </h3>
          <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "480px", margin: "0 auto 16px", lineHeight: "1.5" }}>
            Database belum memiliki konfigurasi checklist pertanyaan papercard untuk Line <strong>{lineDisplayName}</strong> dan Departemen <strong>PROD</strong>.
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
           Silakan Hubungi <strong>Admin</strong>.
          </div>
        </div>
      ) : (
        <>
          <OverallProgress done={form.progress.done} total={form.progress.total} />

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
