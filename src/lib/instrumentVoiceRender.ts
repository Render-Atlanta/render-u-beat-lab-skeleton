import type { VoicedLane } from "./laneVoiceSelection";
import { midiToFrequency } from "./stepPitch";

/** Decoded, ready-to-render sampled voices keyed by the lane they play. */
export type DecodedInstrumentVoices = Partial<Record<VoicedLane, DecodedInstrumentVoice>>;

export interface DecodedVoiceNote {
  /** Frequency in Hz of the recorded sample note. */
  frequency: number;
  /** Decoded mono PCM at RENDER_SAMPLE_RATE. */
  samples: Float32Array;
}

export interface DecodedInstrumentVoice {
  /** Non-empty set of recorded notes; any order. */
  notes: DecodedVoiceNote[];
}

/** Linear release tail (seconds) applied after a note's hold window ends. */
const RELEASE_SECONDS = 0.06;

/**
 * Render one pitched note from a sampled instrument voice: pick the nearest
 * recorded note, pitch-shift it to `targetFrequency` by resampling at the
 * frequency ratio (linear interpolation), and apply a hold + linear-release
 * amplitude envelope — the pure-PCM equivalent of a Tone.js Sampler's
 * triggerAttackRelease. Output is capped at what the source sample can supply.
 */
export function renderSampledNotePcm(
  voice: DecodedInstrumentVoice,
  targetFrequency: number,
  holdSeconds: number,
  sampleRate: number,
): Float32Array {
  if (voice.notes.length === 0) {
    return new Float32Array(0);
  }
  const nearest = pickNearestNote(voice.notes, targetFrequency);
  const src = nearest.samples;
  const ratio = targetFrequency / nearest.frequency;
  // Guard degenerate input (non-positive / non-finite frequencies) so a bad
  // note can't produce a negative-length buffer (RangeError) or a NaN-poisoned
  // mix; such a note simply contributes silence.
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return new Float32Array(0);
  }

  const holdSamples = Math.max(0, Math.round(holdSeconds * sampleRate));
  const releaseSamples = Math.max(1, Math.round(RELEASE_SECONDS * sampleRate));
  const envelopeLength = holdSamples + releaseSamples;

  // Most output samples the source can supply at this playback rate. Output is
  // source-capped, so an extreme pitch-up (ratio far above 1) can end before the
  // release — not reachable with the register-bounded, seconds-long bundled
  // voices, but see the envelope note below.
  const maxResampled = src.length > 0 ? Math.floor((src.length - 1) / ratio) + 1 : 0;
  const length = Math.max(0, Math.min(envelopeLength, maxResampled));
  const out = new Float32Array(length);

  for (let j = 0; j < length; j += 1) {
    const pos = j * ratio;
    const i = Math.floor(pos);
    const frac = pos - i;
    const a = src[i];
    const b = i + 1 < src.length ? src[i + 1] : src[i];
    let value = a + (b - a) * frac;

    if (j >= holdSamples) {
      const gain = 1 - (j - holdSamples + 1) / releaseSamples;
      value *= gain > 0 ? gain : 0;
    }
    out[j] = value;
  }
  return out;
}

/**
 * Pick the recorded note closest to `targetFrequency` by pitch ratio (i.e. the
 * fewest semitones away), mirroring how a Tone.js Sampler chooses which sample
 * to pitch-shift. Log distance — not linear Hz — so octave-spanning maps behave.
 */
export function pickNearestNote(
  notes: readonly DecodedVoiceNote[],
  targetFrequency: number,
): DecodedVoiceNote {
  let best = notes[0];
  let bestDistance = Infinity;
  for (const note of notes) {
    const distance = Math.abs(Math.log2(targetFrequency / note.frequency));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = note;
    }
  }
  return best;
}

const SEMITONE_FROM_C: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/**
 * Parse a scientific-pitch note name (e.g. "C4", "G#3", "Bb2") to its
 * frequency in Hz. Sharps may be written "#" or "s" (the on-disk sample files
 * use "s"); flats use "b". Middle C is C4 = MIDI 60 (A4 = 440 Hz).
 */
export function noteNameToFrequency(noteName: string): number {
  const match = /^([A-Ga-g])([#sb]?)(-?\d+)$/.exec(noteName.trim());
  if (!match) {
    throw new Error(`Invalid note name: ${noteName}`);
  }
  const [, letter, accidental, octave] = match;
  const base = SEMITONE_FROM_C[letter.toUpperCase()];
  const shift = accidental === "b" ? -1 : accidental ? 1 : 0;
  const midi = (Number(octave) + 1) * 12 + base + shift;
  return midiToFrequency(midi);
}
