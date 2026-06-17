import type { MicLevelFrame } from "./micCapture";

export const DEFAULT_ONSET_STEPS = 16;
export const DEFAULT_ONSET_SENSITIVITY = 0.55;
export const DEFAULT_ONSET_MIN_GAP_MS = 90;
export const DEFAULT_WAVEFORM_ENVELOPE_BINS = 128;

export interface AmplitudeFrame {
  atMs: number;
  amplitude: number;
}

export interface LevelEnvelopeOptions {
  source?: "rms" | "peak" | "mixed";
}

export interface WaveformEnvelopeOptions {
  bins?: number;
  mode?: "peak" | "rms";
  startAtMs?: number;
}

export interface OnsetDetectionOptions {
  sensitivity?: number;
  threshold?: number;
  minAmplitude?: number;
  minRise?: number;
  minGapMs?: number;
}

export interface OnsetThresholds {
  noiseFloor: number;
  peakLevel: number;
  threshold: number;
  minRise: number;
}

export interface DetectedOnset {
  atMs: number;
  amplitude: number;
  strength: number;
  frameIndex: number;
  threshold: number;
}

export interface OnsetQuantizationOptions {
  durationMs: number;
  steps?: number;
  wrap?: boolean;
}

export interface QuantizedOnset {
  atMs: number;
  amplitude: number;
  strength: number;
  stepIndex: number;
  stepNumber: number;
}

export interface OnsetPreview {
  envelope: AmplitudeFrame[];
  thresholds: OnsetThresholds;
  rawHits: DetectedOnset[];
  rawStepHits: QuantizedOnset[];
  cleanedHits: QuantizedOnset[];
  rawGrid: boolean[];
  cleanedGrid: boolean[];
}

export interface OnsetPreviewInput extends OnsetDetectionOptions, OnsetQuantizationOptions {
  envelope?: ReadonlyArray<AmplitudeFrame>;
  levels?: ReadonlyArray<MicLevelFrame>;
  waveform?: ArrayLike<number>;
  levelSource?: LevelEnvelopeOptions["source"];
  quantizationDurationMs?: number;
  waveformBins?: number;
}

export function levelFramesToAmplitudeEnvelope(
  levels: ReadonlyArray<MicLevelFrame>,
  options: LevelEnvelopeOptions = {},
): AmplitudeFrame[] {
  const source = options.source ?? "mixed";

  return levels
    .map((level) => ({
      atMs: sanitizeTime(level.atMs),
      amplitude: roundLevel(readLevelAmplitude(level, source)),
    }))
    .sort((a, b) => a.atMs - b.atMs);
}

export function waveformToAmplitudeEnvelope(
  waveform: ArrayLike<number>,
  durationMs: number,
  options: WaveformEnvelopeOptions = {},
): AmplitudeFrame[] {
  const bins = options.bins ?? Math.min(DEFAULT_WAVEFORM_ENVELOPE_BINS, Math.max(1, waveform.length));
  const mode = options.mode ?? "peak";
  const startAtMs = options.startAtMs ?? 0;

  if (!Number.isInteger(bins) || bins < 1) {
    throw new Error(`Waveform envelope bins must be a positive integer: ${bins}`);
  }

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error(`Waveform duration must be a positive number: ${durationMs}`);
  }

  if (waveform.length === 0) {
    return Array.from({ length: bins }, (_, index) => ({
      atMs: roundTime(startAtMs + ((index + 0.5) * durationMs) / bins),
      amplitude: 0,
    }));
  }

  return Array.from({ length: bins }, (_, binIndex) => {
    const start = Math.floor((binIndex * waveform.length) / bins);
    const end = Math.max(start + 1, Math.floor(((binIndex + 1) * waveform.length) / bins));
    let peak = 0;
    let sumSquares = 0;
    let count = 0;

    for (let sampleIndex = start; sampleIndex < end && sampleIndex < waveform.length; sampleIndex += 1) {
      const amplitude = clampAmplitude(Math.abs(waveform[sampleIndex]));
      peak = Math.max(peak, amplitude);
      sumSquares += amplitude * amplitude;
      count += 1;
    }

    return {
      atMs: roundTime(startAtMs + ((binIndex + 0.5) * durationMs) / bins),
      amplitude: roundLevel(mode === "rms" ? Math.sqrt(sumSquares / Math.max(1, count)) : peak),
    };
  });
}

