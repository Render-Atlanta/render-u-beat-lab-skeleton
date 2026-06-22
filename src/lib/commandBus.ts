import { BEAT_STYLES } from "./beatStyles";
import {
  setSectionBars,
  type Arrangement,
  type ArrangementSectionId,
} from "./arrangement";
import { addFill as addBeatFill } from "./beatVariation";
import type { CommandAction } from "./commandActions";
import { INSTRUMENTS } from "./instruments";
import { cloneLaneMutes } from "./laneMutes";
import { createDefaultSequencerState, type SequencerState } from "./patternState";
import type { InstrumentId } from "./patterns";
import {
  getSwingPercent,
  updateSequencerBpm,
  updateSequencerSwing,
} from "./sequencerDomain";
import { cloneStepVelocities, DEFAULT_STEP_VELOCITY } from "./stepVelocity";

const DENSITY_STEPS: Record<InstrumentId, number[]> = {
  kick: [0, 8, 6, 10, 14, 3, 12],
  snare: [4, 12, 15, 10, 6],
  hat: [0, 4, 8, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15],
  openHat: [7, 15, 3, 11],
  clap: [4, 12, 15, 10, 6],
  "808": [0, 8, 6, 10, 14, 3, 12],
  bassGuitar: [0, 8, 6, 10, 14, 3, 12],
  melody: [0, 4, 8, 12, 2, 10, 6, 14],
};

const DENSITY_ANCHORS: Record<InstrumentId, number[]> = {
  kick: [0],
  snare: [4, 12],
  hat: [0, 4, 8, 12],
  openHat: [],
  clap: [4, 12],
  "808": [0],
  bassGuitar: [0],
  melody: [],
};

const SECTION_LABELS: Record<ArrangementSectionId, string> = {
  intro: "Intro",
  main: "Main",
  variation: "Variation",
  outro: "Outro",
};

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
    case "setLaneMute":
      return {
        ...sequencer,
        laneMutes: {
          ...cloneLaneMutes(sequencer.laneMutes),
          [action.instrumentId]: action.muted,
        },
      };
    case "adjustLaneDensity":
      return adjustLaneDensity(sequencer, action.instrumentId, action.direction);
    case "addFill": {
      const fill = addBeatFill(
        {
          pattern: sequencer.pattern,
          stepVelocities: sequencer.stepVelocities,
          styleId: sequencer.styleId,
        },
        0xfacefeed,
      );
      return {
        ...sequencer,
        pattern: fill.pattern,
        stepVelocities: fill.stepVelocities,
      };
    }
    case "setSectionBars":
    case "adjustArrangementBars":
    case "doubleArrangement":
      return sequencer;
    case "unknown":
      return sequencer;
  }
}

export function applyArrangementAction(
  action: CommandAction,
  arrangement: Arrangement,
): Arrangement {
  switch (action.kind) {
    case "setSectionBars":
      return setSectionBars(arrangement, action.sectionId, action.bars);
    case "adjustArrangementBars": {
      const section = arrangement.sections.find((item) => item.id === action.sectionId);
      return setSectionBars(
        arrangement,
        action.sectionId,
        (section?.bars ?? 1) + action.deltaBars,
      );
    }
    case "doubleArrangement":
      if (action.sectionId) {
        const section = arrangement.sections.find((item) => item.id === action.sectionId);
        return setSectionBars(arrangement, action.sectionId, (section?.bars ?? 1) * 2);
      }
      return {
        sections: arrangement.sections.map((section) =>
          setSectionBars(arrangement, section.id, section.bars * 2)
            .sections.find((item) => item.id === section.id) ?? section,
        ),
      };
    default:
      return arrangement;
  }
}

export function isArrangementAction(action: CommandAction): boolean {
  return (
    action.kind === "setSectionBars" ||
    action.kind === "adjustArrangementBars" ||
    action.kind === "doubleArrangement"
  );
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
    case "setLaneMute":
      return `${action.muted ? "Muted" : "Unmuted"} the ${getInstrumentLabel(action.instrumentId)} lane.`;
    case "adjustLaneDensity":
      return action.direction === "busier"
        ? `Made the ${getInstrumentLabel(action.instrumentId)} lane busier.`
        : `Made the ${getInstrumentLabel(action.instrumentId)} lane sparser.`;
    case "addFill":
      return "Added a fill into the loop.";
    case "setSectionBars":
      return `Set ${SECTION_LABELS[action.sectionId]} to ${action.bars} bars.`;
    case "adjustArrangementBars":
      return action.deltaBars < 0
        ? `Shortened ${SECTION_LABELS[action.sectionId]}.`
        : `Extended ${SECTION_LABELS[action.sectionId]}.`;
    case "doubleArrangement":
      return action.sectionId
        ? `Doubled ${SECTION_LABELS[action.sectionId]}.`
        : "Doubled the arrangement.";
    case "unknown":
      return "I didn't catch that. Try: \"slower\", \"mute hats\", or \"make main 8 bars\".";
  }
}

function adjustLaneDensity(
  sequencer: SequencerState,
  instrumentId: InstrumentId,
  direction: "busier" | "sparser",
): SequencerState {
  const pattern = {
    ...sequencer.pattern,
    [instrumentId]: [...sequencer.pattern[instrumentId]],
  };
  const stepVelocities = cloneStepVelocities(sequencer.stepVelocities);
  const lane = pattern[instrumentId];

  if (direction === "busier") {
    let added = 0;
    for (const step of DENSITY_STEPS[instrumentId]) {
      if (!lane[step]) {
        lane[step] = true;
        stepVelocities[instrumentId][step] = DEFAULT_STEP_VELOCITY;
        added += 1;
      }
      if (added >= 2) {
        break;
      }
    }
  } else {
    const anchors = new Set(DENSITY_ANCHORS[instrumentId]);
    let removed = 0;
    for (const step of [...DENSITY_STEPS[instrumentId]].reverse()) {
      if (lane[step] && !anchors.has(step)) {
        lane[step] = false;
        stepVelocities[instrumentId][step] = DEFAULT_STEP_VELOCITY;
        removed += 1;
      }
      if (removed >= 2) {
        break;
      }
    }
  }

  return {
    ...sequencer,
    pattern,
    stepVelocities,
  };
}

function getInstrumentLabel(instrumentId: InstrumentId): string {
  return INSTRUMENTS.find((instrument) => instrument.id === instrumentId)?.label ?? instrumentId;
}
