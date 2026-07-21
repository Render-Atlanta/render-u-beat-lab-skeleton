// src/game/laneConfig.test.ts
// Acceptance for the lanes/difficulty carve-out (workshop add-on).
// FAILS on the skeleton by design: LANE_SET_4 is not defined yet. Attendees turn
// it green by adding the 4-lane layout in src/game/laneConfig.ts.
import { describe, expect, it } from "vitest";
import { LANE_SET_4, activeLaneSet, laneSetsByCount, type LaneSet } from "./laneConfig";

describe("4-lane add-on (workshop extension target)", () => {
  it("defines a 4-lane layout", () => {
    expect(LANE_SET_4).not.toBeNull();
  });

  it("gives each of the four source drum lanes its own swim lane", () => {
    expect(LANE_SET_4).not.toBeNull();
    const s = LANE_SET_4 as LaneSet;
    expect(s.map).toEqual({ 0: 0, 1: 1, 2: 2, 3: 3 });
    expect(new Set(Object.values(s.map)).size).toBe(4);
  });

  it("labels the four drums and uses four distinct keys and colours", () => {
    expect(LANE_SET_4).not.toBeNull();
    const s = LANE_SET_4 as LaneSet;
    expect(s.tags).toEqual(["KICK", "SNARE", "HAT", "BASS"]);
    expect(new Set(s.keys).size).toBe(4);
    expect(new Set(s.hex).size).toBe(4);
    expect(s.css).toHaveLength(4);
  });

  it("becomes the active layout and is exposed by lane count once defined", () => {
    expect(LANE_SET_4).not.toBeNull();
    expect(activeLaneSet()).toBe(LANE_SET_4);
    expect(laneSetsByCount()[4]).toBe(LANE_SET_4);
  });
});
