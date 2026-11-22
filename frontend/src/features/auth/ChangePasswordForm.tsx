"use client";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import "./change-password.css";

type ChangePasswordFormProps = {
  onSuccess: () => void;
  onCancel?: () => void;
  submitLabel?: string;
};

function PasswordField({ label, value, onChange, autoComplete, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="mml-pass-field">
      <span>{label}</span>
      <div className="mml-pass-input">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="mml-pass-eye"
          onClick={() => setShow((value) => !value)}
          aria-label={show ? "Sembunyikan password" : "Lihat password"}
        >
          {show ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>
    </label>
  );
}

export default function ChangePasswordForm({ onSuccess, onCancel, submitLabel = "Simpan password" }: ChangePasswordFormProps) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
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

  return (
    <form className="mml-pass-form" onSubmit={handleSubmit}>
      <PasswordField
        label="Password lama"
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
        placeholder="Masukkan password lama"
      />
      <PasswordField
        label="Password baru"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        placeholder="Minimal 6 karakter"
      />
      <PasswordField
        label="Konfirmasi password baru"
        value={confirmation}
        onChange={setConfirmation}
        autoComplete="new-password"
        placeholder="Ulangi password baru"
      />
      {error && <p className="mml-pass-error" role="alert">{error}</p>}
      <div className="mml-pass-actions">
        {onCancel && <button type="button" className="mml-pass-secondary" onClick={onCancel}>Batal</button>}
        <button type="submit" className="mml-pass-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
