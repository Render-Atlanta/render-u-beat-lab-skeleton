import { describe, expect, it } from "vitest";
import type { BuiltChart, BuiltNote } from "./rhythmDifficulty";
import { createRhythmState, hitRhythm, rhythmResult, updateRhythm } from "./rhythmGame";

function built(notes: Array<Omit<BuiltNote, "judged">>): BuiltChart {
  const full: BuiltNote[] = notes.map((n) => ({ ...n, judged: null }));
  return {
    laneCount: 4, keys: ["D", "F", "J", "K"], tags: ["KICK", "SNARE", "HAT", "BASS"],
    approachMs: 2050, perfectMs: 95, goodMs: 190,
    lastNoteMs: full.reduce((m, n) => Math.max(m, n.timeMs), 0), notes: full,
  };
}

describe("hitRhythm", () => {
  it("scores a PERFECT on-time tap", () => {
    const s = createRhythmState(built([{ lane: 0, timeMs: 500, snd: "kick" }]));
    const res = hitRhythm(s, 0, 500);
    expect(res.kind).toBe("perfect");
    expect(s.score).toBe(100);
    expect(s.combo).toBe(1);
    expect(s.counts.perfect).toBe(1);
  });

  it("scores a GOOD just outside perfect but inside good", () => {
    const s = createRhythmState(built([{ lane: 0, timeMs: 500, snd: "kick" }]));
    expect(hitRhythm(s, 0, 500 + 150).kind).toBe("good");
    expect(s.score).toBe(50);
  });

  it("returns ghost with no penalty when nothing is in range", () => {
    const s = createRhythmState(built([{ lane: 0, timeMs: 500, snd: "kick" }]));
    expect(hitRhythm(s, 0, 3000).kind).toBe("ghost");
    expect(s.combo).toBe(0);
    expect(s.counts.miss).toBe(0);
  });

  it("applies the ×2 combo multiplier from the 8th hit", () => {
    const notes = Array.from({ length: 9 }, (_, i) => ({ lane: 0, timeMs: 500 + i * 500, snd: "kick" }));
    const s = createRhythmState(built(notes));
    for (let i = 0; i < 9; i++) hitRhythm(s, 0, 500 + i * 500);
    expect(s.combo).toBe(9);
    expect(s.score).toBe(7 * 100 + 2 * 200); // combos 1–7 ×1, combos 8–9 ×2
  });
});

describe("updateRhythm", () => {
  it("marks a note MISS once nowMs passes its good window and breaks combo", () => {
    const s = createRhythmState(built([
      { lane: 0, timeMs: 500, snd: "kick" },
      { lane: 1, timeMs: 1000, snd: "snare" },
    ]));
    hitRhythm(s, 0, 500); // combo 1
    updateRhythm({ state: s, nowMs: 1000 + 300 }); // snare missed (good 190)
    expect(s.counts.miss).toBe(1);
    expect(s.combo).toBe(0);
  });

  it("ends the run after the last note + tail", () => {
    const s = createRhythmState(built([{ lane: 2, timeMs: 1500, snd: "hat" }]));
    updateRhythm({ state: s, nowMs: 1500 + 1400 + 1 });
    expect(s.done).toBe(true);
  });
});

describe("rhythmResult", () => {
  it("reports 100% accuracy for a clean all-perfect run", () => {
    const s = createRhythmState(built([
      { lane: 0, timeMs: 500, snd: "kick" },
      { lane: 1, timeMs: 1000, snd: "snare" },
    ]));
    hitRhythm(s, 0, 500);
    hitRhythm(s, 1, 1000);
    updateRhythm({ state: s, nowMs: 1000 + 1400 + 1 });
    const r = rhythmResult(s);
    expect(r.accuracy).toBe(100);
    expect(r.perfect).toBe(2);
    expect(r.miss).toBe(0);
    expect(r.maxCombo).toBe(2);
  });
});
