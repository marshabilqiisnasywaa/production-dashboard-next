"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconAlert,
  IconCheck,
  IconCheckCircle,
  IconHistory,
  IconPulse,
} from "@/components/ui/icons";
import {
  papercardApi,
  type DmSupervisorOverview,
  type DmSupervisorSubordinate,
} from "../../../api";

interface SupervisorHistoryTabProps {
  onSelectReview: (subordinate: DmSupervisorSubordinate) => void;
}

export function SupervisorHistoryTab({ onSelectReview }: SupervisorHistoryTabProps) {
  // Default date to today
  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [data, setData] = useState<DmSupervisorOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch history overview for selectedDate
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    papercardApi
      .supervisorOverview(selectedDate)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        console.error("Gagal memuat riwayat checklist tanggal:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const subordinates = data?.mySubordinates || [];

  // Quick summary counts
  const totalLines = subordinates.length;
  const submittedCount = subordinates.filter((s) => s.submission).length;
  const approvedCount = subordinates.filter((s) => s.submission?.approvalStatus === "approved").length;
  const ngCount = subordinates.filter((s) => s.submission?.hasNg).length;
  const missingCount = totalLines - submittedCount;

  // Quick shortcuts for date selection
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === todayIso;

  const formattedDateTitle = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* 1. Header & Date Control Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          padding: "12px 16px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <IconHistory size={16} />
            <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 700, color: "#0f172a" }}>
              Riwayat Checklist Harian
            </h3>
          </div>
          <span style={{ fontSize: "11.5px", color: "#64748b" }}>
            Audit kepatuhan pengisian papercard seluruh lini pada tanggal terpilih
          </span>
        </div>

        {/* Date Selector & Quick Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                fontWeight: 600,
                borderRadius: "5px",
                border: "1px solid",
                borderColor: isToday ? "#0f766e" : "#e2e8f0",
                background: isToday ? "#f0fdfa" : "#f8fafc",
                color: isToday ? "#0f766e" : "#475569",
                cursor: "pointer",
              }}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                fontWeight: 600,
                borderRadius: "5px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(2)}
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                fontWeight: 600,
                borderRadius: "5px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#475569",
                cursor: "pointer",
              }}
            >
              2 Hari Lalu
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: "5px 9px",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              outline: "none",
              color: "#0f172a",
              background: "#ffffff",
              cursor: "pointer",
            }}
          />
        </div>
      </div>

      {/* 2. Mini KPI Strip for Selected Date */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "8px",
        }}
      >
        <div style={{ padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "7px" }}>
          <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>Lini Terdaftar</span>
          <strong style={{ fontSize: "15px", color: "#0f172a" }}>{totalLines} Lini</strong>
        </div>
        <div style={{ padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "7px" }}>
          <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>Sudah Terisi</span>
          <strong style={{ fontSize: "15px", color: "#0f766e" }}>{submittedCount} / {totalLines}</strong>
        </div>
        <div style={{ padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "7px" }}>
          <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>Telah Disetujui</span>
          <strong style={{ fontSize: "15px", color: "#047857" }}>{approvedCount} Papercard</strong>
        </div>
        <div style={{ padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "7px" }}>
          <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>Temuan Abnormal</span>
          <strong style={{ fontSize: "15px", color: ngCount > 0 ? "#e11d48" : "#64748b" }}>
            {ngCount} Kasus NG
          </strong>
        </div>
        <div style={{ padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "7px" }}>
          <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>Belum Mengisi</span>
          <strong style={{ fontSize: "15px", color: missingCount > 0 ? "#f59e0b" : "#64748b" }}>
            {missingCount} Lini
          </strong>
        </div>
      </div>

      {/* 3. Date Title Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          fontSize: "12px",
          color: "#334155",
        }}
      >
        <span>
          Menampilkan catatan tanggal: <strong>{formattedDateTitle}</strong>
        </span>
        <span style={{ fontSize: "11px", color: "#64748b" }}>
          Departemen: <strong>{data?.supervisor.dept || "PROD"}</strong>
        </span>
      </div>

      {/* 4. Grid of Line Cards */}
      {loading ? (
        <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "12.5px" }}>
          Memuat riwayat checklist lini untuk tanggal {selectedDate}...
        </div>
      ) : subordinates.length === 0 ? (
        <div
          style={{
            padding: "28px",
            textAlign: "center",
            color: "#64748b",
            background: "#ffffff",
            borderRadius: "8px",
            border: "1px dashed #cbd5e1",
            fontSize: "12.5px",
          }}
        >
          Tidak ada bawahan langsung yang terikat dengan akun Anda pada tanggal ini.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "10px",
          }}
        >
          {subordinates.map((member) => {
            const sub = member.submission;
            const isSubmitted = Boolean(sub);
            const isApproved = sub?.approvalStatus === "approved";
            const hasNg = Boolean(sub?.hasNg);

            return (
              <div
                key={member.id}
                style={{
                  background: "#ffffff",
                  border: `1px solid ${hasNg ? "#fecdd3" : isApproved ? "#bbf7d0" : "#e2e8f0"}`,
                  borderRadius: "8px",
                  padding: "11px 13px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "7px",
                  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Header Lini & Badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: hasNg ? "#e11d48" : isApproved ? "#10b981" : isSubmitted ? "#f59e0b" : "#cbd5e1",
                      }}
                    />
                    <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                      {member.lineName || "Lini Lain"}
                    </strong>
                  </div>

                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "10px",
                      background: !isSubmitted ? "#f1f5f9" : hasNg ? "#fee2e2" : "#dcfce7",
                      color: !isSubmitted ? "#64748b" : hasNg ? "#b91c1c" : "#15803d",
                      border: `1px solid ${!isSubmitted ? "#e2e8f0" : hasNg ? "#fecdd3" : "#bbf7d0"}`,
                    }}
                  >
                    {!isSubmitted ? "Belum Diisi" : hasNg ? "Ada Abnormal (NG)" : "Semua OK"}
                  </span>
                </div>

                {/* PIC Karyawan Info */}
                <div style={{ fontSize: "11.5px", color: "#475569" }}>
                  <div>
                    PIC: <strong>{member.name}</strong> · <span style={{ color: "#64748b" }}>{member.employeeNo}</span>
                  </div>
                  <div style={{ color: "#64748b", fontSize: "11px", marginTop: "1px" }}>
                    {member.position} · {member.dept}
                  </div>
                  {member.substitutedBy && (
                    <div style={{ color: "#64748b", fontSize: "11px", marginTop: "1px" }}>
                      Diwakilkan oleh <strong>{member.substitutedBy.name}</strong> ({member.substitutedBy.employeeNo})
                    </div>
                  )}
                </div>

                {/* Submission Meta & Approval */}
                <div
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    padding: "6px 8px",
                    background: "#f8fafc",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    Jam Submit:{" "}
                    <strong>
                      {sub?.submittedAt
                        ? `${new Date(sub.submittedAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })} WIB`
                        : "-"}
                    </strong>
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: isApproved ? "#047857" : isSubmitted ? "#b45309" : "#94a3b8",
                    }}
                  >
                    {isApproved
                      ? "✓ Disetujui"
                      : isSubmitted
                      ? "Menunggu SPV"
                      : "Belum Ada Data"}
                  </span>
                </div>

                {/* If NG abnormal notes snippet */}
                {sub?.abnormalNotes && (
                  <div
                    style={{
                      fontSize: "10.5px",
                      color: "#9f1239",
                      background: "#fff1f2",
                      border: "1px solid #fecdd3",
                      borderRadius: "5px",
                      padding: "4px 7px",
                      lineHeight: 1.3,
                    }}
                  >
                    <strong>Temuan:</strong> {sub.abnormalNotes}
                  </div>
                )}

                {/* Button Action */}
                <button
                  type="button"
                  onClick={() => onSelectReview(member)}
                  disabled={!isSubmitted}
                  style={{
                    marginTop: "2px",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: isSubmitted ? "#0f766e" : "#e2e8f0",
                    background: isSubmitted ? "#f0fdfa" : "#f8fafc",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    color: isSubmitted ? "#0f766e" : "#94a3b8",
                    cursor: isSubmitted ? "pointer" : "not-allowed",
                    textAlign: "center",
                  }}
                >
                  {isSubmitted ? "Tinjau Detail Checklist →" : "Belum Ada Pengisian"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SupervisorHistoryTab;