export function detectOnsets(
  envelope: ReadonlyArray<AmplitudeFrame>,
  options: OnsetDetectionOptions = {},
): DetectedOnset[] {
  const normalized = normalizeEnvelope(envelope);
  const thresholds = calculateOnsetThresholds(normalized, options);
  const minGapMs = Math.max(0, options.minGapMs ?? DEFAULT_ONSET_MIN_GAP_MS);
  const candidates: DetectedOnset[] = [];

  for (let index = 0; index < normalized.length; index += 1) {
    const frame = normalized[index];
    const previousAmplitude = index === 0 ? 0 : normalized[index - 1].amplitude;
    const nextAmplitude = index === normalized.length - 1 ? 0 : normalized[index + 1].amplitude;
    const rise = frame.amplitude - previousAmplitude;
    const isPeak = frame.amplitude > previousAmplitude && frame.amplitude >= nextAmplitude;

    if (isPeak && frame.amplitude >= thresholds.threshold && rise >= thresholds.minRise) {
      candidates.push({
        atMs: frame.atMs,
        amplitude: frame.amplitude,
        strength: roundLevel(frame.amplitude - thresholds.threshold),
        frameIndex: index,
        threshold: thresholds.threshold,
      });
    }
  }

  return suppressNearbyOnsets(candidates, minGapMs);
}

export function calculateOnsetThresholds(
  envelope: ReadonlyArray<AmplitudeFrame>,
  options: OnsetDetectionOptions = {},
): OnsetThresholds {
  const amplitudes = envelope.map((frame) => clampAmplitude(frame.amplitude));
  const sensitivity = clampSensitivity(options.sensitivity);
  const noiseFloor = roundLevel(percentile(amplitudes, 0.5));
  const peakLevel = roundLevel(Math.max(0, ...amplitudes));
  const dynamicRange = Math.max(0, peakLevel - noiseFloor);
  const adaptiveRatio = 1.1 - sensitivity * 0.9;
  const adaptiveThreshold = noiseFloor + dynamicRange * adaptiveRatio;
  const defaultMinAmplitude = Math.max(0.018, 0.04 - sensitivity * 0.015);
  const threshold = options.threshold === undefined
    ? Math.max(adaptiveThreshold, options.minAmplitude ?? defaultMinAmplitude)
    : clampAmplitude(options.threshold);
  const defaultMinRise = Math.max(0.008, dynamicRange * (0.18 - sensitivity * 0.08));

  return {
    noiseFloor,
    peakLevel,
    threshold: roundLevel(threshold),
    minRise: roundLevel(options.minRise ?? defaultMinRise),
  };
}

export function mapOnsetsToStepHits(
  onsets: ReadonlyArray<DetectedOnset>,
  options: OnsetQuantizationOptions,
): QuantizedOnset[] {
  const { durationMs, steps, stepMs, wrap } = normalizeQuantizationOptions(options);
  const maxIndex = steps - 1;

  return onsets
    .map((onset) => {
      const quantizedAtMs = wrap ? onset.atMs % durationMs : onset.atMs;
      const stepIndex = Math.max(0, Math.min(maxIndex, Math.round(quantizedAtMs / stepMs)));

      return {
        atMs: onset.atMs,
        amplitude: onset.amplitude,
        strength: onset.strength,
        stepIndex,
        stepNumber: stepIndex + 1,
      };
    })
    .sort((a, b) => a.atMs - b.atMs);
}

export function quantizeOnsetsToSteps(
  onsets: ReadonlyArray<DetectedOnset>,
  options: OnsetQuantizationOptions,
): QuantizedOnset[] {
  const rawStepHits = mapOnsetsToStepHits(onsets, options);
  const byStep = new Map<number, QuantizedOnset>();

  for (const hit of rawStepHits) {
    const existing = byStep.get(hit.stepIndex);
    if (
      !existing ||
      hit.strength > existing.strength ||
      (hit.strength === existing.strength && hit.amplitude > existing.amplitude)
    ) {
      byStep.set(hit.stepIndex, hit);
    }
  }

  return [...byStep.values()].sort((a, b) => a.stepIndex - b.stepIndex);
}

