import { BEAT_STYLES, type BeatStyleId } from "./beatStyles";
import { countActiveSteps, type InstrumentId, type Pattern } from "./patterns";

export interface InstrumentCoachCopy {
  id: InstrumentId;
  label: string;
  role: string;
  editTip: string;
}

export interface StyleCoachMetadata {
  id: BeatStyleId;
  name: string;
  bpm: number;
  swingPercent: number;
  concept: string;
  feelNote: string;
  tryThis: string;
}

export interface PatternChangeSummary {
  styleId: BeatStyleId;
  baseHitCount: number;
  editedHitCount: number;
  densityDelta: number;
  densityLevel: "sparse" | "open" | "balanced" | "busy";
  densitySummary: string;
  pocketSummary: string;
  instrumentSummaries: string[];
  tryThis: string;
}

export const INSTRUMENT_COACH: Record<InstrumentId, InstrumentCoachCopy> = {
  kick: {
    id: "kick",
    label: "Kick",
    role: "The low thump that tells your body where the groove lands.",
    editTip: "Add kicks for bounce; remove them when the beat needs more room.",
  },
  snare: {
    id: "snare",
    label: "Snare",
    role: "The sharp clap that answers the kick and gives the loop its backbeat.",
    editTip: "Keep it steady for a familiar feel, or move one hit to create surprise.",
  },
  hat: {
    id: "hat",
    label: "Closed hat",
    role: "The tight tick that shows the speed of the beat.",
    editTip: "More hats add motion; fewer hats make the groove feel calmer.",
  },
  openHat: {
    id: "openHat",
    label: "Open hat",
    role: "The longer sizzle that points to a turn, lift, or transition.",
    editTip: "Use it sparingly so the accent still feels special.",
  },
};

const STYLE_COACH_NOTES: Record<
  BeatStyleId,
  Pick<StyleCoachMetadata, "concept" | "feelNote" | "tryThis">
> = {
  trap: {
    concept: "Fast hats can make a simple kick and snare feel energetic.",
    feelNote: "Crisp backbeat, busy top line, kick bounce in the gaps.",
    tryThis: "Try muting every other hat, then add one kick before the snare.",
  },
  crunk: {
    concept: "Space leaves room for chants, hooks, and crowd response.",
    feelNote: "Straight pocket, heavy kick, clear snare, simple hat pulse.",
    tryThis: "Try removing two hats and placing one open hat at the very end.",
  },
  drill: {
    concept: "An offset snare can make the groove feel like it leans sideways.",
    feelNote: "Sliding pocket, sharp pauses, hats that dodge around the drums.",
    tryThis: "Try moving one kick later by a step and listen for the lurch.",
  },
  rnb: {
    concept: "A softer groove can feel stronger when it leaves space.",
    feelNote: "Slow pulse, relaxed swing, light hats, warm kick placement.",
    tryThis: "Try deleting one kick and raising swing until the loop relaxes.",
  },
  pop: {
    concept: "A familiar backbeat helps the pattern read quickly.",
    feelNote: "Clean kick/snare center, bright hats, accents that lift the hook.",
    tryThis: "Try adding one open hat before the snare to make the loop lift.",
  },
};

const INSTRUMENT_LABELS: Record<InstrumentId, string> = {
  kick: "Kick",
  snare: "Snare",
  hat: "Hat",
  openHat: "Open hat",
};

const INSTRUMENT_ORDER: InstrumentId[] = ["kick", "snare", "hat", "openHat"];

export function getInstrumentCoach(instrument: InstrumentId): InstrumentCoachCopy {
  return INSTRUMENT_COACH[instrument];
}

export function getStyleCoach(styleId: BeatStyleId): StyleCoachMetadata {
  const style = BEAT_STYLES[styleId];
  const notes = STYLE_COACH_NOTES[styleId];

  return {
    id: style.id,
    name: style.name,
    bpm: style.bpm,
    swingPercent: Math.round(style.swing * 100),
    ...notes,
  };
}

