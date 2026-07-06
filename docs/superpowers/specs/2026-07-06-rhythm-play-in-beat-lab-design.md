# Rhythm Play — Guitar-Hero performance game, in Beat Lab

> **Status:** design approved (2026-07-06). Supersedes the Rush-hosted approach in
> `2026-07-05-phaser-rhythm-game-port-spike.md` for the *performance* game: the game
> now lives **in `render-u-beat-lab`**, reusing the existing music infrastructure
> rather than pre-baking data into the sibling `renderatl-rush` repo.

## Goal

A playable Guitar-Hero-style rhythm mode inside the Beat Lab app: pick one of the 6
RenderATL stages, the backing track plays, notes fall down a 4-lane highway to a judge
line, and the player taps `D F J K` in time. First slice targets a **complete, fun
vertical slice** — not the full feature set.

## Why in-repo (the reversal)

The earlier spike put the game in `renderatl-rush` and coupled the two repos only
through generated data files (`<slug>.wav` + `<slug>.chart.json`) — "data coupling."
That optimized for reusing Rush's **game engine** (Phaser) and treated the music as a
pre-baked artifact. The priority here is the opposite: **reuse Beat Lab's music
infrastructure** (synthesis, sequencer, arrangement, the Part A chart builder). In one
repo the data-coupling problem disappears — the game computes both the audio bed and
the note chart in the browser from the same `GameTrackSpec`, so nothing is ported and
nothing is pre-baked. The cost of this choice is that Beat Lab has no game engine, so
the note-highway rendering, input, and game loop are built here in React + canvas. That
is the accepted trade.

The spike's own first pass preferred "canvas-in-Beat-Lab … maximizes core reuse"; this
design returns to it.

## Scope

**In (slice 1):**
- One difficulty: **Normal**, 4 lanes, keys `D F J K`.
- All 6 stages selectable (`GAME_TRACK_SPECS`).
- Backing bed rendered + decoded in-browser; playback via one `AudioBufferSourceNode`;
  game clock derived from `AudioContext.currentTime`.
- Falling-note canvas highway with a judge line.
- Timing judgment: perfect / good / miss; combo multiplier; running score + accuracy.
- Short synth **hit SFX**.
- One playthrough of the arrangement → **results overlay** (score, accuracy, max combo)
  with retry / back-to-stages.

**Out (deferred follow-ups, explicitly not in slice 1):**
- Easy (2-lane fold) and Hard difficulties.
- HP / health / fail state (`missHp`, `regenP`, `regenG`).
- Stars / grades / medals.
- localStorage best-score persistence.
- Count-in and mobile / touch input.

These map cleanly onto later slices; the difficulty table and scoring rules below note
where each hooks in.

## Relationship to other work

