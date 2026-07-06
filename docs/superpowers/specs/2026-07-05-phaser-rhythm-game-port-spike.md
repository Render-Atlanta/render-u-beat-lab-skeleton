# Design spike — Guitar-Hero rhythm game: keep Beat Lab a tool, build the game in Phaser?

**Issue:** #127 (Explore: Beat Lab as a rhythm/production game)
**Date:** 2026-07-05
**Status:** Spike — decision doc, pending user direction
**Author framing:** principal-engineer analysis
**Artifact under evaluation:** the imported Claude Design file `RenderATL Rush (Phaser).dc.html`
— a complete, working Phaser 3 Guitar-Hero rhythm game (6 stages, difficulty, Web-Audio
synth, combo/HP/scoring, star grades, localStorage progress).

## The question

Should we **keep Beat Lab as-is (a musical tool)** and build the Guitar-Hero–inspired
performance game **as a Phaser app**, rather than embedding a game mode inside Beat Lab's
React SPA?

Short answer: **Yes — with one important refinement.** Build it in Phaser, host it in the
existing `renderatl-rush` repo as a new mode, and couple it to Beat Lab through
**pre-generated chart + audio data**, not shared code. Reject embedding Phaser inside
Beat Lab. Reserve a shared-core extraction for a later, explicitly-triggered escalation.

## What already exists (grounding the decision)

Two distinct games map onto #127. They are complementary, not competing:

| | **Beat Match** (production game) | **RenderATL Rush** (performance game) |
|---|---|---|
| Loop | Hear a target → recreate it on the sequencer → scored | Notes fall → hit D/F/J/K in time → scored |
| Timing | Quantized 16-step (`getActiveStep`) — no sub-step | **Sub-step**, sample-accurate, input-latency-sensitive |
| Renderer | The existing sequencer grid (none new) | A scrolling **note highway** (new) |
| Home | Native to Beat Lab (React/sequencer) | Wants a game engine |
| Status | **In flight** on `feat/beat-match-127` (built, tested) | This spike |

The Beat Match design doc (`2026-07-02-beat-match-challenge-mode-design.md`) **explicitly
defers** the Guitar-Hero mode, naming its two hard requirements: *"needs sub-step timing +
a scrolling renderer the engine does not support today."* The imported Phaser design is
precisely that deferred mode, and it already solves both. So Beat Lab is already growing a
tool-native game that fits its ethos; the performance game is the different animal this
spike places.

### Beat Lab (`render-u-beat-lab`) — the musical tool
- React 19 + Vite 7 + **TypeScript**, Tone.js + Web Audio. README states heavy audio/game
  deps are *intentionally deferred*; a **hard 300-line-per-file** hygiene gate is enforced.
- Owns the reusable **timing/audio/chart core**, all framework-agnostic TS:
  - `src/audio/transport.ts` — the **lookahead scheduler** (`SCHEDULE_AHEAD_SECONDS`,
    `SCHEDULER_TICK_MS`, `getStepEvents`, `getActiveStep`) resolving timed, pitched,
    accented note events. *This is the timing brain a rhythm game needs.*
  - `src/audio/webAudioBeatEngine.ts` / `toneVoices.ts` — synth voices per instrument.
  - `src/lib/gameTracks.ts` — `GAME_TRACK_SPECS` + `renderGameTrackWav(spec, kit)`, a
    **node-compatible** offline PCM render (not `OfflineAudioContext`) → runs headless in CI.
  - `src/lib/{patterns,beatStyles,patternState}.ts` — the `Pattern`/`BeatStyle` data model.
- The 6 stages already exist as data: `game-tracks/*.beatlab.json` + `BEAT_STYLES` presets
  (airport→afrobeats@108, connector→trap@140, badge→rnb@92, vendor→bounce@98,
  mainStage→crunk@80, afterparty→amapiano@112).
- Build is `tsc --noEmit` → **emits no consumable library**.

### RenderATL Rush (`renderatl-rush`) — the game
- **Phaser 4.2**, **JavaScript** (ESM, no TypeScript), Vite 5, deploy to Vercel.
- 960×540 logical, `Scale.FIT`; token-driven vector art (`add.graphics` × 66, tweens × 22).
  *Not* a low-res pixel buffer — high-res art downscaled.
- **Multi-mode precedent already shipped:** `stage`, `driving`, `driving3d` scenes coexist;
  logic lives in scene-free, unit-tested `src/sim/modes/*.js`, rendered by thin scenes;
  `MenuScene` routes modes by button and by `?scene=` deep-link; `TransitionScene` branches
  on `stage.genre`. A `"rhythm"` genre + `RhythmScene` + `sim/modes/rhythm.js` is a
  well-worn change.
- Rush's stages **are** the RenderATL journey — the same six slugs as the game-tracks. A
  rhythm mode is thematically "perform on the Main Stage," not a bolt-on.
