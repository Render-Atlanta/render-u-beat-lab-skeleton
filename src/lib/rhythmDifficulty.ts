import type { RhythmChart } from "./rhythmChart";

export type Judged = null | "perfect" | "good" | "miss";

export interface BuiltNote {
  lane: number;
  timeMs: number;
  snd: string;
  degree?: number;
  judged: Judged;
}

export interface BuiltChart {
  laneCount: number;
  keys: string[];
  tags: string[];
  approachMs: number;
  perfectMs: number;
  goodMs: number;
  lastNoteMs: number;
  notes: BuiltNote[];
}

// Authoritative "Normal" difficulty (the only one in this slice). HP/regen fields
// from the full design are intentionally omitted here.
export const RHYTHM_NORMAL = {
  approachMs: 2050,
  perfectMs: 95,
  goodMs: 190,
  minGapSteps: 2,
  laneCount: 4,
  keys: ["D", "F", "J", "K"],
  tags: ["KICK", "SNARE", "HAT", "BASS"],
} as const;

// Turn a difficulty-agnostic chart into a playable one: at Normal, lanes pass through
// unchanged; notes closer than `minGapSteps` sixteenths in the same lane are thinned
// (still audible in the bed, just not falling notes).
export function applyDifficulty(chart: RhythmChart): BuiltChart {
  const stepMs = 60000 / chart.bpm / 4;
  const minGapMs = RHYTHM_NORMAL.minGapSteps * stepMs - 1;
  const sorted = [...chart.notes].sort((a, b) => a.timeMs - b.timeMs || a.lane - b.lane);
  const lastKept: Record<number, number> = {};
  const notes: BuiltNote[] = [];
  for (const n of sorted) {
    if (lastKept[n.lane] != null && n.timeMs - lastKept[n.lane] < minGapMs) continue;
    lastKept[n.lane] = n.timeMs;
    notes.push({ lane: n.lane, timeMs: n.timeMs, snd: n.snd, degree: n.degree, judged: null });
  }
  return {
    laneCount: RHYTHM_NORMAL.laneCount,
    keys: [...RHYTHM_NORMAL.keys],
    tags: [...RHYTHM_NORMAL.tags],
    approachMs: RHYTHM_NORMAL.approachMs,
    perfectMs: RHYTHM_NORMAL.perfectMs,
    goodMs: RHYTHM_NORMAL.goodMs,
    lastNoteMs: notes.length ? notes[notes.length - 1].timeMs : 0,
    notes,
  };
}
