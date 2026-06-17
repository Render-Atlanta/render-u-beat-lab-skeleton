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
      "1001001000100010.0000000010000000.1010101011111011.0000010000000100",
    hitCount: 19,
    densityLevel: "balanced",
    densitySummary:
      "Still balanced: 19 hits keeps the same density as Atlanta trap pocket.",
    pocketSummary: "The offset snare pocket stays intact.",
  },
  crunk: {
    serializedPattern:
      "1001001000100000.0000100000001000.1010101010101010.0000000000000001",
    hitCount: 15,
    densityLevel: "open",
    densitySummary: "Still open: 15 hits keeps the same density as Crunk chant.",
    pocketSummary:
      "The snare still marks steps 5 and 13, so the center stays easy to follow.",
  },
  drill: {
    serializedPattern:
      "1000010001010010.0000000010000000.1010111010101110.0001000000010000",
    hitCount: 18,
    densityLevel: "open",
    densitySummary: "Still open: 18 hits keeps the same density as Drill slide.",
    pocketSummary: "The offset snare pocket stays intact.",
  },
  rnb: {
    serializedPattern:
      "1000000100100000.0000100000001000.1001001001001001.0000000000010000",
    hitCount: 12,
    densityLevel: "open",
    densitySummary: "Still open: 12 hits keeps the same density as R&B pocket.",
    pocketSummary:
      "The snare still marks steps 5 and 13, so the center stays easy to follow.",
  },
  pop: {
    serializedPattern:
      "1000001000100000.0000100000001000.1010101010101010.0000000100000001",
    hitCount: 15,
    densityLevel: "open",
    densitySummary: "Still open: 15 hits keeps the same density as Pop bounce.",
    pocketSummary:
      "The snare still marks steps 5 and 13, so the center stays easy to follow.",
  },
  afrobeats: {
    serializedPattern:
      "1001001000100100.0000100000001000.1010010101010011.0000001000000010",
    hitCount: 17,
    densityLevel: "open",
    densitySummary:
      "Still open: 17 hits keeps the same density as Afrobeats bounce.",
    pocketSummary:
      "The snare still marks steps 5 and 13, so the center stays easy to follow.",
  },
  amapiano: {
    serializedPattern:
      "1000000010010010.0000100000001000.1001001001001001.0000010000100010",
    hitCount: 15,
    densityLevel: "open",
    densitySummary:
      "Still open: 15 hits keeps the same density as Amapiano log pulse.",
    pocketSummary:
      "The snare still marks steps 5 and 13, so the center stays easy to follow.",
  },
};
