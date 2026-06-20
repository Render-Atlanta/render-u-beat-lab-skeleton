import { clonePattern, type SequencerState } from "./patternState";
import type { ScaleDegree } from "./stepPitch";
import {
  updateSequencerBassGuitarStepPitch,
  updateSequencerBassStepPitch,
  updateSequencerMelodyStepPitch,
  type PitchedInstrumentId,
} from "./sequencerDomain";

/**
 * Per-lane pitch updater, exhaustive over the pitched lanes so adding a new
 * pitched lane is a compile error rather than a silent gap.
 */
const PITCHED_STEP_PITCH_UPDATERS: Record<
  PitchedInstrumentId,
  (
    sequencer: SequencerState,
    stepIndex: number,
    degree: ScaleDegree,
  ) => SequencerState
> = {
  "808": updateSequencerBassStepPitch,
  bassGuitar: updateSequencerBassGuitarStepPitch,
  melody: updateSequencerMelodyStepPitch,
};

/**
 * Place (or move) a note on a pitched lane: turn the step on AND set its pitch
 * in a single transition. The piano-roll editor clicks a (pitch, step) cell,
 * which both activates the step and chooses its note — one undo entry.
 */
export function setSequencerPitchedStepNote(
  sequencer: SequencerState,
  instrument: PitchedInstrumentId,
  stepIndex: number,
  degree: ScaleDegree,
): SequencerState {
  const withPitch = PITCHED_STEP_PITCH_UPDATERS[instrument](
    sequencer,
    stepIndex,
    degree,
  );
  // The updater already returns a freshly-cloned pattern, so we can turn the
  // step on in place without a second clone.
  withPitch.pattern[instrument][stepIndex] = true;
  return withPitch;
}

/** Clear a pitched-lane step (turn it off); its stored pitch is left intact. */
export function clearSequencerPitchedStep(
  sequencer: SequencerState,
  instrument: PitchedInstrumentId,
  stepIndex: number,
): SequencerState {
  const pattern = clonePattern(sequencer.pattern);
  pattern[instrument][stepIndex] = false;
  return { ...sequencer, pattern };
}
