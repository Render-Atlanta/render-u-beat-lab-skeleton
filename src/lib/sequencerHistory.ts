import { clonePattern, type SequencerState } from "./patternState";
import type { Pattern } from "./patterns";
import {
  cloneBassStepPitches,
  cloneMelodyStepPitches,
  type BassStepPitches,
  type MelodyStepPitches,
} from "./stepPitch";
import {
  cloneBassGuitarStepPitches,
  type BassGuitarStepPitches,
} from "./bassGuitarPitch";
import { cloneStepVelocities, type StepVelocities } from "./stepVelocity";

export const HISTORY_LIMIT = 40;

export interface SequencerHistorySnapshot {
  pattern: Pattern;
  stepVelocities: StepVelocities;
  bassStepPitches: BassStepPitches;
  bassGuitarStepPitches: BassGuitarStepPitches;
  melodyStepPitches: MelodyStepPitches;
}

export interface SequencerHistoryState {
  undo: SequencerHistorySnapshot[];
  redo: SequencerHistorySnapshot[];
}

export function createHistoryState(): SequencerHistoryState {
  return { undo: [], redo: [] };
}

export function getHistorySnapshot(
  sequencer: SequencerState,
): SequencerHistorySnapshot {
  return {
    pattern: clonePattern(sequencer.pattern),
    stepVelocities: cloneStepVelocities(sequencer.stepVelocities),
    bassStepPitches: cloneBassStepPitches(sequencer.bassStepPitches),
    bassGuitarStepPitches: cloneBassGuitarStepPitches(
      sequencer.bassGuitarStepPitches,
    ),
    melodyStepPitches: cloneMelodyStepPitches(sequencer.melodyStepPitches),
  };
}

export function restoreHistorySnapshot(
  sequencer: SequencerState,
  snapshot: SequencerHistorySnapshot,
): SequencerState {
  return {
    ...sequencer,
    pattern: clonePattern(snapshot.pattern),
    stepVelocities: cloneStepVelocities(snapshot.stepVelocities),
    bassStepPitches: cloneBassStepPitches(snapshot.bassStepPitches),
    bassGuitarStepPitches: cloneBassGuitarStepPitches(
      snapshot.bassGuitarStepPitches,
    ),
    melodyStepPitches: cloneMelodyStepPitches(snapshot.melodyStepPitches),
  };
}

export function pushHistorySnapshot(
  history: SequencerHistoryState,
  previous: SequencerState,
  next: SequencerState,
): SequencerHistoryState {
  const previousSnapshot = getHistorySnapshot(previous);
  if (snapshotsEqual(previousSnapshot, getHistorySnapshot(next))) {
    return history;
  }

  return {
    undo: [...history.undo, previousSnapshot].slice(-HISTORY_LIMIT),
    redo: [],
  };
}

export function undoHistory(
  history: SequencerHistoryState,
  current: SequencerHistorySnapshot,
): { history: SequencerHistoryState; snapshot: SequencerHistorySnapshot } {
  const snapshot = history.undo.at(-1);
  if (!snapshot) {
    return { history, snapshot: current };
  }

  return {
    history: {
      undo: history.undo.slice(0, -1),
      redo: [cloneSnapshot(current), ...history.redo],
    },
    snapshot: cloneSnapshot(snapshot),
  };
}

export function redoHistory(
  history: SequencerHistoryState,
  current: SequencerHistorySnapshot,
): { history: SequencerHistoryState; snapshot: SequencerHistorySnapshot } {
  const snapshot = history.redo[0];
  if (!snapshot) {
    return { history, snapshot: current };
  }

  return {
    history: {
      undo: [...history.undo, cloneSnapshot(current)].slice(-HISTORY_LIMIT),
      redo: history.redo.slice(1),
    },
    snapshot: cloneSnapshot(snapshot),
  };
}

function cloneSnapshot(
  snapshot: SequencerHistorySnapshot,
): SequencerHistorySnapshot {
  return {
    pattern: clonePattern(snapshot.pattern),
    stepVelocities: cloneStepVelocities(snapshot.stepVelocities),
    bassStepPitches: cloneBassStepPitches(snapshot.bassStepPitches),
    bassGuitarStepPitches: cloneBassGuitarStepPitches(
      snapshot.bassGuitarStepPitches,
    ),
    melodyStepPitches: cloneMelodyStepPitches(snapshot.melodyStepPitches),
  };
}

function snapshotsEqual(
  left: SequencerHistorySnapshot,
  right: SequencerHistorySnapshot,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
