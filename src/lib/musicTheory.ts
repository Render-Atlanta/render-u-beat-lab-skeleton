import type { MusicalKey } from "./beatStyles";
import type { Pattern } from "./patterns";
import {
  DEFAULT_BASS_DEGREE,
  midiToNoteName,
  normalizeBassDegree,
  type PaletteEntry,
  type ScaleDegree,
} from "./stepPitch";

export interface ScaleToneSummary {
  degree: ScaleDegree;
  degreeLabel: string;
  noteLabel: string;
  function: PaletteEntry["function"];
}

export function describeMusicalKey(key: MusicalKey): string {
  return `${key.root} ${key.scale}`;
}

export function summarizeScalePalette(
  palette: readonly PaletteEntry[],
): ScaleToneSummary[] {
  return palette.map((entry) => ({
    degree: entry.degree,
    degreeLabel: entry.label,
    noteLabel: midiToNoteName(entry.midi).replace(/\d+$/, ""),
    function: entry.function,
  }));
}

export function transposeActiveStepPitches(
  pitches: readonly ScaleDegree[],
  activeSteps: readonly boolean[],
  delta: number,
  paletteSize: number,
): ScaleDegree[] {
  const size = Math.max(1, Math.round(paletteSize));
  const shift = Math.round(delta);

  return pitches.map((degree, index) => {
    if (!activeSteps[index]) {
      return normalizeBassDegree(degree, size, DEFAULT_BASS_DEGREE);
    }

    const current = normalizeBassDegree(degree, size, DEFAULT_BASS_DEGREE);
    return ((current + shift) % size + size) % size;
  });
}

export function resetActiveStepPitches(
  pitches: readonly ScaleDegree[],
  activeSteps: readonly boolean[],
): ScaleDegree[] {
  return pitches.map((degree, index) =>
    activeSteps[index] ? DEFAULT_BASS_DEGREE : degree,
  );
}

export function countActivePitchedSteps(pattern: Pattern): number {
  return (
    pattern["808"].filter(Boolean).length +
    pattern.bassGuitar.filter(Boolean).length +
    pattern.melody.filter(Boolean).length
  );
}
