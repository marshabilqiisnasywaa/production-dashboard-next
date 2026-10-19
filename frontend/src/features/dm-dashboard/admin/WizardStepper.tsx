"use client";

interface WizardStepperProps {
  steps: readonly string[];
  current: number;
  reached: number;
  onSelect: (step: number) => void;
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function stateOf(step: number, current: number) {
  if (step < current) return "done";
  return step === current ? "active" : "todo";
}

const stateText = { done: "selesai", active: "langkah saat ini", todo: "belum dikerjakan" } as const;

export default function WizardStepper({ steps, current, reached, onSelect }: WizardStepperProps) {
  return (
    <div className="lw-stepper" role="group" aria-label="Langkah pengaturan lini">
      <ol className="lw-steps">
        {steps.map((label, index) => {
          const step = index + 1;
          const state = stateOf(step, current);
          return (
            <li key={label} className={`lw-step is-${state}`} aria-current={state === "active" ? "step" : undefined}>
              <button type="button" className="lw-step-btn" disabled={step > reached} onClick={() => onSelect(step)}>
                <span className="lw-step-dot" aria-hidden="true">{state === "done" ? <CheckIcon /> : step}</span>
                <span className="lw-step-label">
                  {label}
                  <span className="lw-sr">, {stateText[state]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
