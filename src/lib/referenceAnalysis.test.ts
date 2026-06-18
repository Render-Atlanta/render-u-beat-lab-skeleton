import { describe, expect, it } from "vitest";
import { analyzeWaveform } from "./referenceAnalysis";

// Impulses every `intervalMs` for `durationSec`, at `sampleRate`.
function clickTrack(intervalMs: number, durationSec: number, sampleRate: number): Float32Array {
  const total = Math.round(durationSec * sampleRate);
  const samples = new Float32Array(total);
  const stride = Math.round((intervalMs / 1000) * sampleRate);
  for (let i = 0; i < total; i += stride) {
    // a few-sample decaying impulse so the envelope sees a clear peak
    for (let k = 0; k < 8 && i + k < total; k += 1) samples[i + k] = 1 - k / 8;
  }
  return samples;
}

describe("analyzeWaveform", () => {
  it("detects 120 BPM from a 500ms click track", () => {
    const samples = clickTrack(500, 8, 22050); // 500ms => 120 BPM
    const result = analyzeWaveform(samples, 22050);
    expect(result.detectedBpm).toBeGreaterThanOrEqual(116);
    expect(result.detectedBpm).toBeLessThanOrEqual(124);
    expect(result.tempoConfidence).toBeGreaterThan(0.5);
    expect(result.durationSec).toBeCloseTo(8, 1);
    expect(result.onsetCount).toBeGreaterThan(10);
    expect(result.onsetDensityPerSec).toBeGreaterThan(1.5);
  });

  it("returns zeros for empty input", () => {
    const result = analyzeWaveform(new Float32Array(0), 22050);
    expect(result.detectedBpm).toBe(0);
    expect(result.tempoConfidence).toBe(0);
    expect(result.onsetCount).toBe(0);
    expect(result.durationSec).toBe(0);
  });
});
