import { describe, expect, it } from "vitest";
import {
  classifiedHitsToPattern,
  classifyBeatboxHits,
  extractBeatboxHitFeatures,
  moveBeatboxHitToLane,
  preserveManualBeatboxCorrections,
} from "./beatboxClassifier";
import type { MicLevelFrame } from "./micCapture";
import type { OnsetPreview, QuantizedOnset } from "./onsetDetection";

function hit(
  atMs: number,
  stepIndex: number,
  amplitude: number,
  strength = amplitude - 0.12,
): QuantizedOnset {
  return {
    atMs,
    amplitude,
    strength,
    stepIndex,
    stepNumber: stepIndex + 1,
  };
}

function preview(hits: QuantizedOnset[]): OnsetPreview {
  return {
    envelope: [],
    thresholds: {
      noiseFloor: 0.02,
      peakLevel: 0.9,
      threshold: 0.16,
      minRise: 0.04,
    },
    rawHits: [],
    rawStepHits: hits,
    cleanedHits: hits,
    rawGrid: Array.from({ length: 16 }, (_, index) =>
      hits.some((candidate) => candidate.stepIndex === index),
    ),
    cleanedGrid: Array.from({ length: 16 }, (_, index) =>
      hits.some((candidate) => candidate.stepIndex === index),
    ),
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

describe("beatbox classifier", () => {
  it("maps low-energy brightness beatbox hits to kick", () => {
    const hits = classifyBeatboxHits(
      preview([hit(100, 0, 0.74)]),
      [
        level(100, 0.78, 0.5, 0.03),
        level(150, 0.2, 0.12, 0.03),
      ],
    );

    expect(hits[0]).toMatchObject({
      instrument: "kick",
      needsCorrection: false,
      stepNumber: 1,
    });
    expect(hits[0].confidence).toBeGreaterThanOrEqual(0.58);
  });

  it("maps bright, loud, sharp hits to snare", () => {
    const hits = classifyBeatboxHits(
      preview([hit(420, 4, 0.82)]),
      [
        level(420, 0.86, 0.42, 0.18),
        level(470, 0.12, 0.05, 0.18),
      ],
    );

    expect(hits[0].instrument).toBe("snare");
    expect(hits[0].confidence).toBeGreaterThanOrEqual(0.58);
  });

  it("maps bright, lighter transients to hats", () => {
    const hits = classifyBeatboxHits(
      preview([hit(840, 8, 0.38, 0.2)]),
      [
        level(840, 0.42, 0.12, 0.24),
        level(890, 0.08, 0.03, 0.22),
      ],
    );

    expect(hits[0].instrument).toBe("hat");
  });

  it("uses sustained bright noise as an open hat cue", () => {
    const features = extractBeatboxHitFeatures(hit(1_200, 12, 0.44), [
      level(1_200, 0.46, 0.18, 0.18),
      level(1_250, 0.4, 0.16, 0.18),
      level(1_300, 0.34, 0.14, 0.18),
      level(1_350, 0.28, 0.1, 0.18),
    ]);
    const hits = classifyBeatboxHits(
      preview([hit(1_200, 12, 0.44)]),
      [
        level(1_200, 0.46, 0.18, 0.18),
        level(1_250, 0.4, 0.16, 0.18),
        level(1_300, 0.34, 0.14, 0.18),
        level(1_350, 0.28, 0.1, 0.18),
      ],
    );

    expect(features.sustainMs).toBeGreaterThanOrEqual(100);
    expect(hits[0].instrument).toBe("openHat");
  });

  it("marks ambiguous hits as needing correction", () => {
    const hits = classifyBeatboxHits(preview([hit(600, 6, 0.3, 0.12)]), [
      level(600, 0.24, 0.2, 0.09),
    ]);

    expect(hits[0].needsCorrection).toBe(true);
  });

  it("lets users move any classified hit to another lane", () => {
    const [classifiedHit] = classifyBeatboxHits(preview([hit(100, 0, 0.74)]), [
      level(100, 0.78, 0.5, 0.03),
    ]);

    const moved = moveBeatboxHitToLane([classifiedHit], classifiedHit.id, "snare");

    expect(moved[0]).toMatchObject({
      instrument: "snare",
      confidence: 1,
      needsCorrection: false,
      source: "manual",
    });
  });

  it("preserves manual lane corrections when capture analysis is rebuilt", () => {
    const [classifiedHit] = classifyBeatboxHits(preview([hit(400, 4, 0.82)]), [
      level(400, 0.86, 0.42, 0.18),
    ]);
    const [manualHit] = moveBeatboxHitToLane([classifiedHit], classifiedHit.id, "kick");
    const [rebuiltHit] = classifyBeatboxHits(preview([hit(400, 5, 0.82)]), [
      level(400, 0.86, 0.42, 0.18),
    ]);

    const [preservedHit] = preserveManualBeatboxCorrections([rebuiltHit], [manualHit]);

    expect(preservedHit).toMatchObject({
      instrument: "kick",
      stepIndex: 5,
      confidence: 1,
      needsCorrection: false,
      source: "manual",
    });
  });

  it("turns classified hits into a four-lane pattern", () => {
    const pattern = classifiedHitsToPattern([
      {
        instrument: "kick",
        stepIndex: 0,
      },
      {
        instrument: "snare",
        stepIndex: 4,
      },
      {
        instrument: "hat",
        stepIndex: 8,
      },
    ]);

    expect(pattern.kick[0]).toBe(true);
    expect(pattern.snare[4]).toBe(true);
    expect(pattern.hat[8]).toBe(true);
    expect(pattern.openHat.some(Boolean)).toBe(false);
  });
});

describe("capture supports the full lane set", () => {
  it("builds a seven-lane pattern from classified hits", () => {
    const pattern = classifiedHitsToPattern([
      { instrument: "kick", stepIndex: 0 },
      { instrument: "808", stepIndex: 4 },
      { instrument: "clap", stepIndex: 8 },
    ]);
    expect(Object.keys(pattern).sort()).toEqual(
      ["808", "bassGuitar", "clap", "hat", "kick", "melody", "openHat", "snare"],
    );
    expect(pattern["808"][4]).toBe(true);
    expect(pattern.clap[8]).toBe(true);
    expect(pattern.melody.some(Boolean)).toBe(false);
  });

  it("lets a user move an auto-classified hit onto the 808 lane", () => {
    const hits = [
      {
        id: "h1", atMs: 0, stepIndex: 0, stepNumber: 1,
        instrument: "kick" as const, confidence: 0.9, needsCorrection: false,
        source: "auto" as const,
        features: {
          atMs: 0, stepIndex: 0, stepNumber: 1, energy: 0.5, brightness: 0.2,
          peakToRms: 0.3, sustainMs: 40, strength: 0.5,
        },
      },
    ];
    const moved = moveBeatboxHitToLane(hits, "h1", "808");
    expect(moved[0].instrument).toBe("808");
    expect(moved[0].source).toBe("manual");
  });
});
