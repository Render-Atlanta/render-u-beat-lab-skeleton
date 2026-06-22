import { BEAT_STYLES } from "./beatStyles";
import type { CommandAction } from "./commandActions";
import { createDefaultSequencerState, type SequencerState } from "./patternState";
import {
  getSwingPercent,
  updateSequencerBpm,
  updateSequencerSwing,
} from "./sequencerDomain";

/** Pure: maps an action onto a new SequencerState using existing domain rules. */
export function applyAction(
  action: CommandAction,
  sequencer: SequencerState,
): SequencerState {
  switch (action.kind) {
    case "selectStyle":
      return {
        ...createDefaultSequencerState(action.styleId),
        sampleKitId: sequencer.sampleKitId,
      };
    case "setTempo": {
      const bpm =
        action.mode === "absolute"
          ? action.bpm
          : sequencer.bpm + action.deltaBpm;
      return updateSequencerBpm(sequencer, bpm);
    }
    case "setSwing": {
      const percent =
        action.mode === "absolute"
          ? action.swingPercent
          : getSwingPercent(sequencer.swing) + action.deltaPercent;
      return updateSequencerSwing(sequencer, percent);
    }
    case "unknown":
      return sequencer;
  }
}

/** Pure: a short human-facing confirmation for the command bar status line. */
export function describeAction(action: CommandAction): string {
  switch (action.kind) {
    case "selectStyle":
      return `Switched to ${BEAT_STYLES[action.styleId].name}.`;
    case "setTempo":
      if (action.mode === "absolute") {
        return `Set the tempo to ${action.bpm} BPM.`;
      }
      return action.deltaBpm < 0 ? "Slowed the tempo down." : "Sped the tempo up.";
    case "setSwing":
      if (action.mode === "absolute") {
        return `Set the swing to ${action.swingPercent}%.`;
      }
      return action.deltaPercent < 0 ? "Tightened the swing." : "Loosened the swing.";
    case "unknown":
      return "I didn't catch that. Try: \"slower\", \"more swing\", or \"make it trap\".";
  }
}
