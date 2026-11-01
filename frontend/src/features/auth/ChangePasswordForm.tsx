"use client";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import "./change-password.css";

type ChangePasswordFormProps = {
  onSuccess: () => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export default function ChangePasswordForm({ onSuccess, onCancel, submitLabel = "Simpan password" }: ChangePasswordFormProps) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    const result = changePassword(currentPassword, newPassword);
    if (!result.ok) {
      setError(result.error ?? "Password tidak dapat diubah.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    onSuccess();
  };

  const inputType = visible ? "text" : "password";

  return (
    <form className="mml-pass-form" onSubmit={handleSubmit}>
      <label className="mml-pass-field">
        <span>Password lama</span>
        <input
          type={inputType}
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="Masukkan password lama"
        />
      </label>
      <label className="mml-pass-field">
        <span>Password baru</span>
        <input
          type={inputType}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="Minimal 6 karakter"
        />
      </label>
      <label className="mml-pass-field">
        <span>Konfirmasi password baru</span>
        <input
          type={inputType}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="new-password"
          placeholder="Ulangi password baru"
        />
      </label>
      <button type="button" className="mml-pass-visibility" onClick={() => setVisible((value) => !value)}>
        {visible ? "Sembunyikan password" : "Lihat password"}
      </button>
      {error && <p className="mml-pass-error" role="alert">{error}</p>}
      <div className="mml-pass-actions">
        {onCancel && <button type="button" className="mml-pass-secondary" onClick={onCancel}>Batal</button>}
        <button type="submit" className="mml-pass-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
