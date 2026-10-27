"use client";

import { useEffect, useState } from "react";
import MpvManager from "../admin/MpvManager";
import { leaderMpvApi, type DmLine } from "../api";

const call = <T,>(fn: () => Promise<T>): Promise<T> => fn();

export default function LeaderMvpPage() {
  const [lines, setLines] = useState<DmLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    leaderMpvApi.lines()
      .then((result) => { if (alive) setLines(result); })
      .catch((err) => { if (alive) setError(err instanceof Error ? err.message : "Daftar lini gagal dimuat."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [retry]);

  return (
    <div>
      <div className="dml-page-head">
        <div>
          <h1>MVP of the Month</h1>
          <p>Pilih MVP bulanan dari operator lini atau masukkan data manual untuk lini yang menjadi tanggung jawab Anda.</p>
        </div>
      </div>
      {loading ? <div className="dml-empty" role="status">Memuat lini...</div> : error ? (
        <div className="dml-empty" role="alert">
          <p>{error}</p>
          <button type="button" className="mpv-sm-btn mpv-btn-soft-primary" onClick={() => setRetry((value) => value + 1)}>Coba lagi</button>
        </div>
      ) : (
        <MpvManager
          lines={lines}
          call={call}
          api={leaderMpvApi}
          candidates={leaderMpvApi.candidates}
          allowManual={true}
          emptyLinesMessage="Belum ada lini yang ditugaskan kepada Anda. Hubungi admin untuk mengatur penugasan."
        />
      )}
    </div>
  );
}
