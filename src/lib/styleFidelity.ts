import type { BeatStyle, BeatStyleId } from "./beatStyles";
import { countActiveSteps, type InstrumentId, type Pattern } from "./patterns";
import type { DecodedKit } from "./styleRender";
import { renderPatternToPcm, RENDER_SAMPLE_RATE } from "./styleRender";
import { STYLE_GOLDENS, STYLE_PROFILE_STATS } from "./styleProfiles.generated";

export interface StyleFeatureVector {
  bpmNorm: number;
  swing: number;
  onsetDensity: number;
  laneShareKick: number;
  laneShareSnare: number;
  laneShareHat: number;
  laneShareOpenHat: number;
  syncopation: number;
  backbeat: number;
  rmsNorm: number;
  lowEnergyShare: number;
  zcr: number;
}

export const FEATURE_KEYS: (keyof StyleFeatureVector)[] = [
  "bpmNorm", "swing", "onsetDensity",
  "laneShareKick", "laneShareSnare", "laneShareHat", "laneShareOpenHat",
  "syncopation", "backbeat", "rmsNorm", "lowEnergyShare", "zcr",
];

const STEPS = 16;
const LANES: InstrumentId[] = ["kick", "snare", "hat", "openHat"];
// Strong 16th positions = the four quarter-note downbeats (0-based indices).
const STRONG_POSITIONS = new Set([0, 4, 8, 12]);
// Backbeat slots = beats 2 and 4 (0-based indices).
const BACKBEAT_POSITIONS = [4, 12];

function laneHits(row: boolean[]): number {
  return row.filter(Boolean).length;
}

export function extractRhythmFeatures(pattern: Pattern, style: BeatStyle) {
  for (const lane of LANES) {
    if (pattern[lane].length !== STEPS) {
      throw new Error(
        `extractRhythmFeatures: lane "${lane}" has ${pattern[lane].length} steps, expected ${STEPS}`,
      );
    }
  }
  const total = countActiveSteps(pattern);
  const share = (row: boolean[]) => (total === 0 ? 0 : laneHits(row) / total);

  let weakHits = 0;
  for (const lane of LANES) {
    pattern[lane].forEach((on, i) => {
      if (on && !STRONG_POSITIONS.has(i)) weakHits += 1;
    });
  }
  const syncopation = total === 0 ? 0 : weakHits / total;

  const snareBackbeat =
    BACKBEAT_POSITIONS.filter((i) => pattern.snare[i]).length / BACKBEAT_POSITIONS.length;

  return {
    bpmNorm: style.bpm / 200,
    swing: style.swing,
    onsetDensity: total / (LANES.length * STEPS),
    laneShareKick: share(pattern.kick),
    laneShareSnare: share(pattern.snare),
    laneShareHat: share(pattern.hat),
    laneShareOpenHat: share(pattern.openHat),
    syncopation,
    backbeat: snareBackbeat,
  };
}

// One-pole lowpass coefficient for a ~200Hz cutoff at the render sample rate.
const LOWPASS_CUTOFF_HZ = 200;

function spectralFeatures(pcm: Float32Array) {
  const dt = 1 / RENDER_SAMPLE_RATE;
  const rc = 1 / (2 * Math.PI * LOWPASS_CUTOFF_HZ);
  const alpha = dt / (rc + dt);

  let sumSq = 0;
  let lowSumSq = 0;
  let zeroCrossings = 0;
  let lp = 0;
  let prev = 0;
  for (let i = 0; i < pcm.length; i += 1) {
    const x = pcm[i];
    sumSq += x * x;
    lp += alpha * (x - lp);
    lowSumSq += lp * lp;
    if (i > 0 && Math.sign(x) !== Math.sign(prev) && x !== 0) zeroCrossings += 1;
    prev = x;
  }
  const n = pcm.length || 1;
  const rms = Math.sqrt(sumSq / n);
  return {
    rmsNorm: Math.min(1, rms),
    lowEnergyShare: sumSq === 0 ? 0 : lowSumSq / sumSq,
    zcr: zeroCrossings / n,
  };
}

export function extractStyleFeatures(
  pattern: Pattern,
  style: BeatStyle,
  pcm: Float32Array,
): StyleFeatureVector {
  return { ...extractRhythmFeatures(pattern, style), ...spectralFeatures(pcm) };
}

export interface NormalizationStats {
  mean: StyleFeatureVector;
  std: StyleFeatureVector;
}

function emptyVector(): StyleFeatureVector {
  const v = {} as StyleFeatureVector;
  for (const key of FEATURE_KEYS) v[key] = 0;
  return v;
}

export function computeNormalizationStats(
  vectors: StyleFeatureVector[],
): NormalizationStats {
  const mean = emptyVector();
  const std = emptyVector();
  const n = vectors.length || 1;
  for (const key of FEATURE_KEYS) {
    const m = vectors.reduce((sum, v) => sum + v[key], 0) / n;
    const variance = vectors.reduce((sum, v) => sum + (v[key] - m) ** 2, 0) / n;
    mean[key] = m;
    std[key] = Math.sqrt(variance) || 1; // zero-safe: constant feature -> std 1
  }
  return { mean, std };
}

function zScore(v: StyleFeatureVector, stats: NormalizationStats): number[] {
  return FEATURE_KEYS.map((k) => (v[k] - stats.mean[k]) / stats.std[k]);
}

export function styleSimilarity(
  a: StyleFeatureVector,
  b: StyleFeatureVector,
  stats: NormalizationStats,
): number {
  const za = zScore(a, stats);
  const zb = zScore(b, stats);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < za.length; i += 1) {
    dot += za[i] * zb[i];
    na += za[i] * za[i];
    nb += zb[i] * zb[i];
  }
  if (na === 0 || nb === 0) return na === nb ? 1 : 0; // both-zero vectors are identical
  const cos = dot / (Math.sqrt(na) * Math.sqrt(nb));
  return Math.min(1, Math.max(0, (1 + cos) / 2));
}

export function scoreStyleFidelity(
  style: BeatStyle,
  kit: DecodedKit,
): { score: number; nearestGenre: BeatStyleId } {
  const features = extractStyleFeatures(style.pattern, style, renderPatternToPcm(style.pattern, style, kit));
  const ids = Object.keys(STYLE_GOLDENS) as BeatStyleId[];
  let nearestGenre = style.id;
  let best = -Infinity;
  for (const id of ids) {
    const sim = styleSimilarity(features, STYLE_GOLDENS[id], STYLE_PROFILE_STATS);
    if (sim > best) {
      best = sim;
      nearestGenre = id;
    }
  }
  return {
    score: styleSimilarity(features, STYLE_GOLDENS[style.id], STYLE_PROFILE_STATS),
    nearestGenre,
  };
}
