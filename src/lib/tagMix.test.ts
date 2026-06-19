import { describe, expect, it } from "vitest";
import { mixSampleIntoPcm, tagOffsetsForTrigger } from "./tagMix";

describe("mixSampleIntoPcm", () => {
  it("adds the sample at the offset", () => {
    const dest = new Float32Array([0, 0, 0, 0]);
    mixSampleIntoPcm(dest, new Float32Array([1, 1]), 1);
    expect(Array.from(dest)).toEqual([0, 1, 1, 0]);
  });

  it("is additive, not overwrite", () => {
    const dest = new Float32Array([0.5, 0.5]);
    mixSampleIntoPcm(dest, new Float32Array([0.25, 0.25]), 0);
    expect(dest[0]).toBeCloseTo(0.75);
  });

  it("clamps writes past the end", () => {
    const dest = new Float32Array([0, 0]);
    mixSampleIntoPcm(dest, new Float32Array([1, 1, 1]), 1);
    expect(Array.from(dest)).toEqual([0, 1]);
  });

  it("skips the negative leading part of the offset", () => {
    const dest = new Float32Array([0, 0, 0]);
    mixSampleIntoPcm(dest, new Float32Array([1, 1, 1]), -1);
    expect(Array.from(dest)).toEqual([1, 1, 0]);
  });
});

describe("tagOffsetsForTrigger", () => {
  it("manual places nothing", () => {
    expect(tagOffsetsForTrigger("manual", 4, 1000)).toEqual([]);
  });
  it("intro places once at the start", () => {
    expect(tagOffsetsForTrigger("intro", 4, 1000)).toEqual([0]);
  });
  it("loop places once per loop", () => {
    expect(tagOffsetsForTrigger("loop", 3, 1000)).toEqual([0, 1000, 2000]);
  });
});
