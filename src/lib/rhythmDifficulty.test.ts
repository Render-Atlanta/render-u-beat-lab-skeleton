import { describe, expect, it } from "vitest";
import type { RhythmChart } from "./rhythmChart";
import { RHYTHM_NORMAL, applyDifficulty } from "./rhythmDifficulty";

function chart(notes: RhythmChart["notes"], bpm = 120): RhythmChart {
  return { slug: "t", styleId: "afrobeats", bpm, swing: 0, loopBars: 1, durationMs: 4000, lanes: 4, notes };
}

describe("RHYTHM_NORMAL", () => {
  it("carries the authoritative Normal config", () => {
    expect(RHYTHM_NORMAL.approachMs).toBe(2050);
    expect(RHYTHM_NORMAL.perfectMs).toBe(95);
    expect(RHYTHM_NORMAL.goodMs).toBe(190);
    expect(RHYTHM_NORMAL.laneCount).toBe(4);
    expect(RHYTHM_NORMAL.keys).toEqual(["D", "F", "J", "K"]);
  });
});

describe("applyDifficulty", () => {
  it("passes lanes through, marks every note unjudged, and copies the window config", () => {
    const built = applyDifficulty(chart([
      { lane: 0, timeMs: 0, snd: "kick" },
      { lane: 3, timeMs: 500, snd: "melody", degree: 4 },
    ]));
    expect(built.laneCount).toBe(4);
    expect(built.keys).toEqual(["D", "F", "J", "K"]);
    expect(built.notes.every((n) => n.lane >= 0 && n.lane <= 3)).toBe(true);
    expect(built.notes.every((n) => n.judged === null)).toBe(true);
    expect(built.notes.find((n) => n.snd === "melody")?.degree).toBe(4);
    expect(built.approachMs).toBe(2050);
  });

  it("thins same-lane notes closer than minGap (bpm 120 → 16th=125ms, minGap 2 steps ≈250ms)", () => {
    const built = applyDifficulty(chart([
      { lane: 0, timeMs: 0, snd: "kick" },
      { lane: 0, timeMs: 120, snd: "kick" }, // <250ms after prev → dropped
      { lane: 0, timeMs: 300, snd: "kick" }, // ≥250ms → kept
    ]));
    expect(built.notes.map((n) => n.timeMs)).toEqual([0, 300]);
  });

  it("thins per-lane independently (a note in another lane never blocks)", () => {
    const built = applyDifficulty(chart([
      { lane: 0, timeMs: 0, snd: "kick" },
      { lane: 1, timeMs: 30, snd: "snare" }, // different lane → kept despite closeness
    ]));
    expect(built.notes).toHaveLength(2);
  });

  it("sets lastNoteMs to the last kept note time", () => {
    const built = applyDifficulty(chart([
      { lane: 0, timeMs: 0, snd: "kick" },
      { lane: 2, timeMs: 1500, snd: "hat" },
    ]));
    expect(built.lastNoteMs).toBe(1500);
  });
});
