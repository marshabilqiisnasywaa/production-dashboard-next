"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../api";
import type { DmEmployee, DmLine } from "../api";
import type { DmMember } from "../dmData";
import "./LineTeamModal.css";

interface LineTeamModalProps {
  open: boolean;
  line: DmLine | null;
  call: <T>(fn: () => Promise<T>) => Promise<T>;
  onChanged: () => Promise<void>;
  onClose: () => void;
  onGoToMpv?: () => void;
}

function getInitials(name: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default function LineTeamModal({
  open,
  line,
  call,
  onChanged,
  onClose,
  onGoToMpv,
}: LineTeamModalProps) {
  const [members, setMembers] = useState<DmMember[]>([]);
  const [employees, setEmployees] = useState<DmEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pickEmployeeId, setPickEmployeeId] = useState("");
  const [pickSlotOrder, setPickSlotOrder] = useState("1");
  const [savingAction, setSavingAction] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Load team members of this line and all employees from backend
  const loadData = useCallback(async () => {
    if (!line) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [nextMembers, nextEmployees] = await call(() =>
        Promise.all([
          adminApi.members(line.id),
          adminApi.employees(),
        ])
      );
      // Sort members by sortOrder ascending (1 is Leader)
      const sorted = [...nextMembers].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
      setMembers(sorted);
      setEmployees(nextEmployees);

      // Default next slot order
      const nextSlot = sorted.length < 4 ? String(sorted.length + 1) : "1";
      setPickSlotOrder(nextSlot);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat data tim lini.");
    } finally {
      setLoading(false);
    }
  }, [call, line]);

  useEffect(() => {
    if (open && line) {
      loadData();
      setBanner(null);
    }
  }, [open, line, loadData]);

  // Available free employees (or active employees not in this line)
  const availableEmployees = useMemo(() => {
    const currentMemberIds = new Set(members.map((m) => m.employeeId));
    return employees.filter(
      (e) => e.isActive && !currentMemberIds.has(e.employeeId)
    );
  }, [employees, members]);

  // Handle release member
  const handleRelease = async (member: DmMember) => {
    if (!line || member.id === undefined) return;
    if (!window.confirm(`Lepas ${member.name ?? "anggota ini"} dari Lini ${line.code}?`)) {
      return;
    }
    setSavingAction(true);
    try {
      await call(() => adminApi.releaseMember(member.id!));
      setBanner({ type: "success", message: `${member.name} berhasil dilepas dari tim.` });
      await Promise.all([loadData(), onChanged()]);
    } catch (err) {
      setBanner({ type: "error", message: err instanceof Error ? err.message : "Gagal melepas anggota." });
    } finally {
      setSavingAction(false);
    }
  };

  // Handle re-order member (change slot sortOrder)
  const handleOrderChange = async (member: DmMember, newOrder: number) => {
    if (member.id === undefined) return;
    setSavingAction(true);
    try {
      await call(() => adminApi.updateMember(member.id!, { sortOrder: newOrder }));
      setBanner({ type: "success", message: `Urutan ${member.name} diubah menjadi #${newOrder}.` });
      await Promise.all([loadData(), onChanged()]);
    } catch (err) {
      setBanner({ type: "error", message: err instanceof Error ? err.message : "Gagal mengubah urutan." });
    } finally {
      setSavingAction(false);
    }
  };

  // Handle add member from form
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line || !pickEmployeeId) return;

    const chosenEmp = employees.find((emp) => emp.id === Number(pickEmployeeId));
    if (!chosenEmp) return;

    setSavingAction(true);
    try {
      await call(() =>
        adminApi.addMember(line.id, {
          employeePk: chosenEmp.id,
          sortOrder: Number(pickSlotOrder) || 1,
        })
      );
      setPickEmployeeId("");
      setBanner({
        type: "success",
        message: `${chosenEmp.name} berhasil ditambahkan ke Slot #${pickSlotOrder}!`,
      });
      await Promise.all([loadData(), onChanged()]);
    } catch (err) {
      setBanner({ type: "error", message: err instanceof Error ? err.message : "Gagal menambahkan anggota." });
    } finally {
      setSavingAction(false);
    }
  };

  if (!open || !line) return null;

  const isComplete = members.length === 4;

  return (
    <div className="ltm-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ltm-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <header className="ltm-header">
          <div className="ltm-header-left">
            <div className="ltm-header-title-row">
              <h2 className="ltm-title">
                <span>Manajemen Tim Inti Lini</span>
                <span className="ltm-badge-line">{line.code}</span>
                <span className="ltm-badge-workshop">{line.workshopName}</span>
              </h2>
            </div>
            <p className="ltm-subtitle">
              Atur 4 personil tim inti untuk lini <strong>{line.name}</strong>. Slot #1 selalu Leader.
            </p>
          </div>
          <button
            type="button"
            className="ltm-close-btn"
            onClick={onClose}
            aria-label="Tutup modal"
          >
            &times;
          </button>
        </header>

        {/* Modal Body */}
        <div className="ltm-body">
          {/* Notification Alert Banner */}
          {banner && (
            <div className={`ltm-alert is-${banner.type}`}>
              <span>{banner.message}</span>
              <button
                type="button"
                onClick={() => setBanner(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}
              >
                &times;
              </button>
            </div>
          )}

          {/* Rule and Capacity Summary Bar */}
          <div className="ltm-rule-card">
            <div className="ltm-rule-info">
              <span className="ltm-rule-icon">👥</span>
              <div>
                <strong>Standar Tim Inti: Tepat 4 Personil</strong>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Slot #1 wajib  <strong>Leader</strong> + 3 Personil Departemen (PROD, ME, PE, QC).
                </div>
              </div>
            </div>

            <span className={`ltm-team-counter ${isComplete ? "is-complete" : "is-incomplete"}`}>
              {isComplete ? "✓ Lengkap: 4 / 4 Personil" : `Perhatian: ${members.length} / 4 Personil`}
            </span>
          </div>

          {/* Loading / Error States */}
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              Memuat data personil lini {line.code}...
            </div>
          ) : loadError ? (
            <div className="ltm-alert is-error">
              <span>{loadError}</span>
              <button type="button" onClick={loadData} className="ltm-btn-add" style={{ height: "30px", fontSize: "12px" }}>
                Coba Lagi
              </button>
            </div>
          ) : (
            <>
              {/* 4 Slots Grid */}
              <div className="ltm-slots-grid">
                {members.slice(0, 4).map((member, idx) => {
                  const isLeader = member.sortOrder === 1;
                  const dept = member.dept?.toUpperCase() || "PROD";

                  return (
                    <div
                      key={member.id ?? idx}
                      className={`ltm-slot-card ${isLeader ? "is-leader" : ""}`}
                    >
                      <div>
                        <div className="ltm-slot-head">
                          <span className={`ltm-slot-badge ${isLeader ? "is-leader-badge" : "is-member-badge"}`}>
                            {isLeader ? " SLOT #1 LEADER" : `SLOT #${member.sortOrder ?? idx + 1}`}
                          </span>
                          <span className={`ltm-slot-dept dept-${dept}`}>
                            {dept}
                          </span>
                        </div>

                        <div className="ltm-member-row" style={{ marginTop: "10px" }}>
                          <div className="ltm-avatar">
                            {member.photoUrl ? (
                              <img src={member.photoUrl} alt="" className="ltm-avatar-img" />
                            ) : (
                              getInitials(member.name)
                            )}
                          </div>
                          <div className="ltm-member-details">
                            <span className="ltm-member-name" title={member.name ?? ""}>
                              {member.name}
                            </span>
                            <span className="ltm-member-meta">
                              NIK: <strong>{member.employeeId ?? "-"}</strong>
                            </span>
                            <span className="ltm-member-meta" style={{ color: "#008a4f" }}>
                              {member.position ?? "-"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="ltm-slot-actions">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                            Urutan:
                          </label>
                          <select
                            className="ltm-order-select"
                            value={member.sortOrder ?? idx + 1}
                            onChange={(e) => handleOrderChange(member, Number(e.target.value))}
                            disabled={savingAction}
                            title="Ubah nomor urutan tampil"
                          >
                            <option value="1">#1 (Leader)</option>
                            <option value="2">#2</option>
                            <option value="3">#3</option>
                            <option value="4">#4</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          className="ltm-btn-release"
                          onClick={() => handleRelease(member)}
                          disabled={savingAction}
                          title="Lepas anggota dari lini ini agar bebas dipasang ke lini lain"
                        >
                          Lepas
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Placeholders for remaining slots if team has < 4 members */}
                {Array.from({ length: Math.max(0, 4 - members.length) }).map((_, i) => {
                  const slotNum = members.length + i + 1;
                  return (
                    <div key={`empty-${slotNum}`} className="ltm-slot-card is-empty">
                      <div style={{ fontSize: "24px", color: "#cbd5e1" }}>+</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#64748b" }}>
                        Slot #{slotNum} Masih Kosong
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        Tambahkan personil dari form di bawah.
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fast Add / Assign Member Form */}
              <section className="ltm-add-section">
                <h3 className="ltm-add-title">
                  <span>➕ Tambah / Pasang Personil ke Lini {line.code}</span>
                </h3>
                <form className="ltm-add-form" onSubmit={handleAddMember}>
                  <div className="ltm-field">
                    <label htmlFor="pick-employee" className="ltm-label">
                      Pilih Karyawan
                    </label>
                    <select
                      id="pick-employee"
                      className="ltm-select"
                      value={pickEmployeeId}
                      onChange={(e) => setPickEmployeeId(e.target.value)}
                      disabled={savingAction}
                      required
                    >
                      <option value="">
                        {availableEmployees.length === 0
                          ? "Semua karyawan sudah terpasang di lini"
                          : "-- Pilih dari daftar karyawan aktif --"}
                      </option>
                      {availableEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} (NIK: {emp.employeeId} · Dept: {emp.dept ?? "-"} · {emp.lineLabel ? `di ${emp.lineLabel}` : "Bebas"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ltm-field is-narrow">
                    <label htmlFor="pick-slot" className="ltm-label">
                      Pasang di Slot
                    </label>
                    <select
                      id="pick-slot"
                      className="ltm-select"
                      value={pickSlotOrder}
                      onChange={(e) => setPickSlotOrder(e.target.value)}
                      disabled={savingAction}
                    >
                      <option value="1">Slot #1 (Leader)</option>
                      <option value="2">Slot #2</option>
                      <option value="3">Slot #3</option>
                      <option value="4">Slot #4</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="ltm-btn-add"
                    disabled={savingAction || !pickEmployeeId}
                  >
                    <span>{savingAction ? "Menyimpan..." : "Tambahkan ke Tim"}</span>
                  </button>
                </form>
              </section>

              {/* MPV Direction Card */}
              <div
                style={{
                  padding: "12px 16px",
                  background: "#fefce8",
                  border: "1px solid #fef08a",
                  borderRadius: "10px",
                  fontSize: "12.5px",
                  color: "#854d0e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <strong>🏆 Ingin Mengatur Operator MPV of The Month?</strong>
                  <div style={{ marginTop: "2px" }}>
                    Penghargaan MPV bulanan beserta riwayat pemenang diatur pada tab khusus <strong>MPV of The Month</strong>.
                  </div>
                </div>

                {onGoToMpv && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoToMpv();
                    }}
                    style={{
                      background: "#f59e0b",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Buka Tab MPV →
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="ltm-footer">
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            Perubahan langsung tersimpan otomatis ke database PostgreSQL dan tayang di DM Dashboard Lini.
          </div>
          <button type="button" className="ltm-btn-done" onClick={onClose}>
            Selesai
          </button>
        </footer>
      </div>
    </div>
  );
}
