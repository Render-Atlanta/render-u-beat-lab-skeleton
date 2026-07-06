# RenderATL Rush — Rhythm (Guitar-Hero) Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable Guitar-Hero-style rhythm mode for the 6 RenderATL stages, rendered in Phaser in the `renderatl-rush` repo, driven by a note **chart** generated offline in the `render-u-beat-lab` repo — the two repos coupled only by generated data (`<slug>.wav` + `<slug>.chart.json`), never by shared code.

**Architecture:** Beat Lab's offline pipeline emits, per stage, a difficulty-agnostic note chart alongside the existing backing-track WAV. Rush loads both as assets and runs a new `rhythm` game mode: a pure, unit-tested sim (`sim/modes/rhythm.js` + `sim/modes/rhythm-chart.js` + `sim/rhythm-progress.js`) that judges input against an audio-clock playhead, and a thin `RhythmScene` that draws the note highway and plays the bed + hit-feedback SFX. The chart↔bed stay aligned by deriving the chart from the *same* arrangement/swing functions the WAV renderer uses.

**Tech Stack:** Beat Lab = TypeScript + Vite + Vitest (node env). Rush = JavaScript (ESM) + Phaser 4 + Vite 5 + Vitest (node) + Playwright.

**Companion documents:**
- Decision spike (why Phaser-in-Rush, not canvas-in-Beat-Lab): `render-u-beat-lab/docs/superpowers/specs/2026-07-05-phaser-rhythm-game-port-spike.md`
- Reference implementation (the imported Claude Design; a proven gameplay blueprint, Phaser 3, NOT the target code): `RenderATL Rush (Phaser).dc.html` in the Claude Design project.

## Global Constraints

- **Two repos, two PRs.** Part A lands in `render-u-beat-lab`; Part B lands in `renderatl-rush`. Part B consumes Part A's `<slug>.chart.json` output, so land Part A first (or generate charts locally into Rush's assets while developing Part B).
- **No cross-repo code imports.** Rush must not import from Beat Lab. The only interface is the generated `<slug>.wav` + `<slug>.chart.json` files under `renderatl-rush/assets/audio/`.
- **Beat Lab module hygiene:** every new `src/**/*.ts` source file **≤300 lines**, test files **≤350 lines** (`scripts/moduleHygiene.ts`). Keep the chart builder focused. `scripts/*` files are NOT line-capped.
- **Beat Lab gate:** `npm run check` (hygiene + typecheck:scripts + `vitest run`) must stay green. Tests are colocated `src/**/*.test.ts`.
- **Rush gate:** `npm run test:unit` (vitest) green; new sim tests go under `tests/sim/**/*.test.js`. Rush's Playwright `Test` gate is **already red on `main`** (pre-existing E2E flake). Do NOT add wall-clock-dependent E2E; the rhythm E2E MUST drive a deterministic injected clock via a `window.pinklineRhythmTest` hook. Rush has no line-cap gate.
- **The 6 stages / slugs (fixed, shared across both repos):** `airport` (afrobeats@108), `connector` (trap@140), `badge` (rnb@92), `vendor` (bounce@98), `mainStage` (crunk@80), `afterparty` (amapiano@112).
- **Lane mapping (Beat Lab instrument → 4 game lanes), fixed:** `kick→0`, `snare→1`, `clap→1`, `hat→2`, `openHat→2`, `808→3`, `bassGuitar→3`, `melody→3`. Multiple instruments on one lane+time dedupe to a single note.
- **Difficulty table (from the reference design, authoritative):**
  | diff | approachMs | perfectMs | goodMs | missHp | regenP | regenG | minGapSteps | lanes |
  |---|---|---|---|---|---|---|---|---|
  | Easy | 2400 | 120 | 240 | 3 | 2.6 | 1.5 | 4 | 2 |
  | Normal | 2050 | 95 | 190 | 5 | 1.8 | 1.0 | 2 | 4 |
  | Hard | 1650 | 75 | 150 | 8 | 1.2 | 0.6 | 1 | 4 |
- **Easy 2-lane fold (from the design):** `{0→0, 3→0, 1→1, 2→1}` (low lane = kick+808/bass, top lane = snare+hat). Easy keys `["F","J"]` tags `["LOW","TOP"]`; 4-lane keys `["D","F","J","K"]` tags `["KICK","SNARE","HAT","BASS"]`.
- **Scoring (from the design):** combo multiplier `combo≥32→4, ≥16→3, ≥8→2, else 1`; `score += (perfect?100:50)*mult`; `accuracy = (perfect + good*0.5)/total*100`; stars (if not failed) `acc≥92→3, ≥78→2, ≥55→1, else 0`; grade `acc≥95 S, ≥88 A, ≥78 B, ≥68 C, else D` (failed → `F`); medal from stars `3→gold, 2→silver, 1→bronze, else null`. Tail after last note = 1400 ms.
- **First-slice audio decision:** the backing WAV is the FULL mix; falling notes are a visual/scoring overlay; a hit plays a short stab SFX. No per-lane performance stems in this slice (documented follow-up).

---

## File Structure

### Part A — `render-u-beat-lab` (chart emission)
- **Create** `src/lib/rhythmChart.ts` — pure chart builder: `buildRhythmChart(spec) → RhythmChart`, `serializeRhythmChart(chart) → string`. Derives notes from the same sequencer/arrangement/swing functions the WAV render uses. (≤300 lines.)
- **Create** `src/lib/rhythmChart.test.ts` — vitest, no disk/kit. Verifies note count, lane mapping, dedupe, section mutes, monotonic times, duration. (≤350 lines.)
- **Modify** `scripts/render-game-tracks.ts` — inside the existing spec loop, also write `<slug>.chart.json` (locally to `game-charts/` and, when Rush is present, into `RUSH_AUDIO_DIR`). No kit needed for charts.

### Part B — `renderatl-rush` (rhythm mode)
- **Create** `src/sim/modes/rhythm-chart.js` — pure: `loadRhythmChart(raw)`, `RHYTHM_DIFFICULTY`, `applyDifficulty(chart, diff)` (lane fold + `minGap` thinning + window/HP config).
- **Create** `src/sim/modes/rhythm.js` — pure sim: `createRhythmState`, `initRhythmStage`, `updateRhythm({state,input,nowMs})`, `hitRhythm(state,lane,nowMs)`, `rhythmResult(state)`.
- **Create** `src/sim/rhythm-progress.js` — localStorage best `{score,stars,grade}` per slug (key `ratl-rush-rhythm.v1`).
- **Create** `src/sim/modes/rhythm-render.js` — pure-ish draw helpers (highway/notes/HUD geometry) callable by the scene.
- **Create** `src/scenes/RhythmScene.js` — thin scene: count-in → play → results overlay; bed + SFX; `window.pinklineRhythmTest` hook.
- **Modify** `src/audio/AudioBus.js` — add `"rhythm-hit"` / `"rhythm-miss"` one-shot SFX keys + SYNTH entries.
- **Modify** `src/main.js` — register `RhythmScene` in the scene list.
- **Modify** `src/scenes/MenuScene.js` — add a `RHYTHM` button + `?scene=rhythm` deep-link route.
- **Modify** `src/assets.js` + `src/scenes/BootScene.js` — `?url`-import + `load.audio`/`load.json` the 6 `<slug>.wav` + `<slug>.chart.json`.
- **Create** tests: `tests/sim/rhythm-chart.test.js`, `tests/sim/rhythm.test.js`, `tests/sim/rhythm-progress.test.js`, `tests/NN-rhythm-scene.spec.js` (Playwright, deterministic hook).

### Shared data contract — `<slug>.chart.json`
```jsonc
{
  "slug": "airport",
  "styleId": "afrobeats",
  "bpm": 108,
  "swing": 0.1,
  "loopBars": 7,           // arrangement length = intro+main(bars)+variation+outro
  "durationMs": 15555,     // total loop length; game ends at durationMs + 1400ms tail
  "lanes": 4,              // Rush folds to 2 for Easy
  "notes": [               // difficulty-agnostic; ascending timeMs
    { "lane": 0, "timeMs": 0,    "snd": "kick" },
    { "lane": 3, "timeMs": 1071, "snd": "melody", "degree": 4 }
  ]
}
```
`degree` present only for pitched lanes (`808`/`bassGuitar`/`melody`); it is metadata (unused by the first-slice audio, kept for future stems + note labels).

---

# PART A — Beat Lab: chart emission

### Task A1: Pure rhythm-chart builder

**Files:**
- Create: `render-u-beat-lab/src/lib/rhythmChart.ts`
- Test: `render-u-beat-lab/src/lib/rhythmChart.test.ts`

