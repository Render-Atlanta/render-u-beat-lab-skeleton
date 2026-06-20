import type { MusicalKey } from "./beatStyles";
import {
  BASS_STEPS,
  DEFAULT_BASS_DEGREE,
  getInKeyPalette,
  normalizeBassDegree,
  normalizeBassStepPitches,
  updateBassStepPitch,
  type PaletteEntry,
  type ScaleDegree,
} from "./stepPitch";

/** Pitches for the plucked electric-bass lane (one scale degree per step). */
export type BassGuitarStepPitches = ScaleDegree[];

/**
 * Register for the bass guitar: an octave above the 808 sub (24) and below the
 * melody (48), so it reads as a plucked electric bass rather than a sub-boom.
 */
export const BASS_GUITAR_REGISTER_OFFSET = 36;

export function getBassGuitarPalette(key: MusicalKey): PaletteEntry[] {
  return getInKeyPalette(key, BASS_GUITAR_REGISTER_OFFSET);
}

export function createDefaultBassGuitarStepPitches(): BassGuitarStepPitches {
  return Array.from({ length: BASS_STEPS }, () => DEFAULT_BASS_DEGREE);
}

export function cloneBassGuitarStepPitches(
  pitches: BassGuitarStepPitches,
): BassGuitarStepPitches {
  return [...pitches];
}

export function normalizeBassGuitarStepPitches(
  input: unknown,
  paletteSize = 7,
): BassGuitarStepPitches {
  return normalizeBassStepPitches(input, paletteSize);
}

export function updateBassGuitarStepPitch(
  pitches: BassGuitarStepPitches,
  stepIndex: number,
  degree: ScaleDegree,
  paletteSize: number,
): BassGuitarStepPitches {
  return updateBassStepPitch(pitches, stepIndex, degree, paletteSize);
}

export function getBassGuitarPitchForStep(
  musicalKey: MusicalKey,
  stepIndex: number,
  bassGuitarStepPitches?: BassGuitarStepPitches,
): PaletteEntry {
  const palette = getBassGuitarPalette(musicalKey);
  const pitches = bassGuitarStepPitches
    ? cloneBassGuitarStepPitches(bassGuitarStepPitches)
    : createDefaultBassGuitarStepPitches();
  const degree = normalizeBassDegree(
    pitches[stepIndex],
    palette.length,
    DEFAULT_BASS_DEGREE,
  );
  return palette[degree];
}

export function bassGuitarStepPitchesAreDefault(
  pitches: BassGuitarStepPitches,
): boolean {
  return pitches.every((degree) => degree === DEFAULT_BASS_DEGREE);
}

export function serializeBassGuitarStepPitches(
  pitches: BassGuitarStepPitches,
): string {
  return pitches.join(",");
}

export function deserializeBassGuitarStepPitches(
  value: string | null,
): BassGuitarStepPitches | null {
  if (value === null || value.trim() === "") {
    return null;
  }
  const parts = value.split(",");
  if (parts.length !== BASS_STEPS) {
    return null;
  }
  const parsed = parts.map((part) => Number(part));
  if (parsed.some((degree) => !Number.isInteger(degree))) {
    return null;
  }
  return normalizeBassGuitarStepPitches(parsed);
}

/**
 * A plucked electric-bass note: filtered sawtooth with a fast attack and a
 * shorter decay than the 808's sustained sub, plus a brighter one-pole lowpass
 * so it sits above the 808 in timbre, not just register.
 */
export function synthesizeBassGuitarNotePcm(
  frequency: number,
  sampleRate: number,
  durationSeconds = 0.3,
): Float32Array {
  const length = Math.max(1, Math.ceil(durationSeconds * sampleRate));
  const out = new Float32Array(length);
  const attackSeconds = 0.006;
  const decaySeconds = 0.18;
  // One-pole lowpass coefficient for a ~1.3 kHz cutoff.
  const cutoff = 1300;
  const rc = 1 / (2 * Math.PI * cutoff);
  const alpha = (1 / sampleRate) / (rc + 1 / sampleRate);
  let previous = 0;

  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const phase = (2 * Math.PI * frequency * t) % (2 * Math.PI);
    const saw = 2 * (phase / (2 * Math.PI) - 0.5);
    previous += alpha * (saw - previous);
    const attack = Math.min(1, t / attackSeconds);
    const envelope = attack * Math.exp(-t / decaySeconds);
    out[i] = previous * envelope * 0.5;
  }

  return out;
}
