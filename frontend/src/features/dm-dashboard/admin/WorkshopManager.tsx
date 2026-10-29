"use client";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { adminApi, workshopMeetingApi } from "../api";
import type { DmEmployee, DmWorkshop } from "../api";
import { FactoryIcon, PlusIcon } from "./AdminIcons";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import WorkshopHodSection from "./WorkshopHodSection";

interface WorkshopManagerProps {
  workshops: DmWorkshop[];
  onAddDm: (workshop: DmWorkshop) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: number, name: string) => Promise<void>;
  onDelete: (workshop: DmWorkshop) => Promise<void>;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

export default function WorkshopManager({
  workshops,
  onCreate,
  onRename,
  onDelete,
  onAddDm,
}: WorkshopManagerProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogTab, setDialogTab] = useState<"hod" | "supervisor">("hod");
  const [error, setError] = useState<string | null>(null);
  const [supervisors, setSupervisors] = useState<DmEmployee[]>([]);
  const [assigned, setAssigned] = useState<Record<number, number[]>>({});
  const [addingSupervisorFor, setAddingSupervisorFor] = useState<number | null>(
    null
  );
  const [supervisorWorkshopId, setSupervisorWorkshopId] = useState<
    number | null
  >(null);
  const supervisorDialogRef = useRef<HTMLDialogElement>(null);
  const [supervisorsLoading, setSupervisorsLoading] = useState(true);
  const [supervisorsError, setSupervisorsError] = useState<string | null>(null);
  const [supervisorsRetry, setSupervisorsRetry] = useState(0);
  const [responsibilities, setResponsibilities] = useState<
    Record<number, Record<string, string | null>>
  >({});
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");
  const [editingSupervisorId, setEditingSupervisorId] = useState<number | null>(
    null
  );
  const [responsibility, setResponsibility] = useState("");

  const selectedSupervisor = supervisors.find(
    (person) => person.id === Number(selectedSupervisorId)
  );

  useEffect(() => {
    if (supervisorWorkshopId === null) return;
    const dialog = supervisorDialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, [supervisorWorkshopId]);

  useEffect(() => {
    let alive = true;
    setSupervisorsLoading(true);
    setSupervisorsError(null);
    Promise.all([adminApi.employees(), workshopMeetingApi.assignments()])
      .then(([employees, assignments]) => {
        if (!alive) return;
        setSupervisors(
          employees.filter(
            (item) => item.role === "supervisor" && item.isActive
          )
        );
        setAssigned(
          Object.fromEntries(
            assignments.map((item) => [item.workshopId, item.employeeIds])
          )
        );
        setResponsibilities(
          Object.fromEntries(
            assignments.map((item) => [item.workshopId, item.responsibilities])
          )
        );
      })
      .catch((err) => {
        if (alive) setSupervisorsError(messageOf(err));
      })
      .finally(() => {
        if (alive) setSupervisorsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [workshops.length, supervisorsRetry]);

  function closeSupervisorForm() {
    setAddingSupervisorFor(null);
    setSelectedSupervisorId("");
    setEditingSupervisorId(null);
    setResponsibility("");
    setError(null);
  }

  function openSupervisorForm(workshopId: number, employeeId?: number) {
    setAddingSupervisorFor(workshopId);
    setEditingSupervisorId(employeeId ?? null);
    setSelectedSupervisorId(employeeId === undefined ? "" : String(employeeId));
    setResponsibility(
      employeeId === undefined
        ? ""
        : responsibilities[workshopId]?.[String(employeeId)] ?? ""
    );
    setError(null);
  }

  function changeSupervisors(workshopId: number, next: number[]) {
    if (busy) return;

    void run(async () => {
      const saved = await workshopMeetingApi.saveAssignment(workshopId, next);

      setAssigned((prev) => ({
        ...prev,
        [workshopId]: saved.employeeIds,
      }));
      setResponsibilities((prev) => ({
        ...prev,
        [workshopId]: saved.responsibilities,
      }));
    });
  }

  function submitSupervisor(event: FormEvent, workshopId: number) {
    event.preventDefault();
    if (busy) return;

    const employeeId = Number(selectedSupervisorId);
    const person = supervisors.find((item) => item.id === employeeId);
    const task = responsibility.trim();
    const currentIds = assigned[workshopId] ?? [];

    if (!person || person.role !== "supervisor" || !person.isActive) {
      setError("Pilih akun supervisor aktif.");
      return;
    }

    if (!task) {
      setError("Tugas / tanggung jawab wajib diisi.");
      return;
    }

    if (editingSupervisorId === null && currentIds.includes(employeeId)) {
      setError("Supervisor ini sudah ditambahkan.");
      return;
    }

    const nextIds =
      editingSupervisorId === null ? [...currentIds, employeeId] : currentIds;

    void run(async () => {
      const saved = await workshopMeetingApi.saveAssignment(
        workshopId,
        nextIds,
        { [String(employeeId)]: task }
      );

      setAssigned((prev) => ({
        ...prev,
        [workshopId]: saved.employeeIds,
      }));
      setResponsibilities((prev) => ({
        ...prev,
        [workshopId]: saved.responsibilities,
      }));

      closeSupervisorForm();
    });
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  function openAdd() {
    setAdding(true);
    setEditingId(null);
    setError(null);
  }

  function closeAdd() {
    setAdding(false);
    setNewName("");
    setError(null);
  }

  function submitNew(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) {
      setError("Nama workshop wajib diisi.");
      return;
    }
    run(async () => {
      await onCreate(name);
      setAdding(false);
      setNewName("");
    });
  }

  function submitRename(event: FormEvent, id: number) {
    event.preventDefault();
    const name = editName.trim();
    if (!name) {
      setError("Nama workshop wajib diisi.");
      return;
    }
    run(async () => {
      await onRename(id, name);
      setEditingId(null);
    });
  }

  return (
    <section className="dm-panel dm-ws" aria-labelledby="ws-manager-title">
      <div className="dm-panel-head">
        <div>
          <div className="dm-panel-titlebar">
            <h3 id="ws-manager-title" className="dm-panel-title">
              Workshop
            </h3>
            {/* <span className="dm-pill">{workshops.length} Terdaftar</span> */}
          </div>
          <p className="dm-panel-sub">
            Buat workshop, tambahkan DM, lalu buat lini dan atur timnya.
          </p>
        </div>
        {!adding ? (
          <button
            type="button"
            className="dm-admin-btn is-primary dm-btn-add"
            onClick={openAdd}
          >
            <PlusIcon size={14} />
            Tambah Workshop
          </button>
        ) : null}
      </div>

      <ul className="dm-ws-grid">
        {workshops.map((workshop) => (
          <li key={workshop.id} className="dm-ws-card">
            {editingId === workshop.id ? (
              <form
                className="dm-ws-edit"
                onSubmit={(event) => submitRename(event, workshop.id)}
              >
                <label
                  className="dm-ws-edit-label"
                  htmlFor={`ws-edit-${workshop.id}`}
                >
                  Nama workshop
                </label>

                <input
                  id={`ws-edit-${workshop.id}`}
                  className="dm-admin-input dm-ws-input"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  autoFocus
                />

                <div className="dm-ws-actions">
                  <button
                    type="button"
                    className="dm-admin-btn is-primary"
                    onClick={() => onAddDm(workshop)}
                  >
                    <PlusIcon size={14} /> Tambah DM
                  </button>

                  <button
                    type="submit"
                    className="dm-admin-btn is-primary"
                    disabled={busy}
                  >
                    Simpan
                  </button>

                  <button
                    type="button"
                    className="dm-admin-btn is-tonal"
                    onClick={() => setEditingId(null)}
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="dm-ws-card-top">
                  <span className="dm-icon-tile">
                    <FactoryIcon size={18} />
                  </span>

                  <div className="dm-ws-card-text">
                    <span className="dm-ws-name">{workshop.name}</span>

                    {workshop.lineCount > 0 ? (
                      <span className="dm-pill is-ok">
                        <span className="dm-pill-dot" aria-hidden="true" />
                        {workshop.lineCount} Line
                      </span>
                    ) : (
                      <span className="dm-pill">Belum ada line</span>
                    )}
                  </div>

                  <details className="dm-ws-menu">
                    <summary
                      className="dm-ws-menu-trigger"
                      aria-label={`Aksi untuk ${workshop.name}`}
                      title="Aksi workshop"
                    >
                      <MoreHorizontal size={20} />
                    </summary>

                    <div className="dm-ws-menu-popover">
                      <button
                        type="button"
                        className="dm-ws-menu-item"
                        onClick={(event) => {
                          setEditingId(workshop.id);
                          setEditName(workshop.name);
                          setAdding(false);
                          setError(null);
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                        }}
                      >
                        <Pencil size={15} />
                        Ubah Nama
                      </button>

                      <button
                        type="button"
                        className="dm-ws-menu-item is-danger"
                        disabled={busy || workshop.lineCount > 0}
                        title={
                          workshop.lineCount > 0
                            ? "Masih punya line. Hapus atau pindahkan linenya dulu."
                            : undefined
                        }
                        onClick={() => run(() => onDelete(workshop))}
                      >
                        <Trash2 size={15} />
                        Hapus
                      </button>
                    </div>
                  </details>
                </div>

                <button
                  type="button"
                  className="dm-admin-btn is-tonal dm-ws-sup-add"
                  aria-haspopup="dialog"
                  onClick={() => {
                    closeSupervisorForm();
                    setDialogTab("hod");
                    setSupervisorWorkshopId(workshop.id);
                  }}
                >
                  Kelola Supervisor
                  {!supervisorsLoading &&
                    !supervisorsError &&
                    ` (${(assigned[workshop.id] ?? []).length})`}
                </button>

                {supervisorWorkshopId === workshop.id && (
                  <dialog
                    ref={supervisorDialogRef}
                    className="dm-ws-sup-dialog"
                    aria-labelledby={`ws-supervisors-title-${workshop.id}`}
                    onCancel={(event) => {
                      event.preventDefault();
                      if (!busy) setSupervisorWorkshopId(null);
                    }}
                    onClick={(event) => {
                      if (event.target !== event.currentTarget || busy) return;

                      const bounds =
                        event.currentTarget.getBoundingClientRect();

                      if (
                        event.clientX < bounds.left ||
                        event.clientX > bounds.right ||
                        event.clientY < bounds.top ||
                        event.clientY > bounds.bottom
                      ) {
                        setSupervisorWorkshopId(null);
                      }
                    }}
                  >
                    <div className="dm-ws-sup-dialog-head">
                      <div>
                        <h3 id={`ws-supervisors-title-${workshop.id}`}>
                          Kelola Workshop
                        </h3>
                        <p>{workshop.name}</p>
                      </div>

                      <button
                        type="button"
                        className="dm-admin-btn is-tonal"
                        disabled={busy}
                        onClick={() => setSupervisorWorkshopId(null)}
                      >
                        Tutup
                      </button>
                    </div>

                    <div
                      className="dm-subtabs dm-ws-dialog-tabs"
                      role="tablist"
                      aria-label="Pengaturan workshop"
                    >
                      <button
                        type="button"
                        role="tab"
                        id={`ws-tab-hod-${workshop.id}`}
                        aria-selected={dialogTab === "hod"}
                        aria-controls={`ws-panel-hod-${workshop.id}`}
                        className={`dm-subtab${
                          dialogTab === "hod" ? " is-active" : ""
                        }`}
                        onClick={() => setDialogTab("hod")}
                      >
                        HOD
                      </button>
                      <button
                        type="button"
                        role="tab"
                        id={`ws-tab-supervisor-${workshop.id}`}
                        aria-selected={dialogTab === "supervisor"}
                        aria-controls={`ws-panel-supervisor-${workshop.id}`}
                        className={`dm-subtab${
                          dialogTab === "supervisor" ? " is-active" : ""
                        }`}
                        onClick={() => setDialogTab("supervisor")}
                      >
                        Supervisor
                        {!supervisorsLoading &&
                          !supervisorsError &&
                          ` (${(assigned[workshop.id] ?? []).length})`}
                      </button>
                    </div>

                    <div
                      role="tabpanel"
                      id={`ws-panel-hod-${workshop.id}`}
                      aria-labelledby={`ws-tab-hod-${workshop.id}`}
                      hidden={dialogTab !== "hod"}
                    >
                      <WorkshopHodSection workshop={workshop} disabled={busy} />
                    </div>

                    <div
                      role="tabpanel"
                      id={`ws-panel-supervisor-${workshop.id}`}
                      aria-labelledby={`ws-tab-supervisor-${workshop.id}`}
                      hidden={dialogTab !== "supervisor"}
                    >
                    <div className="dm-ws-supervisors">
                      {supervisorsLoading ? (
                        <span role="status">Memuat supervisor...</span>
                      ) : supervisorsError ? (
                        <div role="alert">
                          <p>{supervisorsError}</p>
                          <button
                            type="button"
                            className="dm-admin-btn is-tonal"
                            onClick={() =>
                              setSupervisorsRetry((value) => value + 1)
                            }
                          >
                            Coba lagi
                          </button>
                        </div>
                      ) : (
                        <>
                          {(assigned[workshop.id] ?? []).length === 0 && (
                            <span>Belum ada supervisor ditambahkan.</span>
                          )}

                          <ul className="dm-ws-sup-list">
                            {(assigned[workshop.id] ?? []).map((id) => {
                              const person = supervisors.find(
                                (item) => item.id === id
                              );
                              const task =
                                responsibilities[workshop.id]?.[String(id)];

                              return (
                                <li key={id} className="dm-ws-sup-row">
                                  <div className="dm-ws-sup-person">
                                    <span>
                                      {person
                                        ? person.name
                                        : `Supervisor #${id}`}
                                    </span>
                                    <small>
                                      {person?.employeeId ?? "-"} ·{" "}
                                      {person?.position?.trim() ||
                                        "Posisi belum diisi"}
                                    </small>
                                    <p className="dm-ws-sup-task">
                                      {task || "Tugas belum diisi."}
                                    </p>
                                  </div>

                                  <div className="dm-ws-sup-actions">
                                    <button
                                      type="button"
                                      className="dm-admin-btn is-tonal"
                                      aria-label={`Edit tugas ${
                                        person?.name ?? id
                                      }`}
                                      disabled={
                                        busy ||
                                        !person ||
                                        addingSupervisorFor === workshop.id
                                      }
                                      onClick={() =>
                                        openSupervisorForm(workshop.id, id)
                                      }
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="dm-admin-btn is-danger-soft"
                                      aria-label={`Lepas ${
                                        person?.name ?? id
                                      } dari ${workshop.name}`}
                                      disabled={
                                        busy ||
                                        addingSupervisorFor === workshop.id
                                      }
                                      onClick={() =>
                                        changeSupervisors(
                                          workshop.id,
                                          (assigned[workshop.id] ?? []).filter(
                                            (x) => x !== id
                                          )
                                        )
                                      }
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>

                          {addingSupervisorFor === workshop.id ? (
                            <form
                              className="dm-ws-sup-form"
                              onSubmit={(event) =>
                                submitSupervisor(event, workshop.id)
                              }
                            >
                              <label
                                className="dm-ws-edit-label"
                                htmlFor={`ws-supervisor-${workshop.id}`}
                              >
                                Supervisor
                              </label>
                              <select
                                id={`ws-supervisor-${workshop.id}`}
                                autoFocus={editingSupervisorId === null}
                                className="dm-admin-input"
                                value={selectedSupervisorId}
                                disabled={busy || editingSupervisorId !== null}
                                required
                                onChange={(event) => {
                                  setSelectedSupervisorId(event.target.value);
                                  setError(null);
                                }}
                              >
                                <option value="">Pilih supervisor</option>

                                {supervisors
                                  .filter(
                                    (item) =>
                                      item.id === editingSupervisorId ||
                                      !(assigned[workshop.id] ?? []).includes(
                                        item.id
                                      )
                                  )
                                  .map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name} ({item.employeeId})
                                    </option>
                                  ))}
                              </select>

                              <label
                                className="dm-ws-edit-label"
                                htmlFor={`ws-position-${workshop.id}`}
                              >
                                Posisi dari data karyawan
                              </label>
                              <input
                                id={`ws-position-${workshop.id}`}
                                className="dm-admin-input"
                                value={
                                  selectedSupervisor
                                    ? selectedSupervisor.position?.trim() ||
                                      "Posisi belum diisi"
                                    : ""
                                }
                                placeholder="Pilih supervisor terlebih dahulu"
                                readOnly
                              />

                              <label
                                className="dm-ws-edit-label"
                                htmlFor={`ws-responsibility-${workshop.id}`}
                              >
                                Tugas / tanggung jawab
                              </label>
                              <textarea
                                id={`ws-responsibility-${workshop.id}`}
                                className="dm-admin-input dm-ws-sup-textarea"
                                value={responsibility}
                                onChange={(event) =>
                                  setResponsibility(event.target.value)
                                }
                                placeholder="Tuliskan tanggung jawab supervisor di workshop ini"
                                rows={4}
                                required
                                disabled={busy}
                                autoFocus={editingSupervisorId !== null}
                              />

                              <div className="dm-ws-sup-actions">
                                <button
                                  type="submit"
                                  className="dm-admin-btn is-primary"
                                  disabled={
                                    busy ||
                                    !selectedSupervisorId ||
                                    !responsibility.trim()
                                  }
                                >
                                  {busy ? "Menyimpan..." : "Simpan"}
                                </button>
                                <button
                                  type="button"
                                  className="dm-admin-btn is-tonal"
                                  disabled={busy}
                                  onClick={closeSupervisorForm}
                                >
                                  Batal
                                </button>
                              </div>
                            </form>
                          ) : (
                            <button
                              type="button"
                              className="dm-admin-btn is-tonal dm-ws-sup-add"
                              disabled={
                                busy ||
                                !supervisors.some(
                                  (person) =>
                                    !(assigned[workshop.id] ?? []).includes(
                                      person.id
                                    )
                                )
                              }
                              onClick={() => openSupervisorForm(workshop.id)}
                            >
                              <PlusIcon size={14} /> Tambah supervisor
                            </button>
                          )}

                          {supervisors.length === 0 && (
                            <span>Belum ada akun supervisor aktif.</span>
                          )}
                        </>
                      )}
                    </div>

                    {error && (
                      <p className="dm-admin-inline-error" role="alert">
                        {error}
                      </p>
                    )}

                    <p className="dm-ws-sup-note" role="status">
                      {busy
                        ? "Menyimpan perubahan..."
                        : "Klik Simpan untuk menyimpan tugas. Hapus langsung melepas supervisor dari workshop."}
                    </p>
                    </div>
                  </dialog>
                )}
              </>
            )}
          </li>
        ))}

        <li className="dm-ws-slot">
          {adding ? (
            <form className="dm-ws-tile is-form" onSubmit={submitNew}>
              <label className="dm-ws-edit-label" htmlFor="ws-new-name">
                Nama workshop baru
              </label>
              <input
                id="ws-new-name"
                className="dm-admin-input dm-ws-input"
                placeholder="Contoh: Workshop 7"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                autoFocus
              />
              <div className="dm-ws-actions">
                <button
                  type="submit"
                  className="dm-admin-btn is-primary"
                  disabled={busy}
                >
                  Simpan
                </button>
                <button
                  type="button"
                  className="dm-admin-btn is-tonal"
                  onClick={closeAdd}
                >
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="dm-ws-tile" onClick={openAdd}>
              <span className="dm-ws-tile-plus">
                <PlusIcon size={16} />
              </span>
              <span className="dm-ws-tile-title">Tambah Workshop</span>
              <span className="dm-ws-tile-caption">
                {workshops.length === 0
                  ? "Belum ada workshop. Buat yang pertama di sini."
                  : "Buat workshop baru untuk line produksi"}
              </span>
            </button>
          )}
        </li>
      </ul>
      {error && supervisorWorkshopId === null ? (
        <p className="dm-admin-inline-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