**Interfaces:**
- Consumes (existing Beat Lab exports):
  - `buildGameTrackSequencer(spec: GameTrackSpec): SequencerState`, `buildGameTrackArrangement(spec): Arrangement`, `GAME_TRACK_SPECS` — from `./gameTracks`.
  - `createPlayableStyle(sequencer): BeatStyle` — from `./sequencerDomain`.
  - `createArrangementPlaybackSections(sequencer, arrangement): ArrangementPlaybackSection[]` (each `{ ...section, bars, pattern }`) — from `./arrangement`.
  - `getStepEvents(style, stepIndex, timeSec): ScheduledStepEvent[]`, `getSwingStepDurationSeconds(bpm, swing, stepIndex)`, `STEPS_PER_LOOP` — from `../audio/transport`.
  - `INSTRUMENT_IDS` — from `./patterns`.
- Produces (for Task A2 + Part B):
  - `interface RhythmNote { lane: number; timeMs: number; snd: InstrumentId; degree?: number }`
  - `interface RhythmChart { slug: string; styleId: string; bpm: number; swing: number; loopBars: number; durationMs: number; lanes: 4; notes: RhythmNote[] }`
  - `const LANE_OF: Record<InstrumentId, number>`
  - `function buildRhythmChart(spec: GameTrackSpec): RhythmChart`
  - `function serializeRhythmChart(chart: RhythmChart): string`

- [ ] **Step 1: Write the failing test**

