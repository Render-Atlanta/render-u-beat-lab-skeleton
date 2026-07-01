import { useState } from "react";
import { INSTRUMENTS, type InstrumentOption } from "../lib/instruments";
import type { InstrumentId, Pattern } from "../lib/patterns";
import type { LaneVolumes } from "../lib/laneVolumes";
import type { LaneMutes } from "../lib/laneMutes";
import type { AudioEngineKind } from "../audio/audioEngine";
import type { SampleKitId, SampleKitOption } from "../audio/sampleKit";
import type { BassStepPitches, MelodyStepPitches, PaletteEntry } from "../lib/stepPitch";
import { getVelocityName, type StepVelocities } from "../lib/stepVelocity";
import type { BassGuitarStepPitches } from "../lib/bassGuitarPitch";
import type { MixEffects } from "../lib/mixEffects";
import type { LaneVoiceId, LaneVoiceSelection, VoicedLane } from "../lib/laneVoiceSelection";
import { BeatRuler } from "./BeatRuler";
import { StepPitchSelect } from "./StepPitchSelect";
import { SequencerControls } from "./SequencerControls";
import { StepLegend } from "./StepLegend";
import { TrackLabel } from "./TrackLabel";
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
  laneVoices: LaneVoiceSelection;
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
  onLaneVoiceChange: (lane: VoicedLane, id: LaneVoiceId) => void;
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
  laneVoices,
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
  onLaneVoiceChange,
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
  // Mobile pager: which 8-step half of the bar is visible. Desktop ignores this
  // (CSS only acts on it under [data-mobile]), so step indices stay absolute.
  const [page, setPage] = useState<0 | 1>(0);

  const pitchLanes: Partial<Record<InstrumentId, PitchLaneConfig>> = {
    "808": { pitches: bassStepPitches, palette: bassPalette, onChange: onBassStepPitchChange },
    bassGuitar: { pitches: bassGuitarStepPitches, palette: bassGuitarPalette, onChange: onBassGuitarStepPitchChange },
    melody: { pitches: melodyStepPitches, palette: melodyPalette, onChange: onMelodyStepPitchChange },
  };

  function handleStepClick(instrument: InstrumentId, stepIndex: number) {
    if (!stepPaint.shouldSuppressClick()) onToggleStep(instrument, stepIndex);
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
        laneVoices={laneVoices}
        canUndo={canUndo}
        canRedo={canRedo}
        onBpmChange={onBpmChange}
        onTapTempo={onTapTempo}
        onSwingChange={onSwingChange}
        onMixEffectsChange={onMixEffectsChange}
        onAudioEngineKindChange={onAudioEngineKindChange}
        onSampleKitChange={onSampleKitChange}
        onLaneVoiceChange={onLaneVoiceChange}
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
      {activeSteps === 0 ? (
        <p className="grid-empty-hint">
          ★ Empty grid — tap any pad to drop a hit, or pick a starting pocket
          above.
        </p>
      ) : null}
      {/* Mobile-only pager (hidden on desktop via CSS) — swaps the visible 8 steps. */}
      <div className="beat-pager" role="group" aria-label="Beat page">
        <button
          type="button"
          className={`beat-pager__btn${page === 0 ? " active" : ""}`}
          aria-pressed={page === 0}
          onClick={() => setPage(0)}
        >
          Beats 1 · 2
        </button>
        <button
          type="button"
          className={`beat-pager__btn${page === 1 ? " active" : ""}`}
          aria-pressed={page === 1}
          onClick={() => setPage(1)}
        >
          Beats 3 · 4
        </button>
      </div>
      <div
        className="step-grid"
        data-page={page}
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
            <TrackLabel
              instrument={instrument}
              muted={muted}
              volume={laneVolumes[instrument.id]}
              onMuteToggle={() => onLaneMuteToggle(instrument.id)}
              onVolumeChange={(volume) => onLaneVolumeChange(instrument.id, volume)}
              onVolumeReset={() => onLaneVolumeReset(instrument.id)}
            />
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
      <StepLegend />
    </section>
  );
}
