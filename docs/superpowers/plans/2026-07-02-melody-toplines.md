# Per-genre Melody Toplines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each of the six generated game tracks a distinct, genre-appropriate melody topline so they read as songs, not just beats.

**Architecture:** Add optional `melody` + `melodyStepPitches` fields to `GameTrackSpec`, author genre-idiomatic starter toplines in `GAME_TRACK_SPECS`, and overlay them in `buildGameTrackSequencer` (fresh pattern object — never mutating the shared `BEAT_STYLES` preset). Rendering is unchanged: melody already plays via the existing triangle synth at `MELODY_REGISTER_OFFSET` in the offline WAV path. Regenerate the six `.beatlab.json` (Beat Lab) + `.wav` (Rush) and update the #126 caveat.

**Tech Stack:** TypeScript, Vitest, tsx (Node scripts).

## Global Constraints

- Melody arrays are length 16 (one bar on the 16th-note grid); scale degrees are integers 0–6 in the style's `musicalKey`.
- A spec with no `melody` must produce a sequencer byte-identical to today's beat-bed output (backward compatible).
- Never mutate the shared `BEAT_STYLES` preset arrays — `createDefaultSequencerState` clones the pattern, but the overlay must still build a fresh `pattern` object.
- `npm run check` must pass (682 pass / 38 skip baseline; new tests add to the pass count).
- No renderer, audio-contract, or Rush-side code changes; no new stages or genre remapping.

---

### Task 1: Melody overlay in `buildGameTrackSequencer`

Add the optional spec fields and the overlay logic, driven by tests. No topline *data* yet (that is Task 2) — this task proves the mechanism with an inline test spec.

**Files:**
- Modify: `src/lib/gameTracks.ts` (the `GameTrackSpec` interface ~line 43, `buildGameTrackSequencer` ~line 62)
- Test: `src/lib/gameTracks.test.ts`

**Interfaces:**
- Consumes: `createDefaultSequencerState(styleId)` → `SequencerState` (has `pattern: Pattern`, `melodyStepPitches: number[]`); `SequencerState` from `./patternState`.
- Produces:
  - `GameTrackSpec` gains `melody?: boolean[]` and `melodyStepPitches?: number[]`.
  - `buildGameTrackSequencer(spec: GameTrackSpec): SequencerState` — when `spec.melody` is present, `sequencer.pattern.melody` equals a copy of it and other lanes are untouched; when `spec.melodyStepPitches` is present, `sequencer.melodyStepPitches` equals a copy of it.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/gameTracks.test.ts` (top imports already include `buildGameTrackProject`; add `buildGameTrackSequencer`):

```ts
import { buildGameTrackSequencer } from "./gameTracks";
import { BEAT_STYLES } from "./beatStyles";

