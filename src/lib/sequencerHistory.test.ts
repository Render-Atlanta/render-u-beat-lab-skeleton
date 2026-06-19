import { describe, expect, it } from "vitest";
import { createDefaultSequencerState } from "./patternState";
import { updateSequencerBassStepPitch, updateSequencerStep } from "./sequencerDomain";
import {
  HISTORY_LIMIT,
  createHistoryState,
  getHistorySnapshot,
  pushHistorySnapshot,
  redoHistory,
  restoreHistorySnapshot,
  undoHistory,
} from "./sequencerHistory";

describe("sequencer history", () => {
  it("undoes and redoes pattern, velocity, and pitch snapshots", () => {
    const initial = createDefaultSequencerState("trap");
    const firstEdit = updateSequencerStep(initial, "kick", 1);
    const secondEdit = updateSequencerBassStepPitch(firstEdit, 0, 2);
    const history = pushHistorySnapshot(
      pushHistorySnapshot(createHistoryState(), initial, firstEdit),
      firstEdit,
      secondEdit,
    );

    const undo = undoHistory(history, getHistorySnapshot(secondEdit));
    expect(undo.snapshot).toEqual(getHistorySnapshot(firstEdit));
    const restoredUndo = restoreHistorySnapshot(secondEdit, undo.snapshot);
    expect(restoredUndo.pattern).toEqual(firstEdit.pattern);
    expect(restoredUndo.stepVelocities).toEqual(firstEdit.stepVelocities);
    expect(restoredUndo.bassStepPitches).toEqual(firstEdit.bassStepPitches);

    const redo = redoHistory(undo.history, undo.snapshot);
    expect(redo.snapshot).toEqual(getHistorySnapshot(secondEdit));
  });

  it("clears redo when a new snapshot is pushed after undo", () => {
    const initial = createDefaultSequencerState("trap");
    const firstEdit = updateSequencerStep(initial, "kick", 1);
    const secondEdit = updateSequencerStep(firstEdit, "snare", 1);
    const history = pushHistorySnapshot(
      pushHistorySnapshot(createHistoryState(), initial, firstEdit),
      firstEdit,
      secondEdit,
    );
    const undo = undoHistory(history, getHistorySnapshot(secondEdit));

    const divergent = updateSequencerStep(firstEdit, "hat", 1);
    const nextHistory = pushHistorySnapshot(undo.history, firstEdit, divergent);

    expect(nextHistory.redo).toHaveLength(0);
  });

  it("caps undo history", () => {
    let current = createDefaultSequencerState("trap");
    let history = createHistoryState();

    for (let index = 0; index < HISTORY_LIMIT + 5; index += 1) {
      const next = updateSequencerStep(current, "hat", index % 16);
      history = pushHistorySnapshot(history, current, next);
      current = next;
    }

    expect(history.undo).toHaveLength(HISTORY_LIMIT);
  });

  it("does not push when snapshot fields are unchanged", () => {
    const state = createDefaultSequencerState("trap");
    const history = pushHistorySnapshot(createHistoryState(), state, {
      ...state,
      bpm: state.bpm + 1,
    });

    expect(history.undo).toHaveLength(0);
  });
});
