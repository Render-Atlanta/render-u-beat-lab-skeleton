import { BEAT_STYLES, type BeatStyle } from "./beatStyles";
import { updateLaneVolume } from "./laneVolumes";
import { clonePattern, togglePatternStep, type SequencerState } from "./patternState";
import type { InstrumentId } from "./patterns";
import {
  updateBassStepPitch,
  updateMelodyStepPitch,
  getInKeyPalette,
  getMelodyPalette,
  type ScaleDegree,
} from "./stepPitch";
import {
  cloneStepVelocities,
  cycleStepVelocity,
  DEFAULT_STEP_VELOCITY,
} from "./stepVelocity";

export const MIN_BPM = 60;
export const MAX_BPM = 180;
export const MIN_SWING_PERCENT = 0;
export const MAX_SWING_PERCENT = 30;
export const BEATS_PER_LOOP = 4;

export function createPlayableStyle(sequencer: SequencerState): BeatStyle {
  const baseStyle = BEAT_STYLES[sequencer.styleId];

  return {
    ...baseStyle,
    bpm: sequencer.bpm,
    swing: sequencer.swing,
    pattern: clonePattern(sequencer.pattern),
    laneVolumes: { ...sequencer.laneVolumes },
    stepVelocities: cloneStepVelocities(sequencer.stepVelocities),
    bassStepPitches: [...sequencer.bassStepPitches],
    melodyStepPitches: [...sequencer.melodyStepPitches],
  };
}

export function updateSequencerStep(
  sequencer: SequencerState,
  instrument: InstrumentId,
  stepIndex: number,
): SequencerState {
  if (isPitchedLane(instrument)) {
    return {
      ...sequencer,
      pattern: togglePatternStep(sequencer.pattern, instrument, stepIndex),
      stepVelocities: cloneStepVelocities(sequencer.stepVelocities),
    };
  }

  const pattern = clonePattern(sequencer.pattern);
  const stepVelocities = cloneStepVelocities(sequencer.stepVelocities);
  const next = cycleStepVelocity(
    pattern[instrument][stepIndex],
    stepVelocities[instrument][stepIndex],
  );

  pattern[instrument][stepIndex] = next.on;
  stepVelocities[instrument][stepIndex] = next.velocity;

  return {
    ...sequencer,
    pattern,
    stepVelocities,
  };
}

export function paintSequencerStep(
  sequencer: SequencerState,
  instrument: InstrumentId,
  stepIndex: number,
): SequencerState {
  if (isPitchedLane(instrument)) {
    return sequencer;
  }

  if (
    sequencer.pattern[instrument][stepIndex] &&
    sequencer.stepVelocities[instrument][stepIndex] === DEFAULT_STEP_VELOCITY
  ) {
    return sequencer;
  }

  const pattern = clonePattern(sequencer.pattern);
  const stepVelocities = cloneStepVelocities(sequencer.stepVelocities);
  pattern[instrument][stepIndex] = true;
  stepVelocities[instrument][stepIndex] = DEFAULT_STEP_VELOCITY;

  return {
    ...sequencer,
    pattern,
    stepVelocities,
  };
}

export function updateSequencerLaneVolume(
  sequencer: SequencerState,
  instrument: InstrumentId,
  volume: number,
): SequencerState {
  return {
    ...sequencer,
    laneVolumes: updateLaneVolume(sequencer.laneVolumes, instrument, volume),
    pattern: clonePattern(sequencer.pattern),
  };
}

export function resetSequencerLaneVolume(
  sequencer: SequencerState,
  instrument: InstrumentId,
): SequencerState {
  return updateSequencerLaneVolume(sequencer, instrument, 1);
}

export function updateSequencerBassStepPitch(
  sequencer: SequencerState,
  stepIndex: number,
  degree: ScaleDegree,
): SequencerState {
  const paletteSize = getInKeyPalette(BEAT_STYLES[sequencer.styleId].musicalKey).length;

  return {
    ...sequencer,
    bassStepPitches: updateBassStepPitch(
      sequencer.bassStepPitches,
      stepIndex,
      degree,
      paletteSize,
    ),
    pattern: clonePattern(sequencer.pattern),
  };
}

export function updateSequencerMelodyStepPitch(
  sequencer: SequencerState,
  stepIndex: number,
  degree: ScaleDegree,
): SequencerState {
  const paletteSize = getMelodyPalette(BEAT_STYLES[sequencer.styleId].musicalKey).length;

  return {
    ...sequencer,
    melodyStepPitches: updateMelodyStepPitch(
      sequencer.melodyStepPitches,
      stepIndex,
      degree,
      paletteSize,
    ),
    pattern: clonePattern(sequencer.pattern),
  };
}

export function updateSequencerBpm(
  sequencer: SequencerState,
  bpm: number,
): SequencerState {
  if (!Number.isFinite(bpm)) {
    return sequencer;
  }

  return {
    ...sequencer,
    bpm: clampRoundedNumber(bpm, MIN_BPM, MAX_BPM),
    pattern: clonePattern(sequencer.pattern),
  };
}

export function updateSequencerSwing(
  sequencer: SequencerState,
  swingPercent: number,
): SequencerState {
  if (!Number.isFinite(swingPercent)) {
    return sequencer;
  }

  return {
    ...sequencer,
    swing: clampSwingPercent(swingPercent) / 100,
    pattern: clonePattern(sequencer.pattern),
  };
}

export function getSwingPercent(swing: number): number {
  return clampSwingPercent(Math.round(swing * 100));
}

export function clampSwingPercent(swingPercent: number): number {
  return clampRoundedNumber(swingPercent, MIN_SWING_PERCENT, MAX_SWING_PERCENT);
}

export function getSequencerLoopDurationMs(bpm: number): number {
  return (60_000 / clampRoundedNumber(bpm, MIN_BPM, MAX_BPM)) * BEATS_PER_LOOP;
}

function clampRoundedNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function isPitchedLane(instrument: InstrumentId): boolean {
  return instrument === "808" || instrument === "melody";
}
