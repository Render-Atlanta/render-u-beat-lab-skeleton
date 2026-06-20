import { INSTRUMENT_IDS, type InstrumentId } from "./patterns";

export type StepVelocity = 0 | 1 | 2;
export type StepVelocities = Record<InstrumentId, StepVelocity[]>;

export const DEFAULT_STEP_VELOCITY: StepVelocity = 1;
export const STEP_VELOCITY_FACTORS = [0.55, 1, 1.45] as const;

export function createDefaultStepVelocities(): StepVelocities {
  return Object.fromEntries(
    INSTRUMENT_IDS.map((id) => [
      id,
      Array.from({ length: 16 }, () => DEFAULT_STEP_VELOCITY),
    ]),
  ) as StepVelocities;
}

export function cloneStepVelocities(velocities: StepVelocities): StepVelocities {
  return Object.fromEntries(
    INSTRUMENT_IDS.map((id) => [id, [...velocities[id]]]),
  ) as StepVelocities;
}

export function normalizeStepVelocities(
  input?: Partial<Record<InstrumentId, readonly unknown[]>>,
): StepVelocities {
  const defaults = createDefaultStepVelocities();
  if (!input) {
    return defaults;
  }

  return Object.fromEntries(
    INSTRUMENT_IDS.map((id) => {
      const row = input[id];
      if (!Array.isArray(row)) {
        return [id, defaults[id]];
      }

      return [
        id,
        Array.from({ length: 16 }, (_, index) =>
          normalizeStepVelocity(row[index], defaults[id][index]),
        ),
      ];
    }),
  ) as StepVelocities;
}

export function cycleStepVelocity(
  on: boolean,
  velocity: StepVelocity,
): { on: boolean; velocity: StepVelocity } {
  if (!on) {
    return { on: true, velocity: DEFAULT_STEP_VELOCITY };
  }

  if (velocity === 1) {
    return { on: true, velocity: 2 };
  }

  if (velocity === 2) {
    return { on: true, velocity: 0 };
  }

  return { on: false, velocity: DEFAULT_STEP_VELOCITY };
}

export function getStepVelocityFactor(velocity: StepVelocity): number {
  return STEP_VELOCITY_FACTORS[velocity];
}

export type StepVelocityName = "ghost" | "normal" | "accent";

export function getVelocityName(velocity: StepVelocity): StepVelocityName {
  if (velocity === 0) {
    return "ghost";
  }
  if (velocity === 2) {
    return "accent";
  }
  return "normal";
}

export function getStepVelocities(style: {
  stepVelocities?: StepVelocities;
}): StepVelocities {
  return style.stepVelocities
    ? cloneStepVelocities(style.stepVelocities)
    : createDefaultStepVelocities();
}

export function serializeStepVelocities(velocities: StepVelocities): string {
  return INSTRUMENT_IDS.map((id) => velocities[id].join("")).join(".");
}

export function deserializeStepVelocities(value: string | null): StepVelocities | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  const rows = value.split(".");
  if (rows.length !== INSTRUMENT_IDS.length) {
    return null;
  }

  if (rows.some((row) => !/^[012]{16}$/.test(row))) {
    return null;
  }

  return Object.fromEntries(
    INSTRUMENT_IDS.map((id, index) => [
      id,
      rows[index].split("").map((cell) => Number(cell) as StepVelocity),
    ]),
  ) as StepVelocities;
}

export function stepVelocitiesAreDefault(velocities: StepVelocities): boolean {
  return INSTRUMENT_IDS.every((id) =>
    velocities[id].every((velocity) => velocity === DEFAULT_STEP_VELOCITY),
  );
}

function normalizeStepVelocity(
  value: unknown,
  fallback: StepVelocity,
): StepVelocity {
  return value === 0 || value === 1 || value === 2 ? value : fallback;
}
