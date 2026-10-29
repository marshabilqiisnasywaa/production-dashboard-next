"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { ApiError, publicApi } from "./api";
import type { DmPublicWorkshopTeam } from "./api";
import "./DmDashboardSupervisor.css";
import "./WorkshopTeamTv.css";

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  if (photoUrl && !failed) {
    return <img className="dsv-photo" src={photoUrl} alt={name} onError={() => setFailed(true)} />;
  }
  return (
    <span className="dsv-avatar-icon" aria-hidden="true">
      <svg className="dsv-person-svg" viewBox="0 0 40 40">
        <circle cx="20" cy="14" r="7" />
        <path d="M6 36c0-7.7 6.3-12 14-12s14 4.3 14 12z" />
      </svg>
    </span>
  );
}

export default function WorkshopTeamTv({ workshopId }: { workshopId: number }) {
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
          {missing ? "Workshop tidak ditemukan" : error ? "Data belum bisa dimuat" : "Memuat tim workshop..."}
        </h1>
        {missing ? <p>Periksa kembali link workshop ini.</p> : error ? <p role="alert">{error}</p> : <p role="status">Mengambil data workshop.</p>}
        {(error || missing) && (
          <button className="dsv-state-action" onClick={() => setAttempt((value) => value + 1)}>Coba lagi</button>
        )}
      </main>
    );
  }

  const count = team.supervisors.length;
  const centers = team.supervisors.map((_, index) => ((index + 0.5) / count) * 100);

  return (
    <main className="dsv-root wtv-root">
      <header className="dsv-card dsv-header">
        <Image src="/assets/oppo-logo-light.png" alt="OPPO Indonesia Manufacturing" width={120} height={36} className="dsv-logo" priority />
        <div className="dsv-header-title">
          <h1 className="dsv-ws-code">{team.workshopName}</h1>
          <p className="dsv-header-sub" lang="zh">车间组织架构</p>
        </div>
        <div className="dsv-header-brand"><strong>DM WORKSHOP TEAM</strong></div>
      </header>

      {error && <p className="wtv-notice" role="status">Pembaruan gagal. Menampilkan data terakhir. {error}</p>}

      <section className="dsv-hod" aria-label="Head of Department">
        <div className="dsv-hod-bar"><span>HEAD OF DEPARTMENT</span><strong>{team.hod?.position ?? ""}</strong></div>
        <div className="dsv-hod-body">
          <div className="dsv-hod-avatar"><Avatar key={team.hod?.photoUrl} name={team.hod?.name ?? "HOD"} photoUrl={team.hod?.photoUrl ?? null} /></div>
          <div className="dsv-hod-who">
            <span className="dsv-hod-name">{team.hod?.name ?? "Belum diisi"}</span>
            {team.hod && <span className="dsv-hod-title">{team.hod.position}</span>}
          </div>
          {team.hod && <div className="dsv-contact"><span className="dsv-contact-label">TELEPHONE / CONTACT</span><span className="dsv-contact-value">{team.hod.workPhone || "-"}</span></div>}
        </div>
      </section>

      {count > 0 && count <= 5 && (
        <div className="dsv-connector" aria-hidden="true">
          <span className="dsv-line dsv-line--down" />
          <span className="dsv-line dsv-line--across" style={{ left: `${centers[0]}%`, right: `${100 - centers[count - 1]}%` }} />
          {centers.map((center, index) => <span key={team.supervisors[index].employeeId} className="dsv-line dsv-line--drop" style={{ left: `${center}%` }} />)}
        </div>
      )}

      {count === 0 ? (
        <p className="wtv-empty" role="status">Belum ada supervisor yang ditambahkan ke workshop ini.</p>
      ) : (
        <section className="dsv-columns" aria-label="Supervisor workshop" style={{ "--wtv-columns": Math.min(count, 5) } as CSSProperties}>
          {team.supervisors.map((person) => {
            const position = person.position?.trim() || "Posisi belum diisi";
            return (
              <article key={person.employeeId} className="dsv-col">
                <h2 className="dsv-col-head">{position}</h2>
                <dl className="dsv-info">
                  <div><dt>Nama:</dt><dd className="dsv-info-name">{person.name}</dd></div>
                  <div><dt>Tlp:</dt><dd className="dsv-info-phone">{person.workPhone || "-"}</dd></div>
                </dl>
                <div className="dsv-photo-frame"><Avatar key={person.photoUrl} name={person.name} photoUrl={person.photoUrl} /></div>
                <h3 className="dsv-col-title">{position}</h3>
                <p className="dsv-col-desc">{person.responsibility?.trim() || "Tugas belum diisi."}</p>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
