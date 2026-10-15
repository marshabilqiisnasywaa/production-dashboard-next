export type ProgressTone = "ok" | "warn" | "bad";

interface ProgressBarProps {
  value: number; // 0-100
  /** Position of the target tick mark (0-100) */
  target?: number;
  tone?: ProgressTone;
  size?: "sm" | "md";
}

export function ProgressBar({ value, target, tone = "ok", size = "md" }: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`ui-progress ui-progress--${tone} ui-progress--${size}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
    >
      <div className="ui-progress__fill" style={{ width: `${v}%` }} />
      {target != null && <span className="ui-progress__tick" style={{ left: `${target}%` }} />}
    </div>
  );
}
