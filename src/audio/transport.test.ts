import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "../lib/beatStyles";
import {
  getNextStepIndex,
  getSixteenthDurationSeconds,
  getStepEvents,
  getSwingStepDurationSeconds,
} from "./transport";

describe("audio transport helpers", () => {
  it("calculates sixteenth-note timing from BPM", () => {
    expect(getSixteenthDurationSeconds(120)).toBe(0.125);
    expect(() => getSixteenthDurationSeconds(0)).toThrow("BPM");
  });

  it("applies swing by shortening even steps and lengthening odd steps", () => {
    expect(getSwingStepDurationSeconds(120, 0.2, 0)).toBe(0.1);
    expect(getSwingStepDurationSeconds(120, 0.2, 1)).toBe(0.15);
    expect(getSwingStepDurationSeconds(120, Number.NaN, 1)).toBe(0.125);
  });

  it("wraps transport step indexes around the loop", () => {
    expect(getNextStepIndex(0)).toBe(1);
    expect(getNextStepIndex(15)).toBe(0);
    expect(() => getNextStepIndex(1.5)).toThrow("integer");
  });

  it("returns scheduled drum events for active cells only", () => {
    expect(getStepEvents(BEAT_STYLES.trap, 0, 1.25)).toEqual([
      {
        instrument: "kick",
        stepIndex: 0,
        time: 1.25,
        accent: 1.12,
      },
      {
        instrument: "hat",
        stepIndex: 0,
        time: 1.25,
        accent: 1.12,
      },
    ]);
    expect(getStepEvents(BEAT_STYLES.trap, 1, 1.5)).toEqual([]);
  });
});
