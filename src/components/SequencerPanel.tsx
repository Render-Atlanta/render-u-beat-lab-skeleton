import { INSTRUMENTS } from "../lib/instruments";
import type { InstrumentId, Pattern } from "../lib/patterns";
import type { AudioEngineKind } from "../audio/audioEngine";

export interface SequencerPanelProps {
  styleName: string;
  activeSteps: number;
  bpm: number;
  swingPercent: number;
  audioEngineKind: AudioEngineKind;
  pattern: Pattern;
  activeStep: number | null;
  onBpmChange: (bpm: number) => void;
  onSwingChange: (swingPercent: number) => void;
  onAudioEngineKindChange: (kind: AudioEngineKind) => void;
  onReset: () => void;
  onToggleStep: (instrument: InstrumentId, stepIndex: number) => void;
}

export function SequencerPanel({
  styleName,
  activeSteps,
  bpm,
  swingPercent,
  audioEngineKind,
  pattern,
  activeStep,
  onBpmChange,
  onSwingChange,
  onAudioEngineKindChange,
  onReset,
  onToggleStep,
}: SequencerPanelProps) {
  return (
    <section className="panel grid-panel">
      <div className="panel-header split">
        <div>
          <p className="eyebrow">Pattern</p>
          <h2 className="heading">{styleName}</h2>
        </div>
        <div className="stat-block">
          <span>{activeSteps}</span>
          hits
        </div>
      </div>

      <div className="sequencer-controls" aria-label="Sequencer controls">
        <label className="control-field">
          <span className="eyebrow">BPM</span>
          <input
            type="number"
            min="60"
            max="180"
            value={bpm}
            onChange={(event) => onBpmChange(Number(event.target.value))}
          />
        </label>
        <label className="control-field wide">
          <span className="eyebrow">Swing {swingPercent}%</span>
          <input
            type="range"
            min="0"
            max="30"
            value={swingPercent}
            onChange={(event) => onSwingChange(Number(event.target.value))}
          />
        </label>
        <label className="control-field">
          <span className="eyebrow">Engine</span>
          <select
            value={audioEngineKind}
            onChange={(event) =>
              onAudioEngineKindChange(event.target.value as AudioEngineKind)
            }
          >
            <option value="web-audio">Web Audio</option>
            <option value="tone-sample">Tone.js</option>
          </select>
        </label>
        <button className="button secondary compact" type="button" onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="step-grid" aria-label={`${styleName} drum pattern`}>
        {INSTRUMENTS.map((instrument) => (
          <div className="track-row" key={instrument.id}>
            <div className="track-label">
              <span className="track-label__name">{instrument.label}</span>
              <span className="track-label__role">{instrument.role}</span>
              <span className="track-label__explainer">{instrument.explainer}</span>
            </div>
            {pattern[instrument.id].map((step, index) => (
              <button
                className={[
                  "step-cell",
                  step ? "on" : "",
                  index % 4 === 0 ? "downbeat" : "",
                  index === activeStep ? "playhead" : "",
                  step && index === activeStep ? "firing" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={`${instrument.id}-${index}`}
                type="button"
                aria-pressed={step}
                aria-label={`${instrument.label} step ${index + 1} ${
                  step ? "on" : "off"
                }`}
                onClick={() => onToggleStep(instrument.id, index)}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
