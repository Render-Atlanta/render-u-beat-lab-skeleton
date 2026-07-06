import type { BuiltChart, BuiltNote, Judged } from "./rhythmDifficulty";

export const RHYTHM_TAIL_MS = 1400;

export interface RhythmState {
  notes: BuiltNote[];
  laneCount: number;
  keys: string[];
  tags: string[];
  approachMs: number;
  perfectMs: number;
  goodMs: number;
  lastNoteMs: number;
  combo: number;
  maxCombo: number;
  score: number;
  counts: { perfect: number; good: number; miss: number };
  lastJudge: Judged;
  done: boolean;
}

export type HitResult = { kind: "perfect" | "good"; note: BuiltNote } | { kind: "ghost" };

export interface RhythmResult {
  score: number;
  accuracy: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
}

function comboMultiplier(combo: number): number {
  return combo >= 32 ? 4 : combo >= 16 ? 3 : combo >= 8 ? 2 : 1;
}

export function createRhythmState(built: BuiltChart): RhythmState {
  return {
    notes: built.notes,
    laneCount: built.laneCount,
    keys: built.keys,
    tags: built.tags,
    approachMs: built.approachMs,
    perfectMs: built.perfectMs,
    goodMs: built.goodMs,
    lastNoteMs: built.lastNoteMs,
    combo: 0,
    maxCombo: 0,
    score: 0,
    counts: { perfect: 0, good: 0, miss: 0 },
    lastJudge: null,
    done: false,
  };
}

// A player tap on `lane` at audio time `nowMs`. Judges the nearest unjudged note in
// that lane; a tap with nothing in range is a harmless "ghost" (no penalty).
export function hitRhythm(state: RhythmState, lane: number, nowMs: number): HitResult {
  if (state.done) return { kind: "ghost" };
  let best: BuiltNote | null = null;
  let bestDelta = Infinity;
  for (const n of state.notes) {
    if (n.lane !== lane || n.judged) continue;
    const delta = Math.abs(n.timeMs - nowMs);
    if (delta < bestDelta) { bestDelta = delta; best = n; }
  }
  if (!best || bestDelta > state.goodMs) return { kind: "ghost" };
  const kind = bestDelta <= state.perfectMs ? "perfect" : "good";
  best.judged = kind;
  state.counts[kind] += 1;
  state.combo += 1;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  state.score += (kind === "perfect" ? 100 : 50) * comboMultiplier(state.combo);
  state.lastJudge = kind;
  return { kind, note: best };
}

export function updateRhythm({ state, nowMs }: { state: RhythmState; nowMs: number }): void {
  if (state.done) return;
  for (const n of state.notes) {
    if (n.judged) continue;
    if (nowMs > n.timeMs + state.goodMs) {
      n.judged = "miss";
      state.counts.miss += 1;
      state.combo = 0;
      state.lastJudge = "miss";
    }
  }
  if (nowMs > state.lastNoteMs + RHYTHM_TAIL_MS) state.done = true;
}

export function rhythmResult(state: RhythmState): RhythmResult {
  const { perfect, good, miss } = state.counts;
  const total = perfect + good + miss;
  const accuracy = total ? Math.round(((perfect + good * 0.5) / total) * 100) : 0;
  return { score: state.score, accuracy, maxCombo: state.maxCombo, perfect, good, miss };
}
