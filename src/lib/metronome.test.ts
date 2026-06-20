import { describe, expect, it } from "vitest";
import {
  getMetronomeClickAccent,
  isMetronomeQuarterNote,
  shouldPulseMetronomeDot,
} from "./metronome";

describe("metronome beat helpers", () => {
  it("treats every fourth step as a quarter-note click", () => {
    expect(isMetronomeQuarterNote(0)).toBe(true);
    expect(isMetronomeQuarterNote(4)).toBe(true);
    expect(isMetronomeQuarterNote(8)).toBe(true);
    expect(isMetronomeQuarterNote(12)).toBe(true);
    expect(isMetronomeQuarterNote(1)).toBe(false);
  });

  it("accents beat 1 and keeps beats 2-4 plain", () => {
    expect(getMetronomeClickAccent(0)).toBe(true);
    expect(getMetronomeClickAccent(4)).toBe(false);
    expect(getMetronomeClickAccent(8)).toBe(false);
    expect(getMetronomeClickAccent(12)).toBe(false);
  });

  it("pulses the transport dot only on quarter notes while enabled", () => {
    expect(shouldPulseMetronomeDot(true, 0)).toBe(true);
    expect(shouldPulseMetronomeDot(true, 3)).toBe(false);
    expect(shouldPulseMetronomeDot(false, 0)).toBe(false);
    expect(shouldPulseMetronomeDot(true, null)).toBe(false);
  });
});
