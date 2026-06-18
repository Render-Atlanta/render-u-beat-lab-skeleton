import type { MicLevelFrame } from "./micCapture";
import type { OnsetPreview, QuantizedOnset } from "./onsetDetection";
import { type InstrumentId, type Pattern } from "./patterns";
import { INSTRUMENT_ORDER } from "./patternState";

export interface BeatboxHitFeatures {
  atMs: number;
  stepIndex: number;
  stepNumber: number;
  energy: number;
  brightness: number;
  peakToRms: number;
  sustainMs: number;
  strength: number;
}

export interface BeatboxLaneClassification {
  id: string;
  atMs: number;
  stepIndex: number;
  stepNumber: number;
  instrument: InstrumentId;
  confidence: number;
  needsCorrection: boolean;
  source: "auto" | "manual";
  features: BeatboxHitFeatures;
}

export interface BeatboxAnalysisContext {
  levels: ReadonlyArray<MicLevelFrame>;
  waveform?: ArrayLike<number>;
  durationMs?: number;
}

export interface BeatboxAnalysisProvider {
  id: string;
  extractHitFeatures(
    hit: QuantizedOnset,
    context: BeatboxAnalysisContext,
  ): BeatboxHitFeatures;
}

export interface BeatboxClassificationOptions {
  provider?: BeatboxAnalysisProvider;
  waveform?: ArrayLike<number>;
  durationMs?: number;
}

interface InstrumentScore {
  instrument: InstrumentId;
  score: number;
}

const LOW_CONFIDENCE_THRESHOLD = 0.65;

export const RULE_BASED_BEATBOX_ANALYSIS_PROVIDER: BeatboxAnalysisProvider = {
  id: "rule-based-levels",
  extractHitFeatures: (hit, context) =>
    extractBeatboxHitFeatures(hit, context.levels),
};

export function classifyBeatboxHits(
  preview: OnsetPreview,
  levels: ReadonlyArray<MicLevelFrame>,
  options: BeatboxClassificationOptions = {},
): BeatboxLaneClassification[] {
  const provider = options.provider ?? RULE_BASED_BEATBOX_ANALYSIS_PROVIDER;
  const context: BeatboxAnalysisContext = {
    levels,
    waveform: options.waveform,
    durationMs: options.durationMs,
  };

  return preview.cleanedHits.map((hit) => {
    const features = provider.extractHitFeatures(hit, context);
    const scores = scoreBeatboxFeatures(features);
    const [winner, runnerUp] = scores;
    const confidence = calculateConfidence(winner.score, runnerUp?.score ?? 0);

    return {
      id: createHitId(hit),
      atMs: hit.atMs,
      stepIndex: hit.stepIndex,
      stepNumber: hit.stepNumber,
      instrument: winner.instrument,
      confidence,
      needsCorrection: confidence < LOW_CONFIDENCE_THRESHOLD,
      source: "auto",
      features,
    };
  });
}

export function moveBeatboxHitToLane(
  hits: ReadonlyArray<BeatboxLaneClassification>,
  hitId: string,
  instrument: InstrumentId,
): BeatboxLaneClassification[] {
  return hits.map((hit) =>
    hit.id === hitId
      ? {
          ...hit,
          instrument,
          confidence: 1,
          needsCorrection: false,
          source: "manual",
        }
      : hit,
  );
}

export function preserveManualBeatboxCorrections(
  nextHits: ReadonlyArray<BeatboxLaneClassification>,
  previousHits: ReadonlyArray<BeatboxLaneClassification>,
): BeatboxLaneClassification[] {
  const manualByTiming = new Map(
    previousHits
      .filter((hit) => hit.source === "manual")
      .map((hit) => [createTimingKey(hit.atMs), hit]),
  );

  return nextHits.map((hit) => {
    const manualHit = manualByTiming.get(createTimingKey(hit.atMs));

    if (!manualHit) {
      return hit;
    }

    return {
      ...hit,
      instrument: manualHit.instrument,
      confidence: 1,
      needsCorrection: false,
      source: "manual",
    };
  });
}

export function classifiedHitsToPattern(
  hits: ReadonlyArray<Pick<BeatboxLaneClassification, "instrument" | "stepIndex">>,
): Pattern {
  const pattern = Object.fromEntries(
    INSTRUMENT_ORDER.map((instrument) => [
      instrument,
      Array.from({ length: 16 }, () => false),
    ]),
  ) as Pattern;

  for (const hit of hits) {
    if (Number.isInteger(hit.stepIndex) && hit.stepIndex >= 0 && hit.stepIndex < 16) {
      pattern[hit.instrument][hit.stepIndex] = true;
    }
  }

  return pattern;
}

