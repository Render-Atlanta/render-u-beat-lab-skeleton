import { MAX_BPM, MIN_BPM } from "./sequencerDomain";

export interface TempoEstimate {
  bpm: number;
  confidence: number;
  candidates: { bpm: number; weight: number }[];
}

function foldIntoRange(bpm: number, minBpm: number, maxBpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) return (minBpm + maxBpm) / 2;
  let folded = bpm;
  while (folded < minBpm) folded *= 2;
  while (folded > maxBpm) folded /= 2;
  return folded;
}

/**
 * Estimate the dominant tempo from onset times using an inter-onset-interval
 * (IOI) histogram, octave-folded into the [minBpm, maxBpm] guardrail.
 */
export function estimateTempo(
  onsetTimesMs: number[],
  opts: { minBpm?: number; maxBpm?: number } = {},
): TempoEstimate {
  const minBpm = opts.minBpm ?? MIN_BPM;
  const maxBpm = opts.maxBpm ?? MAX_BPM;
  const fallback = (minBpm + maxBpm) / 2;

  const sorted = [...onsetTimesMs].sort((a, b) => a - b);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > 1) intervals.push(gap);
  }
  if (intervals.length === 0) {
    return { bpm: Math.round(fallback), confidence: 0, candidates: [] };
  }

  // Histogram of folded BPMs in 1-BPM bins.
  const bins = new Map<number, number>();
  for (const gap of intervals) {
    const bpm = foldIntoRange(60000 / gap, minBpm, maxBpm);
    const bin = Math.round(bpm);
    bins.set(bin, (bins.get(bin) ?? 0) + 1);
  }

  const candidates = [...bins.entries()]
    .map(([bpm, weight]) => ({ bpm, weight }))
    .sort((a, b) => b.weight - a.weight);

  const total = candidates.reduce((sum, c) => sum + c.weight, 0);
  const top = candidates[0];
  return {
    bpm: top.bpm,
    confidence: total === 0 ? 0 : top.weight / total,
    candidates,
  };
}
