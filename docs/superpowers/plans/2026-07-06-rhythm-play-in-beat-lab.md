# Rhythm Play (in Beat Lab) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable Guitar-Hero-style rhythm mode inside the Beat Lab app — pick a stage, the bed plays, notes fall a 4-lane highway, tap `D F J K` in time, get a score.

**Architecture:** Everything is computed in-browser from a `GameTrackSpec`: `buildRhythmChart(spec)` (Part A, merged) makes the note chart, and `renderGameTrackWav(spec, kit)` → `decodeWav` → `AudioBuffer` makes a seekable bed. Both derive from the same swing/onset math, so notes and audio align. Pure sim/geometry modules (fully unit-tested) drive a React hook + canvas note-highway + a full-screen view; App.tsx gains only a thin view switch.

**Tech Stack:** TypeScript + React 19 + Vite + Vitest (node env). No new dependencies.

## Global Constraints

- **Module hygiene:** every new `src/**/*.ts(x)` source file ≤300 lines, test files ≤350 lines (`scripts/moduleHygiene.ts`). Do NOT add anything to the hygiene ALLOWLIST.
- **Gate:** `npm run check` (hygiene + `typecheck:scripts` + `vitest run`) must stay green. Run every command from the worktree root `/Users/william-meroxa/Development/beat-lab-wt-rhythm-play`.
- **Test environment is `node`** (`vite.config.ts` `test.environment: "node"`). There is NO jsdom, NO @testing-library, and NO `AudioContext`/`requestAnimationFrame`/canvas-2d in tests. Component tests render with `renderToStaticMarkup` from `react-dom/server` and assert on the HTML string (see `src/components/EqVisualizer.test.tsx`). Anything touching real audio/rAF/canvas is verified by driving the app, not by a unit test.
- **Tests are colocated** `src/**/*.test.ts(x)` next to their source.
- **No data files, no new assets:** the game builds the chart and renders the bed at runtime. Do NOT load `game-charts/*.chart.json` and do NOT commit any WAVs.
- **Difficulty (Normal, the only one in this slice), authoritative values:** `approachMs 2050`, `perfectMs 95`, `goodMs 190`, `minGapSteps 2`, `laneCount 4`, keys `["D","F","J","K"]`, tags `["KICK","SNARE","HAT","BASS"]`.
- **Lane mapping** is already encoded by `LANE_OF` in `src/lib/rhythmChart.ts` (kick→0, snare/clap→1, hat/openHat→2, 808/bassGuitar/melody→3) and baked into each chart's `notes[].lane`. The game consumes `note.lane` directly.
- **Scoring:** combo multiplier `combo≥32→4, ≥16→3, ≥8→2, else 1`; `score += (perfect?100:50)*mult`; `accuracy = (perfect + good*0.5)/total*100` (rounded). Tail after last note = 1400 ms. Stars/grades/medals/HP/persistence are OUT of this slice.
- **Stage display metadata (name + accent hex), fixed:** airport `Airport Arrival` `#f5892b`, connector `Connector Sprint` `#f95bd0`, badge `Badge Pickup` `#a56ef0`, vendor `Vendor Hall` `#23d98a`, mainStage `Main Stage` `#f53d3d`, afterparty `Afterparty` `#26c3e8`.

---

## File Structure

- **Create** `src/lib/rhythmDifficulty.ts` — `RHYTHM_NORMAL` + `applyDifficulty(chart)`; pure.
- **Create** `src/lib/rhythmGame.ts` — the sim: `createRhythmState`/`updateRhythm`/`hitRhythm`/`rhythmResult` + `RHYTHM_TAIL_MS`; pure.
- **Create** `src/lib/rhythmView.ts` — pure geometry/input helpers: `noteProgress`/`isNoteVisible`/`keyToLane`.
- **Create** `src/audio/rhythmBed.ts` — `renderRhythmBed(spec, kit, ctx)` + `createHitSfx(ctx)`.
- **Create** `src/components/useRhythmGame.ts` — the game hook (audio + rAF + input orchestration).
- **Create** `src/components/RhythmHighway.tsx` — canvas note-highway renderer.
- **Create** `src/components/RhythmGameView.tsx` — full-screen stage-select → play → results view.
- **Modify** `src/App.tsx` — a `view: "workbench"|"play"` switch + a nav button + lazy-mount the view.
- **Modify** `src/styles.css` — minimal styles for the play view/highway (not line-capped).

---

## Task 1: Difficulty transform (`rhythmDifficulty.ts`)

