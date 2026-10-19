"use client";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { adminApi } from "../api";
import type { DmLine, DmLineInput, DmWorkshop } from "../api";
import type { DmLineStatus, DmMember } from "../dmData";
import TeamManager from "./TeamManager";
import WizardStepper from "./WizardStepper";
import "./LineWizard.css";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

type TabKey = "general" | "culture" | "media" | "team";

const STEPS = ["Info", "Tampilan", "Tim", "Tinjau"] as const;
const TEAM_STEP = 3;
const LAST_STEP = STEPS.length;

interface LineDetailModalProps {
  open: boolean;
  line: DmLine | null;
  initialTab: TabKey;
  workshops: DmWorkshop[];
  defaultWorkshopId: number | null;
  call: <T>(fn: () => Promise<T>) => Promise<T>;
  onTeamChanged: () => Promise<void>;
  onSave: (data: DmLineInput, lineId: number | null) => Promise<DmLine>;
  onFinish: (line: DmLine) => void;
  onDelete: (line: DmLine) => Promise<void>;
  onClose: () => void;
}

type FormState = {
  workshopId: number | null;
  code: string;
  name: string;
  model: string;
  status: DmLineStatus;
  lineLabel: string;
  lineLabelZh: string;
  slug: string;
  slogan: string;
  values: string;
  teamPhotoUrl: string;
};

const statusOptions: { value: DmLineStatus; label: string }[] = [
  { value: "running", label: "RUNNING: beroperasi normal" },
  { value: "idle", label: "IDLE: standby atau ganti model" },
  { value: "stopped", label: "STOPPED: berhenti atau maintenance" },
];

function blank(defaultWorkshopId: number | null): FormState {
  return {
    workshopId: defaultWorkshopId,
    code: "",
    name: "",
    model: "",
    status: "running",
    lineLabel: "DM TRIANGLE LINE",
    lineLabelZh: "",
    slug: "",
    slogan: "",
    values: "",
    teamPhotoUrl: "",
  };
}

