import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import {
  bassStepPitchesAreDefault,
  createDefaultBassStepPitches,
  deserializeBassStepPitches,
  getBassPitchForStep,
  getInKeyPalette,
  normalizeBassDegree,
  normalizeBassStepPitches,
  serializeBassStepPitches,
  synthesizeBassNotePcm,
  updateBassStepPitch,
} from "./stepPitch";

describe("stepPitch", () => {
  it("builds an in-key palette for each style", () => {
    for (const style of Object.values(BEAT_STYLES)) {
      const palette = getInKeyPalette(style.musicalKey);
      expect(palette).toHaveLength(7);
      expect(palette[0].function).toBe("root");
      expect(palette[0].frequency).toBeGreaterThan(30);
    }
  });

  it("normalizes out-of-range bass degrees into the palette", () => {
    expect(normalizeBassDegree(-2, 7)).toBe(0);
    expect(normalizeBassDegree(9, 7)).toBe(6);
    expect(normalizeBassDegree("bad", 7)).toBe(0);
  });

  it("defaults missing bass pitch data to the root degree", () => {
    expect(normalizeBassStepPitches(undefined)).toEqual(createDefaultBassStepPitches());
    expect(bassStepPitchesAreDefault(createDefaultBassStepPitches())).toBe(true);
  });

  it("serializes and deserializes bass step pitches", () => {
    const pitches = updateBassStepPitch(createDefaultBassStepPitches(), 0, 2, 7);
    const serialized = serializeBassStepPitches(pitches);

    expect(serialized.startsWith("2,")).toBe(true);
    expect(deserializeBassStepPitches(serialized)).toEqual(pitches);
    expect(deserializeBassStepPitches("0,1,2")).toBeNull();
  });

  it("resolves per-step bass pitch from style key and stored degrees", () => {
    const style = BEAT_STYLES.trap;
    const pitches = updateBassStepPitch(createDefaultBassStepPitches(), 3, 3, 7);
    const root = getBassPitchForStep(style.musicalKey, 0, pitches);
    const fifth = getBassPitchForStep(style.musicalKey, 3, pitches);

    expect(root.function).toBe("root");
    expect(fifth.function).toBe("fifth");
    expect(fifth.frequency).not.toBe(root.frequency);
  });

  it("renders different pitched bass notes deterministically", () => {
    const style = BEAT_STYLES.trap;
    const root = getBassPitchForStep(style.musicalKey, 0);
    const third = getBassPitchForStep(style.musicalKey, 0, updateBassStepPitch(createDefaultBassStepPitches(), 0, 1, 7));
    const rootPcm = synthesizeBassNotePcm(root.frequency, 22050);
    const thirdPcm = synthesizeBassNotePcm(third.frequency, 22050);

    expect(Array.from(rootPcm.slice(0, 32)).join(",")).not.toBe(
      Array.from(thirdPcm.slice(0, 32)).join(","),
    );
  });
});
