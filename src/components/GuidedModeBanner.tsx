import type { InstrumentOption } from "../lib/instruments";

export interface GuidedModeBannerProps {
  /** The lane currently being introduced. */
  instrument: InstrumentOption;
  stepIndex: number;
  stepCount: number;
  /** True on the final lane — switches the advance button to "Finish". */
  isLastStep: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onExit: () => void;
}

export function GuidedModeBanner({
  instrument,
  stepIndex,
  stepCount,
  isLastStep,
  onNext,
  onPrevious,
  onSkip,
  onExit,
}: GuidedModeBannerProps) {
  return (
    <section className="panel guided-banner" aria-label="Guided build">
      <div className="guided-banner__copy">
        <p className="eyebrow">
          Step {stepIndex + 1} of {stepCount} — {instrument.label}
        </p>
        <p className="guided-banner__role">{instrument.role}</p>
        <p className="guided-banner__explainer">{instrument.explainer}</p>
        <p className="guided-banner__tip">{instrument.guidedTip}</p>
        <p className="guided-banner__live">
          ★ Earlier layers stay live — tap any lane above to edit it.
        </p>
      </div>
      <div className="guided-banner__actions">
        <button
          className="button secondary compact"
          type="button"
          onClick={onPrevious}
          disabled={stepIndex === 0}
        >
          ← Previous layer
        </button>
        <button className="star-button" type="button" onClick={onNext}>
          {isLastStep ? "Finish" : "Next layer"}
        </button>
        <button
          className="button secondary compact"
          type="button"
          onClick={onSkip}
        >
          Skip to full grid
        </button>
        <button
          className="button secondary compact"
          type="button"
          onClick={onExit}
        >
          Exit
        </button>
      </div>
    </section>
  );
}
