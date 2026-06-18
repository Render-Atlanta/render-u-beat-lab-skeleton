import { detectOnsets, waveformToAmplitudeEnvelope } from "./onsetDetection";

export interface MeasuredProfile {
  detectedBpm: number;
  tempoConfidence: number;
  onsetCount: number;
  onsetDensityPerSec: number;
  durationSec: number;
}

const MIN_BPM = 60;
const MAX_BPM = 200;

export function analyzeWaveform(
  samples: ArrayLike<number>,
  sampleRate: number,
): MeasuredProfile {
  const empty: MeasuredProfile = {
    detectedBpm: 0,
    tempoConfidence: 0,
    onsetCount: 0,
    onsetDensityPerSec: 0,
    durationSec: 0,
  };

  if (samples.length === 0 || sampleRate <= 0) return empty;

  const durationMs = (samples.length / sampleRate) * 1000;
  const durationSec = durationMs / 1000;
  // Resolve the envelope at roughly 10ms per bin for usable timing.
  const bins = Math.max(16, Math.round(durationMs / 10));
  const envelope = waveformToAmplitudeEnvelope(samples, durationMs, { bins, mode: "peak" });
  const onsets = detectOnsets(envelope);

  if (onsets.length < 2) {
    return { ...empty, durationSec, onsetCount: onsets.length, onsetDensityPerSec: onsets.length / durationSec };
  }

  const { bpm, confidence } = estimateTempo(onsets.map((o) => o.atMs));

  return {
    detectedBpm: bpm,
    tempoConfidence: confidence,
    onsetCount: onsets.length,
    onsetDensityPerSec: round(onsets.length / durationSec, 2),
    durationSec: round(durationSec, 3),
  };
}

function estimateTempo(times: number[]): { bpm: number; confidence: number } {
  const intervals: number[] = [];
  for (let i = 1; i < times.length; i += 1) intervals.push(times[i] - times[i - 1]);

  // Convert each interval to a BPM folded into [MIN_BPM, MAX_BPM] by octaves.
  const bpms = intervals
    .map((ms) => foldBpm(60000 / ms))
    .filter((b) => Number.isFinite(b) && b > 0);
  if (bpms.length === 0) return { bpm: 0, confidence: 0 };

  // Bucket into 1-BPM bins, pick the peak.
  const counts = new Map<number, number>();
  for (const b of bpms) {
    const key = Math.round(b);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let peakBpm = 0;
  let peakCount = 0;
  for (const [bpm, count] of counts) {
    if (count > peakCount) {
      peakCount = count;
      peakBpm = bpm;
    }
  }

  const tolerance = peakBpm * 0.05;
  const within = bpms.filter((b) => Math.abs(b - peakBpm) <= tolerance).length;
  return { bpm: round(peakBpm, 1), confidence: round(within / bpms.length, 2) };
}

function foldBpm(bpm: number): number {
  let result = bpm;
  while (result > MAX_BPM) result /= 2;
  while (result < MIN_BPM) result *= 2;
  return result;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
