export type InstrumentId =
  | "kick"
  | "snare"
  | "hat"
  | "openHat"
  | "clap"
  | "808"
  | "bassGuitar"
  | "melody";

/** Canonical lane ordering — the single source of truth for lane iteration. */
export const INSTRUMENT_IDS: InstrumentId[] = [
  "kick",
  "snare",
  "hat",
  "openHat",
  "clap",
  "808",
  "bassGuitar",
  "melody",
];

export type Pattern = Record<InstrumentId, boolean[]>;

export function patternFromSteps(steps: Record<InstrumentId, number[]>): Pattern {
  return Object.fromEntries(
    INSTRUMENT_IDS.map((id) => [id, toStepArray(steps[id])]),
  ) as Pattern;
}

export function toStepArray(activeSteps: number[], length = 16): boolean[] {
  const cells = Array.from({ length }, () => false);
  for (const step of activeSteps) {
    if (step < 1 || step > length || !Number.isInteger(step)) {
      throw new Error(`Step must be an integer from 1 to ${length}: ${step}`);
    }
    cells[step - 1] = true;
  }
  return cells;
}

export function countActiveSteps(pattern: Pattern): number {
  return Object.values(pattern).reduce(
    (total, row) => total + row.filter(Boolean).length,
    0,
  );
}

export function quantizeHitTimes(hitTimesMs: number[], bpm: number, steps = 16): number[] {
  const stepMs = (60_000 / bpm) / 4;
  const maxIndex = steps - 1;
  const uniqueSteps = new Set<number>();

  for (const hitTime of hitTimesMs) {
    const stepIndex = Math.max(0, Math.min(maxIndex, Math.round(hitTime / stepMs)));
    uniqueSteps.add(stepIndex + 1);
  }

  return [...uniqueSteps].sort((a, b) => a - b);
}
