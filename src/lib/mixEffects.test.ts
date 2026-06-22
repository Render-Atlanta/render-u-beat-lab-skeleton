import { describe, expect, it } from "vitest";
import {
  applyMixEffectsToPcm,
  deserializeMixEffects,
  mixEffectsAreDefault,
  normalizeMixEffects,
  serializeMixEffects,
} from "./mixEffects";

describe("mixEffects", () => {
  it("normalizes, serializes, and deserializes percent values", () => {
    const effects = normalizeMixEffects({ space: 0.345, echo: 1.4 });

    expect(effects).toEqual({ space: 0.35, echo: 1 });
    expect(serializeMixEffects(effects)).toBe("35,100");
    expect(deserializeMixEffects("35,100")).toEqual(effects);
    expect(deserializeMixEffects("nope")).toBeNull();
    expect(mixEffectsAreDefault({ space: 0, echo: 0 })).toBe(true);
  });

  it("adds deterministic echo and space taps without mutating the dry input", () => {
    const dry = new Float32Array(20);
    dry[0] = 1;

    const wet = applyMixEffectsToPcm(dry, 100, { space: 0.5, echo: 0.5 });

    expect(dry[2]).toBe(0);
    expect(wet[2]).toBeGreaterThan(0);
    expect(wet[19]).toBeGreaterThan(0);
    expect(Array.from(applyMixEffectsToPcm(dry, 100, { space: 0.5, echo: 0.5 })))
      .toEqual(Array.from(wet));
  });
});
