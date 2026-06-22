import type { DemoModeStep } from "../lib/demoMode";

export type { DemoModeStep };

export interface DemoModePanelProps {
  steps: DemoModeStep[];
  activeIndex: number;
  onRunStep: (stepId: DemoModeStep["id"]) => void;
  onReset: () => void;
}

export function DemoModePanel({
  steps,
  activeIndex,
  onRunStep,
  onReset,
}: DemoModePanelProps) {
  const clampedActiveIndex = Math.min(activeIndex, steps.length);
  const complete = clampedActiveIndex >= steps.length;

  return (
    <section className="panel demo-mode-panel" aria-label="Demo mode">
      <div className="demo-mode-panel__head">
        <div>
          <p className="eyebrow">Demo mode</p>
          <strong>
            {complete ? "Demo complete" : `${clampedActiveIndex + 1} of ${steps.length}`}
          </strong>
        </div>
        <button
          className="button secondary compact"
          onClick={onReset}
          type="button"
        >
          Restart
        </button>
      </div>
      <ol className="demo-mode-steps">
        {steps.map((step, index) => {
          const done = index < clampedActiveIndex;
          const current = index === clampedActiveIndex && !complete;
          return (
            <li
              className={`${done ? "done" : ""} ${current ? "current" : ""}`}
              key={step.id}
            >
              <span aria-hidden="true">{done ? "OK" : String(index + 1)}</span>
              <div>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </div>
              <button
                className={`button compact ${current ? "" : "secondary"}`}
                onClick={() => onRunStep(step.id)}
                type="button"
              >
                {done ? "Replay" : step.actionLabel}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
