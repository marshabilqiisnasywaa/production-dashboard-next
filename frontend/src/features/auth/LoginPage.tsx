"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { picAreaOptions, type PicAreaKey } from "@/components/providers/RoleProvider";
import { landingPathFor, landingTitleFor } from "@/config/access";
import { demoPassword, findMultiAreaPicUser, findPicUserForArea, findUserByNik, findUserByRole, type MockUser } from "@/data/mockUsers";
import type { Role } from "@/types/morningMeeting";
import { useAuth } from "@/features/auth/AuthProvider";
import "./login.css";

type QuickChip = {
  key: string;
  label: string;
  account: MockUser;
};

const demoRoles: Role[] = ["Host", "HOD", "Superadmin"];

const picChips: QuickChip[] = picAreaOptions.flatMap((option) => {
  const account = findPicUserForArea(option.key);
  return account ? [{ key: option.key, label: option.label, account }] : [];
});

const roleChips: QuickChip[] = demoRoles.flatMap((role) => {
  const account = findUserByRole(role);
  return account ? [{ key: role, label: role, account }] : [];
});

const multiAreaUser = findMultiAreaPicUser();

function areaLabel(area: PicAreaKey): string {
  return picAreaOptions.find((option) => option.key === area)?.label ?? area;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useAuth();
  const [nik, setNik] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const showDemo = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN !== "false";
  const matchedUser = findUserByNik(nik);
  const destination = matchedUser ? landingTitleFor(matchedUser) : "";
  const destinationArea = matchedUser?.role === "PIC Area" && matchedUser.areas.length
    ? ` (${matchedUser.areas.map(areaLabel).join(", ")})`
    : "";

  useEffect(() => {
    if (ready && user) router.replace(landingPathFor(user));
  }, [ready, user, router]);

  const fillDemoAccount = (account: MockUser) => {
    setNik(account.nik);
    setPassword(demoPassword);
    setError("");
  };

  if (!ready || user) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const result = login(nik, password);
    if (!result.ok) {
      setError(result.error ?? "Tidak bisa masuk.");
      setPending(false);
      return;
    }
    const account = findUserByNik(nik);
    router.replace(account ? landingPathFor(account) : "/login");
  };

  return (
    <main className="mml-login">
      <section className="mml-login__brand">
        <img className="mml-login__logo" src="/assets/oppo-logo-dark.png" alt="OPPO" />
        <div className="mml-login__brand-copy">
          <p className="mml-login__eyebrow">Production Dashboard</p>
          <h1 className="mml-login__title">Morning Meeting &amp; Production KPI</h1>
          <p className="mml-login__lead">Satu tempat untuk membaca KPI produksi dan menjalankan morning meeting harian.</p>
        </div>
        <p className="mml-login__brand-foot">OPPO Manufacturing · Manuflow</p>
      </section>
      <section className="mml-login__panel">
        <form className="mml-login__form" onSubmit={handleSubmit}>
          <div className="mml-login__heading">
            <p className="mml-login__eyebrow mml-login__eyebrow--panel">Selamat datang</p>
            <h2 className="mml-login__form-title">Masuk</h2>
            <p className="mml-login__form-sub">Gunakan NIK dan password Anda.</p>
          </div>
          <label className="mml-login__field" htmlFor="mml-login-nik">
            <span className="mml-login__label">NIK</span>
            <input
              id="mml-login-nik"
              className="mml-login__input"
              value={nik}
              onChange={(event) => setNik(event.target.value)}
              autoComplete="username"
              placeholder="Masukkan NIK"
            />
          </label>
          <label className="mml-login__field" htmlFor="mml-login-password">
            <span className="mml-login__label">Password</span>
            <span className="mml-login__password">
              <input
                id="mml-login-password"
                className="mml-login__input mml-login__input--password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Masukkan password"
              />
              <button
                type="button"
                className="mml-login__toggle"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Sembunyikan" : "Lihat"}
              </button>
            </span>
          </label>
          {error && <p className="mml-login__error" role="alert">{error}</p>}
          {matchedUser && (
            <p className="mml-login__hint">
              Tujuan setelah masuk: <strong>{destination}{destinationArea}</strong>
            </p>
          )}
          <button type="submit" className="mml-login__submit" disabled={pending}>
            {pending ? "Memproses..." : "Masuk"}
          </button>
          {showDemo && (
            <div className="mml-login__demo">
              <p className="mml-login__demo-title">Akses cepat demo</p>
              <div className="mml-login__demo-row">
                <span className="mml-login__demo-label">PIC Area</span>
                <div className="mml-login__chips">
                  {picChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      className="mml-login__chip"
                      onClick={() => fillDemoAccount(chip.account)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mml-login__demo-row">
                <span className="mml-login__demo-label">Role lain</span>
                <div className="mml-login__chips">
                  {roleChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      className="mml-login__chip"
                      onClick={() => fillDemoAccount(chip.account)}
                    >
                      {chip.label}
                    </button>
                  ))}
                  {multiAreaUser && (
                    <button
                      type="button"
                      className="mml-login__chip"
                      onClick={() => fillDemoAccount(multiAreaUser)}
                    >
                      PIC 2 area
                    </button>
                  )}
                </div>
              </div>
              <p className="mml-login__demo-note">Klik chip untuk mengisi NIK dan password demo, lalu tekan Masuk.</p>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
