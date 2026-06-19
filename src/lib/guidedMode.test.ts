import { describe, expect, it } from "vitest";
import { INSTRUMENTS } from "./instruments";
import { BEAT_STYLES } from "./beatStyles";
import { clonePattern } from "./patternState";
import type { InstrumentId } from "./patterns";
import {
  advanceGuidedStep,
  exitGuided,
  getGuidedSequence,
  getRevealedLaneIds,
  isLastGuidedStep,
  maskPatternToLanes,
  skipGuided,
  startGuidedState,
  type GuidedModeState,
} from "./guidedMode";

const SEQUENCE = INSTRUMENTS.map((instrument) => instrument.id);
const LAST = SEQUENCE.length - 1;

describe("getGuidedSequence", () => {
  it("mirrors the INSTRUMENTS order exactly", () => {
    expect(getGuidedSequence()).toEqual(SEQUENCE);
  });
});

describe("guided state transitions", () => {
  it("starts active on the first lane", () => {
    expect(startGuidedState()).toEqual({ active: true, stepIndex: 0 });
  });

  it("advances one step at a time", () => {
    expect(advanceGuidedStep({ active: true, stepIndex: 0 })).toEqual({
      active: true,
      stepIndex: 1,
    });
  });

  it("deactivates (reveals all) when advancing past the last lane", () => {
    expect(advanceGuidedStep({ active: true, stepIndex: LAST })).toEqual({
      active: false,
      stepIndex: LAST,
    });
  });

  it("is a no-op when advancing an inactive state", () => {
    const state: GuidedModeState = { active: false, stepIndex: 2 };
    expect(advanceGuidedStep(state)).toBe(state);
  });

  it("skip jumps straight to the full grid", () => {
    expect(skipGuided({ active: true, stepIndex: 1 })).toEqual({
      active: false,
      stepIndex: LAST,
    });
  });

  it("exit leaves guided but keeps the current step index", () => {
    expect(exitGuided({ active: true, stepIndex: 2 })).toEqual({
      active: false,
      stepIndex: 2,
    });
  });

  it("flags the last step for Finish vs Next copy", () => {
    expect(isLastGuidedStep({ active: true, stepIndex: LAST })).toBe(true);
    expect(isLastGuidedStep({ active: true, stepIndex: 0 })).toBe(false);
  });
});

describe("getRevealedLaneIds", () => {
  it("reveals lanes up to and including the current step when active", () => {
    expect(getRevealedLaneIds({ active: true, stepIndex: 0 })).toEqual(
      SEQUENCE.slice(0, 1),
    );
    expect(getRevealedLaneIds({ active: true, stepIndex: 2 })).toEqual(
      SEQUENCE.slice(0, 3),
    );
  });

  it("reveals every lane when inactive", () => {
    expect(getRevealedLaneIds({ active: false, stepIndex: 0 })).toEqual(SEQUENCE);
  });
});

describe("maskPatternToLanes", () => {
  it("zeroes lanes that are not revealed and preserves revealed lanes", () => {
    const pattern = clonePattern(BEAT_STYLES.trap.pattern);
    const revealed: InstrumentId[] = ["kick", "snare"];
    const masked = maskPatternToLanes(pattern, revealed);

    expect(masked.kick).toEqual(pattern.kick);
    expect(masked.snare).toEqual(pattern.snare);
    for (const instrument of INSTRUMENTS) {
      if (revealed.includes(instrument.id)) continue;
      expect(masked[instrument.id].every((step) => step === false)).toBe(true);
    }
  });

  it("does not mutate the input pattern", () => {
    const pattern = clonePattern(BEAT_STYLES.trap.pattern);
    const before = clonePattern(pattern);
    maskPatternToLanes(pattern, ["kick"]);
    expect(pattern).toEqual(before);
  });
});
