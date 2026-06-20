import { MAX_BPM, MIN_BPM } from "./sequencerDomain";

/** Taps separated by more than this gap begin a fresh measurement. */
export const TAP_TEMPO_RESET_GAP_MS = 2_000;

/** Most recent taps considered when averaging (≤4 taps → ≤3 intervals). */
export const TAP_TEMPO_MAX_TAPS = 4;

/**
 * Average the intervals between the most recent taps into a BPM, clamped to the
 * sequencer's {@link MIN_BPM}–{@link MAX_BPM} guardrails. Pure: the caller owns
 * the timestamp history and passes it in newest-last.
 *
 * A gap longer than {@link TAP_TEMPO_RESET_GAP_MS} ends the current measurement,
 * so only taps after the last such gap count. Fewer than two taps in the current
 * run yields `null` (no interval to measure yet).
 */
export function tapTempo(timestamps: number[]): number | null {
  const run = currentTapRun(timestamps);
  if (run.length < 2) {
    return null;
  }

  const averageInterval = (run[run.length - 1] - run[0]) / (run.length - 1);
  if (averageInterval <= 0) {
    return null;
  }

  const bpm = 60_000 / averageInterval;
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm)));
}

/**
 * The trailing taps that belong to the current measurement: walk back from the
 * newest finite tap while gaps stay within the reset threshold, capped at the
 * most recent {@link TAP_TEMPO_MAX_TAPS} taps. Returned oldest-first.
 */
function currentTapRun(timestamps: number[]): number[] {
  const finite = timestamps.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return [];
  }

  const run: number[] = [finite[finite.length - 1]];
  for (
    let i = finite.length - 2;
    i >= 0 && run.length < TAP_TEMPO_MAX_TAPS;
    i -= 1
  ) {
    if (run[0] - finite[i] > TAP_TEMPO_RESET_GAP_MS) {
      break;
    }
    run.unshift(finite[i]);
  }

  return run;
}
