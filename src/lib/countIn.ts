export const COUNT_IN_BEATS = 4;

export type CountInBeat = 4 | 3 | 2 | 1;

export interface CountInBeatDelay {
  beat: CountInBeat;
  delayMs: number;
}

export interface CountInCallbacks {
  onBeat: (beat: CountInBeat) => void;
  onComplete: () => void;
}

export interface CountInTimers {
  setTimeout: (callback: () => void, delayMs: number) => number;
  clearTimeout: (timeoutId: number) => void;
}

export interface CountInHandle {
  cancel: () => void;
}

export function getQuarterNoteDurationMs(bpm: number): number {
  const safeBpm = Number.isFinite(bpm) ? Math.max(1, bpm) : 120;
  return 60_000 / safeBpm;
}

export function getCountInBeatDelaysMs(bpm: number): CountInBeatDelay[] {
  const quarter = getQuarterNoteDurationMs(bpm);
  return [
    { beat: 4, delayMs: 0 },
    { beat: 3, delayMs: quarter },
    { beat: 2, delayMs: quarter * 2 },
    { beat: 1, delayMs: quarter * 3 },
  ];
}

export function runCountIn(
  bpm: number,
  callbacks: CountInCallbacks,
  timers: CountInTimers,
): CountInHandle {
  const timeoutIds: number[] = [];

  for (const { beat, delayMs } of getCountInBeatDelaysMs(bpm)) {
    timeoutIds.push(
      timers.setTimeout(() => {
        callbacks.onBeat(beat);
      }, delayMs),
    );
  }

  timeoutIds.push(
    timers.setTimeout(() => {
      callbacks.onComplete();
    }, getQuarterNoteDurationMs(bpm) * COUNT_IN_BEATS),
  );

  return {
    cancel: () => {
      for (const timeoutId of timeoutIds) {
        timers.clearTimeout(timeoutId);
      }
    },
  };
}
