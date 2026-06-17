import { describe, expect, it } from "vitest";
import { countActiveSteps, patternFromSteps, quantizeHitTimes, toStepArray } from "./patterns";

describe("pattern helpers", () => {
  it("converts one-indexed steps into a 16-cell row", () => {
    expect(toStepArray([1, 5, 13])).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
  });

  it("rejects invalid steps so bad generated patterns fail fast", () => {
    expect(() => toStepArray([0])).toThrow(/Step must/);
    expect(() => toStepArray([17])).toThrow(/Step must/);
    expect(() => toStepArray([1.5])).toThrow(/Step must/);
  });

  it("counts active cells across instruments", () => {
    const pattern = patternFromSteps({
      kick: [1, 9],
      snare: [5, 13],
      hat: [1, 3, 5, 7],
      openHat: [16],
    });

    expect(countActiveSteps(pattern)).toBe(9);
  });

  it("quantizes detected hit times to nearest musical steps", () => {
    expect(quantizeHitTimes([0, 110, 230, 450], 120)).toEqual([1, 2, 3, 5]);
  });
});