- **Part A (`src/lib/rhythmChart.ts`, merged in #138)** is reused verbatim:
  `buildRhythmChart(spec)` produces a difficulty-agnostic chart whose note times are
  derived from the *same* offline WAV renderer timing math the bed uses, so notes and
  audio align by construction. The committed `game-charts/*.chart.json` are byproducts;
  the game does **not** load them — it calls `buildRhythmChart(spec)` at runtime.
- **`feat/beat-match-127`** is a *separate, complementary* game (Beat Match Challenge — a
  beat-*recreation* game), not this performance game. No code dependency. Both will
  eventually add a top-level view to the app shell; slice 1 adds its own view and a
  future cleanup may unify the game-view switch. Not in scope now.

## Architecture

All new source files obey module hygiene (≤300 lines source, ≤350 test; colocated
`*.test.ts(x)`; no additions to the `scripts/moduleHygiene.ts` ALLOWLIST). App.tsx is
already at the allowlist ceiling, so it gains only a thin view switch.

### Pure logic (Node-safe, fully unit-tested)

- **`src/lib/rhythmDifficulty.ts`**
  - `RHYTHM_NORMAL = { approachMs: 2050, perfectMs: 95, goodMs: 190, minGapSteps: 2, laneCount: 4, keys: ["D","F","J","K"], tags: ["KICK","SNARE","HAT","BASS"] }`
    (values from the plan's authoritative difficulty table; HP/regen fields intentionally
    omitted in slice 1).
  - `applyDifficulty(chart: RhythmChart): BuiltChart` — passes lanes through (no fold at
    Normal), thins notes closer than `minGapSteps` sixteenths in the same lane
    (`stepMs = 60000 / bpm / 4`), and returns notes as `{ lane, timeMs, snd, degree?, judged: null }`
    plus `{ laneCount, keys, tags, approachMs, perfectMs, goodMs, lastNoteMs }`.

- **`src/lib/rhythmGame.ts`** — the sim (ported from the plan's Part B / `rhythm.js` to TS):
  - `createRhythmState(built)` → `{ notes, laneCount, keys, tags, approachMs, perfectMs, goodMs, lastNoteMs, combo, maxCombo, score, counts:{perfect,good,miss}, lastJudge, done }`.
  - `updateRhythm({ state, nowMs })` — marks any unjudged note past `timeMs + goodMs` as
    `miss` (breaks combo); ends the run at `lastNoteMs + RHYTHM_TAIL_MS` (1400).
  - `hitRhythm(state, lane, nowMs)` — judges nearest unjudged note in `lane`: `≤perfectMs`
    → `perfect` (+100×mult), `≤goodMs` → `good` (+50×mult), else `{ kind: "ghost" }`
    (no penalty). Combo multiplier: `combo≥32→4, ≥16→3, ≥8→2, else 1`.
  - `rhythmResult(state)` → `{ score, accuracy, maxCombo, perfect, good, miss }` where
    `accuracy = (perfect + good*0.5) / total * 100`. (Stars/grade/failed deferred.)
  - `RHYTHM_TAIL_MS = 1400`.

### Browser audio

- **`src/audio/rhythmBed.ts`**
  - `renderRhythmBed(spec: GameTrackSpec, kit: DecodedKit, ctx: AudioContext): AudioBuffer`
    — `renderGameTrackWav(spec, kit)` (pure, already used by "Download WAV") → `decodeWav`
    (pure, returns `{ samples: Float32Array, sampleRate }`, 22050 Hz mono) →
    `ctx.createBuffer(1, samples.length, sampleRate)` + `copyToChannel(samples, 0)`.
    No `decodeAudioData`, no network for the bed.
  - The drum **kit** is loaded once via the existing `loadKitFromUrls()` (fetches the
    committed `public/kit/*.wav`) and cached across stages.

### React / view

- **`src/components/useRhythmGame.ts`** — the game hook. Owns the `AudioContext`, the
  `AudioBufferSourceNode`, and a `requestAnimationFrame` loop (the `[isPlaying]`-keyed
  rAF pattern already in App.tsx / EqVisualizer). Each frame: `nowMs = (ctx.currentTime - t0) * 1000`,
  call `updateRhythm`, expose a render snapshot (active notes + HUD). Binds `keydown`
  `D F J K` → `hitRhythm(state, lane, nowMs)` and fires the hit SFX. Exposes
  `start(spec)`, `stop()`, and reactive `{ phase, hud, notes, result }`.
- **`src/components/RhythmHighway.tsx`** — canvas 2D renderer (the `EqVisualizer`
  `useRef<HTMLCanvasElement>` + context-2d + rAF-while-playing pattern). Draws 4 lanes, a
  judge line, notes falling from `approachMs` out to `0`, and hit/miss flashes. Pure draw
  from the snapshot; no game logic.
- **`src/components/RhythmGameView.tsx`** — full-screen view with three phases:
  **stage-select** (6 cards, each with stage name + accent color), **play** (highway +
  live score/combo HUD), **results** (score / accuracy / max combo, retry / back). Stage
  display metadata (`name`, `accent` color per slug) lives in a small constant here.
- **`src/App.tsx`** — minimal: a `view: "workbench" | "play"` `useState`, a nav button
  that flips it (mirroring the `SONGLAB_ENABLED` / `WORKSHOP_MODE` lazy-view precedent),
  and a conditional in `<main>` that renders either the existing workbench block or
  `<RhythmGameView>`. Kept tiny to respect App.tsx's size ceiling.

### Hit SFX

A short synthesized stab generated once into an `AudioBuffer` (a decaying sine, ~120ms)
and played via a fresh `AudioBufferSourceNode` per hit through the same `AudioContext`.
No sample asset needed. Miss SFX deferred (optional later).

## Data flow

```
stage select (spec)
      │  loadKitFromUrls() [once, cached]
      ▼
renderRhythmBed(spec, kit, ctx) ──► AudioBuffer ──► source.start(t0)
buildRhythmChart(spec) ──► applyDifficulty() ──► BuiltChart ──► createRhythmState()
      │
      ▼  rAF loop: nowMs = (ctx.currentTime - t0)*1000
updateRhythm({state, nowMs})  ◄── keydown D/F/J/K ──► hitRhythm(state, lane, nowMs) + SFX
      │  snapshot (notes + HUD)
      ▼
RhythmHighway (canvas draw)     ── at lastNoteMs + 1400 ──►  results overlay
```

Because `buildRhythmChart(spec)` and `renderGameTrackWav(spec, kit)` derive from the
same spec and the same swing/onset math, the falling notes line up with the audible bed
with no calibration.

## Error / edge handling

- **Autoplay policy:** the bed only starts inside a user gesture (the "Start" button on a
  stage card / a Start control). The `AudioContext` is created/resumed there.
- **Kit load failure:** if `loadKitFromUrls()` rejects (samples missing), the play view
  shows an error state and stays on stage-select rather than starting silently.
- **Re-entry / stop:** `stop()` cancels the rAF loop, stops the source node, and closes
  out any pending judgments; leaving the play view or hitting retry tears down and
  rebuilds cleanly (no leaked `AudioContext` timers — mirror App.tsx's `cancelAnimationFrame`
  cleanup).
- **Empty/short charts:** `applyDifficulty` is a no-op-safe transform; a stage with very
  sparse notes still ends correctly at `lastNoteMs + 1400`.

## Testing

- `rhythmDifficulty.test.ts` — window config values; min-gap thinning drops
  same-lane notes closer than `minGapSteps` sixteenths; lanes pass through at Normal.
- `rhythmGame.test.ts` — the plan's B2 cases ported: perfect inside `perfectMs`, good
  inside `goodMs`, ghost when nothing in range (no penalty), combo multiplier crosses at
  8, miss when `nowMs` passes `timeMs + goodMs` (breaks combo), run ends at
  `lastNoteMs + tail`, and a clean all-perfect run reports 100% accuracy.
- `rhythmBed.test.ts` — light: `renderRhythmBed` returns a buffer whose length matches
  `decodeWav(renderGameTrackWav(...)).samples.length` for a spec (can run against a fake
  `AudioContext.createBuffer`), asserting the render→decode→buffer wiring.
- The hook and canvas renderer are thin and exercised through the tested sim; no heavy
  view tests in slice 1.

Gate: `npm run check` (module hygiene + `typecheck:scripts` + `vitest run`) stays green.

## Deferred follow-ups (later slices)

1. **Difficulties** — add Easy (2-lane `EASY_FOLD`, keys `F J`) and Hard to
   `rhythmDifficulty.ts`; the sim and view already parameterize on `laneCount`/`keys`.
2. **HP + fail** — add `hp`, `missHp`, `regenP/regenG` to the sim and a health bar; loss
   when `hp ≤ 0`.
3. **Stars / grades / medals + persistence** — `rhythmResult` gains stars/grade; a
   `rhythm-progress.ts` (localStorage `ratl-rush-rhythm.v1`) stores best per slug (mirror
   the Beat Match star-persistence pattern on `feat/beat-match-127`).
4. **Count-in and mobile/touch** — lane tap targets + a 4-beat count-in.
5. **Shell unification** — reconcile the `view` switch with Beat Match's view once both
   land on main.
