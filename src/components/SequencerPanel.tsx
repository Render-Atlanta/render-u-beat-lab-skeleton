import { INSTRUMENTS, type InstrumentOption } from "../lib/instruments";
import { DEFAULT_LANE_VOLUME } from "../lib/laneVolumes";
import type { InstrumentId, Pattern } from "../lib/patterns";
import type { LaneVolumes } from "../lib/laneVolumes";
import type { LaneMutes } from "../lib/laneMutes";
import type { AudioEngineKind } from "../audio/audioEngine";
import type { BassStepPitches, MelodyStepPitches, PaletteEntry } from "../lib/stepPitch";
import type { StepVelocity, StepVelocities } from "../lib/stepVelocity";
import { BeatRuler } from "./BeatRuler";
import { SequencerControls } from "./SequencerControls";
import { useStepPaint } from "./useStepPaint";

export interface SequencerPanelProps {
  styleName: string;
  activeSteps: number;
  bpm: number;
  swingPercent: number;
  audioEngineKind: AudioEngineKind;
  pattern: Pattern;
  laneVolumes: LaneVolumes;
  laneMutes: LaneMutes;
  stepVelocities: StepVelocities;
  bassStepPitches: BassStepPitches;
  bassPalette: PaletteEntry[];
  melodyStepPitches: MelodyStepPitches;
  melodyPalette: PaletteEntry[];
  activeStep: number | null;
  canUndo: boolean;
  canRedo: boolean;
  /** Lanes to render, in order. Defaults to all instruments (free-form grid). */
  visibleInstruments?: InstrumentOption[];
  onBpmChange: (bpm: number) => void;
  onTapTempo: () => void;
  onSwingChange: (swingPercent: number) => void;
  onAudioEngineKindChange: (kind: AudioEngineKind) => void;
  onLaneVolumeChange: (instrument: InstrumentId, volume: number) => void;
  onLaneVolumeReset: (instrument: InstrumentId) => void;
  onLaneMuteToggle: (instrument: InstrumentId) => void;
  onReset: () => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShare: () => void;
  countInEnabled: boolean;
  metronomeEnabled: boolean;
  onCountInToggle: () => void;
  onMetronomeToggle: () => void;
  onToggleStep: (instrument: InstrumentId, stepIndex: number) => void;
  onPaintStep: (instrument: InstrumentId, stepIndex: number) => void;
  onBassStepPitchChange: (stepIndex: number, degree: number) => void;
  onMelodyStepPitchChange: (stepIndex: number, degree: number) => void;
}

