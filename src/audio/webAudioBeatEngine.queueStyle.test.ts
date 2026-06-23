import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "../lib/beatStyles";
import { createDefaultStepVelocities } from "../lib/stepVelocity";
import { INSTRUMENT_IDS, type Pattern } from "../lib/patterns";
import { createWebAudioBeatEngine } from "./webAudioBeatEngine";
import { createWebAudioFakeRuntime } from "./engineContract.testHelpers";

// 120 bpm, no swing → a constant 0.125s sixteenth, so advancing the mocked clock
// to STEP * s and firing the scheduler tick schedules exactly step s (the engine
// looks 0.14s ahead, just over one step).
const STEP = 0.125;

function emptyPattern(): Pattern {
  return INSTRUMENT_IDS.reduce((pattern, id) => {
    pattern[id] = Array.from({ length: 16 }, () => false);
    return pattern;
  }, {} as Pattern);
}

function patternWith(hits: Partial<Record<keyof Pattern, number[]>>): Pattern {
  const pattern = emptyPattern();
  for (const [id, steps] of Object.entries(hits) as [keyof Pattern, number[]][]) {
    for (const step of steps) {
      pattern[id][step] = true;
    }
  }
  return pattern;
}

function songStyle(pattern: Pattern) {
  return {
    ...BEAT_STYLES.trap,
    bpm: 120,
    swing: 0,
    pattern,
    stepVelocities: createDefaultStepVelocities(),
  };
}

type Runtime = ReturnType<typeof createWebAudioFakeRuntime>;

function scheduleSteps(runtime: Runtime, fromStep: number, toStep: number) {
  const context = runtime.contexts[0];
  for (let step = fromStep; step < toStep; step += 1) {
    context.currentTime = STEP * step;
    for (const callback of runtime.intervalCallbacks.values()) {
      callback();
    }
  }
}

function voiceStarts(runtime: Runtime) {
  const context = runtime.contexts[0];
  return context.oscillatorStarts.length + context.bufferSourceStarts.length;
}

describe("web audio beat engine — queueStyle loop-boundary swap", () => {
  it("adopts a queued style at the next loop boundary (correct downbeat)", () => {
    const runtime = createWebAudioFakeRuntime();
    const engine = createWebAudioBeatEngine(runtime);

    engine.start(songStyle(patternWith({ kick: [0] })));
    scheduleSteps(runtime, 0, 16); // loop 1: the kick downbeat sounds
    const afterLoop1 = voiceStarts(runtime);
    expect(afterLoop1).toBeGreaterThan(0);

    // Queue a silent style; it must take over from loop 2's very first downbeat.
    engine.queueStyle(songStyle(emptyPattern()));
    scheduleSteps(runtime, 16, 32); // loop 2
    expect(voiceStarts(runtime)).toBe(afterLoop1); // no new voices → silent from the downbeat
  });

  it("holds a queued style until a real wrap (never on the initial downbeat)", () => {
    const runtime = createWebAudioFakeRuntime();
    const engine = createWebAudioBeatEngine(runtime);

    engine.start(songStyle(patternWith({ kick: [0] })));
    engine.queueStyle(songStyle(emptyPattern())); // queued before the first step is scheduled

    scheduleSteps(runtime, 0, 16); // loop 1 must still play the kick
    const afterLoop1 = voiceStarts(runtime);
    expect(afterLoop1).toBeGreaterThan(0);

    scheduleSteps(runtime, 16, 32); // loop 2 swaps to silent exactly at the wrap
    expect(voiceStarts(runtime)).toBe(afterLoop1);
  });
});
