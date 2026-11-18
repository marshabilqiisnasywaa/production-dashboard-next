"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { ApiError, publicApi } from "./api";
import type { DmPublicWorkshopTeam } from "./api";
import "./DmDashboardSupervisor.css";
import "./WorkshopTeamTv.css";
import "./WorkshopOrgChart.css";

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  if (photoUrl && !failed) {
    return <img className="wso-photo" src={photoUrl} alt={name} onError={() => setFailed(true)} />;
  }
  return (
    <span className="wso-avatar-icon" aria-hidden="true">
      <svg className="wso-person-svg" viewBox="0 0 40 40">
        <circle cx="20" cy="14" r="7" />
        <path d="M6 36c0-7.7 6.3-12 14-12s14 4.3 14 12z" />
      </svg>
    </span>
  );
}

export default function WorkshopTeamTv({ workshopId }: { workshopId: number }) {
  const { text: uiText } = useUiText();
  const [team, setTeam] = useState<DmPublicWorkshopTeam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let pending = false;

    async function load() {
      if (pending) return;
      pending = true;
      try {
        const next = await publicApi.workshopTeam(workshopId);
        if (!cancelled) {
          setTeam(next);
          setMissing(false);
          setError(null);
        }
      } catch (cause) {
        if (cancelled) return;
        if (cause instanceof ApiError && cause.status === 404) {
          setMissing(true);
          setTeam(null);
          setError(null);
        } else {
          setError(cause instanceof Error ? cause.message : "Data belum bisa dimuat.");
        }
      } finally {
        pending = false;
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [workshopId, attempt]);

  if (!team) {
    return (
      <main className="dsv-root dsv-state">
        <h1 className="dsv-state-title">
          {missing ? uiText("Workshop tidak ditemukan") : error ? uiText("Data belum bisa dimuat") : uiText("Memuat tim workshop...")}
        </h1>
        {missing ? <p>{uiText("Periksa kembali link workshop ini.")}</p> : error ? <p role="alert">{uiText(error)}</p> : <p role="status">{uiText("Mengambil data workshop.")}</p>}
        {(error || missing) && (
          <button className="dsv-state-action" onClick={() => setAttempt((value) => value + 1)}>{uiText("Coba lagi")}</button>
        )}
      </main>
    );
  }

  const count = team.supervisors.length;
  const centers = team.supervisors.map((_, index) => ((index + 0.5) / count) * 100);

  return (
    <main className="wso-root" style={{ "--wso-columns": Math.min(Math.max(count, 1), 5), "--wso-gap": count <= 4 ? 72 : 36 } as CSSProperties}>
      <Image src="/assets/oppo-logo-green.png" alt="OPPO" width={360} height={88} className="wso-logo" priority />

      <header className="wso-title">
        <h1>{team.workshopName}</h1>
        <p>{uiText("车间组织架构")}</p>
      </header>

      {error && <p className="wso-notice" role="status">{uiText("Pembaruan gagal. Menampilkan data terakhir. ")}{uiText(error)}</p>}

      <section className="wso-hod" aria-label={uiText("Head of Department")}>
        <div className="wso-hod-avatar"><Avatar key={team.hod?.photoUrl} name={team.hod?.name ?? "HOD"} photoUrl={team.hod?.photoUrl ?? null} /></div>
        <div className="wso-hod-left">
          <strong>{uiText("Head of Department")}</strong>
          <span>{team.hod?.position ?? ""}</span>
        </div>
        <span className="wso-hod-name">{team.hod?.name ?? uiText("Belum diisi")}</span>
        {team.hod && (
          <dl className="wso-hod-contact">
            <div><dt>{uiText("Work No:")}</dt><dd>{team.hod.employeeId || "-"}</dd></div>
            <div><dt>{uiText("Work Phone:")}</dt><dd>{team.hod.workPhone || "-"}</dd></div>
          </dl>
        )}
      </section>

      {count > 0 && count <= 5 && (
        <div className="wso-connector" aria-hidden="true">
          <span className="wso-line wso-line--down" />
          <span className="wso-line wso-line--across" style={{ left: `${centers[0]}%`, right: `${100 - centers[count - 1]}%` }} />
          {centers.map((center, index) => <span key={team.supervisors[index].employeeId} className="wso-line wso-line--drop" style={{ left: `${center}%` }} />)}
        </div>
      )}

      {count === 0 ? (
        <p className="wso-empty" role="status">{uiText("Belum ada supervisor yang ditambahkan ke workshop ini.")}</p>
      ) : (
        <section className="wso-columns" aria-label={uiText("Supervisor workshop")}>
          {team.supervisors.map((person) => {
            const position = person.position?.trim() || "Posisi belum diisi";
            // Deskripsi tugas dari template lama; baris baru = kartu terpisah.
            const duties = (person.responsibility ?? "").split(/\r?\n+/).map((line) => line.trim()).filter(Boolean);
            return (
              <article key={person.employeeId} className="wso-col">
                <div className="wso-person">
                  <div className="wso-person-avatar"><Avatar key={person.photoUrl} name={person.name} photoUrl={person.photoUrl} /></div>
                  <h2 className="wso-person-name">{person.name}</h2>
                  <p className="wso-person-role">{position}</p>
                  <p className="wso-person-phone">{person.employeeId || person.workPhone || "-"}</p>
                </div>
                <div className="wso-duties">
                  {(duties.length ? duties : [uiText("Tugas belum diisi.")]).map((duty, i) => (
                    <p key={i} className="wso-duty">{duty}</p>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}