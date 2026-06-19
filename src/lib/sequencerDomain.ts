import { BEAT_STYLES, type BeatStyle } from "./beatStyles";
import { updateLaneVolume } from "./laneVolumes";
import { clonePattern, type SequencerState } from "./patternState";
import type { InstrumentId } from "./patterns";
import { updateBassStepPitch, getInKeyPalette, type ScaleDegree } from "./stepPitch";

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
    bassStepPitches: [...sequencer.bassStepPitches],
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