export function SequencerPanel({
  styleName,
  activeSteps,
  bpm,
  swingPercent,
  audioEngineKind,
  pattern,
  laneVolumes,
  laneMutes,
  stepVelocities,
  bassStepPitches,
  bassPalette,
  melodyStepPitches,
  melodyPalette,
  activeStep,
  canUndo,
  canRedo,
  visibleInstruments = INSTRUMENTS,
  onBpmChange,
  onTapTempo,
  onSwingChange,
  onAudioEngineKindChange,
  onLaneVolumeChange,
  onLaneVolumeReset,
  onLaneMuteToggle,
  onReset,
  onClear,
  onUndo,
  onRedo,
  onShare,
  countInEnabled,
  metronomeEnabled,
  onCountInToggle,
  onMetronomeToggle,
  onToggleStep,
  onPaintStep,
  onBassStepPitchChange,
  onMelodyStepPitchChange,
}: SequencerPanelProps) {
  const stepPaint = useStepPaint(onPaintStep);

  function handleStepClick(instrument: InstrumentId, stepIndex: number) {
    if (stepPaint.shouldSuppressClick()) {
      return;
    }

    onToggleStep(instrument, stepIndex);
  }

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

      <SequencerControls
        bpm={bpm}
        swingPercent={swingPercent}
        audioEngineKind={audioEngineKind}
        canUndo={canUndo}
        canRedo={canRedo}
        onBpmChange={onBpmChange}
        onTapTempo={onTapTempo}
        onSwingChange={onSwingChange}
        onAudioEngineKindChange={onAudioEngineKindChange}
        onUndo={onUndo}
        onRedo={onRedo}
        onClear={onClear}
        onReset={onReset}
        onShare={onShare}
        countInEnabled={countInEnabled}
        metronomeEnabled={metronomeEnabled}
        onCountInToggle={onCountInToggle}
        onMetronomeToggle={onMetronomeToggle}
      />

      <div
        className="step-grid"
        aria-label={`${styleName} drum pattern`}
        onPointerMove={stepPaint.paintFromPointer}
        onPointerUp={stepPaint.endPaint}
        onPointerCancel={stepPaint.endPaint}
      >
        <BeatRuler activeStep={activeStep} />
        {visibleInstruments.map((instrument) => {
          const muted = laneMutes[instrument.id];
          return (
          <div
            className={`track-row${muted ? " muted" : ""}`}
            key={instrument.id}
          >
            <div className="track-label-block">
              <div className="track-label">
                <span className="track-label__name">{instrument.label}</span>
                <span className="track-label__role">{instrument.role}</span>
                <span className="track-label__explainer">{instrument.explainer}</span>
              </div>
              <button
                className={`button secondary compact track-mute${muted ? " active" : ""}`}
                type="button"
                aria-pressed={muted}
                aria-label={`${muted ? "Unmute" : "Mute"} ${instrument.label} lane`}
                onClick={() => onLaneMuteToggle(instrument.id)}
              >
                {muted ? "Muted" : "Mute"}
              </button>
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
              const isMelody = instrument.id === "melody";
              const bassDegree = bassStepPitches[index];
              const melodyDegree = melodyStepPitches[index];
              const pitchDegree = isMelody ? melodyDegree : bassDegree;
              const pitchPalette = isMelody ? melodyPalette : bassPalette;
              const pitchEntry =
                (is808 || isMelody) && step ? pitchPalette[pitchDegree] : null;
              const onPitchChange = isMelody
                ? onMelodyStepPitchChange
                : onBassStepPitchChange;
              const velocity = stepVelocities[instrument.id][index];
              const velocityName = getVelocityName(velocity);
              const velocityClass =
                step && velocityName !== "normal"
                  ? `velocity-${velocityName}`
                  : "";

              return (
              <div
                className={[
                  "step-cell-wrap",
                  step ? "on" : "",
                  velocityClass,
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
                    velocityClass,
                    pitchEntry ? `pitch-${pitchEntry.function}` : "",
                    index % 4 === 0 ? "downbeat" : "",
                    index === activeStep ? "playhead" : "",
                    step && index === activeStep ? "firing" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  aria-pressed={step}
                  data-step-cell="true"
                  data-instrument={instrument.id}
                  data-step-index={index}
                  aria-label={`${instrument.label} step ${index + 1} ${
                    step ? "on" : "off"
                  }${step ? `, ${velocityName}` : ""}${
                    pitchEntry ? `, note ${pitchEntry.label}` : ""
                  }`}
                  onPointerDown={(event) =>
                    stepPaint.beginPaint(instrument.id, index, event)
                  }
                  onClick={() => handleStepClick(instrument.id, index)}
                />
                {(is808 || isMelody) && step ? (
                  <label className="step-pitch">
                    <span className="sr-only">{`${instrument.label} step ${index + 1} note`}</span>
                    <select
                      className={`step-pitch__select pitch-${pitchEntry?.function ?? "root"}`}
                      value={pitchDegree}
                      aria-label={`${instrument.label} step ${index + 1} note`}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        onPitchChange(index, Number(event.target.value))
                      }
                    >
                      {pitchPalette.map((entry) => (
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
          );
        })}
      </div>
    </section>
  );
}

function getVelocityName(velocity: StepVelocity): "ghost" | "normal" | "accent" {
  if (velocity === 0) {
    return "ghost";
  }

  if (velocity === 2) {
    return "accent";
  }

  return "normal";
}