export function summarizePatternChange(
  styleId: BeatStyleId,
  editedPattern: Pattern,
): PatternChangeSummary {
  const style = BEAT_STYLES[styleId];
  const baseHitCount = countActiveSteps(style.pattern);
  const editedHitCount = countActiveSteps(editedPattern);
  const densityDelta = editedHitCount - baseHitCount;
  const styleCoach = getStyleCoach(styleId);

  return {
    styleId,
    baseHitCount,
    editedHitCount,
    densityDelta,
    densityLevel: getDensityLevel(editedHitCount),
    densitySummary: describeDensityChange(densityDelta, editedHitCount, style.name),
    pocketSummary: describePocketChange(style.pattern, editedPattern),
    instrumentSummaries: describeInstrumentChanges(style.pattern, editedPattern),
    tryThis: styleCoach.tryThis,
  };
}

function getDensityLevel(hitCount: number): PatternChangeSummary["densityLevel"] {
  if (hitCount <= 10) {
    return "sparse";
  }

  if (hitCount <= 18) {
    return "open";
  }

  if (hitCount <= 26) {
    return "balanced";
  }

  return "busy";
}

function describeDensityChange(delta: number, hitCount: number, styleName: string): string {
  const level = getDensityLevel(hitCount);

  if (delta === 0) {
    return `Still ${level}: ${hitCount} hits keeps the same density as ${styleName}.`;
  }

  const direction = delta > 0 ? "busier" : "more open";
  const verb = delta > 0 ? "added" : "removed";
  const amount = Math.abs(delta);
  const hitWord = amount === 1 ? "hit" : "hits";

  return `${capitalize(level)}: you ${verb} ${amount} ${hitWord}, so the beat feels ${direction} than ${styleName}.`;
}

function describePocketChange(basePattern: Pattern, editedPattern: Pattern): string {
  const notes: string[] = [];

  if (hasBackbeat(editedPattern.snare)) {
    notes.push("The snare still marks steps 5 and 13, so the center stays easy to follow");
  } else if (hasBackbeat(basePattern.snare)) {
    notes.push("The snare moved away from steps 5 and 13, so the pocket feels less expected");
  } else if (arraysEqual(basePattern.snare, editedPattern.snare)) {
    notes.push("The offset snare pocket stays intact");
  } else {
    notes.push("The snare placement changed, so the pocket has a new lean");
  }

  const kickDelta = countRow(editedPattern.kick) - countRow(basePattern.kick);
  if (kickDelta > 0) {
    notes.push("extra kicks add push");
  } else if (kickDelta < 0) {
    notes.push("fewer kicks leave more space");
  }

  const hatDelta = countRow(editedPattern.hat) - countRow(basePattern.hat);
  if (hatDelta >= 2) {
    notes.push("more hats make the top line move faster");
  } else if (hatDelta <= -2) {
    notes.push("fewer hats make the top line breathe");
  }

  return `${notes.join("; ")}.`;
}

function describeInstrumentChanges(
  basePattern: Pattern,
  editedPattern: Pattern,
): string[] {
  return INSTRUMENT_ORDER.map((instrument) => {
    const baseCount = countRow(basePattern[instrument]);
    const editedCount = countRow(editedPattern[instrument]);
    const delta = editedCount - baseCount;
    const label = INSTRUMENT_LABELS[instrument];

    if (delta === 0) {
      return `${label}: unchanged at ${editedCount} ${hitNoun(editedCount)}.`;
    }

    const direction = delta > 0 ? "up" : "down";
    return `${label}: ${direction} ${Math.abs(delta)} to ${editedCount} ${hitNoun(editedCount)}.`;
  });
}

function countRow(row: boolean[]): number {
  return row.filter(Boolean).length;
}

function hitNoun(count: number): string {
  return count === 1 ? "hit" : "hits";
}

function hasBackbeat(snareRow: boolean[]): boolean {
  return snareRow[4] === true && snareRow[12] === true;
}

function arraysEqual(left: boolean[], right: boolean[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
