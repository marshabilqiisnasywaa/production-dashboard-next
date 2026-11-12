"use client";
import { useUiText } from "@/locales/useUiText";


import { departmentLabel } from "../../../departments";
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
  const { text: uiText, locale: uiLocale } = useUiText();
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
      return d.toLocaleDateString(uiLocale, {
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
            <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 700, color: "#0f172a" }}>{uiText("Riwayat Checklist Harian")}</h3>
          </div>
          <span style={{ fontSize: "11.5px", color: "#64748b" }}>{uiText("Audit kepatuhan pengisian papercard seluruh lini pada tanggal terpilih")}</span>
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
            >{uiText("Hari Ini")}</button>
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
            >{uiText("Kemarin")}</button>
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
            >{uiText("2 Hari Lalu")}</button>
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
          <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>{uiText("Lini Terdaftar")}</span>
          <strong style={{ fontSize: "15px", color: "#0f172a" }}>{totalLines}{uiText(" Lini")}</strong>
        </div>
        <div style={{ padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "7px" }}>
          <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>{uiText("Sudah Terisi")}</span>
          <strong style={{ fontSize: "15px", color: "#0f766e" }}>{submittedCount} / {totalLines}</strong>
        </div>
        <div style={{ padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "7px" }}>
          <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>{uiText("Telah Disetujui")}</span>
          <strong style={{ fontSize: "15px", color: "#047857" }}>{approvedCount}{uiText(" Papercard")}</strong>
        </div>
        <div style={{ padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "7px" }}>
          <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>{uiText("Temuan Abnormal")}</span>
          <strong style={{ fontSize: "15px", color: ngCount > 0 ? "#e11d48" : "#64748b" }}>
            {ngCount}{uiText(" Kasus NG")}</strong>
        </div>
        <div style={{ padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "7px" }}>
          <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>{uiText("Belum Mengisi")}</span>
          <strong style={{ fontSize: "15px", color: missingCount > 0 ? "#f59e0b" : "#64748b" }}>
            {missingCount}{uiText(" Lini")}</strong>
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
        <span>{uiText("Menampilkan catatan tanggal: ")}<strong>{formattedDateTitle}</strong>
        </span>
        <span style={{ fontSize: "11px", color: "#64748b" }}>{uiText("Departemen: ")}<strong>{uiText(departmentLabel(data?.supervisor.dept || "PROD"))}</strong>
        </span>
      </div>

      {/* 4. Grid of Line Cards */}
      {loading ? (
        <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "12.5px" }}>{uiText("Memuat riwayat checklist lini untuk tanggal ")}{selectedDate}...
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
        >{uiText("Tidak ada bawahan langsung yang terikat dengan akun Anda pada tanggal ini.")}</div>
      ) : (
        <div style={{ overflowX: "auto", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "860px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                {["Lini", "PIC", "Status Isi", "Jam Submit", "Persetujuan", "Temuan", ""].map((label, index) => (
                  <th key={`${index}-${label}`} scope="col" style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 700, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
                    {label ? uiText(label) : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subordinates.map((member, index) => {
                const sub = member.submission;
                const isSubmitted = Boolean(sub);
                const isApproved = sub?.approvalStatus === "approved";
                const hasNg = Boolean(sub?.hasNg);
                const cell = { padding: "8px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" } as const;

                return (
                  <tr key={`${member.id}-${member.lineId ?? "x"}-${index}`}>
                    <td style={cell}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, background: hasNg ? "#e11d48" : isApproved ? "#10b981" : isSubmitted ? "#f59e0b" : "#cbd5e1" }} />
                        <strong style={{ color: "#0f172a" }}>{member.lineName || uiText("Lini Lain")}</strong>
                      </div>
                    </td>
                    <td style={cell}>
                      <div><strong>{member.name}</strong> · <span style={{ color: "#64748b" }}>{member.employeeNo}</span></div>
                      <div style={{ color: "#64748b", fontSize: "11px" }}>{member.position} · {departmentLabel(member.dept)}</div>
                      {member.substitutedBy && (
                        <div style={{ color: "#64748b", fontSize: "11px" }}>{uiText("Diwakilkan oleh ")}<strong>{member.substitutedBy.name}</strong> ({member.substitutedBy.employeeNo})</div>
                      )}
                    </td>
                    <td style={cell}>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "10px",
                          whiteSpace: "nowrap",
                          background: !isSubmitted ? "#f1f5f9" : hasNg ? "#fee2e2" : "#dcfce7",
                          color: !isSubmitted ? "#64748b" : hasNg ? "#b91c1c" : "#15803d",
                          border: `1px solid ${!isSubmitted ? "#e2e8f0" : hasNg ? "#fecdd3" : "#bbf7d0"}`,
                        }}
                      >
                        {!isSubmitted ? uiText("Belum Diisi") : hasNg ? uiText("Ada Abnormal (NG)") : uiText("Semua OK")}
                      </span>
                    </td>
                    <td style={{ ...cell, whiteSpace: "nowrap" }}>
                      {sub?.submittedAt
                        ? `${new Date(sub.submittedAt).toLocaleTimeString(uiLocale, { hour: "2-digit", minute: "2-digit" })} WIB`
                        : "-"}
                    </td>
                    <td style={{ ...cell, whiteSpace: "nowrap", fontWeight: 600, color: isApproved ? "#047857" : isSubmitted ? "#b45309" : "#94a3b8" }}>
                      {isApproved ? uiText("✓ Disetujui") : isSubmitted ? uiText("Menunggu SPV") : uiText("Belum Ada Data")}
                    </td>
                    <td style={{ ...cell, maxWidth: "280px", color: sub?.abnormalNotes ? "#9f1239" : "#94a3b8", lineHeight: 1.35 }}>
                      {sub?.abnormalNotes || "-"}
                    </td>
                    <td style={{ ...cell, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => onSelectReview(member)}
                        disabled={!isSubmitted}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "6px",
                          border: "1px solid",
                          borderColor: isSubmitted ? "#0f766e" : "#e2e8f0",
                          background: isSubmitted ? "#f0fdfa" : "#f8fafc",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          color: isSubmitted ? "#0f766e" : "#94a3b8",
                          cursor: isSubmitted ? "pointer" : "not-allowed",
                        }}
                      >
                        {isSubmitted ? uiText("Tinjau Detail →") : uiText("Belum Ada Pengisian")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SupervisorHistoryTab;
