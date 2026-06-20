import { calculateAudioLevel, type MicLevelFrame } from "./micCapture";

const DEFAULT_FRAME_MS = 50;

/**
 * Convert decoded mono PCM into the `MicLevelFrame[]` shape the beatbox
 * classifier consumes, emitting one frame per `frameMs` window. Reuses
 * `calculateAudioLevel` so decomposed-file levels match live-capture levels
 * (same clamping, rounding, and zero-crossing-rate semantics).
 */
export function waveformToLevelFrames(
  samples: Float32Array,
  sampleRate: number,
  frameMs: number = DEFAULT_FRAME_MS,
): MicLevelFrame[] {
  if (samples.length === 0 || sampleRate <= 0) return [];
  const frameSize = Math.max(1, Math.round((frameMs / 1000) * sampleRate));
  const frames: MicLevelFrame[] = [];
  for (let start = 0; start < samples.length; start += frameSize) {
    const end = Math.min(start + frameSize, samples.length);
    frames.push({
      atMs: Math.round((start / sampleRate) * 1000),
      ...calculateAudioLevel(samples.subarray(start, end)),
    });
  }
  return frames;
}
