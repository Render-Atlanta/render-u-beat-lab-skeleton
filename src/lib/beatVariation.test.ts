import { describe, expect, it } from "vitest";
import { addFill, makeVariation, type BeatVariationInput } from "./beatVariation";
import { patternFromSteps } from "./patterns";
import { createDefaultStepVelocities } from "./stepVelocity";

function makeInput(styleId: BeatVariationInput["styleId"]): BeatVariationInput {
  return {
    // A trap-ish starter: kick on the downbeats, snare/clap backbeat, busy hats,
    // an 808 line, and an empty last beat on hat/snare so a fill is visible.
    pattern: patternFromSteps({
      kick: [1, 5, 9, 13],
      snare: [5, 13],
      hat: [1, 3, 5, 7, 9, 11],
      openHat: [7],
      clap: [5, 13],
      "808": [1, 9],
      bassGuitar: [1, 9],
      melody: [3, 11],
    }),
    stepVelocities: createDefaultStepVelocities(),
    styleId,
  };
}

const DOWNBEATS = [0, 4, 8, 12];

describe("makeVariation", () => {
  it("is deterministic for a given seed", () => {
    const a = makeVariation(makeInput("trap"), 555);
    const b = makeVariation(makeInput("trap"), 555);
    expect(a).toEqual(b);
  });

  it("keeps the backbeat, downbeat kicks, and melodic lanes intact", () => {
    const input = makeInput("trap");
    for (let seed = 1; seed <= 25; seed += 1) {
      const { pattern } = makeVariation(input, seed);
      // Snare/clap backbeat untouched.
      expect(pattern.snare).toEqual(input.pattern.snare);
      expect(pattern.clap).toEqual(input.pattern.clap);
      // Downbeat kicks preserved (variation only nudges off-downbeat kicks).
      for (const d of DOWNBEATS) {
        expect(pattern.kick[d]).toBe(input.pattern.kick[d]);
      }
      // Melodic lanes carry the harmony — never altered by a drum variation.
      expect(pattern["808"]).toEqual(input.pattern["808"]);
      expect(pattern.bassGuitar).toEqual(input.pattern.bassGuitar);
      expect(pattern.melody).toEqual(input.pattern.melody);
      // The downbeat-1 hat pulse stays.
      expect(pattern.hat[0]).toBe(input.pattern.hat[0]);
    }
  });

  it("always changes at least one step", () => {
    const input = makeInput("trap");
    for (let seed = 1; seed <= 25; seed += 1) {
      const { pattern } = makeVariation(input, seed);
      const changed =
        JSON.stringify(pattern.hat) !== JSON.stringify(input.pattern.hat) ||
        JSON.stringify(pattern.kick) !== JSON.stringify(input.pattern.kick);
      expect(changed).toBe(true);
    }
  });

  it("does not mutate the input pattern", () => {
    const input = makeInput("trap");
    const before = JSON.stringify(input.pattern);
    makeVariation(input, 9);
    expect(JSON.stringify(input.pattern)).toBe(before);
  });
});

describe("addFill", () => {
  it("is deterministic for a given seed", () => {
    expect(addFill(makeInput("trap"), 77)).toEqual(addFill(makeInput("trap"), 77));
  });

  it("rolls on the hats for hat-forward styles and resolves with an accent", () => {
    const input = makeInput("trap");
    const { pattern, stepVelocities } = addFill(input, 4);

    expect(pattern.hat[15]).toBe(true); // fill reaches the last step
    expect(stepVelocities.hat[15]).toBe(2); // accented resolution
    expect(pattern.openHat[15]).toBe(true); // open-hat lead-in
    // The first three beats of the hat lane are left alone.
    expect(pattern.hat.slice(0, 12)).toEqual(input.pattern.hat.slice(0, 12));
    // Melodic lanes untouched.
    expect(pattern.melody).toEqual(input.pattern.melody);
    expect(pattern["808"]).toEqual(input.pattern["808"]);
  });

  it("rolls on the snare for non-hat styles", () => {
    const input = makeInput("house");
    const { pattern, stepVelocities } = addFill(input, 4);

    expect(pattern.snare[15]).toBe(true);
    expect(stepVelocities.snare[15]).toBe(2);
    // Hat lane's first three beats unchanged (only the open-hat lead-in is added).
    expect(pattern.hat).toEqual(input.pattern.hat);
  });
});
