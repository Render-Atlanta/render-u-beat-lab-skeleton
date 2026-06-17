import { describe, expect, it } from "vitest";
import {
  createOnsetPreview,
  detectOnsets,
  levelFramesToAmplitudeEnvelope,
  mapOnsetsToStepHits,
  quantizeOnsetsToSteps,
  waveformToAmplitudeEnvelope,
  type AmplitudeFrame,
  type DetectedOnset,
} from "./onsetDetection";
import type { MicLevelFrame } from "./micCapture";

function frames(amplitudes: number[], spacingMs = 50): AmplitudeFrame[] {
  return amplitudes.map((amplitude, index) => ({
    atMs: index * spacingMs,
    amplitude,
  }));
}

function onset(atMs: number, strength: number, amplitude = strength + 0.2): DetectedOnset {
  return {
    atMs,
    amplitude,
    strength,
    frameIndex: 0,
    threshold: 0.1,
  };
}

describe("onset detection helpers", () => {
  it("ignores quiet background noise instead of creating constant false hits", () => {
    const quietRoom = frames([0.008, 0.012, 0.01, 0.014, 0.011, 0.016, 0.009, 0.013]);

    expect(detectOnsets(quietRoom)).toEqual([]);
    expect(createOnsetPreview({ envelope: quietRoom, durationMs: 800 }).cleanedGrid).toEqual(
      Array.from({ length: 16 }, () => false),
    );
  });

  it("detects clean table taps from mic level frames", () => {
    const levels: MicLevelFrame[] = [
      { atMs: 0, rms: 0.3, peak: 0.9 },
      { atMs: 50, rms: 0.02, peak: 0.03 },
      { atMs: 400, rms: 0.24, peak: 0.82 },
      { atMs: 450, rms: 0.02, peak: 0.04 },
      { atMs: 800, rms: 0.28, peak: 0.88 },
      { atMs: 850, rms: 0.02, peak: 0.03 },
      { atMs: 1_200, rms: 0.22, peak: 0.76 },
      { atMs: 1_250, rms: 0.02, peak: 0.03 },
    ];

    const preview = createOnsetPreview({
      levels,
      levelSource: "mixed",
      durationMs: 1_600,
    });

    expect(preview.rawHits.map((hit) => hit.atMs)).toEqual([0, 400, 800, 1_200]);
    expect(preview.cleanedHits.map((hit) => hit.stepNumber)).toEqual([1, 5, 9, 13]);
    expect(preview.cleanedGrid.filter(Boolean)).toHaveLength(4);
  });

  it("keeps dense taps separate while collapsing peaks inside one transient", () => {
    const denseTaps: AmplitudeFrame[] = [
      { atMs: 0, amplitude: 0.01 },
      { atMs: 50, amplitude: 0.02 },
      { atMs: 100, amplitude: 0.55 },
      { atMs: 130, amplitude: 0.03 },
      { atMs: 160, amplitude: 0.75 },
      { atMs: 210, amplitude: 0.02 },
      { atMs: 270, amplitude: 0.62 },
      { atMs: 320, amplitude: 0.02 },
    ];

    expect(detectOnsets(denseTaps, { minGapMs: 100 }).map((hit) => hit.atMs)).toEqual([
      160,
      270,
    ]);
  });

  it("uses sensitivity to lower or raise the adaptive threshold", () => {
    const mediumTap = frames([0.01, 0.018, 0.08, 0.02, 0.012]);

    expect(detectOnsets(mediumTap, { sensitivity: 0.1 })).toEqual([]);
    expect(detectOnsets(mediumTap, { sensitivity: 0.9 }).map((hit) => hit.atMs)).toEqual([
      100,
    ]);
  });

  it("quantizes raw hits to a 16-step grid and keeps the strongest hit per step", () => {
    const rawHits = [
      onset(12, 0.4),
      onset(245, 0.2),
      onset(249, 0.55),
      onset(375, 0.3),
      onset(1_510, 0.6),
    ];

    expect(mapOnsetsToStepHits(rawHits, { durationMs: 1_600 }).map((hit) => hit.stepNumber)).toEqual([
      1,
      3,
      3,
      5,
      16,
    ]);

    const cleanedHits = quantizeOnsetsToSteps(rawHits, { durationMs: 1_600 });
    expect(cleanedHits.map((hit) => hit.stepNumber)).toEqual([1, 3, 5, 16]);
    expect(cleanedHits.find((hit) => hit.stepNumber === 3)?.atMs).toBe(249);
  });

  it("builds preview data for raw hits and the cleaned grid", () => {
    const preview = createOnsetPreview({
      envelope: [
        { atMs: 0, amplitude: 0.01 },
        { atMs: 210, amplitude: 0.5 },
        { atMs: 225, amplitude: 0.02 },
        { atMs: 240, amplitude: 0.6 },
        { atMs: 255, amplitude: 0.02 },
      ],
      durationMs: 1_600,
      minGapMs: 0,
    });

    expect(preview.rawHits).toHaveLength(2);
    expect(preview.rawStepHits.map((hit) => hit.stepNumber)).toEqual([3, 3]);
    expect(preview.cleanedHits.map((hit) => hit.atMs)).toEqual([240]);
    expect(preview.cleanedGrid[2]).toBe(true);
  });

  it("can quantize a short take against the sequencer loop instead of the capture window", () => {
    const preview = createOnsetPreview({
      envelope: [
        { atMs: 0, amplitude: 0.9 },
        { atMs: 50, amplitude: 0.02 },
        { atMs: 423, amplitude: 0.86 },
        { atMs: 473, amplitude: 0.02 },
        { atMs: 845, amplitude: 0.88 },
        { atMs: 895, amplitude: 0.02 },
        { atMs: 1_268, amplitude: 0.84 },
        { atMs: 1_318, amplitude: 0.02 },
      ],
      durationMs: 4_000,
      quantizationDurationMs: 1_690,
    });

    expect(preview.cleanedHits.map((hit) => hit.stepNumber)).toEqual([1, 5, 9, 13]);
  });

  it("wraps repeated bars onto the same loop grid when quantizing a longer capture", () => {
    const preview = createOnsetPreview({
      envelope: [
        { atMs: 0, amplitude: 0.8 },
        { atMs: 50, amplitude: 0.01 },
        { atMs: 400, amplitude: 0.82 },
        { atMs: 450, amplitude: 0.01 },
        { atMs: 1_600, amplitude: 0.86 },
        { atMs: 1_650, amplitude: 0.01 },
        { atMs: 2_000, amplitude: 0.84 },
        { atMs: 2_050, amplitude: 0.01 },
      ],
      durationMs: 4_000,
      quantizationDurationMs: 1_600,
    });

    expect(preview.rawStepHits.map((hit) => hit.stepNumber)).toEqual([1, 5, 1, 5]);
    expect(preview.cleanedHits.map((hit) => hit.stepNumber)).toEqual([1, 5]);
  });

  it("converts waveform bins into an amplitude envelope for detection", () => {
    const envelope = waveformToAmplitudeEnvelope([0, 0.01, -0.85, 0.02, 0, 0.72, 0.01, 0], 800, {
      bins: 8,
    });

    expect(envelope.map((frame) => frame.atMs)).toEqual([
      50,
      150,
      250,
      350,
      450,
      550,
      650,
      750,
    ]);
    expect(detectOnsets(envelope, { minGapMs: 100 }).map((hit) => hit.atMs)).toEqual([
      250,
      550,
    ]);
  });

  it("can expose peak-only level envelopes when the UI wants a sharper preview", () => {
    const envelope = levelFramesToAmplitudeEnvelope(
      [
        { atMs: 0, rms: 0.1, peak: 0.6 },
        { atMs: 50, rms: 0.2, peak: 0.4 },
      ],
      { source: "peak" },
    );

    expect(envelope).toEqual([
      { atMs: 0, amplitude: 0.6 },
      { atMs: 50, amplitude: 0.4 },
    ]);
  });
});
