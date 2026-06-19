import { INSTRUMENTS } from "./instruments";
import { clonePattern } from "./patternState";
import type { InstrumentId, Pattern } from "./patterns";

export interface GuidedModeState {
  /** True while the user is being walked through the layers. */
  active: boolean;
  /** Index into the guided sequence of the lane currently being introduced. */
  stepIndex: number;
}

const SEQUENCE: InstrumentId[] = INSTRUMENTS.map((instrument) => instrument.id);
const LAST_INDEX = SEQUENCE.length - 1;

/** The introduce-one-at-a-time order, derived from INSTRUMENTS (single source of truth). */
export function getGuidedSequence(): InstrumentId[] {
  return [...SEQUENCE];
}

export function startGuidedState(): GuidedModeState {
  return { active: true, stepIndex: 0 };
}

/** Reveal the next lane; advancing past the final lane reveals everything (free grid). */
export function advanceGuidedStep(state: GuidedModeState): GuidedModeState {
  if (!state.active) {
    return state;
  }
  if (state.stepIndex >= LAST_INDEX) {
    return { active: false, stepIndex: LAST_INDEX };
  }
  return { active: true, stepIndex: state.stepIndex + 1 };
}

/** Jump straight to the full free-form grid. */
export function skipGuided(_state: GuidedModeState): GuidedModeState {
  return { active: false, stepIndex: LAST_INDEX };
}

/** Leave guided mode but keep where the user was (used by the Exit button). */
export function exitGuided(state: GuidedModeState): GuidedModeState {
  return { active: false, stepIndex: state.stepIndex };
}

/** True when stepIndex is the final lane — drives the Next-vs-Finish button copy. Independent of `active`. */
export function isLastGuidedStep(state: GuidedModeState): boolean {
  return state.stepIndex >= LAST_INDEX;
}

/** Lanes the user can see/hear: up to the current step while active, all lanes otherwise. */
export function getRevealedLaneIds(state: GuidedModeState): InstrumentId[] {
  const sequence = getGuidedSequence();
  return state.active ? sequence.slice(0, state.stepIndex + 1) : sequence;
}

/** Non-mutating copy of `pattern` with any lane not in `revealedIds` silenced (all steps off). */
export function maskPatternToLanes(
  pattern: Pattern,
  revealedIds: InstrumentId[],
): Pattern {
  const revealed = new Set(revealedIds);
  const masked = clonePattern(pattern);
  // Silence every lane of the pattern that has not been revealed yet — keyed off
  // the pattern's own lanes so a lane absent from the guided sequence is still muted.
  for (const id of Object.keys(masked) as InstrumentId[]) {
    if (!revealed.has(id)) {
      masked[id] = masked[id].map(() => false);
    }
  }
  return masked;
}
