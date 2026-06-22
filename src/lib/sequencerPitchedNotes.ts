import { BEAT_STYLES } from "./beatStyles";
import {
  getBassGuitarPalette,
  updateBassGuitarStepPitch,
} from "./bassGuitarPitch";
import {
  resetActiveStepPitches,
  transposeActiveStepPitches,
} from "./musicTheory";
import { clonePattern, type SequencerState } from "./patternState";
import {
  getInKeyPalette,
  getMelodyPalette,
  updateBassStepPitch,
  updateMelodyStepPitch,
  type ScaleDegree,
} from "./stepPitch";

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

export function updateSequencerBassGuitarStepPitch(
  sequencer: SequencerState,
  stepIndex: number,
  degree: ScaleDegree,
): SequencerState {
  const paletteSize = getBassGuitarPalette(BEAT_STYLES[sequencer.styleId].musicalKey).length;

  return {
    ...sequencer,
    bassGuitarStepPitches: updateBassGuitarStepPitch(
      sequencer.bassGuitarStepPitches,
      stepIndex,
      degree,
      paletteSize,
    ),
    pattern: clonePattern(sequencer.pattern),
  };
}

export function transposeSequencerPitchedNotes(
  sequencer: SequencerState,
  deltaDegrees: number,
): SequencerState {
  const paletteSize = getInKeyPalette(BEAT_STYLES[sequencer.styleId].musicalKey).length;

  return {
    ...sequencer,
    pattern: clonePattern(sequencer.pattern),
    bassStepPitches: transposeActiveStepPitches(
      sequencer.bassStepPitches,
      sequencer.pattern["808"],
      deltaDegrees,
      paletteSize,
    ),
    bassGuitarStepPitches: transposeActiveStepPitches(
      sequencer.bassGuitarStepPitches,
      sequencer.pattern.bassGuitar,
      deltaDegrees,
      paletteSize,
    ),
    melodyStepPitches: transposeActiveStepPitches(
      sequencer.melodyStepPitches,
      sequencer.pattern.melody,
      deltaDegrees,
      paletteSize,
    ),
  };
}

export function resetSequencerPitchedNotes(
  sequencer: SequencerState,
): SequencerState {
  return {
    ...sequencer,
    pattern: clonePattern(sequencer.pattern),
    bassStepPitches: resetActiveStepPitches(
      sequencer.bassStepPitches,
      sequencer.pattern["808"],
    ),
    bassGuitarStepPitches: resetActiveStepPitches(
      sequencer.bassGuitarStepPitches,
      sequencer.pattern.bassGuitar,
    ),
    melodyStepPitches: resetActiveStepPitches(
      sequencer.melodyStepPitches,
      sequencer.pattern.melody,
    ),
  };
}
