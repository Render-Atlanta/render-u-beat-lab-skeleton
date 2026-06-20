import { describe, expect, it } from "vitest";
import { estimateTempo } from "./tempoEstimation";

function onsetTrainBpm(bpm: number, beats: number, offsetMs = 0): number[] {
  const beatMs = 60000 / bpm;
  return Array.from({ length: beats }, (_, i) => offsetMs + i * beatMs);
}

function onsetTrainGap(gapMs: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => i * gapMs);
}

describe("estimateTempo", () => {
  it("recovers a steady 120 BPM onset train", () => {
    const result = estimateTempo(onsetTrainBpm(120, 16));
    expect(result.bpm).toBeCloseTo(120, 0);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("recovers 90 and 140 BPM", () => {
    expect(estimateTempo(onsetTrainBpm(90, 16)).bpm).toBeCloseTo(90, 0);
    expect(estimateTempo(onsetTrainBpm(140, 16)).bpm).toBeCloseTo(140, 0);
  });

  it("octave-folds fast onsets (300 BPM raw) down into range", () => {
    // 200ms gaps => 300 BPM raw, must fold to 150 within 60-180.
    const result = estimateTempo(onsetTrainGap(200, 16), { minBpm: 60, maxBpm: 180 });
    expect(result.bpm).toBe(150);
  });

  it("octave-folds slow onsets (40 BPM raw) up into range", () => {
    // 1500ms gaps => 40 BPM raw, must fold to 80 within 60-180.
    const result = estimateTempo(onsetTrainGap(1500, 16), { minBpm: 60, maxBpm: 180 });
    expect(result.bpm).toBe(80);
  });

  it("returns confidence 0 and a safe in-range default for too-few onsets", () => {
    const result = estimateTempo([0]);
    expect(result.bpm).toBeGreaterThanOrEqual(60);
    expect(result.bpm).toBeLessThanOrEqual(180);
    expect(result.confidence).toBe(0);
  });
});
