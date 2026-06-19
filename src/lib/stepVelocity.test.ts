import { describe, expect, it } from "vitest";
import {
  DEFAULT_STEP_VELOCITY,
  STEP_VELOCITY_FACTORS,
  createDefaultStepVelocities,
  cycleStepVelocity,
  deserializeStepVelocities,
  getStepVelocityFactor,
  serializeStepVelocities,
} from "./stepVelocity";

describe("step velocity helpers", () => {
  it("cycles a drum step off -> normal -> accent -> ghost -> off", () => {
    expect(cycleStepVelocity(false, DEFAULT_STEP_VELOCITY)).toEqual({
      on: true,
      velocity: 1,
    });
    expect(cycleStepVelocity(true, 1)).toEqual({ on: true, velocity: 2 });
    expect(cycleStepVelocity(true, 2)).toEqual({ on: true, velocity: 0 });
    expect(cycleStepVelocity(true, 0)).toEqual({ on: false, velocity: 1 });
  });

  it("uses ghost, normal, and accent factors from one map", () => {
    expect(STEP_VELOCITY_FACTORS).toEqual([0.55, 1, 1.45]);
    expect(getStepVelocityFactor(0)).toBe(0.55);
    expect(getStepVelocityFactor(1)).toBe(1);
    expect(getStepVelocityFactor(2)).toBe(1.45);
  });

  it("round-trips seven velocity lanes", () => {
    const velocities = createDefaultStepVelocities();
    velocities.kick[0] = 2;
    velocities.snare[4] = 0;

    const serialized = serializeStepVelocities(velocities);

    expect(serialized).toContain("2");
    expect(serialized).toContain("0");
    expect(deserializeStepVelocities(serialized)).toEqual(velocities);
  });

  it("rejects malformed velocity strings", () => {
    expect(deserializeStepVelocities("not-a-velocity-map")).toBeNull();
    expect(
      deserializeStepVelocities(
        "1111111111111111.1111111111111111.1111111111111111",
      ),
    ).toBeNull();
  });
});
