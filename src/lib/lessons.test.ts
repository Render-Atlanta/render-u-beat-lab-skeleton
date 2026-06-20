import { describe, expect, it } from "vitest";
import { LESSONS, evaluateLesson, getLesson, type Lesson } from "./lessons";
import { createDefaultSequencerState, type SequencerState } from "./patternState";
import { patternFromSteps, type InstrumentId } from "./patterns";
import { createDefaultStepVelocities } from "./stepVelocity";

const EMPTY_LANES: Record<InstrumentId, number[]> = {
  kick: [],
  snare: [],
  hat: [],
  openHat: [],
  clap: [],
  "808": [],
  bassGuitar: [],
  melody: [],
};

/** A blank beat (no hits, default velocities, no swing) with `steps` (1-indexed
 * cells) turned on, ready to exercise lesson checks. */
function stateWith(
  steps: Partial<Record<InstrumentId, number[]>> = {},
  extra: Partial<SequencerState> = {},
): SequencerState {
  return {
    ...createDefaultSequencerState("trap"),
    pattern: patternFromSteps({ ...EMPTY_LANES, ...steps }),
    stepVelocities: createDefaultStepVelocities(),
    swing: 0,
    ...extra,
  };
}

const firstBeat = getLesson("first-beat") as Lesson;

describe("evaluateLesson", () => {
  it("marks the first unsatisfied step active and none done on a blank beat", () => {
    const evaluation = evaluateLesson(firstBeat, stateWith());
    expect(evaluation.completedCount).toBe(0);
    expect(evaluation.allDone).toBe(false);
    expect(evaluation.steps[0].active).toBe(true);
    expect(evaluation.steps.slice(1).every((s) => !s.active)).toBe(true);
  });

  it("advances the active step as earlier checks pass", () => {
    // kick on 1 satisfies step 1; the active step moves to step 2.
    const evaluation = evaluateLesson(firstBeat, stateWith({ kick: [1] }));
    expect(evaluation.steps[0].done).toBe(true);
    expect(evaluation.steps[1].active).toBe(true);
    expect(evaluation.completedCount).toBe(1);
  });

  it("reports allDone once every step's check passes", () => {
    const full = stateWith({
      kick: [1, 9],
      snare: [5, 13],
      hat: [1, 3, 5, 7],
    });
    const evaluation = evaluateLesson(firstBeat, full);
    expect(evaluation.allDone).toBe(true);
    expect(evaluation.completedCount).toBe(evaluation.total);
    expect(evaluation.steps.every((s) => !s.active)).toBe(true);
  });
});

describe("lesson check predicates", () => {
  const check = (lessonId: string, stepId: string) => {
    const lesson = getLesson(lessonId) as Lesson;
    const step = lesson.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`no step ${stepId}`);
    return step.check;
  };

  it("backbeat requires snares on BOTH beat 2 and beat 4", () => {
    const snare4 = check("first-beat", "first-beat.snare-4");
    expect(snare4(stateWith({ snare: [5] }))).toBe(false); // only beat 2
    expect(snare4(stateWith({ snare: [5, 13] }))).toBe(true);
  });

  it("hat-count steps need the minimum number of hits", () => {
    const fourHats = check("first-beat", "first-beat.hats");
    expect(fourHats(stateWith({ hat: [1, 3, 5] }))).toBe(false);
    expect(fourHats(stateWith({ hat: [1, 3, 5, 7] }))).toBe(true);
  });

  it("the fill step counts drum hits only in the last beat (cells 13-16)", () => {
    const fill = check("give-it-feel", "give-it-feel.fill");
    expect(fill(stateWith({ snare: [1, 5, 9] }))).toBe(false); // hits, but not last beat
    expect(fill(stateWith({ snare: [13, 14], hat: [16] }))).toBe(true);
    // 808 is pitched, not a drum — last-beat 808 hits don't count as a fill.
    expect(fill(stateWith({ "808": [13, 14, 15, 16] }))).toBe(false);
  });

  it("the dynamics step needs a non-default velocity on an AUDIBLE (on) hit", () => {
    const dynamics = check("give-it-feel", "give-it-feel.dynamics");
    expect(dynamics(stateWith({ kick: [1] }))).toBe(false); // all default (1)

    // Accent on the lit kick cell — audible dynamics.
    const accented = stateWith({ kick: [1] });
    accented.stepVelocities.kick[0] = 2;
    expect(dynamics(accented)).toBe(true);

    // A stray non-default velocity on an OFF cell (e.g. a restored/shared beat)
    // makes no sound, so it must not satisfy the step.
    const offCellAccent = stateWith({ kick: [1] });
    offCellAccent.stepVelocities.snare[3] = 2; // snare cell 4 is off
    expect(dynamics(offCellAccent)).toBe(false);
  });

  it("the swing step needs swing above zero", () => {
    const swing = check("give-it-feel", "give-it-feel.swing");
    expect(swing(stateWith({}, { swing: 0 }))).toBe(false);
    expect(swing(stateWith({}, { swing: 0.1 }))).toBe(true);
  });
});

describe("lesson data", () => {
  it("every step id is unique and getLesson resolves known ids", () => {
    const ids = LESSONS.flatMap((l) => l.steps.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(getLesson("first-beat")?.id).toBe("first-beat");
    expect(getLesson("nope")).toBeNull();
    expect(getLesson(null)).toBeNull();
  });
});
