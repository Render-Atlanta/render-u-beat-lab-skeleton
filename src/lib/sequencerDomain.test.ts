import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import {
  createPlayableStyle,
  getSequencerLoopDurationMs,
  getSwingPercent,
  updateSequencerBpm,
  updateSequencerSwing,
} from "./sequencerDomain";
import { createDefaultSequencerState } from "./patternState";

describe("sequencer domain helpers", () => {
  it("creates a playable style without exposing caller-owned pattern rows", () => {
    const sequencer = createDefaultSequencerState("trap");
    const playable = createPlayableStyle(sequencer);

    playable.pattern.kick[0] = false;

    expect(playable).toMatchObject({
      id: "trap",
      bpm: sequencer.bpm,
      swing: sequencer.swing,
    });
    expect(sequencer.pattern.kick[0]).toBe(BEAT_STYLES.trap.pattern.kick[0]);
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
