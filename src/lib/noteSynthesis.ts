/**
 * Waveform synthesis for the pitched lanes (808 sub-bass and melody). Kept
 * separate from `stepPitch` (which resolves scale degrees to frequencies) so
 * each module stays a single, focused responsibility.
 */

export interface BassSynthOptions {
  /**
   * Tame the raw sawtooth: run it through a one-pole lowpass and a short attack
   * ramp. Removes the buzzy upper-harmonic/aliased content and the instant-onset
   * click that make the raw 808 read as "hard/rattly". Off by default so live
   * playback and the standard exports are byte-identical to before.
   */
  soften?: boolean;
}

// Softening params, chosen to mirror the already-smooth bassGuitar voice: a
// ~1.2 kHz one-pole lowpass strips the buzz while keeping sub weight, and a 5 ms
// attack ramp removes the per-note onset click.
const SOFT_BASS_CUTOFF_HZ = 1200;
const SOFT_BASS_ATTACK_SECONDS = 0.005;

export function synthesizeBassNotePcm(
  frequency: number,
  sampleRate: number,
  durationSeconds = 0.45,
  options: BassSynthOptions = {},
): Float32Array {
  const length = Math.max(1, Math.ceil(durationSeconds * sampleRate));
  const out = new Float32Array(length);
  const startFrequency = frequency * 1.45;
  const glideSeconds = 0.04;
  const decaySeconds = 0.35;

  const soften = options.soften ?? false;
  // One-pole lowpass coefficient (only applied when softening).
  const rc = 1 / (2 * Math.PI * SOFT_BASS_CUTOFF_HZ);
  const alpha = (1 / sampleRate) / (rc + 1 / sampleRate);
  let lowpassed = 0;

  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const glideRatio = Math.min(1, t / glideSeconds);
    const currentFrequency =
      startFrequency * (1 - glideRatio) + frequency * glideRatio;
    const phase = (2 * Math.PI * currentFrequency * t) % (2 * Math.PI);
    const saw = 2 * (phase / (2 * Math.PI) - 0.5);
    const envelope = Math.exp(-t / decaySeconds);
    if (soften) {
      lowpassed += alpha * (saw - lowpassed);
      const attack = Math.min(1, t / SOFT_BASS_ATTACK_SECONDS);
      out[i] = lowpassed * envelope * attack * 0.55;
    } else {
      out[i] = saw * envelope * 0.55;
    }
  }

  return out;
}

export function synthesizeMelodyNotePcm(
  frequency: number,
  sampleRate: number,
  durationSeconds = 0.24,
): Float32Array {
  const length = Math.max(1, Math.ceil(durationSeconds * sampleRate));
  const out = new Float32Array(length);
  const decaySeconds = 0.16;

  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const phase = (2 * Math.PI * frequency * t) % (2 * Math.PI);
    const triangle = 2 * Math.abs(2 * (phase / (2 * Math.PI) - 0.5)) - 1;
    const envelope = Math.exp(-t / decaySeconds);
    out[i] = triangle * envelope * 0.32;
  }

  return out;
}