export function stepHitsToGrid(
  hits: ReadonlyArray<Pick<QuantizedOnset, "stepIndex">>,
  steps = DEFAULT_ONSET_STEPS,
): boolean[] {
  if (!Number.isInteger(steps) || steps < 1) {
    throw new Error(`Grid steps must be a positive integer: ${steps}`);
  }

  const grid = Array.from({ length: steps }, () => false);

  for (const hit of hits) {
    if (Number.isInteger(hit.stepIndex) && hit.stepIndex >= 0 && hit.stepIndex < steps) {
      grid[hit.stepIndex] = true;
    }
  }

  return grid;
}

export function createOnsetPreview(input: OnsetPreviewInput): OnsetPreview {
  const envelope = resolvePreviewEnvelope(input);
  const thresholds = calculateOnsetThresholds(envelope, input);
  const rawHits = detectOnsets(envelope, input);
  const quantizationDurationMs = input.quantizationDurationMs ?? input.durationMs;
  const quantization = {
    durationMs: quantizationDurationMs,
    steps: input.steps,
    wrap: quantizationDurationMs < input.durationMs,
  };
  const rawStepHits = mapOnsetsToStepHits(rawHits, quantization);
  const cleanedHits = quantizeOnsetsToSteps(rawHits, quantization);
  const steps = input.steps ?? DEFAULT_ONSET_STEPS;

  return {
    envelope,
    thresholds,
    rawHits,
    rawStepHits,
    cleanedHits,
    rawGrid: stepHitsToGrid(rawStepHits, steps),
    cleanedGrid: stepHitsToGrid(cleanedHits, steps),
  };
}

function resolvePreviewEnvelope(input: OnsetPreviewInput): AmplitudeFrame[] {
  if (input.envelope) {
    return normalizeEnvelope(input.envelope);
  }

  if (input.levels) {
    return levelFramesToAmplitudeEnvelope(input.levels, { source: input.levelSource });
  }

  if (input.waveform) {
    return waveformToAmplitudeEnvelope(input.waveform, input.durationMs, {
      bins: input.waveformBins,
    });
  }

  return [];
}

function suppressNearbyOnsets(onsets: DetectedOnset[], minGapMs: number): DetectedOnset[] {
  const accepted: DetectedOnset[] = [];

  for (const onset of onsets) {
    const previous = accepted.at(-1);

    if (!previous || onset.atMs - previous.atMs >= minGapMs) {
      accepted.push(onset);
      continue;
    }

    if (
      onset.strength > previous.strength ||
      (onset.strength === previous.strength && onset.amplitude > previous.amplitude)
    ) {
      accepted[accepted.length - 1] = onset;
    }
  }

  return accepted;
}

function normalizeEnvelope(envelope: ReadonlyArray<AmplitudeFrame>): AmplitudeFrame[] {
  return envelope
    .map((frame) => ({
      atMs: sanitizeTime(frame.atMs),
      amplitude: roundLevel(clampAmplitude(frame.amplitude)),
    }))
    .sort((a, b) => a.atMs - b.atMs);
}

function readLevelAmplitude(level: MicLevelFrame, source: NonNullable<LevelEnvelopeOptions["source"]>): number {
  if (source === "rms") {
    return level.rms;
  }

  if (source === "peak") {
    return level.peak;
  }

  return level.peak * 0.7 + level.rms * 0.3;
}

function normalizeQuantizationOptions(options: OnsetQuantizationOptions) {
  const steps = options.steps ?? DEFAULT_ONSET_STEPS;

  if (!Number.isInteger(steps) || steps < 1) {
    throw new Error(`Quantization steps must be a positive integer: ${steps}`);
  }

  if (!Number.isFinite(options.durationMs) || options.durationMs <= 0) {
    throw new Error(`Quantization duration must be a positive number: ${options.durationMs}`);
  }

  return {
    durationMs: options.durationMs,
    steps,
    stepMs: options.durationMs / steps,
    wrap: options.wrap ?? false,
  };
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
}

function sanitizeTime(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function clampAmplitude(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function clampSensitivity(value = DEFAULT_ONSET_SENSITIVITY): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ONSET_SENSITIVITY;
  }

  return Math.max(0, Math.min(1, value));
}

function roundLevel(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function roundTime(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
