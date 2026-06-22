import { INSTRUMENTS, type InstrumentOption } from "../lib/instruments";
import { DEFAULT_LANE_VOLUME } from "../lib/laneVolumes";
import type { InstrumentId, Pattern } from "../lib/patterns";
import type { LaneVolumes } from "../lib/laneVolumes";
import type { LaneMutes } from "../lib/laneMutes";
import type { AudioEngineKind } from "../audio/audioEngine";
import type { SampleKitId, SampleKitOption } from "../audio/sampleKit";
import type { BassStepPitches, MelodyStepPitches, PaletteEntry } from "../lib/stepPitch";
import { getVelocityName, type StepVelocities } from "../lib/stepVelocity";
import type { BassGuitarStepPitches } from "../lib/bassGuitarPitch";
import type { MixEffects } from "../lib/mixEffects";
import { BeatRuler } from "./BeatRuler";
import { StepPitchSelect } from "./StepPitchSelect";
import { SequencerControls } from "./SequencerControls";
import { useStepPaint } from "./useStepPaint";
type PitchLaneConfig = { pitches: number[]; palette: PaletteEntry[]; onChange: (index: number, degree: number) => void };

export interface SequencerPanelProps {
  styleName: string;
  activeSteps: number;
  bpm: number;
  swingPercent: number;
  audioEngineKind: AudioEngineKind;
  sampleKitId: SampleKitId;
  sampleKitOptions: readonly SampleKitOption[];
  pattern: Pattern;
  laneVolumes: LaneVolumes;
  laneMutes: LaneMutes;
  mixEffects: MixEffects;
  stepVelocities: StepVelocities;
  bassStepPitches: BassStepPitches;
  bassPalette: PaletteEntry[];
  bassGuitarStepPitches: BassGuitarStepPitches;
  bassGuitarPalette: PaletteEntry[];
  melodyStepPitches: MelodyStepPitches;
  melodyPalette: PaletteEntry[];
  activeStep: number | null;
  canUndo: boolean;
  canRedo: boolean;
  visibleInstruments?: InstrumentOption[];
  onBpmChange: (bpm: number) => void;
  onTapTempo: () => void;
  onSwingChange: (swingPercent: number) => void;
  onAudioEngineKindChange: (kind: AudioEngineKind) => void;
  onSampleKitChange: (kitId: SampleKitId) => void;
  onLaneVolumeChange: (instrument: InstrumentId, volume: number) => void;
  onLaneVolumeReset: (instrument: InstrumentId) => void;
  onLaneMuteToggle: (instrument: InstrumentId) => void;
  onMixEffectsChange: (effects: Partial<MixEffects>) => void;
  onReset: () => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onMakeVariation: () => void;
  onAddFill: () => void;
  onHumanize: () => void;
  onShare: () => void;
  countInEnabled: boolean;
  metronomeEnabled: boolean;
  onCountInToggle: () => void;
  onMetronomeToggle: () => void;
  onToggleStep: (instrument: InstrumentId, stepIndex: number) => void;
  onPaintStep: (instrument: InstrumentId, stepIndex: number) => void;
  onBassStepPitchChange: (stepIndex: number, degree: number) => void;
  onBassGuitarStepPitchChange: (stepIndex: number, degree: number) => void;
  onMelodyStepPitchChange: (stepIndex: number, degree: number) => void;
}

export function SequencerPanel({
  styleName,
  activeSteps,
  bpm,
  swingPercent,
  audioEngineKind,
  sampleKitId,
  sampleKitOptions,
  pattern,
  laneVolumes,
  laneMutes,
  mixEffects,
  stepVelocities,
  bassStepPitches,
  bassPalette,
  bassGuitarStepPitches,
  bassGuitarPalette,
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
  onSampleKitChange,
  onLaneVolumeChange,
  onLaneVolumeReset,
  onLaneMuteToggle,
  onMixEffectsChange,
  onReset,
  onClear,
  onUndo,
  onRedo,
  onMakeVariation,
  onAddFill,
  onHumanize,
  onShare,
  countInEnabled,
  metronomeEnabled,
  onCountInToggle,
  onMetronomeToggle,
  onToggleStep,
  onPaintStep,
  onBassStepPitchChange,
  onBassGuitarStepPitchChange,
  onMelodyStepPitchChange,
}: SequencerPanelProps) {
  const stepPaint = useStepPaint(onPaintStep);

  const pitchLanes: Partial<Record<InstrumentId, PitchLaneConfig>> = {
    "808": { pitches: bassStepPitches, palette: bassPalette, onChange: onBassStepPitchChange },
    bassGuitar: { pitches: bassGuitarStepPitches, palette: bassGuitarPalette, onChange: onBassGuitarStepPitchChange },
    melody: { pitches: melodyStepPitches, palette: melodyPalette, onChange: onMelodyStepPitchChange },
  };

  function handleStepClick(instrument: InstrumentId, stepIndex: number) {
    if (stepPaint.shouldSuppressClick()) return;
    onToggleStep(instrument, stepIndex);
  }

  return (
    <section className="panel grid-panel">
      <div className="panel-header split">
        <div>
          <p className="eyebrow">Pattern</p>
          <h2 className="heading">{styleName}</h2>
        </div>
        <div className="stat-block"><span>{activeSteps}</span>hits</div>
      </div>

      <SequencerControls
        bpm={bpm}
        swingPercent={swingPercent}
        mixEffects={mixEffects}
        audioEngineKind={audioEngineKind}
        sampleKitId={sampleKitId}
        sampleKitOptions={sampleKitOptions}
        canUndo={canUndo}
        canRedo={canRedo}
        onBpmChange={onBpmChange}
        onTapTempo={onTapTempo}
        onSwingChange={onSwingChange}
        onMixEffectsChange={onMixEffectsChange}
        onAudioEngineKindChange={onAudioEngineKindChange}
        onSampleKitChange={onSampleKitChange}
        onUndo={onUndo}
        onRedo={onRedo}
        onClear={onClear}
        onReset={onReset}
        onShare={onShare}
        onMakeVariation={onMakeVariation}
        onAddFill={onAddFill}
        onHumanize={onHumanize}
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
              const pitched = pitchLanes[instrument.id];
              const pitchDegree = pitched ? pitched.pitches[index] : 0;
              const pitchEntry =
                pitched && step ? pitched.palette[pitchDegree] : null;
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
                  onPointerDown={(event) => stepPaint.beginPaint(instrument.id, index, event)}
                  onClick={() => handleStepClick(instrument.id, index)}
                />
                {pitched && step ? (
                  <StepPitchSelect
                    label={instrument.label}
                    stepIndex={index}
                    degree={pitchDegree}
                    palette={pitched.palette}
                    onChange={pitched.onChange}
                  />
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
