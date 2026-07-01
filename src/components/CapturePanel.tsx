import { getMicStateCopy, type MicCaptureState } from "../lib/captureAnalysis";
import { INSTRUMENTS } from "../lib/instruments";
import type { InstrumentId } from "../lib/patterns";

export interface CapturePanelProps {
  micState: MicCaptureState;
  sensitivity: number;
  onSensitivityChange: (sensitivity: number) => void;
  onCapture: () => void;
  onHitLaneChange: (hitId: string, instrument: InstrumentId) => void;
  onSendLanes: () => void;
}

export function CapturePanel({
  micState,
  sensitivity,
  onSensitivityChange,
  onCapture,
  onHitLaneChange,
  onSendLanes,
}: CapturePanelProps) {
  return (
    <div className="capture-panel">
      <p className="eyebrow">Beatbox capture</p>
      <h3 className="heading">Hum it, we map it</h3>
      <p>
        Tap record and beatbox a rhythm. We detect the hits and sort them into
        drum lanes you can drop onto the grid.
      </p>
      <p>{getMicStateCopy(micState)}</p>
      <label className="control-field">
        <span className="eyebrow">Sensitivity {Math.round(sensitivity * 100)}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={sensitivity}
          onChange={(event) => onSensitivityChange(Number(event.target.value))}
        />
      </label>
      <button
        className="button secondary compact"
        type="button"
        onClick={onCapture}
        disabled={micState.status === "recording"}
      >
        {micState.status === "recording"
          ? "Listening…"
          : micState.status === "captured"
            ? "Record again"
            : "● Record beatbox"}
      </button>
      {micState.status === "captured" ? (
        <>
          <div className="waveform-preview" aria-label="Captured waveform preview">
            {micState.result.waveform.slice(0, 32).map((level, index) => (
              <span
                key={index}
                style={{ height: `${Math.max(8, Math.round(level * 42))}px` }}
              />
            ))}
          </div>
          <div className="capture-grid" aria-label="Quantized capture preview">
            {micState.preview.cleanedGrid.map((hit, index) => (
              <span className={hit ? "hit" : ""} key={index} />
            ))}
          </div>
          <div className="classification-grid" aria-label="Classified beatbox lanes">
            {INSTRUMENTS.map((instrument) => (
              <div className="classification-row" key={instrument.id}>
                <span>{instrument.label}</span>
                {Array.from({ length: 16 }, (_, stepIndex) => {
                  const hit = micState.classifications.find(
                    (classification) =>
                      classification.instrument === instrument.id &&
                      classification.stepIndex === stepIndex,
                  );

                  return (
                    <span
                      className={hit ? `hit ${hit.needsCorrection ? "check" : ""}` : ""}
                      key={`${instrument.id}-${stepIndex}`}
                      title={
                        hit
                          ? `${instrument.label} step ${stepIndex + 1}, ${Math.round(
                              hit.confidence * 100,
                            )}%`
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="classification-list" aria-label="Beatbox hit lane corrections">
            {micState.classifications.map((classification) => (
              <label className="classification-item" key={classification.id}>
                <span>
                  Step {classification.stepNumber}
                  <small>
                    {Math.round(classification.confidence * 100)}%
                    {classification.needsCorrection ? " check" : ""}
                    {classification.source === "manual" ? " fixed" : ""}
                  </small>
                </span>
                <select
                  value={classification.instrument}
                  aria-label={`Lane for captured hit on step ${classification.stepNumber}`}
                  onChange={(event) =>
                    onHitLaneChange(
                      classification.id,
                      event.target.value as InstrumentId,
                    )
                  }
                >
                  {INSTRUMENTS.map((instrument) => (
                    <option key={instrument.id} value={instrument.id}>
                      {instrument.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button
            className="button secondary compact"
            type="button"
            onClick={onSendLanes}
          >
            Drop onto grid
          </button>
        </>
      ) : null}
    </div>
  );
}
