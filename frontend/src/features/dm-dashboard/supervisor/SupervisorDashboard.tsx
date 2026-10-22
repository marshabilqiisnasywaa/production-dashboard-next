"use client";

import Link from "next/link";
import {
  IconAlert,
  IconCheckCircle,
  IconClipboardCheck,
  IconClock,
  IconPulse,
} from "@/components/ui/icons";
import { KpiCard } from "../leader/components/KpiCard";
import { SupervisorPageHeader } from "./components";
import { SUPERVISOR_ROUTES } from "./routes";
import { useSupervisor } from "./SupervisorProvider";

function percent(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

export default function SupervisorDashboard() {
  const {
    currentSupervisor,
    dbLines,
    allListItems,
    totalCount,
    submittedCount,
    pendingApprovalsCount,
    approvedCount,
    abnormalCount,
    isLoading,
    refresh,
    openReview,
  } = useSupervisor();

  const pendingMembers = allListItems.filter(
    (member) => member.submission?.approvalStatus === "pending",
  );
  const submittedRate = percent(submittedCount, totalCount);
  const approvedRate = percent(approvedCount, submittedCount);
  const meta = `Dept ${currentSupervisor.dept} · ${dbLines.length} lini · ${totalCount} anggota tim`;

  return (
    <div className="dms-container">
      <div className="dml-page-head">
        <SupervisorPageHeader
          title="Dashboard Supervisor"
          userName={currentSupervisor.name}
          meta={meta}
        />
        <button
          type="button"
          onClick={() => {
            void refresh();
          }}
          disabled={isLoading}
          className="spv-btn spv-btn--secondary spv-btn--sm"
          title="Muat ulang data terbaru dari database"
        >
          {isLoading ? "Memuat..." : "↻ Segarkan"}
        </button>
      </div>

      <div className="dml-kpis">
        <KpiCard
          title="Papercard terkirim"
          value={submittedRate}
          icon={<IconClipboardCheck size={20} />}
        />
        <KpiCard
          title="Disetujui"
          value={approvedRate}
          icon={<IconCheckCircle size={20} />}
        />
        <KpiCard
          title="Menunggu persetujuan"
          value={pendingApprovalsCount}
          icon={<IconClock size={20} />}
          unit={""}
          tone={pendingApprovalsCount > 0 ? "warn" : "ok"}
          showTarget={false}
        />
        <KpiCard
          title="Temuan NG"
          value={abnormalCount}
          icon={<IconAlert size={20} />}
          unit={""}
          tone={abnormalCount > 0 ? "bad" : "ok"}
          showTarget={false}
        />
      </div>

      <div className="dml-grid">
        <section className="dms-card">
          <div className="dms-card-head">
            <div className="dms-card-head-left">
              <span className="dms-card-icon dms-card-icon--teal">
                <IconClock size={16} />
              </span>
              <div>
                <h2 className="dms-card-title">Menunggu persetujuan</h2>
                <p className="dms-card-subtitle">Papercard yang perlu ditinjau hari ini</p>
              </div>
            </div>
            <Link
              href={SUPERVISOR_ROUTES.approvals}
              className="dms-btn-compact dms-btn-compact--secondary"
            >
              Lihat semua
            </Link>
          </div>

          {pendingMembers.length === 0 ? (
            <div className="spv-dash-empty">Tidak ada papercard yang menunggu persetujuan.</div>
          ) : (
            <div className="spv-dash-list">
              {pendingMembers.map((member) => (
                <div className="spv-dash-row" key={member.id}>
                  <div className="spv-dash-row__main">
                    <strong className="spv-dash-row__name">{member.name}</strong>
                    <span className="spv-dash-row__meta">
                      <span className={`spv-chip spv-chip--dept-${member.dept.toLowerCase()}`}>
                        {member.dept}
                      </span>{" "}
                      · {member.lineName || "Lini Lain"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openReview(member)}
                    className="spv-btn spv-btn--secondary spv-btn--sm"
                  >
                    Tinjau
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="dml-aside">
          <section className="dms-card">
            <div className="dms-card-head">
              <div className="dms-card-head-left">
                <span className="dms-card-icon dms-card-icon--indigo">
                  <IconPulse size={16} />
                </span>
                <div>
                  <h2 className="dms-card-title">Ringkasan per lini</h2>
                  <p className="dms-card-subtitle">Progres papercard hari ini</p>
                </div>
              </div>
            </div>

            {dbLines.length === 0 ? (
              <div className="spv-dash-empty">Belum ada data lini di database.</div>
            ) : (
              <div className="spv-dash-lines">
                {dbLines.map((line) => {
                  const submitted = line.members.filter((member) => member.submission).length;
                  const approved = line.members.filter(
                    (member) => member.submission?.approvalStatus === "approved",
                  ).length;

                  return (
                    <div className="spv-dash-line" key={line.lineId}>
                      <div>
                        <strong className="spv-dash-line__name">{line.lineName}</strong>
                        <span className="spv-dash-line__meta">
                          {submitted}/{line.members.length} terkirim · {approved} disetujui
                        </span>
                      </div>
                      <span className="spv-dash-line__badge">
                        {percent(approved, line.members.length)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
