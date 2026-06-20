import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COUNT_IN_BEATS,
  getCountInBeatDelaysMs,
  getQuarterNoteDurationMs,
  runCountIn,
} from "./countIn";

describe("count-in scheduling", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("derives quarter-note timing from BPM", () => {
    expect(getQuarterNoteDurationMs(120)).toBe(500);
    expect(getQuarterNoteDurationMs(60)).toBe(1000);
  });

  it("schedules four beats before completion", () => {
    const delays = getCountInBeatDelaysMs(120);
    expect(delays).toEqual([
      { beat: 4, delayMs: 0 },
      { beat: 3, delayMs: 500 },
      { beat: 2, delayMs: 1000 },
      { beat: 1, delayMs: 1500 },
    ]);
    expect(COUNT_IN_BEATS).toBe(4);
  });

  it("fires beat callbacks and completion in tempo order", () => {
    vi.useFakeTimers();
    const beats: number[] = [];
    const onComplete = vi.fn();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    runCountIn(
      120,
      {
        onBeat: (beat) => beats.push(beat),
        onComplete,
      },
      {
        setTimeout: (fn, ms) => setTimeoutSpy(fn, ms) as unknown as number,
        clearTimeout: (id) => clearTimeoutSpy(id),
      },
    );

    vi.advanceTimersByTime(0);
    expect(beats).toEqual([4]);
    vi.advanceTimersByTime(500);
    expect(beats).toEqual([4, 3]);
    vi.advanceTimersByTime(500);
    expect(beats).toEqual([4, 3, 2]);
    vi.advanceTimersByTime(500);
    expect(beats).toEqual([4, 3, 2, 1]);
    vi.advanceTimersByTime(500);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("cancels pending beats and completion cleanly", () => {
    vi.useFakeTimers();
    const beats: number[] = [];
    const onComplete = vi.fn();

    const handle = runCountIn(
      120,
      {
        onBeat: (beat) => beats.push(beat),
        onComplete,
      },
      {
        setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms) as unknown as number,
        clearTimeout: (id) => globalThis.clearTimeout(id),
      },
    );

    vi.advanceTimersByTime(0);
    handle.cancel();
    vi.advanceTimersByTime(5000);

    expect(beats).toEqual([4]);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
