import { describe, expect, it } from "vitest";
import { pickOneBarWindow } from "./oneBarWindow";

describe("pickOneBarWindow", () => {
  it("returns a bar-length window within the track", () => {
    const onsets = [100, 200, 300, 400, 1100, 1200, 1300, 1400];
    const w = pickOneBarWindow(onsets, 1000, 3000);
    expect(w.endMs - w.startMs).toBeCloseTo(1000, 5);
    expect(w.startMs).toBeGreaterThanOrEqual(0);
    expect(w.endMs).toBeLessThanOrEqual(3000);
  });

  it("centres on the densest region of onsets", () => {
    const onsets = [2000, 2100, 2250, 2500, 2750, 2900];
    const w = pickOneBarWindow(onsets, 1000, 4000);
    expect(w.startMs).toBeGreaterThanOrEqual(1900);
    expect(w.startMs).toBeLessThanOrEqual(2050);
  });

  it("clamps to [0, totalDurationMs] when bar exceeds track", () => {
    const w = pickOneBarWindow([10, 20], 5000, 1000);
    expect(w.startMs).toBe(0);
    expect(w.endMs).toBe(1000);
  });

  it("returns a window at 0 when there are no onsets", () => {
    const w = pickOneBarWindow([], 1000, 3000);
    expect(w.startMs).toBe(0);
    expect(w.endMs).toBe(1000);
  });
});
