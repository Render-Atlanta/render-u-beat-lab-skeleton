import { describe, expect, it } from "vitest";
import type { MeasuredProfile } from "./referenceAnalysis";
import {
  buildReferenceProfile,
  validateReferenceProfile,
  type StyleReferenceProfileDraft,
} from "./referenceProfile";

const measured = (over: Partial<MeasuredProfile> = {}): MeasuredProfile => ({
  detectedBpm: 100,
  tempoConfidence: 0.8,
  onsetCount: 40,
  onsetDensityPerSec: 4,
  durationSec: 10,
  ...over,
});

describe("buildReferenceProfile", () => {
  it("rounds bpm and omits feelBpm below 140", () => {
    const draft = buildReferenceProfile(measured({ detectedBpm: 103.4 }));
    expect(draft.bpm).toBe(103);
    expect(draft.feelBpm).toBeUndefined();
    expect(draft.swing).toBe("straight");
  });

  it("derives half-time feelBpm at or above 140", () => {
    const draft = buildReferenceProfile(measured({ detectedBpm: 142 }));
    expect(draft.bpm).toBe(142);
    expect(draft.feelBpm).toBe(71);
  });

  it("describes density buckets in the profile note", () => {
    expect(buildReferenceProfile(measured({ onsetDensityPerSec: 1 })).profile).toMatch(/sparse/i);
    expect(buildReferenceProfile(measured({ onsetDensityPerSec: 4 })).profile).toMatch(/moderate/i);
    expect(buildReferenceProfile(measured({ onsetDensityPerSec: 8 })).profile).toMatch(/busy/i);
  });

  it("leaves metadata blank unless supplied", () => {
    const blank = buildReferenceProfile(measured());
    expect(blank.metadata).toEqual({ artist: "", title: "", sourceUrl: "" });
    const filled = buildReferenceProfile(measured(), { artist: "X", title: "Y", sourceUrl: "z" });
    expect(filled.metadata).toEqual({ artist: "X", title: "Y", sourceUrl: "z" });
  });

  it("carries the raw measured block through", () => {
    const m = measured();
    expect(buildReferenceProfile(m).measured).toEqual(m);
  });
});

describe("validateReferenceProfile", () => {
  const good = (): StyleReferenceProfileDraft => buildReferenceProfile(measured({ detectedBpm: 120 }));

  it("accepts a well-formed draft", () => {
    expect(validateReferenceProfile(good())).toEqual({ valid: true, errors: [] });
  });

  it("rejects out-of-range bpm", () => {
    const draft = { ...good(), bpm: 5 };
    const result = validateReferenceProfile(draft);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/bpm/i);
  });

  it("rejects unknown swing label", () => {
    const draft = { ...good(), swing: "wobbly" as unknown as StyleReferenceProfileDraft["swing"] };
    expect(validateReferenceProfile(draft).valid).toBe(false);
  });

  it("rejects an empty profile note", () => {
    const draft = { ...good(), profile: "" };
    expect(validateReferenceProfile(draft).valid).toBe(false);
  });

  it("rejects an empty measured block (untyped/parsed draft)", () => {
    const draft = { ...good(), measured: {} as StyleReferenceProfileDraft["measured"] };
    const result = validateReferenceProfile(draft);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/measured\./i);
  });

  it("rejects non-finite measured values", () => {
    const draft = {
      ...good(),
      measured: { ...good().measured, onsetDensityPerSec: Number.NaN },
    };
    expect(validateReferenceProfile(draft).valid).toBe(false);
  });

  it("rejects a non-finite feelBpm when present", () => {
    const draft = { ...good(), feelBpm: Number.NaN };
    expect(validateReferenceProfile(draft).valid).toBe(false);
  });
});
