import { describe, expect, it } from "vitest";
import { decompositionToSequencerState } from "./decompositionToSequencerState";
import { countActiveSteps } from "./patterns";
import type { SongDecomposition } from "./songDecompose";

const decomp: SongDecomposition = {
  bpm: 124,
  bpmConfidence: 0.8,
  tempoCandidates: [{ bpm: 124, weight: 4 }],
  window: { startMs: 0, bars: 1 },
  pattern: {
    kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
    snare: Array(16).fill(false),
    hat: Array(16).fill(false),
    openHat: Array(16).fill(false),
    clap: Array(16).fill(false),
    "808": Array(16).fill(false),
    bassGuitar: Array(16).fill(false),
    melody: Array(16).fill(false),
  },
  classifications: [],
  overallConfidence: 0.7,
};

describe("decompositionToSequencerState", () => {
  it("carries the decomposed pattern and bpm into a SequencerState", () => {
    const state = decompositionToSequencerState(decomp);
    expect(state.bpm).toBe(124);
    expect(countActiveSteps(state.pattern)).toBe(4);
    expect(state.pattern.kick[0]).toBe(true);
  });

  it("clamps an out-of-range bpm to the guardrails", () => {
    const state = decompositionToSequencerState({ ...decomp, bpm: 999 });
    expect(state.bpm).toBeLessThanOrEqual(180);
  });

  it("does not mutate the source decomposition pattern", () => {
    const state = decompositionToSequencerState(decomp);
    state.pattern.kick[1] = true;
    expect(decomp.pattern.kick[1]).toBe(false);
  });
});
