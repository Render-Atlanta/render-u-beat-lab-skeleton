import type { BeatStyleId } from "./beatStyles";
import { clonePattern } from "./patternState";
import type { Pattern } from "./patterns";
import { cloneStepVelocities, type StepVelocities } from "./stepVelocity";
import { createRng, randomInt, shuffle } from "./seededRng";

const STEPS = 16;
/** The four downbeats (quarter-note pulses) on a 16-step bar. */
const DOWNBEATS = [0, 4, 8, 12];

/**
 * Which lane a one-bar fill rolls on, per style — a hi-hat roll for hat-forward
 * genres, a snare roll otherwise. Keyed by every `BeatStyleId` so adding a style
 * is a compile error until it's classified here (no silent snare-roll default).
 */
const FILL_LANE: Record<BeatStyleId, "hat" | "snare"> = {
  trap: "hat",
  drill: "hat",
  crunk: "hat",
  bounce: "hat",
  rnb: "snare",
  pop: "snare",
  afrobeats: "snare",
  amapiano: "snare",
  house: "snare",
};

export interface BeatVariationInput {
  pattern: Pattern;
  stepVelocities: StepVelocities;
  styleId: BeatStyleId;
}

export interface BeatVariationResult {
  pattern: Pattern;
  stepVelocities: StepVelocities;
}

/**
 * Make a *variation* of the current beat — the same groove with tasteful
 * movement, not a new pattern. Flips a few hi-hat steps (the lane that defines
 * these genres' feel) and occasionally nudges a syncopated kick, while leaving
 * the snare/clap backbeat, the downbeat pulse, and the melodic lanes intact so
 * it always reads as the same beat. Deterministic for a given `seed`.
 */
export function makeVariation(
  input: BeatVariationInput,
  seed: number,
): BeatVariationResult {
  const rng = createRng(seed);
  const pattern = clonePattern(input.pattern);

  // Vary the hats: flip 2-3 steps, but never the downbeat-1 hat so the pulse
  // stays legible. This always flips >=2 steps, so the variation is never inert.
  const hatSteps = shuffle(
    rng,
    Array.from({ length: STEPS - 1 }, (_unused, i) => i + 1),
  ).slice(0, randomInt(rng, 2, 3));
  for (const step of hatSteps) {
    pattern.hat[step] = !pattern.hat[step];
  }

  // Half the time, add or drop one off-downbeat kick for a little syncopation.
  if (rng() < 0.5) {
    const offbeats = Array.from({ length: STEPS }, (_unused, i) => i).filter(
      (i) => !DOWNBEATS.includes(i),
    );
    const step = offbeats[Math.floor(rng() * offbeats.length)];
    pattern.kick[step] = !pattern.kick[step];
  }

  return {
    pattern,
    stepVelocities: cloneStepVelocities(input.stepVelocities),
  };
}

/**
 * Add a one-bar drum fill on the last beat that resolves back into the loop: a
 * hi-hat roll for hat-forward styles or a snare roll otherwise, accented on the
 * final hit, with an open hat as the lead-in. Deterministic for a given `seed`.
 */
export function addFill(
  input: BeatVariationInput,
  seed: number,
): BeatVariationResult {
  const rng = createRng(seed);
  const pattern = clonePattern(input.pattern);
  const stepVelocities = cloneStepVelocities(input.stepVelocities);
  const lane = FILL_LANE[input.styleId];

  // Roll across the last beat — a 3- or 4-step build into the downbeat.
  const rollStart = rng() < 0.5 ? STEPS - 4 : STEPS - 3;
  for (let step = rollStart; step < STEPS; step += 1) {
    pattern[lane][step] = true;
    stepVelocities[lane][step] = 1; // normal
  }
  stepVelocities[lane][STEPS - 1] = 2; // accent the resolving hit

  // Open hat on the final step leads back into the top of the loop.
  pattern.openHat[STEPS - 1] = true;
  stepVelocities.openHat[STEPS - 1] = 2;

  return { pattern, stepVelocities };
}
