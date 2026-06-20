import { INSTRUMENT_IDS, type InstrumentId } from "./patterns";
import type { SequencerState } from "./patternState";
import { isPitchedLane } from "./sequencerDomain";
import { DEFAULT_STEP_VELOCITY } from "./stepVelocity";

/** A single checked instruction. `check` is a pure predicate over the beat. */
export interface LessonStep {
  id: string;
  instruction: string;
  /** Optional nudge shown under the instruction. */
  hint?: string;
  check: (state: SequencerState) => boolean;
}

export interface Lesson {
  id: string;
  title: string;
  blurb: string;
  steps: LessonStep[];
}

export interface LessonStepStatus {
  id: string;
  instruction: string;
  hint?: string;
  done: boolean;
  /** The first not-yet-done step — the one to work on now. */
  active: boolean;
}

export interface LessonEvaluation {
  lessonId: string;
  title: string;
  steps: LessonStepStatus[];
  completedCount: number;
  total: number;
  allDone: boolean;
}

// --- Predicate helpers (the bar is 16 steps = 4 beats; cell N is index N-1) ---

function on(state: SequencerState, lane: InstrumentId, index: number): boolean {
  return state.pattern[lane][index] === true;
}

function laneHits(state: SequencerState, lane: InstrumentId): number {
  return state.pattern[lane].filter(Boolean).length;
}

/** Drum (non-pitched) hits landing in the last beat — cells 13-16. */
function lastBeatDrumHits(state: SequencerState): number {
  let count = 0;
  for (const lane of INSTRUMENT_IDS) {
    if (isPitchedLane(lane)) continue;
    for (let index = 12; index < 16; index += 1) {
      if (state.pattern[lane][index]) count += 1;
    }
  }
  return count;
}

/** An *audible* hit nudged off the default velocity (a ghost or accent). The
 * cell must be on — a stray velocity on an empty cell (e.g. from a restored or
 * shared beat) makes no sound, so it shouldn't satisfy the dynamics step. */
function hasDynamics(state: SequencerState): boolean {
  return INSTRUMENT_IDS.some((lane) =>
    state.pattern[lane].some(
      (on, index) => on && state.stepVelocities[lane][index] !== DEFAULT_STEP_VELOCITY,
    ),
  );
}

export const LESSONS: Lesson[] = [
  {
    id: "first-beat",
    title: "Your first beat",
    blurb: "Build a kick-snare-hat groove from scratch.",
    steps: [
      {
        id: "first-beat.kick-1",
        instruction: "Drop a kick on beat 1 — the very first cell.",
        hint: "The kick is the pulse everything else answers to.",
        check: (s) => on(s, "kick", 0),
      },
      {
        id: "first-beat.snare-2",
        instruction: "Answer it with a snare on beat 2 (cell 5).",
        check: (s) => on(s, "snare", 4),
      },
      {
        id: "first-beat.snare-4",
        instruction: "Add a snare on beat 4 (cell 13). Snares on 2 and 4 are the backbeat.",
        check: (s) => on(s, "snare", 4) && on(s, "snare", 12),
      },
      {
        id: "first-beat.hats",
        instruction: "Keep time with hats — turn on at least 4 hat cells.",
        hint: "Hats fill the space between the kick and snare.",
        check: (s) => laneHits(s, "hat") >= 4,
      },
      {
        id: "first-beat.kick-3",
        instruction: "Add a second kick on beat 3 (cell 9) for a steady pulse.",
        check: (s) => on(s, "kick", 0) && on(s, "kick", 8),
      },
    ],
  },
  {
    id: "add-bounce",
    title: "Add some bounce",
    blurb: "Syncopate the kick and bring in the low end.",
    steps: [
      {
        id: "add-bounce.offbeat-kick",
        instruction: "Syncopate: add a kick on the 'and' of beat 2 (cell 7).",
        hint: "Off-beat kicks are what make a beat bounce.",
        check: (s) => on(s, "kick", 6),
      },
      {
        id: "add-bounce.busy-hats",
        instruction: "Make the hats busier — get to 8 or more hat cells.",
        check: (s) => laneHits(s, "hat") >= 8,
      },
      {
        id: "add-bounce.open-hat",
        instruction: "Add lift with an open hat on the last cell (16).",
        hint: "An open hat right before the loop repeats pulls you into the next bar.",
        check: (s) => on(s, "openHat", 15),
      },
      {
        id: "add-bounce.808",
        instruction: "Bring weight with the 808 — add at least 2 low-end hits.",
        check: (s) => laneHits(s, "808") >= 2,
      },
    ],
  },
  {
    id: "give-it-feel",
    title: "Give it feel",
    blurb: "Dynamics, a fill, and swing — the human touches.",
    steps: [
      {
        id: "give-it-feel.dynamics",
        instruction: "Make it breathe — give at least one hit a ghost or an accent.",
        hint: "Tap the Humanize button, or click a lit cell again to change its loudness.",
        check: (s) => hasDynamics(s),
      },
      {
        id: "give-it-feel.fill",
        instruction: "Build a fill on the last beat — add 3+ drum hits across cells 13-16.",
        hint: "The Fill button does this for you.",
        check: (s) => lastBeatDrumHits(s) >= 3,
      },
      {
        id: "give-it-feel.swing",
        instruction: "Loosen the timing — push the Swing slider above 0.",
        check: (s) => s.swing > 0,
      },
    ],
  },
];

export function getLesson(lessonId: string | null): Lesson | null {
  if (lessonId === null) return null;
  return LESSONS.find((lesson) => lesson.id === lessonId) ?? null;
}

/** Evaluate every step against the current beat, live. The active step is the
 * first one not yet satisfied; once all pass, `allDone` is true. */
export function evaluateLesson(
  lesson: Lesson,
  state: SequencerState,
): LessonEvaluation {
  let activeAssigned = false;
  const steps: LessonStepStatus[] = lesson.steps.map((step) => {
    const done = step.check(state);
    const active = !done && !activeAssigned;
    if (active) activeAssigned = true;
    return { id: step.id, instruction: step.instruction, hint: step.hint, done, active };
  });
  const completedCount = steps.filter((step) => step.done).length;
  return {
    lessonId: lesson.id,
    title: lesson.title,
    steps,
    completedCount,
    total: steps.length,
    allDone: completedCount === steps.length,
  };
}
