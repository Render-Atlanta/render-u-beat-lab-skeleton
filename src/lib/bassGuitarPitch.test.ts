import { describe, expect, it } from "vitest";
import type { MusicalKey } from "./beatStyles";
import {
  BASS_GUITAR_REGISTER_OFFSET,
  bassGuitarStepPitchesAreDefault,
  createDefaultBassGuitarStepPitches,
  deserializeBassGuitarStepPitches,
  getBassGuitarPitchForStep,
  serializeBassGuitarStepPitches,
  synthesizeBassGuitarNotePcm,
  updateBassGuitarStepPitch,
} from "./bassGuitarPitch";
import { getBassPitchForStep } from "./stepPitch";

const key: MusicalKey = { root: "A", scale: "minor" };

describe("bassGuitarPitch", () => {
  it("sits an octave above the 808 sub register", () => {
    expect(BASS_GUITAR_REGISTER_OFFSET).toBe(36);
    const bg = getBassGuitarPitchForStep(key, 0);
    const sub = getBassPitchForStep(key, 0);
    // Same root degree, one octave higher → exactly double the frequency.
    expect(bg.frequency).toBeCloseTo(sub.frequency * 2, 1);
  });

  it("defaults to all-root and detects the default", () => {
    const pitches = createDefaultBassGuitarStepPitches();
    expect(pitches).toHaveLength(16);
    expect(bassGuitarStepPitchesAreDefault(pitches)).toBe(true);
    const edited = updateBassGuitarStepPitch(pitches, 3, 2, 7);
    expect(edited[3]).toBe(2);
    expect(bassGuitarStepPitchesAreDefault(edited)).toBe(false);
  });

  it("clamps an out-of-range degree to the palette", () => {
    const pitches = updateBassGuitarStepPitch(
      createDefaultBassGuitarStepPitches(),
      0,
      99,
      7,
    );
    expect(pitches[0]).toBe(6);
  });

  it("round-trips through serialize/deserialize", () => {
    const pitches = updateBassGuitarStepPitch(
      createDefaultBassGuitarStepPitches(),
      5,
      4,
      7,
    );
    const serialized = serializeBassGuitarStepPitches(pitches);
    expect(deserializeBassGuitarStepPitches(serialized)).toEqual(pitches);
    expect(deserializeBassGuitarStepPitches(null)).toBeNull();
    expect(deserializeBassGuitarStepPitches("1,2,3")).toBeNull();
  });

  it("synthesizes a non-empty plucked note", () => {
    const pcm = synthesizeBassGuitarNotePcm(110, 22050);
    expect(pcm).toBeInstanceOf(Float32Array);
    expect(pcm.length).toBe(Math.ceil(0.3 * 22050));
    expect(pcm.some((s) => s !== 0)).toBe(true);
  });
});