export function extractBeatboxHitFeatures(
  hit: QuantizedOnset,
  levels: ReadonlyArray<MicLevelFrame>,
): BeatboxHitFeatures {
  const localFrames = getFramesNearHit(hit.atMs, levels);
  const brightestFrame = maxBy(localFrames, readFrameBrightness);
  const loudestFrame = maxBy(localFrames, readFrameEnergy);
  const brightness = readFrameBrightness(brightestFrame ?? loudestFrame);
  const energy = Math.max(hit.amplitude, readFrameEnergy(loudestFrame));
  const peakToRms = readPeakToRms(loudestFrame);

  return {
    atMs: hit.atMs,
    stepIndex: hit.stepIndex,
    stepNumber: hit.stepNumber,
    energy: roundFeature(energy),
    brightness: roundFeature(brightness),
    peakToRms: roundFeature(peakToRms),
    sustainMs: estimateSustainMs(hit, levels),
    strength: roundFeature(hit.strength),
  };
}

function scoreBeatboxFeatures(features: BeatboxHitFeatures): InstrumentScore[] {
  const energy = features.energy;
  const brightness = features.brightness;
  const sustain = Math.min(1, features.sustainMs / 220);
  const transient = Math.max(0, 1 - sustain);

  const scores: InstrumentScore[] = [
    {
      instrument: "kick",
      score: 0.42 + (1 - brightness) * 0.42 + energy * 0.22 - sustain * 0.12,
    },
    {
      instrument: "snare",
      score: 0.22 + brightness * 0.32 + energy * 0.36 + transient * 0.16,
    },
    {
      instrument: "hat",
      score: 0.16 + brightness * 0.52 + transient * 0.25 + (1 - energy) * 0.1,
    },
    {
      instrument: "openHat",
      score: 0.1 + brightness * 0.48 + sustain * 0.34 + (1 - energy) * 0.08,
    },
  ];

  if (brightness < 0.24 && energy >= 0.2) {
    scores.find((score) => score.instrument === "kick")!.score += 0.28;
  }

  if (brightness >= 0.42 && energy >= 0.45) {
    scores.find((score) => score.instrument === "snare")!.score += 0.16;
  }

  if (brightness >= 0.5 && energy < 0.58 && sustain < 0.55) {
    scores.find((score) => score.instrument === "hat")!.score += 0.22;
  }

  if (brightness >= 0.42 && sustain >= 0.62) {
    scores.find((score) => score.instrument === "openHat")!.score += 0.22;
  }

  return scores.sort((a, b) => b.score - a.score);
}

function calculateConfidence(winnerScore: number, runnerUpScore: number): number {
  const margin = Math.max(0, winnerScore - runnerUpScore);
  return roundFeature(Math.min(0.98, 0.34 + margin * 1.55));
}

function getFramesNearHit(
  atMs: number,
  levels: ReadonlyArray<MicLevelFrame>,
): MicLevelFrame[] {
  const windowFrames = levels.filter((level) => level.atMs >= atMs - 80 && level.atMs <= atMs + 180);

  if (windowFrames.length > 0) {
    return windowFrames;
  }

  const nearest = minBy(levels, (level) => Math.abs(level.atMs - atMs));
  return nearest ? [nearest] : [];
}

function estimateSustainMs(
  hit: QuantizedOnset,
  levels: ReadonlyArray<MicLevelFrame>,
): number {
  const threshold = Math.max(0.04, hit.amplitude * 0.35);
  const trailingFrames = levels
    .filter((level) => level.atMs >= hit.atMs && level.atMs <= hit.atMs + 320)
    .sort((a, b) => a.atMs - b.atMs);

  let lastActiveAtMs = hit.atMs;

  for (const frame of trailingFrames) {
    if (readFrameEnergy(frame) < threshold) {
      break;
    }

    lastActiveAtMs = frame.atMs;
  }

  return Math.max(0, Math.round(lastActiveAtMs - hit.atMs));
}

function readFrameEnergy(frame: MicLevelFrame | undefined): number {
  if (!frame) {
    return 0;
  }

  return clamp01(frame.peak * 0.65 + frame.rms * 0.35);
}

function readFrameBrightness(frame: MicLevelFrame | undefined): number {
  if (!frame) {
    return 0;
  }

  if (typeof frame.zeroCrossingRate === "number") {
    return clamp01(frame.zeroCrossingRate * 2.8);
  }

  return readPeakToRms(frame);
}

function readPeakToRms(frame: MicLevelFrame | undefined): number {
  if (!frame || frame.peak <= 0) {
    return 0;
  }

  return clamp01((frame.peak - frame.rms) / frame.peak);
}

function createHitId(hit: QuantizedOnset): string {
  return `${hit.stepIndex}-${Math.round(hit.atMs)}-${Math.round(hit.amplitude * 1000)}`;
}

function createTimingKey(atMs: number): string {
  return String(Math.round(atMs));
}

function maxBy<T>(values: ReadonlyArray<T>, readValue: (value: T) => number): T | undefined {
  return values.reduce<T | undefined>(
    (best, value) => (!best || readValue(value) > readValue(best) ? value : best),
    undefined,
  );
}

function minBy<T>(values: ReadonlyArray<T>, readValue: (value: T) => number): T | undefined {
  return values.reduce<T | undefined>(
    (best, value) => (!best || readValue(value) < readValue(best) ? value : best),
    undefined,
  );
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function roundFeature(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
