import type { BeatStyleId } from "../lib/beatStyles";
import type { PatternChangeSummary } from "../lib/beatCoach";

export interface GoldenBeatStyleFixture {
  serializedPattern: string;
  hitCount: number;
  densityLevel: PatternChangeSummary["densityLevel"];
  densitySummary: string;
  pocketSummary: string;
}

export const GOLDEN_BEAT_STYLE_FIXTURES: Record<
  BeatStyleId,
  GoldenBeatStyleFixture
> = {
  trap: {
    serializedPattern:
      "1001001000100010.0000000010000000.1010101011111011.0000010000000100.0000000010000000.1000001000100000.0000000000000000",
    hitCount: 23,
    densityLevel: "balanced",
    densitySummary:
      "Still balanced: 23 hits keeps the same density as Atlanta trap pocket.",
    pocketSummary: "The offset snare pocket stays intact.",
  },
  crunk: {
    serializedPattern:
      "1001001000100000.0000100000001000.1010101010101010.0000000000000001.0000100000001000.1000001000000000.0000000000000000",
    hitCount: 19,
    densityLevel: "balanced",
    densitySummary: "Still balanced: 19 hits keeps the same density as Crunk chant.",
    pocketSummary:
      "The snare still marks steps 5 and 13, so the center stays easy to follow.",
  },
  drill: {
    serializedPattern:
      "1000010001010010.0000000010000000.1010111010101110.0001000000010000.0000000010000000.1000000001000000.0000000000000000",
    hitCount: 21,
    densityLevel: "balanced",
    densitySummary: "Still balanced: 21 hits keeps the same density as Drill slide.",
    pocketSummary: "The offset snare pocket stays intact.",
  },
  rnb: {
    serializedPattern:
      "1000000100100000.0000100000001000.1001001001001001.0000000000010000.0000100000001000.1000000100000000.0000000000000000",
    hitCount: 16,
    densityLevel: "open",
    densitySummary: "Still open: 16 hits keeps the same density as R&B pocket.",
    pocketSummary:
      "The snare still marks steps 5 and 13, so the center stays easy to follow.",
  },
  pop: {
    serializedPattern:
      "1000001000100000.0000100000001000.1010101010101010.0000000100000001.0000100000001000.1000000000100000.0000000000000000",
    hitCount: 19,
    densityLevel: "balanced",
    densitySummary: "Still balanced: 19 hits keeps the same density as Pop bounce.",
    pocketSummary:
      "The snare still marks steps 5 and 13, so the center stays easy to follow.",
  },
  afrobeats: {
    serializedPattern:
      "1001001000100100.0000100000001000.1010010101010011.0000001000000010.0000100000001000.1000001000000100.0000000000000000",
    hitCount: 22,
    densityLevel: "balanced",
    densitySummary:
      "Still balanced: 22 hits keeps the same density as Afrobeats bounce.",
    pocketSummary:
      "The snare still marks steps 5 and 13, so the center stays easy to follow.",
  },
  amapiano: {
    serializedPattern:
      "1000000010010010.0000100000001000.1001001001001001.0000010000100010.0000100000001000.1000000010010000.0000000000000000",
    hitCount: 20,
    densityLevel: "balanced",
    densitySummary:
      "Still balanced: 20 hits keeps the same density as Amapiano log pulse.",
    pocketSummary:
      "The snare still marks steps 5 and 13, so the center stays easy to follow.",
  },
};
