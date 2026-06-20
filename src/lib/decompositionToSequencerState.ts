import type { BeatStyleId } from "./beatStyles";
import { clonePattern, createDefaultSequencerState, type SequencerState } from "./patternState";
import { updateSequencerBpm } from "./sequencerDomain";
import type { SongDecomposition } from "./songDecompose";

const DEFAULT_STYLE: BeatStyleId = "trap";

/**
 * Turn a song decomposition into an editable `SequencerState` via the existing
 * domain helpers, so the recreated beat behaves like any other (undo/redo,
 * share links, export all work downstream). The BPM is clamped to the guardrails.
 */
export function decompositionToSequencerState(
  decomp: SongDecomposition,
  styleId: BeatStyleId = DEFAULT_STYLE,
): SequencerState {
  const base = createDefaultSequencerState(styleId);
  const withPattern: SequencerState = {
    ...base,
    pattern: clonePattern(decomp.pattern),
  };
  return updateSequencerBpm(withPattern, decomp.bpm);
}
