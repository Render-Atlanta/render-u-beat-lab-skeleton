import { describe, expect, it } from "vitest";
import {
  createMeydaBeatboxAnalysisProvider,
  getWaveformWindow,
  type MeydaRuntimePort,
} from "./meydaBeatboxAnalysis";
import type { MicLevelFrame } from "./micCapture";
import type { QuantizedOnset } from "./onsetDetection";

describe("Meyda beatbox analysis provider", () => {
  it("extracts a waveform window around a hit", () => {
    const window = getWaveformWindow(
      hit(500),
      {
        durationMs: 1_000,
        waveform: Array.from({ length: 10 }, (_, index) => index / 10),
      },
      4,
    );

    expect(window).toHaveLength(16);
    expect(window?.slice(3, 7)).toEqual([0.3, 0.4, 0.5, 0.6]);
  });

  it("merges Meyda RMS and brightness into fallback hit features", () => {
    const runtime: MeydaRuntimePort = {
      extract: () => ({
        rms: 0.72,
        zcr: 20,
        spectralCentroid: 28,
      }),
    };
    const provider = createMeydaBeatboxAnalysisProvider({
      runtime,
      windowSize: 64,
    });

    const features = provider.extractHitFeatures(hit(500), {
      durationMs: 1_000,
      levels: [level(500, 0.3, 0.16, 0.04)],
      waveform: Array.from({ length: 128 }, (_, index) =>
        index % 2 === 0 ? 0.7 : -0.7,
      ),
    });

    expect(features.energy).toBe(0.72);
    expect(features.brightness).toBeGreaterThan(0.8);
  });

  it("falls back when Meyda extraction cannot run", () => {
    const provider = createMeydaBeatboxAnalysisProvider({
      runtime: {
        extract: () => {
          throw new Error("bad buffer");
        },
      },
    });

    const features = provider.extractHitFeatures(hit(200), {
      levels: [level(200, 0.5, 0.25, 0.03)],
      durationMs: 1_000,
      waveform: Array.from({ length: 64 }, () => 0.1),
    });

    expect(features.energy).toBe(0.413);
    expect(features.brightness).toBe(0.084);
  });
});

function hit(atMs: number): QuantizedOnset {
  return {
    atMs,
    amplitude: 0.4,
    strength: 0.2,
    stepIndex: 0,
    stepNumber: 1,
  };
}

function level(
  atMs: number,
  peak: number,
  rms: number,
  zeroCrossingRate: number,
): MicLevelFrame {
  return { atMs, peak, rms, zeroCrossingRate };
}