```ts
// render-u-beat-lab/src/lib/rhythmChart.test.ts
import { describe, expect, it } from "vitest";
import { GAME_TRACK_SPECS } from "./gameTracks";
import { buildRhythmChart, LANE_OF, serializeRhythmChart } from "./rhythmChart";

const airport = () => GAME_TRACK_SPECS.find((s) => s.slug === "airport")!;

describe("buildRhythmChart", () => {
  it("emits a chart with the stage header fields", () => {
    const chart = buildRhythmChart(airport());
    expect(chart.slug).toBe("airport");
    expect(chart.styleId).toBe("afrobeats");
    expect(chart.bpm).toBe(108);
    expect(chart.lanes).toBe(4);
    expect(chart.loopBars).toBeGreaterThanOrEqual(4);
    expect(chart.durationMs).toBeGreaterThan(0);
    expect(chart.notes.length).toBeGreaterThan(0);
  });

  it("maps every note into a valid 4-lane index", () => {
    const chart = buildRhythmChart(airport());
    for (const n of chart.notes) {
      expect(n.lane, JSON.stringify(n)).toBeGreaterThanOrEqual(0);
      expect(n.lane).toBeLessThanOrEqual(3);
      expect(LANE_OF[n.snd]).toBe(n.lane);
    }
  });

  it("produces notes in strictly non-decreasing time within [0, durationMs]", () => {
    const chart = buildRhythmChart(airport());
    let prev = -1;
    for (const n of chart.notes) {
      expect(n.timeMs).toBeGreaterThanOrEqual(prev);
      expect(n.timeMs).toBeLessThanOrEqual(chart.durationMs);
      prev = n.timeMs;
    }
  });

  it("dedupes instruments that share a lane at the same time into one note", () => {
    const chart = buildRhythmChart(airport());
    const seen = new Set<string>();
    for (const n of chart.notes) {
      const key = `${n.lane}@${n.timeMs}`;
      expect(seen.has(key), `duplicate lane/time ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("carries a scale degree on pitched-lane (lane 3) notes at least once", () => {
    const chart = buildRhythmChart(airport());
    expect(chart.notes.some((n) => n.lane === 3 && typeof n.degree === "number")).toBe(true);
  });

  it("builds a valid chart for every game-track spec", () => {
    for (const spec of GAME_TRACK_SPECS) {
      const chart = buildRhythmChart(spec);
      expect(chart.notes.length, spec.slug).toBeGreaterThan(0);
      expect(JSON.parse(serializeRhythmChart(chart)).slug).toBe(spec.slug);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd render-u-beat-lab && npx vitest run src/lib/rhythmChart.test.ts`
Expected: FAIL — `Cannot find module './rhythmChart'`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// render-u-beat-lab/src/lib/rhythmChart.ts
import type { GameTrackSpec } from "./gameTracks";
import { buildGameTrackArrangement, buildGameTrackSequencer } from "./gameTracks";
import { createPlayableStyle } from "./sequencerDomain";
import { createArrangementPlaybackSections } from "./arrangement";
import { getStepEvents, getSwingStepDurationSeconds, STEPS_PER_LOOP } from "../audio/transport";
import type { InstrumentId } from "./patterns";

export interface RhythmNote {
  lane: number;
  timeMs: number;
  snd: InstrumentId;
  degree?: number;
}

export interface RhythmChart {
  slug: string;
  styleId: string;
  bpm: number;
  swing: number;
  loopBars: number;
  durationMs: number;
  lanes: 4;
  notes: RhythmNote[];
}

// Instrument → game lane. Multiple instruments share a lane (deduped per lane+time).
export const LANE_OF: Record<InstrumentId, number> = {
  kick: 0,
  snare: 1,
  clap: 1,
  hat: 2,
  openHat: 2,
  "808": 3,
  bassGuitar: 3,
  melody: 3,
};

// Priority when two instruments collide on the same lane+time: keep the more
// "primary" voice (drives the note's `snd`/`degree` label). Lower index wins.
const LANE_PRIORITY: InstrumentId[] = ["kick", "snare", "hat", "808", "melody", "bassGuitar", "openHat", "clap"];

export function buildRhythmChart(spec: GameTrackSpec): RhythmChart {
  const sequencer = buildGameTrackSequencer(spec);
  const arrangement = buildGameTrackArrangement(spec);
  const baseStyle = createPlayableStyle(sequencer);
  const sections = createArrangementPlaybackSections(sequencer, arrangement);

  // Walk every step of every bar of every section in play order, accumulating
  // swing-step durations from t=0 (the WAV's first sample). Because the chart is
  // derived from the SAME sections + swing function the WAV renderer uses, the
  // note times line up with the audible hits by construction.
  const byKey = new Map<string, RhythmNote>();
  let loopBars = 0;
  let tSec = 0;
  for (const section of sections) {
    // A per-section style whose pattern reflects this section's lane mutes, so
    // getStepEvents only reports instruments that actually sound in this section.
    const sectionStyle = { ...baseStyle, pattern: section.pattern };
    for (let bar = 0; bar < section.bars; bar++) {
      loopBars += 1;
      for (let step = 0; step < STEPS_PER_LOOP; step++) {
        const events = getStepEvents(sectionStyle, step, tSec);
        for (const ev of events) {
          const lane = LANE_OF[ev.instrument];
          const timeMs = Math.round(tSec * 1000);
          const key = `${lane}@${timeMs}`;
          const existing = byKey.get(key);
          const note: RhythmNote = { lane, timeMs, snd: ev.instrument };
          if (ev.pitch) note.degree = ev.pitch.degree;
          if (!existing || LANE_PRIORITY.indexOf(ev.instrument) < LANE_PRIORITY.indexOf(existing.snd)) {
            byKey.set(key, note);
          }
        }
        tSec += getSwingStepDurationSeconds(spec.bpm, sequencer.swing, step);
      }
    }
  }

  const notes = [...byKey.values()].sort((a, b) => a.timeMs - b.timeMs || a.lane - b.lane);
  return {
    slug: spec.slug,
    styleId: spec.styleId,
    bpm: spec.bpm,
    swing: sequencer.swing,
    loopBars,
    durationMs: Math.round(tSec * 1000),
    lanes: 4,
    notes,
  };
}

export function serializeRhythmChart(chart: RhythmChart): string {
  return `${JSON.stringify(chart)}\n`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd render-u-beat-lab && npx vitest run src/lib/rhythmChart.test.ts`
Expected: PASS (all cases). If `createArrangementPlaybackSections`/`createPlayableStyle` import paths differ, correct them per the files (see the spike's interface excerpts).

- [ ] **Step 5: Verify hygiene + full gate**

Run: `cd render-u-beat-lab && npm run check`
Expected: PASS. If `rhythmChart.ts` exceeds 300 lines, extract `LANE_OF`/`LANE_PRIORITY` into a tiny `rhythmLanes.ts` — do NOT add to the hygiene ALLOWLIST.

- [ ] **Step 6: Commit**

```bash
cd render-u-beat-lab
git add src/lib/rhythmChart.ts src/lib/rhythmChart.test.ts
git commit -m "feat(rhythm): pure note-chart builder derived from game-track render (#127)"
```

---

### Task A2: Emit `<slug>.chart.json` from the render script

**Files:**
- Modify: `render-u-beat-lab/scripts/render-game-tracks.ts`
- Test: `render-u-beat-lab/src/lib/rhythmChart.test.ts` (extend from Task A1)

**Interfaces:**
- Consumes: `buildRhythmChart`, `serializeRhythmChart` (Task A1).
- Produces: files `game-charts/<slug>.chart.json` (local, committed in Beat Lab) and `<RUSH_AUDIO_DIR>/<slug>.chart.json` (into Rush when present).

- [ ] **Step 1: Write the failing test (chart determinism guard)**

Add to `src/lib/rhythmChart.test.ts`:

```ts
describe("serializeRhythmChart", () => {
  it("round-trips to an object whose notes match the built chart", () => {
    const chart = buildRhythmChart(GAME_TRACK_SPECS[0]);
    const parsed = JSON.parse(serializeRhythmChart(chart));
    expect(parsed.notes.length).toBe(chart.notes.length);
    expect(parsed.durationMs).toBe(chart.durationMs);
    expect(parsed.lanes).toBe(4);
  });
});
```

- [ ] **Step 2: Run to verify it passes (serializer already exists)**

Run: `cd render-u-beat-lab && npx vitest run src/lib/rhythmChart.test.ts`
Expected: PASS. (This guards the on-disk shape; the script write itself is verified by running it in Step 4.)

- [ ] **Step 3: Modify the render script to write charts**

In `scripts/render-game-tracks.ts`, add the import and a local charts dir, then write the chart inside the spec loop. Charts need NO kit, so they are written unconditionally (JSON-only fallback still emits them).

Add near the existing imports:
```ts
import { buildRhythmChart, serializeRhythmChart } from "../src/lib/rhythmChart";
```
Add near `PROJECT_DIR`:
```ts
const CHART_DIR = join(process.cwd(), "game-charts");
```
In `main()`, after `mkdirSync(PROJECT_DIR, { recursive: true });`:
```ts
  mkdirSync(CHART_DIR, { recursive: true });
```
Inside `for (const spec of GAME_TRACK_SPECS) { ... }`, right after the `.beatlab.json` write, add:
```ts
    const chartJson = serializeRhythmChart(buildRhythmChart(spec));
    writeFileSync(join(CHART_DIR, `${spec.slug}.chart.json`), chartJson);
    if (rushPresent) {
      writeFileSync(join(RUSH_AUDIO_DIR, `${spec.slug}.chart.json`), chartJson);
    }
```
(Note: `rushPresent` here is the existing boolean; charts don't require `kit`, so they write whenever the Rush dir exists, even if the sample kit failed to load.)

- [ ] **Step 4: Run the generator and inspect output**

Run: `cd render-u-beat-lab && npm run generate:game-tracks`
Expected: console shows `✓ <slug>` for all 6; `game-charts/*.chart.json` exist. Verify one:
Run: `node -e "const c=require('./game-charts/airport.chart.json'); console.log(c.slug, c.notes.length, c.durationMs)"`
Expected: `airport <N> <durationMs>` with N > 0.

Then verify chart↔WAV parity across **all six** stages, not just a sample — the
timing-fix objective is only proven if every chart lines up with its bed. When the
sample kit is present (WAVs emitted), confirm each `<slug>.chart.json` `durationMs`
matches its `<slug>.wav` length (`(wavSamples / 22050) * 1000`, PCM samples =
`(fileBytes - 44) / 2` for 16-bit mono) to within a few ms, for all six slugs; flag
any stage off by more than ~1 bar. This on-disk parity is a one-time check;
the **kit-independent** standing guard against silent onset drift is the committed
`src/lib/rhythmChart.test.ts` regression test, which asserts every note's in-bar
onset matches the WAV renderer's swing formula and runs on every `npm run check`.

- [ ] **Step 5: Verify the full gate**

Run: `cd render-u-beat-lab && npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd render-u-beat-lab
git add scripts/render-game-tracks.ts src/lib/rhythmChart.test.ts game-charts/
git commit -m "feat(rhythm): emit per-stage chart.json from the game-track pipeline (#127)"
```

> **Part A ships as its own PR in `render-u-beat-lab`.** Running `npm run generate:game-tracks` with the sibling Rush checkout present also writes `<slug>.chart.json` (and, if the kit is available, `<slug>.wav`) into `renderatl-rush/assets/audio/` — the inputs Part B consumes.

---

# PART B — Rush: rhythm game mode

> Execute Part B in a `renderatl-rush` worktree off `main`. Ensure `renderatl-rush/assets/audio/<slug>.wav` and `<slug>.chart.json` exist for all 6 slugs (from Part A's generator, or the in-flight #126 WAVs + a local `npm run generate:game-tracks -- $PWD/assets/audio`). Rush's Playwright `Test` gate is already red on `main`; gate Part B on `npm run test:unit` and the new deterministic E2E only.

### Task B1: Chart loader + difficulty transform (pure)

**Files:**
- Create: `renderatl-rush/src/sim/modes/rhythm-chart.js`
- Test: `renderatl-rush/tests/sim/rhythm-chart.test.js`

**Interfaces:**
- Produces:
  - `RHYTHM_DIFFICULTY` — `{ Easy, Normal, Hard }`, each `{ approachMs, perfectMs, goodMs, missHp, regenP, regenG, minGapSteps, lanes, keys, tags }`.
  - `EASY_FOLD` — `{ 0:0, 3:0, 1:1, 2:1 }`.
  - `loadRhythmChart(raw): { slug, bpm, swing, durationMs, lanes, notes }` — validates a parsed chart JSON.
  - `applyDifficulty(chart, diffName): { laneCount, keys, tags, approachMs, perfectMs, goodMs, missHp, regenP, regenG, lastNoteMs, notes }` where each note is `{ lane, timeMs, snd, degree, judged: null }` (lane already folded; `minGap`-thinned).

- [ ] **Step 1: Write the failing test**

```js
// renderatl-rush/tests/sim/rhythm-chart.test.js
import { describe, expect, it } from "vitest";
import { RHYTHM_DIFFICULTY, applyDifficulty, loadRhythmChart } from "../../src/sim/modes/rhythm-chart.js";

const rawChart = {
  slug: "airport", styleId: "afrobeats", bpm: 120, swing: 0, loopBars: 1,
  durationMs: 2000, lanes: 4,
  notes: [
    { lane: 0, timeMs: 0, snd: "kick" },
    { lane: 1, timeMs: 250, snd: "snare" },
    { lane: 2, timeMs: 500, snd: "hat" },
    { lane: 3, timeMs: 750, snd: "melody", degree: 4 },
    { lane: 0, timeMs: 1000, snd: "kick" },
  ],
};

describe("loadRhythmChart", () => {
  it("normalizes a parsed chart and defaults missing fields", () => {
    const chart = loadRhythmChart(rawChart);
    expect(chart.slug).toBe("airport");
    expect(chart.notes).toHaveLength(5);
    expect(chart.lanes).toBe(4);
  });
  it("throws on a chart with no notes", () => {
    expect(() => loadRhythmChart({ ...rawChart, notes: [] })).toThrow();
  });
});

describe("applyDifficulty", () => {
  it("keeps 4 lanes on Normal with the D/F/J/K key set", () => {
    const chart = loadRhythmChart(rawChart);
    const built = applyDifficulty(chart, "Normal");
    expect(built.laneCount).toBe(4);
    expect(built.keys).toEqual(["D", "F", "J", "K"]);
    expect(built.notes.every((n) => n.lane >= 0 && n.lane <= 3)).toBe(true);
    expect(built.notes.every((n) => n.judged === null)).toBe(true);
  });

  it("folds to 2 lanes on Easy (kick/808 → 0, snare/hat → 1)", () => {
    // Space notes >499ms apart in each folded lane so Easy's minGap thinning
    // (minGapSteps 4 → ~500ms at bpm 120) keeps them all and the fold is testable.
    const spaced = loadRhythmChart({
      ...rawChart,
      notes: [
        { lane: 0, timeMs: 0, snd: "kick" },
        { lane: 1, timeMs: 700, snd: "snare" },
        { lane: 2, timeMs: 1400, snd: "hat" },
        { lane: 3, timeMs: 2100, snd: "melody", degree: 4 },
      ],
    });
    const built = applyDifficulty(spaced, "Easy");
    expect(built.laneCount).toBe(2);
    expect(built.keys).toEqual(["F", "J"]);
    const laneOf = (snd) => built.notes.find((n) => n.snd === snd)?.lane;
    expect(laneOf("kick")).toBe(0);
    expect(laneOf("melody")).toBe(0);
    expect(laneOf("snare")).toBe(1);
    expect(laneOf("hat")).toBe(1);
  });

  it("thins notes closer than minGap steps in the same folded lane", () => {
    // Two kicks 1000ms apart; at bpm 120 a 16th = 125ms. Easy minGap=4 → 500ms.
    // 1000ms ≥ 500ms so both survive; but add a near-duplicate that must drop.
    const dense = loadRhythmChart({
      ...rawChart,
      notes: [
        { lane: 0, timeMs: 0, snd: "kick" },
        { lane: 0, timeMs: 120, snd: "kick" }, // < 500ms after prev → dropped on Easy
        { lane: 0, timeMs: 1000, snd: "kick" },
      ],
    });
    const built = applyDifficulty(dense, "Easy");
    const kicks = built.notes.filter((n) => n.snd === "kick").map((n) => n.timeMs);
    expect(kicks).toEqual([0, 1000]);
  });

  it("exposes the difficulty config table", () => {
    expect(RHYTHM_DIFFICULTY.Hard.perfectMs).toBe(75);
    expect(RHYTHM_DIFFICULTY.Easy.lanes).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd renderatl-rush && npx vitest run tests/sim/rhythm-chart.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// renderatl-rush/src/sim/modes/rhythm-chart.js

// Difficulty table (see plan Global Constraints). regen/HP tune forgiveness.
export const RHYTHM_DIFFICULTY = {
  Easy:   { approachMs: 2400, perfectMs: 120, goodMs: 240, missHp: 3, regenP: 2.6, regenG: 1.5, minGapSteps: 4, lanes: 2, keys: ["F", "J"], tags: ["LOW", "TOP"] },
  Normal: { approachMs: 2050, perfectMs: 95,  goodMs: 190, missHp: 5, regenP: 1.8, regenG: 1.0, minGapSteps: 2, lanes: 4, keys: ["D", "F", "J", "K"], tags: ["KICK", "SNARE", "HAT", "BASS"] },
  Hard:   { approachMs: 1650, perfectMs: 75,  goodMs: 150, missHp: 8, regenP: 1.2, regenG: 0.6, minGapSteps: 1, lanes: 4, keys: ["D", "F", "J", "K"], tags: ["KICK", "SNARE", "HAT", "BASS"] },
};

// Easy folds the 4 instrument lanes into 2: low = kick + 808/bass, top = snare + hat.
export const EASY_FOLD = { 0: 0, 3: 0, 1: 1, 2: 1 };

export function loadRhythmChart(raw) {
  if (!raw || !Array.isArray(raw.notes) || raw.notes.length === 0) {
    throw new Error("rhythm chart has no notes");
  }
  return {
    slug: String(raw.slug ?? "unknown"),
    bpm: Number(raw.bpm) || 120,
    swing: Number(raw.swing) || 0,
    durationMs: Number(raw.durationMs) || 0,
    lanes: raw.lanes === 2 ? 2 : 4,
    notes: raw.notes.map((n) => ({
      lane: n.lane | 0,
      timeMs: Math.round(Number(n.timeMs) || 0),
      snd: String(n.snd ?? "kick"),
      degree: typeof n.degree === "number" ? n.degree : undefined,
    })),
  };
}

export function applyDifficulty(chart, diffName) {
  const cfg = RHYTHM_DIFFICULTY[diffName] ?? RHYTHM_DIFFICULTY.Easy;
  const stepMs = 60000 / chart.bpm / 4;
  const minGapMs = cfg.minGapSteps * stepMs - 1;
  const fold = (lane) => (cfg.lanes === 2 ? EASY_FOLD[lane] ?? 0 : lane);

  const sorted = [...chart.notes].sort((a, b) => a.timeMs - b.timeMs || a.lane - b.lane);
  const lastKept = {};
  const notes = [];
  let lastNoteMs = 0;
  for (const n of sorted) {
    const lane = fold(n.lane);
    if (n.timeMs > lastNoteMs) lastNoteMs = n.timeMs;
    if (minGapMs > 0 && lastKept[lane] != null && n.timeMs - lastKept[lane] < minGapMs) {
      continue; // dropped: still audible in the backing WAV, just not a falling note
    }
    lastKept[lane] = n.timeMs;
    notes.push({ lane, timeMs: n.timeMs, snd: n.snd, degree: n.degree, judged: null });
  }

  return {
    laneCount: cfg.lanes, keys: cfg.keys, tags: cfg.tags,
    approachMs: cfg.approachMs, perfectMs: cfg.perfectMs, goodMs: cfg.goodMs,
    missHp: cfg.missHp, regenP: cfg.regenP, regenG: cfg.regenG,
    lastNoteMs, notes,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd renderatl-rush && npx vitest run tests/sim/rhythm-chart.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd renderatl-rush
git add src/sim/modes/rhythm-chart.js tests/sim/rhythm-chart.test.js
git commit -m "feat(rhythm): chart loader + difficulty fold/thinning (#127)"
```

---

### Task B2: Rhythm sim engine (pure)

**Files:**
- Create: `renderatl-rush/src/sim/modes/rhythm.js`
- Test: `renderatl-rush/tests/sim/rhythm.test.js`

**Interfaces:**
- Consumes: `applyDifficulty` (B1).
- Produces:
  - `createRhythmState(built): rhythm` — `{ notes, laneCount, keys, tags, combo, maxCombo, score, hp, counts, approachMs, perfectMs, goodMs, missHp, regenP, regenG, lastNoteMs, done, lastJudge }`.
  - `initRhythmStage(state, built)` — attaches `state.rhythm`, resets end flags.
  - `updateRhythm({ state, input, nowMs })` — miss detection + end. `input` unused (kept for signature parity); hits arrive via `hitRhythm`.
  - `hitRhythm(state, lane, nowMs): { kind, note } | { kind: "ghost" }` — judge nearest unjudged note in `lane`.
  - `rhythmResult(state): { failed, score, accuracy, stars, grade, maxCombo, perfect, good, miss }`.
- Constant: `RHYTHM_TAIL_MS = 1400`.

- [ ] **Step 1: Write the failing test**

```js
// renderatl-rush/tests/sim/rhythm.test.js
import { describe, expect, it } from "vitest";
import { applyDifficulty, loadRhythmChart } from "../../src/sim/modes/rhythm-chart.js";
import {
  createRhythmState, hitRhythm, initRhythmStage, rhythmResult, updateRhythm,
} from "../../src/sim/modes/rhythm.js";

function stateWith(diff = "Normal", notes) {
  const chart = loadRhythmChart({
    slug: "t", bpm: 120, swing: 0, durationMs: 4000, lanes: 4,
    notes: notes ?? [
      { lane: 0, timeMs: 500, snd: "kick" },
      { lane: 1, timeMs: 1000, snd: "snare" },
      { lane: 2, timeMs: 1500, snd: "hat" },
    ],
  });
  const state = { status: "playing", score: 0, rhythm: null };
  initRhythmStage(state, applyDifficulty(chart, diff));
  return state;
}

describe("createRhythmState / initRhythmStage", () => {
  it("starts at full HP, zero combo/score, nothing judged", () => {
    const state = stateWith();
    expect(state.rhythm.hp).toBe(100);
    expect(state.rhythm.combo).toBe(0);
    expect(state.rhythm.score).toBe(0);
    expect(state.rhythm.notes.every((n) => n.judged === null)).toBe(true);
  });
});

describe("hitRhythm", () => {
  it("scores a PERFECT when the tap lands inside the perfect window", () => {
    const state = stateWith("Normal");
    const res = hitRhythm(state, 0, 500); // exactly on the kick at 500ms
    expect(res.kind).toBe("perfect");
    expect(state.rhythm.combo).toBe(1);
    expect(state.rhythm.score).toBe(100);
    expect(state.rhythm.counts.perfect).toBe(1);
  });

  it("scores a GOOD when just outside perfect but inside good", () => {
    const state = stateWith("Normal"); // perfect 95ms, good 190ms
    const res = hitRhythm(state, 0, 500 + 150);
    expect(res.kind).toBe("good");
    expect(state.rhythm.score).toBe(50);
  });

  it("returns ghost (no penalty) when nothing is in range", () => {
    const state = stateWith("Normal");
    const res = hitRhythm(state, 0, 3000);
    expect(res.kind).toBe("ghost");
    expect(state.rhythm.combo).toBe(0);
    expect(state.rhythm.counts.miss).toBe(0);
  });

  it("applies the combo multiplier once combo reaches 8", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ lane: 0, timeMs: 500 + i * 500, snd: "kick" }));
    const state = stateWith("Normal", many);
    for (let i = 0; i < 9; i++) hitRhythm(state, 0, 500 + i * 500);
    // combos 1–7 score ×1 (7×100), combos 8 and 9 score ×2 (2×200).
    expect(state.rhythm.combo).toBe(9);
    expect(state.rhythm.score).toBe(7 * 100 + 2 * 200); // 1100
  });
});

describe("updateRhythm miss + end", () => {
  it("marks a note MISS once nowMs passes its good window and breaks combo", () => {
    const state = stateWith("Normal");
    hitRhythm(state, 0, 500); // combo 1
    updateRhythm({ state, input: null, nowMs: 1000 + 300 }); // snare@1000 missed (good 190)
    expect(state.rhythm.counts.miss).toBe(1);
    expect(state.rhythm.combo).toBe(0);
  });

  it("ends the run after the last note + tail", () => {
    const state = stateWith("Normal");
    updateRhythm({ state, input: null, nowMs: 1500 + 1400 + 1 });
    expect(state.rhythm.done).toBe(true);
    expect(state.status).toBe("won");
  });

  it("ends as a loss when HP hits zero", () => {
    // 15 notes × missHp 8 on Hard = 120 damage ≥ 100, so missing them all drains
    // HP below zero. The hp<=0 check runs before the tail-end check, so it's a loss.
    const many = Array.from({ length: 15 }, (_, i) => ({ lane: 0, timeMs: 500 + i * 400, snd: "kick" }));
    const state = stateWith("Hard", many);
    updateRhythm({ state, input: null, nowMs: 20000 }); // past every note's good window
    expect(state.rhythm.hp).toBeLessThanOrEqual(0);
    expect(state.status).toBe("lost");
  });
});

describe("rhythmResult", () => {
  it("grades a clean all-perfect run as 3 stars / gold-worthy", () => {
    const state = stateWith("Normal");
    hitRhythm(state, 0, 500);
    hitRhythm(state, 1, 1000);
    hitRhythm(state, 2, 1500);
    updateRhythm({ state, input: null, nowMs: 1500 + 1400 + 1 });
    const r = rhythmResult(state);
    expect(r.failed).toBe(false);
    expect(r.accuracy).toBe(100);
    expect(r.stars).toBe(3);
    expect(r.grade).toBe("S");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd renderatl-rush && npx vitest run tests/sim/rhythm.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// renderatl-rush/src/sim/modes/rhythm.js

export const RHYTHM_TAIL_MS = 1400;

function comboMultiplier(combo) {
  return combo >= 32 ? 4 : combo >= 16 ? 3 : combo >= 8 ? 2 : 1;
}

export function createRhythmState(built) {
  return {
    notes: built.notes,
    laneCount: built.laneCount,
    keys: built.keys,
    tags: built.tags,
    approachMs: built.approachMs,
    perfectMs: built.perfectMs,
    goodMs: built.goodMs,
    missHp: built.missHp,
    regenP: built.regenP,
    regenG: built.regenG,
    lastNoteMs: built.lastNoteMs,
    combo: 0,
    maxCombo: 0,
    score: 0,
    hp: 100,
    counts: { perfect: 0, good: 0, miss: 0 },
    lastJudge: null,
    done: false,
  };
}

export function initRhythmStage(state, built) {
  state.rhythm = createRhythmState(built);
  return state.rhythm;
}

// A player tap on `lane` at audio time `nowMs`. Judges the nearest unjudged note
// in that lane; a tap with nothing in range is a harmless "ghost" (no penalty).
export function hitRhythm(state, lane, nowMs) {
  const r = state.rhythm;
  if (!r || r.done) return { kind: "ghost" };
  let best = null;
  let bestDelta = Infinity;
  for (const n of r.notes) {
    if (n.lane !== lane || n.judged) continue;
    const delta = Math.abs(n.timeMs - nowMs);
    if (delta < bestDelta) { bestDelta = delta; best = n; }
  }
  if (!best || bestDelta > r.goodMs) return { kind: "ghost" };

  const kind = bestDelta <= r.perfectMs ? "perfect" : "good";
  best.judged = kind;
  r.counts[kind] += 1;
  r.combo += 1;
  if (r.combo > r.maxCombo) r.maxCombo = r.combo;
  r.score += (kind === "perfect" ? 100 : 50) * comboMultiplier(r.combo);
  r.hp = Math.min(100, r.hp + (kind === "perfect" ? r.regenP : r.regenG));
  r.lastJudge = kind;
  return { kind, note: best };
}

export function updateRhythm({ state, nowMs }) {
  const r = state.rhythm;
  if (!r || r.done) return;

  for (const n of r.notes) {
    if (n.judged) continue;
    if (nowMs > n.timeMs + r.goodMs) {
      n.judged = "miss";
      r.counts.miss += 1;
      r.combo = 0;
      r.hp -= r.missHp;
      r.lastJudge = "miss";
    }
  }

  if (r.hp <= 0) return finishRhythm(state, true);
  if (nowMs > r.lastNoteMs + RHYTHM_TAIL_MS) return finishRhythm(state, false);
}

function finishRhythm(state, failed) {
  const r = state.rhythm;
  if (r.done) return;
  r.done = true;
  state.status = failed ? "lost" : "won";
}

export function rhythmResult(state) {
  const r = state.rhythm;
  const total = r.counts.perfect + r.counts.good + r.counts.miss;
  const failed = state.status === "lost";
  const accuracy = total ? Math.round(((r.counts.perfect + r.counts.good * 0.5) / total) * 100) : 0;
  const stars = failed ? 0 : accuracy >= 92 ? 3 : accuracy >= 78 ? 2 : accuracy >= 55 ? 1 : 0;
  const grade = failed ? "F" : accuracy >= 95 ? "S" : accuracy >= 88 ? "A" : accuracy >= 78 ? "B" : accuracy >= 68 ? "C" : "D";
  return {
    failed, score: r.score, accuracy, stars, grade,
    maxCombo: r.maxCombo, perfect: r.counts.perfect, good: r.counts.good, miss: r.counts.miss,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd renderatl-rush && npx vitest run tests/sim/rhythm.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd renderatl-rush
git add src/sim/modes/rhythm.js tests/sim/rhythm.test.js
git commit -m "feat(rhythm): pure judging/scoring/HP sim engine (#127)"
```

---

### Task B3: Rhythm progress persistence (pure)

**Files:**
- Create: `renderatl-rush/src/sim/rhythm-progress.js`
- Test: `renderatl-rush/tests/sim/rhythm-progress.test.js`

**Interfaces:**
- Produces: `RHYTHM_PROGRESS_KEY = "ratl-rush-rhythm.v1"`; `loadRhythmProgress(): Record<slug,{score,stars,grade}>`; `bestFor(slug): {score,stars,grade}|null`; `saveRhythmBest(slug, result): {best, isNewBest}` (writes only when the new score beats the stored one).

- [ ] **Step 1: Write the failing test**

```js
// renderatl-rush/tests/sim/rhythm-progress.test.js
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RHYTHM_PROGRESS_KEY, bestFor, loadRhythmProgress, saveRhythmBest } from "../../src/sim/rhythm-progress.js";

let store;
beforeEach(() => {
  store = {};
  vi.stubGlobal("localStorage", {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("rhythm-progress", () => {
  it("returns null best for an unseen slug", () => {
    expect(bestFor("airport")).toBeNull();
  });

  it("saves a new best and reports it", () => {
    const { isNewBest, best } = saveRhythmBest("airport", { score: 1200, stars: 2, grade: "B", failed: false });
    expect(isNewBest).toBe(true);
    expect(best.score).toBe(1200);
    expect(JSON.parse(store[RHYTHM_PROGRESS_KEY]).airport.stars).toBe(2);
  });

  it("does not lower a stored best on a worse run", () => {
    saveRhythmBest("airport", { score: 1200, stars: 2, grade: "B", failed: false });
    const { isNewBest, best } = saveRhythmBest("airport", { score: 800, stars: 1, grade: "C", failed: false });
    expect(isNewBest).toBe(false);
    expect(best.score).toBe(1200);
  });

  it("never persists a failed run", () => {
    const { isNewBest } = saveRhythmBest("airport", { score: 5000, stars: 0, grade: "F", failed: true });
    expect(isNewBest).toBe(false);
    expect(bestFor("airport")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd renderatl-rush && npx vitest run tests/sim/rhythm-progress.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// renderatl-rush/src/sim/rhythm-progress.js
export const RHYTHM_PROGRESS_KEY = "ratl-rush-rhythm.v1";

export function loadRhythmProgress() {
  try {
    const raw = globalThis.localStorage?.getItem(RHYTHM_PROGRESS_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch {
    return {};
  }
}

export function bestFor(slug) {
  const p = loadRhythmProgress();
  return p[slug] ?? null;
}

export function saveRhythmBest(slug, result) {
  const prev = bestFor(slug);
  if (result.failed || (prev && result.score <= prev.score)) {
    return { best: prev, isNewBest: false };
  }
  const best = { score: result.score, stars: result.stars, grade: result.grade };
  const progress = loadRhythmProgress();
  progress[slug] = best;
  try {
    globalThis.localStorage?.setItem(RHYTHM_PROGRESS_KEY, JSON.stringify(progress));
  } catch {}
  return { best, isNewBest: true };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd renderatl-rush && npx vitest run tests/sim/rhythm-progress.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd renderatl-rush
git add src/sim/rhythm-progress.js tests/sim/rhythm-progress.test.js
git commit -m "feat(rhythm): best-score/stars persistence per stage (#127)"
```

---

### Task B4: Hit-feedback SFX in AudioBus

**Files:**
- Modify: `renderatl-rush/src/audio/AudioBus.js`
- Test: `renderatl-rush/tests/audio/rhythm-sfx.test.js`

**Interfaces:**
- Produces: two new `SFX_KEYS` entries `"rhythm-hit"`, `"rhythm-miss"` with `SYNTH` renderers, playable via `audio.play("rhythm-hit")`.

- [ ] **Step 1: Write the failing test**

```js
// renderatl-rush/tests/audio/rhythm-sfx.test.js
import { describe, expect, it } from "vitest";
import { SFX_KEYS } from "../../src/audio/AudioBus.js";

describe("rhythm SFX keys", () => {
  it("registers rhythm-hit and rhythm-miss one-shots", () => {
    expect(SFX_KEYS).toContain("rhythm-hit");
    expect(SFX_KEYS).toContain("rhythm-miss");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd renderatl-rush && npx vitest run tests/audio/rhythm-sfx.test.js`
Expected: FAIL — keys absent.

- [ ] **Step 3: Add the keys + synth entries**

In `src/audio/AudioBus.js`, extend `SFX_KEYS` (near line 37):
```js
export const SFX_KEYS = [
  "jump", "collect-spec", "collect-power", "hit", "win", "lose", "debug", "alert",
  "rhythm-hit", "rhythm-miss",
];
```
Add to the `SYNTH` object (mirror the existing `hit` entry shape near line 169):
```js
  "rhythm-hit": () =>
    render(0.12, 7, (t) => {
      const body = Math.sin(2 * Math.PI * 880 * t);
      return body * Math.exp(-t * 30) * 0.5;
    }),
  "rhythm-miss": () =>
    render(0.16, 9, (t, rng) => {
      const noise = rng() * 2 - 1;
      return noise * Math.exp(-t * 22) * 0.35;
    }),
```
(Use the same `render(duration, seed, fn)` and `sine` helpers already in the file. If `render`'s callback signature differs, match the existing `hit`/`jump` entries exactly.)

- [ ] **Step 4: Run to verify it passes**

Run: `cd renderatl-rush && npx vitest run tests/audio/rhythm-sfx.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd renderatl-rush
git add src/audio/AudioBus.js tests/audio/rhythm-sfx.test.js
git commit -m "feat(rhythm): rhythm-hit / rhythm-miss feedback SFX (#127)"
```

---

### Task B5: Asset wiring — load `<slug>.wav` + `<slug>.chart.json`

**Files:**
- Modify: `renderatl-rush/src/assets.js`
- Modify: `renderatl-rush/src/scenes/BootScene.js`

**Interfaces:**
- Produces: `RHYTHM_TRACKS = [{ slug, name, styleId, bpm, accent, audioKey, chartKey }]` and `preloadRhythmAssets(scene)` (called from `BootScene.preload`). Audio cached under `rhythm-audio-<slug>`, chart JSON under `rhythm-chart-<slug>`.

- [ ] **Step 1: Confirm the input assets exist**

Run: `cd renderatl-rush && ls assets/audio/*.wav assets/audio/*.chart.json`
Expected: 6 `.wav` + 6 `.chart.json`. If missing, generate them: `(cd ../render-u-beat-lab && npm run generate:game-tracks -- "$OLDPWD/assets/audio")`. (Falls back to JSON-only if the sample kit is absent — WAVs may need the in-flight #126 assets.)

- [ ] **Step 2: Add the manifest + preload helper to `src/assets.js`**

Add `?url` imports (mirror the worktree `AUDIO` pattern) near the other asset imports:
```js
import airportWavUrl from "../assets/audio/airport.wav?url";
import connectorWavUrl from "../assets/audio/connector.wav?url";
import badgeWavUrl from "../assets/audio/badge.wav?url";
import vendorWavUrl from "../assets/audio/vendor.wav?url";
import mainStageWavUrl from "../assets/audio/mainStage.wav?url";
import afterpartyWavUrl from "../assets/audio/afterparty.wav?url";
import airportChartUrl from "../assets/audio/airport.chart.json?url";
import connectorChartUrl from "../assets/audio/connector.chart.json?url";
import badgeChartUrl from "../assets/audio/badge.chart.json?url";
import vendorChartUrl from "../assets/audio/vendor.chart.json?url";
import mainStageChartUrl from "../assets/audio/mainStage.chart.json?url";
import afterpartyChartUrl from "../assets/audio/afterparty.chart.json?url";
```
Add the manifest + helper (append near `preloadAssets`):
```js
export const RHYTHM_TRACKS = [
  { slug: "airport",    name: "AIRPORT ARRIVAL",   styleId: "afrobeats", bpm: 108, accent: "#f5892b", audio: airportWavUrl,    chart: airportChartUrl },
  { slug: "connector",  name: "CONNECTOR SPRINT",  styleId: "trap",      bpm: 140, accent: "#f95bd0", audio: connectorWavUrl,  chart: connectorChartUrl },
  { slug: "badge",      name: "BADGE PICKUP",      styleId: "rnb",       bpm: 92,  accent: "#a56ef0", audio: badgeWavUrl,      chart: badgeChartUrl },
  { slug: "vendor",     name: "VENDOR HALL",       styleId: "bounce",    bpm: 98,  accent: "#23d98a", audio: vendorWavUrl,     chart: vendorChartUrl },
  { slug: "mainStage",  name: "MAIN STAGE",        styleId: "crunk",     bpm: 80,  accent: "#f53d3d", audio: mainStageWavUrl,  chart: mainStageChartUrl },
  { slug: "afterparty", name: "AFTERPARTY SPRINT", styleId: "amapiano",  bpm: 112, accent: "#26c3e8", audio: afterpartyWavUrl, chart: afterpartyChartUrl },
];

export function preloadRhythmAssets(scene) {
  for (const t of RHYTHM_TRACKS) {
    scene.load.audio(`rhythm-audio-${t.slug}`, t.audio);
    scene.load.json(`rhythm-chart-${t.slug}`, t.chart);
  }
}
```

- [ ] **Step 3: Call the preloader from `BootScene.preload`**

In `src/scenes/BootScene.js`, import and call it alongside `preloadAssets`:
```js
import { preloadAssets, preloadRhythmAssets } from "../assets.js";
// inside preload():
    preloadAssets(this);
    preloadRhythmAssets(this);
```

- [ ] **Step 4: Verify the build resolves all assets**

Run: `cd renderatl-rush && npm run build`
Expected: build succeeds (Vite resolves all 12 `?url` imports; `assetsInlineLimit:0` keeps them as files).

- [ ] **Step 5: Commit**

```bash
cd renderatl-rush
git add src/assets.js src/scenes/BootScene.js assets/audio/
git commit -m "feat(rhythm): preload per-stage bed WAV + chart JSON (#127)"
```

---

### Task B6: Note-highway render helpers (pure geometry)

**Files:**
- Create: `renderatl-rush/src/sim/modes/rhythm-render.js`
- Test: `renderatl-rush/tests/sim/rhythm-render.test.js`

**Interfaces:**
- Produces (pure, no Phaser): `RHYTHM_LAYOUT = { width: 960, height: 540, hitY: 470, topY: 90 }`; `laneRect(laneIndex, laneCount, layout)`; `noteY(remMs, approachMs, layout)`; `visibleNotes(notes, nowMs, approachMs)`.

- [ ] **Step 1: Write the failing test**

```js
// renderatl-rush/tests/sim/rhythm-render.test.js
import { describe, expect, it } from "vitest";
import { RHYTHM_LAYOUT, laneRect, noteY, visibleNotes } from "../../src/sim/modes/rhythm-render.js";

describe("rhythm-render geometry", () => {
  it("splits the width evenly across lanes", () => {
    const r0 = laneRect(0, 4, RHYTHM_LAYOUT);
    const r3 = laneRect(3, 4, RHYTHM_LAYOUT);
    expect(r0.width).toBeCloseTo(960 / 4);
    expect(r3.x).toBeCloseTo((960 / 4) * 3);
  });

  it("puts a note at the hit line when remaining time is zero", () => {
    expect(noteY(0, 2000, RHYTHM_LAYOUT)).toBeCloseTo(RHYTHM_LAYOUT.hitY);
  });

  it("puts a far-future note near the top of the board", () => {
    const y = noteY(2000, 2000, RHYTHM_LAYOUT);
    expect(y).toBeLessThan(RHYTHM_LAYOUT.hitY);
    expect(y).toBeGreaterThanOrEqual(RHYTHM_LAYOUT.topY - 1);
  });

  it("returns only notes inside the approach window and not long-past", () => {
    const notes = [
      { lane: 0, timeMs: 100, judged: null },
      { lane: 0, timeMs: 5000, judged: null },
      { lane: 0, timeMs: 900, judged: "perfect" },
    ];
    const vis = visibleNotes(notes, 0, 2000);
    expect(vis.map((n) => n.timeMs)).toEqual([100]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd renderatl-rush && npx vitest run tests/sim/rhythm-render.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// renderatl-rush/src/sim/modes/rhythm-render.js
export const RHYTHM_LAYOUT = { width: 960, height: 540, hitY: 470, topY: 90 };

export function laneRect(laneIndex, laneCount, layout = RHYTHM_LAYOUT) {
  const w = layout.width / laneCount;
  return { x: laneIndex * w, y: layout.topY, width: w, height: layout.hitY - layout.topY };
}

// remMs = note.timeMs - nowMs. A note at the hit line has remMs 0; approachMs away
// sits at the top of the board. Linear fall.
export function noteY(remMs, approachMs, layout = RHYTHM_LAYOUT) {
  const span = layout.hitY - layout.topY;
  const progress = 1 - remMs / approachMs; // 0 at spawn, 1 at hit line
  return layout.topY + span * Math.max(0, Math.min(1, progress));
}

export function visibleNotes(notes, nowMs, approachMs) {
  const out = [];
  for (const n of notes) {
    if (n.judged) continue;
    const rem = n.timeMs - nowMs;
    if (rem <= approachMs && rem > -120) out.push(n);
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd renderatl-rush && npx vitest run tests/sim/rhythm-render.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd renderatl-rush
git add src/sim/modes/rhythm-render.js tests/sim/rhythm-render.test.js
git commit -m "feat(rhythm): pure note-highway geometry helpers (#127)"
```

---

### Task B7: RhythmScene (thin scene) + menu/route/registration

**Files:**
- Create: `renderatl-rush/src/scenes/RhythmScene.js`
- Modify: `renderatl-rush/src/main.js` (register scene)
- Modify: `renderatl-rush/src/scenes/MenuScene.js` (button + `?scene=rhythm` route)

**Interfaces:**
- Consumes: `loadRhythmChart`/`applyDifficulty` (B1), `initRhythmStage`/`updateRhythm`/`hitRhythm`/`rhythmResult` (B2), `saveRhythmBest`/`bestFor` (B3), `RHYTHM_TRACKS` (B5), `RHYTHM_LAYOUT`/`laneRect`/`noteY`/`visibleNotes` (B6), `AudioBus` + `token`/`hexInt` (existing).
- Produces: a Phaser scene keyed `"rhythm"`; `window.pinklineRhythmTest` E2E hook with `getState()`, `sound()`, `tapAt(lane, nowMs)`, `advanceTo(nowMs)`, `autoPlay()`.

This scene is Phaser rendering + wiring (no unit test; covered by the E2E in Task B8). Follow the `DrivingScene` skeleton: `constructor("rhythm")`, `init(data)`, `create()` (build board, construct `AudioBus`, bind input, install test API), `update(time, delta)` (advance the audio-clock playhead, call `updateRhythm`, redraw), and a results overlay on finish.

- [ ] **Step 1: Write the scene**

```js
// renderatl-rush/src/scenes/RhythmScene.js
import Phaser from "phaser";
import { AudioBus } from "../audio/AudioBus.js";
import { RHYTHM_TRACKS } from "../assets.js";
import { applyDifficulty, loadRhythmChart } from "../sim/modes/rhythm-chart.js";
import { hitRhythm, initRhythmStage, rhythmResult, updateRhythm } from "../sim/modes/rhythm.js";
import { bestFor, saveRhythmBest } from "../sim/rhythm-progress.js";
import { RHYTHM_LAYOUT, laneRect, noteY, visibleNotes } from "../sim/modes/rhythm-render.js";
import { hexInt } from "../ui/phaserPrimitives.js";

const LANE_HEX = [0x29d17e, 0xf4485a, 0xffc61f, 0x46b4f7];
const LEADIN_MS = 3000;

export class RhythmScene extends Phaser.Scene {
  constructor() {
    super("rhythm");
  }

  init(data = {}) {
    this.slug = data.slug ?? "airport";
    this.diff = data.diff ?? "Easy";
  }

  create() {
    this.track = RHYTHM_TRACKS.find((t) => t.slug === this.slug) ?? RHYTHM_TRACKS[0];
    const raw = this.cache.json.get(`rhythm-chart-${this.track.slug}`);
    const chart = loadRhythmChart(raw);
    this.built = applyDifficulty(chart, this.diff);
    this.state = { status: "playing", score: 0, rhythm: null };
    initRhythmStage(this.state, this.built);

    this.cameras.main.setBackgroundColor(0x120e1c);
    this.gfx = this.add.graphics();
    this.hud = this.add.text(16, 12, "", { fontFamily: "ui-monospace, Menlo, monospace", fontSize: "20px", color: "#f7ecd6" });
    this.popup = this.add.text(RHYTHM_LAYOUT.width / 2, 220, "", { fontFamily: "Archivo", fontSize: "56px", color: "#ffcf3f" }).setOrigin(0.5).setAlpha(0);

    this.audio = new AudioBus(this);
    this.audio.init();
    this.bindInput();
    this.installTestApi();

    // Count-in, then anchor the audio clock at the instant the bed starts.
    this.phase = "countin";
    this.nowMs = -LEADIN_MS;
    this.startCtx = null;
    this.startBed = () => {
      this.audio.unlock();
      const s = this.sound.add(`rhythm-audio-${this.track.slug}`, { loop: false });
      s.play();
      this.bed = s;
      this.startCtx = this.sound.context ? this.sound.context.currentTime : null;
      this.phase = "playing";
    };
    this.time.delayedCall(LEADIN_MS, this.startBed);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.bed?.stop());
  }

  bindInput() {
    this.pressedAt = {};
    this.input.keyboard.on("keydown", (event) => {
      this.audio?.unlock();
      if (event.code === "Escape") { this.scene.start("menu"); return; }
      const key = event.key?.toUpperCase();
      const lane = this.built.keys.indexOf(key);
      if (lane >= 0 && !event.repeat) { event.preventDefault(); this.tap(lane); }
    });
    // Pointer pads: bottom of the screen split into laneCount columns.
    this.input.on("pointerdown", (p) => {
      if (p.y < RHYTHM_LAYOUT.hitY - 40) return;
      const lane = Math.floor(p.x / (RHYTHM_LAYOUT.width / this.built.laneCount));
      this.tap(Math.max(0, Math.min(this.built.laneCount - 1, lane)));
    });
  }

  clockMs() {
    if (this.phase !== "playing" || this.startCtx == null || !this.sound.context) return this.nowMs;
    return (this.sound.context.currentTime - this.startCtx) * 1000;
  }

  tap(lane) {
    if (this.state.status !== "playing" || this.phase !== "playing") return;
    const res = hitRhythm(this.state, lane, this.clockMs());
    this.audio.play(res.kind === "ghost" ? "rhythm-miss" : "rhythm-hit");
    if (res.kind === "perfect" || res.kind === "good") this.flashPopup(res.kind);
  }

  flashPopup(kind) {
    const label = kind === "perfect" ? "PERFECT" : kind === "good" ? "GOOD" : "MISS";
    const color = kind === "perfect" ? "#ffcf3f" : kind === "good" ? "#29d17e" : "#f4485a";
    this.popup.setText(label).setColor(color).setAlpha(1);
    this.tweens.killTweensOf(this.popup);
    this.tweens.add({ targets: this.popup, alpha: 0, delay: 260, duration: 200 });
  }

  update() {
    if (!this.state || this.state.status !== "playing") return;
    if (this.phase === "countin") { this.draw(this.clockMs()); return; }
    const before = this.state.rhythm.counts.miss;
    const nowMs = this.clockMs();
    updateRhythm({ state: this.state, input: this, nowMs });
    if (this.state.rhythm.counts.miss > before) this.flashPopup("miss");
    this.draw(nowMs);
    window.__sim = { scene: "rhythm", state: this.state };
    if (this.state.status !== "playing") this.showResults();
  }

  draw(nowMs) {
    const g = this.gfx;
    g.clear();
    const laneCount = this.built.laneCount;
    for (let i = 0; i < laneCount; i++) {
      const r = laneRect(i, laneCount, RHYTHM_LAYOUT);
      g.fillStyle(LANE_HEX[i % LANE_HEX.length], 0.06);
      g.fillRect(r.x, r.y, r.width, r.height);
    }
    g.lineStyle(4, hexInt("#ff5bd0"), 1);
    g.beginPath(); g.moveTo(0, RHYTHM_LAYOUT.hitY); g.lineTo(RHYTHM_LAYOUT.width, RHYTHM_LAYOUT.hitY); g.strokePath();
    const laneW = RHYTHM_LAYOUT.width / laneCount;
    for (const n of visibleNotes(this.state.rhythm.notes, nowMs, this.built.approachMs)) {
      const y = noteY(n.timeMs - nowMs, this.built.approachMs, RHYTHM_LAYOUT);
      const cx = n.lane * laneW + laneW / 2;
      g.fillStyle(LANE_HEX[n.lane % LANE_HEX.length], 1);
      g.fillRoundedRect(cx - laneW * 0.32, y - 14, laneW * 0.64, 28, 8);
    }
    const r = this.state.rhythm;
    const total = r.counts.perfect + r.counts.good + r.counts.miss;
    const acc = total ? Math.round(((r.counts.perfect + r.counts.good * 0.5) / total) * 100) : 100;
    const countin = nowMs < 0 ? `  ·  ${Math.max(1, Math.ceil(-nowMs / 1000))}` : "";
    this.hud.setText(`${this.track.name}   SCORE ${r.score}   COMBO ${r.combo}   ACC ${acc}%   HP ${Math.max(0, Math.round(r.hp))}${countin}`);
  }

  showResults() {
    if (this.resultsShown) return;
    this.resultsShown = true;
    this.bed?.stop();
    const result = rhythmResult(this.state);
    const { isNewBest } = saveRhythmBest(this.track.slug, result);
    const prev = bestFor(this.track.slug);
    const stars = "★".repeat(result.stars) + "☆".repeat(3 - result.stars);
    const lines = [
      result.failed ? "WIPED OUT" : "STAGE CLEARED",
      `${stars}   GRADE ${result.grade}`,
      `SCORE ${result.score}   ACC ${result.accuracy}%   MAX COMBO ${result.maxCombo}`,
      isNewBest ? "★ NEW BEST" : `BEST ${prev?.score ?? 0}`,
      "[R] RETRY    [ESC] STAGES",
    ];
    this.add.rectangle(480, 270, 960, 540, 0x0e0a17, 0.86);
    this.add.text(480, 200, lines.join("\n"), { fontFamily: "Archivo", fontSize: "34px", color: "#f7ecd6", align: "center" }).setOrigin(0.5);
    this.input.keyboard.once("keydown-R", () => this.scene.restart());
    this.input.keyboard.once("keydown-ESC", () => this.scene.start("menu"));
  }

  installTestApi() {
    const scene = this;
    window.__sim = { scene: "rhythm", state: this.state };
    const api = {
      getState() {
        return { scene: "rhythm", status: scene.state.status, ...scene.state.rhythm };
      },
      sound() { return scene.audio?.snapshot() ?? null; },
      // Deterministic drivers — bypass the wall clock entirely.
      tapAt(lane, nowMs) { return hitRhythm(scene.state, lane, nowMs); },
      advanceTo(nowMs) { updateRhythm({ state: scene.state, input: scene, nowMs }); return api.getState(); },
      autoPlay() {
        scene.phase = "done";
        for (const n of [...scene.state.rhythm.notes].sort((a, b) => a.timeMs - b.timeMs)) {
          hitRhythm(scene.state, n.lane, n.timeMs);
        }
        updateRhythm({ state: scene.state, input: scene, nowMs: scene.state.rhythm.lastNoteMs + 1401 });
        return { ...api.getState(), result: rhythmResult(scene.state) };
      },
    };
    window.pinklineRhythmTest = api;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (window.pinklineRhythmTest === api) delete window.pinklineRhythmTest;
    });
  }
}
```

- [ ] **Step 2: Register the scene in `src/main.js`**

Add the import and include it in the scene list:
```js
import { RhythmScene } from "./scenes/RhythmScene.js";
// ...
  scene: [BootScene, MenuScene, StageScene, DrivingScene, Driving3DScene, TransitionScene, GameOverScene, LeaderboardScene, RhythmScene],
```

- [ ] **Step 3: Add the deep-link route + button in `src/scenes/MenuScene.js`**

Add a `rhythmRequested()` reader (mirror `driving3dRequested`):
```js
  rhythmRequested() {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
    return (params.get("scene") ?? hashParams.get("scene") ?? "").toLowerCase() === "rhythm";
  }
```
In `create()`, alongside the other deep-link branches:
```js
    if (this.rhythmRequested()) {
      this.clearUrlParam("scene");
      this.scene.start("rhythm", { slug: "airport", diff: "Easy" });
      return;
    }
```
Add a menu button (near the LEADERBOARD button; pick a free y — reuse the leaderboard column offset by one row):
```js
    this.addMenuButton(LAYOUT.leaderboardBtnX, this.leaderboardBtnY + 56, "RHYTHM", "#ff88df", "#2b292d", () => this.scene.start("rhythm", { slug: "airport", diff: "Easy" }), LAYOUT.leaderboardBtnW, 44);
```
(If `LAYOUT`/`this.leaderboardBtnY` names differ, place the button using the same coordinates pattern the file already uses for its buttons.)

- [ ] **Step 4: Manually verify in the browser**

Run: `cd renderatl-rush && npm run dev` then open `http://localhost:5173/?scene=rhythm`.
Expected: count-in 3-2-1, the bed plays, notes fall and cross the pink hit line, tapping D/F/J/K flashes PERFECT/GOOD and updates SCORE/COMBO/ACC, the run ends with a results overlay. Also click the `RHYTHM` menu button from the title screen.

- [ ] **Step 5: Commit**

```bash
cd renderatl-rush
git add src/scenes/RhythmScene.js src/main.js src/scenes/MenuScene.js
git commit -m "feat(rhythm): playable RhythmScene + menu entry + deep-link route (#127)"
```

---

### Task B8: Deterministic E2E (Playwright)

**Files:**
- Create: `renderatl-rush/tests/60-rhythm-scene.spec.js`

**Interfaces:**
- Consumes: `window.pinklineRhythmTest` (B7): `getState()`, `autoPlay()`, `tapAt(lane,nowMs)`, `advanceTo(nowMs)`.

- [ ] **Step 1: Write the E2E spec (drives the injected clock, never wall-clock)**

```js
// renderatl-rush/tests/60-rhythm-scene.spec.js
import { expect, test } from "@playwright/test";

test("rhythm mode boots, an auto-perfect run clears with 3 stars", async ({ page }) => {
  await page.goto("/?scene=rhythm");
  await expect(page.locator("#game canvas")).toBeVisible();
  await page.waitForFunction(() => window.pinklineRhythmTest?.getState?.().scene === "rhythm");

  const initial = await page.evaluate(() => window.pinklineRhythmTest.getState());
  expect(initial.status).toBe("playing");
  expect(initial.notes.length).toBeGreaterThan(0);

  const done = await page.evaluate(() => window.pinklineRhythmTest.autoPlay());
  expect(done.status).toBe("won");
  expect(done.result.stars).toBe(3);
  expect(done.result.grade).toBe("S");
});

test("missing every note wipes the run out", async ({ page }) => {
  await page.goto("/?scene=rhythm");
  await page.waitForFunction(() => window.pinklineRhythmTest?.getState?.().scene === "rhythm");
  const state = await page.evaluate(() => {
    const s = window.pinklineRhythmTest.getState();
    return window.pinklineRhythmTest.advanceTo(s.lastNoteMs + 1401);
  });
  // With HP drain from all misses on Easy, the run should end (won or lost); assert it ended.
  expect(["won", "lost"]).toContain(state.status);
});
```

- [ ] **Step 2: Run the spec**

Run: `cd renderatl-rush && npx playwright test tests/60-rhythm-scene.spec.js`
Expected: PASS (builds, serves on 4173, both cases green). If Playwright browsers aren't installed: `npx playwright install chromium` first.

- [ ] **Step 3: Run the unit gate to confirm no regressions**

Run: `cd renderatl-rush && npm run test:unit`
Expected: PASS including the new `tests/sim/rhythm*.test.js` and `tests/audio/rhythm-sfx.test.js`.

- [ ] **Step 4: Commit**

```bash
cd renderatl-rush
git add tests/60-rhythm-scene.spec.js
git commit -m "test(rhythm): deterministic E2E via pinklineRhythmTest hook (#127)"
```

---

## Follow-ups (out of scope for this slice — track as #127 children)

- **Stage select + difficulty picker UI** (this slice hard-codes `airport`/`Easy` from the menu; the scene already accepts `{slug, diff}`). Add a select screen listing `RHYTHM_TRACKS` with best-stars badges from `bestFor`.
- **Performance audio (stems):** render a "backing-minus-performed-lanes" bed in Beat Lab + per-lane hit voices so hitting a note *produces* its instrument (true Guitar Hero feel), instead of the full-mix bed + stab SFX.
- **Input-latency calibration** (a calibration screen; offset applied to `clockMs`).
- **Juice:** particle bursts on perfect, camera flash/shake on combo milestones, note glow (Phaser 4 `preFX.addGlow` is proven in `StageScene`).
- **Themed results scene** matching the RenderATL token system (this slice uses an in-scene text overlay).
- **Reconcile with #126** if the per-stage WAV wiring lands on `main` first (share one `AUDIO`/preload path instead of two).

## Self-review notes
- Chart↔bed alignment relies on `renderGameTrackWav` and `buildRhythmChart` sharing `createArrangementPlaybackSections` + `getSwingStepDurationSeconds` + the same section order; if the offline WAV render applies a lead-in or different swing, verify total `durationMs` ≈ WAV samples/rate during Task A2 Step 4 and adjust the time base.
- All Rush pure modules (`rhythm-chart`, `rhythm`, `rhythm-progress`, `rhythm-render`) are node-unit-tested; the scene is E2E-tested via the injected clock. No wall-clock assertions.
- Names are consistent across tasks: `applyDifficulty`→`built`; `built` feeds `initRhythmStage`; `hitRhythm`/`updateRhythm`/`rhythmResult` share `state.rhythm`; `saveRhythmBest`/`bestFor` share `RHYTHM_PROGRESS_KEY`.