**Files:**
- Create: `src/lib/rhythmDifficulty.ts`
- Test: `src/lib/rhythmDifficulty.test.ts`

**Interfaces:**
- Consumes: `RhythmChart`, `RhythmNote` from `./rhythmChart` (Part A). `RhythmChart` = `{ slug, styleId, bpm, swing, loopBars, durationMs, lanes, notes: RhythmNote[] }`; `RhythmNote` = `{ lane, timeMs, snd, degree? }`.
- Produces:
  - `interface BuiltNote { lane: number; timeMs: number; snd: string; degree?: number; judged: null | "perfect" | "good" | "miss" }`
  - `interface BuiltChart { laneCount: number; keys: string[]; tags: string[]; approachMs: number; perfectMs: number; goodMs: number; lastNoteMs: number; notes: BuiltNote[] }`
  - `const RHYTHM_NORMAL`
  - `function applyDifficulty(chart: RhythmChart): BuiltChart`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rhythmDifficulty.test.ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/rhythmDifficulty.test.ts`
Expected: FAIL — `Cannot find module './rhythmDifficulty'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/rhythmDifficulty.ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/rhythmDifficulty.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Verify the gate**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rhythmDifficulty.ts src/lib/rhythmDifficulty.test.ts
git commit -m "feat(rhythm-play): Normal difficulty transform (lane passthrough + min-gap thinning) (#127)"
```

---

## Task 2: Rhythm sim engine (`rhythmGame.ts`)

**Files:**
- Create: `src/lib/rhythmGame.ts`
- Test: `src/lib/rhythmGame.test.ts`

**Interfaces:**
- Consumes: `BuiltChart`, `BuiltNote`, `Judged` from `./rhythmDifficulty`.
- Produces:
  - `interface RhythmState { notes: BuiltNote[]; laneCount: number; keys: string[]; tags: string[]; approachMs: number; perfectMs: number; goodMs: number; lastNoteMs: number; combo: number; maxCombo: number; score: number; counts: { perfect: number; good: number; miss: number }; lastJudge: Judged; done: boolean }`
  - `type HitResult = { kind: "perfect" | "good"; note: BuiltNote } | { kind: "ghost" }`
  - `interface RhythmResult { score: number; accuracy: number; maxCombo: number; perfect: number; good: number; miss: number }`
  - `const RHYTHM_TAIL_MS = 1400`
  - `function createRhythmState(built: BuiltChart): RhythmState`
  - `function hitRhythm(state: RhythmState, lane: number, nowMs: number): HitResult`
  - `function updateRhythm(args: { state: RhythmState; nowMs: number }): void`
  - `function rhythmResult(state: RhythmState): RhythmResult`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rhythmGame.test.ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/rhythmGame.test.ts`
Expected: FAIL — `Cannot find module './rhythmGame'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/rhythmGame.ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/rhythmGame.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the gate**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rhythmGame.ts src/lib/rhythmGame.test.ts
git commit -m "feat(rhythm-play): pure judging/combo/scoring sim (#127)"
```

---

## Task 3: Highway geometry + key mapping (`rhythmView.ts`)

**Files:**
- Create: `src/lib/rhythmView.ts`
- Test: `src/lib/rhythmView.test.ts`

**Interfaces:**
- Produces:
  - `function noteProgress(timeMs: number, nowMs: number, approachMs: number): number` — 0 at spawn (a note `approachMs` in the future), 1 at the judge line (`nowMs === timeMs`), >1 past it.
  - `function isNoteVisible(timeMs: number, nowMs: number, approachMs: number, goodMs: number): boolean`
  - `function keyToLane(key: string, keys: string[]): number | null` — case-insensitive.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rhythmView.test.ts
import { describe, expect, it } from "vitest";
import { isNoteVisible, keyToLane, noteProgress } from "./rhythmView";

describe("noteProgress", () => {
  it("is 0 at spawn, 1 at the judge line, 0.5 halfway", () => {
    expect(noteProgress(2050, 0, 2050)).toBeCloseTo(0);
    expect(noteProgress(500, 500, 2050)).toBeCloseTo(1);
    expect(noteProgress(1025, 0, 2050)).toBeCloseTo(0.5);
  });
});

describe("isNoteVisible", () => {
  it("is false before spawn, true in the window, false well past the line", () => {
    expect(isNoteVisible(3000, 0, 2050, 190)).toBe(false); // not spawned yet
    expect(isNoteVisible(500, 0, 2050, 190)).toBe(true);   // falling
    expect(isNoteVisible(500, 900, 2050, 190)).toBe(false); // past line + good window
  });
});

