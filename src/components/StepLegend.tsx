/**
 * Legend under the step grid (brief): the tap/hold/drag instruction plus the
 * three velocity swatches. Purely presentational.
 */
export function StepLegend() {
  return (
    <div className="step-legend">
      <span className="step-legend__text">
        Tap on/off · hold for accent · drag to fill
      </span>
      <span className="step-legend__item">
        <span className="step-legend__swatch hit" aria-hidden="true" />
        Hit
      </span>
      <span className="step-legend__item">
        <span className="step-legend__swatch accent" aria-hidden="true" />
        Accent
      </span>
      <span className="step-legend__item">
        <span className="step-legend__swatch ghost" aria-hidden="true" />
        Ghost
      </span>
    </div>
  );
}
