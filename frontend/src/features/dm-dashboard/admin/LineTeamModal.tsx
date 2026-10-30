"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
}: LineTeamModalProps) {
  const [members, setMembers] = useState<DmMember[]>([]);
  const [employees, setEmployees] = useState<DmEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pickEmployeeId, setPickEmployeeId] = useState("");
  const [pickSlotOrder, setPickSlotOrder] = useState("1");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
      const taken = new Set(sorted.map((m) => m.sortOrder));
      const firstFree = [1, 2, 3, 4].find((n) => !taken.has(n));
      setPickSlotOrder(firstFree !== undefined ? String(firstFree) : "1");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat data tim line.");
    } finally {
      setLoading(false);
    }
  }, [call, line]);

  useEffect(() => {
    if (open && line) {
      loadData();
      setBanner(null);
      setPickEmployeeId("");
      setSearchTerm("");
      setIsDropdownOpen(false);
    }
  }, [open, line, loadData]);

  // Determine which slots 1..4 are currently unoccupied
  const takenSlots = useMemo(() => new Set(members.map((m) => m.sortOrder)), [members]);
  const freeSlots = useMemo(() => [1, 2, 3, 4].filter((n) => !takenSlots.has(n)), [takenSlots]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      const t = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(t);
    }
  }, [isDropdownOpen]);

  // Click outside listener for custom dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Escape key listener for custom dropdown
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDropdownOpen]);

  // Available free employees (active employees not yet in this line)
  const availableEmployees = useMemo(() => {
    const currentMemberIds = new Set(members.map((m) => m.employeeId));
    return employees.filter(
      (e) => e.isActive && !currentMemberIds.has(e.employeeId)
    );
  }, [employees, members]);

  // Filtered employees by search query (name, NIK, dept, position, or existing lines)
  const filteredEmployees = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return availableEmployees;
    return availableEmployees.filter((emp) => {
      const lines = emp.lineLabels ?? (emp.lineLabel ? [emp.lineLabel] : []);
      return [
        emp.name,
        emp.employeeId,
        emp.dept ?? "",
        emp.position ?? "",
        emp.role,
        ...lines,
      ].some((v) => v.toLowerCase().includes(q));
    });
  }, [availableEmployees, searchTerm]);

  const chosenEmployee = useMemo(
    () => employees.find((e) => e.id === Number(pickEmployeeId)) ?? null,
    [employees, pickEmployeeId]
  );

  // Handle release member
  const handleRelease = async (member: DmMember) => {
    if (!line || member.id === undefined) return;
    if (!window.confirm(`Lepas ${member.name ?? "anggota ini"} dari Line ${line.code}?`)) {
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
    if (!line || !chosenEmployee || members.length >= 4) return;

    setSavingAction(true);
    try {
      await call(() =>
        adminApi.addMember(line.id, {
          employeePk: chosenEmployee.id,
          sortOrder: Number(pickSlotOrder) || 1,
        })
      );
      setBanner({
        type: "success",
        message: `${chosenEmployee.name} berhasil ditambahkan ke Slot #${pickSlotOrder}!`,
      });
      setPickEmployeeId("");
      setSearchTerm("");
      setIsDropdownOpen(false);
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
                <span>Manajemen DM Triangle Team</span>
                <span className="ltm-badge-line">{line.code}</span>
                <span className="ltm-badge-workshop">{line.workshopName}</span>
              </h2>
            </div>
            <p className="ltm-subtitle">
              TIM <strong>{line.name}</strong>
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
              {/* <span className="ltm-rule-icon">👥</span> */}
              <div>
                <strong>Standar Tim DM</strong>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Terdiri dari 1 Leader(PROD) + 3 Personil Departemen (ME, PE, QC). <strong>Slot #1 wajib Leader</strong>
                </div>
              </div>
            </div>

            <span className={`ltm-team-counter ${isComplete ? "is-complete" : "is-incomplete"}`}>
              {isComplete ? "Personil: 4 / 4" : `Perhatian: ${members.length} / 4`}
            </span>
          </div>

                        {/* Add / Assign Personnel Section or Complete Notice */}
              {isComplete ? (
                <div className="ltm-complete-notice">
                  <div className="ltm-complete-notice-icon">✓</div>
                  <div className="ltm-complete-notice-body">
                    <strong className="ltm-complete-notice-title">
                      DM Triangle Team Line {line.code} Sudah Lengkap
                    </strong>
                    <p className="ltm-complete-notice-text">
                      Team telah terpenuhi sehingga penambahan personil ditutup. Jika ingin mengganti anggota, klik tombol <strong>Keluarkan</strong> pada salah satu personil terlebih dahulu.
                    </p>
                  </div>
                </div>
              ) : (
                <section className="ltm-add-section">
                  <div className="ltm-add-header">
                    <h3 className="ltm-add-title">
                      <span>Tambah team ke Line {line.code}</span>
                    </h3>
                    <span className="ltm-add-desc">
                      Pilih karyawan dari daftar. Karyawan yang sudah terdaftar di line lain tetap dapat dipasang secara bebas (multi-line).
                    </span>
                  </div>

                  <form className="ltm-add-form" onSubmit={handleAddMember}>
                    {/* Field 1: Custom Searchable Employee Picker */}
                    <div className="ltm-field" style={{ flex: "2 1 360px", position: "relative" }} ref={dropdownRef}>
                      <label className="ltm-label" htmlFor="employee-select-trigger">
                        Pilih Karyawan <span style={{ color: "#dc2626" }}>*</span>
                      </label>

                      {/* Trigger Button */}
                      <div
                        id="employee-select-trigger"
                        tabIndex={0}
                        role="combobox"
                        aria-expanded={isDropdownOpen}
                        aria-haspopup="listbox"
                        className={`ltm-select-trigger ${isDropdownOpen ? "is-focused" : ""} ${chosenEmployee ? "has-value" : ""}`}
                        onClick={() => {
                          if (!savingAction) {
                            setIsDropdownOpen((prev) => !prev);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
                            e.preventDefault();
                            setIsDropdownOpen(true);
                          }
                        }}
                      >
                        {chosenEmployee ? (
                          <div className="ltm-trigger-selected">
                            <span className="ltm-trigger-avatar">
                              {chosenEmployee.photoUrl ? (
                                <img src={chosenEmployee.photoUrl} alt="" className="ltm-avatar-img" />
                              ) : (
                                getInitials(chosenEmployee.name)
                              )}
                            </span>
                            <div className="ltm-trigger-info">
                              <div className="ltm-trigger-name-row">
                                <span className="ltm-trigger-name">
                                  {chosenEmployee.name}
                                </span>
                                {chosenEmployee.role === "leader" && (
                                  <span className="ltm-item-role-badge">Leader</span>
                                )}
                                {chosenEmployee.dept && (
                                  <span className={`ltm-item-dept dept-${chosenEmployee.dept.toUpperCase()}`}>
                                    {chosenEmployee.dept}
                                  </span>
                                )}
                              </div>
                              <div className="ltm-trigger-meta-row">
                                <span>NIK: <strong>{chosenEmployee.employeeId}</strong></span>
                                {chosenEmployee.position && <span> · {chosenEmployee.position}</span>}
                              </div>
                              {(() => {
                                const lines = chosenEmployee.lineLabels && chosenEmployee.lineLabels.length > 0
                                  ? chosenEmployee.lineLabels
                                  : (chosenEmployee.lineLabel ? [chosenEmployee.lineLabel] : []);
                                return (
                                  <div className={`ltm-item-lines-text ${lines.length === 0 ? "is-free" : ""}`}>
                                    <span className="ltm-item-lines-icon">{lines.length > 0 ? "🔗" : "✓"}</span>
                                    <span>
                                      {lines.length > 0 ? (
                                        <>Aktif di line: <strong>{lines.join(", ")}</strong></>
                                      ) : (
                                        "Belum ada line"
                                      )}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="ltm-trigger-placeholder">
                            {/* <span className="ltm-trigger-icon">🔍</span> */}
                            <span>
                              {availableEmployees.length === 0
                                ? "Semua karyawan sudah terpasang di line ini"
                                : "-- Cari & Pilih Karyawan --"}
                            </span>
                          </div>
                        )}

                        <div className="ltm-trigger-actions">
                          {chosenEmployee && (
                            <button
                              type="button"
                              className="ltm-trigger-clear"
                              title="Batalkan pilihan"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPickEmployeeId("");
                              }}
                            >
                              ✕
                            </button>
                          )}
                          <span className={`ltm-trigger-chevron ${isDropdownOpen ? "is-open" : ""}`}>▼</span>
                        </div>
                      </div>

                      {/* Popover Dropdown */}
                      {isDropdownOpen && (
                        <div className="ltm-dropdown-popover" role="listbox">
                          {/* Search Box Header */}
                          <div className="ltm-dropdown-header">
                            <div className="ltm-search-wrap">
                              {/* <span className="ltm-search-icon">🔍</span> */}
                              <input
                                ref={searchInputRef}
                                type="text"
                                className="ltm-search-input"
                                placeholder="Cari nama, NIK, dept, posisi, atau line..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              {searchTerm && (
                                <button
                                  type="button"
                                  className="ltm-search-clear"
                                  onClick={() => setSearchTerm("")}
                                  title="Hapus pencarian"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <div className="ltm-search-count">
                              <span>{filteredEmployees.length} karyawan tersedia</span>
                            </div>
                          </div>

                          {/* List of Candidates */}
                          <div className="ltm-dropdown-list">
                            {filteredEmployees.length === 0 ? (
                              <div className="ltm-dropdown-empty">
                                {availableEmployees.length === 0
                                  ? "Semua karyawan aktif sudah menjadi personil di line ini."
                                  : "Tidak ada karyawan yang cocok dengan pencarian."}
                              </div>
                            ) : (
                              filteredEmployees.map((emp) => {
                                const isSelected = String(emp.id) === pickEmployeeId;
                                const lines = emp.lineLabels && emp.lineLabels.length > 0
                                  ? emp.lineLabels
                                  : (emp.lineLabel ? [emp.lineLabel] : []);
                                const isLeader = emp.role === "leader";

                                return (
                                  <div
                                    key={emp.id}
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`ltm-dropdown-item ${isSelected ? "is-selected" : ""}`}
                                    onClick={() => {
                                      setPickEmployeeId(String(emp.id));
                                      setIsDropdownOpen(false);
                                      setSearchTerm("");
                                    }}
                                  >
                                    <span className="ltm-item-avatar">
                                      {emp.photoUrl ? (
                                        <img src={emp.photoUrl} alt="" className="ltm-avatar-img" />
                                      ) : (
                                        getInitials(emp.name)
                                      )}
                                    </span>

                                    <div className="ltm-item-content">
                                      <div className="ltm-item-name-row">
                                        <strong className="ltm-item-name">{emp.name}</strong>
                                        {isLeader && (
                                          <span className="ltm-item-role-badge">Leader</span>
                                        )}
                                        {emp.dept && (
                                          <span className={`ltm-item-dept dept-${emp.dept.toUpperCase()}`}>
                                            {emp.dept}
                                          </span>
                                        )}
                                      </div>

                                      <div className="ltm-item-sub">
                                        <span>NIK: <strong>{emp.employeeId}</strong></span>
                                        {emp.position && <span> · {emp.position}</span>}
                                      </div>

                                      <div className={`ltm-item-lines-text ${lines.length === 0 ? "is-free" : ""}`}>
                                        <span className="ltm-item-lines-icon">{lines.length > 0 ? "🔗" : "✓"}</span>
                                        <span>
                                          {lines.length > 0 ? (
                                            <>Aktif di line: <strong>{lines.join(", ")}</strong></>
                                          ) : (
                                            "Belum ada line"
                                          )}
                                        </span>
                                      </div>
                                    </div>

                                    {isSelected && <span className="ltm-item-check">✓</span>}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Field 2: Target Slot */}
                    <div className="ltm-field" style={{ flex: "1 1 180px" }}>
                      <label htmlFor="pick-slot-order" className="ltm-label">
                        Posisi Slot <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <select
                        id="pick-slot-order"
                        className="ltm-select"
                        value={pickSlotOrder}
                        onChange={(e) => setPickSlotOrder(e.target.value)}
                        disabled={savingAction}
                      >
                        <option value="1">Slot #1 (Leader Tim)</option>
                        <option value="2">Slot #2 (Anggota)</option>
                        <option value="3">Slot #3 (Anggota)</option>
                        <option value="4">Slot #4 (Anggota)</option>
                      </select>
                    </div>

                    {/* Submit button */}
                    <div className="ltm-add-actions">
                      <button
                        type="submit"
                        className="ltm-btn-add"
                        disabled={savingAction || !chosenEmployee}
                      >
                        {savingAction ? "Menyimpan..." : "Tambahkan ke Tim"}
                      </button>
                    </div>
                  </form>
                </section>
              )}

          {/* Loading / Error States */}
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              Memuat data personil line {line.code}...
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
                            {isLeader ? "#1 LEADER" : `#${member.sortOrder ?? idx + 1}`}
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
                          title="Keluarkan anggota dari line ini"
                        >
                          Keluarkan
                        </button>
                      </div>
                    </div>
                  );
                })}

                
{freeSlots.map((slotNum) => (
  <button
    key={`empty-${slotNum}`}
    type="button"
    className="ltm-slot-card is-empty"
    onClick={() => {
      setPickSlotOrder(String(slotNum));
      setIsDropdownOpen(true);
    }}
    disabled={savingAction}
    title={`Pilih untuk mengisi Slot #${slotNum}`}
  >
    <span className="ltm-slot-plus" aria-hidden="true">+</span>
    <span className="ltm-slot-empty-title">
      Slot #{slotNum}{slotNum === 1 ? " (Leader)" : ""} Masih Kosong
    </span>
    <span className="ltm-slot-empty-hint">
      Klik untuk menambahkan personil
    </span>
  </button>
))}

                
              </div>

              


            </>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="ltm-footer">
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {isComplete ? "Team sudah mencapai kuota lengkap 4 personil." : `Masih ada ${4 - members.length} slot kosong.`}
          </div>
          <button type="button" className="ltm-btn-done" onClick={onClose}>
            Selesai
          </button>
        </footer>
      </div>
    </div>
  );
}
