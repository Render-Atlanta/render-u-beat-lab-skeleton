import { describe, expect, it } from "vitest";
import { RULE_BASED_BEATBOX_ANALYSIS_PROVIDER } from "./beatboxClassifier";
import { countActiveSteps } from "./patterns";
import { decomposeSong } from "./songDecompose";

// Deterministic one-bar-repeating click track: low-freq sine burst (kick-ish) on
// steps 1/5/9/13, high-freq sine burst (hat-ish) on steps 3/7/11/15, at a known BPM.
function synthClickTrack(bpm: number, sampleRate: number, bars: number): Float32Array {
  const barMs = (60000 / bpm) * 4;
  const stepMs = barMs / 16;
  const totalMs = barMs * bars;
  const total = Math.round((totalMs / 1000) * sampleRate);
  const out = new Float32Array(total);
  const burst = (atMs: number, freq: number, durMs: number, amp: number) => {
    const start = Math.round((atMs / 1000) * sampleRate);
    const len = Math.round((durMs / 1000) * sampleRate);
    for (let i = 0; i < len && start + i < total; i += 1) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 40);
      out[start + i] += Math.sin(2 * Math.PI * freq * t) * env * amp;
    }
  };
  for (let bar = 0; bar < bars; bar += 1) {
    const base = bar * barMs;
    [0, 4, 8, 12].forEach((s) => burst(base + s * stepMs, 60, 60, 1));
    [2, 6, 10, 14].forEach((s) => burst(base + s * stepMs, 8000, 25, 0.6));
  }
  return out;
}

describe("decomposeSong", () => {
  const sampleRate = 22050;
  const opts = { provider: RULE_BASED_BEATBOX_ANALYSIS_PROVIDER };

  function decoded(bpm: number) {
    const samples = synthClickTrack(bpm, sampleRate, 4);
    return { samples, sampleRate, durationMs: (samples.length / sampleRate) * 1000 };
  }

  // Use a 100 BPM source: the band [90,110] excludes estimateTempo's no-onset
  // fallback of 120, so this assertion actually proves the IOI estimator ran.
  it("estimates the source BPM (band excludes the no-onset fallback of 120)", () => {
    const result = decomposeSong(decoded(100), opts);
    expect(result.bpm).toBeGreaterThanOrEqual(90);
    expect(result.bpm).toBeLessThanOrEqual(110);
  });

  it("recovers several of the 8 source hits in a one-bar pattern", () => {
    const result = decomposeSong(decoded(100), opts);
    expect(result.window.bars).toBe(1);
    // The synth has 8 hits/bar across 8 distinct steps; require a meaningful
    // recovery, not just "any single step set".
    expect(countActiveSteps(result.pattern)).toBeGreaterThanOrEqual(4);
    expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
    expect(result.overallConfidence).toBeLessThanOrEqual(1);
  });

  it("returns a safe zero-confidence decomposition for an empty decode", () => {
    const result = decomposeSong(
      { samples: new Float32Array(0), sampleRate, durationMs: 0 },
      opts,
    );
    expect(result.overallConfidence).toBe(0);
    expect(countActiveSteps(result.pattern)).toBe(0);
    expect(result.bpm).toBeGreaterThanOrEqual(60);
    expect(result.bpm).toBeLessThanOrEqual(180);
  });
});