describe("buildGameTrackSequencer melody overlay", () => {
  const specWithMelody = {
    slug: "test", styleId: "afrobeats" as const, bpm: 100, bars: 4,
    melody: [true, false, false, false, true, false, false, false,
             false, false, false, false, false, false, false, false],
    melodyStepPitches: [0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  it("overlays the spec melody lane and pitches onto the sequencer", () => {
    const seq = buildGameTrackSequencer(specWithMelody);
    expect(seq.pattern.melody).toEqual(specWithMelody.melody);
    expect(seq.melodyStepPitches).toEqual(specWithMelody.melodyStepPitches);
    expect(seq.bpm).toBe(100);
  });

  it("leaves other lanes at the style default", () => {
    const seq = buildGameTrackSequencer(specWithMelody);
    expect(seq.pattern.kick).toEqual(BEAT_STYLES.afrobeats.pattern.kick);
  });

  it("does not mutate the shared BEAT_STYLES preset melody array", () => {
    const before = [...BEAT_STYLES.afrobeats.pattern.melody];
    buildGameTrackSequencer(specWithMelody);
    buildGameTrackSequencer(specWithMelody);
    expect(BEAT_STYLES.afrobeats.pattern.melody).toEqual(before);
  });

  it("stays a beat bed (empty melody) when the spec has no topline", () => {
    const seq = buildGameTrackSequencer({ slug: "x", styleId: "trap", bpm: 140, bars: 4 });
    expect(seq.pattern.melody.some(Boolean)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/gameTracks.test.ts -t "melody overlay"`
Expected: FAIL — `seq.pattern.melody` is empty (overlay not implemented) / TS error on `melody` field of the inline spec.

- [ ] **Step 3: Add the optional fields to `GameTrackSpec`**

In `src/lib/gameTracks.ts`, extend the interface:

```ts
export interface GameTrackSpec {
  slug: string;
  styleId: BeatStyleId;
  bpm: number;
  /** Bars on the `main` section; the loop is `bars + 3` (intro/variation/outro = 1). */
  bars: number;
  /** Optional topline overlay. Length 16; `true` = the step sounds. Absent → no melody. */
  melody?: boolean[];
  /** Optional per-step scale degree (0–6) in the style's `musicalKey`. Length 16. */
  melodyStepPitches?: number[];
}
```

- [ ] **Step 4: Implement the overlay in `buildGameTrackSequencer`**

Replace the body of `buildGameTrackSequencer`:

```ts
export function buildGameTrackSequencer(spec: GameTrackSpec): SequencerState {
  const base = createDefaultSequencerState(spec.styleId);
  const sequencer: SequencerState = { ...base, bpm: spec.bpm };
  if (spec.melody) {
    // Fresh pattern object with a copied melody lane — never mutate the shared preset.
    sequencer.pattern = { ...base.pattern, melody: [...spec.melody] };
  }
  if (spec.melodyStepPitches) {
    sequencer.melodyStepPitches = [...spec.melodyStepPitches];
  }
  return sequencer;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/gameTracks.test.ts`
Expected: PASS (existing gameTracks tests + the four new overlay tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/gameTracks.ts src/lib/gameTracks.test.ts
git commit -m "feat: overlay per-spec melody topline in buildGameTrackSequencer (#133)"
```

---

### Task 2: Author starter toplines in `GAME_TRACK_SPECS`

Add a small helper to build a length-16 overlay from a compact `{ step: degree }` map, then give each of the six specs a genre-appropriate line. Assert coverage with tests.

**Files:**
- Modify: `src/lib/gameTracks.ts` (add `topline` helper above `GAME_TRACK_SPECS`; add fields to the six specs ~line 51)
- Test: `src/lib/gameTracks.test.ts`

**Interfaces:**
- Consumes: `GameTrackSpec.melody` / `.melodyStepPitches` and `buildGameTrackSequencer` from Task 1; `melodyStepPitchesAreDefault` from `./stepPitch`.
- Produces: every entry in `GAME_TRACK_SPECS` has a length-16 `melody` with ≥1 active step and a length-16 `melodyStepPitches`.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/gameTracks.test.ts`:

```ts
import { melodyStepPitchesAreDefault } from "./stepPitch";

describe("GAME_TRACK_SPECS toplines", () => {
  it("every stage has a length-16 melody with at least one active step", () => {
    for (const spec of GAME_TRACK_SPECS) {
      expect(spec.melody, spec.slug).toBeDefined();
      expect(spec.melody!.length).toBe(16);
      expect(spec.melody!.filter(Boolean).length, spec.slug).toBeGreaterThanOrEqual(1);
      expect(spec.melodyStepPitches!.length).toBe(16);
    }
  });

  it("melodic stages carry non-default pitches", () => {
    const melodic = ["airport", "badge", "afterparty", "vendor"];
    for (const slug of melodic) {
      const spec = GAME_TRACK_SPECS.find((s) => s.slug === slug)!;
      expect(melodyStepPitchesAreDefault(spec.melodyStepPitches!), slug).toBe(false);
    }
  });

  it("the sequencer's active melody-step count matches the spec", () => {
    for (const spec of GAME_TRACK_SPECS) {
      const seq = buildGameTrackSequencer(spec);
      expect(seq.pattern.melody.filter(Boolean).length, spec.slug)
        .toBe(spec.melody!.filter(Boolean).length);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/gameTracks.test.ts -t "toplines"`
Expected: FAIL — `spec.melody` is `undefined` for every stage.

- [ ] **Step 3: Add the `topline` helper**

In `src/lib/gameTracks.ts`, add above `GAME_TRACK_SPECS`:

```ts
/**
 * Build a length-16 melody overlay from a map of 1-indexed step → scale degree.
 * Inactive steps stay silent (degree 0). Keeps the spec table readable and
 * guarantees both arrays are exactly 16 long.
 */
function topline(
  stepDegrees: Record<number, number>,
): Pick<GameTrackSpec, "melody" | "melodyStepPitches"> {
  const melody = Array.from({ length: 16 }, () => false);
  const melodyStepPitches = Array.from({ length: 16 }, () => 0);
  for (const [step, degree] of Object.entries(stepDegrees)) {
    const index = Number(step) - 1;
    melody[index] = true;
    melodyStepPitches[index] = degree;
  }
  return { melody, melodyStepPitches };
}
```

- [ ] **Step 4: Add toplines to the six specs**

Replace `GAME_TRACK_SPECS` with (degrees: 0=root, 2=b3, 3=4, 4=5, 6=b7 — all in-key):

```ts
export const GAME_TRACK_SPECS: GameTrackSpec[] = [
  { slug: "airport", styleId: "afrobeats", bpm: 108, bars: 4,
    ...topline({ 1: 0, 3: 2, 6: 4, 7: 3, 9: 4, 11: 6, 14: 0 }) },
  { slug: "connector", styleId: "trap", bpm: 140, bars: 4,
    ...topline({ 1: 0, 8: 6, 11: 4 }) },
  { slug: "badge", styleId: "rnb", bpm: 92, bars: 4,
    ...topline({ 1: 4, 4: 2, 7: 0, 9: 6, 12: 4, 15: 2 }) },
  { slug: "vendor", styleId: "bounce", bpm: 98, bars: 4,
    ...topline({ 1: 0, 3: 0, 5: 2, 7: 2, 9: 4, 11: 4, 13: 2, 15: 0 }) },
  { slug: "mainStage", styleId: "crunk", bpm: 80, bars: 4,
    ...topline({ 1: 0, 7: 0, 9: 4, 15: 4 }) },
  { slug: "afterparty", styleId: "amapiano", bpm: 112, bars: 4,
    ...topline({ 1: 0, 4: 2, 6: 4, 9: 6, 12: 4, 14: 2 }) },
];
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/gameTracks.test.ts`
Expected: PASS (all overlay + topline + existing tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/gameTracks.ts src/lib/gameTracks.test.ts
git commit -m "feat: author per-genre melody toplines for game tracks (#133)"
```

---

### Task 3: Regenerate artifacts and update the caveat

Regenerate the committed JSON (and WAVs if the Rush checkout is present) and update the #126 design doc so it no longer claims "no melody topline plays".

**Files:**
- Regenerate: `game-tracks/*.beatlab.json` (6 files); `../renderatl-rush/assets/audio/*.wav` (6 files, only if Rush checkout present)
- Modify: `docs/superpowers/specs/2026-07-01-per-level-soundtracks-design.md` (the "Track content caveat" section, ~line 135)

**Interfaces:**
- Consumes: `npm run generate:game-tracks` (`scripts/render-game-tracks.ts`), which builds each project from `GAME_TRACK_SPECS`.
- Produces: committed JSON with non-empty melody lanes.

- [ ] **Step 1: Regenerate the tracks**

Run: `npm run generate:game-tracks`
Expected: `✓` for all six slugs. If the sibling `renderatl-rush` checkout is absent, it warns and writes JSON only (that is fine — WAVs are regenerated on a machine that has Rush).

- [ ] **Step 2: Verify melody now lands in the JSON**

Run: `node -e "for (const f of ['airport','connector','badge','vendor','mainStage','afterparty']) { const d = require('./game-tracks/'+f+'.beatlab.json'); const m = (d.sequencer||d).pattern.melody.filter(Boolean).length; console.log(f, m); }"`
Expected: every slug prints a count ≥ 1 (e.g. `airport 7`, `connector 3`, `badge 6`, `vendor 8`, `mainStage 4`, `afterparty 6`).

- [ ] **Step 3: Update the #126 caveat**

In `docs/superpowers/specs/2026-07-01-per-level-soundtracks-design.md`, replace the "Track content caveat (first pass: beat beds, no topline)" section body so it states that per-genre toplines now ship (via #133), the melodic stages carry flowing lines and trap/crunk stay sparse, and every track remains an editable `.beatlab.json`. Keep the timbre note about VCSL samples (still accurate). Suggested replacement heading: `## Track content (toplines shipped in #133)`.

- [ ] **Step 4: Run the full check**

Run: `npm run check`
Expected: PASS (baseline 682 pass / 38 skip, plus the new gameTracks tests).

- [ ] **Step 5: Commit**

```bash
git add game-tracks docs/superpowers/specs/2026-07-01-per-level-soundtracks-design.md
git commit -m "chore: regenerate game tracks with toplines; update caveat (#133)"
```

(If the Rush WAVs were regenerated locally, commit them in the `renderatl-rush` checkout separately.)

---

## Self-Review

**Spec coverage:**
- Data model (`melody?`/`melodyStepPitches?` on `GameTrackSpec`) → Task 1, Step 3. ✓
- Overlay in `buildGameTrackSequencer` (fresh pattern, no mutation) → Task 1, Steps 4 + tests. ✓
- Source of truth = spec table → Tasks 1–2 (data lives in `GAME_TRACK_SPECS`). ✓
- Starter toplines per the design table → Task 2, Step 4 (degrees match the spec table exactly). ✓
- Regeneration → Task 3, Steps 1–2. ✓
- Update #126 caveat → Task 3, Step 3. ✓
- Tests (≥1 melody step; melodic stages non-default; overlay count; round-trip unchanged) → Tasks 1–2 + existing round-trip test. ✓
- Non-goals (no renderer/Rush/genre changes) honored — no such steps. ✓

**Placeholder scan:** No TBD/TODO; all code and commands are concrete. Step 3 of Task 3 is prose (doc edit) but names the exact section, file, and line — acceptable for a documentation edit. ✓

**Type consistency:** `melody: boolean[]` and `melodyStepPitches: number[]` used identically across Tasks 1–2; `topline()` returns `Pick<GameTrackSpec, "melody" | "melodyStepPitches">`; degree values in Task 2 match the design-doc table verbatim. ✓
