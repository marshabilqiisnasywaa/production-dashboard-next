"use client";
import { useUiText } from "@/locales/useUiText";
import { useEffect, useId, useState } from "react";
import { Field } from "@/components/ui/Field";
import { papercardApi, type DmPapercardSubmission, type DmPapercardSupervisors } from "../../../api";
import { departmentLabel } from "../../../departments";

export function usePapercardSupervisor(scope: string, submission: DmPapercardSubmission | null) {
  const [state, setState] = useState<{ scope: string; data: DmPapercardSupervisors | null; error: string | null }>({ scope: "", data: null, error: null });
  const [choice, setChoice] = useState<{ scope: string; id: number | null } | null>(null);

  useEffect(() => {
    let alive = true;
    setState({ scope, data: null, error: null });
    papercardApi.supervisors().then((data) => {
      if (alive) setState({ scope, data, error: null });
    }).catch((error: unknown) => {
      if (alive) setState({ scope, data: null, error: error instanceof Error ? error.message : "Daftar supervisor tidak dapat dimuat." });
    });
    return () => { alive = false; };
  }, [scope]);

  const data = state.scope === scope ? state.data : null;
  const options = data?.supervisors ?? [];
  const locked = submission && submission.approvalStatus.toLowerCase() !== "rejected";
  const selectedId = locked ? submission.recipientSupervisorId ?? data?.defaultSupervisorId ?? null
    : choice?.scope === scope ? choice.id : submission?.recipientSupervisorId ?? data?.defaultSupervisorId ?? null;
  const selected = options.find((option) => option.id === selectedId);
  return {
    options, selectedId, defaultId: data?.defaultSupervisorId ?? null,
    name: selected?.name ?? submission?.recipientSupervisorName ?? "Belum dipilih",
    available: Boolean(selected), loading: !data && !state.error,
    error: state.scope === scope ? state.error : null,
    onChange: (id: number | null) => setChoice({ scope, id }),
  };
}

export function SupervisorSelect({ selection, disabled }: {
  selection: ReturnType<typeof usePapercardSupervisor>;
  disabled: boolean;
}) {
  const { text: uiText } = useUiText();
  const id = useId();
  const hintId = `${id}-hint`;
  const unavailable = selection.selectedId !== null && !selection.available;
  return (
    <Field label={uiText("Supervisor penerima")} htmlFor={id}>
      <select id={id} className="ui-select ui-select--block"
        value={selection.selectedId ?? ""} disabled={disabled || selection.loading}
        aria-describedby={hintId} aria-invalid={Boolean(selection.error)}
        onChange={(event) => selection.onChange(event.target.value ? Number(event.target.value) : null)}>
        <option value="" disabled>{selection.loading ? uiText("Memuat supervisor...") : uiText("Pilih supervisor")}</option>
        {unavailable && <option value={selection.selectedId!} disabled>{selection.name}{uiText(" (tidak aktif)")}</option>}
        {selection.options.map((supervisor) => (
          <option key={supervisor.id} value={supervisor.id}>
            {supervisor.name}{supervisor.dept ? ` — ${uiText(departmentLabel(supervisor.dept))}` : ""}{supervisor.id === selection.defaultId ? uiText(" (default)") : ""}
          </option>
        ))}
      </select>
      <p id={hintId} className="dml-pc-supervisor__hint" role={selection.error ? "alert" : undefined}>
        {selection.error ?? (selection.loading ? "Memuat daftar supervisor aktif." : disabled
          ? "Supervisor penerima untuk Papercard ini."
          : selection.options.length === 0 ? "Belum ada supervisor aktif. Hubungi admin."
          : "Ganti supervisor jika supervisor default tidak masuk. Pilihan ini hanya berlaku untuk Papercard ini.")}
      </p>
    </Field>
  );
}