function fromLine(line: DmLine): FormState {
  return {
    workshopId: line.workshopId,
    code: line.code,
    name: line.name,
    model: line.model ?? "",
    status: line.status,
    lineLabel: line.lineLabel ?? "",
    lineLabelZh: line.lineLabelZh ?? "",
    slug: line.slug,
    slogan: line.slogan ?? "",
    values: line.values.join(", "),
    teamPhotoUrl: line.teamPhotoUrl ?? "",
  };
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function splitValues(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export type { TabKey };

export default function LineDetailModal({
  open,
  line,
  initialTab,
  workshops,
  defaultWorkshopId,
  call,
  onTeamChanged,
  onSave,
  onFinish,
  onDelete,
  onClose,
}: LineDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormState>(blank(defaultWorkshopId));
  const [savedLine, setSavedLine] = useState<DmLine | null>(line);
  const [snapshot, setSnapshot] = useState("");
  const [step, setStep] = useState(1);
  const [reached, setReached] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<DmMember[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const initial = line ? fromLine(line) : blank(defaultWorkshopId ?? workshops[0]?.id ?? null);
    setForm(initial);
    setSnapshot(JSON.stringify(initial));
    setSavedLine(line);
    setStep(line && initialTab === "team" ? TEAM_STEP : 1);
    setReached(line ? LAST_STEP : 1);
    setError(null);
    setBusy(false);
    setMembers(null);
    setMembersError(null);
  }, [open, line?.id, initialTab]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (step !== LAST_STEP || !savedLine) return;
    let cancelled = false;
    setMembers(null);
    setMembersError(null);
    call(() => adminApi.members(savedLine.id))
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setMembersError(err instanceof Error ? err.message : "Anggota belum bisa dimuat.");
      });
    return () => {
      cancelled = true;
    };
  }, [step, savedLine?.id]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step]);

  if (!open) return null;

  const dirty = JSON.stringify(form) !== snapshot;
  const published = savedLine?.published ?? false;
  const workshopName = workshops.find((item) => item.id === form.workshopId)?.name ?? null;
  const values = splitValues(form.values);

  function change<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function requestClose() {
    if (busy) return;
    if (dirty && !window.confirm("Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?")) return;
    onClose();
  }

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Foto tim lebih dari 2 MB. Kecilkan ukurannya dulu.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      change("teamPhotoUrl", String(reader.result));
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function buildInput(publish: boolean | undefined): DmLineInput | null {
    if (form.workshopId === null) return null;
    return {
      workshopId: form.workshopId,
      code: form.code.trim(),
      name: form.name.trim(),
      model: nullable(form.model),
      status: form.status,
      slogan: nullable(form.slogan),
      lineLabel: nullable(form.lineLabel),
      lineLabelZh: nullable(form.lineLabelZh),
      values,
      teamPhotoUrl: nullable(form.teamPhotoUrl),
      slug: nullable(form.slug),
      published: publish,
    };
  }

  function stepOneProblem() {
    if (form.workshopId === null) {
      return "Pilih workshop dulu. Kalau daftarnya kosong, tambahkan workshop di halaman sebelumnya.";
    }
    if (!form.code.trim() || !form.name.trim()) return "Kode lini dan nama tim wajib diisi.";
    return null;
  }

  function goTo(target: number) {
    setError(null);
    setStep(target);
    setReached((current) => Math.max(current, target));
  }

  async function persist(publish: boolean | undefined) {
    const data = buildInput(publish);
    if (!data) return null;
    const saved = await onSave(data, savedLine?.id ?? null);
    setSavedLine(saved);
    setSnapshot(JSON.stringify(form));
    return saved;
  }

  async function next() {
    setError(null);
    if (step === 1) {
      const problem = stepOneProblem();
      if (problem) {
        setError(problem);
        return;
      }
      goTo(2);
      return;
    }
    if (step === 2) {
      const problem = stepOneProblem();
      if (problem) {
        setStep(1);
        setError(problem);
        return;
      }
      setBusy(true);
      try {
        await persist(savedLine ? undefined : false);
        goTo(TEAM_STEP);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan.");
      } finally {
        setBusy(false);
      }
      return;
    }
    goTo(step + 1);
  }

  async function publish() {
    setError(null);
    const problem = stepOneProblem();
    if (problem) {
      setStep(1);
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      const saved = await persist(true);
      if (saved) onFinish(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menerbitkan.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!savedLine) return;
    if (!window.confirm(`Hapus lini ${savedLine.code} beserta dashboard-nya? Link dashboard ini akan berhenti bekerja.`)) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete(savedLine);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
      setBusy(false);
    }
  }

  const kicker = savedLine ? `Kelola lini · ${savedLine.code}` : "Lini baru";
  const headingName = form.name ? `${form.name}${workshopName ? ` · ${workshopName}` : ""}` : "Pengaturan lini";
  const link = savedLine ? `/dm-dashboard/${savedLine.slug}` : null;

  return (
    <dialog
      ref={dialogRef}
      className="dm-admin-modal dm-line-detail-modal lw-modal"
      aria-labelledby="line-modal-heading"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="lw-shell">
        <header className="lw-head">
          <div className="lw-head-text">
            <p className="lw-kicker">
              {kicker}
              {savedLine ? <span className="lw-chip">{published ? "Terbit" : "Draft"}</span> : null}
            </p>
            <h2 id="line-modal-heading" className="lw-title" tabIndex={-1} autoFocus>{headingName}</h2>
          </div>
          <button type="button" className="lw-close" onClick={requestClose} aria-label="Tutup">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <WizardStepper steps={STEPS} current={step} reached={reached} onSelect={goTo} />

        <div className="lw-body" ref={bodyRef}>
          {error ? <p className="lw-error" role="alert">{error}</p> : null}

          {step === 1 && (
            <div className="lw-grid">
              <div className="lw-field">
                <label htmlFor="line-workshop" className="lw-label">Workshop <span className="lw-req">*</span></label>
                <select
                  id="line-workshop"
                  className="lw-input"
                  value={form.workshopId ?? ""}
                  onChange={(event) => change("workshopId", event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">Pilih workshop</option>
                  {workshops.map((workshop) => (
                    <option key={workshop.id} value={workshop.id}>{workshop.name}</option>
                  ))}
                </select>
              </div>
              <div className="lw-field">
                <label htmlFor="line-code" className="lw-label">Kode lini <span className="lw-req">*</span></label>
                <input
                  id="line-code"
                  type="text"
                  className="lw-input is-mono"
                  value={form.code}
                  onChange={(event) => change("code", event.target.value)}
                  placeholder="TAC20601"
                />
              </div>
              <div className="lw-field">
                <label htmlFor="line-name" className="lw-label">Nama tim <span className="lw-req">*</span></label>
                <input
                  id="line-name"
                  type="text"
                  className="lw-input"
                  value={form.name}
                  onChange={(event) => change("name", event.target.value)}
                  placeholder="EXCELLENCE"
                />
              </div>
              <div className="lw-field">
                <label htmlFor="line-model" className="lw-label">Model ponsel</label>
                <input
                  id="line-model"
                  type="text"
                  className="lw-input"
                  value={form.model}
                  onChange={(event) => change("model", event.target.value)}
                  placeholder="LATTE-M"
                />
              </div>
              <div className="lw-field">
                <label htmlFor="line-status" className="lw-label">Status</label>
                <select
                  id="line-status"
                  className="lw-input"
                  value={form.status}
                  onChange={(event) => change("status", event.target.value as DmLineStatus)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="lw-field">
                <label htmlFor="line-slug" className="lw-label">Alamat link</label>
                <input
                  id="line-slug"
                  type="text"
                  className="lw-input is-mono"
                  value={form.slug}
                  onChange={(event) => change("slug", event.target.value)}
                  placeholder="Otomatis"
                />
                {savedLine ? <span className="lw-hint">Mengubahnya mematikan link lama di layar yang terpasang.</span> : null}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="lw-grid">
              <div className="lw-field">
                <label htmlFor="line-label" className="lw-label">Label Inggris</label>
                <input
                  id="line-label"
                  type="text"
                  className="lw-input"
                  value={form.lineLabel}
                  onChange={(event) => change("lineLabel", event.target.value)}
                  placeholder="DM TRIANGLE LINE"
                />
              </div>
              <div className="lw-field">
                <label htmlFor="line-label-zh" className="lw-label">Label Mandarin</label>
                <input
                  id="line-label-zh"
                  type="text"
                  className="lw-input"
                  value={form.lineLabelZh}
                  onChange={(event) => change("lineLabelZh", event.target.value)}
                  placeholder="DM 三角线"
                />
              </div>
              <div className="lw-field is-wide">
                <label htmlFor="line-slogan" className="lw-label">Slogan tim</label>
                <input
                  id="line-slogan"
                  type="text"
                  className="lw-input"
                  value={form.slogan}
                  onChange={(event) => change("slogan", event.target.value)}
                  placeholder="SATU TIM SATU TUJUAN"
                />
              </div>
              <div className="lw-field is-wide">
                <label htmlFor="line-values" className="lw-label">Nilai inti <span className="lw-hint">pisahkan dengan koma</span></label>
                <input
                  id="line-values"
                  type="text"
                  className="lw-input"
                  value={form.values}
                  onChange={(event) => change("values", event.target.value)}
                  placeholder="Benfen, Orientasi Pengguna, Mengejar Keunggulan"
                />
                {values.length > 0 ? (
                  <ul className="lw-tags" aria-label="Pratinjau nilai inti">
                    {values.map((value) => (
                      <li key={value} className="lw-tag">{value}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="lw-field is-wide">
                <label className="lw-label">Foto tim <span className="lw-hint">landscape, maks. 2 MB</span></label>
                <div className="lw-photo" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  {form.teamPhotoUrl ? (
                    <img src={form.teamPhotoUrl} alt="Pratinjau foto tim" className="lw-thumb" />
                  ) : (
                    <span className="lw-thumb is-empty" aria-hidden="true">Foto</span>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label className="lw-btn is-soft lw-file-btn" style={{ cursor: "pointer", display: "inline-flex", width: "fit-content" }}>
                      {form.teamPhotoUrl ? "Ganti foto tim" : "Pilih foto tim"}
                      <input type="file" accept="image/*" className="lw-file-input" onChange={pickPhoto} />
                    </label>
                    {form.teamPhotoUrl ? (
                      <button type="button" className="lw-link is-danger" onClick={() => change("teamPhotoUrl", "")}>Hapus foto</button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === TEAM_STEP && savedLine && <TeamManager line={savedLine} call={call} onChanged={onTeamChanged} />}

          {step === LAST_STEP && savedLine && (
            <div className="lw-review">
              <p className="lw-lead">
                {published
                  ? "Dashboard ini sudah terbit. Menyimpan memperbarui tampilan di layar dalam semenit."
                  : "Lini masih draft. Dashboard muncul di daftar dashboard setelah diterbitkan."}
              </p>
              <div className="lw-sum">
                <section className="lw-sum-part" aria-label="Info lini">
                  <div className="lw-sum-head">
                    <h3>Info lini</h3>
                    <button type="button" className="lw-link" onClick={() => goTo(1)}>Ubah</button>
                  </div>
                  <dl className="lw-facts">
                    <div><dt>Workshop</dt><dd>{workshopName ?? "Belum dipilih"}</dd></div>
                    <div><dt>Kode</dt><dd className="is-mono">{form.code}</dd></div>
                    <div><dt>Nama</dt><dd>{form.name}</dd></div>
                    <div><dt>Model</dt><dd>{form.model || "-"}</dd></div>
                    <div><dt>Status</dt><dd>{form.status.toUpperCase()}</dd></div>
                    <div className="is-wide"><dt>Link</dt><dd className="is-mono">{link}</dd></div>
                  </dl>
                </section>

                <section className="lw-sum-part" aria-label="Tampilan">
                  <div className="lw-sum-head">
                    <h3>Tampilan</h3>
                    <button type="button" className="lw-link" onClick={() => goTo(2)}>Ubah</button>
                  </div>
                  <dl className="lw-facts">
                    <div><dt>Label</dt><dd>{[form.lineLabel, form.lineLabelZh].filter(Boolean).join(" / ") || "-"}</dd></div>
                    <div><dt>Foto tim</dt><dd>{form.teamPhotoUrl ? "Sudah ada" : "Belum ada"}</dd></div>
                    <div className="is-wide"><dt>Slogan</dt><dd>{form.slogan || "-"}</dd></div>
                    <div className="is-wide"><dt>Nilai inti</dt><dd>{values.length > 0 ? values.join(", ") : "-"}</dd></div>
                  </dl>
                </section>

                <section className="lw-sum-part" aria-label="Anggota tim">
                  <div className="lw-sum-head">
                    <h3>Anggota{members ? ` (${members.length})` : ""}</h3>
                    <button type="button" className="lw-link" onClick={() => goTo(TEAM_STEP)}>Ubah</button>
                  </div>
                  {membersError ? (
                    <p className="lw-warn" role="alert">{membersError}</p>
                  ) : members === null ? (
                    <p className="lw-muted" role="status">Memuat anggota...</p>
                  ) : members.length === 0 ? (
                    <p className="lw-warn">Belum ada anggota. Dashboard tetap bisa terbit, tapi bagian tim kosong.</p>
                  ) : (
                    <ul className="lw-tags">
                      {members.map((member) => (
                        <li key={member.id ?? member.employeeId} className="lw-tag">{member.name}</li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>

        <footer className="lw-foot">
          <div className="lw-foot-side">
            {step === LAST_STEP ? (
              <button type="button" className="lw-link is-danger" disabled={busy} onClick={remove}>Hapus lini</button>
            ) : step === 2 && !savedLine ? (
              <span className="lw-muted">Lanjut menyimpan sebagai draft.</span>
            ) : null}
          </div>
          <div className="lw-foot-actions">
            {step === 1 ? (
              <button type="button" className="lw-btn is-ghost" disabled={busy} onClick={requestClose}>Batal</button>
            ) : (
              <button type="button" className="lw-btn is-ghost" disabled={busy} onClick={() => goTo(step - 1)}>Kembali</button>
            )}
            {step < LAST_STEP ? (
              <button type="button" className="lw-btn is-primary" disabled={busy} onClick={next}>
                {busy ? "Menyimpan..." : "Lanjut"}
              </button>
            ) : (
              <button type="button" className="lw-btn is-primary" disabled={busy} onClick={publish}>
                {busy ? "Menerbitkan..." : "Simpan & Terbitkan"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </dialog>
  );
}
