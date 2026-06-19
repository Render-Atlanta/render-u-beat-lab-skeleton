import type { BeatStyle } from "../lib/beatStyles";
import type { InstrumentId } from "../lib/patterns";

export const STEPS_PER_LOOP = 16;
export const START_DELAY_SECONDS = 0.08;
export const SCHEDULE_AHEAD_SECONDS = 0.14;
export const SCHEDULER_TICK_MS = 25;

export interface ScheduledStepEvent {
  instrument: InstrumentId;
  stepIndex: number;
  time: number;
  accent: number;
}

export function getSixteenthDurationSeconds(bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new Error(`BPM must be a positive finite number: ${bpm}`);
  }

  return 60 / bpm / 4;
}

export function getSwingStepDurationSeconds(
  bpm: number,
  swing: number,
  stepIndex: number,
): number {
  const sixteenth = getSixteenthDurationSeconds(bpm);
  const safeSwing = Number.isFinite(swing) ? Math.max(0, Math.min(0.5, swing)) : 0;
  const isOffbeat = stepIndex % 2 === 1;

  return sixteenth * (isOffbeat ? 1 + safeSwing : 1 - safeSwing);
}

export function getNextStepIndex(stepIndex: number): number {
  if (!Number.isInteger(stepIndex)) {
    throw new Error(`Step index must be an integer: ${stepIndex}`);
  }

  return (stepIndex + 1) % STEPS_PER_LOOP;
}

export function getStepEvents(
  style: BeatStyle,
  stepIndex: number,
  time: number,
): ScheduledStepEvent[] {
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= STEPS_PER_LOOP) {
    throw new Error(`Step index must be an integer from 0 to 15: ${stepIndex}`);
  }

  const accent = stepIndex % 4 === 0 ? 1.12 : 1;

  return (Object.keys(style.pattern) as InstrumentId[])
    .filter((instrument) => style.pattern[instrument][stepIndex])
    .map((instrument) => ({
      instrument,
      stepIndex,
      time,
      accent,
    }));
}

export interface StepQueueEntry {
  stepIndex: number;
  time: number;
}

/**
 * Given steps scheduled with future audio times and the current audio clock,
 * return the step that should currently be highlighted — the most recently
 * scheduled entry whose `time` has been reached — or `null` if none has.
 */
export function getActiveStep(
  queue: readonly StepQueueEntry[],
  currentTime: number,
): number | null {
  let active: number | null = null;
  let bestTime = -Infinity;
  for (const entry of queue) {
    if (entry.time <= currentTime && entry.time >= bestTime) {
      bestTime = entry.time;
      active = entry.stepIndex;
    }
  }
  return active;
}
