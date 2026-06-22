import { describe, expect, it } from "vitest";
import { getInKeyPalette } from "./stepPitch";
import {
  countActivePitchedSteps,
  describeMusicalKey,
  resetActiveStepPitches,
  summarizeScalePalette,
  transposeActiveStepPitches,
} from "./musicTheory";
import { createDefaultSequencerState } from "./patternState";

describe("music theory helpers", () => {
  it("describes keys and summarizes scale tones without octave numbers", () => {
    const key = { root: "A", scale: "minor" } as const;
    const summary = summarizeScalePalette(getInKeyPalette(key));

    expect(describeMusicalKey(key)).toBe("A minor");
    expect(summary.slice(0, 3)).toEqual([
      { degree: 0, degreeLabel: "1", noteLabel: "A", function: "root" },
      { degree: 1, degreeLabel: "2", noteLabel: "B", function: "other" },
      { degree: 2, degreeLabel: "b3", noteLabel: "C", function: "third" },
    ]);
  });

  it("transposes only active steps and wraps inside the scale", () => {
    expect(
      transposeActiveStepPitches(
        [0, 1, 6, 4],
        [true, false, true, true],
        1,
        7,
      ),
    ).toEqual([1, 1, 0, 5]);

    expect(
      transposeActiveStepPitches([0], [true], -1, 7),
    ).toEqual([6]);
  });

  it("resets active pitches to the root and counts pitched hits", () => {
    expect(resetActiveStepPitches([3, 4], [true, false])).toEqual([0, 4]);
    expect(countActivePitchedSteps(createDefaultSequencerState("trap").pattern)).toBe(6);
  });
});
