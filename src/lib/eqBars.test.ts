import { describe, expect, it } from "vitest";
import { mapFrequencyBars } from "./eqBars";

describe("mapFrequencyBars", () => {
  it("returns the requested number of bars", () => {
    const data = new Uint8Array(128).fill(0);
    expect(mapFrequencyBars(data, 16)).toHaveLength(16);
  });

  it("normalizes byte magnitudes to 0..1", () => {
    const data = new Uint8Array(128).fill(255);
    const bars = mapFrequencyBars(data, 8);
    for (const value of bars) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(Math.max(...bars)).toBeCloseTo(1, 5);
  });

  it("returns all zeros for silence", () => {
    const data = new Uint8Array(128).fill(0);
    expect(mapFrequencyBars(data, 8).every((v) => v === 0)).toBe(true);
  });

  it("reflects low-frequency energy in the first bar", () => {
    const data = new Uint8Array(128).fill(0);
    data[0] = 255;
    data[1] = 255;
    const bars = mapFrequencyBars(data, 8);
    expect(bars[0]).toBeGreaterThan(0);
    expect(bars[7]).toBe(0);
  });

  it("does not throw and floors a non-integer barCount when data is empty", () => {
    const empty = new Uint8Array(0);
    expect(() => mapFrequencyBars(empty, 0.5)).not.toThrow();
    expect(mapFrequencyBars(empty, 0.5)).toEqual([]);
  });

  it("floors a fractional barCount to an integer length", () => {
    const data = new Uint8Array(128).fill(10);
    expect(mapFrequencyBars(data, 4.9)).toHaveLength(4);
  });

  it("returns an empty array for barCount <= 0", () => {
    const data = new Uint8Array(128).fill(255);
    expect(mapFrequencyBars(data, 0)).toEqual([]);
    expect(mapFrequencyBars(data, -3)).toEqual([]);
  });
});
