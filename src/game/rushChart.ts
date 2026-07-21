// src/game/rushChart.ts
// Fold the Beat Lab's authoritative 4-lane rhythm chart onto the game's active
// swim lanes and thin over-dense hits so each lane stays playable.
//
// The source chart comes from buildRhythmChart(spec) (src/lib/rhythmChart) — derived
// from BEAT_STYLES, so it is the SAME data the harness tests. Difficulty is carved
// out of the skeleton, so this owns its own min-gap thinning instead of reusing
// applyDifficulty (which hardcodes a 4-lane "Normal" difficulty).
import type { RhythmChart } from "../lib/rhythmChart";
import type { LaneSet } from "./laneConfig";

export interface RushNote {
  lane: number;
  timeMs: number;
  snd: string;
  degree?: number;
  judged: null | "perfect" | "good" | "miss";
}

export interface FoldedChart {
  notes: RushNote[];
  lastNoteMs: number;
}

/**
 * Map every source note onto its swim lane via `laneSet.map`, dropping notes closer
 * than `minGapSteps` sixteenth-steps in the same swim lane (they still sound in the
 * bed — they're just not falling notes). Notes on unmapped source lanes are skipped.
 */
export function foldRhythmChart(chart: RhythmChart, laneSet: LaneSet, minGapSteps: number): FoldedChart {
  const stepMs = 60000 / chart.bpm / 4;
  const minGapMs = minGapSteps * stepMs - 1;
  const sorted = [...chart.notes].sort((a, b) => a.timeMs - b.timeMs || a.lane - b.lane);
  const lastKept: Record<number, number> = {};
  const notes: RushNote[] = [];
  for (const n of sorted) {
    const lane = laneSet.map[n.lane];
    if (lane == null) continue;
    if (minGapMs > 0 && lastKept[lane] != null && n.timeMs - lastKept[lane] < minGapMs) continue;
    lastKept[lane] = n.timeMs;
    notes.push({ lane, timeMs: n.timeMs, snd: n.snd, degree: n.degree, judged: null });
  }
  notes.sort((a, b) => a.timeMs - b.timeMs || a.lane - b.lane);
  const lastNoteMs = notes.length ? notes[notes.length - 1].timeMs : 0;
  return { notes, lastNoteMs };
}
