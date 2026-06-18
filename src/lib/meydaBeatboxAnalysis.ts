import Meyda from "meyda";
import {
  extractBeatboxHitFeatures,
  RULE_BASED_BEATBOX_ANALYSIS_PROVIDER,
  type BeatboxAnalysisContext,
  type BeatboxAnalysisProvider,
  type BeatboxHitFeatures,
} from "./beatboxClassifier";
import type { QuantizedOnset } from "./onsetDetection";

export interface MeydaFeatureResult {
  rms?: number;
  zcr?: number;
  spectralCentroid?: number;
}

export interface MeydaRuntimePort {
  extract(
    features: string[],
    signal: ArrayLike<number>,
  ): MeydaFeatureResult | null;
}

export interface MeydaBeatboxAnalysisOptions {
  runtime?: MeydaRuntimePort;
  fallback?: BeatboxAnalysisProvider;
  windowSize?: number;
}

const DEFAULT_MEYDA_WINDOW_SIZE = 64;

export function createMeydaBeatboxAnalysisProvider(
  options: MeydaBeatboxAnalysisOptions = {},
): BeatboxAnalysisProvider {
  const runtime = options.runtime ?? Meyda;
  const fallback = options.fallback ?? RULE_BASED_BEATBOX_ANALYSIS_PROVIDER;
  const windowSize = options.windowSize ?? DEFAULT_MEYDA_WINDOW_SIZE;

  return {
    id: "meyda-waveform",
    extractHitFeatures(hit, context) {
      const fallbackFeatures = fallback.extractHitFeatures(hit, context);
      const signal = getWaveformWindow(hit, context, windowSize);

      if (!signal) {
        return fallbackFeatures;
      }

      try {
        const features = runtime.extract(
          ["rms", "zcr", "spectralCentroid"],
          signal,
        );
        return mergeMeydaFeatures(fallbackFeatures, features, signal.length);
      } catch {
        return fallbackFeatures;
      }
    },
  };
}

export function getWaveformWindow(
  hit: Pick<QuantizedOnset, "atMs">,
  context: Pick<BeatboxAnalysisContext, "waveform" | "durationMs">,
  windowSize = DEFAULT_MEYDA_WINDOW_SIZE,
): number[] | null {
  if (!context.waveform || !context.durationMs || context.durationMs <= 0) {
    return null;
  }

  const source = Array.from(context.waveform, clampSigned);
  if (source.length === 0) {
    return null;
  }

  const safeWindowSize = Math.max(16, Math.min(source.length, Math.round(windowSize)));
  const centerIndex = Math.max(
    0,
    Math.min(
      source.length - 1,
      Math.round((hit.atMs / context.durationMs) * (source.length - 1)),
    ),
  );
  const maxStartIndex = Math.max(0, source.length - safeWindowSize);
  const startIndex = Math.max(
    0,
    Math.min(maxStartIndex, centerIndex - Math.floor(safeWindowSize / 2)),
  );
  const window = source.slice(startIndex, startIndex + safeWindowSize);

  while (window.length < safeWindowSize) {
    window.push(0);
  }

  return window;
}

function mergeMeydaFeatures(
  fallback: BeatboxHitFeatures,
  features: MeydaFeatureResult | null,
  signalLength: number,
): BeatboxHitFeatures {
  if (!features) {
    return fallback;
  }

  const rms = normalizeFeature(features.rms);
  const zeroCrossingBrightness = normalizeZeroCrossingRate(features.zcr, signalLength);
  const centroidBrightness = normalizeCentroid(features.spectralCentroid, signalLength);
  const brightness = Math.max(
    fallback.brightness,
    zeroCrossingBrightness,
    centroidBrightness,
  );

  return {
    ...fallback,
    energy: roundFeature(Math.max(fallback.energy, rms)),
    brightness: roundFeature(brightness),
  };
}

function normalizeZeroCrossingRate(value: number | undefined, signalLength: number): number {
  if (!Number.isFinite(value) || signalLength <= 1) {
    return 0;
  }

  return clamp01((value ?? 0) / signalLength);
}

function normalizeCentroid(value: number | undefined, signalLength: number): number {
  if (!Number.isFinite(value) || signalLength <= 1) {
    return 0;
  }

  return clamp01((value ?? 0) / (signalLength / 2));
}

function normalizeFeature(value: number | undefined): number {
  return Number.isFinite(value) ? clamp01(value ?? 0) : 0;
}

function clampSigned(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(-1, Math.min(1, value));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function roundFeature(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
