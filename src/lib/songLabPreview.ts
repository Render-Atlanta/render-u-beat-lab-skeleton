import { waveformToAmplitudeEnvelope } from "./onsetDetection";
import type { SongDecomposition } from "./songDecompose";
import type { DecodedAudio } from "./wav";

export interface SongLabPreviewBar {
  atMs: number;
  leftPercent: number;
  heightPercent: number;
  inWindow: boolean;
}

export interface SongLabPreviewMarker {
  id: string;
  atMs: number;
  leftPercent: number;
  instrument: string;
  stepNumber: number;
  confidencePercent: number;
  needsCorrection: boolean;
}

export interface SongLabPreview {
  durationMs: number;
  windowStartPercent: number;
  windowWidthPercent: number;
  bars: SongLabPreviewBar[];
  markers: SongLabPreviewMarker[];
}

const DEFAULT_PREVIEW_BINS = 96;

export function createSongLabPreview(
  decoded: DecodedAudio,
  decomp: SongDecomposition,
  bins = DEFAULT_PREVIEW_BINS,
): SongLabPreview {
  const durationMs = normalizeDuration(decoded.durationMs);
  const windowStartMs = clampTime(decomp.window.startMs, durationMs);
  const windowEndMs = clampTime(
    windowStartMs + getWindowDurationMs(decomp),
    durationMs,
  );
  const envelope = durationMs > 0
    ? waveformToAmplitudeEnvelope(decoded.samples, durationMs, { bins })
    : [];

  return {
    durationMs,
    windowStartPercent: toPercent(windowStartMs, durationMs),
    windowWidthPercent: toPercent(windowEndMs - windowStartMs, durationMs),
    bars: envelope.map((frame) => ({
      atMs: frame.atMs,
      leftPercent: toPercent(frame.atMs, durationMs),
      heightPercent: Math.max(2, Math.round(frame.amplitude * 100)),
      inWindow: frame.atMs >= windowStartMs && frame.atMs <= windowEndMs,
    })),
    markers: decomp.classifications.map((hit) => {
      const absoluteMs = clampTime(windowStartMs + hit.atMs, durationMs);
      return {
        id: hit.id,
        atMs: absoluteMs,
        leftPercent: toPercent(absoluteMs, durationMs),
        instrument: hit.instrument,
        stepNumber: hit.stepNumber,
        confidencePercent: Math.round(hit.confidence * 100),
        needsCorrection: hit.needsCorrection,
      };
    }),
  };
}

function getWindowDurationMs(decomp: SongDecomposition): number {
  const beatsPerBar = 4;
  return ((60_000 / Math.max(1, decomp.bpm)) * beatsPerBar) * decomp.window.bars;
}

function normalizeDuration(durationMs: number): number {
  return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
}

function clampTime(value: number, durationMs: number): number {
  if (!Number.isFinite(value) || durationMs <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(durationMs, value));
}

function toPercent(value: number, durationMs: number): number {
  if (durationMs <= 0) {
    return 0;
  }

  return Math.round((value / durationMs) * 10_000) / 100;
}
