import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import {
  createPlayableStyle,
  getSequencerLoopDurationMs,
  getSwingPercent,
  paintSequencerStep,
  toggleSequencerLaneMute,
  updateSequencerStep,
  updateSequencerBassGuitarStepPitch,
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

  it("silences muted lanes in the playable style while keeping the pattern", () => {
    const base = createDefaultSequencerState("trap");
    const muted = toggleSequencerLaneMute(base, "hat");
    const playable = createPlayableStyle(muted);

    // Muted lane drops to silent gain, others keep their volume.
    expect(playable.laneVolumes!.hat).toBe(0);
    expect(playable.laneVolumes!.kick).toBe(1);
    // The pattern itself is untouched — the hits are preserved for the grid.
    expect(playable.pattern.hat).toEqual(BEAT_STYLES.trap.pattern.hat);
    expect(muted.laneMutes.hat).toBe(true);

    // Unmuting restores the lane to audible.
    const unmuted = toggleSequencerLaneMute(muted, "hat");
    expect(createPlayableStyle(unmuted).laneVolumes!.hat).toBe(1);
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

  it("treats the bass guitar as a pitched lane (binary toggle, no velocity)", () => {
    const sequencer = createDefaultSequencerState("trap");
    const toggled = updateSequencerStep(sequencer, "bassGuitar", 2);
    expect(toggled.pattern.bassGuitar[2]).toBe(true);
    expect(toggled.stepVelocities.bassGuitar[2]).toBe(1);
  });

  it("updates and clamps bass guitar step pitch", () => {
    const sequencer = createDefaultSequencerState("trap");
    const edited = updateSequencerBassGuitarStepPitch(sequencer, 3, 2);
    expect(edited.bassGuitarStepPitches[3]).toBe(2);
    // Out-of-range degrees clamp to the palette (7 in-key degrees → max index 6).
    const clamped = updateSequencerBassGuitarStepPitch(sequencer, 0, 99);
    expect(clamped.bassGuitarStepPitches[0]).toBe(6);
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