- **Audio gap:** `AudioBus.js` is Phaser WebAudio with immediate one-shot SFX + looped beds.
  It has **no lookahead scheduler, no sample-accurate scheduling**. It *does* expose the raw
  `scene.sound.context`, so a modest playhead can be built against `context.currentTime`.
- Consumes Beat Lab today **only as built WAV assets** (in-flight, #126) via `load.audio` +
  `{loop:true}`. Zero shared code, ever.

### The cross-repo reality (the crux)
- **Two fully independent git repos.** No monorepo, no workspace, no published package.
- The **only** link is a build-time filesystem write: Beat Lab's `scripts/render-game-tracks.ts`
  writes six `.wav` files into `../renderatl-rush/assets/audio/` (and commits editable
  `.beatlab.json` in Beat Lab). A copy-of-built-artifacts pipeline, full stop.
- Reusing Beat Lab's **live** TS (scheduler/voices) from Rush has **no build/path/publish
  story** and the teams' own docs explicitly decline to "port the renderer." Getting live
  code across the boundary means standing up a shared package/monorepo (and adding a TS
  toolchain to JS-only Rush) — a real, non-trivial restructure.

## The reframing that decides it

A Guitar-Hero game does **not** need live re-synthesis. Per stage it needs three things:

1. **A fixed backing bed** — already produced by Beat Lab's WAV pipeline (`renderGameTrackWav`).
2. **A note chart** — note lane + time + accent + (optional) pitch. This is **pure data**,
   derivable **offline** in Beat Lab's node pipeline from the same `Pattern` + bpm + swing
   via `transport.getStepEvents`. Ship it as `<slug>.chart.json` next to the WAV.
3. **Hit feedback SFX** — a stab/click on each hit. Rush's `AudioBus` already synthesizes
   one-shots; this needs no Beat Lab code at all.

So the game can be **data-coupled** to Beat Lab, exactly matching the one integration that
already works — and pay **zero** cross-repo code-sharing tax. Live synth voices firing
per-hit (the only thing data-coupling gives up) are not part of the core Guitar-Hero loop;
a rendered stem is in fact *more* timing-reliable than live synthesis under load.

## Options considered

**Option 1 — Game inside Beat Lab, canvas renderer** (the earlier "Approach A").
Sits directly on the live core (zero sharing tax); cheapest way to validate the *concept*.
But it lands a twitch performance game in the musical tool's repo and deployable, uses
canvas (not the requested Phaser), and grows Beat Lab's scope from "tool" to "tool+game"
against its stated ethos. → **Good as a throwaway concept prototype; wrong as the product home.**

**Option 2 — Phaser embedded inside Beat Lab's React SPA.**
Adds Phaser (~1 MB) — the exact heavy dep Beat Lab deliberately avoids — mixes tool+game in
one bundle/UX, runs two audio stacks, and fights the 300-line hygiene cap with large scenes.
→ **Reject. Worst of both worlds.**

**Option 3 — Game as a Phaser mode in `renderatl-rush`, data-coupled to Beat Lab. ★ RECOMMENDED.**
- Beat Lab stays a **pure musical tool** (directly answers the question: yes, keep it as-is).
- Game lives where Phaser 4, the multi-mode pattern, `MenuScene` routing, the token system,
  and the deploy already are — and where it fits the RenderATL-journey theme.
- Coupling extends the **existing, proven** offline pipeline: Beat Lab emits
  `<slug>.chart.json` alongside each `<slug>.wav`; Rush loads both as assets. No shared code.
- Net-new work in Rush is contained and follows Rush's own conventions:
  - `src/sim/modes/rhythm.js` — pure playhead + judging against an injected clock (unit-testable).
  - `RhythmScene.js` — thin renderer: highway via `add.graphics` + tweens; hit FX via the
    now-available Phaser 4 particles / `cameras.main.flash`/`shake` / `preFX.addGlow`.
  - A small scheduler against `scene.sound.context.currentTime` (judge off the audio clock,
    never the frame `delta`).
- The imported Phaser 3 design is a **proven gameplay blueprint** for `rhythm.js` (windows,
  combo/HP, difficulty fold, lane mapping, stage data) — de-risking the build.
- **Accepted limitation:** backing bed + Rush-side hit SFX, not Beat Lab's live per-note voices.

**Option 4 — Extract a shared `@beatlab/core` package; build the Phaser game against live voices/scheduler.**
Cleanest long-term separation (tool / game / shared core) and the only path to *live* Beat
Lab audio in the game. But it requires a monorepo-or-published-package restructure and a TS
toolchain in JS-only Rush — a large upfront cost, premature for a P2 "explore." → **Defer;
adopt only on an explicit trigger (below).**

## Recommendation

1. **Keep Beat Lab a pure musical tool.** Its game surface stays the tool-native Beat Match
   challenge already in flight.
2. **Build the Guitar-Hero game as a new `rhythm` mode in `renderatl-rush` (Option 3)**,
   data-coupled to Beat Lab by extending `render-game-tracks.ts` to also emit a note-chart
   JSON per stage. Port the imported design's gameplay logic into a pure `sim/modes/rhythm.js`
   and render it with Rush's Phaser-4 graphics/tween/FX toolkit in the RenderATL token style.
3. **Reject Option 2** outright. **Treat Option 1 as prototype-only** if we want a fast
   in-repo concept check before committing to the Rush build.
4. **Escalate to Option 4 only if** a future requirement needs Beat Lab's *live* engine in
   the game — e.g. real-time difficulty remixing of the pattern, or the game doubling as a
   playable Beat Lab instrument. Until then, data-coupling wins on cost and decoupling.

### Why this reverses my earlier lean
My first pass recommended Approach A (canvas-in-Beat-Lab) because it maximizes core reuse.
The Rush map changed the weighting: Rush already owns the game engine, the multi-mode
pattern, and the RenderATL theme; and the timing/audio can be **pre-baked offline**, so the
"reuse the live core" advantage of staying in Beat Lab is not actually needed for a
performance game. Updating on that evidence, Rush + data-coupling is the stronger home.

## The interface this spike locks

**Chart data contract** (Beat Lab emits, Rush consumes — the whole coupling surface):

> **Superseded — the authoritative shape is the "Shared data contract" in the
> 2026-07-06 rhythm-game plan** (`docs/superpowers/plans/2026-07-06-rhythm-game-mode.md`),
> which is what Part A actually ships. This early sketch differs and should NOT be
> coded against: the shipped chart uses `swing` + `loopBars` (not `bars`), `degree`
> on pitched notes (not `pitch`/`accent`), and has **no `auto` array**. Crucially,
> the shipped chart is **difficulty-agnostic** — lane folding and `minGap` thinning
> live on the **Rush side** (`applyDifficulty`), not in Beat Lab. The sketch below is
> kept only as the spike's point-in-time reasoning.

```jsonc
// game-charts/<slug>.chart.json  (early sketch — see the plan for the shipped shape)
{
  "slug": "airport",
  "styleId": "afrobeats",
  "bpm": 108,
  "swing": 0.1,
  "loopBars": 8,
  "durationMs": 17777,
  "lanes": 4,                       // Rush folds to 2 for Easy
  "notes": [                        // difficulty-agnostic; ascending timeMs
    { "lane": 0, "timeMs": 0,    "snd": "kick" },
    { "lane": 3, "timeMs": 1250, "snd": "melody", "degree": 4 }
  ]
}
```

- `notes` are produced by walking `transport.getStepEvents` over the stage `Pattern`
  for instrument enumeration, timing each note to the offline WAV renderer's own onset
  formula. Generation lives in Beat Lab (node, CI-testable); Rush treats it as opaque
  data and applies the difficulty fold/thinning itself.
- Backing audio stays the existing `<slug>.wav`. The bed and the chart share
  `bpm`/`loopBars` so a single `startAt` aligns both.

**Rush-side renderer boundary** (keeps `rhythm.js` engine-agnostic within Rush, mirroring
`driving.js`/`driving-render.js`): pure `updateRhythm({state,input,now})` + a `RhythmScene`
that only draws state and fires FX. This is the same pure-sim/thin-scene split Rush already
tests, so a future engine change never touches gameplay logic.

## Consequences, risks, and open questions

- **CI hazard (Rush).** Rush's `Test` gate is already red/flaky on `main` (delta-clock E2E,
  sharded, single-worker). A timing-sensitive rhythm mode **must** judge against an injected
  clock and expose a deterministic `window.pinklineRhythmTest` hook (Rush's established E2E
  pattern) — never assert against wall-clock. Do not deepen the existing flake.
- **Phaser 3 → 4 deltas** in porting the design's visuals: particles config, `preFX.addGlow`
  (proven once in Rush), `cameras.main.flash/shake` (net-new but standard Phaser 4). Manageable.
- **Input latency / calibration** is unsolved in both repos; the design ignores it. A first
  slice can ship without calibration, but note it as the first quality follow-up.
- **Open — chart generation ownership:** confirm `render-game-tracks.ts` is the right place
  to emit `<slug>.chart.json`, and that the melody/accent data survives the offline path
  (it uses `renderGameTrackWav`/`gameTracks.ts`, which already resolve pitches).
- **Open — where the spec/plan live:** the *implementation* work is a Rush-repo change, so
  its spec/plan should land in `renderatl-rush/docs/`, with this spike as the cross-repo
  decision record kept here under #127.
- **Out of scope:** leaderboards, online play, calibration UI, Option 4's shared package.

## Next step

If the recommendation stands, the follow-on is an **implementation plan for the Rush `rhythm`
mode** (pure `sim/modes/rhythm.js` from the design blueprint, `RhythmScene`, the AudioContext
playhead, `MenuScene` entry) **plus** the small Beat Lab change to emit `<slug>.chart.json`.
That plan is authored via the writing-plans skill once this direction is approved.
