import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import {
  createPlayableStyle,
  getSequencerLoopDurationMs,
  getSwingPercent,
  paintSequencerStep,
  updateSequencerStep,
  updateSequencerBpm,
  updateSequencerSwing,
} from "./sequencerDomain";
import { createDefaultSequencerState } from "./patternState";
import { createDefaultStepVelocities } from "./stepVelocity";

describe("sequencer domain helpers", () => {
  it("creates a playable style without exposing caller-owned pattern rows", () => {
    const sequencer = createDefaultSequencerState("trap");
    const playable = createPlayableStyle(sequencer);

    playable.pattern.kick[0] = false;
    playable.stepVelocities!.kick[0] = 2;

    expect(playable).toMatchObject({
      id: "trap",
      bpm: sequencer.bpm,
      swing: sequencer.swing,
    });
    expect(sequencer.pattern.kick[0]).toBe(BEAT_STYLES.trap.pattern.kick[0]);
    expect(sequencer.stepVelocities.kick[0]).toBe(1);
  });

  it("cycles unpitched drum steps through velocity levels", () => {
    const sequencer = createDefaultSequencerState("trap");
    const offKick = {
      ...sequencer,
      pattern: {
        ...sequencer.pattern,
        kick: [false, ...sequencer.pattern.kick.slice(1)],
      },
      stepVelocities: createDefaultStepVelocities(),
    };

    const normal = updateSequencerStep(offKick, "kick", 0);
    const accent = updateSequencerStep(normal, "kick", 0);
    const ghost = updateSequencerStep(accent, "kick", 0);
    const off = updateSequencerStep(ghost, "kick", 0);

    expect(normal.pattern.kick[0]).toBe(true);
    expect(normal.stepVelocities.kick[0]).toBe(1);
    expect(accent.stepVelocities.kick[0]).toBe(2);
    expect(ghost.stepVelocities.kick[0]).toBe(0);
    expect(off.pattern.kick[0]).toBe(false);
    expect(off.stepVelocities.kick[0]).toBe(1);
  });

  it("keeps pitched lanes as binary toggles", () => {
    const sequencer = createDefaultSequencerState("trap");
    const first = updateSequencerStep(sequencer, "808", 1);
    const second = updateSequencerStep(first, "808", 1);

    expect(first.pattern["808"][1]).toBe(true);
    expect(first.stepVelocities["808"][1]).toBe(1);
    expect(second.pattern["808"][1]).toBe(false);
    expect(second.stepVelocities["808"][1]).toBe(1);
  });

  it("paints only unpitched drum lanes at normal velocity", () => {
    const sequencer = createDefaultSequencerState("trap");
    const paintedKick = paintSequencerStep(sequencer, "kick", 1);
    const skipped808 = paintSequencerStep(sequencer, "808", 1);
    const repeatedKick = paintSequencerStep(paintedKick, "kick", 1);

    expect(paintedKick.pattern.kick[1]).toBe(true);
    expect(paintedKick.stepVelocities.kick[1]).toBe(1);
    expect(skipped808).toBe(sequencer);
    expect(repeatedKick).toBe(paintedKick);
  });

  it("clamps finite BPM edits and ignores invalid BPM input", () => {
    const sequencer = createDefaultSequencerState("rnb");

    expect(updateSequencerBpm(sequencer, 200).bpm).toBe(180);
    expect(updateSequencerBpm(sequencer, 42).bpm).toBe(60);
    expect(updateSequencerBpm(sequencer, Number.NaN)).toBe(sequencer);
  });

  it("clamps swing edits and formats swing percentages", () => {
    const sequencer = createDefaultSequencerState("pop");

    expect(updateSequencerSwing(sequencer, 18).swing).toBe(0.18);
    expect(updateSequencerSwing(sequencer, 99).swing).toBe(0.3);
    expect(updateSequencerSwing(sequencer, -10).swing).toBe(0);
    expect(getSwingPercent(0.147)).toBe(15);
  });

  it("calculates a four-beat loop duration from clamped BPM", () => {
    expect(getSequencerLoopDurationMs(120)).toBe(2000);
    expect(getSequencerLoopDurationMs(400)).toBeCloseTo(1333.333, 3);
  });
});
