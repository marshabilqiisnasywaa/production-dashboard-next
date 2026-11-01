"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { landingPathFor } from "@/config/access";
import { useAuth } from "@/features/auth/AuthProvider";
import ChangePasswordForm from "@/features/auth/ChangePasswordForm";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) return null;

  if (user.mustChangePassword) {
    return (
      <main className="mml-pass-gate">
        <section className="mml-pass-gate__card">
          <p className="mml-pass-gate__eyebrow">Keamanan akun</p>
          <h1>Ganti password</h1>
          <p className="mml-pass-gate__copy">Ganti password dulu sebelum memakai akun ini.</p>
          <ChangePasswordForm
            submitLabel="Simpan password"
            onSuccess={() => router.replace(landingPathFor(user))}
          />
          <button
            type="button"
            className="mml-pass-gate__logout"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Keluar
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
