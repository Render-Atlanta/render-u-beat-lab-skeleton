import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "./beatStyles";
import {
  FEATURE_KEYS,
  extractRhythmFeatures,
  extractStyleFeatures,
  computeNormalizationStats,
  styleSimilarity,
} from "./styleFidelity";
import { loadKitFromDisk } from "./loadKit.node";
import { renderPatternToPcm } from "./styleRender";

describe("extractRhythmFeatures lane guard", () => {
  it("throws when a lane has the wrong number of steps", () => {
    const bad = {
      kick: new Array(8).fill(false),
      snare: new Array(16).fill(false),
      hat: new Array(16).fill(false),
      openHat: new Array(16).fill(false),
    };
    expect(() => extractRhythmFeatures(bad as unknown as Parameters<typeof extractRhythmFeatures>[0], BEAT_STYLES.trap)).toThrow(/lane "kick" has 8 steps, expected 16/);
  });
});

describe("extractRhythmFeatures", () => {
  it("derives normalized rhythm features from a style's pattern", () => {
    const f = extractRhythmFeatures(BEAT_STYLES.trap.pattern, BEAT_STYLES.trap);
    expect(f.bpmNorm).toBeCloseTo(142 / 200, 5);
    expect(f.swing).toBeCloseTo(0.04, 5);
    // lane shares sum to 1 when there is at least one hit
    const shareSum =
      f.laneShareKick + f.laneShareSnare + f.laneShareHat + f.laneShareOpenHat;
    expect(shareSum).toBeCloseTo(1, 5);
    // every feature is finite and in a sane range
    expect(f.onsetDensity).toBeGreaterThan(0);
    expect(f.onsetDensity).toBeLessThanOrEqual(1);
    expect(f.syncopation).toBeGreaterThanOrEqual(0);
    expect(f.syncopation).toBeLessThanOrEqual(1);
    expect(f.backbeat).toBeGreaterThanOrEqual(0);
    expect(f.backbeat).toBeLessThanOrEqual(1);
  });

  it("returns zero shares for an empty pattern without NaN", () => {
    const empty = { kick: [], snare: [], hat: [], openHat: [] } as unknown as typeof BEAT_STYLES.trap.pattern;
    const f = extractRhythmFeatures(
      { kick: new Array(16).fill(false), snare: new Array(16).fill(false), hat: new Array(16).fill(false), openHat: new Array(16).fill(false) },
      { ...BEAT_STYLES.trap, pattern: empty },
    );
    expect(f.onsetDensity).toBe(0);
    expect(f.laneShareKick).toBe(0);
    expect(Number.isNaN(f.syncopation)).toBe(false);
  });
});

describe("extractStyleFeatures", () => {
  const kit = loadKitFromDisk();

  it("returns all feature keys, finite and bounded", () => {
    const style = BEAT_STYLES.trap;
    const pcm = renderPatternToPcm(style.pattern, style, kit);
    const f = extractStyleFeatures(style.pattern, style, pcm);
    for (const key of ["rmsNorm", "lowEnergyShare", "zcr"] as const) {
      expect(Number.isFinite(f[key])).toBe(true);
      expect(f[key]).toBeGreaterThanOrEqual(0);
      expect(f[key]).toBeLessThanOrEqual(1.0001);
    }
    expect(f.bpmNorm).toBeCloseTo(142 / 200, 5);
    // Ensure all 12 feature keys are finite
    for (const key of FEATURE_KEYS) {
      expect(Number.isFinite(f[key])).toBe(true);
    }
  });
});

describe("styleSimilarity", () => {
  const kit = loadKitFromDisk();
  const vectors = Object.values(BEAT_STYLES).map((s) =>
    extractStyleFeatures(s.pattern, s, renderPatternToPcm(s.pattern, s, kit)),
  );
  const stats = computeNormalizationStats(vectors);

  it("is 1 for identical vectors", () => {
    expect(styleSimilarity(vectors[0], vectors[0], stats)).toBeCloseTo(1, 6);
  });
  it("is symmetric and bounded to [0,1]", () => {
    const ab = styleSimilarity(vectors[0], vectors[1], stats);
    const ba = styleSimilarity(vectors[1], vectors[0], stats);
    expect(ab).toBeCloseTo(ba, 6);
    expect(ab).toBeGreaterThanOrEqual(0);
    expect(ab).toBeLessThanOrEqual(1);
  });
  it("computes std as zero-safe (no NaN) for constant features", () => {
    expect(FEATURE_KEYS.every((k) => Number.isFinite(stats.std[k]))).toBe(true);
  });
});
