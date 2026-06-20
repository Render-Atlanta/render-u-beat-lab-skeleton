import { describe, expect, it } from "vitest";
import { createRng, randomInt, shuffle } from "./seededRng";

describe("seededRng", () => {
  it("is deterministic for a given seed", () => {
    const a = createRng(123);
    const b = createRng(123);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different streams for different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it("returns values in [0, 1)", () => {
    const rng = createRng(99);
    for (let i = 0; i < 100; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("randomInt stays within the inclusive range", () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i += 1) {
      const v = randomInt(rng, 2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("shuffle is a deterministic permutation that leaves the input untouched", () => {
    const input = [0, 1, 2, 3, 4, 5];
    const out1 = shuffle(createRng(42), input);
    const out2 = shuffle(createRng(42), input);
    expect(out1).toEqual(out2);
    expect([...out1].sort((a, b) => a - b)).toEqual(input); // same multiset
    expect(input).toEqual([0, 1, 2, 3, 4, 5]); // not mutated
  });
});
