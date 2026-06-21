import { describe, expect, it } from "vitest";
import { createSongLabPreview } from "./songLabPreview";
import type { SongDecomposition } from "./songDecompose";

const baseDecomp: SongDecomposition = {
  bpm: 120,
  bpmConfidence: 0.8,
  tempoCandidates: [{ bpm: 120, weight: 4 }],
  window: { startMs: 1000, bars: 1 },
  pattern: {
    kick: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    snare: Array.from({ length: 16 }, () => false),
    hat: Array.from({ length: 16 }, () => false),
    openHat: Array.from({ length: 16 }, () => false),
    clap: Array.from({ length: 16 }, () => false),
    "808": Array.from({ length: 16 }, () => false),
    bassGuitar: Array.from({ length: 16 }, () => false),
    melody: Array.from({ length: 16 }, () => false),
  },
  classifications: [
    {
      id: "hit-1",
      atMs: 250,
      stepIndex: 2,
      stepNumber: 3,
      instrument: "kick",
      confidence: 0.72,
      needsCorrection: false,
      source: "auto",
      features: {
        atMs: 250,
        stepIndex: 2,
        stepNumber: 3,
        energy: 0.8,
        brightness: 0.2,
        peakToRms: 0.5,
        sustainMs: 40,
        strength: 0.7,
      },
    },
  ],
  overallConfidence: 0.76,
};

describe("createSongLabPreview", () => {
  it("builds a waveform preview with absolute onset markers", () => {
    const preview = createSongLabPreview(
      {
        samples: new Float32Array([0, 0.2, -0.7, 0.1, 0, 0.8, -0.1, 0]),
        sampleRate: 8,
        durationMs: 4000,
      },
      baseDecomp,
      8,
    );

    expect(preview.bars).toHaveLength(8);
    expect(preview.windowStartPercent).toBe(25);
    expect(preview.windowWidthPercent).toBe(50);
    expect(preview.bars.some((bar) => bar.inWindow)).toBe(true);
    expect(preview.markers).toEqual([
      expect.objectContaining({
        atMs: 1250,
        leftPercent: 31.25,
        instrument: "kick",
        stepNumber: 3,
        confidencePercent: 72,
      }),
    ]);
  });
});
