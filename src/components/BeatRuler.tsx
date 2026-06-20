interface BeatRulerProps {
  /** The currently-firing step (0–15), or null when stopped. */
  activeStep: number | null;
}

/**
 * The `1 2 3 4` beat ruler above the step grid. Each number spans 4 sixteenth-
 * steps; the current beat (`Math.floor(activeStep / 4)`) is highlighted.
 */
export function BeatRuler({ activeStep }: BeatRulerProps) {
  return (
    <div className="beat-ruler" aria-label="Beat ruler">
      <span className="beat-ruler__spacer" aria-hidden="true" />
      {[1, 2, 3, 4].map((beat) => (
        <span
          key={beat}
          className={`beat-ruler__beat${
            activeStep !== null && Math.floor(activeStep / 4) === beat - 1
              ? " is-current"
              : ""
          }`}
        >
          {beat}
        </span>
      ))}
    </div>
  );
}
