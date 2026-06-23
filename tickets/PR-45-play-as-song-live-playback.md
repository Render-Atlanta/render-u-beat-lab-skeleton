# PR-45 - Play as song (live arrangement playback)

**Type:** Feature
**Depends on:** PR-08 (arrangement + export), PR-42 (arrangement length/export), PR-11 (audio engine adapter)
**Wave:** 6 (Design-brief alignment)
**Related:** PR-32 (redesign shell), PR-34 (transport), Beat Lab.dc.html design brief (Arrange panel)
**Source:** Design-brief cleanup audit, 2026-06-22

## Context

The Claude Design brief (`Beat Lab.dc.html`, Arrange panel) specifies a **"Play
as song"** toggle plus a **"▸ Now playing: {section} · bar N/total"** indicator
that chains `Intro → Verse → Hook → Outro` during *live* playback, applying each
section's lane mutes.

The redesign-cleanup pass implemented every other Arrange-panel brief detail but
deliberately **deferred this one**, because it is not a visual gap — it is a new
audio-playback behavior:

- The live engine (`createBeatEngine` → web-audio / tone-sample) plays a single
  16-step, one-bar pattern on an infinite loop. `start(style)` is restart-based
  (tempo/pattern/swing/mutes are delivered by re-calling `start()`); `stop()`
  stops; `getActiveStep()` returns the current step `0–15` or `null`. There is
  **no** native section/song awareness and **no** loop-boundary callback.
- Section chaining currently exists **only in the offline export path**
  (`renderArrangementWav` / `renderArrangementMidi` via
  `createArrangementPlaybackSections` in `src/lib/arrangement.ts`), not in live
  playback.

A toggle that did nothing would be deceptive, so it was left out pending this
ticket.

## Scope

- Add a **"Play as song"** chip toggle (On/Off) to the Arrange panel with the
  brief copy: "Chain Intro → Verse → Hook → Outro with each section's mutes."
- Add a **"▸ Now playing: {section · bar N/total}"** indicator (teal) shown in
  the Arrange panel while a song is playing.
- Surface the same `{Section · bar N/total}` string in the **transport status
  label** (the brief's transport label shows this when a song is playing;
  `App.tsx` currently shows only `Stopped / Playing / Count-in`).
- Implement a **live section scheduler**:
  - Reuse `createArrangementPlaybackSections(arrangement)` to get the ordered
    `(sectionId, label, bars, mutedLanes)` playback list.
  - Drive section/bar advancement off the existing `getActiveStep()` rAF poll in
    `App.tsx`: each `15 → 0` wrap is one bar elapsed. Maintain a `barsElapsed`
    counter, map it (cumulative bars, modulo total song bars) to the current
    section + bar-within-song, and when the section changes, call
    `engine.start(maskedStyle)` with the next section's pattern masked by its
    `mutedLanes`.
  - Loop the whole song (after the last section, wrap to the first).
- Keep masking pure and reuse the existing lane-mask approach
  (`maskPatternToLanes` / `isLaneMutedInSection`) rather than introducing a new
  one.
- When "Play as song" is **off**, playback behaves exactly as today (single
  looping pattern) — this is purely additive.
- Respect guided mode: if guided masking is active, song mode is either disabled
  or composes predictably (decide and document; simplest is to disable the song
  toggle while guided is active).

## Suggested design

- A pure module `src/lib/songPlayback.ts` with:
  - `getSongPosition(arrangement, barsElapsed): { sectionId, label, barInSong, totalBars, mutedLanes }`
    — pure, fully unit-testable, no audio.
  - A helper to build the masked `SequencerState`/style for a given section
    (compose with `createPlayableStyle` + lane masking).
- `App.tsx` holds `playAsSong` state and a `barsElapsed` ref; the existing
  `activeStep` rAF effect increments it on loop wrap and, on section change,
  restarts the engine with the masked style. The transport label and the
  Arrange "Now playing" indicator both read from `getSongPosition`.

## Acceptance criteria

- Toggling **Play as song** on and pressing play chains the four sections in
  order, applies each section's lane mutes, then loops the whole song.
- The Arrange "Now playing" indicator and the transport label both show the
  correct `{section · bar N/total}` and stay in sync with what is audible.
- With **Play as song** off, playback is byte-for-byte the current single-loop
  behavior (no regression).
- Section bar-count edits (PR-42) change the song length and the indicator
  totals.
- `getSongPosition` (and any masking helper) are covered by unit tests across
  multi-section, multi-bar arrangements, including the wrap back to section 1.
- Works in rail, focus, and mobile layouts; `npm run check` and the production
  build stay green.

## Out of scope

- Re-recording or changing the offline export chaining (already done in PR-42).
- Per-section tempo or per-section pattern editing (sections share the one-bar
  grid; only lane mutes differ).
- Per-section *tempo/swing* gapless ramps — section swaps reuse the song's
  shared tempo; only lane mutes differ.

## Implementation note: gapless section swaps

An earlier cut drove the section swap off the post-hoc `getActiveStep()` rAF
poll, which observes the wrapped downbeat only *after* the engine scheduled it
(the scheduler looks ~0.14s ahead) — so the first downbeat of each new section
sounded with the previous section's mutes, and the restart reset the loop phase.
That was flagged in review (Codex P1) and fixed: the engine gained a
`queueStyle(style)` method that adopts a queued style exactly at the next loop
boundary (`step 0`, guarded against the initial downbeat) with no
phase-resetting restart. App queues the upcoming section's masked style ~one bar
ahead (`getUpcomingSectionChange`), well within the engine lookahead, so each
section's downbeat is correct and transitions are seamless on both the web-audio
and tone-sample engines.
