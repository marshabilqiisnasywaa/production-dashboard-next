"use client";

import type { ReactNode } from "react";
import "@/components/ui/ui.css";
import "../leader/leader.css";
import "../leader/dmSoft.css";
import "./supervisor.css";
import { IconAlert, IconCheckCircle, IconClose } from "@/components/ui/icons";
import { SupervisorProvider, useSupervisor } from "./SupervisorProvider";
import { SupervisorReviewModal, SupervisorSidebar } from "./components";
import { SupervisorHeader } from "./components/SupervisorHeader";

function SupervisorFrame({ children }: { children: ReactNode }) {
  const {
    me,
    pendingApprovalsCount,
    escalatedCount,
    toastMessage,
    dismissToast,
    reviewTarget,
    feedbackNote,
    setFeedbackNote,
    isSubmittingApproval,
    closeReview,
    handleApproveSubmission,
  } = useSupervisor();

  return (
    <div className="dm-theme dml-shell">
      <SupervisorSidebar
        pendingApprovalsCount={pendingApprovalsCount}
        escalationCount={escalatedCount}
        canHostWorkshopMeeting={(me?.dept ?? "").trim().toUpperCase() === "PROD"}
      />
      <div className="dml-main">
        <SupervisorHeader />
        <main className="dml-content">
          {toastMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "6px",
                marginBottom: "12px",
                fontSize: "12.5px",
                fontWeight: 600,
                background: toastMessage.type === "error" ? "#fff1f2" : "#ecfdf5",
                color: toastMessage.type === "error" ? "#be123c" : "#047857",
                border: `1px solid ${toastMessage.type === "error" ? "#fecdd3" : "#a7f3d0"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {toastMessage.type === "error" ? (
                  <IconAlert size={15} />
                ) : (
                  <IconCheckCircle size={15} />
                )}
                <span>{toastMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={dismissToast}
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  color: "inherit",
                  padding: "2px",
                }}
              >
                <IconClose size={14} />
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
      <SupervisorReviewModal
        reviewTarget={reviewTarget}
        feedbackNote={feedbackNote}
        setFeedbackNote={setFeedbackNote}
        isSubmittingApproval={isSubmittingApproval}
        onClose={closeReview}
        onApprove={handleApproveSubmission}
      />
    </div>
  );
}

export default function SupervisorShell({ children }: { children: ReactNode }) {
  return (
    <SupervisorProvider>
      <SupervisorFrame>{children}</SupervisorFrame>
    </SupervisorProvider>
  );
}
