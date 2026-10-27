export function ProblemLoadError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="dml-empty" role="alert">
      <p>Daftar masalah gagal dimuat. {error}</p>
      <button type="button" className="dml-pb-act-btn" onClick={onRetry}>Coba lagi</button>
    </div>
  );
}
