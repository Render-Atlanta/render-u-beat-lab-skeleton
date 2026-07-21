# RenderATL Rush: Beat Lab styles + two workshop carve-outs

**Date:** 2026-07-21
**Status:** Approved (pending spec review)
**Repo:** `render-u-beat-lab-skeleton` (Workshop 3 starter, branch `workshop-starter`)

## Goal

Make the in-Beat-Lab arcade game (RenderATL Rush, the approved Phaser design) play the
**Beat Lab's own styles** at studio quality instead of the synthesized, hardcoded beats it
currently ships with — and shape it around the workshop's two carve-outs so the game becomes a
live, un-gameable scoreboard for the student's work.

## Background

- The Phaser game (`src/game/*`, ported from `RenderATL Rush (Phaser).dc.html`) currently
  **hardcodes** six drum patterns in `rushStages.ts` and **synthesizes** its own audio
  (`rushAudio.ts`). One of those hardcoded patterns is a full amapiano.
- The Beat Lab already has the real infrastructure: `BEAT_STYLES` (9 styles), `GAME_TRACK_SPECS`,
  `buildRhythmChart(spec)` (→ 4-lane note chart derived from `BEAT_STYLES`), `renderRhythmBed(spec, kit, ctx)`
  (the "Download WAV" offline renderer → studio-quality bed), `loadKitFromUrls()` (CC0 sample kit),
  and `createHitSfx()`. The *original* React rhythm view used exactly this loop before it was
  replaced by the Phaser port.

## Analysis: does this adhere to the harness-engineering lesson?

**Yes — provided the game derives beats from `BEAT_STYLES` at runtime, never from a hardcoded copy.**

- The amapiano carve-out is consistent through derived data: `beatStyles.amapiano.pattern` is empty
  (`TODO(attendee)`, acceptance in `beatStyles.amapiano.test.ts`), and the derived chart
  `game-charts/afterparty.chart.json` has **42 melody notes and zero drums** (vs. trap's 141 with full
  drums). `buildRhythmChart` resolves through `BEAT_STYLES`, so **`BEAT_STYLES` is the single source of
  truth** shared by the tests and the beat pipeline.
- The current Phaser port **violates** this: its hardcoded amapiano is a second source of truth — an
  "unaccountable green" shortcut where the game plays amapiano even though the style is carved out.
  **This is the central fix.**
- Deriving the game's chart + bed at runtime from `BEAT_STYLES` means a student's implementation of
  `beatStyles.amapiano` makes both the tests pass **and** the in-game beat come alive from the same data —
  nothing to fake independently of the harness.

## Design

### The game (keeps the Phaser look/feel)

- **Two beats, selected by style name:** **Atlanta Trap** (working reference) and **Amapiano — build
  target**. No location theming, no unlock locks. Per-beat high score/stars persist as today.
- **Studio audio:** each beat plays its `renderRhythmBed(spec, kit, ctx)` bed (real kit samples, swing,
  velocity, mix). Player hits produce particles/popup + `createHitSfx` feedback — a *play-along* model.
  The synth path (`rushAudio.ts`) is deleted.
- **All beat data derived at runtime** from `GAME_TRACK_SPECS` entries `connector` (trap) and `afterparty`
  (amapiano), which reference `BEAT_STYLES`. No hardcoded patterns anywhere in `src/game/`.
- On the starter branch Amapiano plays sparse (lonely topline, no groove); implementing the style fills
  its chart + bed and the beat becomes fully playable.

### Carve-out A — Style (already in the repo, preserved)

`beatStyles.amapiano` empty; students implement it; harness `beatStyles.amapiano.test.ts`. The game is a
new, non-gameable consumer of the same `BEAT_STYLES` data.

### Carve-out B — Lanes / difficulty (new)

- The skeleton ships **2 swim lanes only** and **no difficulty selector** — one fixed timing profile.
  - **LOW** = kick + 808/bass; **TOP** = snare/clap + hats (folded from the 4-lane chart).