describe("keyToLane", () => {
  const keys = ["D", "F", "J", "K"];
  it("maps game keys case-insensitively and rejects others", () => {
    expect(keyToLane("d", keys)).toBe(0);
    expect(keyToLane("K", keys)).toBe(3);
    expect(keyToLane("x", keys)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/rhythmView.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/rhythmView.ts

// How far a note has travelled down the highway: 0 = just spawned (approachMs away),
// 1 = exactly on the judge line, >1 = past it. Multiply by the highway height for y.
export function noteProgress(timeMs: number, nowMs: number, approachMs: number): number {
  return 1 - (timeMs - nowMs) / approachMs;
}

// Visible from the moment it spawns until a little past the line (its good window),
// after which it has been judged/missed and should stop drawing.
export function isNoteVisible(
  timeMs: number,
  nowMs: number,
  approachMs: number,
  goodMs: number,
): boolean {
  const p = noteProgress(timeMs, nowMs, approachMs);
  return p >= 0 && timeMs + goodMs >= nowMs;
}

// A pressed key → lane index (case-insensitive), or null if it is not a game key.
export function keyToLane(key: string, keys: string[]): number | null {
  const i = keys.indexOf(key.toUpperCase());
  return i >= 0 ? i : null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/rhythmView.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the gate**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rhythmView.ts src/lib/rhythmView.test.ts
git commit -m "feat(rhythm-play): pure highway geometry + key→lane mapping (#127)"
```

---

## Task 4: Bed rendering + hit SFX (`rhythmBed.ts`)

**Files:**
- Create: `src/audio/rhythmBed.ts`
- Test: `src/audio/rhythmBed.test.ts`

**Interfaces:**
- Consumes: `renderGameTrackWav(spec: GameTrackSpec, kit: DecodedKit): Uint8Array` from `../lib/gameTracks`; `DecodedKit` from `../lib/styleRender`; `decodeWav(bytes): { samples: Float32Array; sampleRate: number }` from `../lib/wav`. `DecodedKit` = `Record<"kick"|"snare"|"clap"|"hat"|"openHat"|"808", Float32Array>`.
- Produces:
  - `function renderRhythmBed(spec: GameTrackSpec, kit: DecodedKit, ctx: BaseAudioContext): AudioBuffer`
  - `function createHitSfx(ctx: BaseAudioContext, freq?: number, durationSec?: number): AudioBuffer`

Note: `BaseAudioContext.createBuffer` + `copyToChannel`/`getChannelData` are the only audio APIs used, so the test injects a tiny fake `ctx` object — no real AudioContext needed.

- [ ] **Step 1: Write the failing test**

```ts
// src/audio/rhythmBed.test.ts
import { describe, expect, it } from "vitest";
import { GAME_TRACK_SPECS } from "../lib/gameTracks";
import type { DecodedKit } from "../lib/styleRender";
import { renderGameTrackWav } from "../lib/gameTracks";
import { decodeWav } from "../lib/wav";
import { createHitSfx, renderRhythmBed } from "./rhythmBed";

// A minimal decoded kit: each sampled lane a short non-silent buffer.
function fakeKit(): DecodedKit {
  const one = () => Float32Array.from([0.3, -0.2, 0.1]);
  return { kick: one(), snare: one(), clap: one(), hat: one(), openHat: one(), "808": one() } as DecodedKit;
}

// A fake BaseAudioContext exposing just the buffer APIs rhythmBed uses.
function fakeCtx(sampleRate = 22050) {
  return {
    sampleRate,
    createBuffer(_ch: number, length: number, sr: number) {
      const data = new Float32Array(length);
      return {
        length,
        sampleRate: sr,
        copyToChannel: (src: Float32Array) => data.set(src.subarray(0, length)),
        getChannelData: () => data,
      };
    },
  } as unknown as BaseAudioContext;
}

describe("renderRhythmBed", () => {
  it("returns a buffer whose length matches the decoded rendered WAV", () => {
    const spec = GAME_TRACK_SPECS[0];
    const kit = fakeKit();
    const expected = decodeWav(renderGameTrackWav(spec, kit)).samples.length;
    const buffer = renderRhythmBed(spec, kit, fakeCtx());
    expect(buffer.length).toBe(expected);
  });
});

describe("createHitSfx", () => {
  it("produces a short non-silent buffer", () => {
    const buffer = createHitSfx(fakeCtx());
    expect(buffer.length).toBeGreaterThan(0);
    const data = buffer.getChannelData(0);
    expect(data.some((v) => v !== 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/audio/rhythmBed.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/audio/rhythmBed.ts
import { renderGameTrackWav, type GameTrackSpec } from "../lib/gameTracks";
import type { DecodedKit } from "../lib/styleRender";
import { decodeWav } from "../lib/wav";

// Render a stage's backing bed to one decoded AudioBuffer. Reuses the offline WAV
// renderer (pure, browser-safe — already used by "Download WAV") and the repo's pure
// WAV decoder, so the bed matches buildRhythmChart's timing exactly. Mono, 22050 Hz;
// the browser resamples to the context rate on playback.
export function renderRhythmBed(spec: GameTrackSpec, kit: DecodedKit, ctx: BaseAudioContext): AudioBuffer {
  const wav = renderGameTrackWav(spec, kit);
  const { samples, sampleRate } = decodeWav(wav);
  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  buffer.copyToChannel(samples, 0);
  return buffer;
}

// A short synthesized hit stab (~120ms decaying sine), rendered once and replayed per
// hit via a fresh AudioBufferSourceNode. No sample asset required.
export function createHitSfx(ctx: BaseAudioContext, freq = 880, durationSec = 0.12): AudioBuffer {
  const { sampleRate } = ctx;
  const length = Math.max(1, Math.floor(durationSec * sampleRate));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 30) * 0.5;
  }
  return buffer;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/audio/rhythmBed.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the gate**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/audio/rhythmBed.ts src/audio/rhythmBed.test.ts
git commit -m "feat(rhythm-play): in-browser bed render + hit SFX buffer (#127)"
```

---

## Task 5: Game hook (`useRhythmGame.ts`)

**Files:**
- Create: `src/components/useRhythmGame.ts`

**Interfaces:**
- Consumes: `buildRhythmChart` (`../lib/rhythmChart`), `applyDifficulty` (`../lib/rhythmDifficulty`), `createRhythmState`/`updateRhythm`/`hitRhythm`/`rhythmResult`/`RhythmState`/`RhythmResult` (`../lib/rhythmGame`), `keyToLane` (`../lib/rhythmView`), `renderRhythmBed`/`createHitSfx` (`../audio/rhythmBed`), `loadKitFromUrls` (`../lib/loadKit.browser`), `GameTrackSpec` (`../lib/gameTracks`).
- Produces:
  - `type RhythmPhase = "idle" | "loading" | "playing" | "results" | "error"`
  - `interface RhythmHud { score: number; combo: number; lastJudge: RhythmState["lastJudge"] }`
  - `interface UseRhythmGame { phase: RhythmPhase; hud: RhythmHud; result: RhythmResult | null; error: string | null; start: (spec: GameTrackSpec) => Promise<void>; stop: () => void; registerDraw: (fn: DrawFn | null) => void }`
  - `type DrawFn = (nowMs: number, state: RhythmState) => void`

**Testing note:** this hook orchestrates `AudioContext`, `requestAnimationFrame`, and `keydown`, none of which exist in the node test env. All of its *logic* is already unit-tested in Tasks 1–4. This task is verified behaviorally in Task 8 by driving the app. Do NOT write a unit test that fakes AudioContext/rAF — it would test the mock, not the game. TDD does not apply to this task; implement, typecheck, and move on.

- [ ] **Step 1: Write the implementation**

```ts
// src/components/useRhythmGame.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameTrackSpec } from "../lib/gameTracks";
import { buildRhythmChart } from "../lib/rhythmChart";
import { applyDifficulty } from "../lib/rhythmDifficulty";
import {
  createRhythmState,
  hitRhythm,
  rhythmResult,
  updateRhythm,
  type RhythmResult,
  type RhythmState,
} from "../lib/rhythmGame";
import { keyToLane } from "../lib/rhythmView";
import { createHitSfx, renderRhythmBed } from "../audio/rhythmBed";
import { loadKitFromUrls } from "../lib/loadKit.browser";
import type { DecodedKit } from "../lib/styleRender";

export type RhythmPhase = "idle" | "loading" | "playing" | "results" | "error";
export type DrawFn = (nowMs: number, state: RhythmState) => void;
export interface RhythmHud {
  score: number;
  combo: number;
  lastJudge: RhythmState["lastJudge"];
}
export interface UseRhythmGame {
  phase: RhythmPhase;
  hud: RhythmHud;
  result: RhythmResult | null;
  error: string | null;
  start: (spec: GameTrackSpec) => Promise<void>;
  stop: () => void;
  registerDraw: (fn: DrawFn | null) => void;
}

const IDLE_HUD: RhythmHud = { score: 0, combo: 0, lastJudge: null };

export function useRhythmGame(): UseRhythmGame {
  const [phase, setPhase] = useState<RhythmPhase>("idle");
  const [hud, setHud] = useState<RhythmHud>(IDLE_HUD);
  const [result, setResult] = useState<RhythmResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const kitRef = useRef<DecodedKit | null>(null);
  const sfxRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const stateRef = useRef<RhythmState | null>(null);
  const drawRef = useRef<DrawFn | null>(null);
  const rafRef = useRef<number | null>(null);
  const t0Ref = useRef(0);
  // Mirror of the pushed HUD so the rAF loop can diff without depending on React
  // state (which would stale-close over the loop callback).
  const hudRef = useRef<RhythmHud>(IDLE_HUD);

  const registerDraw = useCallback((fn: DrawFn | null) => {
    drawRef.current = fn;
  }, []);

  const nowMs = useCallback(() => {
    const ctx = ctxRef.current;
    return ctx ? (ctx.currentTime - t0Ref.current) * 1000 : 0;
  }, []);

  // Push HUD to React only when a value actually changed (hits/misses, not every frame).
  const pushHud = useCallback((state: RhythmState) => {
    const prev = hudRef.current;
    if (state.score !== prev.score || state.combo !== prev.combo || state.lastJudge !== prev.lastJudge) {
      const next: RhythmHud = { score: state.score, combo: state.combo, lastJudge: state.lastJudge };
      hudRef.current = next;
      setHud(next);
    }
  }, []);

  const resetHud = useCallback(() => {
    hudRef.current = IDLE_HUD;
    setHud(IDLE_HUD);
  }, []);

  const teardown = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    teardown();
    stateRef.current = null;
    setPhase("idle");
    resetHud();
  }, [teardown, resetHud]);

  const playHitSfx = useCallback(() => {
    const ctx = ctxRef.current;
    const sfx = sfxRef.current;
    if (!ctx || !sfx) return;
    const node = ctx.createBufferSource();
    node.buffer = sfx;
    node.connect(ctx.destination);
    node.start();
  }, []);

  const loop = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    const t = nowMs();
    updateRhythm({ state, nowMs: t });
    drawRef.current?.(t, state);
    pushHud(state);
    if (state.done) {
      teardown();
      setResult(rhythmResult(state));
      setPhase("results");
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [nowMs, teardown, pushHud]);

  const start = useCallback(async (spec: GameTrackSpec) => {
    try {
      setError(null);
      setResult(null);
      setPhase("loading");
      const ctx = ctxRef.current ?? new AudioContext();
      ctxRef.current = ctx;
      await ctx.resume();
      if (!kitRef.current) kitRef.current = await loadKitFromUrls();
      if (!sfxRef.current) sfxRef.current = createHitSfx(ctx);

      const built = applyDifficulty(buildRhythmChart(spec));
      const state = createRhythmState(built);
      stateRef.current = state;
      resetHud();

      const bed = renderRhythmBed(spec, kitRef.current, ctx);
      const source = ctx.createBufferSource();
      source.buffer = bed;
      source.connect(ctx.destination);
      // Lead-in: start the clock `approachMs` before the audio so the first notes
      // (timeMs 0) fall in and land on the judge line exactly when the bed begins.
      t0Ref.current = ctx.currentTime + state.approachMs / 1000;
      source.start(t0Ref.current);
      sourceRef.current = source;

      setPhase("playing");
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      teardown();
      setError(err instanceof Error ? err.message : "Failed to start");
      setPhase("error");
    }
  }, [loop, teardown, resetHud]);

  // Keyboard input only while playing.
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      const state = stateRef.current;
      if (!state) return;
      const lane = keyToLane(e.key, state.keys);
      if (lane == null) return;
      const res = hitRhythm(state, lane, nowMs());
      if (res.kind !== "ghost") {
        playHitSfx();
        pushHud(state);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, nowMs, playHitSfx, pushHud]);

  // Tear down on unmount.
  useEffect(() => () => {
    teardown();
    ctxRef.current?.close().catch(() => { /* ignore */ });
  }, [teardown]);

  return useMemo(
    () => ({ phase, hud, result, error, start, stop, registerDraw }),
    [phase, hud, result, error, start, stop, registerDraw],
  );
}
```

- [ ] **Step 2: Verify it typechecks and the gate is green**

Run: `npm run check`
Expected: PASS (no test for this file; it compiles and the pure-logic suites still pass).

- [ ] **Step 3: Commit**

```bash
git add src/components/useRhythmGame.ts
git commit -m "feat(rhythm-play): game hook — audio clock, rAF loop, key input (#127)"
```

---

## Task 6: Canvas note-highway (`RhythmHighway.tsx`)

**Files:**
- Create: `src/components/RhythmHighway.tsx`
- Test: `src/components/RhythmHighway.test.tsx`

**Interfaces:**
- Consumes: `noteProgress`/`isNoteVisible` (`../lib/rhythmView`), `RhythmState` (`../lib/rhythmGame`), `DrawFn` + `registerDraw` from the hook (`./useRhythmGame`).
- Produces: `function RhythmHighway(props: { registerDraw: (fn: DrawFn | null) => void; laneCount: number; accent: string }): JSX.Element`

**Testing note:** the draw math is pure (Task 3) and unit-tested; canvas 2d does not exist in node. The test uses `renderToStaticMarkup` (the repo's component-test pattern) to assert the `<canvas>` renders — matching `EqVisualizer.test.tsx`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/RhythmHighway.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RhythmHighway } from "./RhythmHighway";

describe("RhythmHighway", () => {
  it("renders a labelled canvas", () => {
    const html = renderToStaticMarkup(
      <RhythmHighway registerDraw={() => {}} laneCount={4} accent="#f5892b" />,
    );
    expect(html).toContain("<canvas");
    expect(html.toLowerCase()).toContain("note highway");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/RhythmHighway.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/RhythmHighway.tsx
import { useEffect, useRef } from "react";
import { isNoteVisible, noteProgress } from "../lib/rhythmView";
import type { RhythmState } from "../lib/rhythmGame";
import type { DrawFn } from "./useRhythmGame";

const WIDTH = 480;
const HEIGHT = 640;
const JUDGE_Y = HEIGHT - 90;

interface Props {
  registerDraw: (fn: DrawFn | null) => void;
  laneCount: number;
  accent: string;
}

export function RhythmHighway({ registerDraw, laneCount, accent }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const laneW = WIDTH / laneCount;

    const draw: DrawFn = (nowMs: number, state: RhythmState) => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      // lanes + judge line
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      for (let l = 1; l < laneCount; l++) {
        ctx.beginPath();
        ctx.moveTo(l * laneW, 0);
        ctx.lineTo(l * laneW, HEIGHT);
        ctx.stroke();
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, JUDGE_Y);
      ctx.lineTo(WIDTH, JUDGE_Y);
      ctx.stroke();
      ctx.lineWidth = 1;
      // notes
      for (const n of state.notes) {
        if (n.judged === "perfect" || n.judged === "good") continue;
        if (!isNoteVisible(n.timeMs, nowMs, state.approachMs, state.goodMs)) continue;
        const y = noteProgress(n.timeMs, nowMs, state.approachMs) * JUDGE_Y;
        const x = n.lane * laneW + laneW / 2;
        ctx.fillStyle = n.judged === "miss" ? "rgba(255,80,80,0.5)" : accent;
        ctx.beginPath();
        ctx.ellipse(x, y, laneW * 0.34, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    registerDraw(draw);
    return () => registerDraw(null);
  }, [registerDraw, laneCount, accent]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className="rhythm-highway"
      aria-label="Note highway"
      role="img"
    />
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/RhythmHighway.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify the gate**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/RhythmHighway.tsx src/components/RhythmHighway.test.tsx
git commit -m "feat(rhythm-play): canvas note-highway renderer (#127)"
```

---

## Task 7: Play view (`RhythmGameView.tsx`)

**Files:**
- Create: `src/components/RhythmGameView.tsx`
- Test: `src/components/RhythmGameView.test.tsx`

**Interfaces:**
- Consumes: `useRhythmGame` (`./useRhythmGame`), `RhythmHighway` (`./RhythmHighway`), `GAME_TRACK_SPECS` (`../lib/gameTracks`).
- Produces: `function RhythmGameView(props: { onExit: () => void }): JSX.Element`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/RhythmGameView.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RhythmGameView } from "./RhythmGameView";

describe("RhythmGameView", () => {
  it("shows the stage-select grid with all six stages on first render", () => {
    const html = renderToStaticMarkup(<RhythmGameView onExit={() => {}} />);
    for (const name of [
      "Airport Arrival", "Connector Sprint", "Badge Pickup",
      "Vendor Hall", "Main Stage", "Afterparty",
    ]) {
      expect(html).toContain(name);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/RhythmGameView.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/RhythmGameView.tsx
import { GAME_TRACK_SPECS } from "../lib/gameTracks";
import { RhythmHighway } from "./RhythmHighway";
import { useRhythmGame } from "./useRhythmGame";

interface StageMeta {
  name: string;
  accent: string;
}

const STAGE_META: Record<string, StageMeta> = {
  airport: { name: "Airport Arrival", accent: "#f5892b" },
  connector: { name: "Connector Sprint", accent: "#f95bd0" },
  badge: { name: "Badge Pickup", accent: "#a56ef0" },
  vendor: { name: "Vendor Hall", accent: "#23d98a" },
  mainStage: { name: "Main Stage", accent: "#f53d3d" },
  afterparty: { name: "Afterparty", accent: "#26c3e8" },
};

const meta = (slug: string): StageMeta => STAGE_META[slug] ?? { name: slug, accent: "#8b8b8b" };

export function RhythmGameView({ onExit }: { onExit: () => void }): JSX.Element {
  const game = useRhythmGame();
  const activeSpecRef = GAME_TRACK_SPECS[0];
  const accent = meta(activeSpecRef.slug).accent;

  return (
    <section className="rhythm-view" aria-label="Rhythm game">
      <header className="rhythm-view__bar">
        <button type="button" onClick={() => { game.stop(); onExit(); }}>← Back to Beat Lab</button>
        {game.phase === "playing" && (
          <span className="rhythm-view__hud">
            Score {game.hud.score} · Combo {game.hud.combo}
            {game.hud.lastJudge ? ` · ${game.hud.lastJudge.toUpperCase()}` : ""}
          </span>
        )}
      </header>

      {(game.phase === "idle" || game.phase === "loading" || game.phase === "error") && (
        <div className="rhythm-select">
          <h2>Pick a stage</h2>
          {game.error && <p className="rhythm-error">{game.error}</p>}
          <div className="rhythm-select__grid">
            {GAME_TRACK_SPECS.map((spec) => {
              const m = meta(spec.slug);
              return (
                <button
                  key={spec.slug}
                  type="button"
                  className="rhythm-card"
                  style={{ borderColor: m.accent }}
                  disabled={game.phase === "loading"}
                  onClick={() => { void game.start(spec); }}
                >
                  <span className="rhythm-card__name">{m.name}</span>
                  <span className="rhythm-card__meta">{spec.styleId} · {spec.bpm} BPM</span>
                </button>
              );
            })}
          </div>
          <p className="rhythm-hint">Tap D F J K in time with the falling notes.</p>
        </div>
      )}

      {game.phase === "playing" && (
        <div className="rhythm-stage">
          <RhythmHighway registerDraw={game.registerDraw} laneCount={4} accent={accent} />
        </div>
      )}

      {game.phase === "results" && game.result && (
        <div className="rhythm-results">
          <h2>Results</h2>
          <p className="rhythm-results__score">{game.result.score}</p>
          <p>{game.result.accuracy}% accuracy · max combo {game.result.maxCombo}</p>
          <p className="rhythm-results__counts">
            {game.result.perfect} perfect · {game.result.good} good · {game.result.miss} miss
          </p>
          <button type="button" onClick={() => game.stop()}>Back to stages</button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/RhythmGameView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify the gate**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/RhythmGameView.tsx src/components/RhythmGameView.test.tsx
git commit -m "feat(rhythm-play): stage-select → play → results view (#127)"
```

---

## Task 8: App view switch + styles + behavioral verification

**Files:**
- Modify: `src/App.tsx` (add a top-level `view` state, a nav button, lazy-mount the view)
- Modify: `src/styles.css` (play-view styles; not line-capped)

**Interfaces:**
- Consumes: `RhythmGameView` (`./components/RhythmGameView`).

- [ ] **Step 1: Lazy-import the view**

Near the other lazy imports at the top of `src/App.tsx` (the `SongDecomposePanel` lazy import is the model — search for `lazy(`), add:

```tsx
const RhythmGameView = lazy(() =>
  import("./components/RhythmGameView").then((m) => ({ default: m.RhythmGameView })),
);
```

- [ ] **Step 2: Add the view state**

Inside `export function App()`, next to the other view-ish `useState` hooks (e.g. `layout`/`tool`; search for `useState<LayoutMode>`), add:

```tsx
const [view, setView] = useState<"workbench" | "play">("workbench");
```

- [ ] **Step 3: Add a nav button to enter Play mode**

In the site-nav button cluster (search for the `guided-toggle` / `LAYOUT_MODES` buttons around the `.site-nav` block), add a button:

```tsx
<button
  type="button"
  className="nav-play-toggle"
  onClick={() => setView("play")}
>
  ▶ Play
</button>
```

- [ ] **Step 4: Render the game view full-screen when active**

Wrap the existing workbench content so the game replaces it. Immediately inside `<main className="app-shell">` (search for `className="app-shell"`), gate the current children on `view === "workbench"`, and add the game branch. The minimal diff:

```tsx
{view === "play" ? (
  <Suspense fallback={<div className="rhythm-loading">Loading…</div>}>
    <RhythmGameView onExit={() => setView("workbench")} />
  </Suspense>
) : (
  <>
    {/* ...the existing app-shell children (site-nav, hero, StyleSelector, work-area, transport)... */}
  </>
)}
```

Note: `Suspense` and `lazy` are already imported in App.tsx (used by `SongDecomposePanel`); if not, add them to the existing `react` import. Keep the `nav-play-toggle` button reachable in the workbench branch (it lives in `.site-nav`, inside the `view === "workbench"` subtree — that is fine; `RhythmGameView` renders its own "← Back to Beat Lab" control).

- [ ] **Step 5: Add play-view styles**

Append to `src/styles.css`:

```css
.rhythm-view { display: flex; flex-direction: column; gap: 16px; min-height: 70vh; }
.rhythm-view__bar { display: flex; justify-content: space-between; align-items: center; }
.rhythm-view__hud { font-variant-numeric: tabular-nums; opacity: 0.9; }
.rhythm-select__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.rhythm-card { display: flex; flex-direction: column; gap: 6px; padding: 18px; border: 2px solid; border-radius: 12px; background: rgba(255,255,255,0.03); cursor: pointer; color: inherit; text-align: left; }
.rhythm-card__name { font-weight: 700; }
.rhythm-card__meta { opacity: 0.7; font-size: 0.85em; }
.rhythm-stage { display: flex; justify-content: center; }
.rhythm-highway { border-radius: 12px; background: #0b0b12; max-width: 100%; }
.rhythm-results { text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; }
.rhythm-results__score { font-size: 3rem; font-weight: 800; margin: 0; }
.rhythm-error { color: #f77; }
```

- [ ] **Step 6: Verify the gate**

Run: `npm run check`
Expected: PASS (typecheck clean, all suites green, hygiene OK — App.tsx is already allowlisted, but keep the additions small).

- [ ] **Step 7: Behavioral verification (drive the app — this is the real test of Tasks 5–8)**

Run: `npm run dev` and open the app. Confirm end-to-end:
1. The **▶ Play** nav button appears; clicking it swaps the workbench for the stage-select grid (6 stage cards).
2. Clicking a stage card (a user gesture, so audio may start) shows a brief load, then the **bed plays** and notes fall down the highway.
3. Notes reach the judge line **in time with the audible beat** (no visible drift) — this validates the chart↔bed alignment end-to-end.
4. Pressing **D F J K** as notes cross the line registers hits: the hit SFX fires and Score/Combo climb; mistimed/absent taps do not score; notes left unhit flash miss and break the combo.
5. After the track finishes, the **results** panel shows score / accuracy / max combo; "Back to stages" returns to the grid; "← Back to Beat Lab" returns to the workbench with audio stopped.

Capture what you observed (which stage, that audio played, that hits scored, that results showed) in your report. If audio does not start, confirm `start()` runs inside the click handler (autoplay requires the gesture) and that `loadKitFromUrls()` resolved (kit served from `/kit`).

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/styles.css
git commit -m "feat(rhythm-play): mount Play view behind a nav toggle (#127)"
```

---

## Self-review notes (coverage map)

- Spec "no data files / render at runtime" → Tasks 4 (bed) + 5 (chart via `buildRhythmChart`), never loading `game-charts`.
- Spec "chart↔bed aligned" → both derive from the same spec; verified in Task 8 step 7.3.
- Spec sim (perfect/good/miss/combo/score/accuracy/tail) → Task 2, fully unit-tested.
- Spec difficulty (Normal, min-gap thinning) → Task 1.
- Spec highway geometry + input → Tasks 3 (pure) + 6 (canvas) + 5 (keydown).
- Spec view (select → play → results) + accent colors → Task 7.
- Spec shell integration (thin App.tsx switch, SONGLAB/WORKSHOP precedent) → Task 8.
- Deferred (difficulties/HP/stars/persistence/count-in/mobile) → explicitly out; noted in the design's follow-ups.
- Autoplay/kit-failure/teardown edge cases → hook (Task 5) + Task 8 step 7 checks.
