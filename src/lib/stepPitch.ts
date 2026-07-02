import type { MusicalKey } from "./beatStyles";

export type NoteName =
  | "C"
  | "C#"
  | "D"
  | "D#"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "G#"
  | "A"
  | "A#"
  | "B";

export type ScaleType = "minor" | "major";

export type ScaleDegree = number;

export type BassStepPitches = ScaleDegree[];
export type MelodyStepPitches = ScaleDegree[];

export type PitchFunction = "root" | "third" | "fifth" | "other";

export interface PaletteEntry {
  degree: ScaleDegree;
  label: string;
  function: PitchFunction;
  midi: number;
  frequency: number;
}

export const BASS_STEPS = 16;
export const DEFAULT_BASS_DEGREE = 0;
export const BASS_REGISTER_OFFSET = 24;
export const MELODY_REGISTER_OFFSET = 48;

const NOTE_TO_SEMITONE: Record<NoteName, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

const DEGREE_LABELS_MINOR = ["1", "2", "b3", "4", "5", "b6", "b7"];
const DEGREE_LABELS_MAJOR = ["1", "2", "3", "4", "5", "6", "7"];

export function getScaleIntervals(scale: ScaleType): number[] {
  return scale === "major" ? MAJOR_INTERVALS : MINOR_INTERVALS;
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function midiToNoteName(midi: number): string {
  const names: NoteName[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const name = names[((midi % 12) + 12) % 12];
  return `${name}${octave}`;
}

export function getDegreeFunction(degree: ScaleDegree, scale: ScaleType): PitchFunction {
  if (degree === 0) {
    return "root";
  }

  if (degree === 2) {
    return "third";
  }

  if (degree === 4) {
    return "fifth";
  }

  return "other";
}

export function getInKeyPalette(
  key: MusicalKey,
  registerOffset = BASS_REGISTER_OFFSET,
): PaletteEntry[] {
  const rootSemitone = NOTE_TO_SEMITONE[key.root];
  const intervals = getScaleIntervals(key.scale);
  const labels = key.scale === "major" ? DEGREE_LABELS_MAJOR : DEGREE_LABELS_MINOR;

  return intervals.map((interval, degree) => {
    const midi = rootSemitone + interval + registerOffset;
    return {
      degree,
      label: labels[degree] ?? String(degree + 1),
      function: getDegreeFunction(degree, key.scale),
      midi,
      frequency: midiToFrequency(midi),
    };
  });
}

export function getMelodyPalette(key: MusicalKey): PaletteEntry[] { return getInKeyPalette(key, MELODY_REGISTER_OFFSET); }

export function createDefaultBassStepPitches(): BassStepPitches {
  return rootStepPitches();
}

export function createDefaultMelodyStepPitches(): MelodyStepPitches {
  return rootStepPitches();
}

export function cloneBassStepPitches(pitches: BassStepPitches): BassStepPitches { return [...pitches]; }

export function cloneMelodyStepPitches(pitches: MelodyStepPitches): MelodyStepPitches { return [...pitches]; }

function rootStepPitches() {
  return Array.from({ length: BASS_STEPS }, () => DEFAULT_BASS_DEGREE);
}

export function normalizeBassDegree(
  value: unknown,
  paletteSize: number,
  fallback = DEFAULT_BASS_DEGREE,
): ScaleDegree {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(paletteSize - 1, value));
}

export function normalizeBassStepPitches(
  input: unknown,
  paletteSize = 7,
): BassStepPitches {
  const defaults = createDefaultBassStepPitches();

  if (!Array.isArray(input)) {
    return defaults;
  }

  return defaults.map((fallback, index) =>
    normalizeBassDegree(input[index], paletteSize, fallback),
  );
}

export function updateBassStepPitch(
  pitches: BassStepPitches,
  stepIndex: number,
  degree: ScaleDegree,
  paletteSize: number,
): BassStepPitches {
  if (stepIndex < 0 || stepIndex >= BASS_STEPS || !Number.isInteger(stepIndex)) {
    throw new Error(`Step index must be an integer from 0 to 15: ${stepIndex}`);
  }

  const next = cloneBassStepPitches(pitches);
  next[stepIndex] = normalizeBassDegree(degree, paletteSize);
  return next;
}

export function normalizeMelodyStepPitches(
  input: unknown,
  paletteSize = 7,
): MelodyStepPitches { return normalizeBassStepPitches(input, paletteSize); }

export function updateMelodyStepPitch(
  pitches: MelodyStepPitches,
  stepIndex: number,
  degree: ScaleDegree,
  paletteSize: number,
): MelodyStepPitches { return updateBassStepPitch(pitches, stepIndex, degree, paletteSize); }

export function getBassPitchForStep(
  musicalKey: MusicalKey,
  stepIndex: number,
  bassStepPitches?: BassStepPitches,
): PaletteEntry {
  const palette = getInKeyPalette(musicalKey);
  const pitches = bassStepPitches
    ? cloneBassStepPitches(bassStepPitches)
    : createDefaultBassStepPitches();
  const degree = normalizeBassDegree(
    pitches[stepIndex],
    palette.length,
    DEFAULT_BASS_DEGREE,
  );
  return palette[degree];
}

export function getMelodyPitchForStep(
  musicalKey: MusicalKey,
  stepIndex: number,
  melodyStepPitches?: MelodyStepPitches,
): PaletteEntry {
  const palette = getMelodyPalette(musicalKey);
  const pitches = melodyStepPitches
    ? cloneMelodyStepPitches(melodyStepPitches)
    : createDefaultMelodyStepPitches();
  const degree = normalizeBassDegree(
    pitches[stepIndex],
    palette.length,
    DEFAULT_BASS_DEGREE,
  );
  return palette[degree];
}

export function bassStepPitchesAreDefault(pitches: BassStepPitches): boolean {
  return pitches.every((degree) => degree === DEFAULT_BASS_DEGREE);
}

export function melodyStepPitchesAreDefault(pitches: MelodyStepPitches): boolean {
  return pitches.every((degree) => degree === DEFAULT_BASS_DEGREE);
}

export function serializeBassStepPitches(pitches: BassStepPitches): string {
  return pitches.join(",");
}

export function serializeMelodyStepPitches(pitches: MelodyStepPitches): string { return pitches.join(","); }

export function deserializeBassStepPitches(value: string | null): BassStepPitches | null {
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

  return normalizeBassStepPitches(parsed);
}

export function deserializeMelodyStepPitches(value: string | null): MelodyStepPitches | null {
  const parsed = deserializeBassStepPitches(value);
  return parsed ? normalizeMelodyStepPitches(parsed) : null;
}
