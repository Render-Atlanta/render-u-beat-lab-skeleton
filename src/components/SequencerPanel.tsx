import { INSTRUMENTS } from "../lib/instruments";
import { DEFAULT_LANE_VOLUME } from "../lib/laneVolumes";
import type { InstrumentId, Pattern } from "../lib/patterns";
import type { LaneVolumes } from "../lib/laneVolumes";
import type { AudioEngineKind } from "../audio/audioEngine";
import type { BassStepPitches, PaletteEntry } from "../lib/stepPitch";

export interface SequencerPanelProps {
  styleName: string;
  activeSteps: number;
  bpm: number;
  swingPercent: number;
  audioEngineKind: AudioEngineKind;
  pattern: Pattern;
  laneVolumes: LaneVolumes;
  bassStepPitches: BassStepPitches;
  bassPalette: PaletteEntry[];
  activeStep: number | null;
  onBpmChange: (bpm: number) => void;
  onSwingChange: (swingPercent: number) => void;
  onAudioEngineKindChange: (kind: AudioEngineKind) => void;
  onLaneVolumeChange: (instrument: InstrumentId, volume: number) => void;
  onLaneVolumeReset: (instrument: InstrumentId) => void;
  onReset: () => void;
  onToggleStep: (instrument: InstrumentId, stepIndex: number) => void;
  onBassStepPitchChange: (stepIndex: number, degree: number) => void;
}

export function SequencerPanel({
  styleName,
  activeSteps,
  bpm,
  swingPercent,
  audioEngineKind,
  pattern,
  laneVolumes,
  bassStepPitches,
  bassPalette,
  activeStep,
  onBpmChange,
  onSwingChange,
  onAudioEngineKindChange,
  onLaneVolumeChange,
  onLaneVolumeReset,
  onReset,
  onToggleStep,
  onBassStepPitchChange,
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
            <div className="track-label-block">
              <div className="track-label">
                <span className="track-label__name">{instrument.label}</span>
                <span className="track-label__role">{instrument.role}</span>
                <span className="track-label__explainer">{instrument.explainer}</span>
              </div>
              <div className="track-volume">
                <label className="track-volume__control">
                  <span className="eyebrow">{instrument.label} volume</span>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="1"
                    value={Math.round(laneVolumes[instrument.id] * 100)}
                    aria-label={`${instrument.label} volume`}
                    onChange={(event) =>
                      onLaneVolumeChange(instrument.id, Number(event.target.value) / 100)
                    }
                  />
                </label>
                {laneVolumes[instrument.id] !== DEFAULT_LANE_VOLUME ? (
                  <button
                    className="button secondary compact track-volume__reset"
                    type="button"
                    aria-label={`Reset ${instrument.label} volume`}
                    onClick={() => onLaneVolumeReset(instrument.id)}
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </div>
            {pattern[instrument.id].map((step, index) => {
              const is808 = instrument.id === "808";
              const bassDegree = bassStepPitches[index];
              const bassEntry = is808 && step ? bassPalette[bassDegree] : null;

              return (
              <div
                className={[
                  "step-cell-wrap",
                  step ? "on" : "",
                  index % 4 === 0 ? "downbeat" : "",
                  index === activeStep ? "playhead" : "",
                  step && index === activeStep ? "firing" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={`${instrument.id}-${index}`}
              >
                <button
                  className={[
                    "step-cell",
                    step ? "on" : "",
                    bassEntry ? `pitch-${bassEntry.function}` : "",
                    index % 4 === 0 ? "downbeat" : "",
                    index === activeStep ? "playhead" : "",
                    step && index === activeStep ? "firing" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  aria-pressed={step}
                  aria-label={`${instrument.label} step ${index + 1} ${
                    step ? "on" : "off"
                  }${bassEntry ? `, note ${bassEntry.label}` : ""}`}
                  onClick={() => onToggleStep(instrument.id, index)}
                />
                {is808 && step ? (
                  <label className="step-pitch">
                    <span className="sr-only">{`${instrument.label} step ${index + 1} note`}</span>
                    <select
                      className={`step-pitch__select pitch-${bassEntry?.function ?? "root"}`}
                      value={bassDegree}
                      aria-label={`${instrument.label} step ${index + 1} note`}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        onBassStepPitchChange(index, Number(event.target.value))
                      }
                    >
                      {bassPalette.map((entry) => (
                        <option key={entry.degree} value={entry.degree}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