- A `src/game/laneConfig.ts` module owns the lane layouts. The **2-lane** set is defined and used.
  The **4-lane** layout (KICK / SNARE / HAT / BASS, each drum its own lane) is a `TODO(attendee)`
  extension point, initially absent.
- **Failing add-on test** `src/game/laneConfig.test.ts` (the acceptance) asserts the 4-lane layout
  exists and is well-formed: 4 distinct colors, 4 distinct keys, tags covering KICK/SNARE/HAT/BASS, and a
  bijective map `{0:0,1:1,2:2,3:3}` (each chart lane → its own game lane). It **fails on the skeleton**
  and turns green when a student adds the layout.
- When the 4-lane set exists, the game uses the largest available lane count, so the add-on visibly
  transforms the board from 2 → 4 lanes. Difficulty is **not** reintroduced by the skeleton.

### Runtime pipeline (reused, authoritative pieces in **bold**)

1. **`buildRhythmChart(spec)`** → 4-lane `RhythmChart` (from `BEAT_STYLES`).
2. Game-owned fold + thin: map 4 lanes → active lane count via `laneConfig`, drop notes closer than a
   min-gap **per folded lane** (playability). This replaces `applyDifficulty`, which encodes the
   carved-out difficulty concept (hardcoded 4-lane, "Normal" windows) and is not reused by the game.
3. **`loadKitFromUrls()`** once → `DecodedKit`; **`renderRhythmBed(spec, kit, ctx)`** → bed `AudioBuffer`;
   **`createHitSfx(ctx)`** → hit stab.
4. Start the bed at `t0 = ctx.currentTime + approachMs/1000`; drive the Phaser scene clock off the
   **AudioContext** (`elapsedMs = (ctx.currentTime − t0)·1000`) so falling notes line up with the audible
   bed by construction (note `timeMs 0` lands on the judge line as the bed begins).

### Module changes (`src/game/`)

- `rushStages.ts` → **gut** hardcoded `STAGES`; keep the fixed timing/HP constants. Lane layouts move to
  `laneConfig.ts`.
- `laneConfig.ts` (**new**) → `LANE_SET_2` (shipped), `LANE_SET_4` (TODO/absent), resolver + active count.
- `laneConfig.test.ts` (**new**) → the failing 4-lane add-on acceptance.
- `rushChart.ts` → replace `buildChart(STAGES)` with `foldRhythmChart(chart, laneSet, minGapSteps)`.
- `rushAudio.ts` → **delete**; replaced by `rushPlayback.ts` (**new**): AudioContext, kit load, bed render,
  bed scheduling, `elapsedMs()`, count-in click, hit SFX.
- `rushStages`/`rushController` → `rushBeats.ts` (**new**) lists the two beats (spec + accent + display name
  from `BEAT_STYLES[styleId].name` + `buildTarget` flag). Controller loads the beat's chart + bed.
- `rushScenes.ts` (Select) → two beat cards by style name + a "BUILD TARGET" badge on Amapiano; **remove**
  the difficulty selector and the 6-stage grid/unlock logic.
- `rushPlayScene.ts` → consume folded chart notes (`timeMs`), play the bed, hit → judge + `createHitSfx`
  + particles; drive clock from `rushPlayback.elapsedMs()`.
- `rushGame.ts` → wire `rushPlayback`; load kit/bed before Play starts.
- `RhythmGameView.tsx` unchanged (thin Phaser host); its test unchanged.

## Testing

- **New:** `laneConfig.test.ts` (fails on skeleton by design — the add-on acceptance).
- **Preserved red:** `beatStyles.amapiano.test.ts` (the style core task).
- Everything else stays green: `tsc --noEmit`, module hygiene (<300 lines/file), `vite build`, and a
  headless smoke that boots the game, selects a beat, and confirms the canvas + bed with no console errors.
- No changes to `GAME_TRACK_SPECS`, the generator, or committed `game-charts/`/`game-tracks/` — the game
  derives at runtime, so those artifacts and their tests are untouched.

## Out of scope

- Reintroducing difficulty, adding styles beyond the two beats, per-lane stems (muting the played lane in
  the bed), authoring new melodies, or changing the workshop's grading harness.
