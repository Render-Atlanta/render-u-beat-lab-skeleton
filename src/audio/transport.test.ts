import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "../lib/beatStyles";
import { createDefaultStepVelocities } from "../lib/stepVelocity";
import {
  getActiveStep,
  getNextStepIndex,
  getSixteenthDurationSeconds,
  getStepEvents,
  getSwingStepDurationSeconds,
  type StepQueueEntry,
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
    expect(getStepEvents(BEAT_STYLES.trap, 0, 1.25).map((event) => event.instrument)).toEqual([
      "kick",
      "hat",
      "808",
      "bassGuitar",
    ]);
    expect(getStepEvents(BEAT_STYLES.trap, 1, 1.5)).toEqual([]);
  });

  it("adds in-key pitch metadata for active melody steps", () => {
    const [event] = getStepEvents(
      {
        ...BEAT_STYLES.trap,
        pattern: {
          ...BEAT_STYLES.trap.pattern,
          kick: Array.from({ length: 16 }, () => false),
          hat: Array.from({ length: 16 }, () => false),
          "808": Array.from({ length: 16 }, () => false),
          bassGuitar: Array.from({ length: 16 }, () => false),
          melody: [true, ...Array.from({ length: 15 }, () => false)],
        },
        melodyStepPitches: [2, ...Array.from({ length: 15 }, () => 0)],
      },
      0,
      1.25,
    );

    expect(event.instrument).toBe("melody");
    expect(event.pitch?.degree).toBe(2);
    expect(event.pitch?.noteName).toMatch(/\d$/);
    expect(event.pitch?.frequency).toBeGreaterThan(100);
  });

  it("multiplies scheduled hit gain by step velocity", () => {
    const stepVelocities = createDefaultStepVelocities();
    stepVelocities.kick[0] = 2;
    stepVelocities.hat[0] = 0;

    const events = getStepEvents(
      {
        ...BEAT_STYLES.trap,
        stepVelocities,
      },
      0,
      1.25,
    );

    expect(events.find((event) => event.instrument === "kick")?.accent).toBeCloseTo(
      1.12 * 1.45,
    );
    expect(events.find((event) => event.instrument === "hat")?.accent).toBeCloseTo(
      1.12 * 0.55,
    );
  });
});

describe("getActiveStep", () => {
  const queue: StepQueueEntry[] = [
    { stepIndex: 0, time: 0.08 },
    { stepIndex: 1, time: 0.19 },
    { stepIndex: 2, time: 0.30 },
  ];

  it("returns null when nothing has sounded yet", () => {
    expect(getActiveStep(queue, 0.0)).toBeNull();
  });

  it("returns the latest step whose time has passed", () => {
    expect(getActiveStep(queue, 0.08)).toBe(0);
    expect(getActiveStep(queue, 0.2)).toBe(1);
    expect(getActiveStep(queue, 5.0)).toBe(2);
  });

  it("returns null for an empty queue", () => {
    expect(getActiveStep([], 1.0)).toBeNull();
  });
});
