import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import {
  bassStepPitchesAreDefault,
  createDefaultBassStepPitches,
  createDefaultMelodyStepPitches,
  deserializeBassStepPitches,
  deserializeMelodyStepPitches,
  getBassPitchForStep,
  getInKeyPalette,
  getMelodyPitchForStep,
  getMelodyPalette,
  melodyStepPitchesAreDefault,
  normalizeBassDegree,
  normalizeBassStepPitches,
  normalizeMelodyStepPitches,
  serializeBassStepPitches,
  serializeMelodyStepPitches,
  updateBassStepPitch,
  updateMelodyStepPitch,
} from "./stepPitch";
import { synthesizeBassNotePcm, synthesizeMelodyNotePcm } from "./noteSynthesis";

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
    const pitches = updateBassStepPitch(createDefaultBassStepPitches(), 3, 4, 7);
    const root = getBassPitchForStep(style.musicalKey, 0, pitches);
    const fifth = getBassPitchForStep(style.musicalKey, 3, pitches);

    expect(root.function).toBe("root");
    expect(fifth.function).toBe("fifth");
    expect(fifth.frequency).not.toBe(root.frequency);
  });

  it("renders different pitched bass notes deterministically", () => {
    const style = BEAT_STYLES.trap;
    const root = getBassPitchForStep(style.musicalKey, 0);
    const third = getBassPitchForStep(style.musicalKey, 0, updateBassStepPitch(createDefaultBassStepPitches(), 0, 2, 7));
    const rootPcm = synthesizeBassNotePcm(root.frequency, 22050);
    const thirdPcm = synthesizeBassNotePcm(third.frequency, 22050);

    expect(Array.from(rootPcm.slice(0, 32)).join(",")).not.toBe(
      Array.from(thirdPcm.slice(0, 32)).join(","),
    );
  });

  it("builds a higher-register in-key melody palette", () => {
    const style = BEAT_STYLES.trap;
    const bassRoot = getBassPitchForStep(style.musicalKey, 0);
    const melodyRoot = getMelodyPitchForStep(style.musicalKey, 0);

    expect(getMelodyPalette(style.musicalKey)).toHaveLength(7);
    expect(melodyRoot.function).toBe("root");
    expect(melodyRoot.midi).toBeGreaterThan(bassRoot.midi);
  });

  it("serializes and deserializes melody step pitches", () => {
    const pitches = updateMelodyStepPitch(createDefaultMelodyStepPitches(), 4, 2, 7);
    const serialized = serializeMelodyStepPitches(pitches);

    expect(normalizeMelodyStepPitches(undefined)).toEqual(createDefaultMelodyStepPitches());
    expect(melodyStepPitchesAreDefault(createDefaultMelodyStepPitches())).toBe(true);
    expect(serialized.split(",")[4]).toBe("2");
    expect(deserializeMelodyStepPitches(serialized)).toEqual(pitches);
    expect(deserializeMelodyStepPitches("0,1,2")).toBeNull();
  });

  it("renders melody notes with a distinct deterministic timbre", () => {
    const style = BEAT_STYLES.trap;
    const melody = getMelodyPitchForStep(style.musicalKey, 0);
    const bass = getBassPitchForStep(style.musicalKey, 0);
    const melodyPcm = synthesizeMelodyNotePcm(melody.frequency, 22050);
    const bassPcm = synthesizeBassNotePcm(bass.frequency, 22050);

    expect(melodyPcm.length).toBeLessThan(bassPcm.length);
    expect(Array.from(melodyPcm.slice(0, 32)).join(",")).not.toBe(
      Array.from(bassPcm.slice(0, 32)).join(","),
    );
  });

  describe("softened 808 (game-track beds)", () => {
    // One-pole highpass RMS ~1kHz: a "buzz" proxy for the raw saw's upper harmonics.
    function highFreqRms(sig: Float32Array, cutHz = 1000): number {
      const rc = 1 / (2 * Math.PI * cutHz);
      const dt = 1 / 22050;
      const alpha = rc / (rc + dt);
      let prevIn = 0;
      let prevOut = 0;
      let sum = 0;
      for (let i = 0; i < sig.length; i += 1) {
        const hp = alpha * (prevOut + sig[i] - prevIn);
        sum += hp * hp;
        prevIn = sig[i];
        prevOut = hp;
      }
      return Math.sqrt(sum / sig.length);
    }

    it("leaves the raw 808 byte-identical when soften is off (live path untouched)", () => {
      const raw = synthesizeBassNotePcm(55, 22050);
      const explicitOff = synthesizeBassNotePcm(55, 22050, undefined, { soften: false });
      expect(Array.from(explicitOff)).toEqual(Array.from(raw));
      // Raw saw has an instant onset — first sample is already at full amplitude.
      expect(Math.abs(raw[0])).toBeGreaterThan(0.5);
    });

    it("ramps the onset so there is no per-note click", () => {
      const soft = synthesizeBassNotePcm(55, 22050, undefined, { soften: true });
      // Attack ramp starts the note from silence instead of the raw saw's click.
      expect(Math.abs(soft[0])).toBeLessThan(0.01);
    });

    it("cuts the buzzy high-frequency content versus the raw saw", () => {
      for (const freq of [41, 55, 82, 110]) {
        const raw = synthesizeBassNotePcm(freq, 22050);
        const soft = synthesizeBassNotePcm(freq, 22050, undefined, { soften: true });
        expect(highFreqRms(soft), `${freq}Hz`).toBeLessThan(highFreqRms(raw) * 0.85);
        // ...without going silent — it is still a bass note.
        const peak = soft.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
        expect(peak, `${freq}Hz`).toBeGreaterThan(0.3);
      }
    });
  });
});
